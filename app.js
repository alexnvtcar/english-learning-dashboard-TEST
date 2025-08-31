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
                    id: "demo-user",
                    username: "demo",
                },
                role: 'viewer',
                userName: 'Михаил',
                pinCodes: {}, // PIN-коды загружаются только из Firebase
                isVerified: false,
                progress: {
                    level: 15,
                    totalXP: 4250,
                    currentLevelXP: 0,
                    streak: 12,
                    weeklyXP: 340,
                    weeklyStars: 0,
                    starBank: 0,
                    weekStartKey: null,
                },
                demoAnalytics: { enabled: false },
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
            };

            // Demo analytics helpers
            let demoStateCache = null;
            function seededRandom(seed) {
                let x = 0;
                for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
                return function() {
                    // xorshift32
                    x ^= x << 13; x >>>= 0;
                    x ^= x >>> 17; x >>>= 0;
                    x ^= x << 5; x >>>= 0;
                    return (x >>> 0) / 0xffffffff;
                };
            }
            function randomInRange(rng, min, max) {
                return Math.floor(rng() * (max - min + 1)) + min;
            }
            function buildDemoState() {
                const rng = seededRandom('english-analytics-demo');
                const today = new Date();
                const start = new Date();
                start.setMonth(start.getMonth() - 6);
                start.setHours(0,0,0,0);

                const activityData = {};
                const taskCatalog = [
                    { name: 'Изучение новых слов', xp: 40, category: 'vocabulary' },
                    { name: 'Грамматические упражнения', xp: 60, category: 'grammar' },
                    { name: 'Аудирование', xp: 50, category: 'listening' },
                    { name: 'Разговорная практика', xp: 70, category: 'speaking' },
                    { name: 'Чтение текста', xp: 45, category: 'reading' },
                ];

                // simulate daily activity with weekly cycles and occasional spikes
                let cursor = new Date(start);
                let totalXP = 0;
                const weekTotals = {};
                while (cursor <= today) {
                    const dateKey = formatDate(cursor);
                    const day = cursor.getDay(); // 0..6
                    const isWeekend = day === 0 || day === 6;
                    const sessions = isWeekend ? (rng() < 0.35 ? 1 : 0) : (rng() < 0.85 ? (rng() < 0.5 ? 2 : 1) : 0);
                    if (sessions > 0) {
                        activityData[dateKey] = [];
                        for (let s = 0; s < sessions; s++) {
                            const t = taskCatalog[randomInRange(rng, 0, taskCatalog.length - 1)];
                            const variance = randomInRange(rng, -15, 25);
                            const xp = Math.max(15, t.xp + variance);
                            totalXP += xp;
                            activityData[dateKey].push({
                                taskId: s + 1,
                                taskName: t.name,
                                xpEarned: xp,
                                completedAt: new Date(cursor),
                                category: t.category,
                            });
                        }
                        const weekKey = getWeekStartKey(cursor);
                        weekTotals[weekKey] = (weekTotals[weekKey] || 0) + activityData[dateKey].reduce((a,b)=>a+(b.xpEarned||0),0);
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }

                // compute level based on 810 xp per level
                const xpPerLevel = 810;
                const level = Math.min(100, Math.floor(totalXP / xpPerLevel) + 1);
                const currentLevelXP = level >= 100 ? 0 : (totalXP % xpPerLevel);

                // current week
                const currentWeekKey = getWeekStartKey(new Date());
                const weeklyXP = weekTotals[currentWeekKey] || 0;
                const weeklyStars = calculateWeeklyStars(weeklyXP);

                // stars and rewards demo
                let totalStars = 0;
                Object.values(weekTotals).forEach(xp => totalStars += calculateWeeklyStars(xp));
                const rewardsCount = Math.max(1, Math.floor(totalStars / 5));
                const rewards = [];
                for (let i = 0; i < rewardsCount; i++) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i * 14 - randomInRange(rng, 0, 3));
                    rewards.push({ id: Date.now() - i, description: 'Демо-награда #' + (i+1), starsUsed: 3, redeemedAt: d });
                }
                const starBank = Math.max(0, totalStars - rewards.length * 3);

                return {
                    user: appState.user,
                    userName: appState.userName || 'Михаил',
                    progress: {
                        level,
                        totalXP,
                        currentLevelXP,
                        streak: 0,
                        weeklyXP,
                        weeklyStars,
                        starBank,
                        weekStartKey: currentWeekKey,
                    },
                    tasks: appState.tasks,
                    rewards,
                    currentMonth: appState.currentMonth,
                    selectedDate: appState.selectedDate,
                    activityData,
                    rewardPlan: { description: 'Демо: поход в кино' },
                    resetDate: start,
                    demoAnalytics: { enabled: true },
                };
            }
            function getEffectiveState() {
                if (appState.demoAnalytics && appState.demoAnalytics.enabled) {
                    if (!demoStateCache) demoStateCache = buildDemoState();
                    return demoStateCache;
                }
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
                    
                } catch (e) {
                    console.error('❌ Ошибка загрузки локального состояния:', e);
                    // Устанавливаем значения по умолчанию при ошибке
                    appState.currentMonth = new Date();
                    appState.selectedDate = new Date();
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
                        
                        // Обновляем локальное состояние
                        appState = { ...appState, ...restoredData, ...localSettings };
                        
                        // Обновляем UI
                        updateProgressDisplay();
                        renderTasks();
                        renderRewards();
                        generateCalendar();
                        updateDayActivity();
                        renderWeeklyChart();
                        
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
                

            }

            function showNotification(message, type = "success") {
                const notification = document.getElementById("notification");
                const messageEl = document.getElementById(
                    "notificationMessage",
                );

                messageEl.textContent = message;
                notification.className = `notification ${type} show`;

                setTimeout(() => {
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
                return thresholds.filter((threshold) => weeklyXP >= threshold).length;
            }

            // DOM Updates
            function updateProgressDisplay() {
                const { progress } = appState;

                document.getElementById("currentLevel").textContent =
                    progress.level;
                document.getElementById("totalXP").textContent =
                    progress.totalXP.toLocaleString();
                updateStreakDisplay();

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

            function updateStreakDisplay() {
                const start = new Date(appState.resetDate || new Date());
                const today = new Date();
                let studied = 0;
                let totalEligible = 0;
                iterateDays(start, today, (d) => {
                    if (isWeekday(d)) {
                        totalEligible += 1;
                        if (hasActivityOn(d)) studied += 1;
                    }
                });
                const text = `${studied} / ${totalEligible}`;
                const el = document.getElementById('currentStreak');
                if (el) el.textContent = text;
            }

            function updateWeeklyStars() {
                const stars = document.querySelectorAll("#weeklyStars .star");
                const newEarned = calculateWeeklyStars(appState.progress.weeklyXP);
                if (newEarned > (appState.progress.weeklyStars || 0)) {
                    appState.progress.starBank = (appState.progress.starBank || 0) + (newEarned - (appState.progress.weeklyStars || 0));
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
                        starBank: 0
                    };
                }
                
                const currentKey = getWeekStartKey(new Date());
                if (appState.progress.weekStartKey !== currentKey) {
                    appState.progress.weekStartKey = currentKey;
                    appState.progress.weeklyXP = 0;
                    appState.progress.weeklyStars = 0;
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
                const weeklyProgressPct = calculateXPProgress(weekXP, 750);
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
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1);
                const daysInMonth = Math.round((nextMonth - monthStart)/(24*60*60*1000));
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
                const taskList = document.getElementById("taskList");
                taskList.innerHTML = appState.tasks
                    .map(
                        (task) => `
                <div class="task-item">
                    <div class="task-info" onclick="completeTask(event, ${task.id})" onkeydown="if(event.key==='Enter'||event.key===' '){completeTask(event, ${task.id})}" role="button" tabindex="0" style="flex: 1; cursor: pointer;">
                        <div class="task-icon">
                            ${task.icon}
                        </div>
                        <div class="task-details">
                            <h4>${escapeHTML(task.name)}</h4>
                            <p>${escapeHTML(task.description)} • ${task.duration} мин</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="task-reward">
                            ⭐
                            +${task.xpReward} XP
                        </div>
                        <button class="btn-icon-delete" onclick="deleteTask(${task.id})" title="Удалить задание" aria-label="Удалить задание">
                            🗑️
                        </button>
                    </div>
                </div>
            `,
                    )
                    .join("");
            }

            function renderRewards() {
                const rewardsList = document.getElementById("rewardsList");

                if (appState.rewards.length === 0) {
                    rewardsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #64748b; font-size: 0.875rem;">
                        Пока нет полученных наград
                    </div>
                `;
                    return;
                }

                const cards = appState.rewards.slice(-9).reverse().map(reward => `
                    <div class="reward-card" title="${new Date(reward.redeemedAt).toLocaleDateString('ru-RU')}">
                        <div class="rc-top">
                            <span class="reward-chip">⭐ -${reward.starsUsed} ⭐</span>
                            🎁
                        </div>
                        <div class="reward-title">${escapeHTML(reward.description)}</div>
                        <div class="reward-date-2">${new Date(reward.redeemedAt).toLocaleDateString('ru-RU')}</div>
                    </div>
                `).join('');
                rewardsList.innerHTML = `<div class="rewards-grid">${cards}</div>`;
            }

            function clearRewards() {
                if (confirm('Удалить ВСЕ сохраненные награды?')) {
                    appState.rewards = [];
                    renderRewards();
                    showNotification('Все награды удалены', 'info');
                    // Автоматическое сохранение отключено
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
                    if (hasActivity) classes += " active";
                    if (!isCurrentMonth) classes += " other-month";

                    days += `
                    <div class="${classes}" onclick="selectDate('${dayStr}')">
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
                    dayActivity.innerHTML = `
                    <div style="color: #059669; font-weight: 600;">
                        Выполнено заданий: ${activity.length} • Получено XP: +${totalXP}
                    </div>
                    <div style="margin-top: 8px;">
                        ${activity
                            .map(
                                (log, index) => `
                            <div class="activity-item" data-date="${selectedDateStr}" data-index="${index}">
                                ${escapeHTML(log.taskName)} (+${log.xpEarned} XP)
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

                // Animate task completion
                const taskElement = e.currentTarget.closest('.task-item');
                taskElement.classList.add("task-completed");

                setTimeout(() => {
                    ensureWeeklyReset();
                    // Update progress
                    appState.progress.totalXP += task.xpReward;
                    appState.progress.currentLevelXP += task.xpReward;
                    appState.progress.weeklyXP += task.xpReward;

                    // Check for level up
                    let xpNeeded = getXPRequiredForLevel(appState.progress.level);
                    let leveledUp = false;
                    while (xpNeeded > 0 && appState.progress.currentLevelXP >= xpNeeded && appState.progress.level < 100) {
                        appState.progress.currentLevelXP -= xpNeeded;
                        appState.progress.level += 1;
                        leveledUp = true;
                        xpNeeded = getXPRequiredForLevel(appState.progress.level);
                    }
                    if (appState.progress.level >= 100) {
                        appState.progress.level = 100;
                        appState.progress.currentLevelXP = 0;
                    }

                    if (leveledUp) {
                        showNotification(
                            `Поздравляем! Вы достигли ${appState.progress.level} уровня!`,
                            "success",
                        );
                        document.getElementById("currentLevel").classList.add("level-up");
                        setTimeout(() => {
                            document.getElementById("currentLevel").classList.remove("level-up");
                        }, 1000);
                    } else {
                        showNotification(`Задание выполнено! +${task.xpReward} XP`, "success");
                    }

                    // Log activity
                    const today = formatDate(new Date());
                    if (!appState.activityData[today]) {
                        appState.activityData[today] = [];
                    }
                    appState.activityData[today].push({
                        taskId: task.id,
                        taskName: task.name,
                        xpEarned: task.xpReward,
                        completedAt: new Date(),
                    });

                    // Update displays
                    updateProgressDisplay();
                    generateCalendar();
                    updateDayActivity();
                    renderWeeklyChart();
                    // Автоматическое сохранение отключено

                    taskElement.classList.remove("task-completed");
                }, 600);
            }

            function addTask(event) {
                event.preventDefault();

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

                // Если поле Название задания содержит специальную команду очистки
                if (name.trim().toLowerCase() === 'очистить' || name.trim().toLowerCase() === 'clear') {
                    if (confirm('Очистить все сохраненные задания?')) {
                        appState.tasks = [];
                        renderTasks();
                        showNotification('Все задания очищены', 'info');
                        // Автоматическое сохранение отключено
                    }
                    document.getElementById("taskForm").reset();
                    return;
                }

                if (Number.isNaN(xpReward)) xpReward = 50;
                if (Number.isNaN(duration)) duration = 15;
                xpReward = Math.min(500, Math.max(10, xpReward));
                duration = Math.min(120, Math.max(5, duration));

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
                renderTasks();
                hideTaskModal();
                showNotification("Новое задание добавлено!", "success");
                // Автоматическое сохранение отключено

                // Reset form
                document.getElementById("taskForm").reset();
                renderWeeklyChart();
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
                appState.progress.starBank -= starsCost;
                appState.rewardPlan = { description: "" };

                renderRewards();
                updateWeeklyStars();
                hideRewardModal();
                showNotification("Награда получена!", "success");
                // Автоматическое сохранение отключено

                // Reset form
                document.getElementById("rewardForm").reset();
                updateRedeemControls();
            }

            function selectDate(dateStr) {
                appState.selectedDate = new Date(dateStr);
                generateCalendar();
                updateDayActivity();
                // Автоматическое сохранение отключено
                renderWeeklyChart();
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
                document.getElementById("taskModal").classList.add("show");
                populateIconSelector(); // Populate icons when modal opens
            }

            function hideTaskModal() {
                document.getElementById("taskModal").classList.remove("show");
                // Reset icon selection to first icon
                setTimeout(() => {
                    const firstIcon = document.querySelector('.icon-option');
                    if (firstIcon) {
                        document.querySelectorAll('.icon-option').forEach(option => {
                            option.classList.remove('selected');
                        });
                        firstIcon.classList.add('selected');
                    }
                }, 100);
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
                document.getElementById("rewardModal").classList.add("show");
            }
            // Idea Modal
            function showIdeaModal() {
                // Блокируем повторное придумывание, если уже есть запланированная награда
                if (appState.rewardPlan && appState.rewardPlan.description) {
                    showNotification('Награда уже запланирована. Сначала получите её, чтобы придумать новую.', 'info');
                    return;
                }
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
                        appState.rewards = [];
                        renderRewards();
                        showNotification('Все награды очищены', 'info');
                        saveState();
                    }
                    document.getElementById('ideaForm').reset();
                    hideIdeaModal();
                    updateRedeemControls();
                    return;
                }
                appState.rewardPlan = { description: desc };
                addIdea(desc);
                hideIdeaModal();
                updateRedeemControls();
                showNotification('Награда сохранена!', 'success');
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
                
                // Добавляем демо-активность только если её нет
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
                            completedAt: new Date(),
                        },
                    ];

                    appState.activityData[yesterday] = [
                        {
                            taskId: 2,
                            taskName: "Грамматические упражнения",
                            xpEarned: 75,
                            completedAt: new Date(Date.now() - 86400000),
                        },
                        {
                            taskId: 3,
                            taskName: "Аудирование",
                            xpEarned: 60,
                            completedAt: new Date(Date.now() - 86400000),
                        },
                    ];
                }

                // Устанавливаем роль по умолчанию
                if (!appState.role) appState.role = 'viewer';
                
                // Инициализируем пустые PIN-коды (они загружаются только из Firebase)
                if (!appState.pinCodes) {
                    appState.pinCodes = {};
                    console.log('🔑 PIN-коды инициализированы как пустые (загрузка только из Firebase)');
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
                        showVerificationModal();
                    } else {
                        // Если PIN-кода нет, показываем выбор учетной записи
                        console.log('👤 PIN-код не найден, показываем выбор учетной записи');
                        showAccountSelection();
                    }
                };

                // Обновляем UI
                updateProgressDisplay();
                renderTasks();
                renderRewards();
                generateCalendar();
                updateDayActivity();
                renderWeeklyChart();
                updateRedeemControls();
                populateIconSelector();
                
                // Добавляем обработчики для кнопок Firebase
                const testFirebaseBtn = document.getElementById('testFirebaseBtn');
                if (testFirebaseBtn) {
                    testFirebaseBtn.addEventListener('click', testFirebaseConnection);
                }
                
                console.log('✅ Приложение инициализировано');
                
                // Инициализируем статус синхронизации
                updateSyncStatus();
                
                // Проверяем, нужна ли первичная синхронизация (с задержкой, чтобы не мешать загрузке PIN-кодов)
                setTimeout(() => {
                    checkFirstTimeSync();
                }, 1000);
                
                // Резервный таймаут - если что-то пошло не так, показываем верификацию через 10 секунд
                const fallbackTimeout = setTimeout(() => {
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
            }

            // Delete Task Function
            function deleteTask(taskId) {
                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: удаление заданий недоступно', 'warning');
                    return;
                }
                
                if (confirm('Вы уверены, что хотите удалить это задание?')) {
                    appState.tasks = appState.tasks.filter(task => task.id !== taskId);
                    renderTasks();
                    showNotification('Задание удалено', 'info');
                    // Автоматическое сохранение отключено
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

                const activity = appState.activityData[dateStr];
                if (!activity || !activity[index]) return;

                const deletedLog = activity[index];
                const deletedXP = deletedLog.xpEarned;

                // Remove the activity log
                activity.splice(index, 1);
                if (activity.length === 0) {
                    delete appState.activityData[dateStr];
                }

                // Recalculate all progress from scratch
                recalculateAllProgress();

                // Update all displays
                updateProgressDisplay();
                generateCalendar();
                updateDayActivity();
                renderWeeklyChart();
                updateRedeemControls();
                // Автоматическое сохранение отключено

                showNotification(`Активность удалена (-${deletedXP} XP)`, 'info');
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
                    if (!weeklyData[weekKey]) weeklyData[weekKey] = 0;
                    weeklyData[weekKey] += dayXP;
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
                appState.progress.weeklyXP = weeklyData[currentWeekKey] || 0;
                appState.progress.weekStartKey = currentWeekKey;

                // Calculate stars earned this week and transfer to star bank
                const weeklyStars = calculateWeeklyStars(appState.progress.weeklyXP);
                appState.progress.weeklyStars = weeklyStars;

                // Calculate total star bank from all weeks
                let totalStars = 0;
                for (const weekKey in weeklyData) {
                    const weekXP = weeklyData[weekKey];
                    totalStars += calculateWeeklyStars(weekXP);
                }
                appState.progress.starBank = Math.max(0, totalStars - (appState.rewards.length * 3));
            }

            function clearTasks() {
                // Проверяем роль пользователя
                if (appState.role === 'viewer') {
                    showNotification('Режим просмотра: очистка заданий недоступна', 'warning');
                    return;
                }
                
                if (confirm('Удалить ВСЕ сохраненные задания?')) {
                    appState.tasks = [];
                    renderTasks();
                    showNotification('Все задания удалены', 'info');
                    // Автоматическое сохранение отключено
                }
            }

            // Settings Functions
            function toggleSettingsMenu() {
                const menu = document.getElementById('settingsMenu');
                menu.classList.toggle('show');
                const btn = document.querySelector('.settings-btn');
                if (btn) btn.setAttribute('aria-expanded', menu.classList.contains('show') ? 'true' : 'false');
            }

            

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
                    
                    updateProgressDisplay(); renderTasks(); renderRewards(); generateCalendar(); updateDayActivity(); renderWeeklyChart(); updateRedeemControls(); // Автоматическое сохранение отключено
                    showNotification('Состояние синхронизировано', 'success');
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
                    progress: appState.progress,
                    tasks: appState.tasks,
                    rewards: appState.rewards,
                    activityData: appState.activityData,
                    rewardPlan: appState.rewardPlan,
                    resetDate: appState.resetDate,
                    userName: appState.userName,
                    pinCodes: appState.pinCodes,
                    exportDate: new Date().toISOString(),
                    version: '1.0'
                };

                const dataStr = JSON.stringify(dataToExport, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `english-learning-progress-${formatDate(new Date())}.json`;
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
                updateProgressDisplay(); renderTasks(); renderRewards(); generateCalendar(); updateDayActivity(); renderWeeklyChart(); updateRedeemControls(); saveState();
                showNotification('Слепок применен', 'success');
            }

            // Chart.js optional integration (loaded online) with fallback to existing DOM charts
            let analyticsCharts = [];
            async function tryLoadChartJs() {
                if (window.Chart && typeof window.Chart === 'function') return true;
                try {
                    await loadExternalScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js');
                    return !!window.Chart;
                } catch { return false; }
            }
            function destroyAnalyticsCharts() { analyticsCharts.forEach(ch => { try { ch.destroy(); } catch {} }); analyticsCharts = []; }
            function renderAnalyticsWithChartJS() {
                const ok = !!(window.Chart);
                if (!ok) return;
                // Example: comparison of last 4 weeks XP totals
                const weeks = [];
                const totals = [];
                for (let w = -3; w <= 0; w++) {
                    const start = getWeekStartFromOffset(w);
                    weeks.push(formatWeekRangeLabel(start));
                    totals.push(computeWeekXP(start));
                }
                const cv = document.getElementById('comparisonChartCanvas');
                if (cv) {
                    const ctx = cv.getContext('2d');
                    analyticsCharts.push(new Chart(ctx, {
                        type: 'bar',
                        data: { labels: weeks, datasets: [{ label: 'XP за неделю', data: totals, backgroundColor: '#3b82f6' }] },
                        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                    }));
                }
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

                        // Update UI
                        updateProgressDisplay();
                        renderTasks();
                        renderRewards();
                        generateCalendar();
                        updateDayActivity();
                        renderWeeklyChart();

                        showNotification('Данные импортированы успешно!', 'success');
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
                    // Reset to initial state
                    appState.progress = {
                        level: 1,
                        totalXP: 0,
                        currentLevelXP: 0,
                        streak: 0,
                        weeklyXP: 0,
                        weeklyStars: 0
                    };
                    
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
                    
                    appState.rewards = [];
                    appState.activityData = {};
                    appState.resetDate = new Date();
                    
                    // Сбрасываем имя пользователя к значению по умолчанию
                    appState.userName = 'Михаил';
                    
                    // Сбрасываем PIN-коды
                    appState.pinCodes = {
                        'Михаил': null,
                        'Admin': null
                    };

                    // Update UI
                    updateProgressDisplay();
                    renderTasks();
                    renderRewards();
                    generateCalendar();
                    updateDayActivity();
                    renderWeeklyChart();

                    showNotification('Прогресс сброшен!', 'info');
                    // Автоматическое сохранение отключено
                }
                toggleSettingsMenu();
            }

            // Close modals and menus on outside click
            window.onclick = function (event) {
                const taskModal = document.getElementById("taskModal");
                const rewardModal = document.getElementById("rewardModal");
                const ideaModal = document.getElementById("ideaModal");
                const analyticsModal = document.getElementById("analyticsModal");
                const settingsMenu = document.getElementById("settingsMenu");

                if (event.target === taskModal) {
                    hideTaskModal();
                }
                if (event.target === rewardModal) {
                    hideRewardModal();
                }
                if (event.target === ideaModal) {
                    hideIdeaModal();
                }
                if (event.target === analyticsModal) {
                    hideAnalyticsModal();
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
                    hideRewardModal();
                    hideIdeaModal();
                    hideAnalyticsModal();

                    const menu = document.getElementById('settingsMenu');
                    if (menu) menu.classList.remove('show');
                    const btn = document.querySelector('.settings-btn');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            });

            // Analytics Functions
            function showAnalyticsModal() {
                document.getElementById('analyticsModal').classList.add('show');
                // sync demo UI
                const badge = document.getElementById('demoBadge');
                const btn = document.getElementById('toggleDemoBtn');
                const enabled = !!(appState.demoAnalytics && appState.demoAnalytics.enabled);
                if (badge) badge.style.display = enabled ? 'inline-flex' : 'none';
                if (btn) btn.textContent = enabled ? 'Выключить демо' : 'Демо';
                calculateAnalytics();
                // Try Chart.js
                tryLoadChartJs().then((ok)=>{ if (ok) { destroyAnalyticsCharts(); renderAnalyticsWithChartJS(); } });
            }

            function hideAnalyticsModal() {
                document.getElementById('analyticsModal').classList.remove('show');
            }

            function switchAnalyticsTab(tabName) {
                // Remove active from all tabs and content
                document.querySelectorAll('.analytics-tab').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Add active to clicked tab and corresponding content
                event.target.classList.add('active');
                document.getElementById(tabName + '-tab').classList.add('active');
                
                // Recalculate charts for active tab
                if (tabName === 'progress') renderProgressCharts();
                if (tabName === 'patterns') renderPatternCharts();
                if (tabName === 'achievements') renderAchievementCharts();
            }

            function calculateAnalytics() {
                const analytics = computeAnalyticsData();
                renderOverviewTab(analytics);
            }

            function computeAnalyticsData() {
                const state = getEffectiveState();
                const activity = state.activityData || {};
                const dates = Object.keys(activity).sort();
                
                // Basic stats
                const totalActiveDays = dates.length;
                const totalTasksCompleted = dates.reduce((sum, date) => {
                    return sum + (activity[date] ? activity[date].length : 0);
                }, 0);
                
                const totalXP = state.progress.totalXP;
                const avgXpPerDay = totalActiveDays > 0 ? Math.round(totalXP / totalActiveDays) : 0;
                
                // Best day
                let bestDayXP = 0;
                let bestDayDate = '';
                let bestDayTasks = 0;
                let maxDayTasks = 0;
                
                dates.forEach(date => {
                    const logs = activity[date] || [];
                    const dayXP = logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                    const dayTasks = logs.length;
                    
                    if (dayXP > bestDayXP) {
                        bestDayXP = dayXP;
                        bestDayDate = date;
                    }
                    if (dayTasks > maxDayTasks) {
                        maxDayTasks = dayTasks;
                    }
                });
                
                // Weekly data
                const weeklyData = {};
                dates.forEach(date => {
                    const weekKey = getWeekStartKey(new Date(date));
                    if (!weeklyData[weekKey]) weeklyData[weekKey] = { xp: 0, tasks: 0 };
                    const logs = activity[date] || [];
                    weeklyData[weekKey].xp += logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                    weeklyData[weekKey].tasks += logs.length;
                });
                
                const bestWeekXP = Math.max(0, ...Object.values(weeklyData).map(w => w.xp));
                
                // Stars calculation
                const totalStarsEarned = Object.values(weeklyData).reduce((sum, week) => {
                    return sum + calculateWeeklyStars(week.xp);
                }, 0);
                const starsSpent = (state.rewards?.length || 0) * 3;
                
                // Streak calculation
                const currentStreakData = getCurrentStreakData();
                const bestStreak = calculateBestStreak();
                const consistency = totalActiveDays > 0 ? Math.round((currentStreakData.studied / Math.max(1, currentStreakData.total)) * 100) : 0;
                
                // Weekday patterns
                const weekdayData = [0,0,0,0,0,0,0]; // Sun-Sat
                dates.forEach(date => {
                    const d = new Date(date);
                    const day = d.getDay();
                    const logs = activity[date] || [];
                    weekdayData[day] += logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                });
                
                const bestWeekdayIndex = weekdayData.indexOf(Math.max(...weekdayData));
                const weekdayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                const bestWeekday = weekdayNames[bestWeekdayIndex];
                
                // Growth calculation (last 4 weeks)
                const now = new Date();
                const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
                const recentXP = dates.filter(date => new Date(date) >= fourWeeksAgo)
                    .reduce((sum, date) => {
                        const logs = activity[date] || [];
                        return sum + logs.reduce((s, log) => s + (log.xpEarned || 0), 0);
                    }, 0);
                
                // Predictions
                const avgXpPerWeek = totalActiveDays > 0 ? (totalXP / (totalActiveDays / 7)) : 0;
                const xpToMaxLevel = (100 - state.progress.level) * 810;
                const weeksToMax = avgXpPerWeek > 0 ? Math.ceil(xpToMaxLevel / avgXpPerWeek) : '∞';
                
                const currentWeekXP = state.progress.weeklyXP;
                const nextStarXP = currentWeekXP >= 750 ? 'Все звезды получены' : 
                                  currentWeekXP >= 500 ? `${750 - currentWeekXP} XP` : `${500 - currentWeekXP} XP`;
                
                return {
                    totalActiveDays,
                    totalTasksCompleted,
                    avgXpPerDay,
                    bestDayXP,
                    bestDayDate,
                    maxDayTasks,
                    bestWeekXP,
                    totalStarsEarned,
                    starsSpent,
                    currentStreak: currentStreakData,
                    bestStreak,
                    consistency,
                    bestWeekday,
                    recentXP,
                    weeksToMax,
                    nextStarXP,
                    weeklyData,
                    weekdayData
                };
            }

            function getCurrentStreakData() {
                const state = getEffectiveState();
                const start = new Date(state.resetDate || new Date());
                const today = new Date();
                let studied = 0;
                let totalEligible = 0;
                iterateDays(start, today, (d) => {
                    if (isWeekday(d)) {
                        totalEligible += 1;
                        if (hasActivityOn(d, state)) studied += 1;
                    }
                });
                return { studied, total: totalEligible };
            }

            function calculateBestStreak() {
                const state = getEffectiveState();
                const activity = state.activityData || {};
                const dates = Object.keys(activity).sort();
                if (dates.length === 0) return 0;
                
                let maxStreak = 0;
                let currentStreak = 0;
                let lastDate = null;
                
                dates.forEach(dateStr => {
                    const currentDate = new Date(dateStr);
                    if (lastDate) {
                        const daysDiff = Math.round((currentDate - lastDate) / (24 * 60 * 60 * 1000));
                        if (daysDiff === 1) {
                            currentStreak++;
                        } else {
                            currentStreak = 1;
                        }
                    } else {
                        currentStreak = 1;
                    }
                    maxStreak = Math.max(maxStreak, currentStreak);
                    lastDate = currentDate;
                });
                
                return maxStreak;
            }

            function renderOverviewTab(analytics) {
                const state = getEffectiveState();
                // Total stats
                document.getElementById('totalActiveDays').textContent = analytics.totalActiveDays;
                document.getElementById('totalTasksCompleted').textContent = analytics.totalTasksCompleted;
                document.getElementById('avgXpPerDay').textContent = analytics.avgXpPerDay + ' XP';
                document.getElementById('bestDay').textContent = `${analytics.bestDayXP} XP`;
                
                // Level progress ring
                const levelProgress = (state.progress.currentLevelXP / 810) * 100;
                const circumference = 2 * Math.PI * 52;
                const fillLength = (levelProgress / 100) * circumference;
                document.getElementById('levelRingFill').style.strokeDasharray = `${fillLength} ${circumference}`;
                document.getElementById('levelRingText').textContent = `Lv.${state.progress.level}`;
                
                // Streak stats
                document.getElementById('currentStreakStat').textContent = `${analytics.currentStreak.studied}/${analytics.currentStreak.total}`;
                document.getElementById('bestStreak').textContent = `${analytics.bestStreak} дней`;
                document.getElementById('consistency').textContent = `${analytics.consistency}%`;
                
                // Stars and rewards
                document.getElementById('totalStarsEarned').textContent = analytics.totalStarsEarned;
                document.getElementById('starsSpent').textContent = analytics.starsSpent;
                document.getElementById('rewardsCount').textContent = (state.rewards?.length || 0);
                
                // Weekly trend chart (simplified)
                renderWeeklyTrendChart(analytics.weeklyData);
            }

            function renderWeeklyTrendChart(weeklyData) {
                const container = document.getElementById('weeklyTrendChart');
                if (!container) return;
                
                const weeks = Object.keys(weeklyData).sort().slice(-12); // Last 12 weeks
                const maxXP = Math.max(100, ...weeks.map(w => weeklyData[w].xp));
                
                const bars = weeks.map((week, i) => {
                    const xp = weeklyData[week].xp;
                    const height = (xp / maxXP) * 100;
                    const weekNum = i + 1;
                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">${xp}</div>
                            <div style="width: 20px; background: linear-gradient(to top, #1e40af, #3b82f6); height: ${height}%; min-height: 4px; border-radius: 2px;"></div>
                            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">Н${weekNum}</div>
                        </div>
                    `;
                }).join('');
                
                container.innerHTML = `
                    <div style="display: flex; align-items: end; gap: 8px; height: 100%; padding: 16px;">
                        ${bars}
                    </div>
                `;
            }

            function renderProgressCharts() {
                renderActivityHeatmap();
                renderMonthlyChart();
                renderTaskDistribution();
                renderLevelTimeline();
            }

            function renderActivityHeatmap() {
                const container = document.getElementById('activityHeatmap');
                if (!container) return;
                
                const today = new Date();
                const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                
                const cells = [];
                const current = new Date(oneYearAgo);
                
                while (current <= today) {
                    const dateKey = formatDate(current);
                    const state = getEffectiveState();
                    const logs = (state.activityData[dateKey] || []);
                    const xp = logs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
                    
                    let level = 0;
                    if (xp > 0) level = 1;
                    if (xp >= 100) level = 2;
                    if (xp >= 200) level = 3;
                    if (xp >= 300) level = 4;
                    if (xp >= 400) level = 5;
                    
                    cells.push(`<div class="heatmap-cell" data-level="${level}" title="${dateKey}: ${xp} XP"></div>`);
                    current.setDate(current.getDate() + 1);
                }
                
                container.innerHTML = cells.join('');
            }

            function renderPatternCharts() {
                renderWeekdayPattern();
                renderSessionsChart();
                updatePerformanceStats();
                updatePredictions();
            }

            function renderWeekdayPattern() {
                const container = document.getElementById('weekdayPatternChart');
                if (!container) return;
                
                const analytics = computeAnalyticsData();
                const weekdayLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                const maxXP = Math.max(1, ...analytics.weekdayData);
                
                const bars = analytics.weekdayData.map((xp, i) => {
                    const height = (xp / maxXP) * 100;
                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">${xp}</div>
                            <div style="width: 24px; background: linear-gradient(to top, #0ea5e9, #38bdf8); height: ${height}%; min-height: 4px; border-radius: 2px;"></div>
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">${weekdayLabels[i]}</div>
                        </div>
                    `;
                }).join('');
                
                container.innerHTML = `
                    <div style="display: flex; align-items: end; gap: 4px; height: 100%; padding: 16px;">
                        ${bars}
                    </div>
                `;
            }

            function renderAchievementCharts() {
                updateMilestones();
                updateRecords();
                renderComparisonChart();
            }

            function updatePerformanceStats() {
                const analytics = computeAnalyticsData();
                document.getElementById('bestWeekday').textContent = analytics.bestWeekday;
                document.getElementById('avgTasksPerDay').textContent = (analytics.totalTasksCompleted / Math.max(1, analytics.totalActiveDays)).toFixed(1);
                document.getElementById('xpGrowth').textContent = `+${analytics.recentXP} XP`;
            }

            function updatePredictions() {
                const analytics = computeAnalyticsData();
                document.getElementById('timeToMax').textContent = typeof analytics.weeksToMax === 'number' ? `${analytics.weeksToMax} недель` : analytics.weeksToMax;
                document.getElementById('nextStarTime').textContent = analytics.nextStarXP;
                const monthlyXP = analytics.avgXpPerDay * 30;
                const monthlyProgress = Math.min(100, (monthlyXP / 1000) * 100);
                document.getElementById('monthlyGoal').textContent = `${monthlyProgress.toFixed(0)}%`;
            }

            function updateMilestones() {
                const container = document.getElementById('milestonesContent');
                const state = getEffectiveState();
                const milestones = [
                    { level: 10, achieved: state.progress.level >= 10, title: 'Первые 10 уровней' },
                    { level: 25, achieved: state.progress.level >= 25, title: 'Четверть пути' },
                    { level: 50, achieved: state.progress.level >= 50, title: 'Половина пути' },
                    { level: 75, achieved: state.progress.level >= 75, title: 'Три четверти' },
                    { level: 100, achieved: state.progress.level >= 100, title: 'Максимальный уровень' }
                ];
                
                container.innerHTML = milestones.map(m => `
                    <div class="stat-row">
                        <span class="stat-label">${m.title}</span>
                        <span class="stat-value" style="color: ${m.achieved ? '#059669' : '#94a3b8'};">
                            ${m.achieved ? '✓ Получено' : `Уровень ${m.level}`}
                        </span>
                    </div>
                `).join('');
            }

            function updateRecords() {
                const analytics = computeAnalyticsData();
                document.getElementById('maxDayXp').textContent = analytics.bestDayXP + ' XP';
                document.getElementById('maxDayTasks').textContent = analytics.maxDayTasks;
                document.getElementById('bestWeekXp').textContent = analytics.bestWeekXP + ' XP';
            }

            // Stub functions for charts that would need more complex implementation
            function renderMonthlyChart() {
                const container = document.getElementById('monthlyXpChart');
                if (!container) return;
                const state = getEffectiveState();
                const activity = state.activityData || {};
                const byMonth = {};
                Object.keys(activity).forEach(d => {
                    const [y,m] = d.split('-');
                    const key = `${y}-${m}`;
                    const sum = activity[d].reduce((s,l)=>s+(l.xpEarned||0),0);
                    byMonth[key] = (byMonth[key]||0)+sum;
                });
                const keys = Object.keys(byMonth).sort().slice(-12);
                const maxXP = Math.max(100, ...keys.map(k => byMonth[k]));
                const bars = keys.map(k => {
                    const xp = byMonth[k];
                    const h = Math.max(4, Math.round((xp/maxXP)*100));
                    const label = k.split('-')[1]+'.'+k.split('-')[0].slice(2);
                    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                        <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">${xp}</div>
                        <div style="width:20px;background:linear-gradient(to top,#8b5cf6,#a78bfa);height:${h}%;border-radius:2px;"></div>
                        <div style="font-size:0.7rem;color:#94a3b8;margin-top:4px;">${label}</div>
                    </div>`;
                }).join('');
                container.innerHTML = `<div style="display:flex;align-items:end;gap:8px;height:100%;padding:16px;">${bars}</div>`;
            }
            function renderTaskDistribution() {
                const container = document.getElementById('taskDistributionChart');
                if (!container) return;
                const state = getEffectiveState();
                const activity = state.activityData || {};
                const counts = {};
                Object.keys(activity).forEach(d => {
                    (activity[d]||[]).forEach(l => {
                        const cat = l.category || inferCategoryFromTaskName(l.taskName) || 'other';
                        counts[cat] = (counts[cat]||0) + 1;
                    });
                });
                const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
                const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
                const colors = ['#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
                const rows = entries.map(([cat, n], idx) => {
                    const pct = Math.round((n/total)*100);
                    return `<div style="width:100%;margin:6px 0;">
                        <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#64748b;">
                            <span>${mapCategoryTitle(cat)}</span><span>${pct}%</span>
                        </div>
                        <div style="height:10px;background:#e5e7eb;border-radius:6px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:${colors[idx%colors.length]};"></div>
                        </div>
                    </div>`;
                }).join('');
                container.innerHTML = `<div style="padding:8px 4px;">${rows || '<div style=\"color:#94a3b8;text-align:center\">Нет данных</div>'}</div>`;
            }
            function inferCategoryFromTaskName(name) {
                const n = (name||'').toLowerCase();
                if (n.includes('слов')) return 'vocabulary';
                if (n.includes('граммат')) return 'grammar';
                if (n.includes('аудир')) return 'listening';
                if (n.includes('чтен')) return 'reading';
                if (n.includes('разговор')) return 'speaking';
                return null;
            }
            function mapCategoryTitle(cat) {
                const map = { vocabulary: 'Слова', grammar: 'Грамматика', listening: 'Аудирование', reading: 'Чтение', speaking: 'Разговор', other: 'Другое' };
                return map[cat] || cat;
            }
            function renderLevelTimeline() {
                const container = document.getElementById('levelTimelineChart');
                if (!container) return;
                const state = getEffectiveState();
                // approximate weekly levels over last 12 weeks
                const analytics = computeAnalyticsData();
                const weeks = Object.keys(analytics.weeklyData).sort().slice(-12);
                let cumulative = Math.max(1, state.progress.level - weeks.length);
                const items = weeks.map((w,i)=>{
                    const inc = Math.max(0, Math.floor(analytics.weeklyData[w].xp / 810));
                    cumulative = Math.min(100, cumulative + inc);
                    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                        <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">Lv.${cumulative}</div>
                        <div style="width:24px;height:24px;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:6px;"></div>
                        <div style="font-size:0.7rem;color:#94a3b8;margin-top:4px;">Н${i+1}</div>
                    </div>`;
                }).join('');
                container.innerHTML = `<div style="display:flex;align-items:end;gap:8px;height:100%;padding:16px;">${items}</div>`;
            }
            function renderSessionsChart() {
                const container = document.getElementById('sessionsChart');
                if (!container) return;
                const state = getEffectiveState();
                const today = new Date();
                const days = [];
                for (let i=29;i>=0;i--) {
                    const d = new Date(today); d.setDate(d.getDate()-i);
                    const key = formatDate(d);
                    const sessions = (state.activityData[key]||[]).length;
                    days.push({ key, sessions });
                }
                const max = Math.max(1, ...days.map(d=>d.sessions));
                const bars = days.map(d=>{
                    const h = Math.round((d.sessions/max)*100);
                    return `<div title="${d.key}: ${d.sessions}" style="width:10px;background:linear-gradient(to top,#059669,#10b981);height:${Math.max(4,h)}%;border-radius:2px;"></div>`;
                }).join('');
                container.innerHTML = `<div style="display:flex;align-items:end;gap:2px;height:100%;padding:8px 12px;">${bars}</div>`;
            }
            function renderComparisonChart() {
                const container = document.getElementById('comparisonChart');
                if (!container) return;
                const analytics = computeAnalyticsData();
                const weeks = Object.keys(analytics.weeklyData).sort();
                const last8 = weeks.slice(-8);
                const prev4 = last8.slice(0,4);
                const last4 = last8.slice(4);
                const maxXP = Math.max(100, ...last8.map(w=>analytics.weeklyData[w].xp));
                const makeBars = (arr, color) => arr.map(w=>{
                    const xp = analytics.weeklyData[w].xp;
                    const h = Math.round((xp/maxXP)*100);
                    return `<div style="width:18px;background:${color};height:${Math.max(4,h)}%;border-radius:2px;" title="${w}: ${xp}"></div>`;
                }).join('');
                container.innerHTML = `
                    <div style="display:flex;align-items:end;gap:16px;height:100%;padding:12px 16px;">
                        <div style="display:flex;align-items:end;gap:6px;">${makeBars(prev4,'#94a3b8')}</div>
                        <div style="display:flex;align-items:end;gap:6px;">${makeBars(last4,'#1e40af')}</div>
                    </div>
                `;
            }

            // Demo toggle UI
            function toggleDemoAnalytics() {
                appState.demoAnalytics = appState.demoAnalytics || { enabled: false };
                appState.demoAnalytics.enabled = !appState.demoAnalytics.enabled;
                if (appState.demoAnalytics.enabled) {
                    demoStateCache = buildDemoState();
                } else {
                    demoStateCache = null;
                }
                // Update UI controls
                const badge = document.getElementById('demoBadge');
                const btn = document.getElementById('toggleDemoBtn');
                if (badge) badge.style.display = appState.demoAnalytics.enabled ? 'inline-flex' : 'none';
                if (btn) btn.textContent = appState.demoAnalytics.enabled ? 'Выключить демо' : 'Демо';
                // Re-render current analytics tab
                calculateAnalytics();
                renderProgressCharts();
                renderPatternCharts();
                renderAchievementCharts();
            }

            // Initialize app when page loads
            document.addEventListener("DOMContentLoaded", initApp);

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
                
                showNotification(appState.userName === 'Михаил' ? 'Режим Михаила' : 'Режим администратора', 'info');
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
                        
                        showNotification('Вход выполнен успешно!', 'success');
                        
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
                            return true;
                        } else {
                            console.log('⚠️ PIN-коды загружены, но не сохранены в Firebase');
                            return false;
                        }
                    } else {
                        // Если загрузка не удалась, просто сохраняем текущие
                        const saveResult = await savePinCodesToFirebase();
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

            // Save state to Firestore
            async function saveStateToFirestore() {
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
                    
                    // Показываем детальную информацию о сохранении
                    showSaveDetails(dataToSave);
                    
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
                function safeStringToDate(dateString) {
                    if (!dateString) return null;
                    
                    try {
                        const date = new Date(dateString);
                        if (!isNaN(date.getTime())) {
                            return date;
                        } else {
                            console.warn('⚠️ Некорректная строка даты:', dateString);
                            return null;
                        }
                    } catch (error) {
                        console.warn('⚠️ Ошибка при создании Date из строки:', dateString, error);
                        return null;
                    }
                }
                
                // Restore Date objects
                if (restored.currentMonth && typeof restored.currentMonth === 'string') {
                    const date = safeStringToDate(restored.currentMonth);
                    if (date) {
                        restored.currentMonth = date;
                        console.log('📅 currentMonth восстановлен');
                    } else {
                        restored.currentMonth = new Date();
                        console.log('⚠️ currentMonth установлен по умолчанию');
                    }
                }
                
                if (restored.selectedDate && typeof restored.selectedDate === 'string') {
                    const date = safeStringToDate(restored.selectedDate);
                    if (date) {
                        restored.selectedDate = date;
                        console.log('📅 selectedDate восстановлен');
                    } else {
                        restored.selectedDate = new Date();
                        console.log('⚠️ selectedDate установлен по умолчанию');
                    }
                }
                
                if (restored.resetDate && typeof restored.resetDate === 'string') {
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
                                if (activity.completedAt && typeof activity.completedAt === 'string') {
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
                        await new Promise(resolve => setTimeout(resolve, waitTime));
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
                            return await saveStateToFirestore();
                        }, 3, 1000);
                        
                        if (saveResult) {
                            console.log('✅ Синхронизация завершена успешно');
                            showNotification('Синхронизация завершена успешно', 'success');
                            
                            // Показываем успешный статус
                            showSyncStatus('success');
                            
                            // Показываем сводку синхронизации
                            showSyncSummary();
                        } else {
                            console.log('⚠️ Синхронизация завершена с предупреждениями');
                            showNotification('Синхронизация завершена с предупреждениями', 'warning');
                            
                            // Показываем статус с предупреждением
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
                            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
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
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
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
                            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
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
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
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
                    setTimeout(() => {
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
                        <div class="modal-footer">
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
        
        // Глобальная функция для принудительного показа верификации (для отладки)
        window.forceShowVerification = () => {
            console.log('🔐 Принудительный показ верификации...');
            showVerificationAfterSync();
        };
        