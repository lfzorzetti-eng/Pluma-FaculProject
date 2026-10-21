/**
 * Pluma - Exercícios de Respiração
 *
 * Técnica 3-4-5 (inspirar 3s, segurar 4s, expirar 5s).
 * A antiga 4-7-8 prendia o ar por 7 segundos, o que gerava frustração e
 * podia ativar gatilhos de sufocamento em pessoas com muita ansiedade.
 */

const TECNICA_RESPIRACAO = {
    chave: '3-4-5',
    nome: 'Técnica 3-4-5',
    inspirar: 3,
    segurar: 4,
    expirar: 5,
    ciclos: 4
};

const CHAVE_SESSOES = 'pluma_respiracao_sessoes';

class RespiracaoManager {
    constructor() {
        this.tecnica = TECNICA_RESPIRACAO;

        this.isRunning = false;
        this.isPaused = false;
        this.cicloAtual = 0;
        this.faseAtual = '';
        this.tempoRestante = 0;
        this.tempoDecorrido = 0;
        this.tempoTotal = 0;
        this.intervalo = null;
        this.somAtivo = localStorage.getItem('pluma_sounds') !== 'false';
        this.pularSegurar = false;
        this.audioContext = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.atualizarEstatisticas();
        this.resetUI();
    }

    // ============================================
    // EVENTOS
    // ============================================

    setupEventListeners() {
        const btnIniciar = document.getElementById('startBtn');
        const btnReset = document.getElementById('resetBtn');
        const toggleSom = document.getElementById('soundToggle');
        const toggleSemSegurar = document.getElementById('pularSegurar');
        const btnLimpar = document.getElementById('statsReset');

        if (btnIniciar) {
            btnIniciar.addEventListener('click', () => {
                if (this.isRunning) {
                    this.alternarPausa();
                } else {
                    this.iniciar();
                }
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => this.parar());
        }

        if (toggleSom) {
            toggleSom.checked = this.somAtivo;
            toggleSom.addEventListener('change', () => {
                this.somAtivo = toggleSom.checked;
                localStorage.setItem('pluma_sounds', String(this.somAtivo));
            });
        }

        if (toggleSemSegurar) {
            toggleSemSegurar.addEventListener('change', () => {
                this.pularSegurar = toggleSemSegurar.checked;
            });
        }

        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => this.limparEstatisticas());
        }
    }

    // ============================================
    // CICLO DE RESPIRAÇÃO
    // ============================================

    iniciar() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.cicloAtual = 1;
        this.tempoDecorrido = 0;
        this.tempoTotal = this.duracaoSessao();

        this.atualizarControles();
        this.executarCiclo();
    }

    alternarPausa() {
        this.isPaused = !this.isPaused;

        const btnIniciar = document.getElementById('startBtn');
        if (btnIniciar) {
            btnIniciar.innerHTML = this.isPaused
                ? '<i class="fas fa-play"></i>'
                : '<i class="fas fa-pause"></i>';
            btnIniciar.setAttribute('aria-label', this.isPaused ? 'Continuar' : 'Pausar');
            btnIniciar.classList.toggle('playing', !this.isPaused);
        }

        const instructionLabel = document.getElementById('instructionLabel');
        if (instructionLabel && this.isPaused) {
            instructionLabel.textContent = 'Pausado';
        }
    }

    parar() {
        this.isRunning = false;
        this.isPaused = false;
        this.cicloAtual = 0;

        if (this.intervalo) {
            clearInterval(this.intervalo);
            this.intervalo = null;
        }

        this.resetUI();
        this.atualizarControles();
    }

    async executarCiclo() {
        while (this.isRunning && this.cicloAtual <= this.tecnica.ciclos) {
            await this.executarFase('inspirar', this.tecnica.inspirar);
            if (!this.isRunning) return;

            // A retenção do ar é opcional: quem tem gatilho de sufocamento pode pular
            if (!this.pularSegurar) {
                await this.executarFase('segurar', this.tecnica.segurar);
                if (!this.isRunning) return;
            }

            await this.executarFase('expirar', this.tecnica.expirar);
            if (!this.isRunning) return;

            this.cicloAtual += 1;
            this.atualizarControleUI();
        }

        if (this.isRunning) {
            this.concluirExercicio();
        }
    }

    executarFase(fase, duracao) {
        return new Promise(resolve => {
            this.faseAtual = fase;
            this.tempoRestante = duracao;

            this.atualizarFaseUI();
            this.atualizarTempoUI();
            this.tocarSom(fase);

            const circle = document.getElementById('breathingCircle');
            if (circle) {
                circle.className = 'breathing-circle ' + this.classeFase(fase);
                circle.style.animationDuration = duracao + 's';
                circle.style.transitionDuration = duracao + 's';
            }

            this.intervalo = setInterval(() => {
                if (this.isPaused) return;

                this.tempoRestante -= 1;
                this.tempoDecorrido += 1;

                this.atualizarTempoUI();
                this.atualizarProgresso();

                if (this.tempoRestante <= 0) {
                    clearInterval(this.intervalo);
                    this.intervalo = null;
                    resolve();
                }
            }, 1000);
        });
    }

    classeFase(fase) {
        if (fase === 'inspirar') return 'inhale';
        if (fase === 'segurar') return 'hold';
        return 'exhale';
    }

    duracaoSessao() {
        const porCiclo = this.pularSegurar
            ? this.tecnica.inspirar + this.tecnica.expirar
            : this.tecnica.inspirar + this.tecnica.segurar + this.tecnica.expirar;

        return porCiclo * this.tecnica.ciclos;
    }

    // ============================================
    // INTERFACE
    // ============================================

    atualizarFaseUI() {
        const instrucoes = {
            'inspirar': {
                label: 'Inspire pelo nariz',
                desc: 'Devagar, sem forçar o ar',
                texto: 'Inspire'
            },
            'segurar': {
                label: 'Segure o ar',
                desc: 'De forma breve e suave',
                texto: 'Segure'
            },
            'expirar': {
                label: 'Expire lentamente',
                desc: 'Solte o ar aos poucos',
                texto: 'Expire'
            }
        };

        const info = instrucoes[this.faseAtual];
        if (!info) return;

        const instructionLabel = document.getElementById('instructionLabel');
        if (instructionLabel) instructionLabel.textContent = info.label;

        const instructionDesc = document.getElementById('instructionDesc');
        if (instructionDesc) instructionDesc.textContent = info.desc;

        const breathingText = document.getElementById('breathingText');
        if (breathingText) breathingText.textContent = info.texto;
    }

    atualizarTempoUI() {
        const timer = document.getElementById('breathingTimer');
        if (timer) timer.textContent = this.tempoRestante;
    }

    atualizarProgresso() {
        const ring = document.getElementById('progressRing');
        if (!ring || !this.tempoTotal) return;

        const progresso = Math.min(1, this.tempoDecorrido / this.tempoTotal);
        ring.style.strokeDashoffset = String(817 * (1 - progresso));
    }

    atualizarControleUI() {
        const instructionLabel = document.getElementById('instructionLabel');
        if (instructionLabel && this.isRunning && !this.isPaused) {
            instructionLabel.textContent = `Ciclo ${this.cicloAtual} de ${this.tecnica.ciclos}`;
        }
    }

    atualizarControles() {
        const btnIniciar = document.getElementById('startBtn');
        const btnReset = document.getElementById('resetBtn');

        if (btnIniciar) {
            if (this.isRunning) {
                btnIniciar.innerHTML = '<i class="fas fa-pause"></i>';
                btnIniciar.setAttribute('aria-label', 'Pausar');
                btnIniciar.classList.add('playing');
            } else {
                btnIniciar.innerHTML = '<i class="fas fa-play"></i>';
                btnIniciar.setAttribute('aria-label', 'Iniciar');
                btnIniciar.classList.remove('playing');
            }
        }

        if (btnReset) {
            btnReset.style.display = this.isRunning ? 'flex' : 'none';
        }
    }

    resetUI() {
        const circle = document.getElementById('breathingCircle');
        if (circle) {
            circle.className = 'breathing-circle idle';
            circle.style.animationDuration = '';
            circle.style.transitionDuration = '';
        }

        const instructionLabel = document.getElementById('instructionLabel');
        if (instructionLabel) instructionLabel.textContent = 'Toque para começar';

        const instructionDesc = document.getElementById('instructionDesc');
        if (instructionDesc) instructionDesc.textContent = 'Relaxe e concentre-se na sua respiração';

        const breathingText = document.getElementById('breathingText');
        if (breathingText) breathingText.textContent = 'Pronto?';

        const timer = document.getElementById('breathingTimer');
        if (timer) timer.textContent = '';

        const ring = document.getElementById('progressRing');
        if (ring) ring.style.strokeDashoffset = '817';
    }

    // ============================================
    // SOM
    // ============================================

    tocarSom(fase) {
        if (!this.somAtivo) return;

        try {
            if (!this.audioContext) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.audioContext = new AudioCtx();
            }

            const contexto = this.audioContext;
            if (contexto.state === 'suspended') contexto.resume();

            const oscillator = contexto.createOscillator();
            const gainNode = contexto.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(contexto.destination);

            const frequencias = {
                'inspirar': 440,
                'segurar': 523,
                'expirar': 330
            };

            oscillator.frequency.value = frequencias[fase] || 440;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.08, contexto.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, contexto.currentTime + 0.3);

            oscillator.start(contexto.currentTime);
            oscillator.stop(contexto.currentTime + 0.3);
        } catch (e) {
            // Áudio indisponível: o exercício continua normalmente
        }
    }

    // ============================================
    // ESTATÍSTICAS
    // ============================================

    lerSessoes() {
        try {
            const sessoes = JSON.parse(localStorage.getItem(CHAVE_SESSOES) || '[]');
            return Array.isArray(sessoes) ? sessoes : [];
        } catch (e) {
            return [];
        }
    }

    salvarSessao(duracaoSegundos) {
        const sessoes = this.lerSessoes();
        sessoes.push({
            id: Date.now().toString(),
            tecnica: this.tecnica.chave,
            nome: this.tecnica.nome,
            data: new Date().toISOString(),
            ciclos: this.tecnica.ciclos,
            duracaoSegundos
        });
        localStorage.setItem(CHAVE_SESSOES, JSON.stringify(sessoes));

        if (typeof Pluma !== 'undefined' && typeof Pluma.saveBreathingSession === 'function') {
            Pluma.saveBreathingSession(Math.max(1, Math.round(duracaoSegundos / 60)));
        }
    }

    atualizarEstatisticas() {
        const sessoes = this.lerSessoes();
        const hoje = new Date().toDateString();

        const hojeCount = sessoes.filter(s => new Date(s.data).toDateString() === hoje).length;
        const totalSegundos = sessoes.reduce((total, s) => total + (s.duracaoSegundos || 0), 0);

        const elHoje = document.getElementById('todaySessions');
        const elTotal = document.getElementById('totalSessions');
        const elMinutos = document.getElementById('totalMinutes');

        if (elHoje) elHoje.textContent = hojeCount;
        if (elTotal) elTotal.textContent = sessoes.length;
        if (elMinutos) elMinutos.textContent = Math.round(totalSegundos / 60);
    }

    limparEstatisticas() {
        if (!confirm('Tem certeza que deseja apagar todas as sessões de respiração?')) {
            return;
        }

        localStorage.removeItem(CHAVE_SESSOES);

        if (typeof Pluma !== 'undefined' && typeof Pluma.saveToStorage === 'function') {
            Pluma.saveToStorage(Pluma.STORAGE_KEYS.BREATHING, {
                totalSessions: 0,
                totalMinutes: 0,
                todaySessions: 0,
                lastSessionDate: null
            });
        }

        this.atualizarEstatisticas();
    }

    // ============================================
    // CONCLUSÃO
    // ============================================

    concluirExercicio() {
        this.isRunning = false;

        const instructionLabel = document.getElementById('instructionLabel');
        if (instructionLabel) instructionLabel.textContent = 'Exercício concluído!';

        const instructionDesc = document.getElementById('instructionDesc');
        if (instructionDesc) instructionDesc.textContent = 'Como você está se sentindo agora?';

        const breathingText = document.getElementById('breathingText');
        if (breathingText) breathingText.textContent = 'Muito bem';

        const circle = document.getElementById('breathingCircle');
        if (circle) {
            circle.className = 'breathing-circle idle';
            circle.style.animationDuration = '';
            circle.style.transitionDuration = '';
        }

        this.atualizarControles();
        this.salvarSessao(this.tempoTotal);
        this.atualizarEstatisticas();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    new RespiracaoManager();
});
