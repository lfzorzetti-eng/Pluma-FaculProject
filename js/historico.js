// Histórico de conversas com a IA
class ConversasIaLista {
    constructor() {
        this.init();
    }

    init() {
        this.renderLista();
    }

    renderLista() {
        const container = document.getElementById('iaConversasLista');
        const contador = document.getElementById('iaConvCount');
        if (!container) return;

        if (typeof IaChats === 'undefined') {
            container.innerHTML = `
                <div class="empty-list">
                    <p>Não foi possível carregar as conversas.</p>
                </div>
            `;
            return;
        }

        const conversas = IaChats.list();

        if (contador) {
            contador.textContent = conversas.length > 0
                ? `${conversas.length} ${conversas.length === 1 ? 'conversa' : 'conversas'}`
                : '';
        }

        if (conversas.length === 0) {
            container.innerHTML = `
                <div class="empty-list">
                    <p>Nenhuma conversa ainda. Toque em "Falar com a IA" em uma entrada do diário.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conversas.map(c => {
            const emocao = (c.emotion && typeof Pluma !== 'undefined' && Pluma.getEmotionData)
                ? Pluma.getEmotionData(c.emotion)
                : { icon: '📝' };
            const quando = new Date(c.updatedAt || c.createdAt);
            const quandoTexto = quando.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) + ' às ' + quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const total = c.totalMensagens === 1 ? '1 mensagem' : `${c.totalMensagens} mensagens`;
            const safeTitle = (typeof Pluma !== 'undefined' && Pluma.escapeHtml)
                ? Pluma.escapeHtml(c.title)
                : String(c.title).replace(/[&<>"']/g, '');
            const safePreview = (c.preview && typeof Pluma !== 'undefined' && Pluma.escapeHtml)
                ? Pluma.escapeHtml(c.preview)
                : (c.preview ? String(c.preview) : '');

            return `
                <a class="history-item ia-conv-item" href="ia.html?id=${c.entryId}">
                    <div class="history-item-emotion">${emocao.icon}</div>
                    <div class="history-item-info">
                        <span class="history-item-label">${safeTitle}</span>
                        <span class="ia-conv-meta">
                            ${quandoTexto} &middot; ${total}
                            ${c.livre ? ' &middot; sem diário' : ''}
                            ${c.orfa ? ' &middot; entrada removida' : ''}
                        </span>
                        ${safePreview ? `<p class="ia-conv-preview">${safePreview}</p>` : ''}
                    </div>
                    <i class="fas fa-chevron-right ia-conv-go"></i>
                </a>
            `;
        }).join('');
    }
}