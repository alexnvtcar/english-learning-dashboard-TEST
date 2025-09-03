// Исправленная система обработчиков событий

class EventManager {
    constructor() {
        this.handlers = new Map();
        this.modalStack = [];
    }

    // Универсальный обработчик для модальных окон
    showModal(modalId, options = {}) {
        // Закрываем все открытые модальные окна
        this.closeAllModals();
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return;
        }

        // Добавляем в стек
        this.modalStack.push(modalId);
        
        // Показываем модальное окно
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Блокируем скролл body
        document.body.style.overflow = 'hidden';
        
        // Фокус на модальном окне
        if (options.focus !== false) {
            const focusable = modal.querySelector('input, button, textarea, select');
            if (focusable) {
                setTimeout(() => focusable.focus(), 100);
            }
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Убираем из стека
        const index = this.modalStack.indexOf(modalId);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }

        // Скрываем модальное окно
        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
            
            // Восстанавливаем скролл если нет других модальных окон
            if (this.modalStack.length === 0) {
                document.body.style.overflow = '';
            }
        }, 300);
    }

    closeAllModals() {
        // Закрываем все модальные окна в обратном порядке
        [...this.modalStack].reverse().forEach(modalId => {
            this.hideModal(modalId);
        });
        this.modalStack = [];
    }

    // Обработчик для кликов вне модального окна
    handleModalClick(event, modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Если клик по backdrop (overlay)
        if (event.target === modal) {
            this.hideModal(modalId);
        }
    }

    // Обработчик для Escape
    handleEscape(event) {
        if (event.key === 'Escape' && this.modalStack.length > 0) {
            const lastModal = this.modalStack[this.modalStack.length - 1];
            this.hideModal(lastModal);
        }
    }

    // Инициализация
    init() {
        // Обработчик Escape
        document.addEventListener('keydown', (e) => this.handleEscape(e));
        
        // Обработчик кликов по backdrop
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modalId = e.target.closest('.modal').id;
                if (modalId) {
                    this.hideModal(modalId);
                }
            }
        });
    }
}

// Создаем глобальный экземпляр
window.eventManager = new EventManager();

// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.eventManager.init();
});

// Заменяем старые функции
function showTaskModal() {
    window.eventManager.showModal('taskModal');
}

function hideTaskModal() {
    window.eventManager.hideModal('taskModal');
}

function showRewardModal() {
    window.eventManager.showModal('rewardModal');
}

function hideRewardModal() {
    window.eventManager.hideModal('rewardModal');
}

// И так далее для всех модальных окон...

