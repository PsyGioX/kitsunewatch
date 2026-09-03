// achievements/achievements-page.js
//
// Кнопка-иконка в шапке сайта (по образцу theme-switcher из
// theme-manager.js) + отдельная полноэкранная страница достижений,
// которая целиком строится этим скриптом на лету (без отдельного .html).
// Открывается через window.KWAchievements.openPage() или по клику на
// кнопку в шапке; слушает 'kw:achievements-open'.

(function () {
    'use strict';

    let pageEl = null;
    let currentFilter = 'all'; // all | unlocked | locked
    let currentCategory = 'all';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str == null ? '' : str);
        return div.innerHTML;
    }

    // ============ КНОПКА В ШАПКЕ ============
    function buildHeaderButton() {
        if (document.querySelector('.kw-achv-nav-button')) return;
        const header = document.querySelector('.logo_details');
        if (!header) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kw-achv-nav-button';
        btn.setAttribute('aria-label', 'Достижения');
        btn.innerHTML = `
            <i class="bi bi-trophy"></i>
            <span class="kw-achv-nav-badge" style="display:none;">0</span>
        `;
        btn.addEventListener('click', () => openPage());
        header.appendChild(btn);

        updateHeaderButton();
    }

    function updateHeaderButton() {
        const btn = document.querySelector('.kw-achv-nav-button');
        if (!btn || !window.KWAchievements) return;
        const state = window.KWAchievements.getState();
        const badge = btn.querySelector('.kw-achv-nav-badge');
        if (!badge) return;
        badge.textContent = `${state.unlockedCount}/${state.totalCount}`;
        badge.style.display = state.totalCount ? 'inline-flex' : 'none';
    }

    // ============ СТРАНИЦА ДОСТИЖЕНИЙ ============
    function buildPage() {
        const overlay = document.createElement('div');
        overlay.className = 'kw-achv-page';
        overlay.innerHTML = `
            <div class="kw-achv-page-inner">
                <div class="kw-achv-page-header">
                    <div class="kw-achv-page-heading">
                        <i class="bi bi-trophy-fill"></i>
                        <h2>Достижения</h2>
                    </div>
                    <button type="button" class="kw-achv-page-close" aria-label="Закрыть">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>

                <div class="kw-achv-summary"></div>

                <div class="kw-achv-controls">
                    <div class="kw-achv-filter-group" data-role="status-filter">
                        <button type="button" class="kw-achv-filter-btn active" data-filter="all">Все</button>
                        <button type="button" class="kw-achv-filter-btn" data-filter="unlocked">Получены</button>
                        <button type="button" class="kw-achv-filter-btn" data-filter="locked">Не получены</button>
                    </div>
                    <div class="kw-achv-category-group" data-role="category-filter"></div>
                </div>

                <div class="kw-achv-grid"></div>
            </div>
        `;

        overlay.querySelector('.kw-achv-page-close').addEventListener('click', closePage);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePage();
        });

        overlay.querySelectorAll('.kw-achv-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                overlay.querySelectorAll('.kw-achv-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
                renderGrid();
            });
        });

        document.body.appendChild(overlay);
        return overlay;
    }

    function renderCategoryTabs() {
        if (!pageEl || !window.KWAchievements) return;
        const wrap = pageEl.querySelector('[data-role="category-filter"]');
        const categories = window.KWAchievements.getCategories();

        const all = [{ id: 'all', name: 'Все категории', icon: 'bi-grid' }, ...categories];
        wrap.innerHTML = all.map(cat => `
            <button type="button" class="kw-achv-cat-btn ${cat.id === currentCategory ? 'active' : ''}" data-cat="${cat.id}">
                <i class="bi ${cat.icon || 'bi-tag'}"></i> ${escapeHtml(cat.name)}
            </button>
        `).join('');

        wrap.querySelectorAll('.kw-achv-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCategory = btn.dataset.cat;
                wrap.querySelectorAll('.kw-achv-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
                renderGrid();
            });
        });
    }

    function renderSummary() {
        if (!pageEl || !window.KWAchievements) return;
        const state = window.KWAchievements.getState();
        const pct = state.totalCount ? Math.round((state.unlockedCount / state.totalCount) * 100) : 0;

        pageEl.querySelector('.kw-achv-summary').innerHTML = `
            <div class="kw-achv-summary-stat">
                <span class="kw-achv-summary-value">${state.unlockedCount}/${state.totalCount}</span>
                <span class="kw-achv-summary-label">достижений</span>
            </div>
            <div class="kw-achv-summary-bar">
                <div class="kw-achv-summary-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="kw-achv-summary-stat">
                <span class="kw-achv-summary-value">${state.earnedPoints}</span>
                <span class="kw-achv-summary-label">из ${state.totalPoints} очков</span>
            </div>
        `;
    }

    function renderGrid() {
        if (!pageEl || !window.KWAchievements) return;
        const grid = pageEl.querySelector('.kw-achv-grid');
        const defs = window.KWAchievements.getDefinitions();

        const filtered = defs.filter(def => {
            const unlocked = !!window.KWAchievements.getState().unlocked[def.id];
            if (currentFilter === 'unlocked' && !unlocked) return false;
            if (currentFilter === 'locked' && unlocked) return false;
            if (currentCategory !== 'all' && def.category !== currentCategory) return false;
            return true;
        });

        if (!filtered.length) {
            grid.innerHTML = `<div class="kw-achv-empty">Ничего не найдено в этом фильтре.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(def => cardHtml(def)).join('');
    }

    function cardHtml(def) {
        const progress = window.KWAchievements.getProgress(def.id);
        const isSecretLocked = def.secret && !progress.unlocked;
        const title = isSecretLocked ? '???' : def.title;
        const desc = isSecretLocked ? 'Секретное достижение — откройте его, чтобы узнать подробности.' : def.description;
        const icon = isSecretLocked ? 'bi-question-lg' : (def.icon || 'bi-award');
        const pct = progress.target ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : 0;

        return `
            <div class="kw-achv-card ${progress.unlocked ? 'unlocked' : 'locked'}">
                <div class="kw-achv-card-icon"><i class="bi ${icon}"></i></div>
                <div class="kw-achv-card-body">
                    <div class="kw-achv-card-title-row">
                        <span class="kw-achv-card-title">${escapeHtml(title)}</span>
                        <span class="kw-achv-card-points">+${def.points || 0}</span>
                    </div>
                    <p class="kw-achv-card-desc">${escapeHtml(desc)}</p>
                    ${!isSecretLocked ? `
                        <div class="kw-achv-card-progress">
                            <div class="kw-achv-card-progress-bar">
                                <div class="kw-achv-card-progress-fill" style="width:${pct}%"></div>
                            </div>
                            <span class="kw-achv-card-progress-text">${progress.current}/${progress.target}</span>
                        </div>
                    ` : ''}
                </div>
                ${progress.unlocked ? '<i class="bi bi-check-circle-fill kw-achv-card-check"></i>' : ''}
            </div>
        `;
    }

    async function openPage() {
        if (window.KWAchievements) await window.KWAchievements.ready;

        if (!pageEl) {
            pageEl = buildPage();
        }

        renderCategoryTabs();
        renderSummary();
        renderGrid();

        requestAnimationFrame(() => pageEl.classList.add('open'));
        document.body.classList.add('kw-achv-page-lock');
    }

    function closePage() {
        if (!pageEl) return;
        pageEl.classList.remove('open');
        document.body.classList.remove('kw-achv-page-lock');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pageEl && pageEl.classList.contains('open')) closePage();
    });

    document.addEventListener('kw:achievements-open', openPage);
    document.addEventListener('kw:achievements-state-changed', () => {
        updateHeaderButton();
        if (pageEl && pageEl.classList.contains('open')) {
            renderSummary();
            renderGrid();
        }
    });

    function init() {
        buildHeaderButton();
        if (window.KWAchievements) {
            window.KWAchievements.ready.then(updateHeaderButton);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
