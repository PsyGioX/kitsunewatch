// cookie-widget/cookie-widget-core.js
//
// Ядро переиспользуемого cookie-виджета. Полностью самостоятельно: не
// зависит от остального приложения, читает конфиг сайта из data-атрибутов
// на своём <script> или из window.CookieWidgetConfig (см. README.md).
//
// Что делает:
//   1. Активно сканирует страницу на известные скрипты метрик/рекламы —
//      мировые и российские (список в cookie-widget-detectors.js) — и по
//      src <script>, и по глобальным переменным, которые сервисы оставляют
//      в window. Пересканирует при появлении новых <script> (MutationObserver),
//      поэтому детектор актуален и для скриптов, подгруженных динамически.
//   2. Хранит согласие пользователя по категориям в localStorage.
//   3. Умеет ГАСИТЬ подключение сторонних скриптов до согласия: если сайт
//      подключает трекер как
//        <script type="text/plain" data-cookie-category="analytics"
//                data-cookie-src="https://..."></script>
//      виджет активирует такой script (заменяет на настоящий) только когда
//      пользователь дал согласие на соответствующую категорию — это НЕ
//      обязательно (детектор всё равно найдёт уже работающие трекеры и
//      покажет их пользователю), но так виджет можно использовать и как
//      полноценный consent-gate, а не только как индикатор.
//
// Публичное API: window.CookieWidget
//   .ready                    -> Promise, резолвится после первого скана + применения сохранённого согласия
//   .getConsent()              -> { necessary:true, analytics, marketing, functional, timestamp }
//   .setConsent(partial, opts) -> сохраняет согласие (partial — любые из 3 категорий), активирует шлюзы
//   .acceptAll()               -> согласие на все категории
//   .rejectOptional()          -> согласие только на необходимые
//   .hasChosen()                -> пользователь уже сохранял выбор ранее
//   .getDetectedServices()     -> [{...detector, via: 'script'|'global'}], обновляется "вживую"
//   .onConsentChange(cb)        -> подписка, cb(consent)
//   .onDetectionChange(cb)      -> подписка, cb(detectedServicesArray) — "активное отслеживание"
//   .openSettings()             -> открыть панель настроек (UI-модуль должен быть подключён)
//   .getConfig()                -> текущий конфиг виджета

(function (root) {
    'use strict';

    const CONSENT_KEY = 'cw_consent_v1';
    const DETECTORS = root.CookieWidgetDetectors || [];
    const RESCAN_DEBOUNCE_MS = 600;

    const DEFAULT_CONFIG = {
        // Название сайта/компании для текста баннера
        siteName: document.title || 'сайт',
        // Ссылка на политику конфиденциальности (необязательно)
        policyUrl: '',
        // Позиция баннера: 'bottom' | 'bottom-left' | 'bottom-right'
        position: 'bottom',
        // Локаль текстов: сейчас поддержан 'ru' (значение по умолчанию) и 'en'
        locale: 'ru',
        // Показывать плавающую кнопку для повторного открытия настроек
        showReopenButton: true,
        // Категории, включённые "по умолчанию" при нажатии "Только необходимые"
        // (сама "necessary" всегда true и не в этом списке)
        optionalCategories: ['analytics', 'marketing', 'functional']
    };

    function readConfigFromScriptTag() {
        const script = document.currentScript ||
            document.querySelector('script[src*="cookie-widget-core.js"]');
        if (!script) return {};
        const cfg = {};
        if (script.dataset.siteName) cfg.siteName = script.dataset.siteName;
        if (script.dataset.policyUrl) cfg.policyUrl = script.dataset.policyUrl;
        if (script.dataset.position) cfg.position = script.dataset.position;
        if (script.dataset.locale) cfg.locale = script.dataset.locale;
        if (script.dataset.reopenButton === 'false') cfg.showReopenButton = false;
        return cfg;
    }

    class CookieWidgetEngine {
        constructor() {
            this.config = Object.assign(
                {},
                DEFAULT_CONFIG,
                readConfigFromScriptTag(),
                root.CookieWidgetConfig || {}
            );

            this.consent = this.loadConsent();
            this.detected = {}; // id -> {...detector, via}
            this._consentListeners = new Set();
            this._detectionListeners = new Set();
            this._activatedGates = new Set();
            this._rescanTimeout = null;

            this.ready = this._init();
        }

        async _init() {
            this.rescan();
            this.observeNewScripts();
            if (this.hasChosen()) {
                this.activateGatedScripts();
            }
            this._emitDetectionChange();
        }

        // ============ СКАНИРОВАНИЕ СТРАНИЦЫ ============
        rescan() {
            const scripts = Array.from(document.scripts);
            const srcList = scripts.map(s => s.src).filter(Boolean);
            const found = {};

            DETECTORS.forEach(detector => {
                let via = null;

                if (!via && detector.match.src && detector.match.src.length) {
                    const hit = detector.match.src.some(re => srcList.some(src => re.test(src)));
                    if (hit) via = 'script';
                }
                if (!via && detector.match.globals && detector.match.globals.length) {
                    const hit = detector.match.globals.some(g => typeof root[g] !== 'undefined');
                    if (hit) via = 'global';
                }
                if (via) found[detector.id] = Object.assign({ via }, detector);
            });

            const changed = JSON.stringify(Object.keys(found).sort()) !==
                JSON.stringify(Object.keys(this.detected).sort());
            this.detected = found;
            if (changed) this._emitDetectionChange();
            return found;
        }

        // Следим за новыми <script>, добавленными динамически (SPA-переходы,
        // сторонние виджеты, отложенная загрузка) — это и есть "активное"
        // отслеживание, а не разовая проверка при загрузке страницы.
        observeNewScripts() {
            if (this._observer || !('MutationObserver' in root)) return;
            this._observer = new MutationObserver((mutations) => {
                const hasNewScript = mutations.some(m =>
                    Array.from(m.addedNodes || []).some(n => n.nodeName === 'SCRIPT')
                );
                if (!hasNewScript) return;

                clearTimeout(this._rescanTimeout);
                this._rescanTimeout = setTimeout(() => {
                    this.rescan();
                    if (this.hasChosen()) this.activateGatedScripts();
                }, RESCAN_DEBOUNCE_MS);
            });
            this._observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        getDetectedServices() {
            return Object.values(this.detected);
        }

        onDetectionChange(cb) {
            this._detectionListeners.add(cb);
            return () => this._detectionListeners.delete(cb);
        }

        _emitDetectionChange() {
            const list = this.getDetectedServices();
            this._detectionListeners.forEach(cb => {
                try { cb(list); } catch (e) { console.error('[CookieWidget] detection listener error:', e); }
            });
            document.dispatchEvent(new CustomEvent('cw:detection-change', { detail: { services: list } }));
        }

        // ============ СОГЛАСИЕ ПОЛЬЗОВАТЕЛЯ ============
        loadConsent() {
            try {
                const raw = localStorage.getItem(CONSENT_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                return Object.assign({ necessary: true }, parsed);
            } catch (e) {
                return null;
            }
        }

        hasChosen() {
            return !!this.consent;
        }

        getConsent() {
            return this.consent || { necessary: true, analytics: false, marketing: false, functional: false };
        }

        setConsent(partial, opts = {}) {
            const next = Object.assign(
                { necessary: true, analytics: false, marketing: false, functional: false },
                this.consent || {},
                partial,
                { timestamp: Date.now() }
            );
            this.consent = next;
            try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); } catch (e) { /* приватный режим и т.п. — не критично */ }

            this.activateGatedScripts();
            this._emitConsentChange();
            return next;
        }

        acceptAll() {
            const all = {};
            this.config.optionalCategories.forEach(c => { all[c] = true; });
            return this.setConsent(all);
        }

        rejectOptional() {
            const none = {};
            this.config.optionalCategories.forEach(c => { none[c] = false; });
            return this.setConsent(none);
        }

        onConsentChange(cb) {
            this._consentListeners.add(cb);
            return () => this._consentListeners.delete(cb);
        }

        _emitConsentChange() {
            const consent = this.getConsent();
            this._consentListeners.forEach(cb => {
                try { cb(consent); } catch (e) { console.error('[CookieWidget] consent listener error:', e); }
            });
            document.dispatchEvent(new CustomEvent('cw:consent-change', { detail: { consent } }));
        }

        // ============ АКТИВАЦИЯ "ЗАГЛУШЁННЫХ" СКРИПТОВ САЙТА ============
        // Сайт-хозяин может подключать свои трекеры так, чтобы они не
        // выполнялись до согласия:
        //   <script type="text/plain" data-cookie-category="marketing"
        //           data-cookie-src="https://..."></script>
        // Это стандартный паттерн consent-gate: браузер не исполняет
        // type="text/plain", а виджет подменяет такой тег на настоящий
        // <script>, когда пользователь даёт согласие на категорию.
        activateGatedScripts() {
            const consent = this.getConsent();
            const gates = document.querySelectorAll('script[type="text/plain"][data-cookie-category]');

            gates.forEach((gate, index) => {
                const category = gate.dataset.cookieCategory;
                const gateId = gate.dataset.cookieGateId || (gate.dataset.cookieGateId = 'cw_gate_' + index);
                if (this._activatedGates.has(gateId)) return;
                if (category !== 'necessary' && !consent[category]) return;

                const real = document.createElement('script');
                Array.from(gate.attributes).forEach(attr => {
                    if (attr.name === 'type') return;
                    if (attr.name === 'data-cookie-src') { real.src = attr.value; return; }
                    real.setAttribute(attr.name, attr.value);
                });
                if (!real.src && gate.textContent.trim()) {
                    real.textContent = gate.textContent;
                }
                gate.parentNode.insertBefore(real, gate.nextSibling);
                this._activatedGates.add(gateId);
            });
        }

        getConfig() {
            return this.config;
        }
    }

    root.CookieWidgetEngine = CookieWidgetEngine;
    root.CookieWidget = new CookieWidgetEngine();
})(window);
