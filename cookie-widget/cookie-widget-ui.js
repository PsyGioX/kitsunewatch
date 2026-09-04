// cookie-widget/cookie-widget-ui.js
//
// UI-слой поверх ядра (cookie-widget-core.js): баннер, панель настроек со
// списком реально найденных на странице скриптов метрик/рекламы
// (сгруппированных по категориям и региону — "мир"/"РФ"), и плавающая
// кнопка для повторного открытия настроек. Полностью независим от
// остального сайта — не требует Bootstrap Icons или других внешних
// библиотек (иконки — инлайн SVG), стили берёт из cookie-widget.css,
// который сам подстраивается под CSS-переменные темы хоста (см. README).
//
// Ничего не рендерит, если ядро (window.CookieWidget) не подключено —
// поэтому порядок подключения: детекторы -> core -> ui.

(function (root) {
    'use strict';

    const engine = root.CookieWidget;
    if (!engine) {
        console.error('[CookieWidget UI] cookie-widget-core.js не подключён раньше cookie-widget-ui.js');
        return;
    }

    const ICONS = {
        cookie: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2a1 1 0 0 1 1 1 3 3 0 0 0 3 3 1 1 0 0 1 1 1 3 3 0 0 0 3 3 1 1 0 0 1-1 1c-.29 5.4-4.73 9.7-10.14 9.7C6.35 20.7 2 16.35 2 10.86 2 5.9 6.03 1.86 11 1.5c.32-.02.68.02 1 .5z" stroke-linejoin="round"/><circle cx="8.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none"/></svg>',
        close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>',
        chevron: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    const I18N = {
        ru: {
            bannerText: (site) => `${site} использует файлы cookie и похожие технологии для работы сайта, аналитики и рекламы.`,
            acceptAll: 'Принять все',
            rejectOptional: 'Только необходимые',
            settingsBtn: 'Настроить',
            panelTitle: 'Настройки cookie',
            saveBtn: 'Сохранить выбор',
            closeTitle: 'Закрыть',
            reopenTitle: 'Настройки cookie',
            alwaysOn: 'Всегда включено',
            categories: {
                necessary: { label: 'Необходимые', desc: 'Обеспечивают базовую работу сайта. Не отключаются.' },
                analytics: { label: 'Аналитика', desc: 'Помогают понять, как посетители используют сайт.' },
                marketing: { label: 'Реклама', desc: 'Используются для показа релевантной рекламы.' },
                functional: { label: 'Функциональные', desc: 'Дополнительные возможности сайта (чаты, виджеты и т.п.).' }
            },
            detectedNone: 'Скрипты этой категории на странице не обнаружены',
            detectedCount: (n) => n === 1 ? 'Обнаружен 1 скрипт' : `Обнаружено ${n} скрипт${n < 5 ? 'а' : 'ов'}`,
            regionWorld: 'мир',
            regionRu: 'РФ',
            viaScript: 'найден по адресу скрипта',
            viaGlobal: 'найден по активной переменной на странице'
        },
        en: {
            bannerText: (site) => `${site} uses cookies and similar technologies for core functionality, analytics and advertising.`,
            acceptAll: 'Accept all',
            rejectOptional: 'Necessary only',
            settingsBtn: 'Customize',
            panelTitle: 'Cookie settings',
            saveBtn: 'Save choices',
            closeTitle: 'Close',
            reopenTitle: 'Cookie settings',
            alwaysOn: 'Always on',
            categories: {
                necessary: { label: 'Necessary', desc: 'Required for the site to function. Cannot be disabled.' },
                analytics: { label: 'Analytics', desc: 'Help understand how visitors use the site.' },
                marketing: { label: 'Marketing', desc: 'Used to show relevant advertising.' },
                functional: { label: 'Functional', desc: 'Extra features (chats, widgets, etc).' }
            },
            detectedNone: 'No scripts of this category detected on the page',
            detectedCount: (n) => n === 1 ? '1 script detected' : `${n} scripts detected`,
            regionWorld: 'world',
            regionRu: 'RU',
            viaScript: 'detected via script address',
            viaGlobal: 'detected via active variable on the page'
        }
    };

    class CookieWidgetUI {
        constructor(engine) {
            this.engine = engine;
            this.t = I18N[engine.getConfig().locale] || I18N.ru;
            this.pendingChoice = {}; // черновой выбор в открытой панели, до "Сохранить"
            this._built = false;
        }

        async init() {
            await this.engine.ready;
            this.build();
            this.engine.onDetectionChange(() => this.refreshDetectionCounts());
            this.engine.onConsentChange(() => this.syncVisibility());
            this.syncVisibility();
        }

        build() {
            if (this._built) return;
            this._built = true;
            const cfg = this.engine.getConfig();

            this.root = document.createElement('div');
            this.root.className = 'cw-root';
            this.root.dataset.cwPosition = cfg.position;
            this.root.innerHTML = this.bannerTemplate() + this.reopenButtonTemplate();
            document.body.appendChild(this.root);

            this.overlay = document.createElement('div');
            this.overlay.className = 'cw-overlay';
            this.overlay.hidden = true;
            this.overlay.innerHTML = this.panelTemplate();
            document.body.appendChild(this.overlay);

            this.banner = this.root.querySelector('.cw-banner');
            this.reopenBtn = this.root.querySelector('.cw-reopen-btn');
            this.panel = this.overlay.querySelector('.cw-panel');

            this.root.addEventListener('click', (e) => this.handleClick(e));
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.closeSettings();
                this.handleClick(e);
            });

            this.renderDetectedLists();
        }

        bannerTemplate() {
            const cfg = this.engine.getConfig();
            const t = this.t;
            const policyLink = cfg.policyUrl
                ? ` <a class="cw-link" href="${cfg.policyUrl}" target="_blank" rel="noopener noreferrer">${t.panelTitle}</a>.`
                : '';
            return `
                <div class="cw-banner" role="dialog" aria-live="polite" aria-label="${t.panelTitle}">
                    <div class="cw-banner-icon">${ICONS.cookie}</div>
                    <div class="cw-banner-body">
                        <p class="cw-banner-text">${t.bannerText(this.escape(cfg.siteName))}${policyLink}</p>
                    </div>
                    <div class="cw-banner-actions">
                        <button type="button" class="cw-btn cw-btn-ghost" data-cw-action="settings">${t.settingsBtn}</button>
                        <button type="button" class="cw-btn cw-btn-outline" data-cw-action="reject">${t.rejectOptional}</button>
                        <button type="button" class="cw-btn cw-btn-primary" data-cw-action="accept">${t.acceptAll}</button>
                    </div>
                </div>`;
        }

        reopenButtonTemplate() {
            if (!this.engine.getConfig().showReopenButton) return '';
            return `
                <button type="button" class="cw-reopen-btn" data-cw-action="settings"
                        title="${this.t.reopenTitle}" aria-label="${this.t.reopenTitle}" hidden>
                    ${ICONS.cookie}
                </button>`;
        }

        panelTemplate() {
            const t = this.t;
            const categories = ['necessary', 'analytics', 'marketing', 'functional']
                .filter(cat => cat === 'necessary' || this.engine.getConfig().optionalCategories.includes(cat));

            const rows = categories.map(cat => this.categoryTemplate(cat)).join('');

            return `
                <div class="cw-panel" role="dialog" aria-modal="true" aria-label="${t.panelTitle}">
                    <div class="cw-panel-header">
                        <h3>${t.panelTitle}</h3>
                        <button type="button" class="cw-close" data-cw-action="close" title="${t.closeTitle}" aria-label="${t.closeTitle}">
                            ${ICONS.close}
                        </button>
                    </div>
                    <div class="cw-panel-body">${rows}</div>
                    <div class="cw-panel-footer">
                        <button type="button" class="cw-btn cw-btn-outline" data-cw-action="reject">${t.rejectOptional}</button>
                        <button type="button" class="cw-btn cw-btn-primary" data-cw-action="save">${t.saveBtn}</button>
                    </div>
                </div>`;
        }

        categoryTemplate(cat) {
            const t = this.t;
            const info = t.categories[cat];
            const isNecessary = cat === 'necessary';
            const checked = isNecessary || !!this.engine.getConsent()[cat];

            return `
                <div class="cw-category" data-cw-category="${cat}">
                    <div class="cw-category-head">
                        <div class="cw-category-title">
                            <span>${info.label}</span>
                            <span class="cw-detected-count" data-cw-count-for="${cat}"></span>
                        </div>
                        <label class="cw-switch ${isNecessary ? 'cw-switch-locked' : ''}">
                            <input type="checkbox" data-cw-toggle="${cat}" ${checked ? 'checked' : ''} ${isNecessary ? 'disabled' : ''}>
                            <span class="cw-switch-track"><span class="cw-switch-thumb"></span></span>
                        </label>
                    </div>
                    <p class="cw-category-desc">${info.desc}${isNecessary ? ' · ' + t.alwaysOn : ''}</p>
                    <details class="cw-detected-list" data-cw-list-for="${cat}"></details>
                </div>`;
        }

        // ============ СПИСКИ НАЙДЕННЫХ СКРИПТОВ ПО КАТЕГОРИЯМ ============
        // Один проход: обновляет и счётчики в заголовках категорий, и сами
        // раскрывающиеся списки сервисов за один вызов. Раньше здесь было
        // две функции, вызывавшие друг друга по кругу (renderDetectedLists
        // -> refreshDetectionCounts -> renderDetectedListsQuiet ->
        // renderDetectedLists -> ...), что валило страницу в
        // "RangeError: Maximum call stack size exceeded" сразу при
        // построении баннера.
        renderDetectedLists() {
            if (!this.overlay) return;
            const services = this.engine.getDetectedServices();
            const t = this.t;
            const byCategory = { necessary: [], analytics: [], marketing: [], functional: [] };
            services.forEach(s => { if (byCategory[s.category]) byCategory[s.category].push(s); });

            Object.keys(byCategory).forEach(cat => {
                const items = byCategory[cat];

                const badge = this.overlay.querySelector(`[data-cw-count-for="${cat}"]`);
                if (badge) badge.textContent = items.length > 0 ? items.length : '';

                const listEl = this.overlay.querySelector(`[data-cw-list-for="${cat}"]`);
                if (!listEl) return;

                if (items.length === 0) {
                    listEl.innerHTML = '';
                    listEl.hidden = true;
                } else {
                    listEl.hidden = false;
                    listEl.innerHTML = `
                        <summary>${ICONS.chevron} ${t.detectedCount(items.length)}</summary>
                        <ul class="cw-service-list">
                            ${items.map(s => `
                                <li class="cw-service-item">
                                    <span class="cw-service-name">${this.escape(s.name)}</span>
                                    <span class="cw-service-meta">
                                        <span class="cw-region-badge cw-region-${s.region}">${s.region === 'ru' ? t.regionRu : t.regionWorld}</span>
                                        ${this.escape(s.company)}
                                    </span>
                                </li>
                            `).join('')}
                        </ul>`;
                }
            });
        }

        // Вызывается при "живом" изменении списка найденных сервисов
        // (см. observeNewScripts в ядре). Перерисовывает панель, только
        // если она уже построена — до этого просто нечего обновлять.
        refreshDetectionCounts() {
            if (!this.overlay || !this.overlay.querySelector('.cw-panel')) return;
            this.renderDetectedLists();
        }

        // ============ ВИДИМОСТЬ БАННЕРА / КНОПКИ ============
        syncVisibility() {
            const chosen = this.engine.hasChosen();
            if (this.banner) this.banner.classList.toggle('cw-visible', !chosen);
            if (this.reopenBtn) this.reopenBtn.hidden = !chosen;
        }

        // ============ ОБРАБОТКА ДЕЙСТВИЙ ============
        handleClick(e) {
            const btn = e.target.closest('[data-cw-action]');
            if (!btn) return;
            const action = btn.dataset.cwAction;

            if (action === 'accept') {
                this.engine.acceptAll();
                this.syncVisibility();
            } else if (action === 'reject') {
                this.engine.rejectOptional();
                this.syncVisibility();
                this.closeSettings();
            } else if (action === 'settings') {
                this.openSettings();
            } else if (action === 'close') {
                this.closeSettings();
            } else if (action === 'save') {
                this.saveFromPanel();
            }
        }

        openSettings() {
            this.renderDetectedLists();
            this.overlay.hidden = false;
            requestAnimationFrame(() => this.overlay.classList.add('cw-visible'));
            document.body.style.overflow = 'hidden';
        }

        closeSettings() {
            this.overlay.classList.remove('cw-visible');
            document.body.style.overflow = '';
            clearTimeout(this._closeTimeout);
            this._closeTimeout = setTimeout(() => { this.overlay.hidden = true; }, 220);
        }

        saveFromPanel() {
            const toggles = this.overlay.querySelectorAll('[data-cw-toggle]');
            const choice = {};
            toggles.forEach(input => {
                choice[input.dataset.cwToggle] = input.checked;
            });
            this.engine.setConsent(choice);
            this.syncVisibility();
            this.closeSettings();
        }

        escape(str) {
            const div = document.createElement('div');
            div.textContent = String(str == null ? '' : str);
            return div.innerHTML;
        }
    }

    const ui = new CookieWidgetUI(engine);
    engine.openSettings = () => ui.openSettings();
    ui.init();

    root.CookieWidgetUI = ui;
})(window);
