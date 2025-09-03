// Оптимизация DOM манипуляций

class DOMCache {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
    }

    // Кэширование элементов
    getElement(id) {
        if (!this.cache.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                this.cache.set(id, element);
            }
        }
        return this.cache.get(id);
    }

    // Очистка кэша при изменении DOM
    invalidate(id) {
        this.cache.delete(id);
    }

    // Очистка всего кэша
    clear() {
        this.cache.clear();
    }
}

// Создаем глобальный кэш
window.domCache = new DOMCache();

// Оптимизированные функции для работы с DOM
class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.cleanupTimeouts = new Map();
    }

    // Создание модального окна с правильной очисткой
    createModal(id, content, options = {}) {
        // Удаляем существующее модальное окно если есть
        this.removeModal(id);

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        modal.innerHTML = content;

        // Добавляем обработчики
        this.addModalHandlers(modal, options);

        // Добавляем в DOM
        document.body.appendChild(modal);

        // Показываем с анимацией
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        this.activeModals.add(id);
        return modal;
    }

    // Удаление модального окна с правильной очисткой
    removeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;

        // Отменяем таймауты очистки
        const timeout = this.cleanupTimeouts.get(id);
        if (timeout) {
            clearTimeout(timeout);
            this.cleanupTimeouts.delete(id);
        }

        // Скрываем с анимацией
        modal.classList.remove('show');
        modal.classList.add('hiding');

        // Удаляем через время анимации
        const cleanupTimeout = setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            this.activeModals.delete(id);
            this.cleanupTimeouts.delete(id);
        }, 300);

        this.cleanupTimeouts.set(id, cleanupTimeout);
    }

    // Добавление обработчиков событий
    addModalHandlers(modal, options) {
        // Обработчик клика по backdrop
        modal.addEventListener('click', (e) => {
            if (e.target === modal && options.closeOnBackdrop !== false) {
                this.removeModal(modal.id);
            }
        });

        // Обработчик Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.activeModals.has(modal.id)) {
                this.removeModal(modal.id);
            }
        };

        document.addEventListener('keydown', escapeHandler);

        // Сохраняем обработчик для последующего удаления
        modal._escapeHandler = escapeHandler;
    }

    // Очистка всех модальных окон
    cleanup() {
        this.activeModals.forEach(id => {
            this.removeModal(id);
        });
        this.activeModals.clear();
    }
}

// Создаем глобальный менеджер модальных окон
window.modalManager = new ModalManager();

// Оптимизированные функции для обновления UI
class UIUpdater {
    constructor() {
        this.updateQueue = [];
        this.isUpdating = false;
    }

    // Добавление обновления в очередь
    queueUpdate(updateFn, priority = 0) {
        this.updateQueue.push({ fn: updateFn, priority });
        this.updateQueue.sort((a, b) => b.priority - a.priority);
        
        if (!this.isUpdating) {
            this.processQueue();
        }
    }

    // Обработка очереди обновлений
    async processQueue() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;

        while (this.updateQueue.length > 0) {
            const { fn } = this.updateQueue.shift();
            
            try {
                await fn();
            } catch (error) {
                console.error('UI Update error:', error);
            }

            // Даем браузеру время на рендеринг
            await new Promise(resolve => requestAnimationFrame(resolve));
        }

        this.isUpdating = false;
    }

    // Принудительное обновление
    forceUpdate() {
        this.updateQueue = [];
        this.isUpdating = false;
    }
}

// Создаем глобальный обновлятель UI
window.uiUpdater = new UIUpdater();

// Оптимизированные функции для работы с данными
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Дебаунсированные версии функций
const debouncedSaveState = debounce(saveState, 500);
const debouncedUpdateUI = debounce(() => {
    window.uiUpdater.queueUpdate(updateProgressDisplay, 1);
    window.uiUpdater.queueUpdate(renderTasks, 2);
    window.uiUpdater.queueUpdate(renderRewards, 2);
}, 100);

// Заменяем прямые вызовы на дебаунсированные
function saveStateOptimized() {
    debouncedSaveState();
}

function updateUIOptimized() {
    debouncedUpdateUI();
}

