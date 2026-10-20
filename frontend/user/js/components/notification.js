class NotificationService {
    constructor() {
        this.containerId = 'global-toast-container';
        this._initContainer();
    }

    _initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    showError(title, message, duration = 5000) {
        this._showToast(title, message, 'error', duration);
    }

    showSuccess(title, message, duration = 4000) {
        this._showToast(title, message, 'success', duration);
    }

    showWarning(title, message, duration = 4500) {
        this._showToast(title, message, 'warning', duration);
    }

    showInfo(title, message, duration = 4000) {
        this._showToast(title, message, 'info', duration);
    }

    /**
     * Exibe um modal pop-up de confirmação elegante (substitui window.confirm)
     * Retorna uma Promise<boolean> resolvida em true ou false.
     */
    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const {
                confirmText = 'Confirmar',
                cancelText = 'Cancelar',
                icon = '!'
            } = options;

            const overlay = document.createElement('div');
            overlay.className = 'glaciar-confirm-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');

            overlay.innerHTML = `
                <div class="glaciar-confirm-modal">
                    <div class="glaciar-confirm-icon">${icon}</div>
                    <h3 class="glaciar-confirm-titulo">${title}</h3>
                    <p class="glaciar-confirm-mensagem">${message}</p>
                    <div class="glaciar-confirm-actions">
                        <button type="button" class="glaciar-confirm-btn-cancel" id="btn-modal-confirm-cancel">${cancelText}</button>
                        <button type="button" class="glaciar-confirm-btn-confirm" id="btn-modal-confirm-ok">${confirmText}</button>
                    </div>
                </div>
            `;

            const fechar = (resultado) => {
                overlay.remove();
                resolve(resultado);
            };

            overlay.querySelector('#btn-modal-confirm-cancel').addEventListener('click', () => fechar(false));
            overlay.querySelector('#btn-modal-confirm-ok').addEventListener('click', () => fechar(true));

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) fechar(false);
            });

            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    window.removeEventListener('keydown', onKeyDown);
                    fechar(false);
                }
            };
            window.addEventListener('keydown', onKeyDown);

            document.body.appendChild(overlay);
            overlay.querySelector('#btn-modal-confirm-ok').focus();
        });
    }

    _showToast(title, message, type = 'info', duration = 5000) {
        this._initContainer();
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const iconSymbol = type === 'success' ? '✓' : (type === 'error' ? '!' : 'ℹ');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        toast.innerHTML = `
            <div class="toast-icon-${type}">${iconSymbol}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Fechar">&times;</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this._removeToast(toast);
        });

        container.appendChild(toast);

        // Dispara a animação no próximo frame
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove automaticamente
        setTimeout(() => {
            if (toast.parentElement) {
                this._removeToast(toast);
            }
        }, duration);
    }

    _removeToast(toast) {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        });
    }
}

// Cria a instância global
const Toast = new NotificationService();
window.Toast = Toast;
window.NotificationService = Toast;
