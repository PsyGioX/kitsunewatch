// achievements/achievements-core.js
//
// Ядро системы достижений KitsuneWatch. Полностью независимо от
// основного приложения (index.js) — работает через CustomEvent'ы на
// document, так же как это уже делает assets/scripts/theme-manager.js
// со своим событием 'themechange'.
//
// Список достижений хранится в achievements/data/achievements.json —
// чтобы добавить новое достижение или задание, правьте только этот
// JSON-файл, менять код здесь не нужно (см. комментарии в самом файле).
//
// Как основное приложение сообщает о событиях (см. правки в index.js):
//   document.dispatchEvent(new CustomEvent('kw:search', { detail: { query } }))
//   document.dispatchEvent(new CustomEvent('kw:favorite-added', { detail: { id, type } }))
//   document.dispatchEvent(new CustomEvent('kw:favorite-removed', { detail: { id } }))
//   document.dispatchEvent(new CustomEvent('kw:video-open', { detail: { id, type } }))
//   document.dispatchEvent(new CustomEvent('kw:share', { detail: {} }))
// Плюс нативные события, которые уже существуют в приложении и которые
// движок слушает сам, без правок в index.js:
//   'themechange' (assets/scripts/theme-manager.js), 'appinstalled' (window)
//
// Публичное API: window.KWAchievements
//   .ready                       -> Promise, резолвится когда JSON загружен
//   .getDefinitions()            -> [{...achievement}]
//   .getCategories()             -> [{...category}]
//   .getState()                  -> { unlocked: {id: ts}, stats: {...}, totalPoints, earnedPoints }
//   .getProgress(achievementId)  -> { current, target, unlocked }
//   .openPage()                  -> открывает отдельную страницу достижений
//   .track(eventName, detail)    -> ручной вызов трекинга (для отладки/расширений)

(function () {
    'use strict';

    const DATA_URL = '/achievements/data/achievements.json';
    const STATS_KEY = 'kw_achv_stats_v1';
    const UNLOCKED_KEY = 'kw_achv_unlocked_v1';

    // Ночные/утренние окна для достижений night_owl / early_bird
    const NIGHT_RANGE = [0, 5];   // 00:00–04:59
    const EARLY_RANGE = [5, 8];   // 05:00–07:59

    // Типы condition.type, которые поддерживает checkCondition():
    //   count          — счётчик condition.stat достиг condition.target
    //   unique         — размер набора уникальных значений condition.stat достиг target
    //   streak         — число дней подряд с визитом достигло target
    //   totalUnlocked  — всего получено достижений (любых) >= target
    //   points         — суммарно заработано очков >= target
    //   allCategories  — получено хотя бы одно достижение в каждой категории
    //   meta           — получены вообще все остальные достижения

    class AchievementsEngine {
        constructor() {
            this.defs = [];
            this.categories = [];
            this.stats = this.loadStats();
            this.unlocked = this.loadUnlocked();
            this._listeners = new Set(); // подписчики на изменения состояния (для страницы/бейджа)

            this.ready = this.loadDefinitions();
            this.ready.then(() => {
                this.bindAppEvents();
                this.trackVisit();
                // Пересчитываем достижения на случай, если JSON обновился
                // (новые ачивки) и уже накопленной статистики хватает,
                // чтобы часть из них сразу засчиталась.
                this.evaluate({ silent: true });
                this._emitStateChange();
            });
        }

        // ============ ЗАГРУЗКА ДАННЫХ ============
        async loadDefinitions() {
            try {
                const res = await fetch(DATA_URL, { cache: 'no-cache' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const json = await res.json();
                this.categories = Array.isArray(json.categories) ? json.categories : [];
                this.defs = Array.isArray(json.achievements) ? json.achievements : [];
            } catch (e) {
                console.error('[Achievements] Не удалось загрузить achievements.json:', e);
                this.categories = [];
                this.defs = [];
            }
        }

        // ============ ХРАНИЛИЩЕ ============
        loadStats() {
            const defaults = {
                counters: {},          // { search: 5, favoriteAdded: 2, ... }
                uniqueSets: {},        // { searchQueries: [...], videoTypes: [...], themes: [...] }
                visitDates: [],        // ['2026-09-01', '2026-09-02', ...] — для стрика
                visitStreak: 0
            };
            try {
                const raw = localStorage.getItem(STATS_KEY);
                if (!raw) return defaults;
                const parsed = JSON.parse(raw);
                return Object.assign(defaults, parsed, {
                    counters: Object.assign({}, defaults.counters, parsed.counters),
                    uniqueSets: Object.assign({}, defaults.uniqueSets, parsed.uniqueSets)
                });
            } catch (e) {
                return defaults;
            }
        }

        saveStats() {
            try { localStorage.setItem(STATS_KEY, JSON.stringify(this.stats)); } catch (e) { /* хранилище недоступно */ }
        }

        loadUnlocked() {
            try {
                const raw = localStorage.getItem(UNLOCKED_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        }

        saveUnlocked() {
            try { localStorage.setItem(UNLOCKED_KEY, JSON.stringify(this.unlocked)); } catch (e) { /* ignore */ }
        }

        // ============ СЧЁТЧИКИ ============
        increment(stat, by = 1) {
            this.stats.counters[stat] = (this.stats.counters[stat] || 0) + by;
        }

        addUnique(stat, value) {
            if (value === undefined || value === null || value === '') return;
            if (!this.stats.uniqueSets[stat]) this.stats.uniqueSets[stat] = [];
            const key = String(value).toLowerCase();
            if (!this.stats.uniqueSets[stat].includes(key)) this.stats.uniqueSets[stat].push(key);
        }

        // Визиты и стрик по календарным дням (локальное время посетителя)
        trackVisit() {
            const today = new Date();
            const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

            if (this.stats.visitDates[this.stats.visitDates.length - 1] === todayKey) {
                return; // уже отмечали сегодняшний визит
            }

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

            const lastVisit = this.stats.visitDates[this.stats.visitDates.length - 1];
            this.stats.visitStreak = (lastVisit === yesterdayKey) ? (this.stats.visitStreak + 1) : 1;

            this.stats.visitDates.push(todayKey);
            if (this.stats.visitDates.length > 60) this.stats.visitDates = this.stats.visitDates.slice(-60);

            this.saveStats();
            this.evaluate();
        }

        // ============ ПОДПИСКА НА СОБЫТИЯ ПРИЛОЖЕНИЯ ============
        bindAppEvents() {
            document.addEventListener('kw:search', (e) => {
                this.increment('search');
                if (e.detail && e.detail.query) this.addUnique('searchQueries', e.detail.query);
                this.evaluate();
            });

            document.addEventListener('kw:favorite-added', () => {
                this.increment('favoriteAdded');
                this.evaluate();
            });

            document.addEventListener('kw:favorite-removed', () => {
                this.increment('favoriteRemoved');
                this.evaluate();
            });

            document.addEventListener('kw:video-open', (e) => {
                this.increment('videoOpen');
                const detail = e.detail || {};
                if (detail.type) this.addUnique('videoTypes', detail.type);

                const hour = new Date().getHours();
                if (hour >= NIGHT_RANGE[0] && hour < NIGHT_RANGE[1]) this.increment('nightWatch');
                if (hour >= EARLY_RANGE[0] && hour < EARLY_RANGE[1]) this.increment('earlyWatch');

                this.evaluate();
            });

            document.addEventListener('kw:share', () => {
                this.increment('share');
                this.evaluate();
            });

            // Тема оформления — событие уже существует в theme-manager.js,
            // никаких правок там делать не нужно.
            document.addEventListener('themechange', (e) => {
                const theme = e.detail && e.detail.theme;
                if (theme) this.addUnique('themes', theme);
                this.evaluate();
            });

            // Установка PWA — нативное событие браузера.
            window.addEventListener('appinstalled', () => {
                this.increment('install');
                this.evaluate();
            });

            // Горячие клавиши плеера — считаем сами, только когда открыт
            // плеер (та же проверка, что и в index.js: handleKeyboardShortcuts),
            // чтобы не задевать основной скрипт лишними правками.
            const shortcutKeys = new Set([' ', 'arrowright', 'arrowleft', 'm', 'f']);
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                const frame = document.getElementById('parse_link_on_video');
                if (!frame || !frame.src) return;
                if (!shortcutKeys.has(e.key.toLowerCase())) return;
                this.increment('shortcutUse');
                this.evaluate();
            });
        }

        // Ручной трекинг — на случай расширений/отладки из консоли.
        track(eventName, detail) {
            document.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
        }

        // ============ ПРОВЕРКА УСЛОВИЙ ============
        getStatValue(statName) {
            if (this.stats.uniqueSets[statName]) return this.stats.uniqueSets[statName].length;
            if (statName === 'visitStreak') return this.stats.visitStreak;
            return this.stats.counters[statName] || 0;
        }

        checkCondition(def) {
            const c = def.condition || {};
            switch (c.type) {
                case 'count':
                    return { current: this.stats.counters[c.stat] || 0, target: c.target, met: (this.stats.counters[c.stat] || 0) >= c.target };
                case 'unique': {
                    const current = (this.stats.uniqueSets[c.stat] || []).length;
                    return { current, target: c.target, met: current >= c.target };
                }
                case 'streak':
                    return { current: this.stats.visitStreak, target: c.target, met: this.stats.visitStreak >= c.target };
                case 'totalUnlocked': {
                    const current = Object.keys(this.unlocked).filter(id => id !== def.id).length;
                    return { current, target: c.target, met: current >= c.target };
                }
                case 'points': {
                    const current = this.defs
                        .filter(d => d.id !== def.id && this.unlocked[d.id])
                        .reduce((sum, d) => sum + (d.points || 0), 0);
                    return { current, target: c.target, met: current >= c.target };
                }
                case 'allCategories': {
                    const catIds = this.categories.map(cat => cat.id);
                    const doneCats = catIds.filter(catId =>
                        this.defs.some(d => d.id !== def.id && d.category === catId && this.unlocked[d.id])
                    );
                    return { current: doneCats.length, target: catIds.length, met: catIds.length > 0 && doneCats.length >= catIds.length };
                }
                case 'meta': {
                    const others = this.defs.filter(d => d.id !== def.id && d.condition.type !== 'meta');
                    const unlockedCount = others.filter(d => this.unlocked[d.id]).length;
                    return { current: unlockedCount, target: others.length, met: others.length > 0 && unlockedCount >= others.length };
                }
                default:
                    return { current: 0, target: 1, met: false };
            }
        }

        getProgress(achievementId) {
            const def = this.defs.find(d => d.id === achievementId);
            if (!def) return { current: 0, target: 1, unlocked: false };
            const res = this.checkCondition(def);
            return { current: Math.min(res.current, res.target), target: res.target, unlocked: !!this.unlocked[achievementId] };
        }

        // Проверяет все достижения и открывает новые. silent=true —
        // используется при первом запуске, чтобы не засыпать уведомлениями
        // за события, накопленные ещё до появления системы достижений.
        //
        // Некоторые типы условий (totalUnlocked, allCategories, meta) сами
        // зависят от того, что разблокировано другими достижениями в этом
        // же вызове — поэтому прогоняем несколько проходов подряд, пока
        // что-то продолжает открываться (цепочка вида "прогресс" →
        // "все категории" → "легенда" разрешится за один evaluate()).
        evaluate({ silent = false } = {}) {
            if (!this.defs.length) return;
            this.saveStats();

            // Достижения с условиями, зависящими от других достижений,
            // проверяем в последнюю очередь на каждом проходе.
            const dependentTypes = new Set(['meta', 'totalUnlocked', 'allCategories']);
            const ordered = [...this.defs.filter(d => !dependentTypes.has(d.condition.type)), ...this.defs.filter(d => dependentTypes.has(d.condition.type))];

            const newlyUnlocked = [];
            let anyChanged = false;
            let passChanged = true;
            let safety = 0;

            while (passChanged && safety < this.defs.length + 2) {
                passChanged = false;
                safety += 1;

                ordered.forEach(def => {
                    if (this.unlocked[def.id]) return;
                    const res = this.checkCondition(def);
                    if (res.met) {
                        this.unlocked[def.id] = Date.now();
                        anyChanged = true;
                        passChanged = true;
                        newlyUnlocked.push(def);
                    }
                });
            }

            if (anyChanged) {
                this.saveUnlocked();
                if (!silent) {
                    newlyUnlocked.forEach(def => {
                        document.dispatchEvent(new CustomEvent('kw:achievement-unlocked', { detail: { achievement: def } }));
                    });
                }
                this._emitStateChange();
            }
        }

        // ============ СОСТОЯНИЕ ДЛЯ UI ============
        getState() {
            const totalPoints = this.defs.reduce((sum, d) => sum + (d.points || 0), 0);
            const earnedPoints = this.defs.filter(d => this.unlocked[d.id]).reduce((sum, d) => sum + (d.points || 0), 0);
            return {
                unlocked: this.unlocked,
                stats: this.stats,
                totalCount: this.defs.length,
                unlockedCount: Object.keys(this.unlocked).length,
                totalPoints,
                earnedPoints
            };
        }

        getDefinitions() { return this.defs; }
        getCategories() { return this.categories; }

        onChange(cb) {
            this._listeners.add(cb);
            return () => this._listeners.delete(cb);
        }

        _emitStateChange() {
            const state = this.getState();
            this._listeners.forEach(cb => { try { cb(state); } catch (e) { /* ignore */ } });
            document.dispatchEvent(new CustomEvent('kw:achievements-state-changed', { detail: state }));
        }

        openPage() {
            document.dispatchEvent(new CustomEvent('kw:achievements-open'));
        }
    }

    window.KWAchievements = new AchievementsEngine();
})();
