// assets/scripts/theme-manager.js
//
// Независимый модуль переключения тем. Не зависит от KitsuneWatchApp —
// работает даже если основной скрипт ещё не загрузился.
//
// КАК ДОБАВИТЬ НОВУЮ ТЕМУ:
//   1. Добавьте объект в массив THEMES ниже (id должен совпадать
//      с селектором [data-theme="..."] в assets/styles/index.css).
//   2. Скопируйте один из блоков [data-theme="..."] в index.css и
//      задайте свои значения --accent*, --bg-base, --bg-app-rgb,
//      --aura-*, --glow-*.
//   Больше никаких правок не требуется — кнопка-переключатель,
//   сохранение выбора и применение при загрузке подхватят тему
//   автоматически.

const THEMES = [
    { id: 'kitsune', name: 'Kitsune Purple', icon: 'bi-stars', swatch: '#7100b3' },
    { id: 'sakura', name: 'Sakura Pink', icon: 'bi-flower1', swatch: '#ec4899' },
    { id: 'cyber', name: 'Cyber Neon', icon: 'bi-cpu', swatch: '#06b6d4' },
    { id: 'matcha', name: 'Ghibli Matcha', icon: 'bi-tree', swatch: '#4f9458' },
    { id: 'shadow', name: 'Shadow Onyx', icon: 'bi-moon-stars', swatch: '#82828c' }
];

const STORAGE_KEY = 'kitsunewatch_theme';

class ThemeManager {
    constructor(themes) {
        this.themes = themes;
        this.current = this.getStoredTheme();
    }

    getStoredTheme() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && this.themes.some(t => t.id === stored)) return stored;
        } catch (e) { /* localStorage недоступен (приватный режим и т.п.) */ }
        return this.themes[0].id;
    }

    apply(themeId, { persist = true } = {}) {
        const theme = this.themes.find(t => t.id === themeId) || this.themes[0];
        this.current = theme.id;

        // kitsune — тема по умолчанию, у неё нет [data-theme] переопределения,
        // поэтому просто убираем атрибут, а не ставим "kitsune"
        if (theme.id === this.themes[0].id) {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme.id);
        }

        if (persist) {
            try { localStorage.setItem(STORAGE_KEY, theme.id); } catch (e) { /* ignore */ }
        }

        this.syncActiveButton();
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme.id } }));
    }

    syncActiveButton() {
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeId === this.current);
            btn.setAttribute('aria-checked', btn.dataset.themeId === this.current ? 'true' : 'false');
        });
    }

    buildSwitcherUI(mountPoint) {
        if (!mountPoint || document.querySelector('.theme-switcher')) return;

        const wrap = document.createElement('div');
        wrap.className = 'theme-switcher';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'theme-switcher-toggle';
        toggle.setAttribute('aria-haspopup', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Выбрать тему оформления');
        toggle.innerHTML = '<i class="bi bi-palette2"></i>';

        const menu = document.createElement('div');
        menu.className = 'theme-switcher-menu';
        menu.setAttribute('role', 'radiogroup');
        menu.setAttribute('aria-label', 'Темы оформления');

        this.themes.forEach(theme => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'theme-option';
            btn.dataset.themeId = theme.id;
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', theme.id === this.current ? 'true' : 'false');
            btn.innerHTML = `
                <span class="theme-option-swatch" style="background:${theme.swatch}"></span>
                <i class="bi ${theme.icon}"></i>
                <span class="theme-option-name">${theme.name}</span>
            `;
            btn.addEventListener('click', () => {
                this.apply(theme.id);
                menu.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });
            menu.appendChild(btn);
        });

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) {
                menu.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                menu.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        wrap.appendChild(toggle);
        wrap.appendChild(menu);
        mountPoint.appendChild(wrap);
        this.syncActiveButton();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager(THEMES);
    // Тема уже применена инлайн-скриптом в <head> (без FOUC), здесь
    // только синхронизируем состояние кнопки и строим UI.
    window.themeManager.syncActiveButton();
    const header = document.querySelector('.logo_details');
    window.themeManager.buildSwitcherUI(header);
});
