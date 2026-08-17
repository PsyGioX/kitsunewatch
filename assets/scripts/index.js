// assets/scripts/index.js - Итоговая версия KitsuneWatch

class KitsuneWatchApp {
    constructor() {
        this.API_TOKEN = this.getApiToken();
        this.API_URL = this.getApiUrl();
        
        this.searchInput = document.querySelector('.search_input_query');
        this.searchButton = document.querySelector('.search_push');
        this.resultsContainer = document.getElementById('resultsParseVideosBlock');
        this.videoName = document.getElementById('name_video');
        this.videoFrame = document.getElementById('parse_link_on_video');
        this.videoAbout = document.getElementById('videoAboutPasteToParse');
        this.aboutBlock = document.getElementById('aboutVideoBlock');
        this.shareLink = document.getElementById('LInkToVideoForShare');
        
        this.resultsContainer.style.display = 'none';
        this.videoFrame.style.display = 'none';
        this.aboutBlock.style.display = 'none';
        
        this.createVideoPlaceholder();
        
        this.tabsContainer = null;
        this.videoListContainer = null;
        this.shareButton = null;
        this.favoriteButton = null;
        this.historyContainer = null;
        this.favoritesContainer = null;
        this.loadingOverlay = null;
        this.aboutProjectContainer = null;
        this.installButton = null;
        this.deferredPrompt = null;
        this.currentResults = [];
        this.activeFilter = 'all';
        this.hasSearched = false;
        this.currentVideo = null;
        this.isSearching = false;
        this.isVideoLoading = false;
        
        this.searchHistory = this.loadFromStorage('kitsunewatch_history', []);
        this.favorites = this.loadFromStorage('kitsunewatch_favorites', []);
        
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

    getApiToken() {
        if (typeof window !== 'undefined' && window.KODIK_API_TOKEN) {
            return window.KODIK_API_TOKEN;
        }
        if (typeof process !== 'undefined' && process.env && process.env.KODIK_API_TOKEN) {
            return process.env.KODIK_API_TOKEN;
        }
        return null;
    }

    getApiUrl() {
        if (typeof window !== 'undefined' && window.KODIK_API_URL) {
            return window.KODIK_API_URL;
        }
        return 'https://kodik-api.com/search';
    }

    async fetchApiConfig() {
        try {
            const response = await fetch('/api/config', {
                method: 'GET',
                headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.token) {
                this.API_TOKEN = data.token;
                console.log('API токен получен');
            }
            if (data.apiUrl) this.API_URL = data.apiUrl;
            
            return data;
        } catch (error) {
            console.error('Ошибка конфигурации:', error);
            return null;
        }
    }

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

    setupLogo() {
        const logoImg = document.querySelector('.logo_img');
        if (!logoImg) return;
        
        const paths = [
            '/imgs/logo.jpg',
            '/images/logo.jpg',
            '/imgs/logo.jpg',
            '/logo.jpg',
            '/favicon-32x32.png'
        ];
        
        let index = 0;
        
        logoImg.onerror = () => {
            index++;
            if (index < paths.length) {
                logoImg.src = paths[index];
            } else {
                logoImg.style.display = 'none';
                const placeholder = logoImg.nextElementSibling;
                if (placeholder && placeholder.classList.contains('logo_placeholder')) {
                    placeholder.style.display = 'flex';
                }
            }
        };
        
        logoImg.src = paths[0];
    }

    async init() {
        if (!this.API_TOKEN) {
            await this.fetchApiConfig();
        }
        
        this.createUIElements();
        this.setupLogo();
        this.setupEventListeners();
        this.setupProtection();
        this.setupPlayerListener();
        this.setupPWA();
        this.displayAboutProject();
        this.handleURLParams();
        
        setTimeout(() => {
            this.displayHistory();
            this.displayFavorites();
        }, 500);
    }

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
            
            const header = document.querySelector('.header_menu');
            if (header) header.appendChild(this.installButton);
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

    handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('search') === 'true') this.searchInput.focus();
        if (params.get('favorites') === 'true') this.displayFavorites();
        if (params.get('history') === 'true') this.displayHistory();
    }

    createUIElements() {
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'video-tabs';
        this.tabsContainer.style.display = 'none';
        
        this.videoListContainer = document.createElement('div');
        this.videoListContainer.className = 'video-list';
        this.videoListContainer.style.display = 'none';
        
        this.historyContainer = document.createElement('div');
        this.historyContainer.className = 'search-history';
        this.historyContainer.style.display = 'none';
        
        this.favoritesContainer = document.createElement('div');
        this.favoritesContainer.className = 'favorites-block';
        this.favoritesContainer.style.display = 'none';
        
        this.aboutProjectContainer = document.createElement('div');
        this.aboutProjectContainer.className = 'about-project';
        this.aboutProjectContainer.style.display = 'block';
        
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
        mainBlock.appendChild(this.loadingOverlay);
        mainBlock.appendChild(this.tabsContainer);
        mainBlock.appendChild(this.videoListContainer);
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

    setupEventListeners() {
        this.searchButton.addEventListener('click', () => this.performSearch());
        
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        this.searchInput.addEventListener('input', () => {
            if (!this.searchInput.value.trim()) {
                this.clearAllResults();
                this.displayAboutProject();
            }
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
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

    async fetchWithTimeout(url, timeout = 10000) {
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
        this.hideAboutProject();
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

    saveToStorage(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    }

    loadFromStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { return defaultValue; }
    }

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
                this.searchInput.value = item.query;
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

    loadVideo(material) {
        this.currentVideo = material;
        this.isVideoLoading = true;
        this.hideAboutProject();
        
        this.videoName.textContent = `${material.title || 'Без названия'} (${material.year || '?'})`;
        this.videoName.style.display = 'block';
        
        if (this.videoContainer) this.videoContainer.style.display = 'block';
        this.showVideoPlaceholder();
        
        if (material.link) {
            const url = this.sanitizeUrl(material.link);
            const fullUrl = url.startsWith('//') ? 'https:' + url : url;
            this.videoFrame.src = fullUrl;
            this.videoFrame.setAttribute('allow', 'autoplay *; fullscreen *; picture-in-picture *');
            this.videoFrame.setAttribute('allowfullscreen', 'true');
        }
        
        this.displayVideoInfo(material);
        
        const shareUrl = this.sanitizeUrl(material.link);
        const fullShareUrl = shareUrl.startsWith('//') ? 'https:' + shareUrl : shareUrl;
        this.shareLink.href = fullShareUrl;
        
        if (this.shareButton) this.shareButton.style.display = 'inline-flex';
        
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
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Введите название аниме');
            return;
        }
        if (this.isSearching) return;
        
        if (!this.API_TOKEN) await this.fetchApiConfig();
        if (!this.API_TOKEN) {
            this.showError('API токен не настроен');
            return;
        }
        
        this.showLoading();
        this.addToHistory(query);
        
        try {
            const encoded = encodeURIComponent(this.sanitizeInput(query));
            const url = `${this.API_URL}?token=${this.API_TOKEN}&title=${encoded}&with_material_data=true`;
            
            const data = await this.fetchWithTimeout(url);
            
            if (data.results?.length > 0) {
                this.hasSearched = true;
                const grouped = this.groupResultsByTitle(data.results);
                this.currentResults = grouped;
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
            this.showError('Ошибка при поиске');
        } finally {
            this.hideLoading();
        }
    }

    groupResultsByTitle(results) {
        const grouped = new Map();
        
        results.forEach(result => {
            const key = `${result.title}_${result.year}_${result.type}`;
            
            if (!grouped.has(key)) {
                grouped.set(key, {
                    ...result,
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

    displayAllResults(results) {
        this.loadVideo(results[0]);
        this.createTabs(results);
        this.createVideoList(results);
    }

    createTabs(results) {
        this.tabsContainer.innerHTML = '';
        this.tabsContainer.style.display = 'flex';
        
        const types = new Map();
        types.set('all', 'Все');
        results.forEach(r => {
            if (!types.has(r.type)) types.set(r.type, this.getTypeName(r.type));
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
            card.dataset.type = result.type;
            
            const title = document.createElement('h3');
            title.className = 'video-card-title';
            title.textContent = result.title || 'Без названия';
            
            const year = document.createElement('span');
            year.className = 'video-card-year';
            year.textContent = result.year || '';
            
            const type = document.createElement('span');
            type.className = 'video-card-type';
            type.textContent = this.getTypeName(result.type);
            
            const count = document.createElement('span');
            count.className = 'video-card-translations-count';
            count.innerHTML = `<i class="bi bi-mic"></i> ${result.translations.length}`;
            
            const info = document.createElement('div');
            info.className = 'video-card-info';
            info.appendChild(year);
            info.appendChild(type);
            info.appendChild(count);
            
            card.appendChild(title);
            card.appendChild(info);
            card.addEventListener('click', () => {
                this.loadVideo(result);
                this.resultsContainer.scrollIntoView({ behavior: 'smooth' });
            });
            
            this.videoListContainer.appendChild(card);
        });
    }

    filterResults(type) {
        this.activeFilter = type;
        
        this.tabsContainer.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        this.videoListContainer.querySelectorAll('.video-card').forEach(card => {
            card.style.display = (type === 'all' || card.dataset.type === type) ? 'block' : 'none';
        });
    }

    displayVideoInfo(material) {
        let info = [];
        
        if (material.title_orig) info.push(`Оригинальное: ${this.sanitizeInput(material.title_orig)}`);
        if (material.translation) info.push(`Озвучка: ${this.sanitizeInput(material.translation.title)}`);
        
        if (material.translations?.length > 1) {
            info.push(`\nОзвучки (${material.translations.length}):`);
            material.translations.forEach((t, i) => {
                info.push(`  ${i + 1}. ${this.sanitizeInput(t.title)}`);
            });
        }
        
        if (material.quality) info.push(`Качество: ${this.sanitizeInput(material.quality)}`);
        if (material.type) info.push(`Тип: ${this.getTypeName(material.type)}`);
        
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
        if (this.shareButton) this.shareButton.style.display = 'none';
        if (this.favoriteButton) this.favoriteButton.style.display = 'none';
        this.resultsContainer.style.display = 'none';
        if (this.tabsContainer) { this.tabsContainer.style.display = 'none'; this.tabsContainer.innerHTML = ''; }
        if (this.videoListContainer) { this.videoListContainer.style.display = 'none'; this.videoListContainer.innerHTML = ''; }
        this.currentResults = [];
        this.hasSearched = false;
        this.currentVideo = null;
    }

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
            'multi-part-film': 'Многосерийный'
        };
        return map[type] || type;
    }

    copyShareLink() {
        const link = this.shareLink.href;
        if (!link || link === '#') return;
        
        if (navigator.share) {
            navigator.share({
                title: this.currentVideo?.title || 'KitsuneWatch',
                url: link
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(link).then(() => {
                this.shareButton.innerHTML = '<i class="bi bi-check-lg"></i> Скопировано!';
                setTimeout(() => {
                    this.shareButton.innerHTML = '<i class="bi bi-share"></i> Поделиться';
                }, 2000);
            });
        }
    }

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

// Инициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new KitsuneWatchApp();
    });
} else {
    window.app = new KitsuneWatchApp();
}