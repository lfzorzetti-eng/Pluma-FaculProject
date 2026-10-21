/**
 * PLUMA - Diário Emocional
 * Sistema de criação, edição e visualização de entradas do diário
 */

let currentEntryId = null;
let selectedEntryEmotion = null;
let isEditing = false;

// Perguntas orientadoras opcionais: ajudam a estruturar a reflexão sem obrigar
// a pessoa a responder tudo (o texto livre continua disponível).
const PERGUNTAS_ORIENTADORAS = [
    { id: 'o-que-aconteceu', pergunta: 'O que aconteceu?' },
    { id: 'o-que-pode-ajudar', pergunta: 'O que pode me ajudar agora?' },
    { id: 'rede-de-apoio', pergunta: 'Quem da minha rede de apoio pode oferecer ajuda?' },
    { id: 'como-melhorar', pergunta: 'Como posso melhorar essa situação?' }
];

document.addEventListener('DOMContentLoaded', function() {
    initDiaryPage();
});

function initDiaryPage() {
    // Carrega entradas
    loadEntries();
    
    // Configura modal
    setupModal();
    
    // Configura busca
    setupSearch();
    
    // Configura botões
    setupButtons();
    
    // Configura seletor de emoção
    setupEmotionSelector();
    
    // Configura perguntas orientadoras
    setupPerguntasGuia();
}

// ============================================
// PERGUNTAS ORIENTADORAS
// ============================================

function setupPerguntasGuia() {
    const lista = document.getElementById('perguntasGuiaLista');
    if (!lista) return;

    lista.innerHTML = PERGUNTAS_ORIENTADORAS.map(p => `
        <div class="pergunta-guia">
            <label class="pergunta-guia-label" for="guia-${p.id}">${p.pergunta}</label>
            <textarea
                class="form-textarea pergunta-guia-input"
                id="guia-${p.id}"
                data-guia-id="${p.id}"
                rows="2"
                placeholder="Escreva aqui, se quiser..."
            ></textarea>
        </div>
    `).join('');

    const toggle = document.getElementById('perguntasGuiaToggle');
    if (!toggle) return;

    toggle.addEventListener('click', function() {
        const aberta = lista.classList.toggle('aberta');
        toggle.classList.toggle('aberta', aberta);
        toggle.setAttribute('aria-expanded', aberta ? 'true' : 'false');
    });
}

// Devolve apenas as perguntas que foram respondidas
function coletarRespostasGuia() {
    return PERGUNTAS_ORIENTADORAS
        .map(p => {
            const campo = document.getElementById(`guia-${p.id}`);
            const resposta = campo ? campo.value.trim() : '';
            return resposta ? { id: p.id, pergunta: p.pergunta, resposta } : null;
        })
        .filter(Boolean);
}

// Preenche as perguntas de uma entrada que já existe
function preencherRespostasGuia(respostas) {
    if (!Array.isArray(respostas)) return;
    respostas.forEach(r => {
        const campo = document.getElementById(`guia-${r.id}`);
        if (campo) campo.value = r.resposta || '';
    });
}

function respostasDaEntrada(entry) {
    return Array.isArray(entry && entry.respostas) ? entry.respostas : [];
}

// Texto usado no card e na busca quando a pessoa não escreveu no campo livre
function textoPreview(entry) {
    if (entry.text) return entry.text;
    return respostasDaEntrada(entry).map(r => r.resposta).join(' ');
}

// ============================================
// CARREGAR ENTRADAS
// ============================================

function loadEntries() {
    const entries = Pluma.getDiaryEntries();
    const container = document.getElementById('diaryEntries');
    const emptyState = document.getElementById('diaryEmpty');
    
    if (entries.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = '';
        return;
    }
    
    container.style.display = '';
    emptyState.style.display = 'none';
    
    container.innerHTML = renderEntryCards(entries);
    
    bindEntryActions(container);
}

// Lê as conversas da IA uma única vez ao desenhar a lista
function renderEntryCards(entries) {
    return entries.map(entry => {
        const temConversa = typeof IaChats !== 'undefined' && IaChats.hasContent(entry.id);
        return createEntryCard(entry, temConversa);
    }).join('');
}

function bindEntryActions(container) {
    container.querySelectorAll('.diary-entry').forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.entry-action')) {
                viewEntry(parseInt(this.dataset.id));
            }
        });
    });
    
    container.querySelectorAll('.entry-action.edit').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            editEntry(parseInt(this.closest('.diary-entry').dataset.id));
        });
    });
    
    container.querySelectorAll('.entry-action.delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteEntry(parseInt(this.closest('.diary-entry').dataset.id));
        });
    });
    
    container.querySelectorAll('.entry-action.talk-ai').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            falarComIa(parseInt(this.closest('.diary-entry').dataset.id));
        });
    });
}

function createEntryCard(entry, temConversa = false) {
    const emotionData = entry.emotion ? Pluma.getEmotionData(entry.emotion) : { icon: '📝' };
    const dayName = Pluma.getDayName(entry.createdAt);
    
    return `
        <div class="diary-entry" data-id="${entry.id}">
            <div class="entry-header">
                <div class="entry-date">
                    <span class="entry-day">${dayName}</span>
                    <span class="entry-full-date">${Pluma.formatDate(entry.createdAt, 'medium')}</span>
                </div>
                <div class="entry-meta">
                    ${temConversa ? '<span class="entry-ai-badge" title="Você já conversou com a IA sobre este dia"><i class="fas fa-user-doctor"></i></span>' : ''}
                    <span class="entry-emotion">${emotionData.icon}</span>
                </div>
            </div>
            <h3 class="entry-title">${Pluma.escapeHtml(entry.title)}</h3>
            <p class="entry-preview">${Pluma.escapeHtml(textoPreview(entry))}</p>
            <div class="entry-actions">
                <button class="entry-action talk-ai">
                    <i class="fas fa-user-doctor"></i>
                    Falar com a IA
                </button>
                <button class="entry-action edit">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="entry-action delete">
                    <i class="fas fa-trash"></i>
                    Excluir
                </button>
            </div>
        </div>
    `;
}

// ============================================
// CONVERSAR COM A IA
// ============================================

function falarComIa(entryId) {
    if (typeof IaChat === 'undefined') return;
    IaChat.abrirParaEntrada(entryId);
}

// ============================================
// VISUALIZAR ENTRADA
// ============================================

function viewEntry(id) {
    const entries = Pluma.getDiaryEntries();
    const entry = entries.find(e => e.id === id);
    
    if (!entry) return;
    
    currentEntryId = id;
    
    const emotionData = entry.emotion ? Pluma.getEmotionData(entry.emotion) : { icon: '📝', label: '' };
    const respostas = respostasDaEntrada(entry);
    
    const blocoGuia = respostas.length ? `
        <div class="entry-view-guia">
            <h4 class="entry-view-guia-titulo">
                <i class="fas fa-compass"></i>
                Perguntas orientadoras
            </h4>
            ${respostas.map(r => `
                <div class="entry-guia-item">
                    <span class="entry-guia-pergunta">${Pluma.escapeHtml(r.pergunta)}</span>
                    <p class="entry-guia-resposta">${Pluma.escapeHtml(r.resposta)}</p>
                </div>
            `).join('')}
        </div>
    ` : '';
    
    const viewContent = document.getElementById('entryViewContent');
    viewContent.innerHTML = `
        <div class="entry-view-meta">
            <span class="entry-view-emotion">${emotionData.icon}</span>
            <div>
                <span class="entry-view-date">${Pluma.formatDateTime(entry.createdAt)}</span>
                ${emotionData.label ? `<span class="badge badge-verde" style="margin-left: 8px;">${emotionData.label}</span>` : ''}
            </div>
        </div>
        <h2 class="entry-view-title">${Pluma.escapeHtml(entry.title)}</h2>
        ${entry.text ? `<div class="entry-view-text">${Pluma.escapeHtml(entry.text)}</div>` : ''}
        ${blocoGuia}
        <button class="btn btn-primary entry-view-ai-btn" id="talkAiFromView">
            <i class="fas fa-user-doctor"></i>
            Conversar com a IA sobre este dia
        </button>
        <a class="entry-view-ai-link" href="ia.html?id=${entry.id}">
            <i class="fas fa-up-right-from-square"></i>
            Abrir conversa em tela cheia
        </a>
    `;
    
    // Mostra visualização, esconde lista
    document.getElementById('diaryList').style.display = 'none';
    document.getElementById('entryView').classList.add('visible');

    document.getElementById('talkAiFromView').addEventListener('click', () => falarComIa(entry.id));
}

function closeEntryView() {
    currentEntryId = null;
    document.getElementById('entryView').classList.remove('visible');
    document.getElementById('diaryList').style.display = '';
}

// ============================================
// MODAL
// ============================================

function setupModal() {
    const modal = document.getElementById('entryModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelEntry');
    const saveBtn = document.getElementById('saveEntry');
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveEntry);
    
    // Fecha ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Fecha com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            closeModal();
        }
    });
}

function openModal(editMode = false) {
    const modal = document.getElementById('entryModal');
    const title = document.getElementById('modalTitle');
    
    isEditing = editMode;
    title.textContent = editMode ? 'Editar Entrada' : 'Nova Entrada';
    
    if (!editMode) {
        clearForm();
    }
    
    modal.classList.add('visible');
    document.getElementById('entryTitle').focus();
}

function closeModal() {
    const modal = document.getElementById('entryModal');
    modal.classList.remove('visible');
    clearForm();
}

function clearForm() {
    document.getElementById('entryTitle').value = '';
    document.getElementById('entryText').value = '';
    selectedEntryEmotion = null;
    
    // Limpa as perguntas orientadoras e fecha a lista
    document.querySelectorAll('.pergunta-guia-input').forEach(campo => {
        campo.value = '';
    });
    
    const lista = document.getElementById('perguntasGuiaLista');
    if (lista) lista.classList.remove('aberta');
    
    const toggle = document.getElementById('perguntasGuiaToggle');
    if (toggle) {
        toggle.classList.remove('aberta');
        toggle.setAttribute('aria-expanded', 'false');
    }
    
    document.querySelectorAll('.emotion-option').forEach(opt => {
        opt.classList.remove('selected');
    });
}

// ============================================
// SELETOR DE EMOÇÃO
// ============================================

function setupEmotionSelector() {
    const options = document.querySelectorAll('.emotion-option');
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            options.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            selectedEntryEmotion = this.dataset.emotion;
        });
    });
}

// ============================================
// SALVAR ENTRADA
// ============================================

function saveEntry() {
    const title = document.getElementById('entryTitle').value.trim();
    const text = document.getElementById('entryText').value.trim();
    const respostas = coletarRespostasGuia();
    
    if (!title) {
        alert('Por favor, dê um título para a entrada.');
        return;
    }
    
    if (!text && respostas.length === 0) {
        alert('Escreva alguma coisa ou responda pelo menos uma pergunta orientadora.');
        return;
    }
    
    const entryData = {
        title,
        text,
        emotion: selectedEntryEmotion,
        respostas
    };
    
    let success;
    
    if (isEditing && currentEntryId) {
        success = Pluma.updateDiaryEntry(currentEntryId, entryData);
    } else {
        success = Pluma.saveDiaryEntry(entryData);
    }
    
    if (success) {
        closeModal();
        loadEntries();

        if (document.getElementById('entryView').classList.contains('visible')) {
            closeEntryView();
        }
    } else {
        alert('Erro ao salvar. Tente novamente.');
    }
}

// ============================================
// EDITAR ENTRADA
// ============================================

function editEntry(id) {
    const entries = Pluma.getDiaryEntries();
    const entry = entries.find(e => e.id === id);
    
    if (!entry) return;
    
    currentEntryId = id;
    
    // Preenche formulário
    document.getElementById('entryTitle').value = entry.title;
    document.getElementById('entryText').value = entry.text || '';
    
    // Preenche as perguntas orientadoras respondidas
    const respostas = respostasDaEntrada(entry);
    preencherRespostasGuia(respostas);
    
    // Abre a lista das perguntas quando já existem respostas
    if (respostas.length) {
        const lista = document.getElementById('perguntasGuiaLista');
        const toggle = document.getElementById('perguntasGuiaToggle');
        if (lista) lista.classList.add('aberta');
        if (toggle) {
            toggle.classList.add('aberta');
            toggle.setAttribute('aria-expanded', 'true');
        }
    }
    
    // Seleciona emoção
    if (entry.emotion) {
        selectedEntryEmotion = entry.emotion;
        const option = document.querySelector(`.emotion-option[data-emotion="${entry.emotion}"]`);
        if (option) {
            document.querySelectorAll('.emotion-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        }
    }
    
    openModal(true);
}

// ============================================
// EXCLUIR ENTRADA
// ============================================

function deleteEntry(id) {
    const temConversa = typeof IaChats !== 'undefined' && IaChats.hasContent(id);
    const aviso = temConversa
        ? 'Tem certeza que deseja excluir esta entrada? A conversa com a IA sobre ela continua salva no histórico.'
        : 'Tem certeza que deseja excluir esta entrada?';

    if (!confirm(aviso)) {
        return;
    }

    const success = Pluma.deleteDiaryEntry(id);

    if (success) {
        // A conversa da IA é preservada: aparece no histórico como "entrada removida"
        loadEntries();

        if (document.getElementById('entryView').classList.contains('visible')) {
            closeEntryView();
        }
    } else {
        alert('Erro ao excluir. Tente novamente.');
    }
}

// ============================================
// BUSCA
// ============================================

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', Pluma.debounce(function() {
        filterEntries(this.value);
    }, 300));
}

function filterEntries(query) {
    const entries = Pluma.getDiaryEntries();
    const container = document.getElementById('diaryEntries');
    
    if (!query.trim()) {
        loadEntries();
        return;
    }
    
    const filtered = entries.filter(entry => {
        const respostas = respostasDaEntrada(entry).map(r => `${r.pergunta} ${r.resposta}`).join(' ');
        const searchText = `${entry.title} ${entry.text} ${respostas}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Nenhuma entrada encontrada para "${Pluma.escapeHtml(query)}"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = renderEntryCards(filtered);
    
    bindEntryActions(container);
}

// ============================================
// BOTÕES
// ============================================

function setupButtons() {
    // Botão nova entrada
    document.getElementById('newEntryBtn').addEventListener('click', () => openModal(false));
    document.getElementById('emptyNewEntryBtn')?.addEventListener('click', () => openModal(false));
    
    // Botão voltar
    document.getElementById('backBtn').addEventListener('click', closeEntryView);
    
    // Botão editar na visualização
    document.getElementById('editEntryBtn').addEventListener('click', () => {
        if (currentEntryId) {
            editEntry(currentEntryId);
        }
    });
    
    // Botão excluir na visualização
    document.getElementById('deleteEntryBtn').addEventListener('click', () => {
        if (currentEntryId) {
            deleteEntry(currentEntryId);
        }
    });
    
    // Botão filtro
    document.getElementById('filterBtn').addEventListener('click', () => {
        alert('Filtros avançados em desenvolvimento!');
    });

    // Botão flutuante: abrir um chat com a IA sem precisar de um diário
    const aiFab = document.getElementById('aiFab');
    if (aiFab) {
        aiFab.addEventListener('click', () => {
            if (typeof IaChat === 'undefined' || typeof IaChat.abrirChatLivre !== 'function') return;
            IaChat.abrirChatLivre();
        });
    }
}
