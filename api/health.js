/**
 * PLUMA - status da IA em nuvem
 *
 * Usado pelo botão "Salvar e testar" e para avisar se o servidor tem a chave
 * configurada. A lista de modelos do Ollama Cloud é pública, então vem de
 * https://ollama.com/api/tags sem gastar cota e sem expor a chave.
 */

const { UPSTREAM, MODELO_PADRAO, MODELOS_PERMITIDOS } = require('./_ollama');

const CACHE_TTL = 10 * 60 * 1000;
let cache = { lista: [], expiraEm: 0 };

async function listarModelos() {
    const agora = Date.now();

    if (cache.expiraEm > agora && cache.lista.length) {
        return cache.lista;
    }

    try {
        const res = await fetch(`${UPSTREAM}/tags`);

        if (!res.ok) {
            throw new Error(`tags respondeu ${res.status}`);
        }

        const data = await res.json();
        const lista = (data.models || [])
            .map(modelo => modelo && modelo.name)
            .filter(Boolean)
            .sort();

        if (lista.length) {
            cache = { lista, expiraEm: agora + CACHE_TTL };
        }

        return lista.length ? lista : cache.lista;
    } catch (e) {
        // Sem lista nova: devolve a última conhecida
        return cache.lista;
    }
}

module.exports = async function handler(req, res) {
    const configurado = Boolean(process.env.OLLAMA_API_KEY);
    const modelos = await listarModelos();

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
        ok: configurado,
        provider: 'ollama-cloud',
        modeloPadrao: MODELO_PADRAO,
        modelosPermitidos: MODELOS_PERMITIDOS,
        modelosCloud: modelos,
        mensagem: configurado
            ? 'IA em nuvem configurada.'
            : 'A IA em nuvem não está configurada neste servidor.'
    });
};
