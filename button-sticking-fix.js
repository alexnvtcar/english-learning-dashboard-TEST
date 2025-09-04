// ИСПРАВЛЕНИЕ: Функции для устранения залипания кнопок
// Добавить этот код в конец app.js

function resetUIStates() {
    // Сброс disabled состояний
    document.querySelectorAll('button:disabled').forEach(btn => {
        if (!btn.classList.contains('permanently-disabled')) {
            btn.disabled = false;
        }
    });
    
    // Сброс loading состояний
    document.querySelectorAll('.loading').forEach(el => {
        el.classList.remove('loading');
    });
    
    // Закрытие всех модальных окон
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
        modal.style.display = 'none';
    });
    
    // Восстановление скролла
    document.body.style.overflow = '';
    
    console.log('🔄 Состояния UI сброшены');
}

function forceCloseAllModals() {
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
        modal.style.display = 'none';
    });
    document.body.style.overflow = '';
}

function checkButtonStates() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.disabled && !btn.classList.contains('loading') && !btn.classList.contains('permanently-disabled')) {
            console.warn('Кнопка застряла в disabled состоянии:', btn);
            btn.disabled = false;
        }
    });
}

// Добавляем функции в глобальную область
window.resetUIStates = resetUIStates;
window.forceCloseAllModals = forceCloseAllModals;
window.checkButtonStates = checkButtonStates;

// Запускаем проверку каждые 5 секунд
setInterval(checkButtonStates, 5000);

// Добавляем обработчик для принудительного закрытия по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        forceCloseAllModals();
    }
});

// Добавляем кнопку экстренного сброса в настройки
function addEmergencyResetButton() {
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu) {
        const resetBtn = document.createElement('div');
        resetBtn.className = 'settings-item danger';
        resetBtn.innerHTML = '🔄 Сбросить состояния UI';
        resetBtn.onclick = resetUIStates;
        settingsMenu.appendChild(resetBtn);
    }
}

// Добавляем кнопку при инициализации
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addEmergencyResetButton, 1000);
});

console.log('✅ Функции исправления залипания кнопок загружены');

