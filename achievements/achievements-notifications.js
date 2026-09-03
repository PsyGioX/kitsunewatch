// achievements/achievements-notifications.js
//
// Показывает всплывающие уведомления (тосты) при получении достижения.
// Слушает 'kw:achievement-unlocked', которое кидает achievements-core.js —
// никак не связан с index.js напрямую.

(function () {
    'use strict';

    const QUEUE = [];
    let showing = false;
    let container = null;

    function ensureContainer() {
        if (container) return container;
        container = document.createElement('div');
        container.className = 'kw-achv-toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
        return container;
    }

    function buildToast(achievement) {
        const toast = document.createElement('div');
        toast.className = 'kw-achv-toast';
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
            <div class="kw-achv-toast-icon"><i class="bi ${achievement.icon || 'bi-trophy'}"></i></div>
            <div class="kw-achv-toast-body">
                <div class="kw-achv-toast-label">Достижение получено</div>
                <div class="kw-achv-toast-title">${escapeHtml(achievement.title)}</div>
                <div class="kw-achv-toast-desc">${escapeHtml(achievement.description)}</div>
            </div>
            <div class="kw-achv-toast-points">+${achievement.points || 0}</div>
            <button type="button" class="kw-achv-toast-close" aria-label="Закрыть">
                <i class="bi bi-x"></i>
            </button>
        `;
        toast.querySelector('.kw-achv-toast-close').addEventListener('click', () => dismiss(toast));
        toast.addEventListener('click', (e) => {
            if (e.target.closest('.kw-achv-toast-close')) return;
            if (window.KWAchievements) window.KWAchievements.openPage();
        });
        return toast;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str == null ? '' : str);
        return div.innerHTML;
    }

    function dismiss(toast) {
        if (!toast || toast.classList.contains('leaving')) return;
        toast.classList.add('leaving');
        setTimeout(() => toast.remove(), 350);
    }

    function processQueue() {
        if (showing || QUEUE.length === 0) return;
        showing = true;

        const achievement = QUEUE.shift();
        const toast = buildToast(achievement);
        ensureContainer().appendChild(toast);

        // Небольшая задержка нужна, чтобы браузер применил начальные стили
        // перед добавлением класса анимации появления (transition сработает).
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('visible')));

        const AUTO_DISMISS_MS = 6000;
        const timer = setTimeout(() => {
            dismiss(toast);
        }, AUTO_DISMISS_MS);

        toast.addEventListener('mouseenter', () => clearTimeout(timer));

        setTimeout(() => {
            showing = false;
            processQueue();
        }, AUTO_DISMISS_MS + 400);
    }

    document.addEventListener('kw:achievement-unlocked', (e) => {
        const achievement = e.detail && e.detail.achievement;
        if (!achievement) return;
        QUEUE.push(achievement);
        processQueue();
    });
})();
