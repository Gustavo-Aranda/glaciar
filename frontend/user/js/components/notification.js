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
        this.showToast(title, message, 'error', duration);
    }

    showSuccess(title, message, duration = 5000) {
        this.showToast(title, message, 'success', duration);
    }

    showToast(title, message, type, duration) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHtml = '';
        if (type === 'error') {
            iconHtml = `<div class="toast-icon-error">!</div>`;
        } else if (type === 'success') {
            iconHtml = `<div class="toast-icon-success">✓</div>`;
        }

        toast.innerHTML = `
            ${iconHtml}
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
