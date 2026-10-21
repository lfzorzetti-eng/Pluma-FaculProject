/**
 * PLUMA - Controle de Notificações
 *
 * Preferências de lembrete e agendamento dos avisos do app.
 * Regras pensadas para não gerar ansiedade:
 *  - nada é enviado enquanto a opção principal estiver desligada;
 *  - no máximo UM lembrete por dia, no horário escolhido pela pessoa;
 *  - a pessoa escolhe o que entra nesse lembrete (diário, humor, respiração).
 */

const Notificacoes = {
    CHAVE: 'pluma_notificacoes',
    CHAVE_ENVIO: 'pluma_notificacoes_envio',
    CHAVE_LEGADA: 'pluma_notifications',

    padroes: {
        ativas: false,
        horario: '20:00',
        incluir: {
            diario: true,
            humor: false,
            respiracao: false
        }
    },

    // ============================================
    // PREFERÊNCIAS
    // ============================================

    ler() {
        const padrao = { ...this.padroes, incluir: { ...this.padroes.incluir } };

        try {
            const salvo = JSON.parse(localStorage.getItem(this.CHAVE) || 'null');
            if (!salvo || typeof salvo !== 'object') return padrao;

            return {
                ...padrao,
                ...salvo,
                incluir: { ...padrao.incluir, ...(salvo.incluir || {}) }
            };
        } catch (e) {
            return padrao;
        }
    },

    salvar(prefs) {
        localStorage.setItem(this.CHAVE, JSON.stringify(prefs));

        // Mantém as chaves antigas em dia (usadas por outras telas)
        localStorage.setItem(this.CHAVE_LEGADA, prefs.ativas ? 'true' : 'false');

        try {
            const config = JSON.parse(localStorage.getItem('pluma_config') || '{}');
            config.notificacoes = prefs.ativas;
            config.horarioLembrete = prefs.horario;
            localStorage.setItem('pluma_config', JSON.stringify(config));
        } catch (e) {
            // Config legada é opcional
        }
    },

    atualizar(parcial) {
        const prefs = this.ler();
        const nova = {
            ...prefs,
            ...parcial,
            incluir: { ...prefs.incluir, ...(parcial.incluir || {}) }
        };
        this.salvar(nova);
        return nova;
    },

    // ============================================
    // PERMISSÃO DO NAVEGADOR
    // ============================================

    suportado() {
        return typeof window !== 'undefined' && 'Notification' in window;
    },

    permissao() {
        if (!this.suportado()) return 'unsupported';
        return Notification.permission;
    },

    async pedirPermissao() {
        if (!this.suportado()) return 'unsupported';
        if (Notification.permission !== 'default') return Notification.permission;

        try {
            return await Notification.requestPermission();
        } catch (e) {
            return 'denied';
        }
    },

    // ============================================
    // ENVIO
    // ============================================

    mostrar(titulo, corpo, forcar = false) {
        if (!this.suportado() || this.permissao() !== 'granted') return false;

        // Não interrompe quem já está usando o app
        if (!forcar && document.visibilityState === 'visible') return false;

        try {
            new Notification(titulo, {
                body: corpo,
                tag: 'pluma-lembrete',
                renotify: false
            });
            return true;
        } catch (e) {
            return false;
        }
    },

    montarCorpo(prefs) {
        const acoes = [];

        if (prefs.incluir.diario) acoes.push('registrar suas reflexões no diário');
        if (prefs.incluir.humor) acoes.push('anotar como você está se sentindo');
        if (prefs.incluir.respiracao) acoes.push('praticar a respiração 3-4-5');

        if (!acoes.length) return null;

        if (acoes.length === 1) {
            return `Que tal ${acoes[0]}? Sem pressa, do seu jeito.`;
        }

        const ultimo = acoes[acoes.length - 1];
        return `Que tal ${acoes.slice(0, -1).join(', ')} e ${ultimo}? Sem pressa, do seu jeito.`;
    },

    enviarLembrete(prefs) {
        const corpo = this.montarCorpo(prefs);
        if (!corpo) return false;

        return this.mostrar('Hora de cuidar de você', corpo);
    },

    // ============================================
    // AGENDAMENTO
    // ============================================

    iniciarAgendamento() {
        if (!this.suportado()) return;

        this.verificarAgendamento();
        setInterval(() => this.verificarAgendamento(), 30000);
    },

    verificarAgendamento() {
        const prefs = this.ler();

        if (!prefs.ativas) return;
        if (this.permissao() !== 'granted') return;

        const agora = new Date();
        const horarioAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

        if (horarioAtual !== prefs.horario) return;

        // Um lembrete por dia, no máximo
        const hoje = agora.toDateString();
        if (localStorage.getItem(this.CHAVE_ENVIO) === hoje) return;

        localStorage.setItem(this.CHAVE_ENVIO, hoje);
        this.enviarLembrete(prefs);
    }
};

// ============================================
// TELA DE CONFIGURAÇÕES
// ============================================

function initConfigNotificacoes() {
    const togglePrincipal = document.getElementById('notificationsToggle');
    const blocoOpcoes = document.getElementById('notificacoesOpcoes');
    const status = document.getElementById('notificacoesStatus');

    if (!togglePrincipal) return;

    const toggles = {
        diario: document.getElementById('notificacaoDiario'),
        humor: document.getElementById('notificacaoHumor'),
        respiracao: document.getElementById('notificacaoRespiracao')
    };
    const inputHorario = document.getElementById('notificacaoHorario');
    const btnTeste = document.getElementById('testNotificacaoBtn');

    function aplicarEstado() {
        const prefs = Notificacoes.ler();

        togglePrincipal.checked = prefs.ativas;

        if (blocoOpcoes) {
            blocoOpcoes.hidden = !prefs.ativas;
        }

        Object.keys(toggles).forEach(chave => {
            const el = toggles[chave];
            if (el) el.checked = Boolean(prefs.incluir[chave]);
        });

        if (inputHorario) inputHorario.value = prefs.horario;

        atualizarStatus();
    }

    function atualizarStatus() {
        if (!status) return;

        const prefs = Notificacoes.ler();

        if (!prefs.ativas) {
            status.innerHTML = '<i class="fas fa-bell-slash"></i> Nenhum lembrete será enviado enquanto esta opção estiver desligada.';
            status.className = 'notificacoes-status desligado';
            return;
        }

        const permissao = Notificacoes.permissao();

        if (permissao === 'unsupported') {
            status.innerHTML = '<i class="fas fa-info-circle"></i> Este navegador não suporta notificações.';
            status.className = 'notificacoes-status atencao';
            return;
        }

        if (permissao === 'denied') {
            status.innerHTML = '<i class="fas fa-triangle-exclamation"></i> O navegador bloqueou as notificações. Libere a permissão nas configurações do site para receber os lembretes.';
            status.className = 'notificacoes-status atencao';
            return;
        }

        if (permissao === 'default') {
            status.innerHTML = '<i class="fas fa-circle-info"></i> Autorize as notificações do navegador para receber os lembretes.';
            status.className = 'notificacoes-status atencao';
            return;
        }

        status.innerHTML = `<i class="fas fa-check-circle"></i> Ativo. Você recebe no máximo <strong>1 lembrete por dia</strong>, às ${prefs.horario}.`;
        status.className = 'notificacoes-status ativo';
    }

    togglePrincipal.addEventListener('change', async function() {
        const ativado = this.checked;

        if (ativado) {
            const permissao = await Notificacoes.pedirPermissao();
            if (permissao === 'denied') {
                Notificacoes.atualizar({ ativas: false });
                aplicarEstado();
                return;
            }
        }

        Notificacoes.atualizar({ ativas: ativado });
        aplicarEstado();
    });

    Object.keys(toggles).forEach(chave => {
        const el = toggles[chave];
        if (!el) return;

        el.addEventListener('change', function() {
            Notificacoes.atualizar({ incluir: { [chave]: this.checked } });
            aplicarEstado();
        });
    });

    if (inputHorario) {
        inputHorario.addEventListener('change', function() {
            Notificacoes.atualizar({ horario: this.value || '20:00' });
            aplicarEstado();
        });
    }

    if (btnTeste) {
        btnTeste.addEventListener('click', async function() {
            const permissao = await Notificacoes.pedirPermissao();

            if (permissao === 'unsupported') {
                alert('Este navegador não suporta notificações.');
                return;
            }

            if (permissao === 'denied') {
                alert('O navegador bloqueou as notificações. Libere a permissão nas configurações do site.');
                atualizarStatus();
                return;
            }

            if (permissao === 'default') {
                atualizarStatus();
                return;
            }

            Notificacoes.mostrar(
                'Teste de notificação',
                'É assim que o lembrete diário vai aparecer. Você pode desligar quando quiser em Config.',
                true
            );
        });
    }

    aplicarEstado();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

window.Notificacoes = Notificacoes;

document.addEventListener('DOMContentLoaded', function() {
    Notificacoes.iniciarAgendamento();
    initConfigNotificacoes();
});
