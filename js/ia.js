/**
 * PLUMA - Assistente de IA (Ollama)
 * Integração com Ollama rodando localmente para conversar sobre a entrada do diário
 */

const IA_CONFIG_KEY = 'pluma_ia_config';
const IA_CHATS_KEY = 'pluma_ia_chats';

// Conversas livres (sem diário) usam ids com este prefixo, para caberem várias
const IA_FREE_CHAT_PREFIX = 'livre-';

// Id legado da primeira versão do chat livre (continua sendo reconhecido)
const IA_FREE_CHAT_LEGACY_ID = 'livre';

function gerarIdLivre() {
    return IA_FREE_CHAT_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const IA_DEFAULT_CONFIG = {
    url: 'http://localhost:11434',
    model: 'llama3.2',
    temperature: 0.7
};

// Quantas mensagens do histórico vão para o modelo (o histórico completo fica salvo)
const IA_MAX_CONTEXT_MESSAGES = 12;

const IA_CVV_MESSAGE = `Parece que você está passando por algo muito pesado. Você não precisa lidar com isso sozinho(a).

Em emergência, ligue agora para o CVV (Centro de Valorização da Vida): 188 — atendimento gratuito, 24 horas, por telefone ou chat no site cvv.org.br. Também vale falar com alguém de confiança hoje ainda.

Estou aqui para te ouvir enquanto isso. Quer me contar o que aconteceu?`;

// ============================================
// PROMPT DO PSICÓLOGO
// ============================================

const IA_CONTEXTO_DIARIO = `A pessoa acabou de escrever uma entrada no diário contando como foi o dia dela. Essa entrada é o ponto de partida da conversa: use o que ela escreveu como material para explorá-lo com ela, ajudando a pessoa a entender o que sentiu, dar sentido ao que viveu e encontrar caminhos práticos de cuidado.`;

const IA_CONTEXTO_LIVRE = `A pessoa abriu o assistente para conversar livremente, sem uma entrada específica como ponto de partida. Você já acompanha o diário dela (veja as lembranças abaixo, quando existirem) e pode usá-las para personalizar a conversa e mostrar continuidade, sem esperar que ela repita o que já escreveu. Acolha o que ela trouxer e conduza a conversa com o mesmo cuidado, fazendo uma pergunta aberta de cada vez.`;

function montarSystemPrompt(livre = false, contextoDiario = null, contextoHumor = null) {
    return `Você é a Pluma, uma assistente de apoio emocional que atua como uma psicóloga acolhedora, dentro de um aplicativo de diário emocional. Você conversa em português do Brasil, com tom humano, caloroso e respeitoso.

## CONTEXTO
${livre ? IA_CONTEXTO_LIVRE : IA_CONTEXTO_DIARIO}

${contextoDiario
    ? `## O QUE VOCÊ JÁ SABE SOBRE ESTA PESSOA (diário)
Você tem acesso ao diário dela. Este é um resumo real das entradas, da mais recente para a mais antiga — trate como memória sua sobre quem ela é:

${contextoDiario}

Use essas lembranças para reconhecer padrões, retomar assuntos e mostrar que você acompanha a vida dela. Traga à tona só o que for relevante para o momento, com naturalidade, sem dizer que "leu um arquivo" e sem despejar tudo de uma vez. Nunca invente fatos: trabalhe apenas com o que está aqui.
`
    : `## SOBRE ESTA PESSOA
Ainda não há entradas no diário dela. Converse naturalmente, sem fingir conhecê-la. Se fizer sentido, convide-a a escrever no diário depois.
`
}

${contextoHumor
    ? `## REGISTROS DE HUMOR (acompanhamento emocional)
Também há registros de humor, com a emoção sentida e a nota que a pessoa escreveu:

${contextoHumor}

Use isso para reconhecer como ela vem se sentindo ao longo do tempo, sem forçar comparações. Só mencione quando fizer sentido para a conversa.
`
    : ``
}

## COMO RESPONDER
1. Comece sempre pela escuta. Acolha e valide o que a pessoa viveu antes de qualquer reflexão ou sugestão. O primeiro parágrafo deve fazer a pessoa se sentir ouvida.
2. Reflita o que ela trouxe. Aponte emoções, padrões, contradições e recursos que aparecem no texto, usando as palavras dela. Não resuma mecanicamente.
3. Devolva uma ou duas perguntas abertas e curiosas que convidem a pessoa a ir mais fundo. Uma pergunta por vez, no final da resposta.
4. Ofereça caminhos práticos (uma técnica de respiração, um pequeno ritual, um limite, uma conversa que valha a pena ter) somente quando fizer sentido para o que ela viveu. Nunca despeje uma lista de conselhos.
5. Respeite o ritmo da pessoa. Se ela quiser só ser ouvida, escute. Se quiser voltar a um assunto anterior, volte.

## ESTILO
- Escreva sempre em português do Brasil.
- Use "você", linguagem simples, acolhedora e direta.
- Respostas curtas: 2 a 4 parágrafos curtos. Nada de textos longos.
- Evite jargão psicológico e listas com marcadores. Se um termo técnico ajudar, explique com simplicidade.
- Nunca julgue, nunca minimize ("é só fase", "não é nada demais"), nunca compare a pessoa com os outros.
- Se a pessoa estiver bem, celebre e aproveite para investigar o que sustentou esse dia bom, porque isso também é informação clínica.

## LIMITES
- Você não faz diagnóstico, não prescreve medicamentos e não substitui terapia.
- Se o sofrimento for intenso, persistente ou estiver atrapalhando a rotina da pessoa, incentive com cuidado a procurar um psicólogo ou psiquiatra, e ofereça caminhos para isso.
- Se a pessoa perguntar se você é um robô, seja honesta: você é uma assistente digital, não um profissional.
- Não invente fatos sobre a vida da pessoa: use como base apenas o que ela escreveu no diário e o que contou nesta conversa. Não afirme lembrar de coisas que não estão aí.
- Se a pessoa pedir algo fora do escopo de apoio emocional, recuse com gentileza e redirecione para a conversa sobre o dia dela.

## EMERGÊNCIA
Se a pessoa falar em se machucar, não querer viver, se matar, acabar com tudo ou desaparecer, pare as reflexões. Diga com clareza e sem rodeios que a vida importa, incentive o contato imediato com o CVV no número 188 (24h, gratuito) e peça que procure uma pessoa de confiança agora. Continue por ali, em vez de seguir com a análise.`;
}

// ============================================
// CONFIGURAÇÃO
// ============================================
const IaConfig = {
    get() {
        const saved = getFromStorage(IA_CONFIG_KEY, {});
        return {
            url: normalizarUrl(saved.url || IA_DEFAULT_CONFIG.url),
            model: saved.model || IA_DEFAULT_CONFIG.model,
            temperature: typeof saved.temperature === 'number'
                ? saved.temperature
                : IA_DEFAULT_CONFIG.temperature
        };
    },

    set(config) {
        const current = this.get();
        const next = {
            url: normalizarUrl(config.url ?? current.url),
            model: (config.model ?? current.model).trim(),
            temperature: typeof config.temperature === 'number'
                ? config.temperature
                : current.temperature
        };
        saveToStorage(IA_CONFIG_KEY, next);
        return next;
    },

    reset() {
        localStorage.removeItem(IA_CONFIG_KEY);
        return { ...IA_DEFAULT_CONFIG };
    }
};

function normalizarUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

// ============================================
// STORAGE DAS CONVERSAS
// ============================================

const IaChats = {
    all() {
        const chats = getFromStorage(IA_CHATS_KEY, {});
        return (chats && typeof chats === 'object' && !Array.isArray(chats)) ? chats : {};
    },

    get(entryId) {
        return this.all()[entryId] || null;
    },

    // Uma conversa livre não está ligada a nenhuma entrada do diário
    isLivre(entryId) {
        const id = String(entryId ?? '');
        return id === IA_FREE_CHAT_LEGACY_ID || id.startsWith(IA_FREE_CHAT_PREFIX);
    },

    // Remove conversas livres vazias (abrir o chat não deve acumular lixo no storage)
    prune() {
        const chats = this.all();
        let mudou = false;

        Object.keys(chats).forEach(id => {
            if (!this.isLivre(id)) return;
            const mensagens = (chats[id] && chats[id].messages) || [];
            const temConversa = mensagens.some(m => m.role === 'user' && !m.isContext);
            if (!temConversa) {
                delete chats[id];
                mudou = true;
            }
        });

        if (mudou) saveToStorage(IA_CHATS_KEY, chats);
    },

    create(entry) {
        const chats = this.all();
        const now = new Date().toISOString();
        const chat = {
            entryId: entry.id,
            title: entry.title,
            emotion: entry.emotion || null,
            entryText: entry.text,
            entryCreatedAt: entry.createdAt || now,
            createdAt: now,
            updatedAt: now,
            messages: []
        };
        chats[entry.id] = chat;
        saveToStorage(IA_CHATS_KEY, chats);
        return chat;
    },

    // Cria (ou recupera) uma conversa livre. Sem id, gera um novo.
    ensureLivre(entryId) {
        const id = entryId ? String(entryId) : gerarIdLivre();
        const existente = this.get(id);
        if (existente) return existente;

        const chats = this.all();
        const now = new Date().toISOString();
        const chat = {
            entryId: id,
            livre: true,
            title: 'Conversa livre',
            emotion: null,
            entryText: '',
            entryCreatedAt: null,
            createdAt: now,
            updatedAt: now,
            messages: []
        };
        chats[id] = chat;
        saveToStorage(IA_CHATS_KEY, chats);
        return chat;
    },

    // Atualiza o retrato da entrada caso o texto do diário tenha sido editado
    sync(entryId, entry) {
        const chats = this.all();
        const chat = chats[entryId];
        if (!chat || !entry) return null;

        chat.title = entry.title;
        chat.emotion = entry.emotion || null;
        chat.entryText = entry.text;
        chat.entryCreatedAt = entry.createdAt || chat.entryCreatedAt;
        saveToStorage(IA_CHATS_KEY, chats);
        return chat;
    },

    // Só conta como sessão o que a pessoa realmente escreveu (o contexto inicial não vale)
    hasContent(entryId) {
        const chat = this.get(entryId);
        if (!chat || !Array.isArray(chat.messages)) return false;
        return chat.messages.some(m => m.role === 'user' && !m.isContext);
    },

/**
     * Todas as conversas salvas, da mais recente para a mais antiga.
     * Só entra quem realmente conversou: abrir o chat não cria sessão.
     * Conversas cuja entrada do diário foi apagada continuam na lista (orfa).
     */
    list() {
        const entries = (typeof Pluma !== 'undefined' ? Pluma.getDiaryEntries() : null) || [];

        return Object.values(this.all())
            .filter(chat => chat && Array.isArray(chat.messages)
                && chat.messages.some(m => m.role === 'user' && !m.isContext))
            .map(chat => {
                const livre = this.isLivre(chat.entryId) || Boolean(chat.livre);
                const entry = livre ? null : (entries.find(e => e.id === chat.entryId) || null);
                const faladas = chat.messages.filter(m => m.role === 'user' && !m.isContext);
                const ultima = faladas[faladas.length - 1];

                return {
                    entryId: chat.entryId,
                    livre,
                    title: chat.title || (livre ? 'Conversa livre' : 'Conversa sem título'),
                    emotion: chat.emotion || null,
                    entryText: chat.entryText || '',
                    entryCreatedAt: chat.entryCreatedAt || chat.createdAt,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    messages: chat.messages,
                    entry,
                    orfa: !entry && !livre,
                    totalMensagens: faladas.length,
                    preview: ultima ? ultima.content : (chat.entryText || '')
                };
            })
            .sort((a, b) => {
                const atividade = new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
                if (atividade !== 0) return atividade;

                const criacao = new Date(b.createdAt) - new Date(a.createdAt);
                if (criacao !== 0) return criacao;

                // mesmo instante: mantém a ordem estável (ids numéricos ou "livre")
                const numA = Number(a.entryId);
                const numB = Number(b.entryId);
                if (Number.isFinite(numA) && Number.isFinite(numB)) return numB - numA;
                return String(b.entryId).localeCompare(String(a.entryId));
            });
    },

    addMessage(entryId, role, content, extra = {}) {
        const chats = this.all();
        if (!chats[entryId]) return null;

        const message = {
            role,
            content,
            createdAt: new Date().toISOString(),
            ...extra
        };

        chats[entryId].messages.push(message);
        chats[entryId].updatedAt = message.createdAt;

        // Conversas livres ganham um título automático a partir da primeira mensagem
        if (role === 'user' && !extra.isContext && this.isLivre(entryId)
            && (!chats[entryId].title || chats[entryId].title === 'Conversa livre')) {
            const limpo = String(content).replace(/\s+/g, ' ').trim();
            if (limpo) {
                chats[entryId].title = limpo.length > 48 ? `${limpo.slice(0, 48).trim()}…` : limpo;
            }
        }

        saveToStorage(IA_CHATS_KEY, chats);
        return message;
    },

    clear(entryId) {
        const chats = this.all();
        if (!chats[entryId]) return false;

        chats[entryId].messages = [];
        chats[entryId].updatedAt = new Date().toISOString();
        return saveToStorage(IA_CHATS_KEY, chats);
    },

    remove(entryId) {
        const chats = this.all();
        delete chats[entryId];
        return saveToStorage(IA_CHATS_KEY, chats);
    },

    // Histórico que vai para o modelo, já com o prompt de sistema e o contexto do diário
    buildMessages(entryId) {
        const livre = this.isLivre(entryId);
        const sistema = { role: 'system', content: montarSystemPrompt(livre, montarContextoDiario(), montarContextoHumor()) };
        const chat = this.get(entryId);
        if (!chat) return [sistema];

        const history = chat.messages
            .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.isContext)
            .slice(-IA_MAX_CONTEXT_MESSAGES)
            .map(m => ({ role: m.role, content: m.content }));

        // Na conversa livre não existe entrada do diário para servir de contexto
        if (livre) return [sistema, ...history];

        return [
            sistema,
            { role: 'user', content: montarMensagemContexto(chat) },
            ...history
        ];
    }
};

function montarMensagemContexto(chat) {
    const emocao = chat.emotion ? Pluma.getEmotionData(chat.emotion) : null;
    const data = chat.createdAt ? Pluma.formatDateTime(chat.createdAt) : 'data desconhecida';

    return [
        '[Contexto: entrada de diário do usuário]',
        `Título: ${chat.title}`,
        `Data: ${data}`,
        emocao ? `Humor registrado: ${emocao.label}` : null,
        '',
        chat.entryText
    ].filter(linha => linha !== null).join('\n');
}

// Resumo das últimas entradas do diário para a IA conhecer a pessoa
function montarContextoDiario(limite = 12, maxChars = 240) {
    if (typeof Pluma === 'undefined' || typeof Pluma.getDiaryEntries !== 'function') return null;

    const entradas = Pluma.getDiaryEntries();
    if (!Array.isArray(entradas) || entradas.length === 0) return null;

    const linhas = entradas.slice(0, limite).map(e => {
        const emocao = e.emotion ? Pluma.getEmotionData(e.emotion) : null;
        const data = e.createdAt ? Pluma.formatDate(e.createdAt, 'medium') : 'data desconhecida';
        const texto = String(e.text || '').replace(/\s+/g, ' ').trim();
        if (!texto) return null;

        const corpo = texto.length > maxChars ? `${texto.slice(0, maxChars).trim()}…` : texto;
        const emocaoTxt = emocao ? ` • humor: ${emocao.label}` : '';
        return `- [${data}] ${e.title}${emocaoTxt}: ${corpo}`;
    }).filter(Boolean);

    if (linhas.length === 0) return null;

    const total = entradas.length;
    const ultima = entradas[0].createdAt ? Pluma.formatDate(entradas[0].createdAt, 'medium') : null;
    const cabecalho = `Total de entradas: ${total}${ultima ? ` (última em ${ultima})` : ''}.`;
    const aviso = total > linhas.length
        ? `Mostrando as ${linhas.length} mais recentes:`
        : 'Entradas:';

    return [cabecalho, aviso, ...linhas].join('\n');
}

// Resumo dos registros de humor para a IA conhecer o que a pessoa sentiu
function montarContextoHumor(limite = 15, maxChars = 200) {
    if (typeof Pluma === 'undefined' || typeof Pluma.getMoods !== 'function') return null;

    const moods = Pluma.getMoods();
    if (!Array.isArray(moods) || moods.length === 0) return null;

    const ordenados = moods.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const linhas = ordenados.slice(0, limite).map(m => {
        const emocao = m.emotion ? Pluma.getEmotionData(m.emotion) : null;
        const data = m.createdAt ? Pluma.formatDate(m.createdAt, 'medium') : 'data desconhecida';
        const nota = String(m.note || '').replace(/\s+/g, ' ').trim();
        const atividades = Array.isArray(m.activities) && m.activities.length > 0
            ? ` • atividades: ${m.activities.join(', ')}`
            : '';
        const corpo = nota.length > maxChars ? `${nota.slice(0, maxChars).trim()}…` : nota;
        if (!nota && atividades === '') return null;
        return `- [${data}] ${emocao ? emocao.label : m.emotion}${atividades}: ${corpo || '(sem nota)'}`;
    }).filter(Boolean);

    if (linhas.length === 0) return null;

    const total = moods.length;
    const ultima = moods[moods.length - 1]?.createdAt ? Pluma.formatDate(moods[moods.length - 1].createdAt, 'medium') : null;
    const cabecalho = `Registros de humor: ${total}${ultima ? ` (mais recente encontrado no contexto: ${ultima})` : ''}.`;
    const aviso = total > linhas.length
        ? `Mostrando os ${linhas.length} mais recentes:`
        : 'Registros:';

    return [cabecalho, aviso, ...linhas].join('\n');
}

// ============================================
// CLIENTE OLLAMA
// ============================================

const Ollama = {
    async isOnline(config = IaConfig.get()) {
        try {
            const res = await fetch(`${config.url}/api/tags`, { method: 'GET' });
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    async listModels(config = IaConfig.get()) {
        const res = await fetch(`${config.url}/api/tags`, { method: 'GET' });
        if (!res.ok) throw new Error(`Ollama respondeu com erro ${res.status}`);

        const data = await res.json();
        return (data.models || []).map(m => m.name).filter(Boolean);
    },

    /**
     * Envia as mensagens para o Ollama e devolve a resposta completa.
     * Usa streaming NDJSON quando disponível, senão cai para resposta única.
     */
    async chat(messages, { config = IaConfig.get(), onToken, signal } = {}) {
        const res = await fetch(`${config.url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                model: config.model,
                messages,
                stream: true,
                options: { temperature: config.temperature }
            })
        });

        if (!res.ok) {
            const detalhes = await res.text().catch(() => '');
            throw new Error(
                res.status === 404
                    ? `Modelo "${config.model}" não encontrado no Ollama. Rode: ollama pull ${config.model}`
                    : `Ollama respondeu com erro ${res.status}. ${detalhes.slice(0, 120)}`
            );
        }

        if (!res.body || typeof res.body.getReader !== 'function') {
            const data = await res.json();
            const content = data?.message?.content || '';
            if (content && onToken) onToken(content);
            return content;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const linhas = buffer.split('\n');
            buffer = linhas.pop() || '';

            for (const linha of linhas) {
                if (!linha.trim()) continue;

                let chunk;
                try {
                    chunk = JSON.parse(linha);
                } catch (e) {
                    continue;
                }

                const content = chunk?.message?.content || '';
                if (content) {
                    full += content;
                    if (onToken) onToken(content);
                }
            }
        }

        return full;
    }
};

// ============================================
// DETECÇÃO DE CRISE (primeira resposta do usuário)
// ============================================

function detectarCrise(texto) {
    const alvo = String(texto || '').toLowerCase();
    const termos = [
        'me matar', 'me mato', 'matar-me', 'suicid', 'tirar a minha vida', 'acabar com a minha vida',
        'acabar com tudo', 'não quero mais viver', 'nao quero mais viver', 'não quero lived',
        'desaparecer pra sempre', 'sumir pra sempre', 'não vale a pena viver', 'nao vale a pena',
        'me machucar', 'me cortar', 'queria morrer', 'quero morrer', 'risco de vida'
    ];
    return termos.some(termo => alvo.includes(termo));
}

// ============================================
// UI DO CHAT
// ============================================

const IaChat = {
    entryId: null,
    isBusy: false,
    inited: false,
    inputHabilitado: false,

    init() {
        if (this.inited) return;

        const form = document.getElementById('aiForm');
        if (!form) return;

        form.addEventListener('submit', e => {
            e.preventDefault();
            this.enviarMensagem();
        });

        document.getElementById('aiCloseModal')?.addEventListener('click', () => this.close());
        document.getElementById('aiVoltarBtn')?.addEventListener('click', () => this.voltar());
        document.getElementById('aiNovoBtn')?.addEventListener('click', () => this.abrirChatLivre());
        document.getElementById('aiLimparBtn').addEventListener('click', () => this.limparConversa());
        document.getElementById('aiConfigBtn').addEventListener('click', () => this.toggleConfigPanel());
        document.getElementById('aiHistoricoBtn')?.addEventListener('click', () => this.toggleHistorico());
        document.getElementById('aiHistoricoFechar')?.addEventListener('click', () => this.fecharHistorico());
        document.getElementById('aiHistoricoBackdrop')?.addEventListener('click', () => this.fecharHistorico());

        const input = document.getElementById('aiInput');
        input.addEventListener('input', () => this.ajustarAlturaInput());

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.enviarMensagem();
            }
        });

        const overlay = document.getElementById('aiModal');
        if (overlay) {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) this.close();
            });
        }

        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (this.historicoAberto()) {
                this.fecharHistorico();
                return;
            }
            if (overlay?.classList.contains('visible')) this.close();
        });

        document.getElementById('aiConfigPanel').addEventListener('submit', e => {
            e.preventDefault();
            this.salvarConfig();
        });

        document.getElementById('aiCancelConfigBtn').addEventListener('click', () => {
            this.toggleConfigPanel(false);
        });

        this.inited = true;
    },

    renderSemEntrada() {
        const lista = document.getElementById('aiMessages');
        lista.innerHTML = '';
        lista.appendChild(this.criarBemVindo(
            'Não encontramos nenhuma entrada do diário para conversar.',
            { href: 'diario.html', texto: 'Ir para o diário' }
        ));

        this.definirInput(false);
    },

    /**
     * Habilita ou desabilita o campo de mensagem.
     * Precisa ser chamado sempre que a conversa abre/fecha: sem isso o campo
     * ficava travado para sempre depois de um estado vazio.
     */
    definirInput(ativo) {
        this.inputHabilitado = Boolean(ativo);
        this.syncInputState();
    },

    syncInputState() {
        const input = document.getElementById('aiInput');
        const botao = document.getElementById('aiSendBtn');
        if (input) input.disabled = !this.inputHabilitado;
        if (botao) botao.disabled = !this.inputHabilitado || this.isBusy;
    },

    async abrirConversa(entryId, { silencioso = false } = {}) {
        const livre = IaChats.isLivre(entryId);
        const id = livre ? String(entryId) : Number(entryId);
        const entrada = livre ? null : Pluma.getDiaryEntries().find(e => e.id === id);

        if (!livre && !entrada && !IaChats.get(id)) {
            if (silencioso) this.renderSemEntrada();
            else alert('Não foi possível encontrar esta conversa.');
            return;
        }

        this.init();
        this.entryId = id;

        // A entrada pode ter sido editada depois da conversa: refresca o contexto
        if (!livre && entrada && IaChats.get(id)) IaChats.sync(id, entrada);
        // Abrir a conversa livre já garante o registro salvo (sem criar sessão ainda)
        if (livre && !IaChats.get(id)) IaChats.ensureLivre(id);

        const chat = IaChats.get(id);
        this.atualizarSubtitulo(entrada, chat);
        this.definirInput(true);

        this.render();
        document.getElementById('aiModal')?.classList.add('visible');
        document.getElementById('aiCrisisAlert')?.classList.remove('visible');
        this.ajustarAlturaInput();
        this.scrollToBottom();
        this.focoNoInput();

        if (!chat) {
            await this.iniciarConversa();
        } else {
            this.setStatus('');
        }
    },

    // Mantido porque o diário chama este nome
    abrirParaEntrada(entryId) {
        return this.abrirConversa(entryId);
    },

    // Abre uma nova conversa com a IA, sem depender de nenhuma entrada do diário
    abrirChatLivre() {
        return this.abrirConversa(gerarIdLivre());
    },

    atualizarSubtitulo(entrada, chat) {
        const subtitle = document.getElementById('aiModalSubtitle');
        if (!subtitle) return;

        if (IaChats.isLivre(this.entryId)) {
            const titulo = chat && chat.title && chat.title !== 'Conversa livre' ? chat.title : null;
            subtitle.textContent = titulo ? `Conversa livre • ${titulo}` : 'Conversa livre • sem diário';
            return;
        }

        if (entrada) {
            subtitle.textContent = `${Pluma.formatDateTime(entrada.createdAt)} • ${entrada.title}`;
            return;
        }

        subtitle.textContent = chat
            ? `Conversa salva • ${chat.title || 'sem título'}`
            : 'Conversa com a Pluma';
    },

    close() {
        this.fecharHistorico();
        document.getElementById('aiModal')?.classList.remove('visible');
        this.setTyping(false);
    },

    // Sai da conversa em tela cheia voltando para a página anterior
    voltar() {
        this.fecharHistorico();
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'diario.html';
        }
    },

    async iniciarConversa() {
        const livre = IaChats.isLivre(this.entryId);
        let chat = IaChats.get(this.entryId);

        if (!chat) {
            if (livre) {
                chat = IaChats.ensureLivre(this.entryId);
            } else {
                const entry = Pluma.getDiaryEntries().find(e => e.id === this.entryId);
                if (!entry) return;
                chat = IaChats.create(entry);
            }
        }

        // A conversa livre não tem entrada do diário: a pessoa começa escrevendo
        if (livre) {
            this.render();
            this.setStatus('');
            return;
        }

        IaChats.addMessage(this.entryId, 'user', montarMensagemContexto(chat), { isContext: true });
        this.render();

        await this.responder();
    },

    async enviarMensagem() {
        const input = document.getElementById('aiInput');
        const texto = input.value.trim();
        if (!texto || this.isBusy || !this.inputHabilitado) return;

        input.value = '';
        this.ajustarAlturaInput();

        IaChats.addMessage(this.entryId, 'user', texto);
        this.render();
        this.scrollToBottom();

        await this.responder();
    },

    async responder() {
        if (this.isBusy) return;
        this.isBusy = true;
        this.setTyping(true);

        this.verificarCrise();

        const placeholder = this.adicionarMensagemViva();

        try {
            const resposta = await Ollama.chat(IaChats.buildMessages(this.entryId), {
                onToken: trecho => {
                    placeholder.element.textContent += trecho;
                    this.scrollToBottom();
                }
            });

            placeholder.concluir(resposta);
            this.setStatus('');
        } catch (e) {
            placeholder.remover();
            this.setStatus(erroConexao(e));
        } finally {
            // isBusy precisa cair antes: setTyping reavalia o estado do botão enviar
            this.isBusy = false;
            this.setTyping(false);
        }
    },

    // Se a última mensagem do usuário indicar risco, prioriza o protocolo de emergência
    verificarCrise() {
        const chat = IaChats.get(this.entryId);
        if (!chat) return;

        const ultimaUsuario = [...chat.messages].reverse().find(m => m.role === 'user');
        if (!ultimaUsuario || !detectarCrise(ultimaUsuario.content)) return;

        document.getElementById('aiCrisisAlert')?.classList.add('visible');

        if (!chat.messages.some(m => m.isAlerta)) {
            IaChats.addMessage(this.entryId, 'assistant', IA_CVV_MESSAGE, { isAlerta: true });
            this.render();
        }
    },

    adicionarMensagemViva() {
        const lista = document.getElementById('aiMessages');
        const element = document.createElement('div');
        element.className = 'ai-message ai-message-assistant';

        const bolha = document.createElement('div');
        bolha.className = 'ai-bubble ai-bubble-live';
        bolha.textContent = '';

        element.appendChild(bolha);
        lista.appendChild(element);
        this.scrollToBottom();

        return {
            element: bolha,
            concluir(texto) {
                bolha.classList.remove('ai-bubble-live');
                bolha.textContent = (texto || '').trim()
                    || 'Não consegui formular uma resposta agora. Pode tentar novamente?';

                if (texto) {
                    IaChats.addMessage(IaChat.entryId, 'assistant', texto.trim());
                }
                IaChat.render();
            },
            remover() {
                element.remove();
            }
        };
    },

    render() {
        const lista = document.getElementById('aiMessages');
        const chat = IaChats.get(this.entryId);
        lista.innerHTML = '';

        if (!chat || chat.messages.length === 0) {
            const livre = IaChats.isLivre(this.entryId);
            lista.appendChild(this.criarBemVindo(
                livre
                    ? 'Converse com a Pluma sobre o que quiser. Ela já conhece o que você escreveu no seu diário — é só começar.'
                    : 'Suas mensagens e as respostas ficam salvas no seu dispositivo.'
            ));
            return;
        }

        chat.messages.forEach(msg => {
            const element = document.createElement('div');
            element.className = `ai-message ai-message-${msg.role === 'user' ? 'user' : 'assistant'}`;

            if (msg.isContext) {
                const tag = document.createElement('div');
                tag.className = 'ai-message-tag';
                tag.textContent = 'Sua entrada do diário';
                element.appendChild(tag);
            }

            const bolha = document.createElement('div');
            bolha.className = 'ai-bubble';
            bolha.textContent = msg.content;

            element.appendChild(bolha);
            lista.appendChild(element);
        });

        this.scrollToBottom();
    },

    criarBemVindo(texto, link) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-welcome';

        const icone = document.createElement('i');
        icone.className = link ? 'fas fa-book-open' : 'fas fa-user-doctor';

        const paragrafo = document.createElement('p');
        paragrafo.textContent = texto;

        wrapper.appendChild(icone);
        wrapper.appendChild(paragrafo);

        if (link) {
            const botao = document.createElement('a');
            botao.className = 'btn btn-primary';
            botao.href = link.href;
            botao.textContent = link.texto;
            wrapper.appendChild(botao);
        }

        return wrapper;
    },

    limparConversa() {
        const livre = IaChats.isLivre(this.entryId);

        if (!IaChats.hasContent(this.entryId)) {
            alert('Esta conversa ainda não tem nada salvo.');
            return;
        }

        const pergunta = livre
            ? 'Excluir esta conversa de vez? As mensagens não poderão ser recuperadas.'
            : 'Excluir de vez a conversa com a IA sobre este dia? As mensagens não poderão ser recuperadas.';
        if (!confirm(pergunta)) return;

        IaChats.remove(this.entryId);
        this.entryId = null;
        this.fecharHistorico();

        // Em vez de fechar o chat, pula para outra conversa (ou abre uma nova)
        const restantes = IaChats.list();
        if (restantes.length > 0) {
            this.abrirConversa(restantes[0].entryId);
        } else {
            this.abrirChatLivre();
        }

        // Atualiza o badge "já conversou" dos cards do diário
        if (typeof loadEntries === 'function' && document.getElementById('diaryEntries')) {
            loadEntries();
        }
    },

    // ============================================
    // HISTÓRICO DE CONVERSAS
    // ============================================

    historicoAberto() {
        return document.getElementById('aiHistorico')?.classList.contains('visible') || false;
    },

    toggleHistorico(force) {
        const abrir = force !== undefined ? force : !this.historicoAberto();
        if (abrir) this.abrirHistorico();
        else this.fecharHistorico();
    },

    abrirHistorico() {
        const painel = document.getElementById('aiHistorico');
        if (!painel) return;

        this.renderHistorico();
        this.toggleConfigPanel(false);
        // enquanto a pessoa navega pelo histórico, o campo espera a escolha
        this.definirInput(false);
        painel.classList.add('visible');
        document.getElementById('aiHistoricoBackdrop')?.classList.add('visible');
    },

    fecharHistorico() {
        document.getElementById('aiHistorico')?.classList.remove('visible');
        document.getElementById('aiHistoricoBackdrop')?.classList.remove('visible');
        this.definirInput(Boolean(this.entryId));
    },

    renderHistorico() {
        const lista = document.getElementById('aiHistoricoLista');
        if (!lista) return;

        const conversas = IaChats.list();
        lista.innerHTML = '';

        if (conversas.length === 0) {
            lista.appendChild(this.criarBemVindo(
                'Nenhuma conversa salva ainda. Toque em "Conversar com a IA" para começar.'
            ));
            return;
        }

        conversas.forEach(conversa => {
            lista.appendChild(this.criarItemHistorico(conversa));
        });
    },

    criarItemHistorico(conversa) {
        const emocao = conversa.emotion ? Pluma.getEmotionData(conversa.emotion) : null;

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'ai-historico-item';
        if (conversa.entryId === this.entryId) item.classList.add('active');

        const topo = document.createElement('div');
        topo.className = 'ai-historico-item-top';

        const titulo = document.createElement('span');
        titulo.className = 'ai-historico-item-title';
        titulo.textContent = conversa.title;
        topo.appendChild(titulo);

        if (emocao) {
            const icone = document.createElement('span');
            icone.className = 'ai-historico-item-emotion';
            icone.textContent = emocao.icon;
            topo.appendChild(icone);
        }

        const meta = document.createElement('div');
        meta.className = 'ai-historico-item-meta';

        const quando = document.createElement('span');
        quando.textContent = `${Pluma.formatDateTime(conversa.entryCreatedAt)}`
            + (conversa.livre ? ' • sem diário' : '')
            + (conversa.orfa ? ' • entrada removida' : '');

        const total = document.createElement('span');
        total.textContent = conversa.totalMensagens === 1
            ? '1 mensagem'
            : `${conversa.totalMensagens} mensagens`;

        meta.appendChild(quando);
        meta.appendChild(total);

        const preview = document.createElement('p');
        preview.className = 'ai-historico-item-preview';
        preview.textContent = conversa.preview;

        item.appendChild(topo);
        item.appendChild(meta);
        item.appendChild(preview);

        item.addEventListener('click', () => {
            this.fecharHistorico();
            this.abrirConversa(conversa.entryId);
        });

        return item;
    },

    // ============================================
    // CAMPO DE MENSAGEM
    // ============================================

    setTyping(mostrar) {
        const indicator = document.getElementById('aiTyping');
        indicator.classList.toggle('visible', mostrar);
        this.syncInputState();
        if (mostrar) this.scrollToBottom();
    },

    setStatus(texto) {
        const status = document.getElementById('aiStatus');
        status.textContent = texto;
        status.classList.toggle('visible', Boolean(texto));
    },

    ajustarAlturaInput() {
        const input = document.getElementById('aiInput');
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    },

    focoNoInput() {
        const input = document.getElementById('aiInput');
        if (input && !input.disabled) input.focus();
    },

    scrollToBottom() {
        const lista = document.getElementById('aiMessages');
        lista.scrollTop = lista.scrollHeight;
    },

    toggleConfigPanel(force) {
        const panel = document.getElementById('aiConfigPanel');
        const config = IaConfig.get();

        document.getElementById('aiConfigUrl').value = config.url;
        document.getElementById('aiConfigModel').value = config.model;

        const abrir = force !== undefined ? force : !panel.classList.contains('visible');
        panel.classList.toggle('visible', abrir);
    },

    async salvarConfig() {
        const url = document.getElementById('aiConfigUrl').value.trim();
        const model = document.getElementById('aiConfigModel').value.trim();

        if (!url) {
            alert('Informe o endereço do Ollama.');
            return;
        }

        const config = IaConfig.set({ url, model });
        this.toggleConfigPanel(false);
        this.setStatus('testando conexão...');

        const online = await Ollama.isOnline(config);
        this.setStatus(
            online
                ? `Conectado ao Ollama em ${config.url}`
                : `Não consegui conectar em ${config.url}. Verifique se o Ollama está rodando.`
        );
    }
};

function erroConexao(e) {
    if (!e) return 'Erro inesperado ao falar com a IA.';
    if (e.name === 'AbortError') return '';

    const mensagem = e.message || '';
    // Falha de rede/CORS chega como TypeError ("fetch failed" / "Failed to fetch")
    const falhaRede = e.name === 'TypeError'
        || /failed to fetch|fetch failed|networkerror|load failed/i.test(mensagem);

    if (falhaRede) {
        return `Não consegui conectar ao Ollama em ${IaConfig.get().url}. `
            + 'Abra o aplicativo Ollama e verifique o endereço nas configurações.';
    }

    return mensagem || 'Erro inesperado ao falar com a IA.';
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Se aberto direto pela URL (ia.html?id=123 ou ia.html?id=livre), entra na conversa
const IA_ENTRY_ID_RAW = new URLSearchParams(window.location.search).get('id');
const IA_ENTRY_ID_PARAM = parseInt(IA_ENTRY_ID_RAW, 10);

document.addEventListener('DOMContentLoaded', function() {
    // Páginas que só reaproveitam o histórico da IA (ex.: historico.html) não
    // têm a interface do chat: só o armazenamento é usado lá.
    if (!document.getElementById('aiForm')) return;

    IaChats.prune();
    IaChat.init();

    // No diário o chat vive dentro de um modal: espera a pessoa abrir,
    // senão o estado vazio desabilitaria o campo para o resto da sessão
    if (document.getElementById('aiModal')) return;

    if (IA_ENTRY_ID_RAW && IaChats.isLivre(IA_ENTRY_ID_RAW)) {
        IaChat.abrirConversa(IA_ENTRY_ID_RAW, { silencioso: true });
        return;
    }

    if (Number.isFinite(IA_ENTRY_ID_PARAM)) {
        IaChat.abrirConversa(IA_ENTRY_ID_PARAM, { silencioso: true });
        return;
    }

    // Sem ?id= na tela cheia: mostra o que já foi salvo
    if (IaChats.list().length > 0) IaChat.abrirHistorico();
    else IaChat.renderSemEntrada();
});