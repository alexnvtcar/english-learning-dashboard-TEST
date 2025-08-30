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
                pinCodes: {
                    'Михаил': null,
                    'Admin': null
                },
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
            function saveState() {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
                } catch (e) {
                    // ignore storage errors
                }
            }

            function loadState() {
                try {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    if (raw) {
                        const saved = JSON.parse(raw);
                        appState = { ...appState, ...saved };
                        if (saved.currentMonth) appState.currentMonth = new Date(saved.currentMonth);
                        if (saved.selectedDate) appState.selectedDate = new Date(saved.selectedDate);
                    }
                    // Устанавливаем userName по умолчанию, если он не задан
                    if (!appState.userName) {
                        appState.userName = 'Михаил';
                    }
                } catch (e) {
                    // ignore parse errors
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
                const d = new Date(date);
                const day = (d.getDay() + 6) % 7;
                d.setHours(0,0,0,0);
                d.setDate(d.getDate() - day);
                return formatDate(d);
            }

            function ensureWeeklyReset() {
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
                saveState();
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
                    saveState();
                }
            }

            function generateCalendar() {
                const calendar = document.getElementById("calendar");
                const monthTitle = document.getElementById("monthTitle");

                const currentMonth = appState.currentMonth;
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
                const selectedDateStr = formatDate(appState.selectedDate);
                const dayActivity = document.getElementById("dayActivity");
                const selectedDateTitle =
                    document.getElementById("selectedDateTitle");

                const dateStr =
                    appState.selectedDate.toLocaleDateString("ru-RU");
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
                    saveState();

                    taskElement.classList.remove("task-completed");
                }, 600);
            }

            function addTask(event) {
                event.preventDefault();

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
                        saveState();
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
                saveState();

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
                saveState();

                // Reset form
                document.getElementById("rewardForm").reset();
                updateRedeemControls();
            }

            function selectDate(dateStr) {
                appState.selectedDate = new Date(dateStr);
                generateCalendar();
                updateDayActivity();
                saveState();
                renderWeeklyChart();
            }

            function changeMonth(direction) {
                appState.currentMonth = new Date(
                    appState.currentMonth.getFullYear(),
                    appState.currentMonth.getMonth() + direction,
                    1,
                );
                generateCalendar();
                saveState();
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

            // Initialize Application
            function initApp() {
                loadState();
                ensureWeeklyReset();

                // Add some demo activity only if none exists
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

                // Force account selection (always show on load, default viewer)
                if (!appState.role) appState.role = 'viewer';
                // Устанавливаем userName по умолчанию, если он не задан
                if (!appState.userName) {
                    appState.userName = 'Михаил';
                }
                document.getElementById('accountModal').classList.add('show');

                updateProgressDisplay();
                renderTasks();
                renderRewards();
                generateCalendar();
                updateDayActivity();
                renderWeeklyChart();
                updateRedeemControls();
                populateIconSelector(); // Initialize icon selector
                // Приветствие показывается только при выборе роли, не автоматически
                applyRolePermissions();
            }

            // Delete Task Function
            function deleteTask(taskId) {
                if (confirm('Вы уверены, что хотите удалить это задание?')) {
                    appState.tasks = appState.tasks.filter(task => task.id !== taskId);
                    renderTasks();
                    showNotification('Задание удалено', 'info');
                    saveState();
                }
            }

            // Delete Activity Function with full state recalculation
            function deleteActivity(dateStr, index) {
                if (appState.role === 'viewer') { showNotification('Режим просмотра: действие недоступно', 'info'); return; }
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
                saveState();

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
                if (confirm('Удалить ВСЕ сохраненные задания?')) {
                    appState.tasks = [];
                    renderTasks();
                    showNotification('Все задания удалены', 'info');
                    saveState();
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
                    
                    updateProgressDisplay(); renderTasks(); renderRewards(); generateCalendar(); updateDayActivity(); renderWeeklyChart(); updateRedeemControls(); saveState();
                    showNotification('Состояние синхронизировано', 'success');
                } catch (e) {
                    showNotification('Ошибка применения состояния', 'error');
                }
            }

            

            function openDriveHelp() {
                alert('Google Drive: используйте Экспорт для сохранения файла в приложение Drive, а затем на втором устройстве – Импорт, выбрав файл из Drive. Это офлайн-дружественный ручной способ.');
            }





            function exportData() {
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
                    saveState();
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
                appState.role = role === 'admin' ? 'admin' : 'viewer';
                
                // Устанавливаем имя пользователя в зависимости от роли
                if (role === 'viewer') {
                    appState.userName = 'Михаил';
                } else {
                    appState.userName = 'Admin';
                }
                
                saveState();
                document.getElementById('accountModal').classList.remove('show');
                applyRolePermissions();
                
                // Показываем верификацию для входа
                appState.isVerified = false;
                showVerificationModal();
                
                showNotification(appState.userName === 'Михаил' ? 'Режим Михаила' : 'Режим администратора', 'info');
            }

            // Change Account Modal
            function showChangeAccountModal() {
                document.getElementById('accountModal').classList.add('show');
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



            // Show verification modal
            function showVerificationModal() {
                const userInfo = document.getElementById('verificationUserInfo');
                const setupSection = document.getElementById('setupPinSection');
                
                if (userInfo) userInfo.textContent = appState.userName;
                
                // Check if user has PIN code
                const hasPin = appState.pinCodes[appState.userName];
                if (hasPin) {
                    setupSection.style.display = 'none';
                } else {
                    setupSection.style.display = 'block';
                }
                
                resetPinInput();
                document.getElementById('verificationModal').classList.add('show');
            }

            // Hide verification modal
            function hideVerificationModal() {
                document.getElementById('verificationModal').classList.remove('show');
                resetPinInput();
            }

            // Show setup PIN modal
            function showSetupPinModal() {
                const userInfo = document.getElementById('setupPinUserInfo');
                if (userInfo) userInfo.textContent = appState.userName;
                
                resetSetupPinInput();
                document.getElementById('setupPinModal').classList.add('show');
            }

            // Hide setup PIN modal
            function hideSetupPinModal() {
                document.getElementById('setupPinModal').classList.remove('show');
                resetSetupPinInput();
            }

            // Show change PIN modal
            function showChangePinModal() {
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
                }
            }

            // Verify PIN code
            function verifyPin() {
                const storedPin = appState.pinCodes[appState.userName];
                
                if (!storedPin) {
                    showNotification('PIN-код не установлен', 'error');
                    return;
                }
                
                if (currentPin === storedPin) {
                    appState.isVerified = true;
                    hideVerificationModal();
                    showNotification('Вход выполнен успешно!', 'success');
                    
                    // Show welcome modal for Mikhail
                    if (appState.userName === 'Михаил') {
                        showWelcomeModal();
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
            function confirmSetupPin() {
                if (setupPin.length !== 4) {
                    showNotification('PIN-код должен содержать 4 цифры', 'error');
                    return;
                }
                
                // Save PIN code
                appState.pinCodes[appState.userName] = setupPin;
                saveState();
                
                hideSetupPinModal();
                showNotification('PIN-код установлен успешно!', 'success');
                
                // Auto-verify user
                appState.isVerified = true;
                
                // Show welcome modal for Mikhail
                if (appState.userName === 'Михаил') {
                    showWelcomeModal();
                }
            }

            // Check if user needs verification
            function needsVerification() {
                return !appState.isVerified;
            }

            // Logout user
            function logoutUser() {
                appState.isVerified = false;
                saveState();
                showNotification('Выход выполнен', 'info');
            }
        