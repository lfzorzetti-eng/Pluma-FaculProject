/**
 * PLUMA - helpers do proxy de IA (Ollama Cloud)
 *
 * Arquivo auxiliar: o prefixo "_" faz o Vercel não criar rota para ele.
 * A chave da API nunca sai do servidor — ela vive na variável de ambiente
 * OLLAMA_API_KEY e só é usada para falar com o provedor.
 */

const UPSTREAM = 'https://ollama.com/api';

/**
 * Carrega o .env da raiz do projeto (apenas em execução local).
 * Na Vercel a chave vem das variáveis de ambiente do projeto, e lá não existe
 * .env — então este passo não faz nada. Variáveis já definidas têm prioridade.
 */
function carregarEnvLocal() {
    try {
        const fs = require('node:fs');
        const path = require('node:path');

        const arquivo = path.join(process.cwd(), '.env');
        if (!fs.existsSync(arquivo)) return;

        fs.readFileSync(arquivo, 'utf8').split(/\r?\n/).forEach(linha => {
            const match = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
            if (!match) return;

            const [, nome, valor] = match;
            if (process.env[nome] === undefined) {
                process.env[nome] = valor.trim().replace(/^["']|["']$/g, '');
            }
        });
    } catch (e) {
        // Sem .env: segue com as variáveis de ambiente do processo
    }
}

carregarEnvLocal();

// Modelos liberados para o app. A lista evita que qualquer pessoa use a
// credencial do projeto com modelos caros ou inadequados ao uso do site.
const MODELOS_PERMITIDOS = [
    'gpt-oss:20b',
    'gpt-oss:120b',
    'gemma4:31b',
    'nemotron-3-nano:30b',
    'nemotron-3-super',
    'deepseek-v4.1-flash',
    'glm-5.3-flash',
    'minimax-m3',
    'mistral-large-4',
    'clef:27b'
];

const MODELO_PADRAO = 'gpt-oss:20b';

const LIMITE = {
    mensagens: 60,
    caracteresMensagem: 24000,
    payloadBytes: 64 * 1024,
    requisicoesPorMinuto: 20,
    janelaMinutos: 1
};

// ------------------------------------------------------------------
// Limite de requisições (por instância; o suficiente para uso acadêmico)
// ------------------------------------------------------------------

const janelas = new Map();

function ipDaRequisicao(req) {
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return (req.socket && req.socket.remoteAddress) || 'desconhecido';
}

function excedeLimite(req) {
    const agora = Date.now();
    const janela = LIMITE.janelaMinutos * 60 * 1000;
    const ip = ipDaRequisicao(req);
    const registro = janelas.get(ip);

    if (!registro || agora - registro.inicio >= janela) {
        janelas.set(ip, { inicio: agora, total: 1 });

        // A memória da função não pode crescer sem limite
        if (janelas.size > 5000) janelas.clear();

        return false;
    }

    registro.total += 1;
    return registro.total > LIMITE.requisicoesPorMinuto;
}

// ------------------------------------------------------------------
// Validação do corpo da requisição
// ------------------------------------------------------------------

function validarRequisicao(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { erro: 'Corpo da requisição inválido.' };
    }

    const { model, messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return { erro: 'A requisição precisa de pelo menos uma mensagem.' };
    }

    if (messages.length > LIMITE.mensagens) {
        return { erro: `Limite de ${LIMITE.mensagens} mensagens por requisição.` };
    }

    for (const mensagem of messages) {
        if (!mensagem || typeof mensagem.content !== 'string') {
            return { erro: 'Formato de mensagem inválido.' };
        }
        if (mensagem.content.length > LIMITE.caracteresMensagem) {
            return { erro: 'Uma das mensagens é longa demais.' };
        }
    }

    if (model && !MODELOS_PERMITIDOS.includes(model)) {
        return { erro: `Modelo "${model}" não está disponível.` };
    }

    const tamanho = JSON.stringify(body).length;
    if (tamanho > LIMITE.payloadBytes) {
        return { erro: 'Requisição grande demais.' };
    }

    return {};
}

module.exports = {
    UPSTREAM,
    MODELOS_PERMITIDOS,
    MODELO_PADRAO,
    LIMITE,
    excedeLimite,
    validarRequisicao
};
