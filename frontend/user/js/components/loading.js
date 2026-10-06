class LoadingService {
    constructor() {
        this.containerId = 'global-loading-overlay';
        this.activeLoadings = 0;
        this._initContainer();
    }

    _initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'loading-overlay hidden';
            container.setAttribute('role', 'status');
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-busy', 'true');

            container.innerHTML = `
                <div class="loading-box">
                    <span class="loading-spinner" aria-hidden="true"></span>
                    <span id="global-loading-mensagem">Carregando...</span>
                </div>
            `;
            document.body.appendChild(container);
        }
    }

    show(message = 'Processando...') {
        const loading = document.getElementById(this.containerId);
        const texto = document.getElementById('global-loading-mensagem');
        if (!loading || !texto) return;

        this.activeLoadings += 1;
        texto.textContent = message;
        loading.classList.remove('hidden');
    }

    hide() {
        const loading = document.getElementById(this.containerId);
        if (!loading) return;

        this.activeLoadings = Math.max(0, this.activeLoadings - 1);
        if (this.activeLoadings === 0) {
            loading.classList.add('hidden');
        }
    }
}

// Instância global única
const GlobalLoading = new LoadingService();
window.LoadingService = GlobalLoading;
