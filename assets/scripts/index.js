// assets/scripts/index.js

class KitsuneWatchApp {
    constructor() {
        // API конфигурация
        this.API_TOKEN = 'a036c8a4c59b43e72e212e4d0388ef7d';
        this.API_URL = 'https://kodik-api.com/search';
        this.YEARS_API_URL = 'https://kodik-api.com/years';
        
        // DOM элементы
        this.searchInput = document.querySelector('.search_input_query');
        this.searchButton = document.querySelector('.search_push');
        this.resultsContainer = document.getElementById('resultsParseVideosBlock');
        this.videoName = document.getElementById('name_video');
        this.videoFrame = document.getElementById('parse_link_on_video');
        this.videoAbout = document.getElementById('videoAboutPasteToParse');
        this.aboutBlock = document.getElementById('aboutVideoBlock');
        this.shareLink = document.getElementById('LInkToVideoForShare');
        
        // Скрываем начальные элементы
        this.resultsContainer.style.display = 'none';
        this.videoFrame.style.display = 'none';
        this.aboutBlock.style.display = 'none';
        
        // Создаем placeholder
        this.createVideoPlaceholder();
        
        // Состояние приложения
        this.tabsContainer = null;
        this.videoListContainer = null;
        this.shareButton = null;
        this.favoriteButton = null;
        this.historyContainer = null;
        this.favoritesContainer = null;
        this.loadingOverlay = null;
        this.aboutProjectContainer = null;
        this.premieresContainer = null;
        this.paginationContainer = null;
        this.installButton = null;
        this.deferredPrompt = null;
        this.currentResults = [];
        this.allResults = []; // Все результаты без пагинации
        this.filteredResults = []; // Отфильтрованные результаты
        this.activeFilter = 'all';
        this.hasSearched = false;
        this.currentVideo = null;
        this.isSearching = false;
        this.isVideoLoading = false;
        this.currentSearchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.totalItems = 0;
        
        // Данные из localStorage
        this.searchHistory = this.loadFromStorage('kitsunewatch_history', []);
        this.favorites = this.loadFromStorage('kitsunewatch_favorites', []);
        
        // Состояние плеера
        this.playerState = {
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 1,
            isMuted: false,
            playbackSpeed: 1,
            currentEpisode: null,
            currentSeason: null,
            translation: null
        };
        
        this.init();
    }

    // ============ ВИДЕО PLACEHOLDER ============
    createVideoPlaceholder() {
        this.videoContainer = document.createElement('div');
        this.videoContainer.className = 'video-container';
        this.videoContainer.style.cssText = 'position:relative;width:100%;display:none;';
        
        this.videoFrame.parentElement.insertBefore(this.videoContainer, this.videoFrame);
        this.videoContainer.appendChild(this.videoFrame);
        
        this.videoPlaceholder = document.createElement('div');
        this.videoPlaceholder.className = 'video-placeholder';
        this.videoPlaceholder.style.cssText = 'display:none;position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;';
        this.videoPlaceholder.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-spinner"></div>
                <div class="placeholder-text">Загрузка плеера...</div>
            </div>
        `;
        
        this.videoContainer.appendChild(this.videoPlaceholder);
        
        this.videoFrame.addEventListener('load', () => {
            this.hideVideoPlaceholder();
            this.isVideoLoading = false;
        });
        
        this.videoFrame.addEventListener('error', () => {
            this.showVideoError();
            this.isVideoLoading = false;
        });
    }

    showVideoPlaceholder() {
        if (this.videoPlaceholder && this.videoContainer) {
            this.videoContainer.style.display = 'block';
            this.videoPlaceholder.style.display = 'flex';
            this.videoFrame.style.display = 'none';
        }
    }

    hideVideoPlaceholder() {
        if (this.videoPlaceholder && this.videoContainer) {
            this.videoPlaceholder.style.display = 'none';
            this.videoFrame.style.display = 'block';
        }
    }

    showVideoError() {
        if (this.videoPlaceholder) {
            this.videoPlaceholder.style.display = 'flex';
            this.videoPlaceholder.innerHTML = `
                <div class="placeholder-content">
                    <i class="bi bi-exclamation-triangle placeholder-error"></i>
                    <div class="placeholder-text">Ошибка загрузки</div>
                    <button class="placeholder-retry-button" id="retryVideoButton">
                        <i class="bi bi-arrow-clockwise"></i> Повторить
                    </button>
                </div>
            `;
            
            const btn = document.getElementById('retryVideoButton');
            if (btn) btn.addEventListener('click', () => {
                if (this.currentVideo) this.loadVideo(this.currentVideo);
            });
        }
    }

    // ============ ЛОГОТИП ============
    setupLogo() {
        const logoImg = document.querySelector('.logo_img');
        if (!logoImg) return;
        
        const paths = [
            '/imgs/logo.svg',
            '/imgs/logo.jpg',
            '/favicon-32x32.png'
        ];
        
        let index = 0;
        
        logoImg.onerror = () => {
            index++;
            if (index < paths.length) {
                logoImg.src = paths[index];
            } else {
                logoImg.style.display = 'none';
                const parent = logoImg.parentElement;
                if (parent) {
                    const icon = document.createElement('i');
                    icon.className = 'bi bi-stars logo-fallback';
                    icon.style.cssText = 'font-size:24px;color:#b44dff;';
                    parent.insertBefore(icon, logoImg.nextSibling);
                }
            }
        };
        
        logoImg.src = paths[0];
    }

    // ============ ИНИЦИАЛИЗАЦИЯ ============
    init() {
        this.createUIElements();
        this.setupLogo();
        this.setupEventListeners();
        this.setupProtection();
        this.setupPlayerListener();
        this.setupPWA();
        this.displayAboutProject();
        this.loadYearPremieres();
        this.handleURLParams();
        this.updateSEO();
        
        setTimeout(() => {
            this.displayHistory();
            this.displayFavorites();
        }, 500);
    }

    // ============ ЗАГРУЗКА ПРЕМЬЕР ГОДА ============
    async loadYearPremieres() {
        try {
            const currentYear = new Date().getFullYear();
            
            // Получаем список годов для разных типов контента
            const response = await fetch(`${this.YEARS_API_URL}?token=${this.API_TOKEN}&types=anime,anime-serial,foreign-movie,foreign-serial&sort=year`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                // Находим текущий год или ближайший доступный
                let targetYear = currentYear;
                let yearData = data.results.find(item => item.year === currentYear);
                
                // Если текущего года нет, ищем ближайший
                if (!yearData) {
                    yearData = data.results.reduce((closest, item) => {
                        const currentDiff = Math.abs(item.year - currentYear);
                        const closestDiff = Math.abs(closest.year - currentYear);
                        return currentDiff < closestDiff ? item : closest;
                    });
                    targetYear = yearData.year;
                }
                
                this.displayPremieres(targetYear, yearData.count);
            }
        } catch (error) {
            console.error('Error loading year premieres:', error);
            // Показываем заглушку с текущим годом
            const currentYear = new Date().getFullYear();
            this.displayPremieres(currentYear, 0);
        }
    }

    displayPremieres(year, count) {
        if (!this.premieresContainer) return;
        
        this.premieresContainer.innerHTML = `
            <div class="premieres-block">
                <div class="premieres-header">
                    <i class="bi bi-calendar-event"></i>
                    <h2>Премьеры ${year} года</h2>
                </div>
                <div class="premieres-content">
                    <div class="premieres-stats">
                        <div class="premieres-stat">
                            <span class="premieres-stat-number">${count > 0 ? count : '...'}</span>
                            <span class="premieres-stat-label">${count > 0 ? 'новых материалов' : 'загружаем данные'}</span>
                        </div>
                        <div class="premieres-description">
                            <p>Лучшие новинки аниме и фильмов ${year} года уже доступны на KitsuneWatch!</p>
                            <button class="premieres-search-button" onclick="window.app.searchYearPremieres(${year})">
                                <i class="bi bi-search"></i> Показать премьеры
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async searchYearPremieres(year) {
        this.searchInput.value = `${year}`;
        this.currentSearchQuery = `${year}`;
        await this.performSearch();
    }

    // ============ SEO ОПТИМИЗАЦИЯ ============
    updateSEO() {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('search');
        const title = document.querySelector('title');
        const metaDescription = document.querySelector('meta[name="description"]');
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');
        
        const baseTitle = 'KitsuneWatch - Смотри аниме онлайн';
        const baseDescription = 'KitsuneWatch - бесплатный онлайн-кинотеатр аниме. Смотрите любимые аниме сериалы и фильмы в высоком качестве.';
        const baseKeywords = 'аниме, смотреть аниме, аниме онлайн, KitsuneWatch, аниме сериалы, японская анимация';
        
        if (searchQuery && searchQuery.trim()) {
            let query = searchQuery.trim();
            try {
                query = decodeURIComponent(query);
                if (query.includes('%25')) {
                    query = decodeURIComponent(query);
                }
            } catch (e) {}
            
            if (title) {
                title.textContent = `${query} - смотреть аниме онлайн | KitsuneWatch`;
            }
            if (metaDescription) {
                metaDescription.content = `Смотреть ${query} онлайн в хорошем качестве. Все серии ${query} на KitsuneWatch. Бесплатно, без регистрации.`;
            }
            if (metaKeywords) {
                metaKeywords.content = `${query}, смотреть ${query}, ${query} аниме, ${query} онлайн, аниме ${query}`;
            }
            if (ogTitle) {
                ogTitle.content = `${query} - смотреть онлайн | KitsuneWatch`;
            }
            if (ogDescription) {
                ogDescription.content = `Смотреть ${query} онлайн в хорошем качестве. Все серии ${query} на KitsuneWatch.`;
            }
            if (ogUrl) {
                ogUrl.content = window.location.href;
            }
            this.updateCanonicalLink(window.location.href);
            
        } else if (params.get('favorites') === 'true') {
            if (title) title.textContent = 'Избранное | KitsuneWatch';
            if (metaDescription) metaDescription.content = 'Ваши любимые аниме в избранном на KitsuneWatch. Быстрый доступ к сохраненным тайтлам.';
            if (ogTitle) ogTitle.content = 'Избранное | KitsuneWatch';
            this.updateCanonicalLink(window.location.origin + '/?favorites=true');
            
        } else if (params.get('history') === 'true') {
            if (title) title.textContent = 'История просмотров | KitsuneWatch';
            if (metaDescription) metaDescription.content = 'История просмотров аниме на KitsuneWatch. Продолжайте смотреть с того места, где остановились.';
            if (ogTitle) ogTitle.content = 'История просмотров | KitsuneWatch';
            this.updateCanonicalLink(window.location.origin + '/?history=true');
            
        } else {
            if (title) title.textContent = baseTitle;
            if (metaDescription) metaDescription.content = baseDescription;
            if (metaKeywords) metaKeywords.content = baseKeywords;
            if (ogTitle) ogTitle.content = baseTitle;
            if (ogDescription) ogDescription.content = baseDescription;
            if (ogUrl) ogUrl.content = window.location.origin;
            this.updateCanonicalLink(window.location.origin);
        }
    }
    
    updateCanonicalLink(href) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = href;
    }

    // ============ PWA ============
    setupPWA() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
        
        window.addEventListener('appinstalled', () => this.hideInstallButton());
        window.addEventListener('online', () => this.showNetworkStatus(true));
        window.addEventListener('offline', () => this.showNetworkStatus(false));
        
        this.registerServiceWorker();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('SW зарегистрирован');
            } catch (e) {
                console.error('SW ошибка:', e);
            }
        }
    }

    showInstallButton() {
        if (!this.installButton) {
            this.installButton = document.createElement('button');
            this.installButton.className = 'install-button';
            this.installButton.innerHTML = '<i class="bi bi-download"></i> Установить';
            this.installButton.addEventListener('click', () => this.installApp());
            
            document.body.appendChild(this.installButton);
        }
        this.installButton.style.display = 'inline-flex';
    }

    hideInstallButton() {
        if (this.installButton) this.installButton.style.display = 'none';
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const result = await this.deferredPrompt.userChoice;
            if (result.outcome === 'accepted') this.hideInstallButton();
            this.deferredPrompt = null;
        }
    }

    showNetworkStatus(isOnline) {
        const status = document.createElement('div');
        status.className = `network-status ${isOnline ? 'online' : 'offline'}`;
        status.innerHTML = isOnline 
            ? '<i class="bi bi-wifi"></i> Онлайн'
            : '<i class="bi bi-wifi-off"></i> Офлайн';
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 3000);
    }

    // ============ ОБРАБОТКА ПАРАМЕТРОВ URL ============
    handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        
        const searchQuery = params.get('search');
        if (searchQuery && searchQuery.trim()) {
            let decodedQuery = searchQuery.trim();
            
            try {
                decodedQuery = decodeURIComponent(decodedQuery);
            } catch (e) {
                console.warn('Failed to decode URI:', e);
            }
            
            if (decodedQuery.includes('%25')) {
                try {
                    decodedQuery = decodeURIComponent(decodedQuery);
                } catch (e) {
                    console.warn('Failed second decode URI:', e);
                }
            }
            
            this.searchInput.value = decodedQuery;
            this.currentSearchQuery = decodedQuery;
            
            setTimeout(() => {
                this.performSearch();
            }, 500);
            return;
        }
        
        const videoId = params.get('video');
        if (videoId && videoId.trim()) {
            const fav = this.favorites.find(f => f.id === videoId || f.link.includes(videoId));
            if (fav) {
                setTimeout(() => {
                    this.loadVideo(fav);
                }, 500);
            }
            return;
        }
        
        if (params.get('favorites') === 'true') {
            this.displayFavorites();
        }
        
        if (params.get('history') === 'true') {
            this.displayHistory();
        }
    }

    // ============ UI ЭЛЕМЕНТЫ ============
    createUIElements() {
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'video-tabs';
        this.tabsContainer.style.display = 'none';
        
        this.videoListContainer = document.createElement('div');
        this.videoListContainer.className = 'video-list';
        this.videoListContainer.style.display = 'none';
        
        this.paginationContainer = document.createElement('div');
        this.paginationContainer.className = 'pagination-container';
        this.paginationContainer.style.display = 'none';
        
        this.historyContainer = document.createElement('div');
        this.historyContainer.className = 'search-history';
        this.historyContainer.style.display = 'none';
        
        this.favoritesContainer = document.createElement('div');
        this.favoritesContainer.className = 'favorites-block';
        this.favoritesContainer.style.display = 'none';
        
        this.aboutProjectContainer = document.createElement('div');
        this.aboutProjectContainer.className = 'about-project';
        this.aboutProjectContainer.style.display = 'block';
        
        this.premieresContainer = document.createElement('div');
        this.premieresContainer.className = 'premieres-container';
        this.premieresContainer.style.display = 'block';
        
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.style.display = 'none';
        this.loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Поиск...</div>
        `;
        
        this.shareButton = document.createElement('button');
        this.shareButton.className = 'share-button';
        this.shareButton.innerHTML = '<i class="bi bi-share"></i> Поделиться';
        this.shareButton.style.display = 'none';
        this.shareButton.addEventListener('click', () => this.copyShareLink());
        
        this.favoriteButton = document.createElement('button');
        this.favoriteButton.className = 'favorite-button';
        this.favoriteButton.innerHTML = '<i class="bi bi-heart"></i> В избранное';
        this.favoriteButton.style.display = 'none';
        this.favoriteButton.addEventListener('click', () => this.toggleFavorite());
        
        const mainBlock = document.querySelector('.main_block');
        mainBlock.appendChild(this.aboutProjectContainer);
        mainBlock.appendChild(this.premieresContainer);
        mainBlock.appendChild(this.loadingOverlay);
        mainBlock.appendChild(this.tabsContainer);
        mainBlock.appendChild(this.videoListContainer);
        mainBlock.appendChild(this.paginationContainer);
        mainBlock.appendChild(this.historyContainer);
        mainBlock.appendChild(this.favoritesContainer);
        
        const shareBlock = document.querySelector('.shareToDirectLinkOnVideoBlock');
        if (shareBlock) {
            shareBlock.appendChild(this.favoriteButton);
            shareBlock.appendChild(this.shareButton);
        }
    }

    displayAboutProject() {
        if (!this.aboutProjectContainer) return;
        
        this.aboutProjectContainer.innerHTML = `
            <div class="about-project-content">
                <div class="about-project-header">
                    <i class="bi bi-stars"></i>
                    <h2>KitsuneWatch</h2>
                </div>
                <p class="about-project-description">
                    Ваш персональный портал в мир аниме!
                </p>
                <div class="about-project-features">
                    <div class="feature-card">
                        <i class="bi bi-search"></i>
                        <h3>Поиск</h3>
                        <p>Находите аниме по названию</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-collection-play"></i>
                        <h3>HD качество</h3>
                        <p>Смотрите в высоком качестве</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-heart"></i>
                        <h3>Избранное</h3>
                        <p>Сохраняйте тайтлы</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-clock-history"></i>
                        <h3>История</h3>
                        <p>Быстрый доступ</p>
                    </div>
                </div>
                <div class="about-project-cta">
                    <p>Начните поиск</p>
                    <i class="bi bi-arrow-up"></i>
                </div>
            </div>
        `;
    }

    hideAboutProject() {
        if (this.aboutProjectContainer) this.aboutProjectContainer.style.display = 'none';
    }

    // ============ СОБЫТИЯ ============
    setupEventListeners() {
        this.searchButton.addEventListener('click', () => this.performSearch());
        
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        this.searchInput.addEventListener('input', () => {
            if (!this.searchInput.value.trim()) {
                this.clearAllResults();
                this.displayAboutProject();
                this.loadYearPremieres();
                this.updateUrlWithoutReload('/');
                this.updateSEO();
                this.currentSearchQuery = '';
            }
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        window.addEventListener('popstate', () => {
            this.handleURLParams();
            this.updateSEO();
        });
    }

    setupProtection() {
        if (window.top !== window.self) window.top.location = window.self.location;
        
        if (this.videoFrame) {
            this.videoFrame.addEventListener('contextmenu', (e) => e.preventDefault());
            this.videoFrame.addEventListener('dragstart', (e) => e.preventDefault());
            this.videoFrame.addEventListener('copy', (e) => e.preventDefault());
            this.videoFrame.addEventListener('selectstart', (e) => e.preventDefault());
        }
    }

    // ============ БЕЗОПАСНОСТЬ ============
    sanitizeInput(input) {
        if (!input) return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    sanitizeUrl(url) {
        if (!url) return '';
        const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:'];
        if (dangerous.some(s => url.toLowerCase().startsWith(s))) return '';
        return url;
    }

    // ============ FETCH ============
    async fetchWithTimeout(url, timeout = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // ============ ЗАГРУЗКА ============
    showLoading() {
        this.isSearching = true;
        this.searchButton.disabled = true;
        this.searchButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Поиск...';
        
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
            this.loadingOverlay.classList.add('active');
        }
        
        this.resultsContainer.style.display = 'none';
        this.tabsContainer.style.display = 'none';
        this.videoListContainer.style.display = 'none';
        this.paginationContainer.style.display = 'none';
        this.hideAboutProject();
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        if (this.videoContainer) this.videoContainer.style.display = 'none';
    }

    hideLoading() {
        this.isSearching = false;
        this.searchButton.disabled = false;
        this.searchButton.innerHTML = '<i class="bi bi-search"></i> Искать';
        
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('active');
            setTimeout(() => this.loadingOverlay.style.display = 'none', 300);
        }
    }

    // ============ localStorage ============
    saveToStorage(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    }

    loadFromStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { return defaultValue; }
    }

    // ============ ИСТОРИЯ ============
    addToHistory(query) {
        const clean = query.trim();
        if (!clean) return;
        
        this.searchHistory = this.searchHistory.filter(i => i.query.toLowerCase() !== clean.toLowerCase());
        this.searchHistory.unshift({ query: clean, timestamp: Date.now() });
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        this.saveToStorage('kitsunewatch_history', this.searchHistory);
        this.displayHistory();
    }

    removeFromHistory(query) {
        this.searchHistory = this.searchHistory.filter(i => i.query !== query);
        this.saveToStorage('kitsunewatch_history', this.searchHistory);
        this.displayHistory();
    }

    clearHistory() {
        this.searchHistory = [];
        this.saveToStorage('kitsunewatch_history', []);
        this.displayHistory();
    }

    displayHistory() {
        if (!this.historyContainer) return;
        this.historyContainer.innerHTML = '';
        
        if (this.searchHistory.length === 0) {
            this.historyContainer.style.display = 'none';
            return;
        }
        
        this.historyContainer.style.display = 'block';
        
        const title = document.createElement('h3');
        title.className = 'history-title';
        title.innerHTML = '<i class="bi bi-clock-history"></i> История';
        
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-history-button';
        clearBtn.innerHTML = '<i class="bi bi-trash"></i> Очистить';
        clearBtn.addEventListener('click', () => this.clearHistory());
        
        const container = document.createElement('div');
        container.className = 'history-title-container';
        container.appendChild(title);
        container.appendChild(clearBtn);
        
        this.historyContainer.appendChild(container);
        
        const list = document.createElement('div');
        list.className = 'history-list';
        
        this.searchHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            const span = document.createElement('span');
            span.className = 'history-query';
            span.textContent = item.query;
            span.addEventListener('click', () => {
                let query = item.query;
                try {
                    query = decodeURIComponent(query);
                    if (query.includes('%25')) {
                        query = decodeURIComponent(query);
                    }
                } catch (e) {}
                this.searchInput.value = query;
                this.currentSearchQuery = query;
                this.performSearch();
            });
            
            const remove = document.createElement('button');
            remove.className = 'remove-history-button';
            remove.innerHTML = '<i class="bi bi-x"></i>';
            remove.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromHistory(item.query);
            });
            
            div.appendChild(span);
            div.appendChild(remove);
            list.appendChild(div);
        });
        
        this.historyContainer.appendChild(list);
    }

    // ============ ИЗБРАННОЕ ============
    toggleFavorite() {
        if (!this.currentVideo) return;
        
        const videoId = this.currentVideo.id || this.currentVideo.link;
        const isFav = this.favorites.some(f => f.id === videoId);
        
        if (isFav) {
            this.favorites = this.favorites.filter(f => f.id !== videoId);
            this.favoriteButton.innerHTML = '<i class="bi bi-heart"></i> В избранное';
            this.favoriteButton.classList.remove('active');
        } else {
            this.favorites.unshift({
                id: videoId,
                title: this.currentVideo.title,
                year: this.currentVideo.year,
                type: this.currentVideo.type,
                link: this.currentVideo.link,
                addedAt: Date.now()
            });
            this.favoriteButton.innerHTML = '<i class="bi bi-heart-fill"></i> В избранном';
            this.favoriteButton.classList.add('active');
        }
        
        this.saveToStorage('kitsunewatch_favorites', this.favorites);
        this.displayFavorites();
    }

    removeFromFavorites(videoId) {
        this.favorites = this.favorites.filter(f => f.id !== videoId);
        this.saveToStorage('kitsunewatch_favorites', this.favorites);
        this.displayFavorites();
        
        if (this.currentVideo && (this.currentVideo.id === videoId || this.currentVideo.link === videoId)) {
            this.favoriteButton.innerHTML = '<i class="bi bi-heart"></i> В избранное';
            this.favoriteButton.classList.remove('active');
        }
    }

    displayFavorites() {
        if (!this.favoritesContainer) return;
        this.favoritesContainer.innerHTML = '';
        
        if (this.favorites.length === 0) {
            this.favoritesContainer.style.display = 'none';
            return;
        }
        
        this.favoritesContainer.style.display = 'block';
        
        const title = document.createElement('h3');
        title.className = 'favorites-title';
        title.innerHTML = '<i class="bi bi-heart-fill"></i> Избранное';
        this.favoritesContainer.appendChild(title);
        
        const list = document.createElement('div');
        list.className = 'favorites-list';
        
        this.favorites.forEach(fav => {
            const card = document.createElement('div');
            card.className = 'favorite-card';
            
            const t = document.createElement('span');
            t.className = 'favorite-card-title';
            t.textContent = `${fav.title} (${fav.year || '?'})`;
            
            const type = document.createElement('span');
            type.className = 'favorite-card-info';
            type.textContent = this.getTypeName(fav.type);
            
            const play = document.createElement('button');
            play.className = 'favorite-play-button';
            play.innerHTML = '<i class="bi bi-play-fill"></i>';
            play.addEventListener('click', () => this.playFavorite(fav));
            
            const remove = document.createElement('button');
            remove.className = 'favorite-remove-button';
            remove.innerHTML = '<i class="bi bi-x"></i>';
            remove.addEventListener('click', () => this.removeFromFavorites(fav.id));
            
            card.appendChild(t);
            card.appendChild(type);
            card.appendChild(play);
            card.appendChild(remove);
            list.appendChild(card);
        });
        
        this.favoritesContainer.appendChild(list);
    }

    playFavorite(favorite) {
        this.loadVideo(favorite);
        this.resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // ============ ВИДЕО (С POSTER БЕЗ КОДИРОВАНИЯ) ============
    loadVideo(material) {
        this.currentVideo = material;
        this.isVideoLoading = true;
        this.hideAboutProject();
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        
        this.videoName.textContent = `${material.title || 'Без названия'} (${material.year || '?'})`;
        this.videoName.style.display = 'block';
        
        if (this.videoContainer) this.videoContainer.style.display = 'block';
        this.showVideoPlaceholder();
        
        if (material.link) {
            const url = this.sanitizeUrl(material.link);
            let fullUrl = url.startsWith('//') ? 'https:' + url : url;
            
            // Добавляем poster без кодирования (Kodik сам обработает)
            const posterUrl = 'https://kitsunewatch.vercel.app/imgs/video_obl.jpg';
            const separator = fullUrl.includes('?') ? '&' : '?';
            fullUrl = `${fullUrl}${separator}poster=${posterUrl}`;
            
            this.videoFrame.src = fullUrl;
            this.videoFrame.setAttribute('allow', 'autoplay *; fullscreen *; picture-in-picture *');
            this.videoFrame.setAttribute('allowfullscreen', 'true');
        }
        
        this.displayVideoInfo(material);
        
        const shareUrl = this.generateShareUrl(material);
        this.shareLink.href = shareUrl;
        
        if (this.shareButton) {
            this.shareButton.style.display = 'inline-flex';
            this.shareButton.innerHTML = '<i class="bi bi-share"></i> Поделиться';
            this.shareButton.classList.remove('copied');
        }
        
        if (this.favoriteButton) {
            this.favoriteButton.style.display = 'inline-flex';
            const videoId = material.id || material.link;
            const isFav = this.favorites.some(f => f.id === videoId);
            
            if (isFav) {
                this.favoriteButton.innerHTML = '<i class="bi bi-heart-fill"></i> В избранном';
                this.favoriteButton.classList.add('active');
            } else {
                this.favoriteButton.innerHTML = '<i class="bi bi-heart"></i> В избранное';
                this.favoriteButton.classList.remove('active');
            }
        }
        
        this.resultsContainer.style.display = 'block';
        
        if (material.title) {
            const newUrl = `${window.location.origin}/?search=${encodeURIComponent(material.title)}`;
            this.updateUrlWithoutReload(newUrl);
            this.updateSEO();
            this.currentSearchQuery = material.title;
        }
    }

    // ============ ГРУППИРОВКА РЕЗУЛЬТАТОВ ============
    groupResultsByTitle(results) {
        const grouped = new Map();
        
        results.forEach(result => {
            const key = `${result.title}_${result.year}_${result.type}`;
            
            if (!grouped.has(key)) {
                grouped.set(key, {
                    id: result.id,
                    title: result.title,
                    title_orig: result.title_orig,
                    year: result.year,
                    type: result.type,
                    quality: result.quality,
                    material_data: result.material_data,
                    translations: [{
                        id: result.translation?.id,
                        title: result.translation?.title,
                        link: result.link,
                        quality: result.quality
                    }]
                });
            } else {
                grouped.get(key).translations.push({
                    id: result.translation?.id,
                    title: result.translation?.title,
                    link: result.link,
                    quality: result.quality
                });
            }
        });
        
        return Array.from(grouped.values());
    }

    // ============ ПАГИНАЦИЯ ============
    createPagination(totalItems) {
        if (!this.paginationContainer) return;
        
        this.totalItems = totalItems;
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (this.totalPages <= 1) {
            this.paginationContainer.style.display = 'none';
            this.paginationContainer.innerHTML = '';
            return;
        }
        
        this.paginationContainer.style.display = 'flex';
        this.paginationContainer.innerHTML = '';
        
        // Кнопка "Назад"
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-button';
        prevButton.innerHTML = '<i class="bi bi-chevron-left"></i>';
        prevButton.disabled = this.currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updatePagination();
                this.displayCurrentPage();
            }
        });
        this.paginationContainer.appendChild(prevButton);
        
        // Номера страниц
        const maxVisiblePages = 7; // Увеличено для лучшей навигации
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Первая страница
        if (startPage > 1) {
            const firstPageButton = this.createPageButton(1);
            this.paginationContainer.appendChild(firstPageButton);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                this.paginationContainer.appendChild(ellipsis);
            }
        }
        
        // Страницы
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = this.createPageButton(i);
            this.paginationContainer.appendChild(pageButton);
        }
        
        // Последняя страница
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                this.paginationContainer.appendChild(ellipsis);
            }
            
            const lastPageButton = this.createPageButton(this.totalPages);
            this.paginationContainer.appendChild(lastPageButton);
        }
        
        // Кнопка "Вперед"
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.innerHTML = '<i class="bi bi-chevron-right"></i>';
        nextButton.disabled = this.currentPage === this.totalPages;
        nextButton.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.updatePagination();
                this.displayCurrentPage();
            }
        });
        this.paginationContainer.appendChild(nextButton);
    }
    
    createPageButton(pageNumber) {
        const pageButton = document.createElement('button');
        pageButton.className = 'pagination-button page-number';
        pageButton.textContent = pageNumber;
        pageButton.disabled = pageNumber === this.currentPage;
        if (pageNumber === this.currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            this.currentPage = pageNumber;
            this.updatePagination();
            this.displayCurrentPage();
        });
        return pageButton;
    }
    
    updatePagination() {
        if (this.filteredResults.length > 0) {
            this.createPagination(this.filteredResults.length);
        }
        
        // Прокрутка к началу списка
        if (this.videoListContainer) {
            this.videoListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    displayCurrentPage() {
        if (!this.filteredResults.length) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredResults.length);
        const pageResults = this.filteredResults.slice(startIndex, endIndex);
        
        this.createVideoList(pageResults);
    }

    // ============ ГЕНЕРАЦИЯ ССЫЛОК ДЛЯ ШЕРИНГА ============
    generateShareUrl(material) {
        const baseUrl = window.location.origin;
        const params = new URLSearchParams();
        
        if (material && material.title) {
            params.set('search', encodeURIComponent(material.title));
            return `${baseUrl}/?${params.toString()}`;
        }
        
        if (material && material.id) {
            params.set('video', material.id);
            return `${baseUrl}/?${params.toString()}`;
        }
        
        if (this.currentSearchQuery) {
            params.set('search', encodeURIComponent(this.currentSearchQuery));
            return `${baseUrl}/?${params.toString()}`;
        }
        
        return baseUrl;
    }

    // ============ ОБНОВЛЕНИЕ URL БЕЗ ПЕРЕЗАГРУЗКИ ============
    updateUrlWithoutReload(url) {
        if (window.history && window.history.pushState) {
            window.history.pushState({}, '', url);
        }
    }

    // ============ ПОИСК ============
    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Введите название аниме');
            return;
        }
        if (this.isSearching) return;
        
        this.currentSearchQuery = query;
        this.currentPage = 1; // Сброс страницы при новом поиске
        
        const newUrl = `${window.location.origin}/?search=${encodeURIComponent(query)}`;
        this.updateUrlWithoutReload(newUrl);
        this.updateSEO();
        
        this.showLoading();
        this.addToHistory(query);
        
        try {
            // Загружаем все результаты (максимум 100 за запрос)
            let allResults = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore && page <= 50) { // Максимум 50 запросов = 5000 результатов
                const searchUrl = `${this.API_URL}?token=${this.API_TOKEN}&title=${encodeURIComponent(query)}&with_material_data=true&limit=100&page=${page}`;
                
                const data = await this.fetchWithTimeout(searchUrl, 15000);
                
                if (data.results && data.results.length > 0) {
                    allResults = allResults.concat(data.results);
                    page++;
                    
                    // Если результатов меньше 100, значит это последняя страница
                    if (data.results.length < 100) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            if (allResults.length > 0) {
                this.hasSearched = true;
                const grouped = this.groupResultsByTitle(allResults);
                this.allResults = grouped;
                this.filteredResults = grouped;
                this.clearErrorMessages();
                this.displayAllResults(grouped);
                
                setTimeout(() => {
                    this.displayHistory();
                    this.displayFavorites();
                }, 300);
            } else {
                this.showError('Ничего не найдено');
            }
        } catch (error) {
            console.error('Search error:', error);
            
            if (error.name === 'AbortError') {
                this.showError('Превышено время ожидания');
            } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.showError('Ошибка CORS. Попробуйте через VPN или прокси.');
            } else {
                this.showError('Ошибка при поиске');
            }
        } finally {
            this.hideLoading();
        }
    }

    // ============ ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ============
    displayAllResults(results) {
        if (results.length === 0) {
            this.showError('Ничего не найдено');
            return;
        }
        
        const firstResult = results[0];
        if (firstResult.translations && firstResult.translations.length > 0) {
            const videoWithLink = {
                ...firstResult,
                link: firstResult.translations[0].link,
                translation: {
                    id: firstResult.translations[0].id,
                    title: firstResult.translations[0].title
                },
                quality: firstResult.translations[0].quality
            };
            this.loadVideo(videoWithLink);
        } else {
            this.loadVideo(firstResult);
        }
        
        this.createTabs(results);
        this.displayCurrentPage();
        this.createPagination(results.length);
    }

    createTabs(results) {
        this.tabsContainer.innerHTML = '';
        this.tabsContainer.style.display = 'flex';
        
        const types = new Map();
        types.set('all', 'Все');
        results.forEach(r => {
            if (r.type && !types.has(r.type)) {
                types.set(r.type, this.getTypeName(r.type));
            }
        });
        
        types.forEach((name, type) => {
            const tab = document.createElement('button');
            tab.className = 'tab-button';
            tab.dataset.type = type;
            tab.textContent = name;
            if (type === 'all') tab.classList.add('active');
            tab.addEventListener('click', () => this.filterResults(type));
            this.tabsContainer.appendChild(tab);
        });
    }

    createVideoList(results) {
        this.videoListContainer.innerHTML = '';
        this.videoListContainer.style.display = 'grid';
        
        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.dataset.type = result.type || 'unknown';
            
            const title = document.createElement('h3');
            title.className = 'video-card-title';
            title.textContent = result.title || 'Без названия';
            
            const year = document.createElement('span');
            year.className = 'video-card-year';
            year.textContent = result.year || '';
            
            const type = document.createElement('span');
            type.className = 'video-card-type';
            type.textContent = this.getTypeName(result.type);
            
            const transCount = document.createElement('span');
            transCount.className = 'video-card-translations-count';
            const count = result.translations?.length || 0;
            transCount.innerHTML = `<i class="bi bi-mic"></i> ${count}`;
            
            const info = document.createElement('div');
            info.className = 'video-card-info';
            info.appendChild(year);
            info.appendChild(type);
            info.appendChild(transCount);
            
            card.appendChild(title);
            card.appendChild(info);
            card.addEventListener('click', () => {
                if (result.translations && result.translations.length > 0) {
                    const videoWithLink = {
                        ...result,
                        link: result.translations[0].link,
                        translation: {
                            id: result.translations[0].id,
                            title: result.translations[0].title
                        },
                        quality: result.translations[0].quality
                    };
                    this.loadVideo(videoWithLink);
                } else {
                    this.loadVideo(result);
                }
                this.resultsContainer.scrollIntoView({ behavior: 'smooth' });
            });
            
            this.videoListContainer.appendChild(card);
        });
    }

    filterResults(type) {
        this.activeFilter = type;
        this.currentPage = 1; // Сброс страницы при фильтрации
        
        this.tabsContainer.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        if (type === 'all') {
            this.filteredResults = this.allResults;
        } else {
            this.filteredResults = this.allResults.filter(r => r.type === type);
        }
        
        if (this.filteredResults.length > 0) {
            this.displayCurrentPage();
            this.createPagination(this.filteredResults.length);
        } else {
            this.videoListContainer.innerHTML = '';
            this.videoListContainer.style.display = 'none';
            this.paginationContainer.style.display = 'none';
        }
    }

    // ============ ИНФОРМАЦИЯ О ВИДЕО ============
    displayVideoInfo(material) {
        let info = [];
        
        if (material.title_orig) info.push(`Оригинальное: ${this.sanitizeInput(material.title_orig)}`);
        if (material.translation) info.push(`Озвучка: ${this.sanitizeInput(material.translation.title)}`);
        if (material.quality) info.push(`Качество: ${this.sanitizeInput(material.quality)}`);
        if (material.type) info.push(`Тип: ${this.getTypeName(material.type)}`);
        
        if (material.translations && material.translations.length > 1) {
            info.push(`\nДоступные озвучки (${material.translations.length}):`);
            material.translations.forEach((t, i) => {
                info.push(`  ${i + 1}. ${this.sanitizeInput(t.title)} (${t.quality || 'HD'})`);
            });
        }
        
        const md = material.material_data;
        if (md) {
            if (md.genres?.length) info.push(`Жанры: ${md.genres.join(', ')}`);
            if (md.countries?.length) info.push(`Страны: ${md.countries.join(', ')}`);
            if (md.kinopoisk_rating) info.push(`КиноПоиск: ${md.kinopoisk_rating}`);
            if (md.imdb_rating) info.push(`IMDb: ${md.imdb_rating}`);
            if (md.description) info.push(`\n${this.sanitizeInput(md.description)}`);
        }
        
        this.videoAbout.textContent = info.join('\n');
        this.aboutBlock.style.display = info.length > 0 ? 'block' : 'none';
    }

    // ============ ОШИБКИ ============
    showError(message) {
        this.clearAllResults();
        const error = document.createElement('div');
        error.className = 'error-message';
        error.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${message}`;
        this.resultsContainer.appendChild(error);
        this.resultsContainer.style.display = 'block';
    }

    clearErrorMessages() {
        this.resultsContainer.querySelectorAll('.error-message').forEach(el => el.remove());
    }

    clearAllResults() {
        this.videoName.textContent = '';
        this.videoFrame.src = '';
        this.videoFrame.style.display = 'none';
        if (this.videoContainer) this.videoContainer.style.display = 'none';
        if (this.videoPlaceholder) this.videoPlaceholder.style.display = 'none';
        this.videoAbout.textContent = '';
        this.aboutBlock.style.display = 'none';
        this.shareLink.href = '#';
        if (this.shareButton) {
            this.shareButton.style.display = 'none';
            this.shareButton.innerHTML = '<i class="bi bi-share"></i> Поделиться';
            this.shareButton.classList.remove('copied');
        }
        if (this.favoriteButton) this.favoriteButton.style.display = 'none';
        this.resultsContainer.style.display = 'none';
        if (this.tabsContainer) { this.tabsContainer.style.display = 'none'; this.tabsContainer.innerHTML = ''; }
        if (this.videoListContainer) { this.videoListContainer.style.display = 'none'; this.videoListContainer.innerHTML = ''; }
        if (this.paginationContainer) { this.paginationContainer.style.display = 'none'; this.paginationContainer.innerHTML = ''; }
        this.allResults = [];
        this.filteredResults = [];
        this.hasSearched = false;
        this.currentVideo = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        
        this.updateUrlWithoutReload(window.location.origin);
        this.updateSEO();
        this.currentSearchQuery = '';
    }

    // ============ ТИПЫ ============
    getTypeName(type) {
        const map = {
            'foreign-movie': 'Фильм',
            'anime': 'Аниме',
            'russian-movie': 'Русский фильм',
            'cartoon-serial': 'Мультсериал',
            'foreign-serial': 'Сериал',
            'anime-serial': 'Аниме сериал',
            'russian-serial': 'Русский сериал',
            'documentary-serial': 'Документальный',
            'multi-part-film': 'Многосерийный',
            'tv-series': 'TV Сериал',
            'movie': 'Фильм'
        };
        return map[type] || type || 'Другое';
    }

    // ============ ПОДЕЛИТЬСЯ ============
    async copyShareLink() {
        let shareUrl = this.generateShareUrl(this.currentVideo);
        
        if (!shareUrl || shareUrl === '#' || shareUrl === window.location.origin + '/') {
            this.showError('Нет ссылки для копирования');
            return;
        }
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: this.currentVideo?.title || 'KitsuneWatch - Смотри аниме онлайн',
                    text: `Смотрите "${this.currentVideo?.title || 'аниме'}" на KitsuneWatch!`,
                    url: shareUrl
                });
                return;
            }
            
            await navigator.clipboard.writeText(shareUrl);
            
            this.shareButton.innerHTML = '<i class="bi bi-check-lg"></i> Скопировано!';
            this.shareButton.classList.add('copied');
            
            setTimeout(() => {
                this.shareButton.innerHTML = '<i class="bi bi-share"></i> Поделиться';
                this.shareButton.classList.remove('copied');
            }, 3000);
            
        } catch (error) {
            console.error('Share error:', error);
            alert(`Скопируйте ссылку вручную:\n${shareUrl}`);
        }
    }

    // ============ ПЛЕЕР ============
    setupPlayerListener() {
        window.addEventListener('message', (message) => {
            if (!message.data?.key) return;
            const { key, value } = message.data;
            
            switch (key) {
                case 'kodik_player_play': this.playerState.isPlaying = true; break;
                case 'kodik_player_pause': this.playerState.isPlaying = false; break;
                case 'kodik_player_time_update': this.playerState.currentTime = value; break;
                case 'kodik_player_duration_update': this.playerState.duration = value; break;
                case 'kodik_player_volume_change':
                    this.playerState.isMuted = value.muted;
                    this.playerState.volume = value.volume;
                    break;
            }
        });
    }

    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (!this.hasSearched || !this.videoFrame.src) return;
        
        switch (e.key.toLowerCase()) {
            case ' ': e.preventDefault(); this.togglePlayback(); break;
            case 'arrowright': this.seekForward(10); break;
            case 'arrowleft': this.seekBackward(10); break;
            case 'm': this.toggleMute(); break;
            case 'f': this.toggleFullscreen(); break;
        }
    }

    sendPlayerCommand(command) {
        if (!this.videoFrame.contentWindow) return;
        this.videoFrame.contentWindow.postMessage({
            key: "kodik_player_api",
            value: command
        }, '*');
    }

    togglePlayback() {
        this.playerState.isPlaying ? this.pausePlayback() : this.startPlayback();
    }

    startPlayback() { this.sendPlayerCommand({ method: "play" }); }
    pausePlayback() { this.sendPlayerCommand({ method: "pause" }); }
    seekTo(seconds) { this.sendPlayerCommand({ method: "seek", seconds }); }
    seekForward(s) { this.seekTo(this.playerState.currentTime + s); }
    seekBackward(s) { this.seekTo(Math.max(0, this.playerState.currentTime - s)); }
    mutePlayer() { this.sendPlayerCommand({ method: "mute" }); }
    unmutePlayer() { this.sendPlayerCommand({ method: "unmute" }); }
    
    toggleMute() {
        this.playerState.isMuted ? this.unmutePlayer() : this.mutePlayer();
    }
    
    toggleFullscreen() {
        if (this.videoFrame.requestFullscreen) {
            document.fullscreenElement ? document.exitFullscreen() : this.videoFrame.requestFullscreen();
        }
    }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new KitsuneWatchApp();
    });
} else {
    window.app = new KitsuneWatchApp();
}
