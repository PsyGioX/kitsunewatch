// assets/scripts/index.js

class KitsuneWatchApp {
    constructor() {
        // API конфигурация для аниме
        this.API_TOKEN = 'a036c8a4c59b43e72e212e4d0388ef7d';
        this.API_URL = 'https://kodik-api.com/search';
        this.YEARS_API_URL = 'https://kodik-api.com/years';
        this.TOP_API_URL = 'https://kodik-api.com/list';

        // API конфигурация для кино и сериалов
        this.MOVIES_API_TOKEN = 'ebf49d1e93755307e9d6da0dae09afff';
        this.MOVIES_API_URL = 'https://api.videoseed.tv/apiv2.php';

        // Состояние вкладок
        this.activeTab = 'anime';
        this.currentMode = 'anime';

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
        this.collectionsContainer = null;
        this.installButton = null;
        this.deferredPrompt = null;
        this.currentResults = [];
        this.activeFilter = 'all';
        this.hasSearched = false;
        this.currentVideo = null;
        this.isSearching = false;
        this.isVideoLoading = false;
        this.currentSearchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.filteredResults = [];

        // Данные из localStorage
        this.searchHistory = this.loadFromStorage('kitsunewatch_history', []);
        this.favorites = this.loadFromStorage('kitsunewatch_favorites', []);
        this.moviesHistory = this.loadFromStorage('kitsunewatch_movies_history', []);
        this.moviesFavorites = this.loadFromStorage('kitsunewatch_movies_favorites', []);

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

        // Популярные аниме для рандомайзера
        this.popularAnime = [
            'Наруто', 'Блич', 'Ван Пис', 'Атака титанов', 'Тетрадь смерти',
            'Клинок, рассекающий демонов', 'Моя геройская академия', 'Токийский гуль',
            'Стальной алхимик: Братство', 'Код Гиас', 'Врата Штейна', 'Твоё имя',
            'Ходячий замок', 'Унесённые призраками', 'Магическая битва',
            'Человек-бензопила', 'Семья шпиона', 'Реинкарнация безработного',
            'О моём перерождении в слизь', 'Восхождение героя щита', 'Ванпанчмен',
            'Охотник х Охотник', 'Моб Психо 100', 'Нет игры — нет жизни',
            'Re:Zero. Жизнь с нуля в альтернативном мире', 'Твоя апрельская ложь',
            'Торадора!', 'Бездомный бог', 'Паразит: Учение о жизни',
            'Доктор Стоун', 'Созданный в Бездне', 'Вайолет Эвергарден',
            'Форма голоса', 'Сага о Винланде', 'Монстр', 'Ковбой Бибоп',
            'Самурай Чамплу', 'Евангелион', 'Берсерк', 'Хеллсинг Ultimate',
            'Эльфийская песнь', 'Ангельские ритмы!', 'Токийские мстители',
            'Синяя тюрьма: Блю Лок', 'Волейбол!!', 'Баскетбол Куроко',
            'Юри на льду', 'Инициал Ди', 'Мегалобокс', 'Слэм-данк',
            'Этот замечательный мир!', 'Великий из бродячих псов',
            'Чёрный клевер', 'Семь смертных грехов', 'Синяя экзорцистка',
            'Пожиратель душ', 'Пожарная сила', 'Дороро', 'Дандадан',
            'Адский рай', 'Кайдзю №8', 'Фрирен: Провожающая в последний путь',
            'Подземелье вкусностей', 'Рубеж Шангри-Ла', 'Поднятие уровня в одиночку',
            'Башня Бога', 'Бог старшей школы', 'Психопаспорт', 'Призрак в доспехах',
            'Акира', 'Паприка', 'Токийские крестные', 'Парад смерти',
            'Класс превосходства', 'Будни старшеклассников',
            'Кагуя: в любви как на войне', 'Госпожа Кобаяши и её горничная-дракон',
            'Хоримия', 'Дотянуться до тебя', 'Кланнад', 'Пластиковые воспоминания',
            '5 сантиметров в секунду', 'Дитя погоды', 'Судзумэ, закрывающая двери',
            'Волчьи дети Амэ и Юки', 'Девочка, покорившая время', 'Летние войны',
            'Сад изящных слов', 'Могила светлячков', 'Принцесса Мононоке',
            'Мой сосед Тоторо', 'Ведьмина служба доставки', 'Небесный замок Лапута',
            'Навсикая из Долины ветров', 'Поньо на утёсе', 'Ветер крепчает',
            'Воспоминания о Марни', 'Ариэтти из страны лилипутов',
            'Мастера меча онлайн', 'Оверлорд', 'Лог Горизонт',
            'Гримгар: Пепел и иллюзии', 'В другом мире со смартфоном',
            'Да, я паук, и что?', 'Бофури', 'Невеста чародея',
            'Судьба: Ночь схватки', 'Мадока: Девочка-волшебница',
            'Волчица и пряности', 'Киберпанк: Бегущие по краю',
            'Триган', 'Черная лагуна', 'Гуррен-Лаганн', 'Убийца Акаме!',
            'Темнее чёрного', 'Эрго Прокси', 'Эксперименты Лэйн',
            'Когда плачут цикады', 'Шики', 'Монолог фармацевта',
            'Корзинка фруктов', 'Убийца гоблинов', 'Гинтама',
            'Космические братья', 'Пинг-понг', 'Великий учитель Онидзука'
        ];

        // Подборки аниме
        this.animeCollections = {
            'popular': {
                title: 'Популярное аниме',
                icon: 'bi-fire',
                description: 'Самые популярные аниме',
                query: 'популярное аниме'
            },
            'romance': {
                title: 'Романтика',
                icon: 'bi-heart',
                description: 'Лучшие романтические аниме',
                query: 'романтика аниме'
            },
            'fantasy': {
                title: 'Фэнтези',
                icon: 'bi-magic',
                description: 'Магия и приключения',
                query: 'фэнтези аниме'
            },
            'action': {
                title: 'Экшен',
                icon: 'bi-lightning',
                description: 'Боевики и сражения',
                query: 'экшен аниме'
            },
            'comedy': {
                title: 'Комедия',
                icon: 'bi-emoji-laughing',
                description: 'Веселые аниме',
                query: 'комедия аниме'
            },
            'drama': {
                title: 'Драма',
                icon: 'bi-droplet',
                description: 'Серьезные истории',
                query: 'драма аниме'
            },
            'horror': {
                title: 'Ужасы',
                icon: 'bi-ghost',
                description: 'Мистика и хоррор',
                query: 'ужасы аниме'
            },
            'science': {
                title: 'Научная фантастика',
                icon: 'bi-rocket',
                description: 'Космос и технологии',
                query: 'научная фантастика аниме'
            }
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
                if (this.currentVideo) {
                    if (this.activeTab === 'anime') {
                        this.loadVideo(this.currentVideo);
                    } else {
                        this.loadMovie(this.currentVideo);
                    }
                }
            });
        }
    }

    // ============ ЛОГОТИП ============
    setupLogo() {
        const logoImg = document.querySelector('.logo_img');
        if (!logoImg) return;

        logoImg.style.display = 'none';
        const parent = logoImg.parentElement;
        if (parent) {
            const icon = document.createElement('i');
            icon.className = 'bi bi-stars logo-fallback';
            icon.style.cssText = 'font-size:24px;color:#b44dff;';
            parent.insertBefore(icon, logoImg.nextSibling);
        }
    }

    // ============ ИНИЦИАЛИЗАЦИЯ ============
    init() {
        this.createUIElements();
        this.createTabSwitcher();
        this.setupLogo();
        this.setupEventListeners();
        this.setupProtection();
        this.setupPlayerListener();
        this.setupPWA();
        this.displayAboutProject();
        this.loadYearPremieres();
        this.displayCollections();
        this.handleURLParams();
        this.updateSEO();

        setTimeout(() => {
            this.displayHistory();
            this.displayFavorites();
        }, 500);
    }

    // ============ ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК ============
    createTabSwitcher() {
        const headerMenu = document.querySelector('.header_menu');
        if (!headerMenu) return;

        const tabSwitcher = document.createElement('div');
        tabSwitcher.className = 'mode-switcher';
        tabSwitcher.innerHTML = `
            <button class="mode-button active" data-mode="anime">
                <i class="bi bi-stars"></i> Аниме
            </button>
            <button class="mode-button" data-mode="movies">
                <i class="bi bi-film"></i> Кино и сериалы
            </button>
        `;

        headerMenu.appendChild(tabSwitcher);

        tabSwitcher.querySelectorAll('.mode-button').forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    switchMode(mode) {
        if (this.activeTab === mode) return;

        this.activeTab = mode;
        this.currentMode = mode;

        document.querySelectorAll('.mode-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        document.body.classList.toggle('movies-mode', mode === 'movies');

        this.clearAllResults();

        // Скрываем/показываем кнопки рандом и топ-100
        const randomButton = document.getElementById('randomAnimeButton');
        const topButton = document.querySelector('.top-100-button');
        
        if (randomButton) {
            randomButton.style.display = mode === 'anime' ? 'inline-flex' : 'none';
        }
        if (topButton) {
            topButton.style.display = mode === 'anime' ? 'inline-flex' : 'none';
        }

        if (mode === 'anime') {
            this.searchInput.placeholder = 'Поиск аниме...';
            this.displayAboutProject();
            this.loadYearPremieres();
            this.displayCollections();
        } else {
            this.searchInput.placeholder = 'Поиск по названию или ID Кинопоиска...';
            this.displayMoviesAbout();
            if (this.premieresContainer) {
                this.premieresContainer.style.display = 'none';
                this.premieresContainer.innerHTML = '';
            }
            if (this.collectionsContainer) {
                this.collectionsContainer.style.display = 'none';
                this.collectionsContainer.innerHTML = '';
            }
        }

        this.updateSEO();
        this.displayHistory();
        this.displayFavorites();
    }

    // ============ ЗАГРУЗКА ПРЕМЬЕР ГОДА ============
    async loadYearPremieres() {
        if (this.activeTab !== 'anime') return;

        try {
            const currentYear = new Date().getFullYear();
            const response = await fetch(`${this.YEARS_API_URL}?token=${this.API_TOKEN}&types=anime,anime-serial&sort=year`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                let targetYear = currentYear;
                let yearData = data.results.find(item => item.year === currentYear);

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
        }
    }

    displayPremieres(year, count) {
        if (!this.premieresContainer) return;
        if (this.activeTab !== 'anime') return;

        this.premieresContainer.style.display = 'block';
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
                            <p>Лучшие новинки аниме ${year} года уже доступны на KitsuneWatch!</p>
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

    // ============ ПОДБОРКИ АНИМЕ ============
    displayCollections() {
        if (!this.collectionsContainer) return;
        if (this.activeTab !== 'anime') return;

        this.collectionsContainer.style.display = 'block';
        this.collectionsContainer.innerHTML = `
            <div class="collections-block">
                <div class="collections-header">
                    <i class="bi bi-collection"></i>
                    <h2>Популярные подборки</h2>
                </div>
                <div class="collections-grid">
                    ${Object.entries(this.animeCollections).map(([key, collection]) => `
                        <div class="collection-card" onclick="window.app.searchCollection('${key}')">
                            <i class="bi ${collection.icon}"></i>
                            <h3>${collection.title}</h3>
                            <p>${collection.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async searchCollection(collectionKey) {
        const collection = this.animeCollections[collectionKey];
        if (!collection) return;

        this.searchInput.value = collection.query;
        this.currentSearchQuery = collection.query;
        await this.performSearch();
    }

    // ============ ОПИСАНИЕ ДЛЯ ФИЛЬМОВ ============
    displayMoviesAbout() {
        if (!this.aboutProjectContainer) return;

        if (this.premieresContainer) {
            this.premieresContainer.style.display = 'none';
            this.premieresContainer.innerHTML = '';
        }
        if (this.collectionsContainer) {
            this.collectionsContainer.style.display = 'none';
            this.collectionsContainer.innerHTML = '';
        }

        this.aboutProjectContainer.style.display = 'block';
        this.aboutProjectContainer.innerHTML = `
            <div class="about-project-content">
                <div class="about-project-header">
                    <i class="bi bi-film"></i>
                    <h2>Кино и сериалы</h2>
                </div>
                <p class="about-project-description">
                    Поиск по названию или ID Кинопоиска
                </p>
                <div class="about-project-features">
                    <div class="feature-card">
                        <i class="bi bi-search"></i>
                        <h3>По названию</h3>
                        <p>Введите название фильма</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-hash"></i>
                        <h3>По ID</h3>
                        <p>Введите ID Кинопоиска</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-film"></i>
                        <h3>Фильмы</h3>
                        <p>Любые фильмы</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-tv"></i>
                        <h3>Сериалы</h3>
                        <p>Любые сериалы</p>
                    </div>
                </div>
                <div class="about-project-cta">
                    <p>Пример: "Побег" или ID: 326</p>
                    <i class="bi bi-arrow-up"></i>
                </div>
            </div>
        `;
    }

    displayAboutProject() {
        if (!this.aboutProjectContainer) return;
        if (this.activeTab !== 'anime') return;

        this.aboutProjectContainer.style.display = 'block';
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
                        <i class="bi bi-shuffle"></i>
                        <h3>Рандомайзер</h3>
                        <p>Случайное аниме</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-collection-play"></i>
                        <h3>Подборки</h3>
                        <p>Тематические коллекции</p>
                    </div>
                    <div class="feature-card">
                        <i class="bi bi-trophy"></i>
                        <h3>Топ 100</h3>
                        <p>Лучшие аниме</p>
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
        this.searchButton.addEventListener('click', () => {
            if (this.activeTab === 'anime') {
                this.performSearch();
            } else {
                this.performMoviesSearch();
            }
        });

        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.activeTab === 'anime') {
                    this.performSearch();
                } else {
                    this.performMoviesSearch();
                }
            }
        });

        this.searchInput.addEventListener('input', () => {
            if (!this.searchInput.value.trim()) {
                this.clearAllResults();
                if (this.activeTab === 'anime') {
                    this.displayAboutProject();
                    this.loadYearPremieres();
                    this.displayCollections();
                } else {
                    this.displayMoviesAbout();
                }
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

        this.collectionsContainer = document.createElement('div');
        this.collectionsContainer.className = 'collections-container';
        this.collectionsContainer.style.display = 'block';

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
        mainBlock.appendChild(this.collectionsContainer);
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

        this.addRandomButton();
    }

    addRandomButton() {
        const searchContainer = document.querySelector('.search_container');
        if (!searchContainer) return;

        const randomButton = document.createElement('button');
        randomButton.id = 'randomAnimeButton';
        randomButton.className = 'random-anime-button';
        randomButton.innerHTML = '<i class="bi bi-shuffle"></i>';
        randomButton.title = 'Случайное аниме';
        randomButton.addEventListener('click', () => this.randomAnime());
        searchContainer.appendChild(randomButton);

        const topButton = document.createElement('button');
        topButton.className = 'top-100-button';
        topButton.innerHTML = '<i class="bi bi-trophy"></i> Топ 100';
        topButton.title = 'Топ 100 аниме';
        topButton.addEventListener('click', () => this.loadTop100());
        searchContainer.appendChild(topButton);
    }

    // ============ РАНДОМАЙЗЕР ============
    randomAnime() {
        if (this.activeTab !== 'anime') return;

        const randomIndex = Math.floor(Math.random() * this.popularAnime.length);
        const randomTitle = this.popularAnime[randomIndex];

        this.searchInput.value = randomTitle;
        this.currentSearchQuery = randomTitle;
        this.performSearch();

        const randomButton = document.getElementById('randomAnimeButton');
        if (randomButton) {
            randomButton.classList.add('spinning');
            setTimeout(() => randomButton.classList.remove('spinning'), 1000);
        }
    }

    // ============ ТОП 100 ============
    async loadTop100() {
        if (this.activeTab !== 'anime') return;

        this.showLoading();

        try {
            const response = await fetch(`${this.TOP_API_URL}?token=${this.API_TOKEN}&types=anime,anime-serial&sort=rating&limit=100`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                this.displayTop100(data.results);
            } else {
                this.showError('Не удалось загрузить топ 100');
            }
        } catch (error) {
            console.error('Error loading top 100:', error);
            this.showError('Ошибка при загрузке топ 100');
        } finally {
            this.hideLoading();
        }
    }

    displayTop100(results) {
        if (!this.videoListContainer) return;

        this.hideAboutProject();
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        if (this.collectionsContainer) this.collectionsContainer.style.display = 'none';
        if (this.videoContainer) this.videoContainer.style.display = 'none';
        this.videoFrame.style.display = 'none';
        this.videoFrame.src = '';
        this.videoName.style.display = 'none';
        this.aboutBlock.style.display = 'none';
        if (this.shareButton) this.shareButton.style.display = 'none';
        if (this.favoriteButton) this.favoriteButton.style.display = 'none';
        if (this.tabsContainer) { this.tabsContainer.style.display = 'none'; this.tabsContainer.innerHTML = ''; }
        if (this.paginationContainer) { this.paginationContainer.style.display = 'none'; this.paginationContainer.innerHTML = ''; }

        this.resultsContainer.style.display = 'block';
        this.videoListContainer.style.display = 'block';
        this.videoListContainer.innerHTML = '';
        this.videoListContainer.className = 'video-list top-100-list';

        const titleContainer = document.createElement('div');
        titleContainer.className = 'top-100-header';
        titleContainer.innerHTML = `
            <h2 class="top-100-title">
                <i class="bi bi-trophy"></i> Топ 100 аниме
            </h2>
            <button class="back-button" onclick="window.app.showMainPage()">
                <i class="bi bi-arrow-left"></i> Назад
            </button>
        `;
        this.videoListContainer.appendChild(titleContainer);

        const grid = document.createElement('div');
        grid.className = 'top-100-grid';

        results.forEach((result, index) => {
            const card = document.createElement('div');
            card.className = 'top-100-card';

            const rank = document.createElement('div');
            rank.className = 'top-100-rank';
            rank.textContent = `#${index + 1}`;

            const info = document.createElement('div');
            info.className = 'top-100-info';

            const titleEl = document.createElement('h3');
            titleEl.className = 'top-100-card-title';
            titleEl.textContent = result.title || 'Без названия';

            const details = document.createElement('div');
            details.className = 'top-100-details';

            if (result.year) {
                const year = document.createElement('span');
                year.className = 'top-100-year';
                year.textContent = result.year;
                details.appendChild(year);
            }

            info.appendChild(titleEl);
            info.appendChild(details);
            card.appendChild(rank);
            card.appendChild(info);

            card.addEventListener('click', () => {
                if (result.link) {
                    this.loadVideo(result);
                } else {
                    this.searchInput.value = result.title;
                    this.currentSearchQuery = result.title;
                    this.performSearch();
                }
            });

            grid.appendChild(card);
        });

        this.videoListContainer.appendChild(grid);
    }

    showMainPage() {
        this.clearAllResults();
        if (this.activeTab === 'anime') {
            this.displayAboutProject();
            this.loadYearPremieres();
            this.displayCollections();
        } else {
            this.displayMoviesAbout();
        }
        this.updateUrlWithoutReload(window.location.origin);
        this.updateSEO();
    }

    // ============ SEO ============
    updateSEO() {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('search') || params.get('kp');
        const isMovies = params.get('movies') === 'true';
        const title = document.querySelector('title');
        const metaDescription = document.querySelector('meta[name="description"]');

        const isMovieMode = isMovies || this.activeTab === 'movies';

        if (searchQuery && searchQuery.trim()) {
            const contentType = isMovieMode ? 'фильмы и сериалы' : 'аниме';
            if (title) title.textContent = `${searchQuery} - смотреть ${contentType} онлайн | KitsuneWatch`;
            if (metaDescription) metaDescription.content = `Смотреть ${searchQuery} онлайн в хорошем качестве на KitsuneWatch.`;
        } else {
            if (title) title.textContent = isMovieMode ? 'KitsuneWatch - Фильмы и сериалы' : 'KitsuneWatch - Смотри аниме онлайн';
            if (metaDescription) metaDescription.content = isMovieMode 
                ? 'KitsuneWatch - фильмы и сериалы онлайн. Поиск по названию или ID Кинопоиска.'
                : 'KitsuneWatch - бесплатный онлайн-кинотеатр аниме.';
        }
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
        status.innerHTML = isOnline ? '<i class="bi bi-wifi"></i> Онлайн' : '<i class="bi bi-wifi-off"></i> Офлайн';
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 3000);
    }

    // ============ ОБРАБОТКА URL ============
    handleURLParams() {
        const params = new URLSearchParams(window.location.search);

        const isMovies = params.get('movies') === 'true';
        if (isMovies) {
            this.switchMode('movies');
        }

        const kpId = params.get('kp');
        if (kpId && kpId.trim()) {
            this.searchInput.value = kpId.trim();
            this.currentSearchQuery = kpId.trim();
            setTimeout(() => this.performMoviesSearch(), 500);
            return;
        }

        const searchQuery = params.get('search');
        if (searchQuery && searchQuery.trim()) {
            let decodedQuery = searchQuery.trim();
            try { decodedQuery = decodeURIComponent(decodedQuery); } catch (e) {}

            this.searchInput.value = decodedQuery;
            this.currentSearchQuery = decodedQuery;

            setTimeout(() => {
                if (isMovies) {
                    this.performMoviesSearch();
                } else {
                    this.performSearch();
                }
            }, 500);
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
        if (this.collectionsContainer) this.collectionsContainer.style.display = 'none';
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
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
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

    addToMoviesHistory(query) {
        const clean = query.trim();
        if (!clean) return;

        this.moviesHistory = this.moviesHistory.filter(i => i.query.toLowerCase() !== clean.toLowerCase());
        this.moviesHistory.unshift({ query: clean, timestamp: Date.now() });
        this.moviesHistory = this.moviesHistory.slice(0, 10);

        this.saveToStorage('kitsunewatch_movies_history', this.moviesHistory);
        this.displayHistory();
    }

    removeFromHistory(query) {
        if (this.activeTab === 'anime') {
            this.searchHistory = this.searchHistory.filter(i => i.query !== query);
            this.saveToStorage('kitsunewatch_history', this.searchHistory);
        } else {
            this.moviesHistory = this.moviesHistory.filter(i => i.query !== query);
            this.saveToStorage('kitsunewatch_movies_history', this.moviesHistory);
        }
        this.displayHistory();
    }

    clearHistory() {
        if (this.activeTab === 'anime') {
            this.searchHistory = [];
            this.saveToStorage('kitsunewatch_history', []);
        } else {
            this.moviesHistory = [];
            this.saveToStorage('kitsunewatch_movies_history', []);
        }
        this.displayHistory();
    }

    displayHistory() {
        if (!this.historyContainer) return;
        this.historyContainer.innerHTML = '';

        const currentHistory = this.activeTab === 'anime' ? this.searchHistory : this.moviesHistory;

        if (currentHistory.length === 0) {
            this.historyContainer.style.display = 'none';
            return;
        }

        this.historyContainer.style.display = 'block';

        const title = document.createElement('h3');
        title.className = 'history-title';
        title.innerHTML = `<i class="bi bi-clock-history"></i> История ${this.activeTab === 'anime' ? 'поиска аниме' : 'поиска кино'}`;

        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-history-button';
        clearBtn.innerHTML = '<i class="bi bi-trash"></i> Очистить';
        clearBtn.addEventListener('click', () => this.clearHistory());

        const container = document.createElement('div');
        container.className = 'history-title-container';
        container.appendChild(title);
        container.appendChild(clearBtn);
        this.historyContainer.appendChild(container);

        const groupedHistory = this.groupHistoryByDate(currentHistory);

        Object.entries(groupedHistory).forEach(([date, items]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'history-date-group';

            const dateTitle = document.createElement('div');
            dateTitle.className = 'history-date-title';
            dateTitle.textContent = date;
            dateGroup.appendChild(dateTitle);

            const list = document.createElement('div');
            list.className = 'history-list';

            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'history-item';

                const span = document.createElement('span');
                span.className = 'history-query';
                span.textContent = item.query;
                span.addEventListener('click', () => {
                    this.searchInput.value = item.query;
                    this.currentSearchQuery = item.query;
                    if (this.activeTab === 'anime') {
                        this.performSearch();
                    } else {
                        this.performMoviesSearch();
                    }
                });

                const time = document.createElement('span');
                time.className = 'history-time';
                time.textContent = this.formatTime(item.timestamp);

                const remove = document.createElement('button');
                remove.className = 'remove-history-button';
                remove.innerHTML = '<i class="bi bi-x"></i>';
                remove.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFromHistory(item.query);
                });

                div.appendChild(span);
                div.appendChild(time);
                div.appendChild(remove);
                list.appendChild(div);
            });

            dateGroup.appendChild(list);
            this.historyContainer.appendChild(dateGroup);
        });
    }

    groupHistoryByDate(history) {
        const groups = {};
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        history.forEach(item => {
            const date = new Date(item.timestamp);
            const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            let groupName;
            if (dateKey.getTime() === today.getTime()) {
                groupName = 'Сегодня';
            } else if (dateKey.getTime() === yesterday.getTime()) {
                groupName = 'Вчера';
            } else {
                groupName = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            }

            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(item);
        });

        return groups;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - timestamp;

        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;

        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    // ============ ИЗБРАННОЕ ============
    toggleFavorite() {
        if (!this.currentVideo) return;

        if (this.activeTab === 'anime') {
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
        } else {
            const videoId = this.currentVideo.id || this.currentVideo.id_kp;
            const isFav = this.moviesFavorites.some(f => f.id === videoId);

            if (isFav) {
                this.moviesFavorites = this.moviesFavorites.filter(f => f.id !== videoId);
                this.favoriteButton.innerHTML = '<i class="bi bi-heart"></i> В избранное';
                this.favoriteButton.classList.remove('active');
            } else {
                this.moviesFavorites.unshift({
                    id: videoId,
                    title: this.currentVideo.name || this.currentVideo.original_name,
                    year: this.currentVideo.year,
                    type: this.currentVideo.type,
                    iframe: this.currentVideo.iframe,
                    poster: this.currentVideo.poster,
                    addedAt: Date.now()
                });
                this.favoriteButton.innerHTML = '<i class="bi bi-heart-fill"></i> В избранном';
                this.favoriteButton.classList.add('active');
            }

            this.saveToStorage('kitsunewatch_movies_favorites', this.moviesFavorites);
        }

        this.displayFavorites();
    }

    removeFromFavorites(videoId) {
        if (this.activeTab === 'anime') {
            this.favorites = this.favorites.filter(f => f.id !== videoId);
            this.saveToStorage('kitsunewatch_favorites', this.favorites);
        } else {
            this.moviesFavorites = this.moviesFavorites.filter(f => f.id !== videoId);
            this.saveToStorage('kitsunewatch_movies_favorites', this.moviesFavorites);
        }
        this.displayFavorites();
    }

    displayFavorites() {
        if (!this.favoritesContainer) return;
        this.favoritesContainer.innerHTML = '';

        const currentFavorites = this.activeTab === 'anime' ? this.favorites : this.moviesFavorites;

        if (currentFavorites.length === 0) {
            this.favoritesContainer.style.display = 'none';
            return;
        }

        this.favoritesContainer.style.display = 'block';

        const title = document.createElement('h3');
        title.className = 'favorites-title';
        title.innerHTML = `<i class="bi bi-heart-fill"></i> Избранное ${this.activeTab === 'anime' ? 'аниме' : 'кино'}`;
        this.favoritesContainer.appendChild(title);

        const list = document.createElement('div');
        list.className = 'favorites-list';

        currentFavorites.forEach(fav => {
            const card = document.createElement('div');
            card.className = 'favorite-card';

            const t = document.createElement('span');
            t.className = 'favorite-card-title';
            t.textContent = `${fav.title} (${fav.year || '?'})`;
            card.appendChild(t);

            const play = document.createElement('button');
            play.className = 'favorite-play-button';
            play.innerHTML = '<i class="bi bi-play-fill"></i>';
            play.addEventListener('click', () => this.playFavorite(fav));
            card.appendChild(play);

            const remove = document.createElement('button');
            remove.className = 'favorite-remove-button';
            remove.innerHTML = '<i class="bi bi-x"></i>';
            remove.addEventListener('click', () => this.removeFromFavorites(fav.id));
            card.appendChild(remove);

            list.appendChild(card);
        });

        this.favoritesContainer.appendChild(list);
    }

    playFavorite(favorite) {
        if (this.activeTab === 'anime') {
            this.loadVideo(favorite);
        } else {
            this.loadMovie(favorite);
        }
        this.scrollToVideoPlayer();
    }

    // ============ ПРОКРУТКА ============
    scrollToVideoPlayer() {
        setTimeout(() => {
            const videoContainer = document.querySelector('.video-container');
            const appContainer = document.querySelector('.app');

            if (!videoContainer || !appContainer) return;

            if (appContainer.scrollHeight > appContainer.clientHeight) {
                const appRect = appContainer.getBoundingClientRect();
                const videoRect = videoContainer.getBoundingClientRect();
                const targetScroll = appContainer.scrollTop + (videoRect.top - appRect.top) - 20;

                appContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
            } else {
                const videoRect = videoContainer.getBoundingClientRect();
                window.scrollTo({ top: videoRect.top + window.pageYOffset - 20, behavior: 'smooth' });
            }
        }, 100);
    }

    // ============ ВИДЕО ============
    loadVideo(material) {
        this.currentVideo = material;
        this.isVideoLoading = true;
        this.hideAboutProject();
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        if (this.collectionsContainer) this.collectionsContainer.style.display = 'none';

        this.videoName.textContent = `${material.title || 'Без названия'} (${material.year || '?'})`;
        this.videoName.style.display = 'block';

        if (this.videoContainer) this.videoContainer.style.display = 'block';
        this.showVideoPlaceholder();

        if (material.link) {
            const url = this.sanitizeUrl(material.link);
            let fullUrl = url.startsWith('//') ? 'https:' + url : url;

            const posterUrl = 'https://raw.githubusercontent.com/PsyGioX/kitsunewatch/refs/heads/main/imgs/video_obl.jpg';
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

    // ============ ЗАГРУЗКА ФИЛЬМА ============
    loadMovie(material) {
        this.currentVideo = material;
        this.isVideoLoading = true;
        this.hideAboutProject();
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        if (this.collectionsContainer) this.collectionsContainer.style.display = 'none';

        const title = material.name || material.original_name || 'Без названия';
        this.videoName.textContent = `${title} (${material.year || '?'})`;
        this.videoName.style.display = 'block';

        if (this.videoContainer) this.videoContainer.style.display = 'block';
        this.showVideoPlaceholder();

        if (material.iframe) {
            const url = this.sanitizeUrl(material.iframe);
            let fullUrl = url.startsWith('//') ? 'https:' + url : url;

            this.videoFrame.src = fullUrl;
            this.videoFrame.setAttribute('allow', 'autoplay *; fullscreen *; picture-in-picture *');
            this.videoFrame.setAttribute('allowfullscreen', 'true');
        }

        this.displayMovieInfo(material);

        const shareUrl = this.generateShareUrl(material);
        this.shareLink.href = shareUrl;

        if (this.shareButton) {
            this.shareButton.style.display = 'inline-flex';
            this.shareButton.innerHTML = '<i class="bi bi-share"></i> Поделиться';
            this.shareButton.classList.remove('copied');
        }

        if (this.favoriteButton) {
            this.favoriteButton.style.display = 'inline-flex';
            const videoId = material.id || material.id_kp;
            const isFav = this.moviesFavorites.some(f => f.id === videoId);

            if (isFav) {
                this.favoriteButton.innerHTML = '<i class="bi bi-heart-fill"></i> В избранном';
                this.favoriteButton.classList.add('active');
            } else {
                this.favoriteButton.innerHTML = '<i class="bi bi-heart"></i> В избранное';
                this.favoriteButton.classList.remove('active');
            }
        }

        this.resultsContainer.style.display = 'block';

        if (material.id_kp) {
            const newUrl = `${window.location.origin}/?movies=true&kp=${material.id_kp}`;
            this.updateUrlWithoutReload(newUrl);
            this.updateSEO();
            this.currentSearchQuery = material.id_kp;
        }
    }

    displayMovieInfo(material) {
        let info = [];

        if (material.original_name) info.push(`Оригинальное: ${this.sanitizeInput(material.original_name)}`);
        if (material.country) info.push(`Страна: ${this.sanitizeInput(material.country)}`);
        if (material.genre) info.push(`Жанры: ${this.sanitizeInput(material.genre)}`);
        if (material.actor) info.push(`Актеры: ${this.sanitizeInput(material.actor)}`);
        if (material.director) info.push(`Режиссер: ${this.sanitizeInput(material.director)}`);
        if (material.time) info.push(`Длительность: ${this.sanitizeInput(material.time)}`);
        if (material.translation) info.push(`Озвучка: ${this.sanitizeInput(material.translation)}`);
        if (material.description) info.push(`\n${this.sanitizeInput(material.description)}`);

        this.videoAbout.textContent = info.join('\n');
        this.aboutBlock.style.display = info.length > 0 ? 'block' : 'none';
    }

    // ============ ГРУППИРОВКА ============
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

        this.totalPages = Math.ceil(totalItems / this.itemsPerPage);

        if (this.totalPages <= 1) {
            this.paginationContainer.style.display = 'none';
            this.paginationContainer.innerHTML = '';
            return;
        }

        this.paginationContainer.style.display = 'flex';
        this.paginationContainer.innerHTML = '';

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

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            this.paginationContainer.appendChild(this.createPageButton(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                this.paginationContainer.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            this.paginationContainer.appendChild(this.createPageButton(i));
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                this.paginationContainer.appendChild(ellipsis);
            }
            this.paginationContainer.appendChild(this.createPageButton(this.totalPages));
        }

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
        if (pageNumber === this.currentPage) pageButton.classList.add('active');
        pageButton.addEventListener('click', () => {
            this.currentPage = pageNumber;
            this.updatePagination();
            this.displayCurrentPage();
        });
        return pageButton;
    }

    updatePagination() {
        if (this.activeFilter === 'all') {
            this.createPagination(this.currentResults.length);
        } else {
            this.createPagination(this.filteredResults.length);
        }

        if (this.videoListContainer) {
            this.videoListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    displayCurrentPage() {
        if (this.activeFilter === 'all') {
            this.displayCurrentPageFromResults(this.currentResults);
        } else {
            this.displayCurrentPageFromResults(this.filteredResults);
        }
    }

    displayCurrentPageFromResults(results) {
        if (!results.length) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, results.length);
        const pageResults = results.slice(startIndex, endIndex);

        this.createVideoList(pageResults);
    }

    // ============ ГЕНЕРАЦИЯ ССЫЛОК ============
    generateShareUrl(material) {
        const baseUrl = window.location.origin;
        const params = new URLSearchParams();

        if (this.activeTab === 'movies') {
            params.set('movies', 'true');
            if (material?.id_kp) {
                params.set('kp', material.id_kp);
            } else if (material?.name) {
                params.set('search', encodeURIComponent(material.name));
            }
        } else {
            if (material?.title) {
                params.set('search', encodeURIComponent(material.title));
            }
        }

        return `${baseUrl}/?${params.toString()}`;
    }

    // ============ ОБНОВЛЕНИЕ URL ============
    updateUrlWithoutReload(url) {
        if (window.history && window.history.pushState) {
            window.history.pushState({}, '', url);
        }
    }

    // ============ ПОИСК АНИМЕ ============
    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Введите название аниме');
            return;
        }
        if (this.isSearching) return;

        this.currentSearchQuery = query;
        this.currentPage = 1;
        this.activeFilter = 'all';

        const newUrl = `${window.location.origin}/?search=${encodeURIComponent(query)}`;
        this.updateUrlWithoutReload(newUrl);
        this.updateSEO();

        this.showLoading();
        this.addToHistory(query);

        try {
            const searchUrl = `${this.API_URL}?token=${this.API_TOKEN}&title=${encodeURIComponent(query)}&with_material_data=true&limit=100&sort=popular`;
            const data = await this.fetchWithTimeout(searchUrl, 15000);

            if (data.results?.length > 0) {
                this.hasSearched = true;
                const grouped = this.groupResultsByTitle(data.results);
                this.currentResults = grouped;
                this.filteredResults = grouped;
                this.clearErrorMessages();
                this.displayAllResults(grouped);
            } else {
                this.showError('Ничего не найдено');
            }
        } catch (error) {
            console.error('Search error:', error);
            if (error.name === 'AbortError') {
                this.showError('Превышено время ожидания');
            } else {
                this.showError('Ошибка при поиске');
            }
        } finally {
            this.hideLoading();
        }
    }

    // ============ ПОИСК ФИЛЬМОВ ============
    async performMoviesSearch() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Введите название или ID Кинопоиска');
            return;
        }
        if (this.isSearching) return;

        this.currentSearchQuery = query;
        this.currentPage = 1;
        this.activeFilter = 'all';

        const isNumeric = /^\d+$/.test(query);
        const newUrl = isNumeric 
            ? `${window.location.origin}/?movies=true&kp=${encodeURIComponent(query)}`
            : `${window.location.origin}/?movies=true&search=${encodeURIComponent(query)}`;
        this.updateUrlWithoutReload(newUrl);
        this.updateSEO();

        this.showLoading();
        this.addToMoviesHistory(query);

        try {
            // Используем серверный прокси
            let apiUrl;
            if (isNumeric) {
                apiUrl = `/api/movies?token=${this.MOVIES_API_TOKEN}&kp=${encodeURIComponent(query)}`;
            } else {
                apiUrl = `/api/movies?token=${this.MOVIES_API_TOKEN}&q=${encodeURIComponent(query)}`;
            }

            const data = await this.fetchWithTimeout(apiUrl, 15000);

            if (data.status === 'error') {
                this.showError(data.message || 'Ошибка API');
                return;
            }

            if (data.data && data.data.length > 0) {
                this.hasSearched = true;
                this.currentResults = data.data;
                this.filteredResults = data.data;
                this.clearErrorMessages();
                this.displayMoviesResults(data.data);
            } else {
                this.showError('Ничего не найдено');
            }
        } catch (error) {
            console.error('Search error:', error);
            if (error.name === 'AbortError') {
                this.showError('Превышено время ожидания');
            } else {
                this.showError('Ошибка при поиске. Попробуйте позже.');
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
                translation: { id: firstResult.translations[0].id, title: firstResult.translations[0].title },
                quality: firstResult.translations[0].quality
            };
            this.loadVideo(videoWithLink);
        } else {
            this.loadVideo(firstResult);
        }

        this.createTabs(results);
        this.displayCurrentPage();
        this.createPagination(results.length);

        setTimeout(() => this.scrollToVideoPlayer(), 300);
    }

    displayMoviesResults(results) {
        if (results.length === 0) {
            this.showError('Ничего не найдено');
            return;
        }

        const firstResult = results[0];
        this.loadMovie(firstResult);

        this.createMoviesTabs(results);
        this.displayCurrentMoviesPage();
        this.createPagination(results.length);

        setTimeout(() => this.scrollToVideoPlayer(), 300);
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

    createMoviesTabs(results) {
        this.tabsContainer.innerHTML = '';
        this.tabsContainer.style.display = 'flex';

        const types = new Map();
        types.set('all', 'Все');
        results.forEach(r => {
            if (r.type && !types.has(r.type)) {
                types.set(r.type, this.getMovieTypeName(r.type));
            }
        });

        types.forEach((name, type) => {
            const tab = document.createElement('button');
            tab.className = 'tab-button';
            tab.dataset.type = type;
            tab.textContent = name;
            if (type === 'all') tab.classList.add('active');
            tab.addEventListener('click', () => this.filterMoviesResults(type));
            this.tabsContainer.appendChild(tab);
        });
    }

    createVideoList(results) {
        this.videoListContainer.innerHTML = '';
        this.videoListContainer.style.display = 'grid';
        this.videoListContainer.className = 'video-list';

        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.dataset.type = result.type || 'unknown';

            const title = document.createElement('h3');
            title.className = 'video-card-title';
            title.textContent = result.title || 'Без названия';

            const info = document.createElement('div');
            info.className = 'video-card-info';

            if (result.year) {
                const year = document.createElement('span');
                year.className = 'video-card-year';
                year.textContent = result.year;
                info.appendChild(year);
            }

            const type = document.createElement('span');
            type.className = 'video-card-type';
            type.textContent = this.getTypeName(result.type);
            info.appendChild(type);

            const transCount = document.createElement('span');
            transCount.className = 'video-card-translations-count';
            transCount.innerHTML = `<i class="bi bi-mic"></i> ${result.translations?.length || 0}`;
            info.appendChild(transCount);

            card.appendChild(title);
            card.appendChild(info);
            card.addEventListener('click', () => {
                if (result.translations && result.translations.length > 0) {
                    const videoWithLink = {
                        ...result,
                        link: result.translations[0].link,
                        translation: { id: result.translations[0].id, title: result.translations[0].title },
                        quality: result.translations[0].quality
                    };
                    this.loadVideo(videoWithLink);
                } else {
                    this.loadVideo(result);
                }
            });

            this.videoListContainer.appendChild(card);
        });
    }

    createMoviesList(results) {
        this.videoListContainer.innerHTML = '';
        this.videoListContainer.style.display = 'grid';
        this.videoListContainer.className = 'video-list';

        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'video-card movie-card';
            card.dataset.type = result.type || 'unknown';

            if (result.poster) {
                const poster = document.createElement('img');
                poster.className = 'movie-poster';
                poster.src = result.poster;
                poster.alt = result.name || '';
                poster.loading = 'lazy';
                poster.onerror = () => { poster.style.display = 'none'; };
                card.appendChild(poster);
            }

            const title = document.createElement('h3');
            title.className = 'video-card-title';
            title.textContent = result.name || result.original_name || 'Без названия';

            const info = document.createElement('div');
            info.className = 'video-card-info';

            if (result.year) {
                const year = document.createElement('span');
                year.className = 'video-card-year';
                year.textContent = result.year;
                info.appendChild(year);
            }

            const type = document.createElement('span');
            type.className = 'video-card-type';
            type.textContent = this.getMovieTypeName(result.type);
            info.appendChild(type);

            if (result.id_kp) {
                const kpId = document.createElement('span');
                kpId.className = 'video-card-quality';
                kpId.textContent = `KP: ${result.id_kp}`;
                info.appendChild(kpId);
            }

            card.appendChild(title);
            card.appendChild(info);
            card.addEventListener('click', () => this.loadMovie(result));

            this.videoListContainer.appendChild(card);
        });
    }

    filterResults(type) {
        this.activeFilter = type;
        this.currentPage = 1;

        this.tabsContainer.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        this.filteredResults = type === 'all' 
            ? this.currentResults 
            : this.currentResults.filter(r => r.type === type);

        if (this.filteredResults.length > 0) {
            this.displayCurrentPage();
            this.createPagination(this.filteredResults.length);
        } else {
            this.videoListContainer.innerHTML = '';
            this.videoListContainer.style.display = 'none';
            this.paginationContainer.style.display = 'none';
        }
    }

    filterMoviesResults(type) {
        this.activeFilter = type;
        this.currentPage = 1;

        this.tabsContainer.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        this.filteredResults = type === 'all' 
            ? this.currentResults 
            : this.currentResults.filter(r => r.type === type);

        if (this.filteredResults.length > 0) {
            this.displayCurrentMoviesPage();
            this.createPagination(this.filteredResults.length);
        } else {
            this.videoListContainer.innerHTML = '';
            this.videoListContainer.style.display = 'none';
            this.paginationContainer.style.display = 'none';
        }
    }

    displayCurrentMoviesPage() {
        if (this.activeFilter === 'all') {
            this.displayCurrentMoviesPageFromResults(this.currentResults);
        } else {
            this.displayCurrentMoviesPageFromResults(this.filteredResults);
        }
    }

    displayCurrentMoviesPageFromResults(results) {
        if (!results.length) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, results.length);
        const pageResults = results.slice(startIndex, endIndex);

        this.createMoviesList(pageResults);
    }

    // ============ ИНФОРМАЦИЯ ============
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

    getMovieTypeName(type) {
        const map = {
            'movie': 'Фильм',
            'serial': 'Сериал'
        };
        return map[type] || type || 'Другое';
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
        if (this.videoListContainer) {
            this.videoListContainer.style.display = 'none';
            this.videoListContainer.innerHTML = '';
            this.videoListContainer.className = 'video-list';
        }
        if (this.paginationContainer) { this.paginationContainer.style.display = 'none'; this.paginationContainer.innerHTML = ''; }
        this.currentResults = [];
        this.filteredResults = [];
        this.hasSearched = false;
        this.currentVideo = null;
        this.currentPage = 1;
        this.activeFilter = 'all';
        this.currentSearchQuery = '';
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
                    title: this.currentVideo?.title || this.currentVideo?.name || 'KitsuneWatch',
                    text: `Смотрите на KitsuneWatch!`,
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