/**
 * PLUMA - proxy de chat para o Ollama Cloud
 *
 * O site é estático e roda no navegador. Chamar o provedor direto do browser
 * não funciona (o ollama.com não libera CORS) e nem seria seguro (a chave
 * ficaria visível no JavaScript publicado). Esta função resolve os dois:
 * o navegador fala com o servidor, o servidor fala com a Ollama Cloud
 * carregando a chave da variável de ambiente OLLAMA_API_KEY.
 *
 * O corpo e o formato da resposta são os mesmos da API do Ollama, então o
 * cliente (js/ia.js) não muda: o streaming NDJSON continua igual.
 */

const { Readable } = require('node:stream');

const {
    UPSTREAM,
    MODELO_PADRAO,
    excedeLimite,
    validarRequisicao
} = require('./_ollama');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const chave = process.env.OLLAMA_API_KEY;
    if (!chave) {
        return res.status(503).json({
            error: 'A IA em nuvem não está configurada neste servidor (falta a variável OLLAMA_API_KEY).'
        });
    }

    if (excedeLimite(req)) {
        return res.status(429).json({
            error: 'Muitas requisições em pouco tempo. Aguarde um instante e tente de novo.'
        });
    }

    let corpo;
    try {
        // O Vercel faz o parse do JSON; corpo inválido lança erro ao acessar
        corpo = req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Requisição inválida.' });
    }

    const validacao = validarRequisicao(corpo);
    if (validacao.erro) {
        return res.status(400).json({ error: validacao.erro });
    }

    const { model, messages, options } = corpo;
    const temperatura = typeof (options && options.temperature) === 'number'
        ? Math.min(Math.max(options.temperature, 0), 2)
        : 0.7;

    let upstream;
    try {
        upstream = await fetch(`${UPSTREAM}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${chave}`
            },
            body: JSON.stringify({
                model: model || MODELO_PADRAO,
                messages,
                stream: true,
                options: { temperature: temperatura }
            })
        });
    } catch (e) {
        return res.status(502).json({
            error: 'Não consegui falar com o servidor de IA. Tente de novo em instantes.'
        });
    }

    if (!upstream.ok) {
        const detalhe = await upstream.text().catch(() => '');

        if (upstream.status === 401 || upstream.status === 403) {
            console.error('[pluma] a chave da Ollama Cloud foi recusada');
            return res.status(502).json({
                error: 'A chave da IA em nuvem está inválida ou expirou. Verifique a configuração do servidor.'
            });
        }

        if (upstream.status === 404) {
            return res.status(404).json({
                error: `Modelo "${model || MODELO_PADRAO}" não está disponível na nuvem.`
            });
        }

        if (upstream.status === 429) {
            return res.status(429).json({
                error: 'A cota de uso da IA em nuvem foi atingida. Tente mais tarde.'
            });
        }

        console.error('[pluma] erro do provedor:', upstream.status, detalhe.slice(0, 300));
        return res.status(502).json({
            error: `O servidor de IA respondeu com erro ${upstream.status}.`
        });
    }

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);

    if (!upstream.body) {
        return res.end();
    }

    if (typeof Readable.fromWeb === 'function') {
        Readable.fromWeb(upstream.body).pipe(res);
        return;
    }

    // Runtime sem streams de Web: perde o token a token, mas ainda funciona
    const texto = await upstream.text().catch(() => '');
    res.end(texto);
};
