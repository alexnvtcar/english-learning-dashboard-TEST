            // Система управления таймаутами
            const activeTimeouts = new Set();

            function safeSetTimeout(callback, delay) {
                const timeoutId = setTimeout(() => {
                    activeTimeouts.delete(timeoutId);
                    callback();
                }, delay);
                activeTimeouts.add(timeoutId);
                return timeoutId;
            }

            function clearAllTimeouts() {
                activeTimeouts.forEach(id => clearTimeout(id));
                activeTimeouts.clear();
            }

            // Кэш DOM элементов
            const DOM_CACHE = {
                taskList: null,
                currentLevel: null,
                totalXP: null,
                weeklyProgress: null,
                monthlyProgress: null,
                achievementsUnlocked: null,
                rewardsReceived: null,
                totalStarsSpent: null
            };

            function getCachedElement(id) {
                if (!DOM_CACHE[id]) {
                    DOM_CACHE[id] = document.getElementById(id);
                }
                return DOM_CACHE[id];
            }

            function safeGetCachedElement(id) {
                const element = getCachedElement(id);
                if (!element) {
                    console.warn(`Element with id "${id}" not found`);
                }
                return element;
            }

            function invalidateCache(id) {
                if (DOM_CACHE[id]) {
                    DOM_CACHE[id] = null;
                }
            }

            // Обработка ошибок
            function safeExecute(fn, context = 'Unknown') {
                try {
                    return fn();
                } catch (error) {
                    console.error(`Error in ${context}:`, error);
                    showNotification('Произошла ошибка. Попробуйте еще раз.', 'error');
                }
            }

            // Валидация данных
            function validateTaskData(task) {
                if (!task.name || task.name.trim().length === 0) {
                    throw new Error('Название задания не может быть пустым');
                }
                if (!task.xpReward || task.xpReward < 1) {
                    throw new Error('XP награда должна быть больше 0');
                }
                if (!task.duration || task.duration < 1) {
                    throw new Error('Длительность должна быть больше 0');
                }
                return true;
            }

            // Безопасное обновление UI
            function safeUpdateUI() {
                if (document.readyState === 'complete') {
                    try {
                        updateProgressDisplay();
                        renderTasks();
                        renderRewards();
                        generateCalendar();
                        updateDayActivity();
                        renderWeeklyChart();
                    } catch (error) {
                        console.error('Ошибка при обновлении UI:', error);
                    }
                } else {
                    // Если DOM не готов, ждем его готовности
                    document.addEventListener('DOMContentLoaded', () => {
                        safeUpdateUI();
                    });
                }
            }

            // Available icons for tasks (replaced Font Awesome with emojis)
            const availableIcons = [
                { class: "📚", name: "Книга" },
                { class: "✏️", name: "Карандаш" },
                { class: "🎧", name: "Наушники" },
                { class: "🎤", name: "Микрофон" },
                { class: "👁️", name: "Глаз" },
                { class: "🧠", name: "Мозг" },
                { class: "💡", name: "Лампочка" },
                { class: "⭐", name: "Звезда" },
                { class: "🏆", name: "Трофей" },
                { class: "🏅", name: "Медаль" },
                { class: "🔥", name: "Огонь" },
                { class: "🚀", name: "Ракета" },
                { class: "🎓", name: "Диплом" },
                { class: "👨‍🏫", name: "Учитель" },
                { class: "🗣️", name: "Язык" },
                { class: "✅", name: "Проверка" },
                { class: "⏰", name: "Часы" },
                { class: "🎯", name: "Цель" },
                { class: "📈", name: "График" },
                { class: "🎮", name: "Игра" }
            ];

            // Application State
            let appState = {
                user: {
                    id: "user",
                    username: "user",
                },
                role: 'viewer',
                userName: 'Михаил',
                pinCodes: {}, // PIN-коды загружаются только из Firebase
                isVerified: false,
                progress: {
                    level: 1,
                    totalXP: 0,
                    currentLevelXP: 0,
                    bestWeekXP: 0,
                    weeklyXP: 0,
                    weeklyStars: 0,
                    starBank: 0,
                    weekStartKey: null,
                },

                tasks: [
                    {
                        id: 1,
                        name: "Изучение новых слов",
                        description: "Выучить 10 новых английских слов",
                        xpReward: 50,
                        duration: 15,
                        icon: "📚",
                        category: "vocabulary",
                    },
                    {
                        id: 2,
                        name: "Грамматические упражнения",
                        description: "Выполнить упражнения на Present Simple",
                        xpReward: 75,
                        duration: 20,
                        icon: "✏️",
                        category: "grammar",
                    },
                    {
                        id: 3,
                        name: "Аудирование",
                        description: "Прослушать диалог и ответить на вопросы",
                        xpReward: 60,
                        duration: 25,
                        icon: "🎧",
                        category: "listening",
                    },
                ],
                rewards: [],
                currentMonth: new Date(),
                selectedDate: new Date(),
                activityData: {},
                rewardPlan: { description: "" },
                resetDate: new Date(),
                progressView: { weekOffset: 0, monthOffset: 0 },
                isInitializing: true, // Флаг для отслеживания инициализации
                
                // Настройки бэкапов
                backupSettings: {
                    autoBackup: true,
                    backupFrequency: 'daily', // daily, weekly, monthly
                    maxBackups: 7, // количество хранимых бэкапов
                    lastBackup: null,
                    nextBackup: null,
                    backupTypes: {
                        scheduled: true,
                        manual: true
                    }
                }
            };

            function getEffectiveState() {
                return appState;
            }

            // Utility Functions
            function formatDate(date) {
                // Проверяем, что date является объектом Date
                if (!date || typeof date.getFullYear !== 'function') {
                    console.warn('⚠️ formatDate: передан неверный объект date:', date);
                    // Возвращаем текущую дату если что-то пошло не так
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }
                
                // Local date string YYYY-MM-DD without UTC shift
                const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const y = local.getFullYear();
                const m = String(local.getMonth() + 1).padStart(2, '0');
                const d = String(local.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }

            function escapeHTML(str) {
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            const STORAGE_KEY = 'english-learning-app-state-v1';
            const IDEAS_KEY = 'english-learning-reward-ideas-v1';
            // Save state locally only (no automatic Firebase saving)
            function saveState() {
                // Проверяем, не происходит ли инициализация
                if (appState.isInitializing) {
                    console.log('🚫 Локальное сохранение отключено во время инициализации');
                    return false;
                }
                
                try {
                    console.log('💾 Сохраняем состояние локально...');
                    console.log('🔐 PIN-коды НЕ сохраняются в localStorage (только в Firebase)');
                    console.log('🔧 Проверяем доступность localStorage...');
                    
                    // Проверяем доступность localStorage
                    if (typeof localStorage === 'undefined') {
                        console.error('❌ localStorage недоступен');
                        return false;
                    }
                    
                    // Тестируем запись в localStorage
                    try {
                        localStorage.setItem('test-save', 'test-save-value');
                        const testValue = localStorage.getItem('test-save');
                        if (testValue !== 'test-save-value') {
                            console.error('❌ localStorage работает некорректно при записи');
                            return false;
                        }
                        localStorage.removeItem('test-save');
                        console.log('✅ localStorage работает корректно при записи');
                    } catch (testError) {
                        console.error('❌ Ошибка тестирования записи в localStorage:', testError);
                        return false;
                    }
                    
                    // Подготавливаем данные для сохранения (БЕЗ PIN-кодов)
                    const { pinCodes, ...dataToSave } = appState;
                    
                    console.log('📦 Данные для сохранения (без PIN-кодов):', Object.keys(dataToSave));
                    
                    // Сохраняем локально
                    const jsonData = JSON.stringify(dataToSave);
                    console.log('📝 Размер JSON данных:', jsonData.length, 'символов');
                    
                    localStorage.setItem(STORAGE_KEY, jsonData);
                    
                    // Проверяем, что данные действительно сохранились
                    const savedData = localStorage.getItem(STORAGE_KEY);
                    if (!savedData) {
                        console.error('❌ Данные не сохранились в localStorage');
                        return false;
                    }
                    
                    // Сохраняем текущего пользователя отдельно
                    localStorage.setItem('current-user', appState.userName);
                    
                    console.log('✅ Состояние сохранено локально (без PIN-кодов)');
                    console.log('🔍 Проверка сохранения: данные найдены, размер:', savedData.length);
                    
                    return true;
                } catch (e) {
                    console.error('❌ Ошибка сохранения состояния:', e);
                    return false;
                }
            }

            // Load local state only (without Firebase)
            function loadLocalState() {
                try {
                    console.log('📂 Загружаем локальное состояние...');
                    console.log('🔧 Проверяем доступность localStorage...');
                    
                    // Проверяем доступность localStorage
                    if (typeof localStorage === 'undefined') {
                        console.error('❌ localStorage недоступен');
                        return;
                    }
                    
                    // Тестируем запись и чтение в localStorage
                    try {
                        localStorage.setItem('test-storage', 'test-value');
                        const testValue = localStorage.getItem('test-storage');
                        if (testValue !== 'test-value') {
                            console.error('❌ localStorage работает некорректно');
                            return;
                        }
                        localStorage.removeItem('test-storage');
                        console.log('✅ localStorage работает корректно');
                    } catch (testError) {
                        console.error('❌ Ошибка тестирования localStorage:', testError);
                        return;
                    }
                    
                    // Загружаем из localStorage
                    const raw = localStorage.getItem(STORAGE_KEY);
                    console.log('📦 Сырые данные из localStorage:', raw ? 'найдены' : 'не найдены');
                    
                    if (raw) {
                        const saved = JSON.parse(raw);
                        console.log('🔍 Распарсенные данные:', Object.keys(saved));
                        
                        // Восстанавливаем типы данных из localStorage
                        const restoredSaved = restoreDataTypes(saved);
                        
                        // Обновляем appState, сохраняя важные поля
                        // НЕ загружаем isVerified и pinCodes из localStorage
                        const { isVerified, pinCodes, ...restoredData } = restoredSaved;
                        
                        appState = { 
                            ...appState, 
                            ...restoredData,
                            // Сохраняем текущего пользователя
                            userName: appState.userName || restoredData.userName || 'Михаил',
                            // isVerified всегда false при запуске
                            isVerified: false,
                            // PIN-коды НЕ загружаем из localStorage - только из Firebase
                            pinCodes: {}
                        };
                        
                        console.log('✅ Локальное состояние загружено');
                        console.log('🔐 PIN-коды НЕ загружены из localStorage (только из Firebase)');
                        console.log('👤 Текущий пользователь:', appState.userName);
                    } else {
                        console.log('📭 Локальное состояние не найдено, используем значения по умолчанию');
                    }
                    
                    // Дополнительная проверка для критических полей
                    if (!appState.currentMonth || typeof appState.currentMonth.getFullYear !== 'function') {
                        appState.currentMonth = new Date();
                    }
                    if (!appState.selectedDate || typeof appState.selectedDate.toLocaleDateString !== 'function') {
                        appState.selectedDate = new Date();
                    }
                    
                    // Обеспечиваем наличие bestWeekXP
                    if (!appState.progress) {
                        appState.progress = {};
                    }
                    if (typeof appState.progress.bestWeekXP === 'undefined') {
                        appState.progress.bestWeekXP = 0;
                        console.log('🏆 bestWeekXP инициализирован в loadLocalState');
                    }
                    
                    console.log('🔄 Локальное состояние загружено, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПОСЛЕ ЗАГРУЗКИ ЛОКАЛЬНОГО СОСТОЯНИЯ
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Проверяем, что все показатели обновлены
                    console.log('✅ Локальное состояние загружено, все показатели пересчитаны');
                    
                    // Автоматическое сохранение отключено при загрузке
                    // saveDataToFirebase();
                    
                } catch (e) {
                    console.error('❌ Ошибка загрузки локального состояния:', e);
                    // Устанавливаем значения по умолчанию при ошибке
                    appState.currentMonth = new Date();
                    appState.selectedDate = new Date();
                    
                    console.log('🔄 Устанавливаем значения по умолчанию, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПРИ ОШИБКЕ
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Проверяем, что все показатели обновлены
                    console.log('✅ Значения по умолчанию установлены, все показатели пересчитаны');
                    
                    // Автоматическое сохранение отключено при установке значений по умолчанию
                    // saveDataToFirebase();
                }
            }

            // Load state from Firebase (for sync)
            async function loadStateFromFirestore() {
                if (!isFirebaseAvailable()) {
                    console.log('Firebase недоступен, загружаем только локально');
                    return false;
                }

                try {
                    console.log('📥 Начинаем загрузку из Firebase...');
                    
                    // Сначала пробуем загрузить общие данные
                    let firestoreData = null;
                    let dataSource = 'shared-data';
                    
                    try {
                        const sharedRef = doc(db, 'shared-data', 'main');
                        const sharedSnap = await retryOperation(async () => {
                            return await getDoc(sharedRef);
                        }, 3, 1000);
                        
                        if (sharedSnap.exists()) {
                            firestoreData = sharedSnap.data();
                            console.log('📊 Общие данные найдены в Firebase');
                        } else {
                            // Если общих данных нет, пробуем загрузить данные пользователя
                            const userRef = doc(db, 'users', appState.userName);
                            const userSnap = await retryOperation(async () => {
                                return await getDoc(userRef);
                            }, 3, 1000);
                            
                            if (userSnap.exists()) {
                                firestoreData = userSnap.data();
                                dataSource = 'user-data';
                                console.log('📊 Данные пользователя найдены в Firebase');
                            } else {
                                console.log('📭 Данные не найдены в Firebase');
                                return false;
                            }
                        }
                    } catch (error) {
                        console.error('❌ Ошибка при загрузке данных после всех попыток:', error);
                        return false;
                    }
                    
                    if (firestoreData) {
                        console.log('📊 Данные загружены из Firebase:', {
                            source: dataSource,
                            lastUpdated: firestoreData.lastUpdated,
                            lastSavedBy: firestoreData.lastSavedBy,
                            version: firestoreData.version,
                            totalSaves: firestoreData.saveStats?.totalSaves || 0
                        });
                        
                        // Восстанавливаем типы данных
                        const restoredData = restoreDataTypes(firestoreData);
                        
                        // Сохраняем важные локальные настройки
                        const localSettings = {
                            userName: appState.userName,
                            role: appState.role,
                            isVerified: appState.isVerified,
                            pinCodes: appState.pinCodes // Сохраняем PIN-коды локально
                        };
                        
                        // Сохраняем настройки бэкапов, если они есть в загруженных данных
                        if (restoredData.backupSettings) {
                            console.log('🔄 Загружаем настройки бэкапов из Firebase:', restoredData.backupSettings);
                            localSettings.backupSettings = restoredData.backupSettings;
                        }
                        
                        // Обновляем локальное состояние
                        appState = { ...appState, ...restoredData, ...localSettings };
                        
                        // Обновляем UI безопасно
                        safeUpdateUI();
                        
                        console.log('✅ Данные успешно загружены из Firebase');
                        // Уведомление о загрузке показывается только при синхронизации
                        
                        // Показываем детальную информацию о загрузке
                        showLoadDetails(firestoreData);
                        
                        return true;
                    }
                    
                    return false;
                } catch (error) {
                    console.error('❌ Ошибка загрузки из Firebase:', error);
                    
                    // Проверяем тип ошибки
                    if (error.message && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
                        console.warn('⚠️ Запрос заблокирован клиентом (возможно, блокировщик рекламы)');
                        showNotification('Firebase заблокирован блокировщиком рекламы', 'warning');
                    } else if (error.code === 'permission-denied') {
                        console.warn('⚠️ Отказано в доступе к Firestore');
                        showNotification('Отказано в доступе к Firestore', 'error');
                    } else if (error.code === 'unavailable') {
                        console.warn('⚠️ Firestore недоступен');
                        showNotification('Firestore недоступен', 'error');
                    } else if (error.code === 'not-found') {
                        console.warn('⚠️ Документ не найден в Firestore');
                        showNotification('Данные не найдены в Firebase', 'info');
                    } else {
                        showNotification('Ошибка загрузки из Firebase', 'error');
                    }
                    
                    return false;
                }
            }

            function applyRolePermissions() {
                const isViewer = appState.role === 'viewer';
                const isMikhail = appState.userName === 'Михаил';
                
                // Отключаем только функции наград для не-Михаила (но сохраняем функционал Админа)
                const rewardControls = [
                    'button[onclick^="showRewardModal"]',
                    'button[onclick^="showIdeaModal"]',
                ];
                rewardControls.forEach(sel => document.querySelectorAll(sel).forEach(el => {
                    if (el && el.closest) {
                        // Отключаем элементы наград только для пользователей, которые НЕ Михаил
                        if (!isMikhail && !el.closest('#accountModal') && !el.closest('.progress-container')) {
                            el.setAttribute('disabled', 'true');
                            el.style.pointerEvents = 'none';
                            el.style.opacity = '0.6';
                        } else {
                            el.removeAttribute('disabled');
                            el.style.pointerEvents = '';
                            el.style.opacity = '';
                        }
                    }
                }));
                
                // Для Админа сохраняем полный функционал управления заданиями и прогрессом
                const adminControls = [
                    '.btn-icon-delete', '.activity-delete',
                    'button[onclick^="showTaskModal"]',
                    '#settingsMenu .settings-item.danger',
                    '#importFile',
                ];
                adminControls.forEach(sel => document.querySelectorAll(sel).forEach(el => {
                    if (el && el.closest) {
                        // Отключаем элементы только для viewer (Михаил), но не для Админа
                        if (isViewer && !el.closest('#accountModal') && !el.closest('.progress-container')) {
                            el.setAttribute('disabled', 'true');
                            el.style.pointerEvents = 'none';
                            el.style.opacity = '0.6';
                        } else {
                            el.removeAttribute('disabled');
                            el.style.pointerEvents = '';
                            el.style.opacity = '';
                        }
                    }
                }));
                
                // Дополнительно отключаем кнопки удаления заданий для Михаила
                const taskDeleteButtons = document.querySelectorAll('.btn-icon-delete');
                taskDeleteButtons.forEach(btn => {
                    if (btn && btn.closest('.task-item')) {
                        if (isViewer) {
                            btn.style.display = 'none'; // Скрываем кнопку удаления для Михаила
                        } else {
                            btn.style.display = ''; // Показываем для Админа
                        }
                    }
                });
                
                // Special case: allow progress navigation for viewer
                const progressNav = document.querySelectorAll('#weekPrevBtn, #weekNextBtn');
                progressNav.forEach(el => {
                    if (el && isViewer) {
                        el.removeAttribute('disabled');
                        el.style.pointerEvents = '';
                        el.style.opacity = '';
                    }
                });
                
                // Управление видимостью блоков настроек
                const blocksToHide = [
                    { element: document.getElementById('techDiagnosticsBlock'), divider: document.getElementById('dividerBeforeTech') },
                    { element: document.getElementById('firebaseOperationsBlock'), divider: document.getElementById('dividerBeforeFirebase') },
                    { element: document.getElementById('dangerousOperationsBlock'), divider: document.getElementById('dividerBeforeDanger') },
                    { element: document.getElementById('backupManagementBlock'), divider: document.getElementById('dividerBeforeBackups') }
                ];
                
                blocksToHide.forEach(({ element, divider }) => {
                    if (element) {
                        if (isViewer) {
                            // Скрываем блоки для Михаила (viewer)
                            element.style.display = 'none';
                        } else {
                            // Показываем блоки для Админа
                            element.style.display = '';
                        }
                    }
                    
                    if (divider) {
                        if (isViewer) {
                            // Скрываем разделители для Михаила (viewer)
                            divider.style.display = 'none';
                        } else {
                            // Показываем разделители для Админа
                            divider.style.display = '';
                        }
                    }
                });
                
                // Восстанавливаем состояние блоков (все свернуты по умолчанию)
                restoreSettingsBlocksState();
                
                // Обновляем отображение заданий с учетом роли
                renderTasks();
            }

            function showNotification(message, type = "success") {
                const notification = document.getElementById("notification");
                const messageEl = document.getElementById(
                    "notificationMessage",
                );

                messageEl.textContent = message;
                notification.className = `notification ${type} show`;

                safeSetTimeout(() => {
                    notification.classList.remove("show");
                }, 3000);
            }









            // Welcome modal texts (random unique praise each time)
            const welcomePhrases = [
                "Fantastic start, {name}! Every click is a step toward fluency—keep shining!",
                "{name}, your consistency is impressive—today's effort will compound into greatness!",
                "Brilliant move, {name}! Your dedication to English is what champions are made of.",
                "{name}, you're unstoppable! Each lesson sharpens your mind and your voice.",
                "Outstanding, {name}! You're building a skill that will open doors everywhere.",
                "Great energy, {name}! Turning intention into action—this is how mastery begins.",
                "{name}, amazing focus! Your future self will thank you for this exact moment.",
                "Superb, {name}! Small wins daily create extraordinary results—let's go!",
                "You rock, {name}! Today's practice brings you closer to confident English.",
                "Impressive, {name}! Momentum is yours—one task at a time to the top!"
            ];

            function showWelcomeModal() {
                // Получаем текущее состояние (включая демо-режим)
                const currentState = getEffectiveState();
                
                // Показываем приветствие только для Михаила
                if (currentState.userName !== 'Михаил') {
                    return;
                }
                
                const idx = Math.floor(Math.random() * welcomePhrases.length);
                const msg = welcomePhrases[idx].replace('{name}', currentState.userName || 'Михаил');
                
                // Обновляем заголовок модального окна
                const welcomeTitle = document.getElementById('welcomeModalTitle');
                if (welcomeTitle) {
                    welcomeTitle.textContent = `Welcome, ${currentState.userName}!`;
                }
                
                const welcomeEl = document.getElementById('welcomeMessage');
                if (welcomeEl) welcomeEl.textContent = msg;
                
                console.log('🔄 Показываем приветствие, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ ПРИВЕТСТВИЯ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Приветствие показано, все показатели пересчитаны');
                
                // Автоматическое сохранение отключено при показе приветствия
                // saveDataToFirebase();
                
                document.getElementById('welcomeModal').classList.add('show');
            }
            function hideWelcomeModal() {
                document.getElementById('welcomeModal').classList.remove('show');
            }

            function loadIdeas() {
                try {
                    const raw = localStorage.getItem(IDEAS_KEY);
                    const list = raw ? JSON.parse(raw) : [];
                    return Array.isArray(list) ? list : [];
                } catch { return []; }
            }
            function saveIdeas(list) {
                try { localStorage.setItem(IDEAS_KEY, JSON.stringify(list.slice(0, 50))); } catch {}
            }
            function addIdea(desc) {
                const ideas = loadIdeas();
                const clean = desc.trim();
                if (!clean) return;
                if (!ideas.includes(clean)) {
                    ideas.unshift(clean);
                    saveIdeas(ideas);
                }
            }
            function removeIdea(desc) {
                const ideas = loadIdeas().filter(i => i !== desc);
                saveIdeas(ideas);
            }
            function renderIdeaSuggestions(query = '') {
                const box = document.getElementById('ideaAutocomplete');
                if (!box) return;
                const ideas = loadIdeas();
                const q = query.trim().toLowerCase();
                const filtered = q ? ideas.filter(i => i.toLowerCase().includes(q)) : ideas;
                if (filtered.length === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
                box.innerHTML = filtered.map(i => `
                    <div class="autocomplete-item" data-value="${escapeHTML(i)}">
                        <div class="autocomplete-text">${escapeHTML(i)}</div>
                        <button class="autocomplete-remove" aria-label="Удалить сохраненный вариант" data-remove="${escapeHTML(i)}">
                            ❌
                        </button>
                    </div>
                `).join('');
                box.style.display = 'block';
            }

            function getXPRequiredForLevel(level) {
                if (level >= 100) return 0;
                // Правило заказчика: до следующего уровня сейчас фиксировано 810 XP
                return 810;
            }

            function calculateXPProgress(currentXP, maxXP) {
                if (!maxXP || maxXP <= 0) return 100;
                return Math.min((currentXP / maxXP) * 100, 100);
            }

            function calculateWeeklyStars(weeklyXP) {
                const thresholds = [500, 750];
                const stars = thresholds.filter((threshold) => weeklyXP >= threshold).length;
                console.log('⭐ calculateWeeklyStars:', { weeklyXP, thresholds, stars });
                return stars;
            }

            // Function to get next weekly target (fixed at 750 XP)
            function getNextWeeklyTarget() {
                return 750;
            }

            // Function to get weekly progress percentage (based on 750 XP max)
            function getWeeklyProgressPercent(weeklyXP = null) {
                const currentXP = weeklyXP !== null ? weeklyXP : appState.progress.weeklyXP;
                return Math.min(100, (currentXP / 750) * 100);
            }

            // Function to get weekly progress stage
            function getWeeklyProgressStage(currentXP) {
                if (currentXP < 500) {
                    return 'beginner'; // 0-499 XP
                } else if (currentXP < 750) {
                    return 'intermediate'; // 500-749 XP
                } else {
                    return 'expert'; // 750+ XP
                }
            }

            // DOM Updates
            function updateProgressDisplay() {
                const { progress } = appState;

                const currentLevelEl = safeGetCachedElement("currentLevel");
                const totalXPEl = safeGetCachedElement("totalXP");
                
                if (currentLevelEl) currentLevelEl.textContent = progress.level;
                if (totalXPEl) totalXPEl.textContent = progress.totalXP.toLocaleString();
                updateBestWeekDisplay();

                const xpNeeded = getXPRequiredForLevel(progress.level);
                const xpRemaining = Math.max(0, xpNeeded - progress.currentLevelXP);
                const levelProgress = calculateXPProgress(progress.currentLevelXP, xpNeeded);
                document.getElementById("levelProgress").style.width = `${levelProgress}%`;
                document.getElementById("xpProgress").textContent = xpNeeded === 0 ? 'Максимальный уровень' : `${xpRemaining} XP`;

                // Update star bank and earned stars for the current week
                updateWeeklyStars();
                // Weekly and monthly sections
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateRedeemControls();
                
                // Пересчитываем и обновляем отображение лучшей недели
                recalculateBestWeek();
                
                // Обновляем отображение времени обучения
                updateLearningTimeDisplay();
            }

            function isWeekday(date) {
                const d = new Date(date);
                const day = d.getDay();
                return day >= 1 && day <= 5; // Mon..Fri
            }

            function hasActivityOn(date, stateOverride) {
                const state = stateOverride || appState;
                const key = formatDate(new Date(date));
                const logs = (state.activityData && state.activityData[key]);
                return Array.isArray(logs) && logs.length > 0;
            }

            function iterateDays(startDate, endDate, cb) {
                const cur = new Date(startDate);
                cur.setHours(0,0,0,0);
                const stop = new Date(endDate);
                stop.setHours(0,0,0,0);
                while (cur <= stop) {
                    cb(new Date(cur));
                    cur.setDate(cur.getDate() + 1);
                }
            }

            function updateBestWeekDisplay() {
                const bestWeekXP = appState.progress.bestWeekXP || 0;
                const el = document.getElementById('bestWeekXP');
                if (el) el.textContent = `${bestWeekXP} XP`;
                
                console.log('🏆 Обновлен дисплей лучшей недели:', bestWeekXP, 'XP');
            }

            function updateWeeklyStars() {
                const stars = document.querySelectorAll("#weeklyStars .star");
                const newEarned = calculateWeeklyStars(appState.progress.weeklyXP);
                const oldEarned = appState.progress.weeklyStars || 0;
                const oldStarBank = appState.progress.starBank || 0;
                
                // Сохраняем старое значение weeklyStars перед обновлением
                const previousWeeklyStars = oldEarned;
                
                // Используем правильное сравнение: newEarned vs previousWeeklyStars
                const starsGained = newEarned - previousWeeklyStars;
                const nextStarThreshold = newEarned < 2 ? (newEarned === 0 ? 500 : 750) : null;
                
                console.log('⭐ updateWeeklyStars called:', {
                    weeklyXP: appState.progress.weeklyXP,
                    previousWeeklyStars,
                    newEarned,
                    starsGained,
                    oldStarBank,
                    nextStarThreshold: nextStarThreshold ? `${nextStarThreshold} XP` : 'Максимум достигнут'
                });
                

                
                if (newEarned > previousWeeklyStars) {
                    appState.progress.starBank = (appState.progress.starBank || 0) + starsGained;
                    
                    console.log('⭐ Звезды получены! Показываем уведомления:', {
                        starsGained,
                        newEarned,
                        weeklyXP: appState.progress.weeklyXP,
                        newStarBank: appState.progress.starBank
                    });
                    // Star notifications and achievement checks removed
                } else {
                    console.log('⭐ Звезды НЕ получены. Причина:', {
                        newEarned,
                        previousWeeklyStars,
                        condition: newEarned > previousWeeklyStars,
                        weeklyXP: appState.progress.weeklyXP
                    });
                }
                
                appState.progress.weeklyStars = newEarned;

                stars.forEach((star, index) => {
                    if (index < newEarned) star.classList.add("filled");
                    else star.classList.remove("filled");
                });

                const availableStarsEl = document.getElementById("availableStars");
                if (availableStarsEl) {
                    availableStarsEl.textContent = `${appState.progress.starBank || 0} ⭐`;
                }
                // inline available star bank
                const availableInline = document.getElementById('availableStarsInline');
                if (availableInline) availableInline.textContent = `${appState.progress.starBank || 0} ⭐`;
                // redeem stars (3) based on this week's earned stars
                const redeemStars = document.querySelectorAll('#redeemStars .redeem-star');
                redeemStars.forEach((el, idx) => {
                    if (idx < newEarned) el.classList.add('filled'); else el.classList.remove('filled');
                    if (newEarned >= 2 && idx === 2) el.classList.add('ready'); else el.classList.remove('ready');
                });
            }

            // Learning Time Functions
            function updateLearningTimeDisplay() {
                const timeData = calculateLearningTimeData();
                
                // Отладочная информация
                console.log('📊 Расчет времени обучения:');
                console.log('   - Общее время за ВСЕ время:', timeData.totalTime, 'минут =', formatTime(timeData.totalTime));
                console.log('   - Среднее в неделю (сумма средних по дням):', timeData.weeklyAverage, 'минут =', formatTime(timeData.weeklyAverage));
                console.log('   - Среднее в день:', timeData.dailyAverage, 'минут =', formatTime(timeData.dailyAverage));
                console.log('   - Среднее время по дням недели:', timeData.weeklyTime.map(t => formatTime(t)));
                
                // Обновляем основные статистики
                document.getElementById('totalLearningTime').textContent = formatTime(timeData.totalTime);
                document.getElementById('weeklyAvgTime').textContent = formatTime(timeData.weeklyAverage);
                document.getElementById('dailyAvgTime').textContent = formatTime(timeData.dailyAverage);
                
                // Обновляем круговую диаграмму
                updateWeeklyTimeChart(timeData.weeklyTime);
                

                
                // Обновляем легенду
                updateTimeLegend(timeData.weeklyTime);
            }

            // Обработчик изменения размера окна для адаптивности
            function handleResize() {
                // Перерисовываем круговую диаграмму при изменении размера
                const timeData = calculateLearningTimeData();
                updateWeeklyTimeChart(timeData.weeklyTime);
            }

            function calculateLearningTimeData() {
                const state = getEffectiveState();
                const activity = state.activityData || {};
                const dates = Object.keys(activity).sort();
                
                let totalTime = 0;
                let dailyTime = {};
                let weeklyTimeTotal = [0, 0, 0, 0, 0, 0, 0]; // Общее время по дням недели (Пн-Вс)
                let weeklyTimeCounts = [0, 0, 0, 0, 0, 0, 0]; // Количество дней по дням недели для подсчета среднего
                
                // Вычисляем время для каждого дня на основе существующих данных
                dates.forEach(date => {
                    const logs = activity[date] || [];
                    let dayTime = 0;
                    
                    // Если у нас есть timeSpent, используем его, иначе ищем задание по ID для получения реальной длительности
                    logs.forEach(log => {
                        if (log.timeSpent) {
                            dayTime += log.timeSpent;
                        } else {
                            // Находим задание по ID для получения реальной длительности
                            const task = appState.tasks.find(t => t.id === log.taskId);
                            let estimatedTime = 0;
                            
                            if (task && task.duration) {
                                // Используем реальную длительность из задания
                                estimatedTime = task.duration;
                            } else {
                                // Если задание не найдено, используем базовые значения
                                if (log.taskName && log.taskName.includes('Грамматические')) {
                                    estimatedTime = 20; // Базовое значение для грамматики
                                } else if (log.taskName && log.taskName.includes('Аудирование')) {
                                    estimatedTime = 25; // Базовое значение для аудирования
                                } else {
                                    estimatedTime = 15; // Базовое значение для изучения слов
                                }
                            }
                            
                            dayTime += estimatedTime;
                            
                            // Сохраняем вычисленное время для будущего использования
                            log.timeSpent = estimatedTime;
                        }
                    });
                    
                    if (dayTime > 0) {
                        dailyTime[date] = dayTime;
                        totalTime += dayTime;
                        
                        // Добавляем в статистику по дням недели для расчета среднего
                        const d = new Date(date);
                        const dayOfWeek = d.getDay();
                        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Пн = 0, Вс = 6
                        weeklyTimeTotal[adjustedDay] += dayTime;
                        weeklyTimeCounts[adjustedDay]++;
                    }
                });
                
                // Вычисляем СРЕДНЕЕ время по дням недели (не суммарное!)
                const weeklyTimeAverage = weeklyTimeTotal.map((total, index) => {
                    return weeklyTimeCounts[index] > 0 ? total / weeklyTimeCounts[index] : 0;
                });
                
                // Вычисляем среднее время в день
                const activeDays = dates.filter(date => dailyTime[date] > 0).length;
                const dailyAverage = activeDays > 0 ? totalTime / activeDays : 0;
                
                // Вычисляем среднее время в неделю (сумма среднего времени по всем дням недели)
                const weeklyAverage = weeklyTimeAverage.reduce((sum, time) => sum + time, 0);
                
                return {
                    totalTime,
                    dailyAverage,
                    weeklyAverage,
                    dailyTime,
                    weeklyTime: weeklyTimeAverage // Используем среднее время по дням недели
                };
            }



            function formatTime(minutes) {
                if (!minutes || minutes === 0) return '0 ч 0 мин';
                
                const hours = Math.floor(minutes / 60);
                const mins = Math.round(minutes % 60);
                
                // Если есть часы, показываем и часы, и минуты
                if (hours > 0) {
                    if (mins > 0) {
                        return `${hours} ч ${mins} мин`;
                    } else {
                        return `${hours} ч`;
                    }
                } else {
                    // Если нет часов, показываем только минуты
                    return `${mins} мин`;
                }
            }

            function updateWeeklyTimeChart(weeklyTime) {
                // weeklyTime теперь содержит среднее время по дням недели
                const totalAverageWeeklyTime = weeklyTime.reduce((sum, time) => sum + time, 0);
                
                // Форматируем время в формате HH:MM
                const timeDisplay = formatTime(totalAverageWeeklyTime);
                
                // Адаптивный текст в зависимости от размера экрана
                const isMobile = window.innerWidth <= 480;
                const isTablet = window.innerWidth <= 768;
                
                let labelText = "в неделю";
                if (isMobile) {
                    labelText = "в неделю";
                } else if (isTablet) {
                    labelText = "в неделю";
                }
                
                document.getElementById('weeklyTimeChart').innerHTML = `
                    <div class="time-chart-center">
                        <div class="time-chart-total">${timeDisplay}</div>
                        <div class="time-chart-label">${labelText}</div>
                    </div>
                `;
                
                // Обновляем conic-gradient для диаграммы
                const chart = document.getElementById('weeklyTimeChart');
                
                if (totalAverageWeeklyTime > 0) {
                    let currentAngle = 0;
                    const gradients = [];
                    const colors = ['#1e40af', '#3b82f6', '#059669', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    
                    weeklyTime.forEach((time, index) => {
                        if (time > 0) {
                            const angle = (time / totalAverageWeeklyTime) * 360;
                            gradients.push(`${colors[index]} ${currentAngle}deg ${currentAngle + angle}deg`);
                            currentAngle += angle;
                        }
                    });
                    
                    if (gradients.length > 0) {
                        chart.style.background = `conic-gradient(from 0deg, ${gradients.join(', ')})`;
                    } else {
                        // Если нет данных, показываем базовый градиент
                        chart.style.background = 'conic-gradient(from 0deg, #e2e8f0 0deg 360deg)';
                    }
                } else {
                    // Если нет данных, показываем базовый градиент
                    chart.style.background = 'conic-gradient(from 0deg, #e2e8f0 0deg 360deg)';
                }
            }



            function updateTimeLegend(weeklyTime) {
                const legend = document.getElementById('weeklyTimeLegend');
                const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                const colors = ['#1e40af', '#3b82f6', '#059669', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                
                let legendHTML = '';
                let totalAverageWeeklyTime = weeklyTime.reduce((sum, time) => sum + time, 0);
                
                weeklyTime.forEach((time, index) => {
                    if (time > 0) {
                        const percentage = totalAverageWeeklyTime > 0 ? ((time / totalAverageWeeklyTime) * 100).toFixed(1) : 0;
                        legendHTML += `
                            <div class="time-legend-item">
                                <div class="time-legend-color" style="background-color: ${colors[index]};"></div>
                                <span>${days[index]}: ${formatTime(time)}</span>
                                <span style="color: #94a3b8; font-size: 0.75rem;">(${percentage}%)</span>
                            </div>
                        `;
                    } else {
                        legendHTML += `
                            <div class="time-legend-item" style="opacity: 0.5;">
                                <div class="time-legend-color" style="background-color: #e2e8f0;"></div>
                                <span>${days[index]}: нет данных</span>
                            </div>
                        `;
                    }
                });
                

                
                legend.innerHTML = legendHTML;
            }

            function getWeekStartKey(date) {
                // Проверяем, что date является объектом Date
                if (!date || typeof date.getDay !== 'function') {
                    console.warn('⚠️ getWeekStartKey: передан неверный объект date:', date);
                    date = new Date();
                }
                
                const d = new Date(date);
                const day = (d.getDay() + 6) % 7;
                d.setHours(0,0,0,0);
                d.setDate(d.getDate() - day);
                return formatDate(d);
            }

            function ensureWeeklyReset() {
                // Проверяем, что appState.progress существует
                if (!appState.progress) {
                    appState.progress = {
                        weekStartKey: '',
                        weeklyXP: 0,
                        weeklyStars: 0,
                        starBank: 0,
                        bestWeekXP: 0
                    };
                }
                
                const currentKey = getWeekStartKey(new Date());
                if (appState.progress.weekStartKey !== currentKey) {
                    console.log('📅 Новая неделя, обновляем лучшую неделю...');
                    
                    // Обновляем лучшую неделю перед сбросом
                    updateBestWeekProgress();
                    
                    appState.progress.weekStartKey = currentKey;
                    appState.progress.weeklyXP = 0;
                    appState.progress.weeklyStars = 0;
                    
                    console.log('🔄 Неделя сброшена, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПОСЛЕ СБРОСА НЕДЕЛИ
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    
                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Неделя сброшена, все показатели пересчитаны');
                    console.log('📅 Новая неделя:', currentKey);
                    
                    // Автоматическое сохранение отключено при сбросе недели
                    // saveDataToFirebase();
                }
            }

            function updateRedeemControls() {
                const redeemBtn = document.getElementById('redeemBtn');
                const canRedeem = (appState.progress.starBank || 0) >= 3 && appState.rewardPlan && appState.rewardPlan.description;
                if (redeemBtn) {
                    redeemBtn.disabled = !canRedeem;
                    redeemBtn.title = canRedeem ? '' : 'Нужно 3 ⭐ и запланированная награда';
                    // Ensure button is clickable for viewer role
                    if (appState.role === 'viewer') {
                        redeemBtn.style.pointerEvents = '';
                        redeemBtn.style.opacity = '';
                    }
                }
                const planned = document.getElementById('plannedRewardDisplay');
                if (planned) planned.textContent = appState.rewardPlan && appState.rewardPlan.description ? appState.rewardPlan.description : '—';
                const confirmBtn = document.getElementById('confirmRedeemBtn');
                if (confirmBtn) confirmBtn.disabled = !canRedeem;

                // Toggle idea button availability and planned card visibility
                const ideaBtn = document.getElementById('ideaBtn');
                const hasPlanned = !!(appState.rewardPlan && appState.rewardPlan.description);
                if (ideaBtn) {
                    ideaBtn.disabled = hasPlanned;
                    ideaBtn.title = hasPlanned ? 'Награда уже запланирована. Получите её, чтобы запланировать новую.' : 'Придумать и сохранить награду';
                }
                const plannedCard = document.getElementById('plannedRewardCard');
                const plannedText = document.getElementById('plannedRewardText');
                if (plannedCard) plannedCard.style.display = hasPlanned ? 'block' : 'none';
                if (plannedText) plannedText.textContent = hasPlanned ? appState.rewardPlan.description : '—';

                // Bank stars visualization (global goal: 3 ⭐ to redeem)
                const bank = Math.max(0, appState.progress.starBank || 0);
                const bankStars = [document.getElementById('bankStar1'), document.getElementById('bankStar2'), document.getElementById('bankStar3')];
                bankStars.forEach((el, idx) => { if (!el) return; if (idx < Math.min(3, bank)) el.classList.add('filled'); else el.classList.remove('filled'); if (bank >= 3) el.classList.add('ready'); else el.classList.remove('ready'); });
                const bankText = document.getElementById('bankStarsText');
                if (bankText) bankText.textContent = `${bank} ⭐`;
            }

            function renderWeeklyChart(weekStartOverride) {
                const container = document.getElementById('weeklyChart');
                if (!container) return;
                // Collect XP per day for selected week (Mon..Sun)
                const weekStart = weekStartOverride || getWeekStartFromOffset(appState.progressView?.weekOffset || 0);
                const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(weekStart);
                    d.setDate(weekStart.getDate() + i);
                    return d;
                });
                const xpByDay = days.map(d => {
                    const key = formatDate(d);
                    const logs = appState.activityData[key] || [];
                    return logs.reduce((s, l) => s + (l.xpEarned || 0), 0);
                });
                const maxXP = Math.max(100, ...xpByDay);
                const dayLabels = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
                container.innerHTML = days.map((d, idx) => {
                    const val = xpByDay[idx];
                    const h = Math.round((val / maxXP) * 100);
                    return `
                        <div class="bar" title="${dayLabels[idx]}: ${val} XP">
                            <div class="bar-column" aria-label="${dayLabels[idx]} ${val} XP">
                                <div class="bar-value" style="height: ${h}%"></div>
                            </div>
                            <div class="bar-xp">${val}</div>
                            <div class="bar-label">${dayLabels[idx]}</div>
                        </div>
                    `;
                }).join('');
            }

            function getWeekStartFromOffset(offset) {
                const base = new Date();
                const day = (base.getDay() + 6) % 7; // 0=Mon
                base.setHours(0,0,0,0);
                base.setDate(base.getDate() - day + (offset * 7));
                return base;
            }
            
            // Function to get week start for a specific date
            function getWeekStartForDate(date) {
                const weekStart = new Date(date);
                const day = (weekStart.getDay() + 6) % 7; // 0=Mon
                weekStart.setHours(0, 0, 0, 0);
                weekStart.setDate(weekStart.getDate() - day);
                return weekStart;
            }

            function formatWeekRangeLabel(weekStart) {
                const end = new Date(weekStart);
                end.setDate(end.getDate() + 6);
                const fmt = (d) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
                const y = weekStart.getFullYear() === end.getFullYear() ? '' : ` ${end.getFullYear()}`;
                return `${fmt(weekStart)} – ${fmt(end)}${y}`;
            }

            function computeWeekXP(weekStart) {
                let total = 0;
                for (let i=0;i<7;i++) {
                    const d = new Date(weekStart);
                    d.setDate(weekStart.getDate()+i);
                    const key = formatDate(d);
                    const logs = appState.activityData[key] || [];
                    total += logs.reduce((s,l)=>s+(l.xpEarned||0),0);
                }
                return total;
            }

            function updateProgressWeekSection() {
                const offset = appState.progressView?.weekOffset || 0;
                const start = getWeekStartFromOffset(offset);
                const label = document.getElementById('weekRangeLabel');
                if (label) label.textContent = formatWeekRangeLabel(start);
                const weekXP = computeWeekXP(start);
                
                // Правильный расчет процента недельного прогресса (максимум 750 XP)
                const weeklyProgressPct = Math.min(100, (weekXP / 750) * 100);
                
                const weeklyBar = document.getElementById('weeklyBar');
                if (weeklyBar) weeklyBar.style.width = `${weeklyProgressPct}%`;
                const weeklyText = document.getElementById('weeklyProgress');
                if (weeklyText) weeklyText.textContent = `${weekXP} / 750 XP`;
                
                // Update threshold markers
                const m500 = document.getElementById('marker500');
                const m750 = document.getElementById('marker750');
                if (m500) m500.classList.toggle('active', weekXP >= 500);
                if (m750) m750.classList.toggle('active', weekXP >= 750);
                updateWeeklyStarsDisplayForXP(weekXP);
                renderWeeklyChart(start);
                updateWeekNavControls();
                
                console.log('📊 Недельный прогресс обновлен:', {
                    weekOffset: offset,
                    weekStart: start.toISOString().split('T')[0],
                    weekXP: weekXP,
                    progressPercent: weeklyProgressPct
                });
            }

            function updateWeekNavControls() {
                const nextBtn = document.getElementById('weekNextBtn');
                if (nextBtn) nextBtn.disabled = (appState.progressView?.weekOffset || 0) >= 0;
            }

            function changeWeek(direction) {
                const newOffset = (appState.progressView?.weekOffset || 0) + direction;
                if (newOffset > 0) return; // prevent going to future
                appState.progressView.weekOffset = newOffset;
                updateProgressWeekSection();
                // Автоматическое сохранение отключено
            }

            function changeMonthProgress(direction) {
                const newOffset = (appState.progressView?.monthOffset || 0) + direction;
                if (newOffset > 0) return; // prevent going to future
                appState.progressView.monthOffset = newOffset;
                updateMonthlyProgressSection();
                updateMonthNavControls();
                // Автоматическое сохранение отключено
            }

            function updateMonthNavControls() {
                const nextBtn = document.getElementById('monthNextBtn');
                if (nextBtn) nextBtn.disabled = (appState.progressView?.monthOffset || 0) >= 0;
            }

            function updateWeeklyStarsDisplayForXP(weeklyXP) {
                const stars = document.querySelectorAll('#weeklyStars .star');
                const count = calculateWeeklyStars(weeklyXP);
                stars.forEach((star, index) => {
                    if (index < count) star.classList.add('filled'); else star.classList.remove('filled');
                });
                const redeemStars = document.querySelectorAll('#redeemStars .redeem-star');
                redeemStars.forEach((el, idx) => {
                    if (idx < count) el.classList.add('filled'); else el.classList.remove('filled');
                    if (count >= 2 && idx === 2) el.classList.add('ready'); else el.classList.remove('ready');
                });
            }

            function updateMonthlyProgressSection() {
                const offset = appState.progressView?.monthOffset || 0;
                const now = new Date();
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
                const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
                const nextMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth()+1, 1);
                const daysInMonth = Math.round((nextMonth - monthStart)/(24*60*60*1000));
                
                // Update month label
                const label = document.getElementById('monthProgressLabel');
                if (label) {
                    if (offset === 0) {
                        label.textContent = 'Текущий месяц';
                    } else {
                        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                                          'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                        const monthName = monthNames[targetMonth.getMonth()];
                        const year = targetMonth.getFullYear();
                        label.textContent = `${monthName} ${year}`;
                    }
                }
                
                let monthXP = 0;
                const xpByDay = [];
                for (let i=0;i<daysInMonth;i++) {
                    const d = new Date(monthStart);
                    d.setDate(monthStart.getDate()+i);
                    const key = formatDate(d);
                    const logs = appState.activityData[key] || [];
                    const dayXP = logs.reduce((s,l)=>s+(l.xpEarned||0),0);
                    xpByDay.push(dayXP);
                    monthXP += dayXP;
                }
                const pct = Math.min(100, Math.round((monthXP / 3000) * 100));
                const bar = document.getElementById('monthlyBar');
                if (bar) bar.style.width = `${pct}%`;
                const text = document.getElementById('monthlyProgressText');
                if (text) text.textContent = `${monthXP} / 3000 XP`;
                renderMonthlyInlineChart(monthStart, xpByDay);
                updateMonthNavControls();
            }

            function renderMonthlyInlineChart(monthStart, xpByDay) {
                const container = document.getElementById('monthlyInlineChart');
                if (!container) return;
                const max = Math.max(50, ...xpByDay);
                const days = xpByDay.length;
                container.innerHTML = Array.from({length: days}).map((_,i)=>{
                    const val = xpByDay[i];
                    const d = new Date(monthStart);
                    d.setDate(monthStart.getDate()+i);
                    const h = Math.round((val/max)*100);
                    return `
                        <div class=\"bar\" title=\"${d.toLocaleDateString('ru-RU')}: ${val} XP\">
                            <div class=\"bar-column\" aria-label=\"${val} XP\">
                                <div class=\"bar-value\" style=\"height:${h}%\"></div>
                            </div>
                            <div class=\"bar-xp\" style=\"font-size:0.7rem\">${val}</div>
                            <div class=\"bar-label\" style=\"font-size:0.65rem\">${i+1}</div>
                        </div>
                    `;
                }).join('');
            }

            function renderTasks() {
                const taskList = safeGetCachedElement("taskList");
                if (!taskList) return;
                
                // Показываем/скрываем кнопку добавления задания в зависимости от роли
                const addTaskBtn = document.getElementById('addTaskBtn');
                if (addTaskBtn) {
                    addTaskBtn.style.display = appState.role === 'admin' ? 'inline-flex' : 'none';
                }
                
                taskList.innerHTML = appState.tasks
                    .map(
                        (task) => `
                <div class="task-item">
                    <div class="task-main" onclick="completeTask(event, ${task.id})" onkeydown="if(event.key==='Enter'||event.key===' '){completeTask(event, ${task.id})}" role="button" tabindex="0">
                        <div class="task-header">
                        <div class="task-icon">
                            ${task.icon}
                        </div>
                        <div class="task-details">
                            <h4>${escapeHTML(task.name)}</h4>
                                <button class="btn-description" onclick="showTaskDescription(event, ${task.id})" title="Подробное описание" aria-label="Подробное описание">
                                    📄 Подробнее
                                </button>
                        </div>
                    </div>
                        <div class="task-meta">
                            <div class="task-duration">⏱️ ${task.duration} мин</div>
                            <div class="task-reward">⭐ +${task.xpReward} XP</div>
                        </div>
                        </div>
                        ${appState.role === 'admin' ? `
                    <div class="task-actions">
                        <button class="btn-icon-edit" onclick="editTask(${task.id})" title="Редактировать задание" aria-label="Редактировать задание">
                            ✏️
                        </button>
                        <button class="btn-icon-delete" onclick="deleteTask(${task.id})" title="Удалить задание" aria-label="Удалить задание">
                            🗑️
                        </button>
                    </div>
                        ` : ''}
                </div>
            `,
                    )
                    .join("");
            }

            // Function to show task description modal
            function showTaskDescription(event, taskId) {
                event.stopPropagation(); // Prevent task completion when clicking description button
                
                const task = appState.tasks.find(t => t.id === taskId);
                if (!task) return;
                
                // Create modal content
                const modalContent = `
                    <div class="description-modal-overlay" onclick="hideTaskDescription()">
                        <div class="description-modal-content" onclick="event.stopPropagation()">
                            <div class="description-modal-header">
                                <div class="description-modal-icon">${task.icon}</div>
                                <h3 class="description-modal-title">${escapeHTML(task.name)}</h3>
                                <button class="description-modal-close" onclick="hideTaskDescription()" aria-label="Закрыть">
                                    ✕
                                </button>
                            </div>
                            <div class="description-modal-body">
                                <div class="description-modal-meta">
                                    <div class="description-meta-item">
                                        <span class="description-meta-icon">⏱️</span>
                                        <span class="description-meta-text">${task.duration} минут</span>
                                    </div>
                                    <div class="description-meta-item">
                                        <span class="description-meta-icon">⭐</span>
                                        <span class="description-meta-text">+${task.xpReward} XP</span>
                                    </div>
                                </div>
                                <div class="description-modal-description">
                                    <h4>Описание задания:</h4>
                                    <p>${escapeHTML(task.description)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add modal to body
                document.body.insertAdjacentHTML('beforeend', modalContent);
                
                // Add animation class after a small delay
                requestAnimationFrame(() => {
                    const modal = document.querySelector('.description-modal-overlay');
                    if (modal) {
                        modal.classList.add('show');
                    }
                });
            }
            
            // Function to hide task description modal
            function hideTaskDescription() {
                const modal = document.querySelector('.description-modal-overlay');
                if (modal) {
                    modal.classList.remove('show');
                    safeSetTimeout(() => {
                        modal.remove();
                    }, 300);
                }
            }

            function renderRewards() {
                // Update achievements bank
                updateAchievementsBank();
                
                // Update rewards bank
                updateRewardsBank();
            }

            function clearRewards() {
                if (confirm('Удалить ВСЕ сохраненные награды?')) {
                    console.log('🔄 Очищаем все награды...');
                    
                    appState.rewards = [];
                    
                    console.log('🔄 Награды очищены, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                    
                    // 1. Пересчитываем весь прогресс с нуля (включая звезды)
                    recalculateAllProgress();
                    
                    // 2. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    renderRewards();
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    
                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Награды очищены, показатели обновлены');
                    
                    showNotification('Все награды удалены! Все показатели пересчитаны.', 'success');
                    
                    // Автоматически сохраняем в Firebase после очистки наград
                    saveDataToFirebaseSilent();
                }
            }

            function generateCalendar() {
                const calendar = document.getElementById("calendar");
                const monthTitle = document.getElementById("monthTitle");

                // Проверяем и исправляем currentMonth если нужно
                let currentMonth = appState.currentMonth;
                if (!currentMonth || typeof currentMonth.getFullYear !== 'function') {
                    console.warn('⚠️ currentMonth не является объектом Date, исправляем...');
                    currentMonth = new Date();
                    appState.currentMonth = currentMonth;
                }
                
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();

                const monthNames = [
                    "Январь",
                    "Февраль",
                    "Март",
                    "Апрель",
                    "Май",
                    "Июнь",
                    "Июль",
                    "Август",
                    "Сентябрь",
                    "Октябрь",
                    "Ноябрь",
                    "Декабрь",
                ];

                monthTitle.textContent = `${monthNames[month]} ${year}`;

                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDay = new Date(firstDay);
                startDay.setDate(
                    startDay.getDate() - ((firstDay.getDay() + 6) % 7),
                );

                const today = new Date();
                const selectedDate = appState.selectedDate;

                let days = "";
                let currentDay = new Date(startDay);

                for (let i = 0; i < 42; i++) {
                    const dayStr = formatDate(currentDay);
                    const isCurrentMonth = currentDay.getMonth() === month;
                    const isToday =
                        formatDate(currentDay) === formatDate(today);
                    const isSelected =
                        formatDate(currentDay) === formatDate(selectedDate);
                    const hasActivity = appState.activityData[dayStr];

                    let classes = "calendar-day";
                    if (isToday) classes += " today";
                    if (isSelected) classes += " selected";
                    if (!isCurrentMonth) classes += " other-month";

                    // Определяем уровень активности по времени обучения
                    if (hasActivity && hasActivity.length > 0) {
                        const totalTimeSpent = hasActivity.reduce((sum, log) => {
                            return sum + (log.timeSpent || 0);
                        }, 0);

                        if (totalTimeSpent > 0) {
                            if (totalTimeSpent < 30) {
                                classes += " activity-low";
                            } else if (totalTimeSpent < 60) {
                                classes += " activity-medium";
                            } else if (totalTimeSpent < 120) {
                                classes += " activity-high";
                            } else {
                                classes += " activity-very-high";
                            }
                        } else {
                            classes += " active"; // Старый стиль для совместимости
                        }
                    }

                    days += `
                    <div class="${classes}" onclick="selectDate('${dayStr}')" title="${dayStr}: ${hasActivity && hasActivity.length > 0 ? formatTime(hasActivity.reduce((sum, log) => sum + (log.timeSpent || 0), 0)) : 'Нет активности'}">
                        ${currentDay.getDate()}
                    </div>
                `;

                    currentDay.setDate(currentDay.getDate() + 1);
                }

                calendar.innerHTML = days;
            }

            function updateDayActivity() {
                // Проверяем и исправляем selectedDate если нужно
                let selectedDate = appState.selectedDate;
                if (!selectedDate || typeof selectedDate.toLocaleDateString !== 'function') {
                    console.warn('⚠️ selectedDate не является объектом Date, исправляем...');
                    selectedDate = new Date();
                    appState.selectedDate = selectedDate;
                }
                
                const selectedDateStr = formatDate(selectedDate);
                const dayActivity = document.getElementById("dayActivity");
                const selectedDateTitle =
                    document.getElementById("selectedDateTitle");

                const dateStr = selectedDate.toLocaleDateString("ru-RU");
                selectedDateTitle.textContent = `Активность за ${dateStr}`;

                const activity = appState.activityData[selectedDateStr];
                if (activity && activity.length > 0) {
                    const totalXP = activity.reduce(
                        (sum, log) => sum + log.xpEarned,
                        0,
                    );
                    const totalTime = activity.reduce(
                        (sum, log) => sum + (log.timeSpent || 0),
                        0,
                    );
                    dayActivity.innerHTML = `
                    <div style="color: #059669; font-weight: 600;">
                        Выполнено заданий: ${activity.length} • Получено XP: +${totalXP}
                    </div>
                    <div style="color: #1e40af; font-weight: 600; margin-top: 4px;">
                        Время обучения: ${formatTime(totalTime)}
                    </div>
                    <div style="margin-top: 8px;">
                        ${activity
                            .map(
                                (log, index) => `
                            <div class="activity-item" data-date="${selectedDateStr}" data-index="${index}">
                                ${escapeHTML(log.taskName)} (+${log.xpEarned} XP • ${formatTime(log.timeSpent || 0)})
                                <button class="activity-delete" onclick="deleteActivity('${selectedDateStr}', ${index})" title="Удалить запись активности" aria-label="Удалить запись активности">
                                    ❌
                                </button>
                            </div>
                        `,
                            )
                            .join("")}
                    </div>
                `;
                } else {
                    dayActivity.innerHTML = `
                    <div style="color: #64748b;">
                        Пока нет активности за выбранный день
                    </div>
                `;
                }
            }

            // Event Handlers
            function completeTask(e, taskId) {
                if (appState.role === 'viewer') { showNotification('Режим просмотра: действие недоступно', 'info'); return; }
                const task = appState.tasks.find((t) => t.id === taskId);
                if (!task) return;

                // Show confirmation modal instead of immediate completion
                showTaskCompletionModal(task);
            }

            // Function to show task completion confirmation modal
            function showTaskCompletionModal(task) {
                // Calculate initial weekly progress for today's date
                const today = new Date();
                const weekStart = getWeekStartForDate(today);
                const currentWeekXP = computeWeekXP(weekStart);
                const initialXP = task.xpReward; // Начальное значение XP из задания
                const initialTotalXP = currentWeekXP + initialXP; // Текущий + добавляемый XP
                const initialProgressPercent = getWeeklyProgressPercent(initialTotalXP);
                const initialStage = getWeeklyProgressStage(initialTotalXP);
                
                // Create modal content
                const modalContent = `
                    <div class="completion-modal-overlay" onclick="hideTaskCompletionModal()">
                        <div class="completion-modal-content" onclick="event.stopPropagation()">
                            <div class="completion-modal-header">
                                <div class="completion-modal-icon">${task.icon}</div>
                                <h3 class="completion-modal-title">Подтверждение выполнения</h3>
                                <button class="completion-modal-close" onclick="hideTaskCompletionModal()" aria-label="Закрыть">
                                    ✕
                                </button>
                            </div>
                            <div class="completion-modal-body">
                                <div class="completion-task-info">
                                    <h4>${escapeHTML(task.name)}</h4>
                                    <p class="completion-task-description">${escapeHTML(task.description)}</p>
                                </div>
                                
                                <div class="completion-adjustments">
                                    <h4>Настройки выполнения:</h4>
                                    <p class="completion-hint">Укажите дату выполнения и реальные значения XP и времени (от 1 до 500):</p>
                                    
                                    <div class="completion-input-group">
                                        <label for="completionDate">Дата выполнения:</label>
                                        <div class="completion-input-wrapper">
                                            <input type="date" id="completionDate" value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}" class="completion-input">
                                        </div>
                                    </div>
                                    
                                    <div class="completion-input-group">
                                        <label for="completionXP">Получено XP:</label>
                                        <div class="completion-input-wrapper">
                                            <input type="number" id="completionXP" value="${task.xpReward}" min="1" max="500" class="completion-input">
                                            <span class="completion-input-suffix">XP</span>
                                        </div>
                                    </div>
                                    
                                    <div class="completion-input-group">
                                        <label for="completionTime">Затрачено времени:</label>
                                        <div class="completion-input-wrapper">
                                            <input type="number" id="completionTime" value="${task.duration}" min="1" max="500" class="completion-input">
                                            <span class="completion-input-suffix">мин</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="completion-weekly-progress">
                                    <h4>Недельный прогресс:</h4>
                                    <div class="weekly-progress-container">
                                        <div class="weekly-progress-bar ${initialStage}">
                                            <div class="weekly-progress-fill" id="weeklyProgressFill" style="width: ${initialProgressPercent}%"></div>
                                            <div class="weekly-progress-text">
                                                <span class="current-weekly-xp">${initialTotalXP}</span>
                                                <span class="weekly-xp-separator">/</span>
                                                <span class="max-weekly-xp">750</span>
                                                <span class="weekly-xp-label">XP</span>
                                            </div>
                                        </div>
                                        <div class="weekly-progress-preview" id="weeklyProgressPreview">
                                            <div class="xp-addition-animation">
                                                <span class="xp-addition-text">+<span id="previewXPAddition">${task.xpReward}</span> XP</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="completion-modal-footer">
                                <button class="btn btn-secondary" onclick="hideTaskCompletionModal()">
                                    Отмена
                                </button>
                                <button class="btn btn-primary" onclick="confirmTaskCompletion(${task.id})">
                                    ✅ Подтвердить выполнение
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add modal to body
                document.body.insertAdjacentHTML('beforeend', modalContent);
                
                // Add event listeners for real-time preview updates
                const xpInput = document.getElementById('completionXP');
                const timeInput = document.getElementById('completionTime');
                const dateInput = document.getElementById('completionDate');
                
                xpInput.addEventListener('input', updateCompletionPreview);
                timeInput.addEventListener('input', updateCompletionPreview);
                dateInput.addEventListener('change', updateCompletionPreview);
                
                // Initial preview update to show correct progress
                requestAnimationFrame(() => {
                    updateCompletionPreview();
                });
                
                // Add animation class after a small delay
                requestAnimationFrame(() => {
                    const modal = document.querySelector('.completion-modal-overlay');
                    if (modal) {
                        modal.classList.add('show');
                    }
                });
            }
            
            // Function to update completion preview
            function updateCompletionPreview() {
                const xpInput = document.getElementById('completionXP');
                const timeInput = document.getElementById('completionTime');
                const dateInput = document.getElementById('completionDate');
                
                if (!xpInput || !timeInput || !dateInput) return;
                
                const newXP = parseInt(xpInput.value) || 0;
                const newTime = parseInt(timeInput.value) || 0;
                const completionDate = new Date(dateInput.value);
                
                // Update XP addition text
                const previewXPAddition = document.getElementById('previewXPAddition');
                if (previewXPAddition) {
                    previewXPAddition.textContent = newXP;
                }
                
                // Calculate current weekly XP for the selected date's week
                const weekStart = getWeekStartForDate(completionDate);
                const currentWeekXP = computeWeekXP(weekStart);
                const newWeeklyXP = currentWeekXP + newXP;
                
                // Calculate new progress percentage (based on 750 XP max)
                const newProgressPercent = Math.min(100, (newWeeklyXP / 750) * 100);
                const newStage = getWeeklyProgressStage(newWeeklyXP);
                
                // Update weekly progress bar with animation
                const weeklyProgressFill = document.getElementById('weeklyProgressFill');
                const weeklyProgressBar = document.querySelector('.weekly-progress-bar');
                const currentWeeklyXPText = document.querySelector('.current-weekly-xp');
                
                if (weeklyProgressFill && weeklyProgressBar) {
                    // Update progress bar class for color changes
                    weeklyProgressBar.className = `weekly-progress-bar ${newStage}`;
                    
                    // Animate the progress bar
                    weeklyProgressFill.style.transition = 'width 0.5s ease-out';
                    weeklyProgressFill.style.width = newProgressPercent + '%';
                    
                    // Update current XP text
                    if (currentWeeklyXPText) {
                        currentWeeklyXPText.textContent = newWeeklyXP;
                    }
                    
                    // Add pulse animation to show XP addition
                    const xpAdditionAnimation = document.querySelector('.xp-addition-animation');
                    if (xpAdditionAnimation) {
                        xpAdditionAnimation.classList.add('pulse');
                        safeSetTimeout(() => {
                            xpAdditionAnimation.classList.remove('pulse');
                        }, 500);
                    }
                }
                
                console.log('📊 Предварительный просмотр недельного прогресса:', {
                    completionDate: completionDate.toISOString().split('T')[0],
                    weekStart: weekStart.toISOString().split('T')[0],
                    currentWeekXP: currentWeekXP,
                    newXP: newXP,
                    newWeeklyXP: newWeeklyXP,
                    progressPercent: newProgressPercent,
                    stage: newStage
                });
            }
            
            // Function to hide task completion modal
            function hideTaskCompletionModal() {
                const modal = document.querySelector('.completion-modal-overlay');
                if (modal) {
                    modal.classList.remove('show');
                    safeSetTimeout(() => {
                        modal.remove();
                    }, 300);
                }
            }
            
            // Function to confirm task completion with custom values
            function confirmTaskCompletion(taskId) {
                const task = appState.tasks.find((t) => t.id === taskId);
                if (!task) return;
                
                const dateInput = document.getElementById('completionDate');
                const xpInput = document.getElementById('completionXP');
                const timeInput = document.getElementById('completionTime');
                
                if (!dateInput || !xpInput || !timeInput) return;
                
                const completionDate = new Date(dateInput.value);
                const customXP = parseInt(xpInput.value);
                const customTime = parseInt(timeInput.value);
                
                // Validate date
                if (isNaN(completionDate.getTime())) {
                    showNotification('Выберите корректную дату выполнения', 'error');
                    return;
                }
                
                // Check if date is in the future (not allowed)
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Reset time to start of day
                completionDate.setHours(0, 0, 0, 0); // Reset time to start of day
                
                if (completionDate > today) {
                    showNotification('Нельзя выполнять задания в будущем. Выберите сегодняшнюю дату или дату в прошлом.', 'error');
                    return;
                }
                
                // Validate inputs
                if (isNaN(customXP) || customXP < 1 || customXP > 500) {
                    showNotification('XP должно быть от 1 до 500', 'error');
                    return;
                }
                
                if (isNaN(customTime) || customTime < 1 || customTime > 500) {
                    showNotification('Время должно быть от 1 до 500 минут', 'error');
                    return;
                }
                
                // Hide modal first
                hideTaskCompletionModal();
                
                // Execute task completion with custom values and date
                executeTaskCompletion(task, customXP, customTime, completionDate);
            }
            
            // Function to execute actual task completion
            function executeTaskCompletion(task, customXP, customTime, completionDate = new Date()) {
                // Animate task completion
                const taskElement = document.querySelector(`[onclick*="completeTask(event, ${task.id})"]`).closest('.task-item');
                taskElement.classList.add("task-completed");

                safeSetTimeout(() => {
                    // Log activity with custom values and date first
                    const activityDate = formatDate(completionDate);
                    if (!appState.activityData[activityDate]) {
                        appState.activityData[activityDate] = [];
                    }
                    
                    appState.activityData[activityDate].push({
                        taskId: task.id,
                        taskName: task.name,
                        xpEarned: customXP,
                        timeSpent: customTime,
                        completedAt: completionDate,
                    });

                    console.log('🔄 Задание выполнено, пересчитываем все показатели...');
                    
                    // Сохраняем текущий уровень перед пересчетом
                    const oldLevel = appState.progress.level;
                    console.log('🔄 Сохраняем старый уровень:', oldLevel);
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ (включая прогресс)
                    recalculateAllProgress();
                    
                    // Восстанавливаем lastCheckedLevel на старый уровень
                    appState.progress.lastCheckedLevel = oldLevel;
                    console.log('🔄 Восстанавливаем lastCheckedLevel на:', oldLevel, 'новый уровень:', appState.progress.level);
                    
                    // Achievement checks removed
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    updateProgressDisplay();
                    generateCalendar();
                    updateDayActivity();
                    renderWeeklyChart();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    
                    // Обновляем недельный прогресс с учетом текущего просмотра
                    updateProgressWeekSection();
                    
                    updateMonthlyProgressSection();
                    
                    // Show task completion notification immediately
                    showTaskCompletionNotification(task, customXP);
                    
                    // Delay star notifications to ensure modal is closed
                    safeSetTimeout(() => {
                        updateWeeklyStars();
                    }, 1000); // 1 second delay to ensure modal is closed
                    
                    // Update achievements bank
                    updateAchievementsBank();
                    
                    // Show completion notification
                    const isToday = formatDate(completionDate) === formatDate(new Date());
                    const dateStr = isToday ? 'сегодня' : completionDate.toLocaleDateString('ru-RU');
                    showNotification(`Задание выполнено ${dateStr}! +${customXP} XP`, "success");
                    
                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Задание выполнено, показатели обновлены');
                    console.log('   - Получено XP:', customXP);
                    console.log('   - Затрачено времени:', customTime);
                    console.log('   - Дата выполнения:', activityDate);
                    console.log('   - Новый общий XP:', appState.progress.totalXP);
                    console.log('   - Новый уровень:', appState.progress.level);
                    console.log('   - XP за неделю:', appState.progress.weeklyXP);
                    console.log('   - Лучшая неделя:', appState.progress.bestWeekXP);
                    
                    // Обновляем отображение времени обучения
                    updateLearningTimeDisplay();
                    
                    // Автоматически сохраняем в Firebase после выполнения задания
                    // Увеличиваем задержку, чтобы уведомления о звездах успели показаться
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 3000); // 3 секунды вместо 1

                    taskElement.classList.remove("task-completed");
                }, 100);
            }

            function addTask(event) {
                event.preventDefault();

                return safeExecute(() => {
                    // Проверяем роль пользователя
                    if (appState.role === 'viewer') {
                        showNotification('Режим просмотра: добавление заданий недоступно', 'warning');
                        return;
                    }

                    const name = document.getElementById("taskName").value;
                    const description =
                        document.getElementById("taskDescription").value;
                    let xpReward = parseInt(
                        document.getElementById("taskXP").value, 10
                    );
                    let duration = parseInt(
                        document.getElementById("taskDuration").value, 10
                    );

                    // Валидация данных
                    const taskData = { name, xpReward, duration };
                    validateTaskData(taskData);

                // Если поле Название задания содержит специальную команду очистки
                if (name.trim().toLowerCase() === 'очистить' || name.trim().toLowerCase() === 'clear') {
                    if (confirm('Очистить все сохраненные задания?')) {
                        console.log('🔄 Очищаем все задания через команду...');
                        
                        appState.tasks = [];
                        
                        console.log('🔄 Задания очищены, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                        
                        // 1. Пересчитываем весь прогресс с нуля (включая звезды)
                        recalculateAllProgress();
                        
                        // 2. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения
                        renderTasks();
                        updateProgressDisplay();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        updateAchievementsBank();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ Задания очищены через команду, показатели обновлены');
                        
                        showNotification('Все задания очищены! Все показатели пересчитаны.', 'success');
                        
                                            // Автоматически сохраняем в Firebase после очистки заданий
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
                    }
                    document.getElementById("taskForm").reset();
                    return;
                }

                if (Number.isNaN(xpReward)) xpReward = 50;
                if (Number.isNaN(duration)) duration = 15;
                xpReward = Math.min(500, Math.max(1, xpReward));
                duration = Math.min(500, Math.max(1, duration));

                const newTask = {
                    id: Date.now(),
                    name,
                    description,
                    xpReward,
                    duration,
                    icon: getSelectedIcon(),
                    category: "custom",
                };

                appState.tasks.push(newTask);
                
                console.log('🔄 Новое задание добавлено, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем весь прогресс с нуля (включая звезды)
                recalculateAllProgress();
                
                // 2. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                renderTasks();
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                updateAchievementsBank();
                
                                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Новое задание добавлено, показатели обновлены');
                    
                    hideTaskModal();
                    showNotification("Новое задание добавлено! Все показатели пересчитаны.", "success");
                    
                    // Автоматически сохраняем в Firebase после добавления задания
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);

                    // Reset form
                    document.getElementById("taskForm").reset();
                    renderWeeklyChart();
                }, 'addTask');
            }

            function addReward(event) {
                event.preventDefault();

                const starsCost = 3;
                const planned = appState.rewardPlan && appState.rewardPlan.description;
                if (!planned) {
                    showNotification('Сначала придумайте награду', 'warning');
                    return;
                }
                if ((appState.progress.starBank || 0) < starsCost) {
                    showNotification('Недостаточно звезд для получения награды!', 'error');
                    return;
                }

                const newReward = {
                    id: Date.now(),
                    description: planned,
                    starsUsed: starsCost,
                    redeemedAt: new Date(),
                };

                appState.rewards.push(newReward);
                appState.rewardPlan = { description: "" };

                // Show reward notification
                showRewardNotification(planned, starsCost);

                console.log('🔄 Награда получена, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем весь прогресс с нуля (включая звезды)
                recalculateAllProgress();
                
                // 2. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                renderRewards();
                updateProgressDisplay();
                updateWeeklyStars();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateAchievementsBank();
                
                                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Награда получена, показатели обновлены');
                    
                    hideRewardModal();
                    showNotification("Награда получена! Все показатели пересчитаны.", "success");
                    
                    // Автоматически сохраняем в Firebase после получения награды
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);

                // Reset form
                document.getElementById("rewardForm").reset();
            }

            function selectDate(dateStr) {
                console.log('🗓️ Выбрана дата:', dateStr);
                try {
                    appState.selectedDate = new Date(dateStr);
                    console.log('✅ Дата успешно установлена:', appState.selectedDate);
                    generateCalendar();
                    updateDayActivity();
                    // Автоматическое сохранение отключено
                    renderWeeklyChart();
                } catch (error) {
                    console.error('❌ Ошибка при выборе даты:', error, 'dateStr:', dateStr);
                }
            }

            function changeMonth(direction) {
                appState.currentMonth = new Date(
                    appState.currentMonth.getFullYear(),
                    appState.currentMonth.getMonth() + direction,
                    1,
                );
                generateCalendar();
                // Автоматическое сохранение отключено
                renderWeeklyChart();
            }

            // Icon Functions
            function populateIconSelector() {
                const selector = document.getElementById('iconSelector');
                if (!selector) return;
                
                selector.innerHTML = availableIcons.map((icon, index) => `
                    <div class="icon-option ${index === 0 ? 'selected' : ''}" 
                         onclick="selectIcon(${index})" 
                         title="${icon.name}"
                         data-icon="${icon.class}">
                        ${icon.class}
                    </div>
                `).join('');
            }

            function selectIcon(index) {
                // Remove selected class from all options
                document.querySelectorAll('.icon-option').forEach(option => {
                    option.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                const selectedOption = document.querySelectorAll('.icon-option')[index];
                if (selectedOption) {
                    selectedOption.classList.add('selected');
                }
            }

            function getSelectedIcon() {
                const selectedOption = document.querySelector('.icon-option.selected');
                return selectedOption ? selectedOption.getAttribute('data-icon') : '📚';
            }

            // Modal Functions
            function showTaskModal() {
                console.log('🔄 Показываем модальное окно заданий, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ МОДАЛЬНОГО ОКНА ЗАДАНИЙ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Модальное окно заданий показано, все показатели пересчитаны');
                
                // Автоматическое сохранение отключено при показе модального окна
                // saveDataToFirebase();
                
                document.getElementById("taskModal").classList.add("show");
                populateIconSelector(); // Populate icons when modal opens
            }

            function hideTaskModal() {
                document.getElementById("taskModal").classList.remove("show");
                // Reset icon selection to first icon
                safeSetTimeout(() => {
                    const firstIcon = document.querySelector('.icon-option');
                    if (firstIcon) {
                        document.querySelectorAll('.icon-option').forEach(option => {
                            option.classList.remove('selected');
                        });
                        firstIcon.classList.add('selected');
                    }
                }, 100);
            }

            // Edit Task Modal Functions
            function showEditTaskModal(taskId) {
                const task = appState.tasks.find(t => t.id === taskId);
                if (!task) {
                    showNotification('Задание не найдено', 'error');
                    return;
                }

                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: редактирование заданий недоступно', 'warning');
                    return;
                }

                // Заполняем форму данными задания
                document.getElementById('editTaskId').value = task.id;
                document.getElementById('editTaskName').value = task.name;
                document.getElementById('editTaskDescription').value = task.description;
                document.getElementById('editTaskXP').value = task.xpReward;
                document.getElementById('editTaskDuration').value = task.duration;

                // Заполняем селектор иконок и выбираем текущую
                populateEditIconSelector(task.icon);

                // Показываем модальное окно
                document.getElementById("editTaskModal").classList.add("show");
            }

            function hideEditTaskModal() {
                document.getElementById("editTaskModal").classList.remove("show");
                // Reset icon selection to first icon
                safeSetTimeout(() => {
                    const firstIcon = document.querySelector('#editIconSelector .icon-option');
                    if (firstIcon) {
                        document.querySelectorAll('#editIconSelector .icon-option').forEach(option => {
                            option.classList.remove('selected');
                        });
                        firstIcon.classList.add('selected');
                    }
                }, 100);
            }

            function populateEditIconSelector(selectedIcon) {
                const selector = document.getElementById('editIconSelector');
                if (!selector) return;
                
                selector.innerHTML = availableIcons.map((icon, index) => `
                    <div class="icon-option ${icon.class === selectedIcon ? 'selected' : ''}" 
                         onclick="selectEditIcon(${index})" 
                         title="${icon.name}"
                         data-icon="${icon.class}">
                        ${icon.class}
                    </div>
                `).join('');
            }

            function selectEditIcon(index) {
                // Remove selected class from all options
                document.querySelectorAll('#editIconSelector .icon-option').forEach(option => {
                    option.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                const selectedOption = document.querySelectorAll('#editIconSelector .icon-option')[index];
                if (selectedOption) {
                    selectedOption.classList.add('selected');
                }
            }

            function getSelectedEditIcon() {
                const selectedOption = document.querySelector('#editIconSelector .icon-option.selected');
                return selectedOption ? selectedOption.getAttribute('data-icon') : '📚';
            }

            function editTask(taskId) {
                showEditTaskModal(taskId);
            }

            function updateTask(event) {
                event.preventDefault();

                const taskId = parseInt(document.getElementById('editTaskId').value);
                const task = appState.tasks.find(t => t.id === taskId);
                
                if (!task) {
                    showNotification('Задание не найдено', 'error');
                    return;
                }

                const name = document.getElementById('editTaskName').value;
                const description = document.getElementById('editTaskDescription').value;
                let xpReward = parseInt(document.getElementById('editTaskXP').value, 10);
                let duration = parseInt(document.getElementById('editTaskDuration').value, 10);

                if (Number.isNaN(xpReward)) xpReward = 50;
                if (Number.isNaN(duration)) duration = 15;
                xpReward = Math.min(500, Math.max(1, xpReward));
                duration = Math.min(500, Math.max(1, duration));

                // Обновляем задание
                task.name = name;
                task.description = description;
                task.xpReward = xpReward;
                task.duration = duration;
                task.icon = getSelectedEditIcon();

                console.log('🔄 Задание обновлено, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем весь прогресс с нуля (включая звезды)
                recalculateAllProgress();
                
                // 2. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                renderTasks();
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                updateLearningTimeDisplay();
                updateAchievementsBank();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Задание обновлено, показатели пересчитаны');
                
                hideEditTaskModal();
                showNotification("Задание обновлено! Все показатели пересчитаны.", "success");
                
                // Автоматически сохраняем в Firebase после обновления задания
                safeSetTimeout(() => {
                    saveDataToFirebaseSilent();
                }, 1000);
            }

            function showRewardModal() {
                updateRedeemControls();
                if (!appState.rewardPlan || !appState.rewardPlan.description) {
                    // Если награда не запланирована — сразу просим придумать
                    showIdeaModal();
                    return;
                }
                if ((appState.progress.starBank || 0) < 3) {
                    showNotification('Недостаточно звезд (нужно 3 ⭐)', 'info');
                }
                const planned = document.getElementById('plannedRewardDisplay');
                if (planned) planned.textContent = appState.rewardPlan.description || '—';
                const availableStarsEl = document.getElementById('availableStars');
                if (availableStarsEl) availableStarsEl.textContent = `${appState.progress.starBank || 0} ⭐`;
                const confirmBtn = document.getElementById('confirmRedeemBtn');
                if (confirmBtn) confirmBtn.disabled = (appState.progress.starBank || 0) < 3;
                
                console.log('🔄 Показываем модальное окно наград, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ МОДАЛЬНОГО ОКНА НАГРАД
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Модальное окно наград показано, все показатели пересчитаны');
                
                // Автоматическое сохранение отключено при показе модального окна
                // saveDataToFirebase();
                
                document.getElementById("rewardModal").classList.add("show");
            }
            // Idea Modal
            function showIdeaModal() {
                // Блокируем повторное придумывание, если уже есть запланированная награда
                if (appState.rewardPlan && appState.rewardPlan.description) {
                    showNotification('Награда уже запланирована. Сначала получите её, чтобы придумать новую.', 'info');
                    return;
                }
                console.log('🔄 Показываем модальное окно идей, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ МОДАЛЬНОГО ОКНА ИДЕЙ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Модальное окно идей показано, все показатели пересчитаны');
                
                // Автоматическое сохранение отключено при показе модального окна
                // saveDataToFirebase();
                
                document.getElementById('ideaModal').classList.add('show');
                const input = document.getElementById('ideaDescription');
                if (input) {
                    renderIdeaSuggestions(input.value || '');
                    input.focus();
                }
            }
            function hideIdeaModal() {
                document.getElementById('ideaModal').classList.remove('show');
                const box = document.getElementById('ideaAutocomplete');
                if (box) { box.style.display = 'none'; box.innerHTML = ''; }
            }
            function saveRewardIdea(event) {
                event.preventDefault();
                const desc = document.getElementById('ideaDescription').value.trim();
                if (!desc) return;
                const cmd = desc.toLowerCase();
                if (cmd === 'очистить' || cmd === 'clear') {
                    if (confirm('Удалить ВСЕ сохраненные награды?')) {
                        console.log('🔄 Очищаем все награды через команду...');
                        
                        appState.rewards = [];
                        
                        console.log('🔄 Награды очищены, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                        
                        // 1. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения
                        renderRewards();
                        updateProgressDisplay();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ Награды очищены через команду, показатели обновлены');
                        
                        showNotification('Все награды очищены! Все показатели пересчитаны.', 'success');
                        
                                            // Автоматически сохраняем в Firebase после очистки наград
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
                        
                        saveState();
                    }
                    document.getElementById('ideaForm').reset();
                    hideIdeaModal();
                    updateRedeemControls();
                    return;
                }
                appState.rewardPlan = { description: desc };
                addIdea(desc);
                
                console.log('🔄 Идея награды сохранена, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Идея награды сохранена, показатели обновлены');
                
                hideIdeaModal();
                showNotification('Награда сохранена! Все показатели пересчитаны.', 'success');
                
                                    // Автоматически сохраняем в Firebase после сохранения идеи награды
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
                
                saveState();
                document.getElementById('ideaForm').reset();
            }

            function hideRewardModal() {
                document.getElementById("rewardModal").classList.remove("show");
            }

            // Check device type and capabilities
            function checkDeviceCapabilities() {
                const userAgent = navigator.userAgent;
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
                const isIOS = /iPad|iPhone|iPod/.test(userAgent);
                const isAndroid = /Android/.test(userAgent);
                
                console.log('📱 Информация об устройстве:');
                console.log('   - User Agent:', userAgent);
                console.log('   - Мобильное устройство:', isMobile);
                console.log('   - iOS:', isIOS);
                console.log('   - Android:', isAndroid);
                console.log('   - Онлайн:', navigator.onLine);
                console.log('   - Cookie enabled:', navigator.cookieEnabled);
                
                // Проверяем localStorage
                try {
                    const testKey = 'device-test';
                    const testValue = 'test-value-' + Date.now();
                    localStorage.setItem(testKey, testValue);
                    const retrievedValue = localStorage.getItem(testKey);
                    localStorage.removeItem(testKey);
                    
                    if (retrievedValue === testValue) {
                        console.log('✅ localStorage работает корректно');
                    } else {
                        console.error('❌ localStorage работает некорректно');
                    }
                } catch (error) {
                    console.error('❌ Ошибка тестирования localStorage:', error);
                }
                
                return { isMobile, isIOS, isAndroid };
            }

            // Initialize Application
            function initApp() {
                console.log('🚀 Инициализация приложения...');
                
                // Проверяем возможности устройства
                const deviceInfo = checkDeviceCapabilities();
                
                // Сначала загружаем базовое состояние из localStorage
                loadLocalState();
                
                // ПРИНУДИТЕЛЬНО сбрасываем верификацию при каждом запуске
                appState.isVerified = false;
                console.log('🔒 Сброс верификации при запуске приложения');
                
                // Проверяем, есть ли сохраненный пользователь
                const savedUserName = localStorage.getItem('current-user');
                if (savedUserName && (savedUserName === 'Михаил' || savedUserName === 'Admin')) {
                    appState.userName = savedUserName;
                    console.log(`👤 Восстановлен пользователь: ${savedUserName}`);
                }
                
                // Устанавливаем базовые значения по умолчанию
                ensureWeeklyReset();
                
                console.log('🔄 Инициализация приложения, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПРИ ИНИЦИАЛИЗАЦИИ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Добавляем демо-активность только если её нет
                const hasAnyActivity = Object.keys(appState.activityData || {}).length > 0;
                if (!hasAnyActivity) {
                    if (!appState.resetDate) appState.resetDate = new Date();
                    const today = formatDate(new Date());
                    const yesterday = formatDate(new Date(Date.now() - 86400000));

                    appState.activityData[today] = [
                        {
                            taskId: 1,
                            taskName: "Изучение новых слов",
                            xpEarned: 50,
                            timeSpent: 15,
                            completedAt: new Date(),
                        },
                    ];

                    appState.activityData[yesterday] = [
                        {
                            taskId: 2,
                            taskName: "Грамматические упражнения",
                            xpEarned: 75,
                            timeSpent: 20,
                            completedAt: new Date(Date.now() - 86400000),
                        },
                        {
                            taskId: 3,
                            taskName: "Аудирование",
                            xpEarned: 60,
                            timeSpent: 25,
                            completedAt: new Date(Date.now() - 86400000),
                        },
                    ];
                    
                    console.log('✅ Демо-активность добавлена');
                }
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Инициализация завершена, все показатели пересчитаны');
                
                // Обновляем отображение времени обучения
                updateLearningTimeDisplay();
                
                // Обновляем банк достижений
                updateAchievementsBank();
                
                // Обновляем банк наград
                updateRewardsBank();
                
                // Автоматическое сохранение отключено при инициализации
                // saveDataToFirebase();

                // Устанавливаем роль по умолчанию
                if (!appState.role) appState.role = 'viewer';
                
                // Инициализируем пустые PIN-коды (они загружаются только из Firebase)
                if (!appState.pinCodes) {
                    appState.pinCodes = {};
                    console.log('🔑 PIN-коды инициализированы как пустые (загрузка только из Firebase)');
                }
                
                // Инициализируем bestWeekXP
                if (!appState.progress) {
                    appState.progress = {};
                }
                if (typeof appState.progress.bestWeekXP === 'undefined') {
                    appState.progress.bestWeekXP = 0;
                    console.log('🏆 bestWeekXP инициализирован в initApp');
                }
                
                console.log('🔐 Состояние PIN-кодов при инициализации:', appState.pinCodes);
                console.log('👤 Текущий пользователь:', appState.userName);
                console.log('🔍 PIN-коды будут загружены из Firebase');
                
                // НЕ показываем верификацию сразу - ждем завершения синхронизации
                console.log('⏳ Ожидаем завершения синхронизации перед показом верификации...');
                
                // Показываем индикатор загрузки
                showSyncStatus('syncing', 'Загружаем данные...');
                
                // Функция для показа верификации после синхронизации
                const showVerificationAfterSync = () => {
                    console.log('🔐 Проверяем PIN-коды после синхронизации...');
                    
                    // Проверяем, загружены ли PIN-коды из Firebase
                    if (Object.keys(appState.pinCodes).length === 0) {
                        console.log('❌ PIN-коды не загружены из Firebase');
                        showNotification('PIN-коды не загружены. Проверьте интернет-соединение.', 'error');
                        
                        // Показываем выбор учетной записи, если PIN-коды не загружены
                        showAccountSelection();
                        return;
                    }
                    
                    // Проверяем, есть ли у пользователя PIN-код
                    const hasPin = appState.pinCodes[appState.userName];
                    console.log(`🔐 Результат проверки PIN-кода для ${appState.userName}:`, hasPin ? 'найден' : 'не найден');
                    
                    if (hasPin) {
                        // Если PIN-код есть, показываем верификацию
                        console.log('🔐 PIN-код найден, показываем верификацию');
                        
                        console.log('🔄 Показываем верификацию, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ ВЕРИФИКАЦИИ
                        
                        // 1. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения безопасно
                        safeUpdateUI();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ Верификация показана, все показатели пересчитаны');
                        
                        // Обновляем отображение времени обучения
                        updateLearningTimeDisplay();
                        
                        // Применяем роли для правильного отображения блоков настроек
                        applyRolePermissions();
                        
                        // Восстанавливаем состояние блоков (все свернуты по умолчанию)
                        restoreSettingsBlocksState();
                        
                        // Автоматическое сохранение отключено при показе верификации
                        // saveDataToFirebase();
                        
                        showVerificationModal();
                    } else {
                        // Если PIN-кода нет, показываем выбор учетной записи
                        console.log('👤 PIN-код не найден, показываем выбор учетной записи');
                        
                        // Автоматическое сохранение отключено при показе выбора учетной записи
                        // saveDataToFirebase();
                        
                        showAccountSelection();
                    }
                };

                console.log('🔄 Обновляем UI после инициализации...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ И ОБНОВЛЕНИЕ UI
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                renderTasks();
                renderRewards();
                generateCalendar();
                updateDayActivity();
                renderWeeklyChart();
                updateRedeemControls();
                updateBestWeekDisplay();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                populateIconSelector();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ UI обновлен, все показатели пересчитаны');
                
                // Обновляем отображение времени обучения
                updateLearningTimeDisplay();
                
                // Применяем роли для правильного отображения блоков настроек
                applyRolePermissions();
                
                // Автоматическое сохранение отключено при обновлении UI
                // saveDataToFirebase();
                
                // Добавляем обработчики для кнопок Firebase
                const testFirebaseBtn = document.getElementById('testFirebaseBtn');
                if (testFirebaseBtn) {
                    testFirebaseBtn.addEventListener('click', testFirebaseConnection);
                }
                
                console.log('✅ Приложение инициализировано');
                
                // Устанавливаем флаг завершения инициализации
                appState.isInitializing = false;
                
                // Восстанавливаем состояние блоков настроек
                restoreSettingsBlocksState();
                
                // Инициализируем статус синхронизации
                updateSyncStatus();
                
                // Проверяем, нужна ли первичная синхронизация (с задержкой, чтобы не мешать загрузке PIN-кодов)
                safeSetTimeout(() => {
                    checkFirstTimeSync();
                }, 1000);
                
                // Резервный таймаут - если что-то пошло не так, показываем верификацию через 10 секунд
                const fallbackTimeout = safeSetTimeout(() => {
                    console.log('⏰ Резервный таймаут: показываем верификацию принудительно...');
                    showSyncStatus('error', 'Принудительный запуск');
                    showVerificationAfterSync();
                }, 10000);
                
                // Загружаем PIN-коды из Firebase при запуске
                if (navigator.onLine && isFirebaseAvailable()) {
                    console.log('🔄 Загружаем PIN-коды из Firebase...');
                    
                    loadPinCodesFromFirebase().then(success => {
                        if (success) {
                            console.log('✅ PIN-коды загружены из Firebase');
                        } else {
                            console.log('🔑 PIN-коды не найдены в Firebase');
                        }
                        
                        // ПОСЛЕ загрузки из Firebase показываем верификацию
                        console.log('🔄 Firebase синхронизация завершена, показываем верификацию...');
                        clearTimeout(fallbackTimeout); // Отменяем резервный таймаут
                        showSyncStatus('success', 'Данные загружены');
                        showVerificationAfterSync();
                    }).catch(error => {
                        console.log('❌ Ошибка загрузки PIN-кодов из Firebase:', error);
                        
                        // Даже при ошибке показываем верификацию
                        console.log('🔄 Firebase синхронизация не удалась, показываем верификацию...');
                        clearTimeout(fallbackTimeout); // Отменяем резервный таймаут
                        showSyncStatus('error', 'Ошибка синхронизации');
                        showVerificationAfterSync();
                    });
                } else {
                    // Если Firebase недоступен, показываем верификацию сразу
                    console.log('🔄 Firebase недоступен, показываем верификацию...');
                    clearTimeout(fallbackTimeout); // Отменяем резервный таймаут
                    showSyncStatus('offline', 'Офлайн режим');
                    showVerificationAfterSync();
                }

                // Добавляем слушатель изменения размера окна для адаптивности
                window.addEventListener('resize', handleResize);
            }

            // Delete Task Function
            function deleteTask(taskId) {
                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: удаление заданий недоступно', 'warning');
                    return;
                }
                
                if (confirm('Вы уверены, что хотите удалить это задание?')) {
                    console.log('🔄 Удаляем задание...');
                    
                    appState.tasks = appState.tasks.filter(task => task.id !== taskId);
                    
                    console.log('🔄 Задание удалено, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                    
                    // 1. Пересчитываем весь прогресс с нуля (включая звезды)
                    recalculateAllProgress();
                    
                    // 2. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    renderTasks();
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    updateAchievementsBank();
                    
                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Задание удалено, показатели обновлены');
                    
                    showNotification('Задание удалено! Все показатели пересчитаны.', 'success');
                    
                    // Автоматически сохраняем в Firebase после удаления задания
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
                }
            }

            // Delete Activity Function with full state recalculation
            function deleteActivity(dateStr, index) {
                if (appState.role === 'viewer') { 
                    showNotification('Режим просмотра: удаление активности недоступно', 'warning'); 
                    return; 
                }
                if (!confirm('Удалить эту запись активности? Это повлияет на ваш прогресс.')) {
                    return;
                }

                console.log('🔄 Удаляем запись активности...');
                
                const activity = appState.activityData[dateStr];
                if (!activity || !activity[index]) return;

                const deletedLog = activity[index];
                const deletedXP = deletedLog.xpEarned;

                // Remove the activity log
                activity.splice(index, 1);
                if (activity.length === 0) {
                    delete appState.activityData[dateStr];
                }

                console.log('🔄 Активность удалена, пересчитываем все показатели...');

                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем весь прогресс с нуля
                recalculateAllProgress();

                // 2. Пересчитываем лучшую неделю
                recalculateBestWeek();

                // 3. Обновляем все отображения
                updateProgressDisplay();
                generateCalendar();
                updateDayActivity();
                renderWeeklyChart();
                updateRedeemControls();
                
                // 4. Принудительно обновляем отображение лучшей недели
                updateBestWeekDisplay();
                
                // 5. Обновляем недельную и месячную секции
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                
                // 6. Обновляем звезды
                updateWeeklyStars();
                
                // 7. Обновляем банк достижений
                updateAchievementsBank();
                
                // 8. Проверяем, что все показатели обновлены
                console.log('✅ Активность удалена, все показатели пересчитаны');
                console.log('   - Удалено XP:', deletedXP);
                console.log('   - Новый общий XP:', appState.progress.totalXP);
                console.log('   - Новый уровень:', appState.progress.level);
                console.log('   - XP за неделю:', appState.progress.weeklyXP);
                console.log('   - Лучшая неделя:', appState.progress.bestWeekXP);

                                    // Автоматически сохраняем в Firebase после удаления активности
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);

                showNotification(`Активность удалена (-${deletedXP} XP)! Все показатели пересчитаны.`, 'success');
            }

            // Test function to verify weekly calculations
            function testWeeklyCalculations() {
                console.log('🧪 Тестирование недельных расчетов...');
                
                // Test getWeekStartKey
                const testDates = [
                    new Date('2025-01-15'), // Wednesday
                    new Date('2025-01-13'), // Monday
                    new Date('2025-01-19'), // Sunday
                ];
                
                testDates.forEach(date => {
                    const weekStart = getWeekStartKey(date);
                    console.log(`📅 ${date.toLocaleDateString('ru-RU')} (${['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'][date.getDay()]}) -> неделя начинается: ${weekStart}`);
                });
                
                // Test weekly data calculation
                const dates = Object.keys(appState.activityData).sort();
                console.log('📊 Все даты активностей:', dates);
                
                const weeklyData = {};
                dates.forEach(dateStr => {
                    const logs = appState.activityData[dateStr];
                    if (!Array.isArray(logs)) return;
                    
                    const dayXP = logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                    const weekKey = getWeekStartKey(new Date(dateStr));
                    
                    if (!weeklyData[weekKey]) weeklyData[weekKey] = { xp: 0, tasks: 0 };
                    weeklyData[weekKey].xp += dayXP;
                    weeklyData[weekKey].tasks += logs.length;
                    
                    console.log(`📈 ${dateStr}: ${dayXP} XP -> неделя ${weekKey} (всего: ${weeklyData[weekKey].xp} XP)`);
                });
                
                console.log('📊 Итоговые недельные данные:', weeklyData);
                
                // Test current week
                const currentWeekKey = getWeekStartKey(new Date());
                console.log(`📅 Текущая неделя: ${currentWeekKey}`);
                console.log(`📈 XP за текущую неделю: ${weeklyData[currentWeekKey]?.xp || 0}`);
            }

            // Test function for cross-week scenarios
            function testCrossWeekScenarios() {
                console.log('🧪 Тестирование межнедельных сценариев...');
                
                // Test current week calculation
                const currentWeekKey = getWeekStartKey(new Date());
                const currentWeekXP = computeWeekXP(new Date(currentWeekKey));
                console.log(`📅 Текущая неделя (${currentWeekKey}): ${currentWeekXP} XP`);
                
                // Test previous week calculation
                const prevWeek = new Date(currentWeekKey);
                prevWeek.setDate(prevWeek.getDate() - 7);
                const prevWeekKey = formatDate(prevWeek);
                const prevWeekXP = computeWeekXP(prevWeek);
                console.log(`📅 Предыдущая неделя (${prevWeekKey}): ${prevWeekXP} XP`);
                
                // Test next week calculation
                const nextWeek = new Date(currentWeekKey);
                nextWeek.setDate(nextWeek.getDate() + 7);
                const nextWeekKey = formatDate(nextWeek);
                const nextWeekXP = computeWeekXP(nextWeek);
                console.log(`📅 Следующая неделя (${nextWeekKey}): ${nextWeekXP} XP`);
                
                // Test weekly progress display
                console.log(`📊 Отображаемый недельный прогресс: ${appState.progress.weeklyXP} XP`);
                console.log(`📊 Звезды за неделю: ${appState.progress.weeklyStars}`);
                console.log(`📊 Банк звезд: ${appState.progress.starBank}`);
                
                // Test best week
                console.log(`🏆 Лучшая неделя: ${appState.progress.bestWeekXP} XP`);
            }

            // Recalculate all progress from activity data
            function recalculateAllProgress() {
                // Reset progress to base values
                appState.progress.totalXP = 0;
                appState.progress.level = 1;
                appState.progress.currentLevelXP = 0;
                appState.progress.weeklyXP = 0;
                appState.progress.weeklyStars = 0;
                appState.progress.starBank = 0;
                appState.progress.lastCheckedLevel = 0; // Сбрасываем счетчик достижений

                // Get all activity dates sorted chronologically
                const dates = Object.keys(appState.activityData).sort();
                
                // Track weekly progress by week start key
                const weeklyData = {};
                let totalXP = 0;

                for (const dateStr of dates) {
                    const logs = appState.activityData[dateStr];
                    if (!Array.isArray(logs)) continue;

                    const dayXP = logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                    totalXP += dayXP;

                    // Track weekly XP
                    const weekKey = getWeekStartKey(new Date(dateStr));
                    if (!weeklyData[weekKey]) weeklyData[weekKey] = { xp: 0, tasks: 0 };
                    weeklyData[weekKey].xp += dayXP;
                    weeklyData[weekKey].tasks += logs.length;
                }

                // Set total XP and calculate level
                appState.progress.totalXP = totalXP;
                
                // Calculate level from total XP (810 XP per level)
                const xpPerLevel = 810;
                appState.progress.level = Math.min(100, Math.floor(totalXP / xpPerLevel) + 1);
                appState.progress.currentLevelXP = totalXP % xpPerLevel;
                
                // If at max level, set currentLevelXP to 0
                if (appState.progress.level >= 100) {
                    appState.progress.level = 100;
                    appState.progress.currentLevelXP = 0;
                }

                // Calculate current week progress
                const currentWeekKey = getWeekStartKey(new Date());
                appState.progress.weeklyXP = weeklyData[currentWeekKey] ? weeklyData[currentWeekKey].xp : 0;
                appState.progress.weekStartKey = currentWeekKey;

                // Calculate stars earned this week and transfer to star bank
                const weeklyStars = calculateWeeklyStars(appState.progress.weeklyXP);
                appState.progress.weeklyStars = weeklyStars;

                // Calculate total star bank from all weeks
                let totalStars = 0;
                for (const weekKey in weeklyData) {
                    const weekXP = weeklyData[weekKey].xp;
                    totalStars += calculateWeeklyStars(weekXP);
                }
                
                // Calculate total stars spent on rewards
                const totalStarsSpent = appState.rewards.reduce((sum, reward) => sum + (reward.starsUsed || 0), 0);
                appState.progress.starBank = Math.max(0, totalStars - totalStarsSpent);
                
                // Сохраняем недельные данные для пересчета лучшей недели
                appState.weeklyData = weeklyData;
                
                // Обновляем lastCheckedLevel для корректной работы системы достижений
                appState.progress.lastCheckedLevel = appState.progress.level;
                
                console.log('🔄 Полный пересчет прогресса завершен, пересчитываем все показатели...');
                
                // Test weekly calculations for debugging
                testWeeklyCalculations();
                
                // Additional test for cross-week scenarios
                testCrossWeekScenarios();
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПОСЛЕ ПЕРЕСЧЕТА ПРОГРЕССА
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                updateAchievementsBank();
                
                                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Полный пересчет прогресса завершен, все показатели пересчитаны');
                    console.log('🔄 Недельные данные обновлены:', weeklyData);
                    console.log('🏆 Текущая неделя XP:', appState.progress.weeklyXP);
                    
                    // Автоматически сохраняем в Firebase после полного пересчета прогресса
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
            }

            function clearTasks() {
                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: очистка заданий недоступна', 'warning');
                    return;
                }
                
                if (confirm('Удалить ВСЕ сохраненные задания?')) {
                    console.log('🔄 Очищаем все задания...');
                    
                    appState.tasks = [];
                    
                    console.log('🔄 Задания очищены, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                    
                    // 1. Пересчитываем весь прогресс с нуля (включая звезды)
                    recalculateAllProgress();
                    
                    // 2. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    renderTasks();
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    updateAchievementsBank();
                    
                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Задания очищены, показатели обновлены');
                    
                    showNotification('Все задания удалены! Все показатели пересчитаны.', 'success');
                    
                    // Автоматически сохраняем в Firebase после очистки заданий
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
                }
            }

            // Settings Functions
            function toggleSettingsMenu() {
                const menu = document.getElementById('settingsMenu');
                const closeBtn = menu.querySelector('.settings-close-btn');
                
                if (menu.classList.contains('show')) {
                    // Закрываем меню
                    closeSettingsMenu();
                } else {
                    // Открываем меню
                    menu.classList.add('show');
                    const btn = document.querySelector('.settings-btn');
                    if (btn) btn.setAttribute('aria-expanded', 'true');
                    
                    // Анимация появления кнопки закрытия
                    if (closeBtn) {
                        closeBtn.style.animation = 'closeBtnAppear 0.5s ease-out';
                    }
                }
            }

            function closeSettingsMenu() {
                const menu = document.getElementById('settingsMenu');
                const closeBtn = menu.querySelector('.settings-close-btn');
                
                // Анимация исчезновения кнопки закрытия
                if (closeBtn) {
                    closeBtn.style.animation = 'closeBtnDisappear 0.3s ease-in forwards';
                }
                
                // Закрываем меню с небольшой задержкой для анимации
                safeSetTimeout(() => {
                    menu.classList.remove('show');
                    const btn = document.querySelector('.settings-btn');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                    
                    // Сбрасываем анимацию кнопки
                    if (closeBtn) {
                        closeBtn.style.animation = '';
                    }
                }, 200);
            }

            // Закрытие меню при клике вне его области
            document.addEventListener('click', function(event) {
                const menu = document.getElementById('settingsMenu');
                const settingsBtn = document.querySelector('.settings-btn');
                
                if (menu && menu.classList.contains('show')) {
                    // Если клик не по кнопке настроек и не по меню
                    if (!menu.contains(event.target) && !settingsBtn.contains(event.target)) {
                        closeSettingsMenu();
                    }
                }
            });

            // Закрытие меню по клавише Escape
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    const menu = document.getElementById('settingsMenu');
                    if (menu && menu.classList.contains('show')) {
                        closeSettingsMenu();
                    }
                    

                }
            });

            

            function applyStateFromBase64(b64) {
                try {
                    const json = decodeURIComponent(escape(atob(b64)));
                    const incoming = JSON.parse(json);
                    if (!incoming || !incoming.progress || !incoming.tasks) throw new Error('bad payload');
                    appState.progress = { ...appState.progress, ...incoming.progress };
                    appState.tasks = incoming.tasks || appState.tasks;
                    appState.rewards = incoming.rewards || [];
                    appState.activityData = incoming.activityData || {};
                    appState.rewardPlan = incoming.rewardPlan || { description: '' };
                    appState.resetDate = incoming.resetDate ? new Date(incoming.resetDate) : (appState.resetDate || new Date());
                    
                    // Сохраняем имя пользователя, если оно есть в импортируемых данных
                    if (incoming.userName) {
                        appState.userName = incoming.userName;
                    }
                    
                    console.log('🔄 Импорт данных завершен, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    updateProgressDisplay();
                    renderTasks();
                    renderRewards();
                    generateCalendar();
                    updateDayActivity();
                    renderWeeklyChart();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    
                    // 3. Принудительно обновляем отображение лучшей недели
                    updateBestWeekDisplay();
                    
                    // 4. Проверяем, что все показатели обновлены
                    console.log('✅ Импорт данных завершен, все показатели пересчитаны');
                    
                    // Обновляем отображение времени обучения
                    updateLearningTimeDisplay();
                    
                    showNotification('Состояние синхронизировано! Все показатели пересчитаны.', 'success');
                } catch (e) {
                    showNotification('Ошибка применения состояния', 'error');
                }
            }

            

            function openDriveHelp() {
                alert('Google Drive: используйте Экспорт для сохранения файла в приложение Drive, а затем на втором устройстве – Импорт, выбрав файл из Drive. Это офлайн-дружественный ручной способ.');
            }





            function exportData() {
                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: экспорт данных недоступен', 'warning');
                    return;
                }
                
                const dataToExport = {
                    // Основные данные приложения
                    progress: appState.progress,
                    tasks: appState.tasks,
                    rewards: appState.rewards,
                    activityData: appState.activityData,
                    rewardPlan: appState.rewardPlan,
                    resetDate: appState.resetDate,
                    
                    // Информация о пользователе
                    user: appState.user,
                    userName: appState.userName,
                    role: appState.role,
                    isVerified: appState.isVerified,
                    pinCodes: appState.pinCodes,
                    
                    // Настройки интерфейса
                    currentMonth: appState.currentMonth,
                    selectedDate: appState.selectedDate,
                    progressView: appState.progressView,
                    
                    // Метаданные экспорта
                    exportDate: new Date().toISOString(),
                    version: '1.1',
                    exportInfo: {
                        exportedBy: appState.userName,
                        exportRole: appState.role,
                        totalTasks: appState.tasks.length,
                        totalRewards: appState.rewards.length,
                        totalActivityDays: Object.keys(appState.activityData).length,
                        currentLevel: appState.progress.level,
                        totalXP: appState.progress.totalXP,
                        starBank: appState.progress.starBank
                    }
                };

                const dataStr = JSON.stringify(dataToExport, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                link.download = `english-learning-backup-${appState.userName}-${timestamp}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showNotification('Данные экспортированы успешно!', 'success');
                toggleSettingsMenu();
            }

            // File System Access API: save/load snapshots to a user-selected index file
            async function saveToFileIndex() {
                if (!('showSaveFilePicker' in window)) { showNotification('Браузер не поддерживает сохранение в файл-индекс', 'error'); return; }
                try {
                    const handle = await window.showSaveFilePicker({ suggestedName: 'english-learning-index.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
                    const existing = await readJsonFromHandle(handle, []);
                    const snapshot = buildSnapshot();
                    existing.push(snapshot);
                    await writeJsonToHandle(handle, existing);
                    showNotification('Слепок сохранен в файл-индекс', 'success');
                } catch (e) {
                    // user cancelled or error
                }
            }
            async function loadFromFileIndex() {
                if (!('showOpenFilePicker' in window)) { showNotification('Браузер не поддерживает загрузку из файл-индекса', 'error'); return; }
                try {
                    const [handle] = await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
                    const list = await readJsonFromHandle(handle, []);
                    if (!Array.isArray(list) || list.length === 0) { showNotification('Файл-индекс пуст', 'info'); return; }
                    renderSnapshotPicker(list, (snap) => { applyImportedSnapshot(snap); hideSnapshotPickerModal(); });
                } catch (e) {
                    // cancelled
                }
            }
            function buildSnapshot() {
                return {
                    id: Date.now(),
                    title: `Слепок от ${new Date().toLocaleString('ru-RU')}`,
                    createdAt: new Date().toISOString(),
                    data: {
                        progress: appState.progress,
                        tasks: appState.tasks,
                        rewards: appState.rewards,
                        activityData: appState.activityData,
                        rewardPlan: appState.rewardPlan,
                        resetDate: appState.resetDate,
                        userName: appState.userName,
                        pinCodes: appState.pinCodes,
                        version: '1.0'
                    }
                };
            }
            async function readJsonFromHandle(handle, fallback) {
                try { const file = await handle.getFile(); const text = await file.text(); return JSON.parse(text); } catch { return fallback; }
            }
            async function writeJsonToHandle(handle, obj) {
                const writable = await handle.createWritable();
                await writable.write(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
                await writable.close();
            }
            function renderSnapshotPicker(list, onPick) {
                const modal = document.getElementById('snapshotPickerModal');
                const box = document.getElementById('snapshotList');
                if (!modal || !box) return;
                box.innerHTML = list.slice().reverse().map(s => `
                    <div class=\"reward-card\" style=\"margin-bottom:8px;\">
                        <div class=\"rc-top\"><div class=\"reward-title\">${escapeHTML(s.title || ('Слепок #' + s.id))}</div><div class=\"reward-date-2\">${new Date(s.createdAt).toLocaleString('ru-RU')}</div></div>
                        <div style=\"display:flex; gap:8px; justify-content:flex-end; margin-top:6px;\">
                            <button class=\"btn btn-secondary\" data-id=\"${s.id}\">👁️ Просмотр</button>
                            <button class=\"btn btn-primary\" data-apply=\"${s.id}\">✅ Применить</button>
                        </div>
                    </div>
                `).join('');
                box.querySelectorAll('[data-apply]').forEach(btn => btn.addEventListener('click', () => {
                    const id = Number(btn.getAttribute('data-apply'));
                    const found = list.find(x => x.id === id);
                    if (found) onPick(found.data);
                }));
                box.querySelectorAll('[data-id]').forEach(btn => btn.addEventListener('click', () => {
                    const id = Number(btn.getAttribute('data-id'));
                    const found = list.find(x => x.id === id);
                    if (found) alert(JSON.stringify(found.data, null, 2));
                }));
                modal.classList.add('show');
            }
            function hideSnapshotPickerModal() { const m = document.getElementById('snapshotPickerModal'); if (m) m.classList.remove('show'); }
            function applyImportedSnapshot(importedData) {
                if (!importedData || !importedData.progress || !importedData.tasks) { showNotification('Некорректный слепок', 'error'); return; }
                appState.progress = { ...appState.progress, ...importedData.progress };
                appState.tasks = importedData.tasks || appState.tasks;
                appState.rewards = importedData.rewards || [];
                appState.activityData = importedData.activityData || {};
                appState.rewardPlan = importedData.rewardPlan || { description: '' };
                appState.resetDate = importedData.resetDate ? new Date(importedData.resetDate) : (appState.resetDate || new Date());
                if (importedData.userName) {
                    appState.userName = importedData.userName;
                }
                if (importedData.pinCodes) {
                    appState.pinCodes = { ...appState.pinCodes, ...importedData.pinCodes };
                }
                console.log('🔄 Слепок применен, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                renderTasks();
                renderRewards();
                generateCalendar();
                updateDayActivity();
                renderWeeklyChart();
                updateRedeemControls();
                updateBestWeekDisplay();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Слепок применен, все показатели пересчитаны');
                
                                        saveState();
                        showNotification('Слепок применен! Все показатели пересчитаны.', 'success');
                        
                                            // Автоматически сохраняем в Firebase после применения снимка
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
            }



            function loadExternalScript(src) {
                return new Promise((resolve, reject) => {
                    const s = document.createElement('script'); s.src = src; s.async = true; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
                });
            }

            function importData(event) {
                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: импорт данных недоступен', 'warning');
                    return;
                }
                
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        
                        // Validate imported data
                        if (!importedData.progress || !importedData.tasks) {
                            throw new Error('Недопустимый формат файла');
                        }

                        // Restore data
                        appState.progress = { ...appState.progress, ...importedData.progress };
                        appState.tasks = importedData.tasks || appState.tasks;
                        appState.rewards = importedData.rewards || [];
                        appState.activityData = importedData.activityData || {};
                        appState.rewardPlan = importedData.rewardPlan || { description: "" };
                        appState.resetDate = importedData.resetDate ? new Date(importedData.resetDate) : (appState.resetDate || new Date());
                        
                        // Сохраняем имя пользователя, если оно есть в импортируемых данных
                        if (importedData.userName) {
                            appState.userName = importedData.userName;
                        }
                        
                        // Сохраняем PIN-коды, если они есть в импортируемых данных
                        if (importedData.pinCodes) {
                            appState.pinCodes = { ...appState.pinCodes, ...importedData.pinCodes };
                        }

                        console.log('🔄 Импорт данных завершен, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                        
                        // 1. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения
                        updateProgressDisplay();
                        renderTasks();
                        renderRewards();
                        generateCalendar();
                        updateDayActivity();
                        renderWeeklyChart();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ Импорт данных завершен, все показатели пересчитаны');
                        
                        // Обновляем отображение времени обучения
                        updateLearningTimeDisplay();
                        
                        showNotification('Данные импортированы успешно! Все показатели пересчитаны.', 'success');
                        
                        // Автоматически сохраняем в Firebase после импорта данных
                        safeSetTimeout(() => {
                            saveDataToFirebaseSilent();
                        }, 1000);
                        
                        saveState();
                    } catch (error) {
                        showNotification('Ошибка при импорте данных: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
                
                // Reset file input
                event.target.value = '';
                toggleSettingsMenu();
            }

            function resetProgress() {
                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: сброс прогресса недоступен', 'warning');
                    return;
                }
                
                if (confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя отменить!')) {
                    console.log('🔄 Начинаем полный сброс прогресса...');
                    
                    // Полностью сбрасываем прогресс
                    appState.progress = {
                        level: 1,
                        totalXP: 0,
                        currentLevelXP: 0,
                        bestWeekXP: 0,
                        weeklyXP: 0,
                        weeklyStars: 0,
                        starBank: 0,
                        weekStartKey: getWeekStartKey(new Date()),
                        lastCheckedLevel: 0  // Сбрасываем счетчик достижений
                    };
                    
                    // Сбрасываем задания к начальным
                    appState.tasks = [
                        {
                            id: 1,
                            name: "Изучение новых слов",
                            description: "Выучить 10 новых английских слов",
                            xpReward: 50,
                            duration: 15,
                            icon: "📚",
                            category: "vocabulary",
                        },
                        {
                            id: 2,
                            name: "Грамматические упражнения",
                            description: "Выполнить упражнения на Present Simple",
                            xpReward: 75,
                            duration: 20,
                            icon: "✏️",
                            category: "grammar",
                        },
                        {
                            id: 3,
                            name: "Аудирование",
                            description: "Прослушать диалог и ответить на вопросы",
                            xpReward: 60,
                            duration: 25,
                            icon: "🎧",
                            category: "listening",
                        }
                    ];
                    
                    // Очищаем все награды и активность
                    appState.rewards = [];
                    appState.activityData = {};
                    appState.rewardPlan = { description: "" };
                    appState.resetDate = new Date();
                    
                    // Сбрасываем имя пользователя к значению по умолчанию
                    appState.userName = 'Михаил';
                    
                    // Сбрасываем PIN-коды
                    appState.pinCodes = {
                        'Михаил': null,
                        'Admin': null
                    };
                    
                    // Очищаем недельные данные
                    appState.weeklyData = {};
                    
                    // Сбрасываем представления
                    appState.progressView = { weekOffset: 0, monthOffset: 0 };
                    appState.currentMonth = new Date();
                    appState.selectedDate = new Date();

                    console.log('🔄 Прогресс сброшен, обновляем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                    
                    // 1. Пересчитываем лучшую неделю (должна быть 0)
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    updateProgressDisplay();
                    renderTasks();
                    renderRewards();
                    generateCalendar();
                    updateDayActivity();
                    renderWeeklyChart();
                    
                    // 3. Принудительно обновляем отображение лучшей недели
                    updateBestWeekDisplay();
                    
                    // 4. Обновляем элементы управления наградами
                    updateRedeemControls();
                    
                    // 5. Обновляем недельную секцию прогресса
                    updateProgressWeekSection();
                    
                    // 6. Обновляем месячную секцию прогресса
                    updateMonthlyProgressSection();
                    
                    // 7. Обновляем звезды
                    updateWeeklyStars();
                    
                    // 8. Сбрасываем неделю
                    ensureWeeklyReset();
                    
                    // 9. Обновляем отображение времени обучения
                    updateLearningTimeDisplay();
                    
                    // 10. Проверяем, что все показатели действительно сброшены
                    console.log('✅ Проверка сброса показателей:');
                    console.log('   - Уровень:', appState.progress.level);
                    console.log('   - Общий XP:', appState.progress.totalXP);
                    console.log('   - XP за неделю:', appState.progress.weeklyXP);
                    console.log('   - Лучшая неделя:', appState.progress.bestWeekXP);
                    console.log('   - Звезды за неделю:', appState.progress.weeklyStars);
                    console.log('   - Банк звезд:', appState.progress.starBank);
                    console.log('   - Активность:', Object.keys(appState.activityData).length, 'дней');
                    console.log('   - Награды:', appState.rewards.length);
                    console.log('   - Задания:', appState.tasks.length);

                    showNotification('Прогресс полностью сброшен! Все показатели обновлены.', 'success');
                    
                    // Автоматически сохраняем в Firebase после сброса прогресса
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
                }
                toggleSettingsMenu();
            }

            // Close modals and menus on outside click
            window.onclick = function (event) {
                const taskModal = document.getElementById("taskModal");
                const editTaskModal = document.getElementById("editTaskModal");
                const rewardModal = document.getElementById("rewardModal");
                const ideaModal = document.getElementById("ideaModal");

                const settingsMenu = document.getElementById("settingsMenu");

                if (event.target === taskModal) {
                    hideTaskModal();
                }
                if (event.target === editTaskModal) {
                    hideEditTaskModal();
                }
                if (event.target === rewardModal) {
                    hideRewardModal();
                }
                if (event.target === ideaModal) {
                    hideIdeaModal();
                }


                
                // Close settings menu if clicked outside
                if (!event.target.closest('.settings-panel')) {
                    settingsMenu.classList.remove('show');
                    const btn = document.querySelector('.settings-btn');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            };

            // Close menus/modals on Esc
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    hideTaskModal();
                    hideEditTaskModal();
                    hideRewardModal();
                    hideIdeaModal();


                    const menu = document.getElementById('settingsMenu');
                    if (menu) menu.classList.remove('show');
                    const btn = document.querySelector('.settings-btn');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            });

            // Initialize app when page loads (removed duplicate)










            function getBestWeekData() {
                const state = getEffectiveState();
                const weeklyData = state.weeklyData || {};
                
                let bestWeek = { xp: 0, date: '—', tasks: '—' };
                
                // Проверяем исторические данные
                Object.keys(weeklyData).forEach(weekKey => {
                    const week = weeklyData[weekKey];
                    if (week.xp > bestWeek.xp) {
                        bestWeek = {
                            xp: week.xp,
                            date: weekKey,
                            tasks: week.tasks || '—'
                        };
                    }
                });
                
                // Проверяем текущую неделю
                const currentWeekXP = state.progress.weeklyXP || 0;
                if (currentWeekXP > bestWeek.xp) {
                    bestWeek = {
                        xp: currentWeekXP,
                        date: 'Текущая неделя',
                        tasks: '—'
                    };
                }
                
                console.log('🏆 Данные лучшей недели:', bestWeek, 'Текущая неделя:', currentWeekXP);
                return bestWeek;
            }

            function updateBestWeekProgress() {
                const state = getEffectiveState();
                const currentWeekXP = state.progress.weeklyXP || 0;
                const currentBestWeek = state.progress.bestWeekXP || 0;
                
                console.log('🏆 Проверка лучшей недели:', { currentWeekXP, currentBestWeek });
                
                if (currentWeekXP > currentBestWeek) {
                    state.progress.bestWeekXP = currentWeekXP;
                    console.log('🏆 Новая лучшая неделя!', currentWeekXP, 'XP');
                    
                    console.log('🔄 Новая лучшая неделя, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПРИ НОВОЙ ЛУЧШЕЙ НЕДЕЛЕ
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    
                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ Новая лучшая неделя, все показатели пересчитаны');
                    
                    // Сохраняем состояние при обновлении лучшей недели
                    saveState();
                    
                    // Автоматическое сохранение отключено при изменении лучшей недели при инициализации
                    // saveDataToFirebase();
                } else {
                    console.log('🏆 Текущая неделя не превзошла лучшую:', currentWeekXP, '<=', currentBestWeek);
                    
                    // Всегда пересчитываем лучшую неделю для актуальности
                    recalculateBestWeek();
                    
                    // Принудительно обновляем отображение лучшей недели
                    updateBestWeekDisplay();
                }
            }
            
            // Функция для пересчета лучшей недели на основе всех данных
            function recalculateBestWeek() {
                const state = getEffectiveState();
                console.log('🔄 Пересчитываем лучшую неделю...');
                
                // Получаем текущий XP за неделю
                const currentWeekXP = state.progress.weeklyXP || 0;
                
                // Вычисляем XP по неделям на основе activityData
                const weeklyData = {};
                const activityData = state.activityData || {};
                
                // Группируем активность по неделям
                Object.keys(activityData).forEach(dateStr => {
                    const logs = activityData[dateStr];
                    if (Array.isArray(logs)) {
                        const weekKey = getWeekStartKey(new Date(dateStr));
                        if (!weeklyData[weekKey]) {
                            weeklyData[weekKey] = { xp: 0, tasks: 0 };
                        }
                        
                        const dayXP = logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                        weeklyData[weekKey].xp += dayXP;
                        weeklyData[weekKey].tasks += logs.length;
                    }
                });
                
                // Сохраняем недельные данные для использования в других местах
                state.weeklyData = weeklyData;
                
                let maxWeekXP = 0;
                let bestWeekKey = '';
                
                // Проверяем исторические недели
                Object.keys(weeklyData).forEach(weekKey => {
                    const week = weeklyData[weekKey];
                    if (week.xp > maxWeekXP) {
                        maxWeekXP = week.xp;
                        bestWeekKey = weekKey;
                    }
                });
                
                // Проверяем текущую неделю
                if (currentWeekXP > maxWeekXP) {
                    maxWeekXP = currentWeekXP;
                    bestWeekKey = 'current';
                }
                
                // Обновляем лучшую неделю
                const oldBestWeek = state.progress.bestWeekXP || 0;
                state.progress.bestWeekXP = maxWeekXP;
                
                console.log('🏆 Пересчет лучшей недели:', {
                    old: oldBestWeek,
                    new: maxWeekXP,
                    currentWeekXP: currentWeekXP,
                    bestWeek: bestWeekKey,
                    weeklyData: weeklyData,
                    historical: Object.keys(weeklyData).length
                });
                
                // Если значение изменилось, пересчитываем все показатели
                if (oldBestWeek !== maxWeekXP) {
                    console.log('🔄 Лучшая неделя изменилась, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПРИ ИЗМЕНЕНИИ ЛУЧШЕЙ НЕДЕЛИ
                    
                    // 1. Обновляем все отображения
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    
                    // 2. Проверяем, что все показатели обновлены
                    console.log('✅ Лучшая неделя обновлена, все показатели пересчитаны');
                    
                    // Сохраняем состояние
                    saveState();
                    console.log('💾 Состояние сохранено после пересчета лучшей недели');
                    
                    // Автоматическое сохранение отключено при изменении лучшей недели при инициализации
                    // saveDataToFirebase();
                }
                
                return maxWeekXP;
            }



















            // Function to check for new achievements
            function checkForNewAchievements() {
                const state = getEffectiveState();
                const currentLevel = state.progress.level;
                
                // Get last checked level from state
                const lastCheckedLevel = state.progress.lastCheckedLevel || 0;
                
                console.log('🏆 checkForNewAchievements called:', {
                    currentLevel,
                    lastCheckedLevel,
                    hasNewLevel: currentLevel > lastCheckedLevel,
                    totalXP: state.progress.totalXP
                });
                

                
                // Check if we have a new level
                if (currentLevel > lastCheckedLevel) {
                    console.log('🏆 Новый уровень обнаружен! Ищем достижение...');
                    
                    // Achievement notification removed
                    console.log('🏆 Достижение найдено для уровня:', currentLevel, 'но уведомление отключено');
                    
                    // Update last checked level
                    state.progress.lastCheckedLevel = currentLevel;
                    console.log('🏆 Обновлен lastCheckedLevel на:', currentLevel);
                } else {
                    console.log('🏆 Новых уровней не обнаружено');
                }
            }

            // Function to get achievement for specific level
            function getAchievementForLevel(level) {
                const achievements = [
                    // Уровни 1-5 (каждый уровень)
                    { level: 1, title: '🌱 Первые шаги', description: 'Новичок в изучении английского языка. Начало увлекательного путешествия!', icon: '🌱' },
                    { level: 2, title: '📚 Ученик', description: 'Осваиваете основы английского языка. Каждый день приносит новые знания!', icon: '📚' },
                    { level: 3, title: '🎯 Целеустремленный', description: 'Показываете стабильный прогресс в изучении языка. Продолжайте в том же духе!', icon: '🎯' },
                    { level: 4, title: '💪 Упорный', description: 'Демонстрируете настойчивость в изучении английского. Результат не заставит себя ждать!', icon: '💪' },
                    { level: 5, title: '⭐ Уверенный новичок', description: 'Преодолели первые трудности! Теперь вы уверенно чувствуете себя в основах языка.', icon: '⭐' },
                    
                    // Уровни каждые 5 (10, 15, 20, 25...)
                    { level: 10, title: '🚀 Активный изучающий', description: 'Достигли 10 уровня! Ваш английский становится все более уверенным.', icon: '🚀' },
                    { level: 15, title: '🎓 Уверенный пользователь', description: '15 уровень покорен! Вы можете уверенно общаться на базовые темы.', icon: '🎓' },
                    { level: 20, title: '🌟 Продвинутый ученик', description: '20 уровень! Ваши знания английского языка становятся глубокими и прочными.', icon: '🌟' },
                    { level: 25, title: '💎 Опытный знаток', description: 'Четверть пути пройдена! Вы владеете английским на хорошем уровне.', icon: '💎' },
                    { level: 30, title: '🏆 Мастер слова', description: '30 уровень! Ваш английский позволяет свободно выражать мысли.', icon: '🏆' },
                    { level: 35, title: '🎭 Лингвистический артист', description: '35 уровень! Вы владеете языком с художественной точностью.', icon: '🎭' },
                    { level: 40, title: '🧠 Языковой гений', description: '40 уровень! Ваше понимание английского языка поражает глубиной.', icon: '🧠' },
                    { level: 45, title: '👑 Король английского', description: '45 уровень! Вы достигли высот в изучении языка.', icon: '👑' },
                    { level: 50, title: '🎪 Половина пути к совершенству', description: '50 уровень! Половина пути пройдена. Вы на правильном пути к мастерству!', icon: '🎪' },
                    { level: 55, title: '🌟 Звезда лингвистики', description: '55 уровень! Ваши знания английского сияют ярко.', icon: '🌟' },
                    { level: 60, title: '🎯 Снайпер языка', description: '60 уровень! Вы попадаете в цель каждым словом.', icon: '🎯' },
                    { level: 65, title: '⚡ Молния в изучении', description: '65 уровень! Ваш прогресс молниеносен и впечатляющ.', icon: '⚡' },
                    { level: 70, title: '🔥 Огненный мастер', description: '70 уровень! Ваше владение языком пылает страстью и мастерством.', icon: '🔥' },
                    { level: 75, title: '🎨 Художник слова', description: '75 уровень! Вы создаете шедевры из английских слов.', icon: '🎨' },
                    { level: 80, title: '🏅 Чемпион английского', description: '80 уровень! Вы чемпион в изучении английского языка.', icon: '🏅' },
                    { level: 85, title: '🎪 Виртуоз языка', description: '85 уровень! Ваше владение английским виртуозно.', icon: '🎪' },
                    { level: 90, title: '👑 Император лингвистики', description: '90 уровень! Вы правите миром английского языка.', icon: '👑' },
                    { level: 95, title: '🌟 Божественный оратор', description: '95 уровень! Ваша речь божественно красива и точна.', icon: '🌟' },
                    { level: 100, title: '🏆 Богоподобный уровень', description: '100 уровень! Вы достигли богоподобного мастерства в английском языке!', icon: '🏆' }
                ];
                
                return achievements.find(a => a.level === level);
            }

            // Function to update achievements bank
            function updateAchievementsBank() {
                console.log('🏆 updateAchievementsBank called');
                const container = document.getElementById('achievementsBankContent');
                const state = getEffectiveState();
                const currentLevel = state.progress.level;
                
                console.log('Container element:', container);
                console.log('Current level:', currentLevel);
                
                if (!container) {
                    console.log('❌ Container not found!');
                    return;
                }
                
                // Get all achievements
                const allAchievements = [
                    // Уровни 1-5 (каждый уровень)
                    { level: 1, title: '🌱 Первые шаги', description: 'Новичок в изучении английского языка. Начало увлекательного путешествия!', icon: '🌱' },
                    { level: 2, title: '📚 Ученик', description: 'Осваиваете основы английского языка. Каждый день приносит новые знания!', icon: '📚' },
                    { level: 3, title: '🎯 Целеустремленный', description: 'Показываете стабильный прогресс в изучении языка. Продолжайте в том же духе!', icon: '🎯' },
                    { level: 4, title: '💪 Упорный', description: 'Демонстрируете настойчивость в изучении английского. Результат не заставит себя ждать!', icon: '💪' },
                    { level: 5, title: '⭐ Уверенный новичок', description: 'Преодолели первые трудности! Теперь вы уверенно чувствуете себя в основах языка.', icon: '⭐' },
                    
                    // Уровни каждые 5 (10, 15, 20, 25...)
                    { level: 10, title: '🚀 Активный изучающий', description: 'Достигли 10 уровня! Ваш английский становится все более уверенным.', icon: '🚀' },
                    { level: 15, title: '🎓 Уверенный пользователь', description: '15 уровень покорен! Вы можете уверенно общаться на базовые темы.', icon: '🎓' },
                    { level: 20, title: '🌟 Продвинутый ученик', description: '20 уровень! Ваши знания английского языка становятся глубокими и прочными.', icon: '🌟' },
                    { level: 25, title: '💎 Опытный знаток', description: 'Четверть пути пройдена! Вы владеете английским на хорошем уровне.', icon: '💎' },
                    { level: 30, title: '🏆 Мастер слова', description: '30 уровень! Ваш английский позволяет свободно выражать мысли.', icon: '🏆' },
                    { level: 35, title: '🎭 Лингвистический артист', description: '35 уровень! Вы владеете языком с художественной точностью.', icon: '🎭' },
                    { level: 40, title: '🧠 Языковой гений', description: '40 уровень! Ваше понимание английского языка поражает глубиной.', icon: '🧠' },
                    { level: 45, title: '👑 Король английского', description: '45 уровень! Вы достигли высот в изучении языка.', icon: '👑' },
                    { level: 50, title: '🎪 Половина пути к совершенству', description: '50 уровень! Половина пути пройдена. Вы на правильном пути к мастерству!', icon: '🎪' },
                    { level: 55, title: '🌟 Звезда лингвистики', description: '55 уровень! Ваши знания английского сияют ярко.', icon: '🌟' },
                    { level: 60, title: '🎯 Снайпер языка', description: '60 уровень! Вы попадаете в цель каждым словом.', icon: '🎯' },
                    { level: 65, title: '⚡ Молния в изучении', description: '65 уровень! Ваш прогресс молниеносен и впечатляющ.', icon: '⚡' },
                    { level: 70, title: '🔥 Огненный мастер', description: '70 уровень! Ваше владение языком пылает страстью и мастерством.', icon: '🔥' },
                    { level: 75, title: '🎨 Художник слова', description: '75 уровень! Вы создаете шедевры из английских слов.', icon: '🎨' },
                    { level: 80, title: '🏅 Чемпион английского', description: '80 уровень! Вы чемпион в изучении английского языка.', icon: '🏅' },
                    { level: 85, title: '🎪 Виртуоз языка', description: '85 уровень! Ваше владение английским виртуозно.', icon: '🎪' },
                    { level: 90, title: '👑 Император лингвистики', description: '90 уровень! Вы правите миром английского языка.', icon: '👑' },
                    { level: 95, title: '🌟 Божественный оратор', description: '95 уровень! Ваша речь божественно красива и точна.', icon: '🌟' },
                    { level: 100, title: '🏆 Богоподобный уровень', description: '100 уровень! Вы достигли богоподобного мастерства в английском языке!', icon: '🏆' }
                ];
                
                // Calculate statistics
                const achievedCount = allAchievements.filter(a => currentLevel >= a.level).length;
                const progressPercent = Math.round((currentLevel / 100) * 100);
                const currentStatus = getCurrentAchievementStatus(currentLevel);
                
                // Update summary
                document.getElementById('achievementsUnlocked').textContent = achievedCount;
                document.getElementById('achievementsProgress').textContent = `${progressPercent}%`;
                document.getElementById('currentAchievementLevel').textContent = currentStatus;
                
                // Render all achievements
                container.innerHTML = allAchievements.map(achievement => {
                    const achieved = currentLevel >= achievement.level;
                    return `
                        <div class="achievement-bank-item ${achieved ? 'achieved' : 'locked'}">
                            <div class="achievement-bank-icon">${achievement.icon}</div>
                            <div class="achievement-bank-content">
                                <div class="achievement-bank-title">${achievement.title}</div>
                                <div class="achievement-bank-level">Уровень ${achievement.level}</div>
                                <div class="achievement-bank-description">${achievement.description}</div>
                            </div>
                            <div class="achievement-bank-status">
                                ${achieved ? 
                                    '<span class="achievement-bank-status-achieved">✅ Получено</span>' : 
                                    `<span class="achievement-bank-status-locked">🔒 ${currentLevel}/${achievement.level}</span>`
                                }
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            // Function to get current achievement status
            function getCurrentAchievementStatus(level) {
                if (level >= 100) return 'Богоподобный';
                if (level >= 90) return 'Император';
                if (level >= 80) return 'Чемпион';
                if (level >= 70) return 'Мастер';
                if (level >= 60) return 'Эксперт';
                if (level >= 50) return 'Продвинутый';
                if (level >= 40) return 'Опытный';
                if (level >= 30) return 'Уверенный';
                if (level >= 20) return 'Развивающийся';
                if (level >= 10) return 'Активный';
                if (level >= 5) return 'Уверенный новичок';
                if (level >= 1) return 'Новичок';
                return 'Начинающий';
            }

            // Achievements Bank Panel Functions
            let currentSelectedLevel = 1;
            let achievementsBankExpanded = false;

            function toggleAchievementsBank() {
                console.log('🏆 toggleAchievementsBank called');
                const content = document.getElementById('achievementsBankPanelContent');
                const toggle = document.getElementById('achievementsBankToggle');
                
                console.log('Content element:', content);
                console.log('Toggle element:', toggle);
                console.log('Current expanded state:', achievementsBankExpanded);
                
                if (achievementsBankExpanded) {
                    content.style.display = 'none';
                    toggle.classList.remove('expanded');
                    achievementsBankExpanded = false;
                    console.log('🏆 Bank collapsed');
                } else {
                    // Update achievements bank content
                    console.log('🏆 Updating achievements bank content...');
                    updateAchievementsBank();
                    
                    content.style.display = 'block';
                    toggle.classList.add('expanded');
                    achievementsBankExpanded = true;
                    console.log('🏆 Bank expanded');
                }
            }

            // Rewards Bank Panel Functions
            let rewardsBankExpanded = false;

            function toggleRewardsBank() {
                console.log('🎁 toggleRewardsBank called');
                const content = document.getElementById('rewardsBankPanelContent');
                const toggle = document.getElementById('rewardsBankToggle');
                
                console.log('Content element:', content);
                console.log('Toggle element:', toggle);
                console.log('Current expanded state:', rewardsBankExpanded);
                
                if (rewardsBankExpanded) {
                    content.style.display = 'none';
                    toggle.classList.remove('expanded');
                    rewardsBankExpanded = false;
                    console.log('🎁 Rewards bank collapsed');
                } else {
                    // Update rewards bank content
                    console.log('🎁 Updating rewards bank content...');
                    updateRewardsBank();
                    
                    content.style.display = 'block';
                    toggle.classList.add('expanded');
                    rewardsBankExpanded = true;
                    console.log('🎁 Rewards bank expanded');
                    
                    // Отладочная информация после открытия панели
                    safeSetTimeout(() => {
                        const container = document.getElementById('rewardsBankContent');
                        if (container) {
                            console.log('After panel opened:', {
                                containerVisible: container.offsetParent !== null,
                                containerScrollHeight: container.scrollHeight,
                                containerClientHeight: container.clientHeight,
                                containerMaxHeight: window.getComputedStyle(container).maxHeight,
                                shouldShowScroll: container.scrollHeight > container.clientHeight
                            });
                        }
                    }, 100);
                }
            }



            // Simple test function to check if notifications work at all
            function testSimpleNotification() {
                console.log('🧪 Простой тест уведомления...');
                
                // Create a simple notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 99999;
                    background: red;
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    font-size: 20px;
                    font-weight: bold;
                `;
                notification.textContent = 'ТЕСТ УВЕДОМЛЕНИЯ';
                
                document.body.appendChild(notification);
                console.log('🧪 Простое уведомление добавлено в DOM');
                
                // Remove after 3 seconds
                safeSetTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                        console.log('🧪 Простое уведомление удалено');
                    }
                }, 3000);
            }



            // Test function to simulate task completion and star earning
            function testTaskCompletionWithStar() {
                console.log('🎯 Тестируем выполнение задания с получением звезды...');
                
                // Simulate earning enough XP for a star
                const testXP = 500; // Enough for 1 star
                appState.progress.weeklyXP = testXP;
                
                console.log('⭐ Принудительно обновляем звезды...');
                updateWeeklyStars();
            }



            // Test function to simulate level up and achievement
            function testLevelUpAchievement() {
                console.log('🎯 Тестируем повышение уровня и достижение...');
                
                // Simulate level up
                const oldLevel = appState.progress.level;
                appState.progress.level = 2;
                appState.progress.lastCheckedLevel = oldLevel;
                
                console.log('🏆 Проверяем новые достижения...');
                checkForNewAchievements();
            }

            // Test function to check achievement modal visibility
            function testAchievementModalVisibility() {
                console.log('🏆 ТЕСТ ВИДИМОСТИ МОДАЛЬНОГО ОКНА ДОСТИЖЕНИЯ');
                console.log('==========================================');
                
                // Создаем тестовое модальное окно
                const modalContent = `
                    <div class="achievement-modal-overlay" id="testAchievementModal">
                        <div class="achievement-modal-content">
                            <div class="achievement-modal-header">
                                <div class="achievement-modal-icon">🎉</div>
                                <h2 class="achievement-modal-title">ТЕСТ ВИДИМОСТИ</h2>
                            </div>
                            <div class="achievement-modal-body">
                                <div class="achievement-modal-achievement">
                                    <div class="achievement-modal-achievement-icon">🧪</div>
                                    <div class="achievement-modal-achievement-title">Тестовое достижение</div>
                                    <div class="achievement-modal-achievement-level">Уровень 1 достигнут!</div>
                                    <div class="achievement-modal-achievement-description">Это тест видимости модального окна</div>
                                </div>
                            </div>
                            <div class="achievement-modal-footer">
                                <button class="btn btn-primary" onclick="hideTestAchievementModal()">
                                    Отлично! 🎉
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalContent);
                console.log('🏆 Тестовое модальное окно добавлено в DOM');
                
                // Добавляем класс show
                safeSetTimeout(() => {
                    const modal = document.getElementById('testAchievementModal');
                    if (modal) {
                        modal.classList.add('show');
                        console.log('🏆 Класс show добавлен к модальному окну');
                        
                        // Проверяем computed styles
                        const computedStyle = window.getComputedStyle(modal);
                        console.log('🏆 Computed styles:', {
                            position: computedStyle.position,
                            zIndex: computedStyle.zIndex,
                            opacity: computedStyle.opacity,
                            visibility: computedStyle.visibility,
                            display: computedStyle.display
                        });
                    } else {
                        console.log('🏆 ОШИБКА: Модальное окно не найдено!');
                    }
                }, 100);
            }

            // Function to hide test achievement modal
            function hideTestAchievementModal() {
                const modal = document.getElementById('testAchievementModal');
                if (modal) {
                    modal.classList.remove('show');
                    safeSetTimeout(() => {
                        modal.remove();
                        console.log('🏆 Тестовое модальное окно удалено');
                    }, 300);
                }
            }

            // Function to fix achievements HTML
            function fixAchievementsHTML() {
                console.log('🏆 Исправляем HTML достижений...');
                
                const container = document.getElementById('achievementsBankContent');
                if (!container) {
                    console.log('❌ Container not found!');
                    return;
                }
                
                // Clear container completely
                container.innerHTML = '';
                
                // Re-render achievements
                updateAchievementsBank();
                
                console.log('🏆 HTML достижений исправлен');
            }

            // Function to force open rewards panel
            function forceOpenRewardsPanel() {
                console.log('🎁 Принудительно открываем панель наград...');
                
                const content = document.getElementById('rewardsBankPanelContent');
                const toggle = document.getElementById('rewardsBankToggle');
                
                if (content && toggle) {
                    content.style.display = 'block';
                    toggle.classList.add('expanded');
                    rewardsBankExpanded = true;
                    
                    // Update content
                    updateRewardsBank();
                    
                    console.log('🎁 Панель наград принудительно открыта');
                } else {
                    console.log('❌ Элементы панели наград не найдены');
                }
            }

            // Test function to check achievements HTML generation
            function testAchievementsHTML() {
                console.log('🏆 ТЕСТ ГЕНЕРАЦИИ HTML ДОСТИЖЕНИЙ');
                console.log('==================================');
                
                const container = document.getElementById('achievementsBankContent');
                if (!container) {
                    console.log('❌ Container not found!');
                    return;
                }
                
                // Test HTML generation
                const testAchievement = {
                    level: 1,
                    title: '🌱 Первые шаги',
                    description: 'Новичок в изучении английского языка.',
                    icon: '🌱'
                };
                
                const testHTML = `
                    <div class="achievement-bank-item achieved">
                        <div class="achievement-bank-icon">${testAchievement.icon}</div>
                        <div class="achievement-bank-content">
                            <div class="achievement-bank-title">${testAchievement.title}</div>
                            <div class="achievement-bank-level">Уровень ${testAchievement.level}</div>
                            <div class="achievement-bank-description">${testAchievement.description}</div>
                        </div>
                        <div class="achievement-bank-status">
                            <span class="achievement-bank-status-achieved">✅ Получено</span>
                        </div>
                    </div>
                `;
                
                console.log('Test HTML:', testHTML);
                
                // Clear container and add test HTML
                container.innerHTML = testHTML;
                
                console.log('Container innerHTML after test:', container.innerHTML);
                
                // Check for "flex" text
                if (container.innerHTML.includes('flex')) {
                    console.log('❌ Found "flex" text in HTML!');
                } else {
                    console.log('✅ No "flex" text found in HTML');
                }
            }

            // Test function to check rewards panel
            function testRewardsPanel() {
                console.log('🎁 ТЕСТ ПАНЕЛИ НАГРАД');
                console.log('====================');
                
                const content = document.getElementById('rewardsBankPanelContent');
                const toggle = document.getElementById('rewardsBankToggle');
                
                console.log('Content element:', content);
                console.log('Toggle element:', toggle);
                console.log('Current display style:', content ? content.style.display : 'element not found');
                console.log('Current expanded state:', rewardsBankExpanded);
                
                if (content) {
                    const computedStyle = window.getComputedStyle(content);
                    console.log('Computed display:', computedStyle.display);
                    console.log('Computed visibility:', computedStyle.visibility);
                }
                
                // Test toggle
                console.log('🎁 Тестируем переключение...');
                toggleRewardsBank();
                
                safeSetTimeout(() => {
                    console.log('After toggle - display style:', content.style.display);
                    console.log('After toggle - expanded state:', rewardsBankExpanded);
                }, 100);
            }

            // Test function to check notification visibility
            function testNotificationVisibility() {
                console.log('🔍 ТЕСТ ВИДИМОСТИ УВЕДОМЛЕНИЙ');
                console.log('================================');
                
                // 1. Проверяем CSS стили
                const testDiv = document.createElement('div');
                testDiv.style.cssText = `
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    z-index: 99999 !important;
                    background: red !important;
                    color: white !important;
                    padding: 20px !important;
                    border-radius: 10px !important;
                    font-size: 18px !important;
                    font-weight: bold !important;
                    pointer-events: auto !important;
                `;
                testDiv.textContent = 'ТЕСТ ВИДИМОСТИ - ВИДИТЕ ЛИ ВЫ ЭТО?';
                testDiv.id = 'visibilityTest';
                
                document.body.appendChild(testDiv);
                console.log('🔍 Тестовый элемент добавлен в DOM');
                
                // Проверяем computed styles
                const computedStyle = window.getComputedStyle(testDiv);
                console.log('🔍 Computed styles:', {
                    position: computedStyle.position,
                    zIndex: computedStyle.zIndex,
                    opacity: computedStyle.opacity,
                    transform: computedStyle.transform,
                    pointerEvents: computedStyle.pointerEvents
                });
                
                // Удаляем через 5 секунд
                safeSetTimeout(() => {
                    if (testDiv.parentNode) {
                        testDiv.parentNode.removeChild(testDiv);
                        console.log('🔍 Тестовый элемент удален');
                    }
                }, 5000);
            }

            // Test function to verify star system across all weeks
            function testStarSystemComprehensive() {
                console.log('⭐ ТЕСТ СИСТЕМЫ ЗВЕЗД - ПОЛНАЯ ПРОВЕРКА');
                console.log('=====================================');
                
                // 1. Проверяем текущее состояние
                console.log('📊 Текущее состояние:');
                console.log('- Общий XP:', appState.progress.totalXP);
                console.log('- Текущий уровень:', appState.progress.level);
                console.log('- Недельный XP:', appState.progress.weeklyXP);
                console.log('- Звезды за неделю:', appState.progress.weeklyStars);
                console.log('- Банк звезд:', appState.progress.starBank);
                
                // 2. Проверяем данные по неделям
                console.log('📅 Данные по неделям:');
                if (appState.weeklyData) {
                    for (const [weekKey, weekData] of Object.entries(appState.weeklyData)) {
                        const stars = calculateWeeklyStars(weekData.xp);
                        console.log(`- ${weekKey}: ${weekData.xp} XP, ${stars} звезд`);
                    }
                } else {
                    console.log('- Нет данных по неделям');
                }
                
                // 3. Проверяем активность
                console.log('📝 Активность:');
                const dates = Object.keys(appState.activityData).sort();
                console.log('- Всего дней с активностью:', dates.length);
                for (const date of dates.slice(0, 5)) { // Показываем первые 5 дней
                    const logs = appState.activityData[date];
                    const dayXP = logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                    const weekKey = getWeekStartKey(new Date(date));
                    console.log(`  ${date}: ${dayXP} XP (неделя: ${weekKey})`);
                }
                
                // 4. Проверяем награды
                console.log('🎁 Награды:');
                console.log('- Всего наград:', appState.rewards.length);
                const totalStarsSpent = appState.rewards.reduce((sum, reward) => sum + (reward.starsUsed || 0), 0);
                console.log('- Звезд потрачено:', totalStarsSpent);
                
                // 5. Пересчитываем все
                console.log('🔄 Выполняем полный пересчет...');
                recalculateAllProgress();
                
                // 6. Проверяем результат
                console.log('✅ Результат пересчета:');
                console.log('- Общий XP:', appState.progress.totalXP);
                console.log('- Текущий уровень:', appState.progress.level);
                console.log('- Недельный XP:', appState.progress.weeklyXP);
                console.log('- Звезды за неделю:', appState.progress.weeklyStars);
                console.log('- Банк звезд:', appState.progress.starBank);
                
                console.log('=====================================');
                console.log('⭐ ТЕСТ ЗАВЕРШЕН');
            }



            // Function to delete a reward (admin only)
            function deleteReward(rewardId) {
                // Check if user is admin
                if (appState.role !== 'admin') {
                    showNotification('Только администратор может удалять награды', 'error');
                    return;
                }
                
                // Find the reward
                const rewardIndex = appState.rewards.findIndex(r => r.id === rewardId);
                if (rewardIndex === -1) {
                    showNotification('Награда не найдена', 'error');
                    return;
                }
                
                const reward = appState.rewards[rewardIndex];
                
                // Show confirmation dialog
                const confirmMessage = `Удалить награду "${reward.description}"?\n\nЭто действие нельзя отменить.`;
                if (!confirm(confirmMessage)) {
                    return;
                }
                
                // Store stars that will be returned
                const starsReturned = reward.starsUsed || 0;
                
                // Remove reward from array
                appState.rewards.splice(rewardIndex, 1);
                
                console.log('🗑️ Награда удалена:', reward);
                console.log('⭐ Звезд возвращено в банк:', starsReturned);
                
                // Recalculate all progress
                recalculateAllProgress();
                
                // Update all displays
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                updateLearningTimeDisplay();
                
                // Update rewards bank
                updateRewardsBank();
                
                // Update achievements bank
                updateAchievementsBank();
                
                // Show success notification
                showNotification(`Награда "${reward.description}" удалена! ${starsReturned} ⭐ возвращено в банк. Все показатели пересчитаны.`, 'success');
                
                // Auto-save to Firebase
                safeSetTimeout(() => {
                    saveDataToFirebaseSilent();
                }, 1000);
            }

            function updateRewardsBank() {
                console.log('🎁 updateRewardsBank called');
                const container = document.getElementById('rewardsBankContent');
                const state = getEffectiveState();
                const rewards = state.rewards || [];
                
                console.log('Container element:', container);
                console.log('Rewards count:', rewards.length);
                console.log('Sample reward:', rewards[0]);
                
                if (container) {
                    console.log('Container computed styles:', {
                        maxHeight: window.getComputedStyle(container).maxHeight,
                        height: window.getComputedStyle(container).height,
                        overflowY: window.getComputedStyle(container).overflowY,
                        scrollHeight: container.scrollHeight,
                        clientHeight: container.clientHeight
                    });
                }
                
                if (!container) {
                    console.log('❌ Rewards container not found!');
                    return;
                }
                
                // Calculate statistics
                const rewardsCount = rewards.length;
                const totalStarsSpent = rewards.reduce((sum, reward) => sum + (reward.starsUsed || 0), 0);
                const lastRewardDate = rewards.length > 0 ? 
                    (() => {
                        const date = new Date(rewards[rewards.length - 1].redeemedAt);
                        return isNaN(date.getTime()) ? '—' : 
                            date.toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit'
                            });
                    })() : '—';
                
                // Update summary
                document.getElementById('rewardsReceived').textContent = rewardsCount;
                document.getElementById('totalStarsSpent').textContent = totalStarsSpent;
                document.getElementById('lastRewardDate').textContent = lastRewardDate;
                
                // Render rewards
                if (rewards.length === 0) {
                    container.innerHTML = `
                        <div class="rewards-bank-empty">
                            <div class="rewards-bank-empty-icon">🎁</div>
                            <div class="rewards-bank-empty-title">Пока нет полученных наград</div>
                            <div class="rewards-bank-empty-description">
                                Придумайте награду и получите её, накопив достаточно звёзд!
                            </div>
                        </div>
                    `;
                    return;
                }
                
                // Sort rewards by date (newest first)
                const sortedRewards = rewards.sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
                
                container.innerHTML = sortedRewards.map(reward => {
                    const date = new Date(reward.redeemedAt);
                    const formattedDate = isNaN(date.getTime()) ? 'Дата неизвестна' : 
                        date.toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                    
                    return `
                        <div class="reward-bank-item">
                            <div class="reward-bank-icon">${reward.icon || '🎁'}</div>
                            <div class="reward-bank-content">
                                <div class="reward-bank-title">${reward.description}</div>
                                <div class="reward-bank-description">Награда получена</div>
                                <div class="reward-bank-meta">
                                    <div class="reward-bank-date">${formattedDate}</div>
                                    <div class="reward-bank-stars">${reward.starsUsed} ⭐</div>
                                </div>
                            </div>
                            ${appState.role === 'admin' ? `
                                <div class="reward-bank-actions">
                                    <button class="reward-delete-btn" onclick="deleteReward(${reward.id})" title="Удалить награду">
                                        🗑️
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
                
                // Отладочная информация после рендеринга
                console.log('After rendering rewards:', {
                    rewardsCount: sortedRewards.length,
                    containerScrollHeight: container.scrollHeight,
                    containerClientHeight: container.clientHeight,
                    containerMaxHeight: window.getComputedStyle(container).maxHeight,
                    shouldShowScroll: container.scrollHeight > container.clientHeight
                });
            }

            function changeAchievementLevel(direction) {
                const newLevel = currentSelectedLevel + direction;
                if (newLevel >= 1 && newLevel <= 100) {
                    updateAchievementLevel(newLevel);
                }
            }

            function updateAchievementLevel(level) {
                currentSelectedLevel = parseInt(level);
                
                // Update level display
                document.getElementById('selectedLevelNumber').textContent = currentSelectedLevel;
                document.getElementById('levelRangeSlider').value = currentSelectedLevel;
                
                // Update navigation buttons
                document.getElementById('prevLevelBtn').disabled = currentSelectedLevel <= 1;
                document.getElementById('nextLevelBtn').disabled = currentSelectedLevel >= 100;
                
                // Get achievement for this level
                const achievement = getAchievementForLevel(currentSelectedLevel);
                const state = getEffectiveState();
                const currentLevel = state.progress.level;
                
                // Update achievement display
                const displayContainer = document.getElementById('achievementDisplay');
                const progressInfo = document.getElementById('achievementProgressInfo');
                
                if (achievement) {
                    const isAchieved = currentLevel >= currentSelectedLevel;
                    
                    displayContainer.innerHTML = `
                        <div class="achievement-display-icon">${achievement.icon}</div>
                        <div class="achievement-display-title">${achievement.title}</div>
                        <div class="achievement-display-description">${achievement.description}</div>
                    `;
                    
                    // Update progress info
                    if (isAchieved) {
                        progressInfo.innerHTML = `
                            <h5>✅ Достижение получено!</h5>
                            <p>Вы достигли ${currentSelectedLevel} уровня и получили это достижение.</p>
                        `;
                    } else {
                        const xpNeeded = (currentSelectedLevel - 1) * 810;
                        const currentXP = state.progress.totalXP;
                        const xpRemaining = Math.max(0, xpNeeded - currentXP);
                        
                        progressInfo.innerHTML = `
                            <h5>🔒 Достижение заблокировано</h5>
                            <p>Для получения этого достижения нужно достичь ${currentSelectedLevel} уровня.</p>
                            <p>Осталось набрать: <strong>${xpRemaining} XP</strong></p>
                        `;
                    }
                } else {
                    displayContainer.innerHTML = `
                        <div class="achievement-display-icon">❓</div>
                        <div class="achievement-display-title">Достижение не найдено</div>
                        <div class="achievement-display-description">Для этого уровня пока нет специального достижения.</div>
                    `;
                    
                    progressInfo.innerHTML = `
                        <h5>📈 Обычный уровень</h5>
                        <p>Этот уровень не имеет специального достижения, но является важной частью вашего прогресса.</p>
                    `;
                }
            }

            function updateMilestones() {
                const container = document.getElementById('milestonesContent');
                const state = getEffectiveState();
                const currentLevel = state.progress.level;
                
                // Создаем массив достижений на основе уровней изучения английского языка
                const achievements = [
                    // Уровни 1-5 (каждый уровень)
                    { level: 1, achieved: currentLevel >= 1, title: '🌱 Первые шаги', description: 'Новичок в изучении английского языка. Начало увлекательного путешествия!' },
                    { level: 2, achieved: currentLevel >= 2, title: '📚 Ученик', description: 'Осваиваете основы английского языка. Каждый день приносит новые знания!' },
                    { level: 3, achieved: currentLevel >= 3, title: '🎯 Целеустремленный', description: 'Показываете стабильный прогресс в изучении языка. Продолжайте в том же духе!' },
                    { level: 4, achieved: currentLevel >= 4, title: '💪 Упорный', description: 'Демонстрируете настойчивость в изучении английского. Результат не заставит себя ждать!' },
                    { level: 5, achieved: currentLevel >= 5, title: '⭐ Уверенный новичок', description: 'Преодолели первые трудности! Теперь вы уверенно чувствуете себя в основах языка.' },
                    
                    // Уровни каждые 5 (10, 15, 20, 25...)
                    { level: 10, achieved: currentLevel >= 10, title: '🚀 Активный изучающий', description: 'Достигли 10 уровня! Ваш английский становится все более уверенным.' },
                    { level: 15, achieved: currentLevel >= 15, title: '🎓 Уверенный пользователь', description: '15 уровень покорен! Вы можете уверенно общаться на базовые темы.' },
                    { level: 20, achieved: currentLevel >= 20, title: '🌟 Продвинутый ученик', description: '20 уровень! Ваши знания английского языка становятся глубокими и прочными.' },
                    { level: 25, achieved: currentLevel >= 25, title: '💎 Опытный знаток', description: 'Четверть пути пройдена! Вы владеете английским на хорошем уровне.' },
                    { level: 30, achieved: currentLevel >= 30, title: '🏆 Мастер слова', description: '30 уровень! Ваш английский позволяет свободно выражать мысли.' },
                    { level: 35, achieved: currentLevel >= 35, title: '🎭 Лингвистический артист', description: '35 уровень! Вы владеете языком с художественной точностью.' },
                    { level: 40, achieved: currentLevel >= 40, title: '🧠 Языковой гений', description: '40 уровень! Ваше понимание английского языка поражает глубиной.' },
                    { level: 45, achieved: currentLevel >= 45, title: '👑 Король английского', description: '45 уровень! Вы достигли высот в изучении языка.' },
                    { level: 50, achieved: currentLevel >= 50, title: '🎪 Половина пути к совершенству', description: '50 уровень! Половина пути пройдена. Вы на правильном пути к мастерству!' },
                    { level: 55, achieved: currentLevel >= 55, title: '🌟 Звезда лингвистики', description: '55 уровень! Ваши знания английского сияют ярко.' },
                    { level: 60, achieved: currentLevel >= 60, title: '🎯 Снайпер языка', description: '60 уровень! Вы попадаете в цель каждым словом.' },
                    { level: 65, achieved: currentLevel >= 65, title: '⚡ Молния в изучении', description: '65 уровень! Ваш прогресс молниеносен и впечатляющ.' },
                    { level: 70, achieved: currentLevel >= 70, title: '🔥 Огненный мастер', description: '70 уровень! Ваше владение языком пылает страстью и мастерством.' },
                    { level: 75, achieved: currentLevel >= 75, title: '🎨 Художник слова', description: '75 уровень! Вы создаете шедевры из английских слов.' },
                    { level: 80, achieved: currentLevel >= 80, title: '🏅 Чемпион английского', description: '80 уровень! Вы чемпион в изучении английского языка.' },
                    { level: 85, achieved: currentLevel >= 85, title: '🎪 Виртуоз языка', description: '85 уровень! Ваше владение английским виртуозно.' },
                    { level: 90, achieved: currentLevel >= 90, title: '👑 Император лингвистики', description: '90 уровень! Вы правите миром английского языка.' },
                    { level: 95, achieved: currentLevel >= 95, title: '🌟 Божественный оратор', description: '95 уровень! Ваша речь божественно красива и точна.' },
                    { level: 100, achieved: currentLevel >= 100, title: '🏆 Богоподобный уровень', description: '100 уровень! Вы достигли богоподобного мастерства в английском языке!' }
                ];
                
                // Фильтруем достижения, которые нужно показать (достигнутые + следующие 2)
                const achievedCount = achievements.filter(a => a.achieved).length;
                const visibleAchievements = achievements.slice(0, Math.max(achievedCount + 2, 3));
                
                container.innerHTML = visibleAchievements.map(achievement => `
                    <div class="achievement-item ${achievement.achieved ? 'achieved' : 'locked'}">
                        <div class="achievement-icon">${achievement.achieved ? '✅' : '🔒'}</div>
                        <div class="achievement-content">
                            <div class="achievement-title">${achievement.title}</div>
                            <div class="achievement-level">Уровень ${achievement.level}</div>
                            <div class="achievement-description">${achievement.description}</div>
                        </div>
                        <div class="achievement-status">
                            ${achievement.achieved ? 
                                '<span class="status-achieved">Получено</span>' : 
                                `<span class="status-locked">${currentLevel}/${achievement.level}</span>`
                            }
                        </div>
                    </div>
                `).join('');
            }

            function updateRecords() {



            }

            // Stub functions for charts that would need more complex implementation










            // Initialize app when page loads (removed duplicate)

            // Network status handlers
            window.addEventListener('online', () => {
                console.log('Интернет-соединение восстановлено');
                showNotification('Интернет-соединение восстановлено', 'success');
                
                // Обновляем статус синхронизации
                updateSyncStatus();
                
                // Синхронизируем данные при восстановлении соединения асинхронно
                if (appState.isVerified) {
                    syncWithFirestore().then(result => {
                        if (result) {
                            console.log('✅ Автоматическая синхронизация при восстановлении соединения завершена');
                        } else {
                            console.log('⚠️ Автоматическая синхронизация при восстановлении соединения не удалась');
                        }
                    }).catch(error => {
                        console.log('❌ Ошибка автоматической синхронизации при восстановлении соединения:', error);
                    });
                }
            });

            window.addEventListener('offline', () => {
                console.log('Интернет-соединение потеряно');
                showNotification('Интернет-соединение потеряно', 'warning');
                
                // Обновляем статус синхронизации
                updateSyncStatus();
            });

            // Autocomplete interactions for reward ideas
            document.addEventListener('input', function(e) {
                if (e.target && e.target.id === 'ideaDescription') {
                    renderIdeaSuggestions(e.target.value);
                }
            });
            document.addEventListener('click', function(e) {
                const list = document.getElementById('ideaAutocomplete');
                const input = document.getElementById('ideaDescription');
                if (!list || !input) return;
                // Remove item
                const removeBtn = e.target.closest && e.target.closest('.autocomplete-remove');
                if (removeBtn) {
                    const val = removeBtn.getAttribute('data-remove');
                    removeIdea(val);
                    renderIdeaSuggestions(input.value || '');
                    e.stopPropagation();
                    return;
                }
                // Pick item
                const item = e.target.closest && e.target.closest('.autocomplete-item');
                if (item && item.getAttribute('data-value')) {
                    input.value = item.getAttribute('data-value');
                    list.style.display = 'none';
                    list.innerHTML = '';
                    input.focus();
                    return;
                }
                // Click outside autocomplete closes it
                if (!e.target.closest('.autocomplete-wrap')) {
                    list.style.display = 'none';
                    list.innerHTML = '';
                }
            });

            // Account selection & role handling
            function selectAccount(role) {
                const previousRole = appState.role;
                const previousUserName = appState.userName;
                
                appState.role = role === 'admin' ? 'admin' : 'viewer';
                
                // Устанавливаем имя пользователя в зависимости от роли
                if (role === 'viewer') {
                    appState.userName = 'Михаил';
                } else {
                    appState.userName = 'Admin';
                }
                
                // Сохраняем состояние только локально
                saveState();
                
                console.log(`✅ Учетная запись изменена: ${previousUserName} (${previousRole}) → ${appState.userName} (${appState.role})`);
                
                // Закрываем модальное окно выбора учетной записи
                document.getElementById('accountModal').classList.remove('show');
                
                // Убираем затемнение и показываем основной контент
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.remove('show');
                if (container) container.classList.remove('hidden');
                
                // Показываем верификацию для входа
                appState.isVerified = false;
                showVerificationModal();
                
                console.log('🔄 Учетная запись изменена, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Учетная запись изменена, все показатели пересчитаны');
                
                // Обновляем отображение времени обучения
                updateLearningTimeDisplay();
                
                showNotification(appState.userName === 'Михаил' ? 'Режим Михаила' : 'Режим администратора', 'info');
                
                // Автоматически сохраняем в Firebase после смены учетной записи
                safeSetTimeout(() => {
                    saveDataToFirebaseSilent();
                }, 1000);
            }

            // Change Account Modal
            function showChangeAccountModal() {
                // Сбрасываем статус верификации при смене учетной записи
                appState.isVerified = false;
                document.getElementById('accountModal').classList.add('show');
                
                // Скрываем основной контент и показываем затемнение
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.add('show');
                if (container) container.classList.add('hidden');
                
                console.log('🔄 Показываем смену учетной записи, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Смена учетной записи показана, все показатели пересчитаны');
                
                // Обновляем отображение времени обучения
                updateLearningTimeDisplay();
                
                // Восстанавливаем состояние блоков (все свернуты по умолчанию)
                restoreSettingsBlocksState();
                
                // Автоматическое сохранение отключено при показе смены учетной записи
                // saveDataToFirebase();
                
                toggleSettingsMenu(); // Close settings menu
            }

            // Proper offline QR encoder (fallback, не переопределяет основную версию)
            function drawQrToCanvasFallback(text) {
                const canvas = document.getElementById('qrCanvas');
                if (!canvas) return;
                
                // Simple but effective QR-like pattern generator
                const ctx = canvas.getContext('2d');
                const size = canvas.width;
                
                // Clear canvas
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                
                // Generate deterministic pattern based on text
                let hash = 0;
                for (let i = 0; i < text.length; i++) {
                    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0;
                }
                
                // Create QR-like grid pattern
                const gridSize = 8;
                const cells = size / gridSize;
                
                ctx.fillStyle = '#000000';
                for (let y = 0; y < cells; y++) {
                    for (let x = 0; x < cells; x++) {
                        // Use hash to determine if cell should be filled
                        hash = (hash * 1103515245 + 12345) >>> 0;
                        if ((hash & 1) === 0) {
                            ctx.fillRect(x * gridSize + 1, y * gridSize + 1, gridSize - 2, gridSize - 2);
                        }
                    }
                }
                
                // Add corner markers (QR code style)
                ctx.fillStyle = '#000000';
                // Top-left corner
                ctx.fillRect(0, 0, gridSize * 3, gridSize * 3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(gridSize, gridSize, gridSize, gridSize);
                // Top-right corner
                ctx.fillStyle = '#000000';
                ctx.fillRect(size - gridSize * 3, 0, gridSize * 3, gridSize * 3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(size - gridSize * 2, gridSize, gridSize, gridSize);
                // Bottom-left corner
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, size - gridSize * 3, gridSize * 3, gridSize * 3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(gridSize, size - gridSize * 2, gridSize, gridSize);
            }

            // PIN Code Management Functions
            let currentPin = '';
            let setupPin = '';
            let setupPinStep = 1; // 1 = first entry, 2 = confirmation
            let isChangingPin = false; // Флаг для режима смены PIN-кода



            // Show verification modal
            function showVerificationModal() {
                console.log('🔐 Показываем модальное окно верификации для:', appState.userName);
                
                const userInfo = document.getElementById('verificationUserInfo');
                const setupSection = document.getElementById('setupPinSection');
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                
                if (userInfo) userInfo.textContent = appState.userName;
                
                // Check if user has PIN code
                const hasPin = appState.pinCodes[appState.userName];
                if (hasPin) {
                    setupSection.style.display = 'none';
                    console.log('🔐 PIN-код найден, показываем форму ввода');
                } else {
                    setupSection.style.display = 'block';
                    console.log('🔑 PIN-код не найден, показываем форму установки');
                }
                
                resetPinInput();
                
                console.log('🔄 Показываем верификацию, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ ВЕРИФИКАЦИИ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Верификация показана, все показатели пересчитаны');
                
                document.getElementById('verificationModal').classList.add('show');
                if (overlay) overlay.classList.add('show');
                if (container) container.classList.add('hidden');
            }

            // Hide verification modal
            function hideVerificationModal() {
                document.getElementById('verificationModal').classList.remove('show');
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.remove('show');
                if (container) container.classList.remove('hidden');
                resetPinInput();
                
                // Сбрасываем флаг смены PIN-кода при отмене
                if (isChangingPin) {
                    isChangingPin = false;
                }
                
                // Если пользователь не прошел верификацию, показываем выбор учетной записи
                // но только если это не была смена PIN-кода
                if (!appState.isVerified && !isChangingPin) {
                    console.log('🔄 Верификация отменена, возвращаемся к выбору учетной записи');
                    showAccountSelection();
                }
            }

            // Show setup PIN modal
            function showSetupPinModal() {
                const userInfo = document.getElementById('setupPinUserInfo');
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                const title = document.getElementById('setupPinModalTitle');
                
                if (userInfo) userInfo.textContent = appState.userName;
                
                // Обновляем заголовок в зависимости от режима
                if (title) {
                    if (isChangingPin) {
                        title.textContent = '🔐 Смена PIN-кода';
                    } else {
                        title.textContent = '🔑 Установка PIN-кода';
                    }
                }
                
                resetSetupPinInput();
                
                console.log('🔄 Показываем установку PIN-кода, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ УСТАНОВКИ PIN-КОДА
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Установка PIN-кода показана, все показатели пересчитаны');
                
                // Автоматическое сохранение отключено при показе установки PIN-кода
                // saveDataToFirebase();
                
                document.getElementById('setupPinModal').classList.add('show');
                if (overlay) overlay.classList.add('show');
                if (container) container.classList.add('hidden');
            }

            // Hide setup PIN modal
            function hideSetupPinModal() {
                document.getElementById('setupPinModal').classList.remove('show');
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.remove('show');
                if (container) container.classList.remove('hidden');
                resetSetupPinInput();
                
                // Если это была отмена смены PIN-кода, сбрасываем флаг
                if (isChangingPin) {
                    isChangingPin = false;
                }
            }

            // Show change PIN modal
            function showChangePinModal() {
                // Устанавливаем флаг режима смены PIN-кода
                isChangingPin = true;
                
                console.log('🔄 Показываем смену PIN-кода, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ СМЕНЫ PIN-КОДА
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Смена PIN-кода показана, все показатели пересчитаны');
                
                // Автоматическое сохранение отключено при показе смены PIN-кода
                // saveDataToFirebase();
                
                // First verify current PIN
                showVerificationModal();
            }

            // Add digit to PIN input
            function addPinDigit(digit) {
                if (currentPin.length < 4) {
                    currentPin += digit;
                    updatePinDisplay();
                    updateVerifyButton();
                }
            }

            // Delete digit from PIN input
            function deletePinDigit() {
                if (currentPin.length > 0) {
                    currentPin = currentPin.slice(0, -1);
                    updatePinDisplay();
                    updateVerifyButton();
                }
            }

            // Add digit to setup PIN input
            function addSetupPinDigit(digit) {
                if (setupPin.length < 4) {
                    setupPin += digit;
                    updateSetupPinDisplay();
                    updateSetupButton();
                }
            }

            // Delete digit from setup PIN input
            function deleteSetupPinDigit() {
                if (setupPin.length > 0) {
                    setupPin = setupPin.slice(0, -1);
                    updateSetupPinDisplay();
                    updateSetupButton();
                }
            }

            // Update PIN display dots
            function updatePinDisplay() {
                for (let i = 1; i <= 4; i++) {
                    const dot = document.getElementById(`pinDot${i}`);
                    if (dot) {
                        if (i <= currentPin.length) {
                            dot.classList.add('filled');
                        } else {
                            dot.classList.remove('filled');
                        }
                    }
                }
            }

            // Update setup PIN display dots
            function updateSetupPinDisplay() {
                for (let i = 1; i <= 4; i++) {
                    const dot = document.getElementById(`setupPinDot${i}`);
                    if (dot) {
                        if (i <= setupPin.length) {
                            dot.classList.add('filled');
                        } else {
                            dot.classList.remove('filled');
                        }
                    }
                }
            }

            // Reset PIN input
            function resetPinInput() {
                currentPin = '';
                updatePinDisplay();
                updateVerifyButton();
            }

            // Reset setup PIN input
            function resetSetupPinInput() {
                setupPin = '';
                setupPinStep = 1;
                updateSetupPinDisplay();
                updateSetupButton();
            }

            // Update verify button state
            function updateVerifyButton() {
                const btn = document.getElementById('verifyBtn');
                if (btn) {
                    btn.disabled = currentPin.length !== 4;
                }
            }

            // Update setup button state
            function updateSetupButton() {
                const btn = document.getElementById('confirmSetupBtn');
                if (btn) {
                    btn.disabled = setupPin.length !== 4;
                    
                    // Обновляем текст кнопки в зависимости от режима
                    if (isChangingPin) {
                        btn.textContent = '✅ Изменить';
                    } else {
                        btn.textContent = '✅ Сохранить';
                    }
                }
            }

            // Verify PIN code
            function verifyPin() {
                console.log(`🔐 Проверяем PIN-код для пользователя: ${appState.userName}`);
                console.log('🔑 Состояние PIN-кодов:', appState.pinCodes);
                
                // Проверяем, загружены ли PIN-коды из Firebase
                if (Object.keys(appState.pinCodes).length === 0) {
                    console.log('❌ PIN-коды не загружены из Firebase');
                    showNotification('PIN-коды не загружены. Проверьте интернет-соединение.', 'error');
                    return;
                }
                
                const storedPin = appState.pinCodes[appState.userName];
                
                if (!storedPin) {
                    console.log('❌ PIN-код не установлен для пользователя:', appState.userName);
                    showNotification('PIN-код не установлен для этого пользователя', 'error');
                    return;
                }
                
                console.log(`🔐 Введенный PIN: ${currentPin}, Сохраненный PIN: ${storedPin}`);
                
                if (currentPin === storedPin) {
                    if (isChangingPin) {
                        // Если это режим смены PIN-кода, показываем окно установки
                        isChangingPin = false; // Сбрасываем флаг
                        hideVerificationModal();
                        showSetupPinModal();
                        showNotification('Введите новый PIN-код', 'info');
                    } else {
                        // Обычный вход в систему
                        appState.isVerified = true;
                        hideVerificationModal();
                        
                                        // Применяем роли только после успешной верификации
                applyRolePermissions();
                
                // Восстанавливаем состояние блоков (все свернуты по умолчанию)
                restoreSettingsBlocksState();
                
                console.log('🔄 Вход выполнен успешно, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                        
                        // 1. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения
                        updateProgressDisplay();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ Вход выполнен успешно, все показатели пересчитаны');
                        
                        showNotification('Вход выполнен успешно! Все показатели пересчитаны.', 'success');
                        
                        // Автоматически сохраняем в Firebase после успешного входа
                        safeSetTimeout(() => {
                            saveDataToFirebaseSilent();
                        }, 1000);
                        
                        // Show welcome modal for Mikhail
                        if (appState.userName === 'Михаил') {
                            showWelcomeModal();
                        }
                    }
                } else {
                    showNotification('Неверный PIN-код', 'error');
                    resetPinInput();
                }
            }

            // Setup new PIN code
            function setupNewPin() {
                hideVerificationModal();
                showSetupPinModal();
            }

            // Confirm setup PIN code
            async function confirmSetupPin() {
                if (setupPin.length !== 4) {
                    showNotification('PIN-код должен содержать 4 цифры', 'error');
                    return;
                }
                
                console.log(`🔐 Сохраняем PIN-код для пользователя: ${appState.userName}`);
                console.log(`🔑 PIN-код: ${setupPin}`);
                
                // Save PIN code
                appState.pinCodes[appState.userName] = setupPin;
                
                console.log('💾 Текущие PIN-коды:', appState.pinCodes);
                
                // Сохраняем PIN-коды ТОЛЬКО в Firebase
                if (navigator.onLine && isFirebaseAvailable()) {
                    console.log('🔄 Сохраняем PIN-код в Firebase...');
                    try {
                        const saved = await savePinCodesToFirebase();
                        if (saved) {
                            console.log('✅ PIN-код успешно сохранен в Firebase');
                            showNotification('PIN-код установлен и сохранен в облаке!', 'success');
                        } else {
                            console.log('❌ Не удалось сохранить PIN-код в Firebase');
                            showNotification('PIN-код установлен локально, но не сохранен в облаке', 'warning');
                        }
                    } catch (error) {
                        console.error('❌ Ошибка сохранения PIN-кода в Firebase:', error);
                        showNotification('Ошибка сохранения PIN-кода в облаке', 'error');
                    }
                } else {
                    console.log('⚠️ Firebase недоступен, PIN-код сохранен только локально');
                    showNotification('PIN-код установлен локально (Firebase недоступен)', 'warning');
                }
                
                hideSetupPinModal();
                
                if (isChangingPin) {
                    // Если это была смена PIN-кода
                    showNotification('PIN-код изменен успешно!', 'success');
                    // Пользователь остается в системе, так как он уже был верифицирован
                } else {
                    // Если это была первая установка PIN-кода
                    showNotification('PIN-код установлен успешно!', 'success');
                    // Auto-verify user
                    appState.isVerified = true;
                    
                    // Применяем роли после успешной установки PIN-кода
                    applyRolePermissions();
                    
                    // Автоматически сохраняем в Firebase после установки PIN-кода
                    safeSetTimeout(() => {
                        saveDataToFirebaseSilent();
                    }, 1000);
                    
                    console.log('🔄 PIN-код установлен, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    
                    // 3. Проверяем, что все показатели обновлены
                    console.log('✅ PIN-код установлен, все показатели пересчитаны');
                    
                    // Show welcome modal for Mikhail
                    if (appState.userName === 'Михаил') {
                        showWelcomeModal();
                    }
                }
            }

            // Check if user needs verification
            function needsVerification() {
                return !appState.isVerified;
            }

            // Logout user
            function logoutUser() {
                appState.isVerified = false;
                
                // Останавливаем автосинхронизацию
                stopAutoSync();
                
                // Автоматическое сохранение отключено
                showNotification('Выход выполнен', 'info');
            }

            // ========================================
            // FIREBASE FIRESTORE INTEGRATION
            // ========================================

            // Check if Firebase is available
            function isFirebaseAvailable() {
                // Check if Firebase is ready and functions are available
                if (window.firebaseReady === true) {
                    return true;
                }
                
                // Fallback check for older versions
                return window.db && window.doc && window.setDoc && window.getDoc && window.updateDoc;
            }

            // Clean data for Firebase storage
            function cleanDataForFirestore(data) {
                const cleaned = { ...data };
                
                console.log('🧹 Очищаем данные для Firebase...');
                
                // Функция для безопасного преобразования Date в строку
                function safeDateToString(date) {
                    if (!date) return null;
                    
                    try {
                        // Проверяем, что это валидный Date объект
                        if (date instanceof Date && !isNaN(date.getTime())) {
                            return date.toISOString();
                        }
                        
                        // Если это строка, пытаемся создать Date и проверить
                        if (typeof date === 'string') {
                            const parsedDate = new Date(date);
                            if (!isNaN(parsedDate.getTime())) {
                                return parsedDate.toISOString();
                            }
                        }
                        
                        // Если ничего не работает, возвращаем null
                        console.warn('⚠️ Некорректная дата:', date);
                        return null;
                    } catch (error) {
                        console.warn('⚠️ Ошибка при обработке даты:', date, error);
                        return null;
                    }
                }
                
                // Очищаем основные Date поля
                if (cleaned.currentMonth) {
                    cleaned.currentMonth = safeDateToString(cleaned.currentMonth);
                }
                
                if (cleaned.selectedDate) {
                    cleaned.selectedDate = safeDateToString(cleaned.selectedDate);
                }
                
                if (cleaned.resetDate) {
                    cleaned.resetDate = safeDateToString(cleaned.resetDate);
                }
                
                // Очищаем Date поля в activityData
                if (cleaned.activityData) {
                    Object.keys(cleaned.activityData).forEach(dateStr => {
                        if (cleaned.activityData[dateStr] && Array.isArray(cleaned.activityData[dateStr])) {
                            cleaned.activityData[dateStr].forEach(activity => {
                                if (activity.completedAt) {
                                    activity.completedAt = safeDateToString(activity.completedAt);
                                }
                            });
                        }
                    });
                }
                
                // Очищаем Date поля в tasks
                if (cleaned.tasks && Array.isArray(cleaned.tasks)) {
                    cleaned.tasks.forEach(task => {
                        if (task.createdAt) {
                            task.createdAt = safeDateToString(task.createdAt);
                        }
                        if (task.completedAt) {
                            task.completedAt = safeDateToString(task.completedAt);
                        }
                    });
                }
                
                // Очищаем Date поля в rewards
                if (cleaned.rewards && Array.isArray(cleaned.rewards)) {
                    cleaned.rewards.forEach(reward => {
                        if (reward.createdAt) {
                            reward.createdAt = safeDateToString(reward.createdAt);
                        }
                        if (reward.claimedAt) {
                            reward.claimedAt = safeDateToString(reward.claimedAt);
                        }
                    });
                }
                
                // Очищаем Date поля в saveStats
                if (cleaned.saveStats) {
                    if (cleaned.saveStats.firstSave) {
                        cleaned.saveStats.firstSave = safeDateToString(cleaned.saveStats.firstSave);
                    }
                    if (cleaned.saveStats.lastSave) {
                        cleaned.saveStats.lastSave = safeDateToString(cleaned.saveStats.lastSave);
                    }
                }
                
                // Очищаем Date поля в deviceInfo
                if (cleaned.deviceInfo && cleaned.deviceInfo.timestamp) {
                    cleaned.deviceInfo.timestamp = safeDateToString(cleaned.deviceInfo.timestamp);
                }
                
                console.log('✅ Данные очищены для Firebase');
                return cleaned;
            }

            // Save PIN codes to Firebase (основной источник)
            async function savePinCodesToFirebase() {
                if (!navigator.onLine || !isFirebaseAvailable()) {
                    console.log('🔐 Сохранение PIN-кодов отменено: нет интернета или Firebase');
                    return false;
                }
                
                // Дополнительная проверка доступности updateDoc
                if (typeof updateDoc === 'undefined') {
                    console.error('❌ updateDoc не доступен');
                    return false;
                }

                try {
                    console.log('🔐 Сохраняем PIN-коды в Firebase...');
                    
                    // Подготавливаем данные для сохранения
                    const pinData = {
                        pinCodes: appState.pinCodes,
                        lastUpdated: new Date().toISOString(),
                        savedBy: appState.userName,
                        version: '1.0',
                        dataType: 'pin-codes'
                    };
                    
                    // Сохраняем в коллекцию pin-backups
                    const pinBackupRef = doc(db, 'pin-backups', 'main');
                    await retryOperation(async () => {
                        return await setDoc(pinBackupRef, pinData, { merge: true });
                    }, 3, 1000);
                    
                    // Также сохраняем в shared-data для совместимости
                    const sharedRef = doc(db, 'shared-data', 'main');
                    await retryOperation(async () => {
                        return await updateDoc(sharedRef, {
                            pinCodes: appState.pinCodes,
                            lastPinUpdate: new Date().toISOString()
                        });
                    }, 3, 1000);
                    
                    console.log('✅ PIN-коды успешно сохранены в Firebase');
                    console.log('🔐 Сохраненные PIN-коды:', appState.pinCodes);
                    return true;
                } catch (error) {
                    console.error('❌ Ошибка сохранения PIN-кодов в Firebase:', error);
                    return false;
                }
            }

            // Load PIN codes from Firebase (основной источник)
            async function loadPinCodesFromFirebase() {
                if (!navigator.onLine || !isFirebaseAvailable()) {
                    console.log('🔐 Загрузка PIN-кодов отменена: нет интернета или Firebase');
                    return false;
                }
                
                // Дополнительная проверка доступности Firebase функций
                if (typeof doc === 'undefined' || typeof getDoc === 'undefined') {
                    console.error('❌ Firebase функции не доступны');
                    return false;
                }

                try {
                    console.log('🔐 Загружаем PIN-коды из Firebase...');
                    
                    // Пытаемся загрузить из коллекции pin-backups
                    const pinBackupRef = doc(db, 'pin-backups', 'main');
                    const pinBackupSnap = await retryOperation(async () => {
                        return await getDoc(pinBackupRef);
                    }, 3, 1000);
                    
                    if (pinBackupSnap.exists()) {
                        const backupData = pinBackupSnap.data();
                        const backupPinCodes = backupData.pinCodes;
                        
                        if (backupPinCodes && typeof backupPinCodes === 'object') {
                            // Валидируем PIN-коды
                            const validatedPins = validatePinCodes(backupPinCodes);
                            
                            // Полностью заменяем PIN-коды (не объединяем с локальными)
                            appState.pinCodes = validatedPins;
                            
                            console.log('✅ PIN-коды загружены из Firebase');
                            console.log('🔐 Загруженные PIN-коды:', appState.pinCodes);
                            return true;
                        }
                    }
                    
                    // Если в pin-backups нет, пробуем загрузить из shared-data
                    console.log('🔐 PIN-коды не найдены в pin-backups, пробуем shared-data...');
                    const sharedRef = doc(db, 'shared-data', 'main');
                    const sharedSnap = await retryOperation(async () => {
                        return await getDoc(sharedRef);
                    }, 3, 1000);
                    
                    if (sharedSnap.exists()) {
                        const sharedData = sharedSnap.data();
                        if (sharedData.pinCodes && typeof sharedData.pinCodes === 'object') {
                            const validatedPins = validatePinCodes(sharedData.pinCodes);
                            appState.pinCodes = validatedPins;
                            
                            console.log('✅ PIN-коды загружены из shared-data');
                            console.log('🔐 Загруженные PIN-коды:', appState.pinCodes);
                            return true;
                        }
                    }
                    
                    console.log('🔐 PIN-коды не найдены ни в одном источнике Firebase');
                    return false;
                } catch (error) {
                    console.error('❌ Ошибка загрузки PIN-кодов из Firebase:', error);
                    return false;
                }
            }

            // Force sync PIN codes with Firebase
            async function forceSyncPinCodes() {
                if (!navigator.onLine || !isFirebaseAvailable()) {
                    console.log('🔐 Принудительная синхронизация PIN-кодов отменена: нет интернета или Firebase');
                    return false;
                }
                
                // Дополнительная проверка доступности Firebase функций
                if (typeof setDoc === 'undefined' || typeof getDoc === 'undefined') {
                    console.error('❌ Firebase функции не доступны');
                    return false;
                }

                try {
                    console.log('🔐 Принудительная синхронизация PIN-кодов...');
                    
                    // Сначала загружаем из Firebase
                    const loadResult = await loadPinCodesFromFirebase();
                    
                    if (loadResult) {
                        // Затем сохраняем текущие PIN-коды обратно в Firebase
                        const saveResult = await savePinCodesToFirebase();
                        
                        if (saveResult) {
                            console.log('✅ PIN-коды успешно синхронизированы с Firebase');
                            
                            console.log('🔄 PIN-коды синхронизированы, пересчитываем все показатели...');
                            
                            // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                            
                            // 1. Пересчитываем лучшую неделю
                            recalculateBestWeek();
                            
                            // 2. Обновляем все отображения
                            updateProgressDisplay();
                            updateBestWeekDisplay();
                            updateRedeemControls();
                            updateProgressWeekSection();
                            updateMonthlyProgressSection();
                            updateWeeklyStars();
                            
                            // 3. Проверяем, что все показатели обновлены
                            console.log('✅ PIN-коды синхронизированы, все показатели пересчитаны');
                            
                            return true;
                        } else {
                            console.log('⚠️ PIN-коды загружены, но не сохранены в Firebase');
                            return false;
                        }
                    } else {
                        // Если загрузка не удалась, просто сохраняем текущие
                        const saveResult = await savePinCodesToFirebase();
                        
                        if (saveResult) {
                            // Пересчитываем лучшую неделю после сохранения PIN-кодов
                            recalculateBestWeek();
                        }
                        
                        return saveResult;
                    }
                } catch (error) {
                    console.error('❌ Ошибка принудительной синхронизации PIN-кодов:', error);
                    return false;
                }
            }

            // Force restore PIN codes from Firebase only
            async function forceRestorePinCodes() {
                console.log('🔐 Принудительное восстановление PIN-кодов из Firebase...');
                
                if (!navigator.onLine || !isFirebaseAvailable()) {
                    console.log('🔐 Firebase недоступен, восстановление невозможно');
                    return false;
                }
                
                // Дополнительная проверка доступности Firebase функций
                if (typeof getDoc === 'undefined') {
                    console.error('❌ Firebase функции не доступны');
                    return false;
                }
                
                try {
                    const result = await loadPinCodesFromFirebase();
                    if (result) {
                        console.log('✅ PIN-коды восстановлены из Firebase');
                        console.log('🔐 Текущие PIN-коды:', appState.pinCodes);
                        
                        console.log('🔄 PIN-коды восстановлены, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                        
                        // 1. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения
                        updateProgressDisplay();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ PIN-коды восстановлены, все показатели пересчитаны');
                        
                        return true;
                    } else {
                        console.log('🔐 PIN-коды не найдены в Firebase');
                        return false;
                    }
                } catch (error) {
                    console.error('❌ Ошибка восстановления PIN-кодов из Firebase:', error);
                    return false;
                }
            }

            // Save data to Firebase with enhanced UI feedback (for manual save)
            async function saveDataToFirebase() {
                // Проверяем, не происходит ли инициализация
                if (appState.isInitializing) {
                    console.log('🚫 Автоматическое сохранение отключено во время инициализации');
                    return false;
                }
                
                // Get the save button
                const saveBtn = document.querySelector('.save-btn');
                if (!saveBtn) return false;

                // Set loading state
                saveBtn.classList.remove('success', 'error');
                saveBtn.classList.add('loading');

                try {
                    // Call the original save function with showDetails flag for manual save
                    const result = await saveStateToFirestore(true);
                    
                    if (result) {
                        // Success state
                        saveBtn.classList.remove('loading');
                        saveBtn.classList.add('success');
                        
                        // Reset to normal state after 2 seconds
                        safeSetTimeout(() => {
                            saveBtn.classList.remove('success');
                        }, 2000);
                        
                        return true;
                    } else {
                        // Error state
                        saveBtn.classList.remove('loading');
                        saveBtn.classList.add('error');
                        
                        // Reset to normal state after 3 seconds
                        safeSetTimeout(() => {
                            saveBtn.classList.remove('error');
                        }, 3000);
                        
                        return false;
                    }
                } catch (error) {
                    // Error state
                    saveBtn.classList.remove('loading');
                    saveBtn.classList.add('error');
                    
                    // Reset to normal state after 3 seconds
                    safeSetTimeout(() => {
                        saveBtn.classList.remove('error');
                    }, 3000);
                    
                    return false;
                }
            }

            // Save data to Firebase without showing details (for automatic saves)
            async function saveDataToFirebaseSilent() {
                // Проверяем, не происходит ли инициализация
                if (appState.isInitializing) {
                    console.log('🚫 Автоматическое сохранение отключено во время инициализации');
                    return false;
                }
                
                if (!isFirebaseAvailable()) {
                    console.log('Firebase недоступен, сохраняем только локально');
                    return false;
                }

                if (!navigator.onLine) {
                    console.log('Нет интернет-соединения');
                    return false;
                }

                try {
                    // Call the original save function without showing details
                    const result = await saveStateToFirestore(false);
                    return result;
                } catch (error) {
                    console.error('❌ Ошибка автоматического сохранения в Firebase:', error);
                    return false;
                }
            }

            // Save state to Firestore (original function)
            async function saveStateToFirestore(showDetails = false) {
                // Проверяем, не происходит ли инициализация
                if (appState.isInitializing) {
                    console.log('🚫 Сохранение в Firebase отключено во время инициализации');
                    return false;
                }
                
                if (!isFirebaseAvailable()) {
                    console.log('Firebase недоступен, сохраняем только локально');
                    showNotification('Firebase недоступен', 'warning');
                    return false;
                }

                if (!navigator.onLine) {
                    console.log('Нет интернет-соединения');
                    showNotification('Нет интернет-соединения', 'warning');
                    return false;
                }

                try {
                    console.log('💾 Начинаем сохранение в Firebase...');
                    
                    // Упрощенная структура данных для сохранения
                    const dataToSave = {
                        // Основные данные (с проверкой на существование)
                        progress: appState.progress || {},
                        tasks: appState.tasks || [],
                        rewards: appState.rewards || [],
                        activityData: appState.activityData || {},
                        rewardPlan: appState.rewardPlan || { description: '' },
                        resetDate: appState.resetDate ? appState.resetDate.toISOString() : null,
                        currentMonth: appState.currentMonth ? appState.currentMonth.toISOString() : null,
                        selectedDate: appState.selectedDate ? appState.selectedDate.toISOString() : null,
                        
                        // Настройки бэкапов (ВАЖНО!)
                        backupSettings: appState.backupSettings || {
                            autoBackup: true,
                            backupFrequency: 'daily',
                            maxBackups: 7,
                            lastBackup: null,
                            nextBackup: null,
                            backupTypes: {
                                scheduled: true,
                                manual: true
                            }
                        },
                        
                        // Метаданные
                        lastUpdated: new Date().toISOString(),
                        lastSavedBy: appState.userName || 'Unknown',
                        version: '1.0',
                        
                        // Простая статистика
                        saveStats: {
                            totalSaves: (appState.saveStats?.totalSaves || 0) + 1,
                            lastSave: new Date().toISOString()
                        }
                    };
                    
                    // Сохраняем в общую коллекцию с retry
                    const sharedRef = doc(db, 'shared-data', 'main');
                    await retryOperation(async () => {
                        return await setDoc(sharedRef, dataToSave, { merge: true });
                    }, 3, 1000);
                    
                    // Обновляем локальное состояние
                    appState.saveStats = dataToSave.saveStats;
                    
                    // PIN-коды сохраняются отдельно через savePinCodesToFirebase
                    // Здесь их не сохраняем, чтобы избежать дублирования
                    
                    console.log('✅ Данные успешно сохранены в Firebase');
                    showNotification('Данные сохранены в Firebase', 'success');
                    
                    // Показываем детальную информацию о сохранении только при ручном сохранении
                    if (showDetails) {
                        showSaveDetails(dataToSave);
                    }
                    
                    return true;
                } catch (error) {
                    console.error('❌ Ошибка сохранения в Firebase:', error);
                    
                    // Проверяем тип ошибки
                    if (error.message && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
                        console.warn('⚠️ Запрос заблокирован клиентом (возможно, блокировщик рекламы)');
                        showNotification('Firebase заблокирован блокировщик рекламы', 'warning');
                    } else if (error.code === 'permission-denied') {
                        console.warn('⚠️ Отказано в доступе к Firestore');
                        showNotification('Отказано в доступе к Firestore', 'error');
                    } else if (error.code === 'unavailable') {
                        console.warn('⚠️ Firestore недоступен');
                        showNotification('Firestore недоступен', 'error');
                    } else if (error.code === 'resource-exhausted') {
                        console.warn('⚠️ Превышены лимиты Firestore');
                        showNotification('Превышены лимиты Firestore', 'warning');
                    } else {
                        showNotification('Ошибка сохранения в Firebase', 'error');
                    }
                    
                    return false;
                }
            }

            // Validate PIN codes
            function validatePinCodes(pinCodes) {
                if (!pinCodes || typeof pinCodes !== 'object') {
                    console.warn('⚠️ PIN-коды отсутствуют или имеют неверный формат');
                    return {};
                }
                
                const validated = {};
                let hasValidPins = false;
                
                // Проверяем каждый PIN-код
                Object.keys(pinCodes).forEach(userName => {
                    const pin = pinCodes[userName];
                    
                    if (pin && typeof pin === 'string' && pin.length === 4 && /^\d{4}$/.test(pin)) {
                        validated[userName] = pin;
                        hasValidPins = true;
                        console.log(`✅ PIN-код для ${userName} валиден: ${pin}`);
                    } else if (pin === null || pin === undefined) {
                        validated[userName] = null;
                        console.log(`🔑 PIN-код для ${userName} не установлен`);
                    } else {
                        console.warn(`⚠️ Некорректный PIN-код для ${userName}: ${pin}`);
                        validated[userName] = null;
                    }
                });
                
                // Не создаем пустые PIN-коды - они должны быть загружены из Firebase
                
                if (hasValidPins) {
                    console.log('✅ PIN-коды прошли валидацию');
                } else {
                    console.log('🔑 Все PIN-коды не установлены');
                }
                
                return validated;
            }

            // Restore data types after loading from Firestore
            function restoreDataTypes(data) {
                if (!data) {
                    console.warn('⚠️ Нет данных для восстановления');
                    return {};
                }
                
                const restored = { ...data };
                
                console.log('🔧 Восстанавливаем типы данных...');
                
                // Функция для безопасного создания Date объекта
                function safeStringToDate(dateValue) {
                    if (!dateValue) return null;
                    
                    try {
                        // Если это Firebase Timestamp объект
                        if (dateValue && typeof dateValue.toDate === 'function') {
                            const date = dateValue.toDate();
                            console.log('🔄 Firebase Timestamp преобразован в Date:', date);
                            return date;
                        }
                        
                        // Если это строка
                        if (typeof dateValue === 'string') {
                            const date = new Date(dateValue);
                            if (!isNaN(date.getTime())) {
                                return date;
                            } else {
                                console.warn('⚠️ Некорректная строка даты:', dateValue);
                                return null;
                            }
                        }
                        
                        // Если это уже Date объект
                        if (dateValue instanceof Date) {
                            return dateValue;
                        }
                        
                        console.warn('⚠️ Неизвестный тип даты:', typeof dateValue, dateValue);
                        return null;
                    } catch (error) {
                        console.warn('⚠️ Ошибка при создании Date:', dateValue, error);
                        return null;
                    }
                }
                
                // Restore Date objects
                if (restored.currentMonth) {
                    const date = safeStringToDate(restored.currentMonth);
                    if (date) {
                        restored.currentMonth = date;
                        console.log('📅 currentMonth восстановлен');
                    } else {
                        restored.currentMonth = new Date();
                        console.log('⚠️ currentMonth установлен по умолчанию');
                    }
                }
                
                if (restored.selectedDate) {
                    const date = safeStringToDate(restored.selectedDate);
                    if (date) {
                        restored.selectedDate = date;
                        console.log('📅 selectedDate восстановлен');
                    } else {
                        restored.selectedDate = new Date();
                        console.log('⚠️ selectedDate установлен по умолчанию');
                    }
                }
                
                if (restored.resetDate) {
                    const date = safeStringToDate(restored.resetDate);
                    if (date) {
                        restored.resetDate = date;
                        console.log('📅 resetDate восстановлен');
                    } else {
                        restored.resetDate = new Date();
                        console.log('⚠️ resetDate установлен по умолчанию');
                    }
                }
                
                // Restore Date objects in activityData
                if (restored.activityData) {
                    let activityCount = 0;
                    Object.keys(restored.activityData).forEach(dateStr => {
                        if (restored.activityData[dateStr] && Array.isArray(restored.activityData[dateStr])) {
                            restored.activityData[dateStr].forEach(activity => {
                                if (activity.completedAt) {
                                    const date = safeStringToDate(activity.completedAt);
                                    if (date) {
                                        activity.completedAt = date;
                                        activityCount++;
                                    } else {
                                        activity.completedAt = null;
                                    }
                                }
                            });
                        }
                    });
                    if (activityCount > 0) {
                        console.log(`📅 Восстановлено ${activityCount} записей активности`);
                    }
                }
                
                // PIN-коды НЕ восстанавливаем из localStorage - только из Firebase
                if (restored.pinCodes) {
                    delete restored.pinCodes;
                    console.log('🔐 PIN-коды удалены из восстановленных данных (загрузка только из Firebase)');
                }
                
                // Обеспечиваем наличие bestWeekXP
                if (restored.progress && typeof restored.progress.bestWeekXP === 'undefined') {
                    restored.progress.bestWeekXP = 0;
                    console.log('🏆 bestWeekXP инициализирован');
                }
                
                // Restore Date objects in tasks
                if (restored.tasks && Array.isArray(restored.tasks)) {
                    let taskCount = 0;
                    restored.tasks.forEach(task => {
                        if (task.createdAt && typeof task.createdAt === 'string') {
                            const date = safeStringToDate(task.createdAt);
                            if (date) {
                                task.createdAt = date;
                                taskCount++;
                            } else {
                                task.createdAt = null;
                            }
                        }
                        if (task.completedAt && typeof task.completedAt === 'string') {
                            const date = safeStringToDate(task.completedAt);
                            if (date) {
                                task.completedAt = date;
                                taskCount++;
                            } else {
                                task.completedAt = null;
                            }
                        }
                    });
                    if (taskCount > 0) {
                        console.log(`📅 Восстановлено ${taskCount} дат в заданиях`);
                    }
                }
                
                // Restore Date objects in rewards
                if (restored.rewards && Array.isArray(restored.rewards)) {
                    let rewardCount = 0;
                    restored.rewards.forEach(reward => {
                        if (reward.createdAt && typeof reward.createdAt === 'string') {
                            const date = safeStringToDate(reward.createdAt);
                            if (date) {
                                reward.createdAt = date;
                                rewardCount++;
                            } else {
                                reward.createdAt = null;
                            }
                        }
                        if (reward.claimedAt && typeof reward.claimedAt === 'string') {
                            const date = safeStringToDate(reward.claimedAt);
                            if (date) {
                                reward.claimedAt = date;
                                rewardCount++;
                            } else {
                                reward.claimedAt = null;
                            }
                        }
                    });
                    if (rewardCount > 0) {
                        console.log(`📅 Восстановлено ${rewardCount} дат в наградах`);
                    }
                }
                
                // Restore Date objects in saveStats
                if (restored.saveStats) {
                    if (restored.saveStats.firstSave && typeof restored.saveStats.firstSave === 'string') {
                        const date = safeStringToDate(restored.saveStats.firstSave);
                        if (date) {
                            restored.saveStats.firstSave = date;
                        } else {
                            restored.saveStats.firstSave = null;
                        }
                    }
                    if (restored.saveStats.lastSave && typeof restored.saveStats.lastSave === 'string') {
                        const date = safeStringToDate(restored.saveStats.lastSave);
                        if (date) {
                            restored.saveStats.lastSave = date;
                        } else {
                            restored.saveStats.lastSave = null;
                        }
                    }
                }
                
                // Restore Date objects in deviceInfo
                if (restored.deviceInfo && restored.deviceInfo.timestamp && typeof restored.deviceInfo.timestamp === 'string') {
                    const date = safeStringToDate(restored.deviceInfo.timestamp);
                    if (date) {
                        restored.deviceInfo.timestamp = date;
                    } else {
                        restored.deviceInfo.timestamp = null;
                    }
                }
                
                // Убеждаемся, что основные поля существуют
                restored.progress = restored.progress || {};
                restored.tasks = restored.tasks || [];
                restored.rewards = restored.rewards || [];
                restored.activityData = restored.activityData || {};
                restored.rewardPlan = restored.rewardPlan || { description: '' };
                
                // Валидируем и восстанавливаем PIN-коды
                restored.pinCodes = validatePinCodes(restored.pinCodes);
                
                console.log('✅ Все типы данных восстановлены');
                return restored;
            }

            // Load state from Firestore
            async function loadStateFromFirestore() {
                if (!isFirebaseAvailable()) {
                    console.log('Firebase недоступен, загружаем только локально');
                    return false;
                }

                try {
                    console.log('📥 Начинаем загрузку из Firebase...');
                    
                    // Сначала пробуем загрузить общие данные
                    let firestoreData = null;
                    let dataSource = 'shared-data';
                    
                    try {
                        const sharedRef = doc(db, 'shared-data', 'main');
                        const sharedSnap = await getDoc(sharedRef);
                        
                        if (sharedSnap.exists()) {
                            firestoreData = sharedSnap.data();
                            console.log('📊 Общие данные найдены в Firebase');
                        } else {
                            // Если общих данных нет, пробуем загрузить данные пользователя
                            const userRef = doc(db, 'users', appState.userName);
                            const userSnap = await getDoc(userRef);
                            
                            if (userSnap.exists()) {
                                firestoreData = userSnap.data();
                                dataSource = 'user-data';
                                console.log('📊 Данные пользователя найдены в Firebase');
                            } else {
                                console.log('📭 Данные не найдены в Firebase');
                                return false;
                            }
                        }
                    } catch (error) {
                        console.error('❌ Ошибка при загрузке данных:', error);
                        return false;
                    }
                    
                    if (firestoreData) {
                        console.log('📊 Данные загружены из Firebase:', {
                            source: dataSource,
                            lastUpdated: firestoreData.lastUpdated,
                            lastSavedBy: firestoreData.lastSavedBy,
                            version: firestoreData.version,
                            totalSaves: firestoreData.saveStats?.totalSaves || 0
                        });
                        
                        // Восстанавливаем типы данных
                        const restoredData = restoreDataTypes(firestoreData);
                        
                        // Сохраняем важные локальные настройки
                        const localSettings = {
                            userName: appState.userName,
                            role: appState.role,
                            isVerified: appState.isVerified,
                            pinCodes: appState.pinCodes // Сохраняем PIN-коды локально
                        };
                        
                        // Сохраняем настройки бэкапов, если они есть в загруженных данных
                        if (restoredData.backupSettings) {
                            console.log('🔄 Загружаем настройки бэкапов из Firebase:', restoredData.backupSettings);
                            localSettings.backupSettings = restoredData.backupSettings;
                        }
                        
                        // Обновляем локальное состояние
                        appState = { ...appState, ...restoredData, ...localSettings };
                        
                        // Пытаемся загрузить backup PIN-кодов из Firebase
                        await loadPinCodesFromFirebase();
                        
                        // Обновляем UI
                        updateProgressDisplay();
                        renderTasks();
                        renderRewards();
                        generateCalendar();
                        updateDayActivity();
                        renderWeeklyChart();
                        
                        console.log('🔄 Данные загружены из Firebase, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                        
                        // 1. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения
                        updateProgressDisplay();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        updateAchievementsBank();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ Данные успешно загружены из Firebase, все показатели пересчитаны');
                        
                        // Автоматическое сохранение отключено при загрузке данных
                        // saveDataToFirebase();
                        
                        // Уведомление о загрузке показывается только при синхронизации
                        
                        // Показываем детальную информацию о загрузке
                        showLoadDetails(firestoreData);
                        
                        return true;
                    }
                    
                    return false;
                } catch (error) {
                    console.error('❌ Ошибка загрузки из Firebase:', error);
                    
                    // Проверяем тип ошибки
                    if (error.message && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
                        console.warn('⚠️ Запрос заблокирован клиентом (возможно, блокировщик рекламы)');
                        showNotification('Firebase заблокирован блокировщиком рекламы', 'warning');
                    } else if (error.code === 'permission-denied') {
                        console.warn('⚠️ Отказано в доступе к Firestore');
                        showNotification('Отказано в доступе к Firestore', 'error');
                    } else if (error.code === 'unavailable') {
                        console.warn('⚠️ Firestore недоступен');
                        showNotification('Firestore недоступен', 'error');
                    } else if (error.code === 'not-found') {
                        console.warn('⚠️ Документ не найден в Firestore');
                        showNotification('Данные не найдены в Firebase', 'info');
                    } else {
                        showNotification('Ошибка загрузки из Firebase', 'error');
                    }
                    
                    return false;
                }
            }

            // Retry mechanism for Firebase operations
            async function retryOperation(operation, maxRetries = 3, delay = 1000) {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        console.log(`🔄 Попытка ${attempt}/${maxRetries}...`);
                        return await operation();
                    } catch (error) {
                        console.warn(`⚠️ Попытка ${attempt} не удалась:`, error.message);
                        
                        if (attempt === maxRetries) {
                            console.error(`❌ Все ${maxRetries} попыток не удались`);
                            throw error;
                        }
                        
                        // Экспоненциальная задержка между попытками
                        const waitTime = delay * Math.pow(2, attempt - 1);
                        console.log(`⏳ Ожидание ${waitTime}ms перед следующей попыткой...`);
                        await new Promise(resolve => safeSetTimeout(resolve, waitTime));
                    }
                }
            }

            // Sync state with Firestore
            async function syncWithFirestore() {
                if (!navigator.onLine) {
                    console.log('Нет интернет-соединения, синхронизация отменена');
                    showNotification('Нет интернет-соединения', 'warning');
                    return false;
                }

                if (!isFirebaseAvailable()) {
                    console.log('Firebase недоступен, синхронизация отменена');
                    showNotification('Firebase недоступен', 'warning');
                    return false;
                }

                try {
                    console.log('🔄 Начинаем синхронизацию с Firebase...');
                    
                    // Показываем индикатор синхронизации
                    showSyncStatus('syncing');
                    
                    // Показываем прогресс синхронизации
                    showNotification('Синхронизация...', 'info');
                    
                    // Сначала загружаем данные из Firestore с retry
                    const loadResult = await retryOperation(async () => {
                        return await loadStateFromFirestore();
                    }, 3, 1000);
                    
                    if (loadResult) {
                        console.log('✅ Общие данные загружены из Firebase');
                        showNotification('Данные загружены из Firebase', 'success');
                        
                        // Затем сохраняем текущее состояние с retry
                        const saveResult = await retryOperation(async () => {
                            return await saveStateToFirestore(false);
                        }, 3, 1000);
                        
                        if (saveResult) {
                            console.log('✅ Синхронизация завершена успешно');
                            showNotification('Синхронизация завершена успешно', 'success');
                            
                            // Показываем успешный статус
                            showSyncStatus('success');
                            
                            // Показываем сводку синхронизации
                            showSyncSummary();
                            
                            console.log('🔄 Синхронизация завершена успешно, пересчитываем все показатели...');
                            
                            // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                            
                            // 1. Пересчитываем лучшую неделю
                            recalculateBestWeek();
                            
                            // 2. Обновляем все отображения
                            updateProgressDisplay();
                            updateBestWeekDisplay();
                            updateRedeemControls();
                            updateProgressWeekSection();
                            updateMonthlyProgressSection();
                            updateWeeklyStars();
                            
                            // 3. Проверяем, что все показатели обновлены
                            console.log('✅ Синхронизация завершена успешно, все показатели пересчитаны');
                            
                            // Обновляем отображение времени обучения
                            updateLearningTimeDisplay();
                            
                            // Автоматическое сохранение отключено при синхронизации
                            // saveDataToFirebase();
                        } else {
                            console.log('⚠️ Синхронизация завершена с предупреждениями');
                            showNotification('Синхронизация завершена с предупреждениями', 'warning');
                            
                            // Показываем статус с предупреждениями
                            showSyncStatus('error', 'С предупреждениями');
                        }
                    } else {
                        console.log('⚠️ Не удалось загрузить общие данные из Firebase');
                        showNotification('Не удалось загрузить данные из Firebase', 'warning');
                        
                        // Показываем статус ошибки
                        showSyncStatus('error', 'Не удалось загрузить');
                    }
                    
                    return true;
                } catch (error) {
                    console.error('❌ Ошибка синхронизации после всех попыток:', error);
                    showNotification(`Ошибка синхронизации: ${error.message}`, 'error');
                    
                    // Показываем статус ошибки
                    showSyncStatus('error', error.message);
                    
                    return false;
                }
            }

            // Show save details modal
            function showSaveDetails(data) {
                const modal = document.createElement('div');
                modal.className = 'modal show';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>💾 Общие данные сохранены в Firebase</h3>
                            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="save-details">
                                <div class="detail-item">
                                    <strong>Сохранено пользователем:</strong> ${data.userName || 'Не указан'}
                                </div>
                                <div class="detail-item">
                                    <strong>Время сохранения:</strong> ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('ru-RU') : 'Не указано'}
                                </div>
                                <div class="detail-item">
                                    <strong>Всего сохранений:</strong> ${data.saveStats?.totalSaves || 0}
                                </div>
                                <div class="detail-item">
                                    <strong>Версия:</strong> ${data.version || 'Не указана'}
                                </div>
                                <div class="detail-item">
                                    <strong>Тип данных:</strong> Общие данные для всех пользователей
                                </div>
                                <div class="detail-item">
                                    <strong>Заданий:</strong> ${data.tasks?.length || 0}
                                </div>
                                <div class="detail-item">
                                    <strong>Наград:</strong> ${data.rewards?.length || 0}
                                </div>
                                <div class="detail-item">
                                    <strong>Активность:</strong> ${Object.keys(data.activityData || {}).length} дней
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            // Show load details modal
            function showLoadDetails(data) {
                const modal = document.createElement('div');
                modal.className = 'modal show';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>📥 Общие данные загружены из Firebase</h3>
                        </div>
                        <div class="modal-body">
                            <div class="load-details">
                                <div class="detail-item">
                                    <strong>Последнее обновление:</strong> ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('ru-RU') : 'Не указано'}
                                </div>
                                <div class="detail-item">
                                    <strong>Кто сохранял:</strong> ${data.lastSavedBy || 'Не указано'}
                                </div>
                                <div class="detail-item">
                                    <strong>Всего сохранений:</strong> ${data.saveStats?.totalSaves || 0}
                                </div>
                                <div class="detail-item">
                                    <strong>Версия:</strong> ${data.version || 'Не указана'}
                                </div>
                                <div class="detail-item">
                                    <strong>Заданий:</strong> ${data.tasks?.length || 0}
                                </div>
                                <div class="detail-item">
                                    <strong>Наград:</strong> ${data.rewards?.length || 0}
                                </div>
                                <div class="detail-item">
                                    <strong>Активность:</strong> ${Object.keys(data.activityData || {}).length} дней
                                </div>
                                <div class="detail-item">
                                    <strong>Тип данных:</strong> Общие данные для всех пользователей
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer centered">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">ОК</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            // Firebase diagnostics
            function diagnoseFirebaseIssues() {
                const issues = [];
                
                // Проверяем доступность Firebase
                if (!isFirebaseAvailable()) {
                    issues.push('❌ Firebase SDK недоступен');
                }
                
                // Проверяем интернет-соединение
                if (!navigator.onLine) {
                    issues.push('❌ Нет интернет-соединения');
                }
                
                // Проверяем блокировщики
                const adBlockers = [
                    'AdBlock',
                    'uBlock',
                    'AdBlock Plus',
                    'Ghostery',
                    'Privacy Badger'
                ];
                
                const hasAdBlocker = adBlockers.some(name => 
                    window[name] || 
                    document.querySelector(`[class*="${name.toLowerCase()}"]`) ||
                    document.querySelector(`[id*="${name.toLowerCase()}"]`)
                );
                
                if (hasAdBlocker) {
                    issues.push('⚠️ Обнаружен блокировщик рекламы');
                }
                
                // Проверяем расширения браузера
                if (navigator.userAgent.includes('Chrome')) {
                    issues.push('ℹ️ Используется Chrome (проверьте расширения)');
                } else if (navigator.userAgent.includes('Firefox')) {
                    issues.push('ℹ️ Используется Firefox (проверьте дополнения)');
                }
                
                return issues;
            }

            // Show Firebase diagnostics modal
            function showFirebaseDiagnostics() {
                const issues = diagnoseFirebaseIssues();
                
                const modal = document.createElement('div');
                modal.className = 'modal show';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>🔍 Диагностика Firebase</h3>
                            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="diagnostics-info">
                                <div class="diagnostic-item">
                                    <strong>Статус Firebase:</strong> 
                                    ${isFirebaseAvailable() ? '✅ Доступен' : '❌ Недоступен'}
                                </div>
                                <div class="diagnostic-item">
                                    <strong>Интернет:</strong> 
                                    ${navigator.onLine ? '✅ Подключен' : '❌ Отключен'}
                                </div>
                                <div class="diagnostic-item">
                                    <strong>Пользователь:</strong> 
                                    ${appState.userName || 'Не указан'}
                                </div>
                                <div class="diagnostic-item">
                                    <strong>Верификация:</strong> 
                                    ${appState.isVerified ? '✅ Верифицирован' : '❌ Не верифицирован'}
                                </div>
                            </div>
                            
                            ${issues.length > 0 ? `
                                <div class="diagnostics-issues">
                                    <h4>⚠️ Обнаруженные проблемы:</h4>
                                    <ul>
                                        ${issues.map(issue => `<li>${issue}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : `
                                <div class="diagnostics-success">
                                    <h4>✅ Проблем не обнаружено</h4>
                                </div>
                            `}
                            
                            <div class="diagnostics-solutions">
                                <h4>🔧 Возможные решения:</h4>
                                <ul>
                                    <li>Отключите блокировщик рекламы для этого сайта</li>
                                    <li>Проверьте расширения браузера</li>
                                    <li>Убедитесь, что интернет-соединение стабильно</li>
                                    <li>Попробуйте другой браузер</li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            // Show sync summary modal
            function showSyncSummary() {
                const modal = document.createElement('div');
                modal.className = 'modal show';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>🔄 Синхронизация завершена</h3>
                        </div>
                        <div class="modal-body">
                            <div class="sync-summary">
                                <div class="summary-item success">
                                    <span class="summary-icon">✅</span>
                                    <span class="summary-text">Общие данные загружены из Firebase</span>
                                </div>
                                <div class="summary-item success">
                                    <span class="summary-icon">💾</span>
                                    <span class="summary-text">Текущее состояние сохранено в Firebase</span>
                                </div>
                                <div class="summary-item info">
                                    <span class="summary-icon">📊</span>
                                    <span class="summary-text">Синхронизация выполнена успешно</span>
                                </div>
                                <div class="summary-item info">
                                    <span class="summary-icon">🕐</span>
                                    <span class="summary-text">Время: ${new Date().toLocaleString('ru-RU')}</span>
                                </div>
                                <div class="summary-item info">
                                    <span class="summary-icon">👥</span>
                                    <span class="summary-text">Данные синхронизированы для всех пользователей</span>
                                </div>
                                <div class="summary-item info">
                                    <span class="summary-icon">🔄</span>
                                    <span class="summary-text">Прогресс обновлен для всех учетных записей</span>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer centered">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Продолжить</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            // Show sync status indicator
            function showSyncStatus(status, message = '') {
                // Удаляем существующий индикатор
                const existingIndicator = document.getElementById('syncStatusIndicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }

                const indicator = document.createElement('div');
                indicator.id = 'syncStatusIndicator';
                indicator.className = `sync-status-indicator ${status}`;
                
                let icon, text;
                switch (status) {
                    case 'syncing':
                        icon = '🔄';
                        text = 'Синхронизация...';
                        break;
                    case 'success':
                        icon = '✅';
                        text = 'Синхронизировано';
                        break;
                    case 'error':
                        icon = '❌';
                        text = 'Ошибка синхронизации';
                        break;
                    case 'offline':
                        icon = '📡';
                        text = 'Офлайн режим';
                        break;
                    default:
                        icon = 'ℹ️';
                        text = message || 'Готово';
                }

                indicator.innerHTML = `
                    <span class="sync-icon">${icon}</span>
                    <span class="sync-text">${text}</span>
                    ${status === 'syncing' ? '<div class="sync-spinner"></div>' : ''}
                `;

                // Добавляем в правый верхний угол
                document.body.appendChild(indicator);
                
                // Автоматически скрываем через 3 секунды для успешных статусов
                if (status === 'success') {
                    safeSetTimeout(() => {
                        if (indicator.parentNode) {
                            indicator.remove();
                        }
                    }, 3000);
                }
            }

            // Update sync status based on connection
            function updateSyncStatus() {
                if (!navigator.onLine) {
                    showSyncStatus('offline');
                } else if (!isFirebaseAvailable()) {
                    showSyncStatus('error', 'Firebase недоступен');
                } else {
                    showSyncStatus('success');
                }
            }

            // Check if first time sync is needed
            async function checkFirstTimeSync() {
                // Проверяем, была ли уже первичная синхронизация
                const hasSyncedBefore = localStorage.getItem('has-synced-before');
                
                // ПЕРВИЧНАЯ СИНХРОНИЗАЦИЯ ВСЕГДА выполняется при запуске
                // если пользователь еще не верифицирован
                if (!appState.isVerified && navigator.onLine && isFirebaseAvailable()) {
                    console.log('🔄 Проверяем необходимость первичной синхронизации...');
                    
                    if (!hasSyncedBefore) {
                        console.log('🔄 Первичная синхронизация...');
                        
                        // Сначала пробуем мигрировать старые данные
                        const migrationResult = await migrateUserDataToShared();
                        if (migrationResult) {
                            console.log('✅ Миграция данных завершена успешно');
                        }
                        
                        // Показываем модальное окно первичной синхронизации
                        showFirstTimeSyncModal();
                    } else {
                        // Если синхронизация уже была, но пользователь не верифицирован,
                        // предлагаем синхронизировать данные
                        console.log('🔄 Пользователь не верифицирован, предлагаем синхронизацию');
                        showSyncPrompt();
                    }
                }
            }
            
            // Show first time sync modal
            function showFirstTimeSyncModal() {
                // Скрываем фон
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.add('show');
                if (container) container.classList.add('hidden');
                
                const modal = document.createElement('div');
                modal.className = 'modal show';
                modal.id = 'firstTimeSyncModal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>🔄 Первичная синхронизация</h3>
                        </div>
                        <div class="modal-body">
                            <div class="sync-animation">
                                <div class="sync-spinner">🔄</div>
                                <p>Загружаем последние данные из Firebase...</p>
                                <div class="sync-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Запускаем анимацию и синхронизацию
                startFirstTimeSync();
            }
            
            // Start first time sync
            async function startFirstTimeSync() {
                try {
                    // Анимация прогресса
                    const progressFill = document.querySelector('.progress-fill');
                    let progress = 0;
                    const progressInterval = setInterval(() => {
                        progress += 2;
                        if (progressFill) progressFill.style.width = progress + '%';
                        if (progress >= 100) clearInterval(progressInterval);
                    }, 50);
                    
                    // Выполняем синхронизацию асинхронно
                    syncWithFirestore().then(syncResult => {
                        // Останавливаем анимацию
                        clearInterval(progressInterval);
                        if (progressFill) progressFill.style.width = '100%';
                        
                        if (syncResult) {
                            console.log('🔄 Первичная синхронизация завершена успешно, пересчитываем все показатели...');
                            
                            // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                            
                            // 1. Пересчитываем лучшую неделю
                            recalculateBestWeek();
                            
                            // 2. Обновляем все отображения
                            updateProgressDisplay();
                            updateBestWeekDisplay();
                            updateRedeemControls();
                            updateProgressWeekSection();
                            updateMonthlyProgressSection();
                            updateWeeklyStars();
                            
                            // 3. Проверяем, что все показатели обновлены
                            console.log('✅ Первичная синхронизация завершена, все показатели пересчитаны');
                            
                            // Автоматическое сохранение отключено при первичной синхронизации
                            // saveDataToFirebase();
                            
                            // Показываем успешную синхронизацию
                            showFirstTimeSyncSuccess();
                            
                            // Отмечаем, что первичная синхронизация выполнена
                            localStorage.setItem('has-synced-before', 'true');
                        } else {
                            // Показываем ошибку синхронизации
                            showFirstTimeSyncError();
                        }
                    }).catch(error => {
                        console.error('❌ Ошибка первичной синхронизации:', error);
                        clearInterval(progressInterval);
                        showFirstTimeSyncError();
                    });
                    
                } catch (error) {
                    console.error('❌ Ошибка запуска синхронизации:', error);
                    showFirstTimeSyncError();
                }
            }
            
            // Show sync prompt for non-verified users
            function showSyncPrompt() {
                const modal = document.createElement('div');
                modal.className = 'modal show';
                modal.id = 'syncPromptModal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>🔄 Синхронизация данных</h3>
                        </div>
                        <div class="modal-body">
                            <p>Для входа в систему необходимо синхронизировать данные с Firebase.</p>
                            <p>Это обеспечит актуальность вашего прогресса и настроек.</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="startManualSync()">
                                🔄 Синхронизировать
                            </button>
                            <button class="btn btn-secondary" onclick="closeSyncPrompt()">
                                Позже
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Скрываем фон
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.add('show');
                if (container) container.classList.add('hidden');
            }
            
            // Start manual sync
            async function startManualSync() {
                closeSyncPrompt();
                showFirstTimeSyncModal();
            }
            
            // Close sync prompt
            function closeSyncPrompt() {
                const modal = document.getElementById('syncPromptModal');
                if (modal) {
                    modal.remove();
                }
                
                // Показываем фон
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.remove('show');
                if (container) container.classList.remove('hidden');
            }
            
            // Show first time sync success
            function showFirstTimeSyncSuccess() {
                const modal = document.getElementById('firstTimeSyncModal');
                if (!modal) return;
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>✅ Синхронизация завершена</h3>
                        </div>
                        <div class="modal-body">
                            <div class="sync-success">
                                <div class="success-icon">✅</div>
                                <p>Данные успешно загружены из Firebase!</p>
                                <p>Теперь вы можете работать с последними сохраненными данными.</p>
                            </div>
                        </div>
                        <div class="modal-footer centered">
                            <button class="btn btn-primary" onclick="closeFirstTimeSyncModal()">Продолжить</button>
                        </div>
                    </div>
                `;
            }
            
            // Show first time sync error
            function showFirstTimeSyncError() {
                const modal = document.getElementById('firstTimeSyncModal');
                if (!modal) return;
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>⚠️ Ошибка синхронизации</h3>
                        </div>
                        <div class="modal-body">
                            <div class="sync-error">
                                <div class="error-icon">⚠️</div>
                                <p>Не удалось загрузить данные из Firebase.</p>
                                <p>Вы можете продолжить работу с локальными данными или попробовать синхронизироваться позже.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="closeFirstTimeSyncModal()">Продолжить</button>
                        </div>
                    </div>
                `;
            }
            
            // Close first time sync modal
            function closeFirstTimeSyncModal() {
                const modal = document.getElementById('firstTimeSyncModal');
                if (modal) {
                    modal.remove();
                }
                
                // Показываем фон
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.remove('show');
                if (container) container.classList.remove('hidden');
            }
            
            // Show account selection modal
            function showAccountSelection() {
                console.log('👤 Показываем выбор учетной записи');
                
                console.log('🔄 Показываем выбор учетной записи, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ ВЫБОРА УЧЕТНОЙ ЗАПИСИ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Выбор учетной записи показан, все показатели пересчитаны');
                
                                        // Применяем роли для правильного отображения блоков настроек
                        applyRolePermissions();
                        
                        // Восстанавливаем состояние блоков (все свернуты по умолчанию)
                        restoreSettingsBlocksState();
                        
                        // Автоматическое сохранение отключено при показе выбора учетной записи
                        // saveDataToFirebase();
                        
                        document.getElementById('accountModal').classList.add('show');
                const overlay = document.getElementById('modalOverlay');
                const container = document.querySelector('.container');
                if (overlay) overlay.classList.add('show');
                if (container) container.classList.add('hidden');
            }
            
            // Migrate old user data to shared collection
            async function migrateUserDataToShared() {
                if (!isFirebaseAvailable() || !navigator.onLine) {
                    return false;
                }
                
                try {
                    console.log('🔄 Начинаем миграцию данных...');
                    
                    // Пробуем загрузить данные Admin
                    const adminRef = doc(db, 'users', 'Admin');
                    const adminSnap = await getDoc(adminRef);
                    
                    // Пробуем загрузить данные Михаила
                    const mikhailRef = doc(db, 'users', 'Михаил');
                    const mikhailSnap = await getDoc(mikhailRef);
                    
                    let bestData = null;
                    let source = 'none';
                    
                    if (adminSnap.exists() && mikhailSnap.exists()) {
                        // Если есть данные обоих пользователей, выбираем более свежие
                        const adminData = adminSnap.data();
                        const mikhailData = mikhailSnap.data();
                        
                        const adminTime = adminData.lastUpdated ? new Date(adminData.lastUpdated) : new Date(0);
                        const mikhailTime = mikhailData.lastUpdated ? new Date(mikhailData.lastUpdated) : new Date(0);
                        
                        if (adminTime > mikhailTime) {
                            bestData = adminData;
                            source = 'Admin';
                        } else {
                            bestData = mikhailData;
                            source = 'Михаил';
                        }
                        
                        console.log(`📊 Выбраны данные от ${source} (более свежие)`);
                    } else if (adminSnap.exists()) {
                        bestData = adminSnap.data();
                        source = 'Admin';
                        console.log('📊 Найдены данные Admin');
                    } else if (mikhailSnap.exists()) {
                        bestData = mikhailSnap.data();
                        source = 'Михаил';
                        console.log('📊 Найдены данные Михаила');
                    }
                    
                    if (bestData) {
                        // Сохраняем в общую коллекцию
                        const sharedRef = doc(db, 'shared-data', 'main');
                        const dataToSave = {
                            ...bestData,
                            lastUpdated: new Date().toISOString(),
                            lastSavedBy: 'Migration',
                            migratedFrom: source,
                            version: '1.0'
                        };
                        
                        await setDoc(sharedRef, dataToSave, { merge: true });
                        console.log(`✅ Данные успешно мигрированы от ${source} в общую коллекцию`);
                        
                        // Удаляем старые данные пользователей
                        if (adminSnap.exists()) {
                            await setDoc(adminRef, { deleted: true, migratedAt: new Date().toISOString() });
                        }
                        if (mikhailSnap.exists()) {
                            await setDoc(mikhailRef, { deleted: true, migratedAt: new Date().toISOString() });
                        }
                        
                        console.log('🔄 Миграция завершена, пересчитываем все показатели...');
                        
                        // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ
                        
                        // 1. Пересчитываем лучшую неделю
                        recalculateBestWeek();
                        
                        // 2. Обновляем все отображения
                        updateProgressDisplay();
                        updateBestWeekDisplay();
                        updateRedeemControls();
                        updateProgressWeekSection();
                        updateMonthlyProgressSection();
                        updateWeeklyStars();
                        
                        // 3. Проверяем, что все показатели обновлены
                        console.log('✅ Миграция завершена, все показатели пересчитаны');
                        
                        // Автоматическое сохранение отключено при миграции данных
                        // saveDataToFirebase();
                        
                        return true;
                    }
                    
                    return false;
                } catch (error) {
                    console.error('❌ Ошибка миграции данных:', error);
                    return false;
                }
            }
            
            // Test Firebase connection
            async function testFirebaseConnection() {
                if (!isFirebaseAvailable()) {
                    console.log('❌ Firebase недоступен');
                    return false;
                }

                try {
                    console.log('🧪 Тестируем подключение к Firebase...');
                    
                    // Пробуем создать тестовый документ
                    const testRef = doc(db, 'test', 'connection-test');
                    await setDoc(testRef, {
                        timestamp: new Date().toISOString(),
                        message: 'Connection test'
                    });
                    
                    console.log('✅ Подключение к Firebase работает!');
                    
                    // Удаляем тестовый документ
                    await setDoc(testRef, {
                        timestamp: new Date().toISOString(),
                        message: 'Connection test - cleaned up'
                    });
                    
                    return true;
                } catch (error) {
                    console.error('❌ Ошибка подключения к Firebase:', error);
                    
                    // Проверяем тип ошибки
                    if (error.message && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
                        console.warn('⚠️ Запрос заблокирован клиентом (возможно, блокировщик рекламы)');
                        showNotification('Firebase заблокирован блокировщиком рекламы', 'warning');
                    } else if (error.code === 'permission-denied') {
                        console.warn('⚠️ Отказано в доступе к Firestore');
                        showNotification('Отказано в доступе к Firestore', 'error');
                    } else if (error.code === 'unavailable') {
                        console.warn('⚠️ Firestore недоступен');
                        showNotification('Firestore недоступен', 'error');
                    }
                    
                    return false;
                }
            }

            // Auto-sync manager
            let autoSyncInterval = null;

            function startAutoSync() {
                // Автосинхронизация отключена - синхронизация только по кнопке
                console.log('Автосинхронизация отключена');
            }

                    function stopAutoSync() {
                if (autoSyncInterval) {
                    clearInterval(autoSyncInterval);
                    autoSyncInterval = null;
                    console.log('Автосинхронизация остановлена');
                }
            }

            // Initialize the app when DOM is loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initApp);
            } else {
                initApp();
            }
        
            // Функция для восстановления состояния блоков настроек
            function restoreSettingsBlocksState() {
                try {
                    const blockTitles = document.querySelectorAll('.settings-block-title');
                    blockTitles.forEach(blockTitle => {
                        const blockName = blockTitle.textContent.trim();
                        const blockContent = blockTitle.nextElementSibling;
                        
                        if (blockContent && blockContent.classList.contains('settings-block-content')) {
                            // ВСЕГДА сворачиваем блоки при запуске/обновлении
                            blockContent.classList.remove('expanded');
                            blockContent.classList.add('collapsed');
                            blockTitle.classList.add('collapsed');
                            console.log('📁 Блок свернут при запуске:', blockName);
                        }
                    });
                    
                    // Очищаем сохраненные состояния, чтобы они не мешали
                    const blockNames = ['Основные настройки', 'Управление PIN-кодами', 'Firebase операции', 'Техническая диагностика', 'Управление данными', 'Опасные операции'];
                    blockNames.forEach(name => {
                        localStorage.removeItem(`settings-block-${name}`);
                    });
                    
                    console.log('✅ Все блоки меню свернуты по умолчанию');
                } catch (error) {
                    console.error('❌ Ошибка восстановления состояния блоков настроек:', error);
                }
            }

            // Функция для переключения блоков настроек
            function toggleSettingsBlock(blockTitle) {
                const blockContent = blockTitle.nextElementSibling;
                if (blockContent && blockContent.classList.contains('settings-block-content')) {
                    const isCurrentlyCollapsed = blockContent.classList.contains('collapsed');
                    
                    if (isCurrentlyCollapsed) {
                        // Разворачиваем блок
                        blockContent.classList.remove('collapsed');
                        blockContent.classList.add('expanded');
                        blockTitle.classList.remove('collapsed');
                        console.log('📂 Блок развернут:', blockTitle.textContent.trim());
                    } else {
                        // Сворачиваем блок
                        blockContent.classList.remove('expanded');
                        blockContent.classList.add('collapsed');
                        blockTitle.classList.add('collapsed');
                        console.log('📁 Блок свернут:', blockTitle.textContent.trim());
                    }
                }
            }

            // Make new functions globally available
            window.savePinCodesToFirebase = savePinCodesToFirebase;
            window.loadPinCodesFromFirebase = loadPinCodesFromFirebase;
            window.validatePinCodes = validatePinCodes;
            window.showSyncStatus = showSyncStatus;
            window.updateSyncStatus = updateSyncStatus;
            window.retryOperation = retryOperation;
            window.forceSyncPinCodes = forceSyncPinCodes;
            window.checkDeviceCapabilities = checkDeviceCapabilities;
            window.forceRestorePinCodes = forceRestorePinCodes;
            window.saveDataToFirebase = saveDataToFirebase;
            
            // Глобальная функция для показа верификации после синхронизации
            window.showVerificationAfterSync = () => {
                console.log('🔐 Проверяем PIN-коды для показа верификации...');
                
                // Проверяем, загружены ли PIN-коды из Firebase
                if (Object.keys(appState.pinCodes).length === 0) {
                    console.log('❌ PIN-коды не загружены из Firebase');
                    showNotification('PIN-коды не загружены. Проверьте интернет-соединение.', 'error');
                    
                    // Показываем выбор учетной записи, если PIN-коды не загружены
                    showAccountSelection();
                    return;
                }
                
                // Проверяем, есть ли у пользователя PIN-код
                const hasPin = appState.pinCodes[appState.userName];
                console.log(`🔐 Результат проверки PIN-кода для ${appState.userName}:`, hasPin ? 'найден' : 'не найден');
                
                if (hasPin) {
                    // Если PIN-код есть, показываем верификацию
                    console.log('🔐 PIN-код найден, показываем верификацию');
                    
                    console.log('🔄 Показываем верификацию, пересчитываем все показатели...');
                    
                    // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПОКАЗОМ ВЕРИФИКАЦИИ
                    
                    // 1. Пересчитываем лучшую неделю
                    recalculateBestWeek();
                    
                    // 2. Обновляем все отображения
                    updateProgressDisplay();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    
                                    // 3. Проверяем, что все показатели обновлены
                console.log('✅ Верификация показана, все показатели пересчитаны');
                
                                        // Автоматическое сохранение отключено при показе верификации
                        // saveDataToFirebase();
                
                showVerificationModal();
                } else {
                    // Если PIN-кода нет, показываем выбор учетной записи
                    console.log('👤 PIN-код не найден, показываем выбор учетной записи');
                    showAccountSelection();
                }
            };

            // Глобальная функция для принудительного показа верификации (для отладки)
            window.forceShowVerification = () => {
                console.log('🔐 Принудительный показ верификации...');
                
                console.log('🔄 Принудительный показ верификации, пересчитываем все показатели...');
                
                // ПОЛНЫЙ ПЕРЕСЧЕТ ВСЕХ ПОКАЗАТЕЛЕЙ ПЕРЕД ПРИНУДИТЕЛЬНЫМ ПОКАЗОМ ВЕРИФИКАЦИИ
                
                // 1. Пересчитываем лучшую неделю
                recalculateBestWeek();
                
                // 2. Обновляем все отображения
                updateProgressDisplay();
                updateBestWeekDisplay();
                updateRedeemControls();
                updateProgressWeekSection();
                updateMonthlyProgressSection();
                updateWeeklyStars();
                
                // 3. Проверяем, что все показатели обновлены
                console.log('✅ Принудительный показ верификации, все показатели пересчитаны');
                
                showVerificationAfterSync();
            };
            
            // Глобальные функции для управления блоками настроек
            window.toggleSettingsBlock = toggleSettingsBlock;
            window.restoreSettingsBlocksState = restoreSettingsBlocksState;
            
            // Глобальные функции для верификации
            window.showVerificationAfterSync = showVerificationAfterSync;

            // ===== NOTIFICATION SYSTEM =====
            
            // Notification queue management
            let notificationQueue = [];
            let isProcessingQueue = false;

            // Create and show popup notification
            function showPopupNotification(type, title, message, icon, onClose) {
                console.log('🔔 showPopupNotification called:', { type, title, message, icon });
                
                const notificationId = Date.now() + Math.random();
                const notification = {
                    id: notificationId,
                    type: type, // 'star' or 'achievement'
                    title: title,
                    message: message,
                    icon: icon,
                    onClose: onClose || (() => {}),
                    element: null
                };

                console.log('🔔 Adding notification to queue:', notification);
                
                // Add to queue
                notificationQueue.push(notification);
                console.log('🔔 Queue length after adding:', notificationQueue.length);

                // Process queue if not already processing
                if (!isProcessingQueue) {
                    console.log('🔔 Processing queue...');
                    processNotificationQueue();
                } else {
                    console.log('🔔 Queue already processing, waiting...');
                }

                return notificationId;
            }

            // Process notification queue
            function processNotificationQueue() {
                console.log('🔔 processNotificationQueue called, queue length:', notificationQueue.length);
                
                if (notificationQueue.length === 0) {
                    console.log('🔔 Queue is empty, stopping processing');
                    isProcessingQueue = false;
                    return;
                }

                isProcessingQueue = true;
                const notification = notificationQueue.shift();
                console.log('🔔 Processing notification:', notification);
                createNotificationElement(notification);
            }

            // Create notification DOM element
            function createNotificationElement(notification) {
                console.log('🔔 createNotificationElement called for:', notification);
                
                // Create notification element directly in body (bypass container issues)
                const notificationEl = document.createElement('div');
                notificationEl.className = `popup-notification ${notification.type}-notification`;
                notificationEl.setAttribute('data-notification-id', notification.id);
                
                // Set all styles inline to ensure they work - centered modal style
                notificationEl.style.cssText = `
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) scale(0.8) !important;
                    z-index: 99999 !important;
                    background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%) !important;
                    border: 3px solid #3b82f6 !important;
                    border-radius: 20px !important;
                    padding: 40px !important;
                    box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1) !important;
                    pointer-events: auto !important;
                    max-width: 600px !important;
                    min-width: 500px !important;
                    opacity: 0 !important;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                `;

                // Create notification content
                notificationEl.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                        <div style="font-size: 3rem;">${notification.icon}</div>
                        <h3 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #1e40af;">${notification.title}</h3>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-line; font-size: 1.1rem;">${notification.message}</p>
                    </div>
                    <div style="display: flex; justify-content: center;">
                        <button onclick="closeNotification(${notification.id})" style="
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            color: white;
                            border: none;
                            border-radius: 12px;
                            padding: 12px 24px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'">
                            Отлично!
                        </button>
                    </div>
                `;

                // Add to body directly (no backdrop)
                document.body.appendChild(notificationEl);
                notification.element = notificationEl;
                console.log('🔔 Notification element added to body:', notificationEl);

                // Show animation
                safeSetTimeout(() => {
                    notificationEl.style.transform = 'translate(-50%, -50%) scale(1)';
                    notificationEl.style.opacity = '1';
                    console.log('🔔 Notification shown:', notification.id);
                }, 100);
            }

            // Close notification
            function closeNotification(notificationId) {
                const notificationEl = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (!notificationEl) {
                    console.warn(`⚠️ Уведомление с ID ${notificationId} не найдено`);
                    return;
                }

                // Find notification object
                const notification = notificationQueue.find(n => n.id === notificationId) || 
                                   { id: notificationId, onClose: () => {} };

                // Hide animation
                notificationEl.style.transform = 'translate(-50%, -50%) scale(0.8)';
                notificationEl.style.opacity = '0';

                // Remove from DOM after animation
                safeSetTimeout(() => {
                    if (notificationEl.parentNode) {
                        notificationEl.parentNode.removeChild(notificationEl);
                    }
                    
                    // Call onClose callback
                    if (notification.onClose) {
                        notification.onClose();
                    }

                    // Process next notification in queue
                    safeSetTimeout(() => {
                        processNotificationQueue();
                    }, 100);
                }, 400);
            }

            // Star notification function removed

            // Achievement notification function removed

            // Show task completion notification
            function showTaskCompletionNotification(task, xpEarned) {
                showPopupNotification(
                    'task',
                    '✅ Задание выполнено!',
                    `${task.name}\n\nПолучено: ${xpEarned} XP`,
                    task.icon,
                    () => {
                        console.log('✅ Task completion notification closed');
                    }
                );
            }

            // Show reward notification
            function showRewardNotification(rewardDescription, starsUsed) {
                showPopupNotification(
                    'reward',
                    '🎁 Награда получена!',
                    `${rewardDescription}\n\nПотрачено: ${starsUsed} ⭐`,
                    '🎁',
                    () => {
                        console.log('🎁 Reward notification closed');
                    }
                );
            }

            // Global function to close notification
            window.closeNotification = closeNotification;

            // Test functions for star and achievement notifications removed



            // Test task completion notification
            window.testTaskNotification = function() {
                const testTask = {
                    name: 'Тестовое задание',
                    icon: '📚'
                };
                showTaskCompletionNotification(testTask, 50);
            };

            // Test reward notification
            window.testRewardNotification = function() {
                showRewardNotification('Тестовая награда', 3);
            };

            // Debug function to check current state
            window.debugNotificationState = function() {
                console.log('🔍 Текущее состояние для уведомлений:');
                console.log('📊 Progress:', {
                    level: appState.progress.level,
                    totalXP: appState.progress.totalXP,
                    weeklyXP: appState.progress.weeklyXP,
                    weeklyStars: appState.progress.weeklyStars,
                    starBank: appState.progress.starBank,
                    lastCheckedLevel: appState.progress.lastCheckedLevel
                });
                console.log('⭐ calculateWeeklyStars result:', calculateWeeklyStars(appState.progress.weeklyXP));
                console.log('🏆 checkForNewAchievements result:', appState.progress.level > (appState.progress.lastCheckedLevel || 0));
            };
            
            // Test function for weekly progress logic
            window.testWeeklyProgress = function() {
                console.log('🧪 Тестирование логики недельного прогресса:');
                
                // Test current week
                const today = new Date();
                const currentWeekStart = getWeekStartForDate(today);
                const currentWeekXP = computeWeekXP(currentWeekStart);
                
                console.log('📅 Текущая неделя:', {
                    today: today.toISOString().split('T')[0],
                    weekStart: currentWeekStart.toISOString().split('T')[0],
                    weekXP: currentWeekXP,
                    progressPercent: getWeeklyProgressPercent(currentWeekXP)
                });
                
                // Test different dates
                const testDates = [
                    new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
                    new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
                    new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)  // 1 month ago
                ];
                
                testDates.forEach((date, index) => {
                    const weekStart = getWeekStartForDate(date);
                    const weekXP = computeWeekXP(weekStart);
                    console.log(`📅 Неделя ${index + 1} назад:`, {
                        date: date.toISOString().split('T')[0],
                        weekStart: weekStart.toISOString().split('T')[0],
                        weekXP: weekXP,
                        progressPercent: getWeeklyProgressPercent(weekXP)
                    });
                });
                
                // Test progress view offset
                const currentOffset = appState.progressView?.weekOffset || 0;
                const viewWeekStart = getWeekStartFromOffset(currentOffset);
                const viewWeekXP = computeWeekXP(viewWeekStart);
                
                console.log('👁️ Текущий просмотр недели:', {
                    offset: currentOffset,
                    weekStart: viewWeekStart.toISOString().split('T')[0],
                    weekXP: viewWeekXP,
                    progressPercent: getWeeklyProgressPercent(viewWeekXP)
                });
            };
            
            // Test function for modal progress preview
            window.testModalProgress = function() {
                console.log('🧪 Тестирование предварительного просмотра в модальном окне:');
                
                // Create a test task
                const testTask = {
                    id: 999999,
                    name: 'Тестовое задание',
                    description: 'Для проверки предварительного просмотра',
                    xpReward: 100,
                    duration: 30,
                    icon: '🧪'
                };
                
                // Show modal
                showTaskCompletionModal(testTask);
                
                console.log('📊 Модальное окно открыто с тестовым заданием (100 XP)');
                console.log('💡 Проверьте в модальном окне:');
                console.log('   - Полоска прогресса должна показывать текущий XP + 100');
                console.log('   - При изменении XP в поле ввода полоска должна обновляться');
                console.log('   - При изменении даты полоска должна пересчитываться для новой недели');
            };

            // Force trigger functions for star and achievement notifications removed

            // Force gain a star for testing
            window.forceGainStar = function() {
                console.log('🧪 Принудительно получаем звезду для тестирования');
                const oldWeeklyXP = appState.progress.weeklyXP;
                const oldWeeklyStars = appState.progress.weeklyStars;
                
                // Add enough XP to get next star
                if (oldWeeklyStars === 0) {
                    appState.progress.weeklyXP = 500; // First star
                } else if (oldWeeklyStars === 1) {
                    appState.progress.weeklyXP = 750; // Second star
                } else {
                    appState.progress.weeklyXP = oldWeeklyXP + 250; // Add more XP
                }
                
                console.log('🧪 Изменили weeklyXP с', oldWeeklyXP, 'на', appState.progress.weeklyXP);
                updateWeeklyStars();
            };

            // Test notification directly
            window.testNotification = function() {
                console.log('🧪 Тестируем уведомление напрямую');
                showPopupNotification('star', '⭐ Тест уведомления!', 'Это тестовое уведомление для проверки видимости', '⭐', () => {
                    console.log('✅ Тестовое уведомление закрыто');
                });
            };

            // ==================== СИСТЕМА БЭКАПОВ ====================

            // Подготовка данных для бэкапа
            function prepareBackupData(type = 'manual', reason = '') {
                const backupData = {
                    // Основные данные приложения
                    progress: appState.progress,
                    tasks: appState.tasks,
                    rewards: appState.rewards,
                    activityData: appState.activityData,
                    rewardPlan: appState.rewardPlan,
                    resetDate: appState.resetDate,
                    
                    // Информация о пользователе
                    user: appState.user,
                    userName: appState.userName,
                    role: appState.role,
                    isVerified: appState.isVerified,
                    pinCodes: appState.pinCodes,
                    
                    // Настройки интерфейса
                    currentMonth: appState.currentMonth,
                    selectedDate: appState.selectedDate,
                    progressView: appState.progressView,
                    
                    // Настройки бэкапов
                    backupSettings: appState.backupSettings,
                    
                    // Метаданные бэкапа
                    backupInfo: {
                        type: type,
                        reason: reason,
                        timestamp: new Date().toISOString(),
                        version: '1.1',
                        exportedBy: appState.userName,
                        exportRole: appState.role,
                        totalTasks: appState.tasks.length,
                        totalRewards: appState.rewards.length,
                        totalActivityDays: Object.keys(appState.activityData).length,
                        currentLevel: appState.progress.level,
                        totalXP: appState.progress.totalXP,
                        starBank: appState.progress.starBank,
                        checksum: calculateChecksum(appState)
                    }
                };
                
                return backupData;
            }

            // Генерация ID бэкапа
            function generateBackupId(type, timestamp = null) {
                const ts = timestamp || new Date();
                const dateStr = ts.toISOString().split('T')[0];
                const timeStr = ts.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
                return `backup-${type}-${dateStr}-${timeStr}`;
            }

            // Расчет контрольной суммы
            function calculateChecksum(data) {
                const str = JSON.stringify(data);
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32bit integer
                }
                return hash.toString(16);
            }

            // Сохранение бэкапа в Firebase
            async function saveBackupToFirebase(backupId, backupData) {
                if (!isFirebaseAvailable()) {
                    throw new Error('Firebase недоступен');
                }

                try {
                    const backupRef = doc(db, 'backups', backupId);
                    await setDoc(backupRef, backupData);
                    
                    console.log('✅ Бэкап сохранен в Firebase:', backupId);
                    return true;
                } catch (error) {
                    console.error('❌ Ошибка сохранения бэкапа:', error);
                    throw error;
                }
            }

            // Создание ручного бэкапа
            async function createManualBackup() {
                if (appState.role === 'viewer' || appState.userName === 'Михаил') {
                    showNotification('Доступ к управлению бэкапами ограничен', 'warning');
                    return;
                }

                try {
                    showNotification('Создание бэкапа...', 'info');
                    
                    const backupData = prepareBackupData('manual', 'Ручное создание');
                    const backupId = generateBackupId('manual');
                    
                    await saveBackupToFirebase(backupId, backupData);
                    
                    // Обновляем настройки
                    appState.backupSettings.lastBackup = new Date().toISOString();
                    updateNextBackupTime();
                    
                    // Сохраняем обновленные настройки
                    try {
                        localStorage.setItem('englishLearningData', JSON.stringify(appState));
                        if (isFirebaseAvailable()) {
                            await saveDataToFirebase();
                        }
                    } catch (error) {
                        console.error('❌ Ошибка сохранения настроек после создания бэкапа:', error);
                    }
                    
                    showNotification('Бэкап создан успешно!', 'success');
                    toggleSettingsMenu();
                } catch (error) {
                    showNotification('Ошибка создания бэкапа: ' + error.message, 'error');
                }
            }

            // Создание автоматического бэкапа
            async function createScheduledBackup() {
                if (!appState.backupSettings.autoBackup) {
                    return;
                }

                try {
                    console.log('🔄 Создание автоматического бэкапа...');
                    
                    const backupData = prepareBackupData('scheduled', 'Автоматический бэкап');
                    const backupId = generateBackupId('scheduled');
                    
                    await saveBackupToFirebase(backupId, backupData);
                    
                    // Обновляем настройки
                    appState.backupSettings.lastBackup = new Date().toISOString();
                    updateNextBackupTime();
                    
                    // Сохраняем обновленные настройки
                    try {
                        localStorage.setItem('englishLearningData', JSON.stringify(appState));
                        if (isFirebaseAvailable()) {
                            await saveDataToFirebase();
                        }
                    } catch (error) {
                        console.error('❌ Ошибка сохранения настроек после автоматического бэкапа:', error);
                    }
                    
                    console.log('✅ Автоматический бэкап создан:', backupId);
                    
                    // Очищаем старые бэкапы
                    await cleanupOldBackups();
                } catch (error) {
                    console.error('❌ Ошибка создания автоматического бэкапа:', error);
                }
            }

            // Обновление времени следующего бэкапа
            function updateNextBackupTime() {
                if (!appState.backupSettings.autoBackup) return;
                
                const now = new Date();
                const frequency = appState.backupSettings.backupFrequency;
                
                let nextBackup = new Date(now);
                
                switch (frequency) {
                    case 'daily':
                        nextBackup.setDate(now.getDate() + 1);
                        nextBackup.setHours(2, 0, 0, 0); // 2:00 утра
                        break;
                    case 'weekly':
                        nextBackup.setDate(now.getDate() + 7);
                        nextBackup.setHours(2, 0, 0, 0);
                        break;
                    case 'monthly':
                        nextBackup.setMonth(now.getMonth() + 1);
                        nextBackup.setHours(2, 0, 0, 0);
                        break;
                }
                
                appState.backupSettings.nextBackup = nextBackup.toISOString();
                console.log('📅 Следующий бэкап запланирован на:', nextBackup.toLocaleString());
            }

            // Проверка необходимости создания бэкапа
            function shouldCreateScheduledBackup() {
                if (!appState.backupSettings.autoBackup) return false;
                if (!appState.backupSettings.nextBackup) return true;
                
                const now = new Date();
                const nextBackup = new Date(appState.backupSettings.nextBackup);
                
                return now >= nextBackup;
            }

            // Очистка старых бэкапов
            async function cleanupOldBackups() {
                if (!isFirebaseAvailable()) return;
                
                try {
                    const backupsRef = collection(db, 'backups');
                    const snapshot = await getDocs(backupsRef);
                    
                    const backups = [];
                    snapshot.forEach(doc => {
                        backups.push({
                            id: doc.id,
                            timestamp: doc.data().backupInfo?.timestamp || doc.id
                        });
                    });
                    
                    // Сортируем по времени (новые первыми)
                    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    // Удаляем старые бэкапы
                    const maxBackups = appState.backupSettings.maxBackups;
                    if (backups.length > maxBackups) {
                        const toDelete = backups.slice(maxBackups);
                        
                        for (const backup of toDelete) {
                            await deleteDoc(doc(db, 'backups', backup.id));
                            console.log('🗑️ Удален старый бэкап:', backup.id);
                        }
                    }
                } catch (error) {
                    console.error('❌ Ошибка очистки старых бэкапов:', error);
                }
            }

            // Запуск проверки автоматических бэкапов
            function startBackupScheduler() {
                // Проверяем каждые 30 минут
                setInterval(async () => {
                    if (shouldCreateScheduledBackup()) {
                        await createScheduledBackup();
                    }
                }, 30 * 60 * 1000);
                
                console.log('⏰ Планировщик бэкапов запущен');
            }

            // Инициализация системы бэкапов
            function initializeBackupSystem() {
                // Убеждаемся, что настройки бэкапов инициализированы
                if (!appState.backupSettings) {
                    appState.backupSettings = {
                        autoBackup: true,
                        backupFrequency: 'daily',
                        maxBackups: 7,
                        lastBackup: null,
                        nextBackup: null,
                        backupTypes: {
                            scheduled: true,
                            manual: true
                        }
                    };
                }
                
                // Устанавливаем время следующего бэкапа если его нет
                if (!appState.backupSettings.nextBackup) {
                    updateNextBackupTime();
                }
                
                // Запускаем планировщик
                startBackupScheduler();
                
                console.log('🔄 Система бэкапов инициализирована');
                console.log('📊 Текущие настройки бэкапов:', appState.backupSettings);
            }

            // Запускаем систему бэкапов после загрузки
            safeSetTimeout(initializeBackupSystem, 2000);

            // ==================== ТЕСТИРОВАНИЕ СИСТЕМЫ БЭКАПОВ ====================

            // Тест сохранения настроек бэкапов
            window.testBackupSettings = function() {
                console.log('🧪 Тестируем систему настроек бэкапов...');
                
                // Проверяем текущие настройки
                console.log('📊 Текущие настройки бэкапов:', appState.backupSettings);
                
                // Изменяем настройки
                const originalSettings = { ...appState.backupSettings };
                appState.backupSettings.autoBackup = false;
                appState.backupSettings.backupFrequency = 'weekly';
                appState.backupSettings.maxBackups = 10;
                
                console.log('🔄 Измененные настройки:', appState.backupSettings);
                
                // Сохраняем в localStorage
                try {
                    localStorage.setItem('englishLearningData', JSON.stringify(appState));
                    console.log('✅ Настройки сохранены в localStorage');
                } catch (error) {
                    console.error('❌ Ошибка сохранения в localStorage:', error);
                }
                
                // Загружаем обратно
                try {
                    const loadedData = JSON.parse(localStorage.getItem('englishLearningData'));
                    console.log('📥 Загруженные настройки бэкапов:', loadedData.backupSettings);
                    
                    if (loadedData.backupSettings.autoBackup === false && 
                        loadedData.backupSettings.backupFrequency === 'weekly' && 
                        loadedData.backupSettings.maxBackups === 10) {
                        console.log('✅ Тест localStorage прошел успешно!');
                    } else {
                        console.error('❌ Тест localStorage не прошел!');
                    }
                } catch (error) {
                    console.error('❌ Ошибка загрузки из localStorage:', error);
                }
                
                // Восстанавливаем оригинальные настройки
                appState.backupSettings = originalSettings;
                localStorage.setItem('englishLearningData', JSON.stringify(appState));
                console.log('🔄 Оригинальные настройки восстановлены');
            };

            // Тест планировщика бэкапов
            window.testBackupScheduler = function() {
                console.log('🧪 Тестируем планировщик бэкапов...');
                
                const now = new Date();
                console.log('🕐 Текущее время:', now.toLocaleString());
                console.log('📅 Следующий бэкап:', appState.backupSettings.nextBackup ? new Date(appState.backupSettings.nextBackup).toLocaleString() : 'Не установлен');
                console.log('⏰ Нужен ли бэкап сейчас:', shouldCreateScheduledBackup());
                
                // Тестируем разные частоты
                const frequencies = ['daily', 'weekly', 'monthly'];
                frequencies.forEach(freq => {
                    const testSettings = { ...appState.backupSettings, backupFrequency: freq };
                    const nextTime = calculateNextBackupTime(testSettings);
                    console.log(`📊 ${freq}: следующий бэкап будет ${nextTime.toLocaleString()}`);
                });
            };

            // Вспомогательная функция для расчета времени следующего бэкапа
            function calculateNextBackupTime(settings) {
                const now = new Date();
                let nextBackup = new Date(now);
                
                switch (settings.backupFrequency) {
                    case 'daily':
                        nextBackup.setDate(now.getDate() + 1);
                        nextBackup.setHours(2, 0, 0, 0);
                        break;
                    case 'weekly':
                        nextBackup.setDate(now.getDate() + 7);
                        nextBackup.setHours(2, 0, 0, 0);
                        break;
                    case 'monthly':
                        nextBackup.setMonth(now.getMonth() + 1);
                        nextBackup.setHours(2, 0, 0, 0);
                        break;
                }
                
                return nextBackup;
            }

            // ==================== UI УПРАВЛЕНИЯ БЭКАПАМИ ====================

            // Показать менеджер бэкапов
            async function showBackupManager() {
                if (appState.role === 'viewer' || appState.userName === 'Михаил') {
                    showNotification('Доступ к управлению бэкапами ограничен', 'warning');
                    return;
                }

                try {
                    showNotification('Загрузка списка бэкапов...', 'info');
                    
                    const backups = await listAllBackups();
                    
                    const modal = document.createElement('div');
                    modal.className = 'modal show';
                    modal.innerHTML = `
                        <div class="modal-content backup-manager-modal">
                            <div class="modal-header">
                                <h3>🔄 Менеджер бэкапов</h3>
                            </div>
                            <div class="modal-body">
                                <div class="backup-stats">
                                    <div class="stat-item">
                                        <span class="stat-label">Всего бэкапов:</span>
                                        <span class="stat-value">${backups.length}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Последний бэкап:</span>
                                        <span class="stat-value">${appState.backupSettings.lastBackup ? new Date(appState.backupSettings.lastBackup).toLocaleString() : 'Никогда'}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Следующий бэкап:</span>
                                        <span class="stat-value">${appState.backupSettings.nextBackup ? new Date(appState.backupSettings.nextBackup).toLocaleString() : 'Не запланирован'}</span>
                                    </div>
                                </div>
                                <div class="backup-list">
                                    <h4>Список бэкапов:</h4>
                                    <div class="backup-items">
                                        ${backups.map(backup => `
                                            <div class="backup-item">
                                                <div class="backup-info">
                                                    <div class="backup-type">${getBackupTypeIcon(backup.type)} ${backup.type}</div>
                                                    <div class="backup-date">${new Date(backup.timestamp).toLocaleString()}</div>
                                                    <div class="backup-details">
                                                        Уровень: ${backup.level} | XP: ${backup.totalXP} | Заданий: ${backup.totalTasks}
                                                    </div>
                                                </div>
                                                <div class="backup-actions">
                                                    <button class="btn btn-sm btn-primary" onclick="restoreFromSpecificBackup('${backup.id}')">
                                                        Восстановить
                                                    </button>
                                                    <button class="btn btn-sm btn-danger" onclick="deleteBackup('${backup.id}')">
                                                        Удалить
                                                    </button>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer centered">
                                <button class="btn btn-primary" onclick="createManualBackup(); this.closest('.modal').remove();">
                                    Создать новый бэкап
                                </button>
                                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                } catch (error) {
                    showNotification('Ошибка загрузки бэкапов: ' + error.message, 'error');
                }
            }

            // Получить список всех бэкапов
            async function listAllBackups() {
                if (!isFirebaseAvailable()) {
                    throw new Error('Firebase недоступен');
                }

                const backupsRef = collection(db, 'backups');
                const snapshot = await getDocs(backupsRef);
                
                const backups = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const backupInfo = data.backupInfo || {};
                    
                    backups.push({
                        id: doc.id,
                        type: backupInfo.type || 'unknown',
                        timestamp: backupInfo.timestamp || doc.id,
                        level: backupInfo.currentLevel || 0,
                        totalXP: backupInfo.totalXP || 0,
                        totalTasks: backupInfo.totalTasks || 0,
                        exportedBy: backupInfo.exportedBy || 'Unknown'
                    });
                });
                
                // Сортируем по времени (новые первыми)
                backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                return backups;
            }

            // Получить иконку типа бэкапа
            function getBackupTypeIcon(type) {
                switch (type) {
                    case 'manual': return '👤';
                    case 'scheduled': return '⏰';
                    default: return '📁';
                }
            }

            // Показать настройки бэкапов
            function showBackupSettings() {
                if (appState.role === 'viewer' || appState.userName === 'Михаил') {
                    showNotification('Доступ к настройкам бэкапов ограничен', 'warning');
                    return;
                }

                console.log('🔧 Текущие настройки бэкапов:', appState.backupSettings);

                const modal = document.createElement('div');
                modal.className = 'modal show';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>⚙️ Настройки бэкапов</h3>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="autoBackupEnabled" ${appState.backupSettings.autoBackup ? 'checked' : ''}>
                                    Автоматические бэкапы
                                </label>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Частота бэкапов:</label>
                                <select id="backupFrequency" class="form-input">
                                    <option value="daily" ${appState.backupSettings.backupFrequency === 'daily' ? 'selected' : ''}>Ежедневно</option>
                                    <option value="weekly" ${appState.backupSettings.backupFrequency === 'weekly' ? 'selected' : ''}>Еженедельно</option>
                                    <option value="monthly" ${appState.backupSettings.backupFrequency === 'monthly' ? 'selected' : ''}>Ежемесячно</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Максимум бэкапов:</label>
                                <input type="number" id="maxBackups" class="form-input" value="${appState.backupSettings.maxBackups || 7}" min="1" max="30">
                            </div>
                            <div class="backup-info">
                                <h4>Информация о бэкапах:</h4>
                                <p><strong>Последний бэкап:</strong> ${appState.backupSettings.lastBackup ? new Date(appState.backupSettings.lastBackup).toLocaleString() : 'Никогда'}</p>
                                <p><strong>Следующий бэкап:</strong> ${appState.backupSettings.nextBackup ? new Date(appState.backupSettings.nextBackup).toLocaleString() : 'Не запланирован'}</p>
                                <p><strong>Текущая частота:</strong> ${getFrequencyText(appState.backupSettings.backupFrequency)}</p>
                                <p><strong>Автоматические бэкапы:</strong> ${appState.backupSettings.autoBackup ? 'Включены' : 'Выключены'}</p>
                            </div>
                        </div>
                        <div class="modal-footer centered">
                            <button class="btn btn-primary" onclick="saveBackupSettings(); this.closest('.modal').remove();">
                                Сохранить
                            </button>
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                                Отмена
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
            }

            // Получить текст частоты бэкапов
            function getFrequencyText(frequency) {
                switch (frequency) {
                    case 'daily': return 'Ежедневно';
                    case 'weekly': return 'Еженедельно';
                    case 'monthly': return 'Ежемесячно';
                    default: return 'Не установлено';
                }
            }

            // Сохранить настройки бэкапов
            async function saveBackupSettings() {
                const autoBackup = document.getElementById('autoBackupEnabled').checked;
                const frequency = document.getElementById('backupFrequency').value;
                const maxBackups = parseInt(document.getElementById('maxBackups').value);
                
                console.log('💾 Сохраняем настройки бэкапов:', { autoBackup, frequency, maxBackups });
                
                // Обновляем настройки в appState
                appState.backupSettings.autoBackup = autoBackup;
                appState.backupSettings.backupFrequency = frequency;
                appState.backupSettings.maxBackups = maxBackups;
                
                // Обновляем время следующего бэкапа
                updateNextBackupTime();
                
                console.log('📊 Обновленные настройки бэкапов:', appState.backupSettings);
                
                // Сохраняем в localStorage
                try {
                    localStorage.setItem('englishLearningData', JSON.stringify(appState));
                    console.log('✅ Настройки бэкапов сохранены в localStorage');
                } catch (error) {
                    console.error('❌ Ошибка сохранения в localStorage:', error);
                    showNotification('Ошибка сохранения в localStorage', 'error');
                    return;
                }
                
                // Синхронизируем с Firebase
                try {
                    if (isFirebaseAvailable()) {
                        await saveDataToFirebase();
                        console.log('✅ Настройки бэкапов синхронизированы с Firebase');
                    }
                } catch (error) {
                    console.error('❌ Ошибка синхронизации с Firebase:', error);
                    showNotification('Настройки сохранены локально, но не синхронизированы с Firebase', 'warning');
                    return;
                }
                
                showNotification('Настройки бэкапов сохранены!', 'success');
            }

            // Восстановить из бэкапа (общий)
            async function restoreFromBackup() {
                if (appState.role === 'viewer' || appState.userName === 'Михаил') {
                    showNotification('Доступ к восстановлению из бэкапов ограничен', 'warning');
                    return;
                }

                try {
                    const backups = await listAllBackups();
                    
                    if (backups.length === 0) {
                        showNotification('Бэкапы не найдены', 'warning');
                        return;
                    }
                    
                    // Показываем список бэкапов для выбора
                    showBackupManager();
                } catch (error) {
                    showNotification('Ошибка загрузки бэкапов: ' + error.message, 'error');
                }
            }

            // Восстановить из конкретного бэкапа
            async function restoreFromSpecificBackup(backupId) {
                if (appState.role === 'viewer' || appState.userName === 'Михаил') {
                    showNotification('Доступ к восстановлению из бэкапов ограничен', 'warning');
                    return;
                }

                if (!confirm('Вы уверены, что хотите восстановить данные из этого бэкапа? Текущие данные будут заменены.')) {
                    return;
                }

                try {
                    showNotification('Восстановление из бэкапа...', 'info');
                    
                    const backupRef = doc(db, 'backups', backupId);
                    const backupDoc = await getDoc(backupRef);
                    
                    if (!backupDoc.exists()) {
                        throw new Error('Бэкап не найден');
                    }
                    
                    const backupData = backupDoc.data();
                    
                    // ВАЖНО: Восстанавливаем типы данных из бэкапа
                    console.log('🔧 Восстанавливаем типы данных из бэкапа...');
                    const restoredData = restoreDataTypes(backupData);
                    
                    // Восстанавливаем данные с правильными типами
                    appState.progress = restoredData.progress || backupData.progress;
                    appState.tasks = restoredData.tasks || backupData.tasks;
                    appState.rewards = restoredData.rewards || backupData.rewards;
                    appState.activityData = restoredData.activityData || backupData.activityData;
                    appState.rewardPlan = restoredData.rewardPlan || backupData.rewardPlan;
                    appState.resetDate = restoredData.resetDate || backupData.resetDate;
                    appState.user = restoredData.user || backupData.user;
                    appState.userName = restoredData.userName || backupData.userName;
                    appState.role = restoredData.role || backupData.role;
                    appState.isVerified = restoredData.isVerified || backupData.isVerified;
                    appState.pinCodes = restoredData.pinCodes || backupData.pinCodes;
                    appState.currentMonth = restoredData.currentMonth || backupData.currentMonth;
                    appState.selectedDate = restoredData.selectedDate || backupData.selectedDate;
                    appState.progressView = restoredData.progressView || backupData.progressView;
                    
                    // ВАЖНО: Сбрасываем флаг инициализации для разрешения сохранения
                    appState.isInitializing = false;
                    console.log('🔄 Флаг инициализации сброшен после восстановления из бэкапа');
                    
                    // ВАЖНО: Очищаем кэш DOM элементов для корректного обновления
                    Object.keys(DOM_CACHE).forEach(key => {
                        DOM_CACHE[key] = null;
                    });
                    console.log('🔄 Кэш DOM элементов очищен после восстановления из бэкапа');
                    
                    // Обновляем UI
                    updateProgressDisplay();
                    renderTasks();
                    renderRewards();
                    generateCalendar();
                    updateDayActivity();
                    renderWeeklyChart();
                    updateBestWeekDisplay();
                    updateRedeemControls();
                    updateProgressWeekSection();
                    updateMonthlyProgressSection();
                    updateWeeklyStars();
                    updateAchievementsBank();
                    updateLearningTimeDisplay();
                    
                    // ВАЖНО: Сохраняем восстановленные данные локально и в Firebase
                    console.log('💾 Сохраняем восстановленные данные локально...');
                    const localSaveResult = saveState();
                    
                    console.log('💾 Сохраняем восстановленные данные в Firebase...');
                    const firebaseSaveResult = await saveDataToFirebaseSilent();
                    
                    if (localSaveResult && firebaseSaveResult) {
                        console.log('✅ Восстановленные данные успешно сохранены локально и в Firebase');
                        showNotification('Данные восстановлены из бэкапа и сохранены!', 'success');
                    } else if (localSaveResult) {
                        console.log('✅ Восстановленные данные сохранены локально, Firebase недоступен');
                        showNotification('Данные восстановлены из бэкапа и сохранены локально', 'success');
                    } else if (firebaseSaveResult) {
                        console.log('✅ Восстановленные данные сохранены в Firebase, localStorage недоступен');
                        showNotification('Данные восстановлены из бэкапа и сохранены в Firebase', 'success');
                    } else {
                        console.warn('⚠️ Не удалось сохранить восстановленные данные');
                        showNotification('Данные восстановлены из бэкапа, но не сохранены', 'warning');
                    }
                    
                    // Закрываем модальное окно менеджера
                    const modal = document.querySelector('.backup-manager-modal');
                    if (modal) {
                        modal.closest('.modal').remove();
                    }
                } catch (error) {
                    showNotification('Ошибка восстановления: ' + error.message, 'error');
                }
            }

            // Удалить бэкап
            async function deleteBackup(backupId) {
                if (appState.role === 'viewer' || appState.userName === 'Михаил') {
                    showNotification('Доступ к удалению бэкапов ограничен', 'warning');
                    return;
                }

                if (!confirm('Вы уверены, что хотите удалить этот бэкап?')) {
                    return;
                }

                try {
                    await deleteDoc(doc(db, 'backups', backupId));
                    showNotification('Бэкап удален!', 'success');
                    
                    // Обновляем список бэкапов
                    const modal = document.querySelector('.backup-manager-modal');
                    if (modal) {
                        modal.closest('.modal').remove();
                        showBackupManager();
                    }
                } catch (error) {
                    showNotification('Ошибка удаления бэкапа: ' + error.message, 'error');
                }
            }
        
        