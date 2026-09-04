// assets/scripts/index.js

class KitsuneWatchApp {
    constructor() {
        // API конфигурация — запросы теперь идут через собственные serverless-
        // функции (/api/search, /api/years, /api/top), которые проксируют
        // Kodik API и хранят токен только на сервере. На клиенте токена
        // больше нет — раньше он был виден в исходниках любому посетителю.
        this.API_URL = '/api/search';
        this.YEARS_API_URL = '/api/years';
        this.TOP_API_URL = '/api/top';
        this.CALENDAR_API_URL = '/api/calendar';

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
        this.viewMode = 'home'; // 'home' | 'search' | 'top100'
        this.currentSearchController = null; // Для отмены активных поисков/загрузок (поиск, топ 100)
        this._cancelledByUser = false; // true, если текущую загрузку прервал сам пользователь кнопкой отмены,
                                        // а не реальный таймаут сети — иначе оба случая выглядят как одна и
                                        // та же ошибка AbortError и пользователю показывалось неверное
                                        // сообщение "Превышено время ожидания" даже при ручной отмене

        // ============ КЭШИРОВАНИЕ ДАННЫХ API ============
        // Клиентский кэш поверх серверного Cache-Control (/api/*) и Service
        // Worker (см. sw.js): избегаем повторных сетевых запросов для одного
        // и того же поиска/топа/премьер в рамках TTL. Кнопка "Обновить"
        // принудительно обходит кэш и обновляет данные с сервера.
        this.CACHE_PREFIX = 'kw_cache_v1_';
        this.CACHE_TTL = {
            search: 5 * 60 * 1000,      // 5 минут — как s-maxage в /api/search
            top100: 30 * 60 * 1000,     // 30 минут — как s-maxage в /api/top
            years: 60 * 60 * 1000,      // 1 час — как s-maxage в /api/years
            calendar: 3 * 60 * 60 * 1000 // 3 часа — как s-maxage в /api/calendar
        };
        this.refreshButton = null;
        this.cacheStatusBadge = null;
        this.calendarData = null;
        this.calendarActiveDate = null;

        // Данные из localStorage
        this.searchHistory = this.loadFromStorage('kitsunewatch_history', []);
        this.favorites = this.loadFromStorage('kitsunewatch_favorites', []);

        // Фильтры поиска и категорий внутри истории и избранного
        this.historyFilterQuery = '';
        this.historyFilterType = 'all';
        this.favoritesFilterQuery = '';
        this.favoritesFilterType = 'all';

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
            'Наруто',
            'Блич',
            'Ван Пис',
            'Атака титанов',
            'Тетрадь смерти',
            'Клинок, рассекающий демонов',
            'Моя геройская академия',
            'Токийский гуль',
            'Стальной алхимик: Братство',
            'Код Гиас',
            'Врата Штейна',
            'Твоё имя',
            'Ходячий замок',
            'Унесённые призраками',
            'Магическая битва',
            'Человек-бензопила',
            'Семья шпиона',
            'Реинкарнация безработного',
            'О моём перерождении в слизь',
            'Восхождение героя щита',

            'Ванпанчмен',
            'Охотник х Охотник',
            'Магическая битва 0',
            'Моб Психо 100',
            'Нет игры — нет жизни',
            'Re:Zero. Жизнь с нуля в альтернативном мире',
            'Твоя апрельская ложь',
            'Торадора!',
            'Бездомный бог',
            'Паразит: Учение о жизни',
            'Доктор Стоун',
            'Созданный в Бездне',
            'Вайолет Эвергарден',
            'Форма голоса',
            'Сага о Винланде',
            'Монстр',
            'Ковбой Бибоп',
            'Самурай Чамплу',
            'Евангелион',
            'Берсерк',

            'Хеллсинг Ultimate',
            'Эльфийская песнь',
            'Ангельские ритмы!',
            'Ангел кровопролития',
            'Токийские мстители',
            'Синяя тюрьма: Блю Лок',
            'Волейбол!!',
            'Баскетбол Куроко',
            'Первый шаг',
            'Юри на льду',
            'Инициал Ди',
            'Ао Аси',
            'Мегалобокс',
            'Слэм-данк',
            'Беги с ветром',
            'О моём перерождении в отомэ-игре',
            'Этот замечательный мир!',
            'Великий из бродячих псов',
            'Чёрный клевер',
            'Семь смертных грехов',

            'Синяя экзорцистка',
            'Пожиратель душ',
            'Пожарная сила',
            'Дороро',
            'Дандадан',
            'Адский рай',
            'Кайдзю №8',
            'Фрирен: Провожающая в последний путь',
            'Подземелье вкусностей',
            'Рубеж Шангри-Ла',
            'Нежеланный бессмертный авантюрист',
            'Неправильный способ использования исцеляющей магии',
            'Поднятие уровня в одиночку',
            'Башня Бога',
            'Бог старшей школы',
            'Великий притворщик',
            'Эхо террора',
            'Психопаспорт',
            'Призрак в доспехах',
            'Акира',

            'Идеальная грусть',
            'Паприка',
            'Агент паранойи',
            'Токийские крестные',
            'Парад смерти',
            'Игра друзей',
            'Класс превосходства',
            'Добро пожаловать в класс для особо одарённых',
            'Будни старшеклассников',
            'Повседневная жизнь старшеклассников',
            'Кагуя: в любви как на войне',
            'Госпожа Кобаяши и её горничная-дракон',
            'Моя история любви!',
            'Президент студсовета — горничная!',
            'Очень приятно, Бог',
            'Хоримия',
            'Дотянуться до тебя',
            'Скажи: Я люблю тебя',
            'Золотая пора',
            'Кланнад',

            'Кланнад: После истории',
            'Пластиковые воспоминания',
            'Твоя ложь в апреле',
            'Ангельские ритмы',
            'Укрась прощальное утро цветами обещания',
            '5 сантиметров в секунду',
            'Дитя погоды',
            'Судзумэ, закрывающая двери',
            'Дитя чудовища',
            'Волчьи дети Амэ и Юки',
            'Девочка, покорившая время',
            'Летние войны',
            'Красавица и дракон',
            'Мирай из будущего',
            'Сад изящных слов',
            'Ловцы забытых голосов',
            'Патэма наоборот',
            'Укрась прощальное утро',
            'Могила светлячков',
            'Принцесса Мононоке',

            'Мой сосед Тоторо',
            'Ведьмина служба доставки',
            'Небесный замок Лапута',
            'Навсикая из Долины ветров',
            'Поньо на утёсе',
            'Ветер крепчает',
            'Воспоминания о Марни',
            'Ариэтти из страны лилипутов',
            'Рыжая свинка',
            'Шёпот сердца',
            'Возвращение кота',
            'Сказание о принцессе Кагуя',
            'Мальчик и птица',
            'Песнь моря',
            'Красная черепаха',
            'Мастера меча онлайн',
            'Оверлорд',
            'Повелитель',
            'Лог Горизонт',
            'Гримгар: Пепел и иллюзии',

            'Конец света: Восхождение героя',
            'Нет игры — нет жизни: Ноль',
            'В другом мире со смартфоном',
            'Арифурэта',
            'Да, я паук, и что?',
            'Лунное путешествие приведёт к новому миру',
            'Реинкарнация в меч',
            'Маг-целитель: Новый старт',
            'Бофури',
            'Жизнь в другом мире с нуля',
            'Повесть о конце света',
            'Записи о магии',
            'Невеста чародея',
            'Судьба: Ночь схватки',
            'Судьба: Начало',
            'Судьба: Апокриф',
            'Судьба: Великий приказ',
            'Кара но Кёкай',
            'Граница пустоты',
            'Мадока: Девочка-волшебница',

            'Волчица и пряности',
            'Убийца демонов: Поезд Бесконечности',
            'Магическая битва: Скрытый инвентарь',
            'Человек-дьявол: Плакса',
            'Киберпанк: Бегущие по краю',
            'Лазарус',
            'Ниндзя Камуи',
            'Триган',
            'Триган: Ураган',
            'Черная лагуна',
            'Гангрейв',
            'Гуррен-Лаганн',
            'Убийца Акаме!',
            'Мир отомэ-игр — это тяжёлый мир для мобов',
            'Темнее чёрного',
            'Эрго Прокси',
            'Эксперименты Лэйн',
            'Эрго Прокси',
            'Бугипоп',
            'Другой',

            'Иная',
            'Когда плачут цикады',
            'Шики',
            'Монолог фармацевта',
            'Корзинка фруктов',
            'Древняя магия',
            'Розарио + Вампир',
            'Убийца гоблинов',
            'Герой-рационал перестраивает королевство',
            'Рагна Багровый',
            'Непризнанный школой король демонов',
            'Внук мудреца',
            'Магическая битва: Второй сезон',
            'Золотое божество',
            'Королевство',
            'Легенда о героях Галактики',
            'Бакуман',
            'Синяя весна',
            'Скейт: Бесконечность',
            'Бек',

            'Звуки жизни',
            'Лагерь на свежем воздухе',
            'Дневник будущего',
            'Тетрадь дружбы Нацумэ',
            'Мастер Муси',
            'Баракамон',
            'Девушки и танки',
            'Меланхолия Харухи Судзумии',
            'Исчезновение Харухи Судзумии',
            'Ничидзё',
            'Адзуманга Дайо',
            'Кэйон!',
            'Коми не может общаться',
            'Не издевайся, Нагаторо',
            'Этот глупый свин не понимает мечту девочки-зайки',
            'Опасность в моём сердце',
            'Семья шпиона: Код Белый',
            'Любовь после мирового господства',
            'Слишком много проигравших героинь!',
            'Звёздное дитя',

            'Идолмастер',
            'Оши но Ко',
            'Моя Dress-Up Darling',
            'Старшая школа DxD',
            'Удар крови',
            'Пламенная бригада пожарных',
            'Дети леса',
            'Невеста титана',
            'Девушка напрокат',
            'Магия и мускулы',
            'Нежить и неудача',
            'Семьдесят семь',
            'НиеР: Автомата',
            'Аркейн: не аниме',
            'Покемон',
            'Дигимон',
            'Ю-Ги-О!',
            'Бейблэйд',
            'Драконий жемчуг',
            'Драконий жемчуг Z',

            'Драконий жемчуг Супер',
            'Сейлор Мун',
            'Ранма 1/2',
            'Инуяша',
            'Руруни Кэнсин',
            'Кулак Северной звезды',
            'Капитан Цубаса',
            'Невероятные приключения ДжоДжо',
            'Магическая академия Атараксия',
            'Песнь ночных сов',
            'Провожающая в последний путь Фрирен',
            'Девочка из Чужеземья',
            'Земля самоцветов',
            'Страна самоцветов',
            'Би: Начало',
            '91 день',
            'Банановая рыба',
            'Великий учитель Онидзука',
            'Гинтама',
            'Космические братья',
            'Пинг-понг'
        ];

        // Подборки аниме
        this.animeCollections = {
            'popular': {
                title: 'Популярное аниме',
                icon: 'bi-fire',
                description: 'Самые популярные аниме последних лет',
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
                description: 'Веселые и смешные аниме',
                query: 'комедия аниме'
            },
            'drama': {
                title: 'Драма',
                icon: 'bi-droplet',
                description: 'Серьезные и глубокие истории',
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
                if (this.currentVideo) this.loadVideo(this.currentVideo);
            });
        }
    }

    // ============ ЛОГОТИП ============
    setupLogo() {
        const logoImg = document.querySelector('.logo_img');
        if (!logoImg) return;

        const paths = [
            '/imgs/logo.jpg',
            '/imgs/favicon-32x32.png'
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
        this.setupViewportHeight();
        this.displayAboutProject();
        this.loadYearPremieres();
        this.loadCalendar();
        this.displayCollections();
        this.handleURLParams();
        this.updateSEO();

        setTimeout(() => {
            this.displayHistory();
            this.displayFavorites();
        }, 500);
    }
    
    // ============ VIEWPORT HEIGHT FIX ============
    setupViewportHeight() {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });
    }

    // ============ ЗАГРУЗКА ПРЕМЬЕР ГОДА ============
    async loadYearPremieres(forceRefresh = false) {
        try {
            const currentYear = new Date().getFullYear();

            const { data, fromCache, stale, cachedAt } = await this.fetchJSONCached(
                this.YEARS_API_URL, 'years', this.CACHE_TTL.years, { forceRefresh }
            );

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
            return { ok: true, fromCache, stale, cachedAt };
        } catch (error) {
            console.error('Error loading year premieres:', error);
            const currentYear = new Date().getFullYear();
            this.displayPremieres(currentYear, 0);
            return { ok: false };
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

    // ============ ГРАФИК ПРЕМЬЕР (Shikimori) ============
    // Kodik не отдаёт даты выхода серий, поэтому даты берём через свой
    // прокси /api/calendar (см. api/calendar.js), который сам объединяет
    // расписание ближайших серий и анонсированные премьеры с Shikimori.
    // Ссылка "Смотреть" на каждой карточке — это обычный поиск по названию
    // среди того, что уже проиндексировано у Kodik.
    async loadCalendar(forceRefresh = false) {
        if (!this.calendarContainer) return { ok: false };

        try {
            const { data, fromCache, stale, cachedAt } = await this.fetchJSONCached(
                this.CALENDAR_API_URL, 'calendar', this.CACHE_TTL.calendar, { forceRefresh }
            );

            if (data?.days?.length > 0) {
                this.calendarData = data.days;
                const todayKey = new Date().toISOString().slice(0, 10);
                this.calendarActiveDate = data.days.find(d => d.date >= todayKey)?.date || data.days[0].date;
                this.displayCalendar();
            } else {
                this.calendarContainer.style.display = 'none';
            }
            return { ok: true, fromCache, stale, cachedAt };
        } catch (error) {
            console.error('Error loading calendar:', error);
            // Второстепенная фича — молча скрываем блок, не мешаем остальной странице
            this.calendarContainer.style.display = 'none';
            return { ok: false };
        }
    }

    displayCalendar() {
        if (!this.calendarContainer || !this.calendarData?.length) return;

        this.calendarContainer.style.display = 'block';

        // Сохраняем горизонтальный скролл ряда дат — этот метод пересоздаёт
        // весь блок целиком (используется при первой загрузке/принудительном
        // обновлении данных), поэтому без этого прокрутка каждый раз слетала бы
        const existingTabs = this.calendarContainer.querySelector('.calendar-day-tabs');
        const savedScrollLeft = existingTabs ? existingTabs.scrollLeft : 0;

        const tabs = this.calendarData.map(day => `
            <button type="button"
                class="calendar-day-tab${day.date === this.calendarActiveDate ? ' active' : ''}"
                data-date="${day.date}">
                <span class="calendar-day-tab-weekday">${this.formatCalendarWeekday(day.date)}</span>
                <span class="calendar-day-tab-date">${this.formatCalendarShortDate(day.date)}</span>
                ${day.items.length ? `<span class="calendar-day-tab-count">${day.items.length}</span>` : ''}
            </button>
        `).join('');

        const activeDay = this.calendarData.find(d => d.date === this.calendarActiveDate) || this.calendarData[0];
        const items = activeDay.items.map(item => this.renderCalendarItem(item)).join('');

        this.calendarContainer.innerHTML = `
            <div class="calendar-block">
                <div class="calendar-header">
                    <i class="bi bi-calendar-week"></i>
                    <h2>График премьер</h2>
                    <span class="calendar-subtitle">Новые серии и премьеры на ближайший месяц</span>
                </div>
                <div class="calendar-day-tabs">${tabs}</div>
                <div class="calendar-items">
                    ${items || '<div class="calendar-empty">В этот день премьер не запланировано</div>'}
                </div>
            </div>
        `;

        const newTabs = this.calendarContainer.querySelector('.calendar-day-tabs');
        if (newTabs) newTabs.scrollLeft = savedScrollLeft;
    }

    renderCalendarItem(item) {
        const typeLabels = {
            'episode': { label: item.episode ? `${item.episode} серия` : 'Новая серия', cls: 'episode' },
            'episode-projected': { label: item.episode ? `${item.episode} серия (план)` : 'Серия (план)', cls: 'projected' },
            'premiere': { label: 'Премьера', cls: 'premiere' }
        };
        const badge = typeLabels[item.type] || { label: '', cls: '' };
        const time = new Date(item.time);
        const timeStr = isNaN(time.getTime()) ? '' : time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const safeTitle = this.sanitizeInput(item.title);
        const safePoster = this.sanitizeUrl(item.poster || '');
        const poster = safePoster
            ? `<img src="${safePoster}" alt="${safeTitle}" loading="lazy">`
            : '<i class="bi bi-image calendar-item-noposter"></i>';

        return `
            <div class="calendar-item" data-anime-title="${this.escapeHtmlAttr(item.title)}">
                <div class="calendar-item-poster">${poster}</div>
                <div class="calendar-item-info">
                    <span class="calendar-item-title">${safeTitle}</span>
                    <span class="calendar-item-meta">
                        <span class="calendar-item-badge ${badge.cls}">${badge.label}</span>
                        ${timeStr ? `<span class="calendar-item-time">${timeStr}</span>` : ''}
                    </span>
                </div>
            </div>
        `;
    }

    selectCalendarDate(date) {
        this.calendarActiveDate = date;
        // Точечное обновление: трогаем только активный класс вкладки и список
        // карточек, не пересоздавая ряд дат целиком — иначе он всегда сбрасывал
        // бы горизонтальный скролл на 0 при каждом клике по дате
        this.updateCalendarSelection();
    }

    updateCalendarSelection() {
        if (!this.calendarContainer || !this.calendarData?.length) return;

        this.calendarContainer.querySelectorAll('.calendar-day-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.date === this.calendarActiveDate);
        });

        const itemsContainer = this.calendarContainer.querySelector('.calendar-items');
        if (!itemsContainer) return;

        const activeDay = this.calendarData.find(d => d.date === this.calendarActiveDate) || this.calendarData[0];
        const items = activeDay.items.map(item => this.renderCalendarItem(item)).join('');
        itemsContainer.innerHTML = items || '<div class="calendar-empty">В этот день премьер не запланировано</div>';
    }

    async searchFromCalendar(title) {
        if (!title) return;
        this.searchInput.value = title;
        this.currentSearchQuery = title;
        await this.performSearch();
    }

    formatCalendarWeekday(dateKey) {
        const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const d = new Date(`${dateKey}T00:00:00`);
        const todayKey = new Date().toISOString().slice(0, 10);
        const tomorrowKey = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        if (dateKey === todayKey) return 'Сегодня';
        if (dateKey === tomorrowKey) return 'Завтра';
        return weekdays[d.getDay()];
    }

    formatCalendarShortDate(dateKey) {
        const d = new Date(`${dateKey}T00:00:00`);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    // Ряд с датами — это горизонтальный скролл, а на десктопе обычная мышь
    // без трекпада не умеет крутить его колесом и не даёт зацепить тонкий
    // скроллбар. Добавляем: колесо мыши -> горизонтальная прокрутка, и
    // перетаскивание зажатой левой кнопкой мыши (drag-to-scroll).
    setupCalendarTabsScroll() {
        this.calendarContainer.addEventListener('wheel', (e) => {
            const tabs = e.target.closest('.calendar-day-tabs');
            if (!tabs || tabs.scrollWidth <= tabs.clientWidth) return;
            if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
            e.preventDefault();
            tabs.scrollLeft += e.deltaY;
        }, { passive: false });

        this.calendarContainer.addEventListener('mousedown', (e) => {
            const tabs = e.target.closest('.calendar-day-tabs');
            if (!tabs || e.button !== 0) return;

            const startX = e.pageX;
            const startScrollLeft = tabs.scrollLeft;
            let dragged = false;

            const onMove = (moveEvent) => {
                const delta = moveEvent.pageX - startX;
                if (!dragged && Math.abs(delta) > 4) {
                    dragged = true;
                    tabs.classList.add('dragging');
                }
                if (dragged) {
                    moveEvent.preventDefault();
                    tabs.scrollLeft = startScrollLeft - delta;
                }
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                tabs.classList.remove('dragging');

                if (dragged) {
                    // Гасим клик сразу после драга, чтобы он не считался выбором вкладки
                    const suppressClick = (clickEvent) => {
                        clickEvent.stopPropagation();
                        clickEvent.preventDefault();
                    };
                    tabs.addEventListener('click', suppressClick, { capture: true, once: true });
                }
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    // ============ ПОДБОРКИ АНИМЕ ============
    displayCollections() {
        if (!this.collectionsContainer) return;

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

    // ============ РАНДОМАЙЗЕР ============
    randomAnime() {
        const randomIndex = Math.floor(Math.random() * this.popularAnime.length);
        const randomTitle = this.popularAnime[randomIndex];

        this.searchInput.value = randomTitle;
        this.currentSearchQuery = randomTitle;
        this.performSearch();

        // Анимация кнопки
        const randomButton = document.getElementById('randomAnimeButton');
        if (randomButton) {
            randomButton.classList.add('spinning');
            setTimeout(() => {
                randomButton.classList.remove('spinning');
            }, 1000);
        }
    }

    // ============ ТОП 100 АНИМЕ ============
    async loadTop100(forceRefresh = false) {
        // Прерываем любую другую активную загрузку тем же контроллером
        // (поиск), и заводим новый — чтобы кнопка отмены в прелоадере
        // реально останавливала запрос, а не просто прятала оверлей
        if (this.currentSearchController) this.currentSearchController.abort();
        this.currentSearchController = new AbortController();
        this._cancelledByUser = false;

        this.showLoading('Загружаем топ 100');
        this.viewMode = 'top100';

        try {
            const { data, fromCache, stale, cachedAt } = await this.fetchJSONCached(
                this.TOP_API_URL, 'top100', this.CACHE_TTL.top100,
                { forceRefresh, signal: this.currentSearchController.signal }
            );

            if (data.results && data.results.length > 0) {
                this.displayTop100(data.results);
                this.showCacheStatus(fromCache, stale, cachedAt);
            } else {
                this.showError('Не удалось загрузить топ 100');
            }
        } catch (error) {
            console.error('Error loading top 100:', error);

            if (error.name === 'AbortError' && this._cancelledByUser) {
                // Пользователь сам отменил загрузку — без тоста об ошибке
            } else if (error.name === 'AbortError') {
                this.showError('Превышено время ожидания');
            } else {
                this.showError('Ошибка при загрузке топ 100');
            }
        } finally {
            this.currentSearchController = null;
            this._cancelledByUser = false;
            this.hideLoading();
        }
    }

    displayTop100(results) {
        if (!this.videoListContainer) return;

        this.hideAboutProject();
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        if (this.calendarContainer) this.calendarContainer.style.display = 'none';
        if (this.collectionsContainer) this.collectionsContainer.style.display = 'none';

        // Скрываем плеер и все его элементы
        if (this.videoContainer) this.videoContainer.style.display = 'none';
        if (this.videoPlaceholder) this.videoPlaceholder.style.display = 'none';
        this.videoFrame.style.display = 'none';
        this.videoFrame.src = '';
        this.videoName.style.display = 'none';
        this.videoName.textContent = '';
        this.aboutBlock.style.display = 'none';
        this.videoAbout.textContent = '';

        // Скрываем кнопки
        if (this.shareButton) this.shareButton.style.display = 'none';
        if (this.favoriteButton) this.favoriteButton.style.display = 'none';
        if (this.shareLink) this.shareLink.href = '#';

        // Скрываем вкладки и пагинацию
        if (this.tabsContainer) {
            this.tabsContainer.style.display = 'none';
            this.tabsContainer.innerHTML = '';
        }
        if (this.paginationContainer) {
            this.paginationContainer.style.display = 'none';
            this.paginationContainer.innerHTML = '';
        }

        // Очищаем и показываем контейнер для списка
        this.resultsContainer.style.display = 'block';
        this.videoListContainer.style.display = 'block';
        this.videoListContainer.innerHTML = '';
        this.videoListContainer.className = 'video-list top-100-list';

        // Создаем заголовок
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

        // Создаем сетку для карточек
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

            if (result.material_data?.kinopoisk_rating) {
                const rating = document.createElement('span');
                rating.className = 'top-100-rating';
                rating.innerHTML = `<i class="bi bi-star-fill"></i> ${result.material_data.kinopoisk_rating}`;
                details.appendChild(rating);
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
        // Показываем главную страницу
        this.viewMode = 'home';
        this.clearAllResults();
        this.displayAboutProject();
        this.loadYearPremieres();
        this.loadCalendar();
        this.displayCollections();
        this.updateUrlWithoutReload(window.location.origin);
        this.updateSEO();
    }

    // ============ SEO ОПТИМИЗАЦИЯ ============
    // material — необязательный объект с полными данными тайтула
    // (title_orig, material_data{genres, description, rating...}), доступен
    // при просмотре видео. Когда он передан, строим расширенные метатеги и
    // структурированные данные (JSON-LD) под конкретное аниме — это то, что
    // видят поисковики и мессенджеры (Open Graph) при попадании на страницу.
    updateSEO(material = null) {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('search');
        const title = document.querySelector('title');
        const metaDescription = document.querySelector('meta[name="description"]');
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const ogType = document.querySelector('meta[property="og:type"]');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        const twitterDescription = document.querySelector('meta[name="twitter:description"]');
        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        const defaultOgImage = ogImage ? ogImage.getAttribute('data-default') || ogImage.content : '';

        const baseTitle = 'KitsuneWatch - Смотри аниме онлайн';
        const baseDescription = 'KitsuneWatch - бесплатный онлайн-кинотеатр аниме. Смотрите любимые аниме сериалы и фильмы в высоком качестве.';
        const baseKeywords = 'аниме, смотреть аниме, аниме онлайн, KitsuneWatch, аниме сериалы, японская анимация';

        if (material && material.title) {
            // ---- Расширенное SEO под конкретное аниме ----
            const md = material.material_data || {};
            const q = material.title;
            const genres = Array.isArray(md.genres) ? md.genres : [];
            const rating = md.shikimori_rating || md.kinopoisk_rating || md.imdb_rating || null;
            const year = material.year || md.year || '';
            const typeName = material.type ? this.getTypeName(material.type) : '';

            const genresPart = genres.length ? ` Жанры: ${genres.slice(0, 5).join(', ')}.` : '';
            const ratingPart = rating ? ` Рейтинг: ${rating}.` : '';
            const yearPart = year ? ` ${year} года.` : '';

            const richTitle = `${q}${year ? ' (' + year + ')' : ''} - смотреть ${typeName ? typeName.toLowerCase() + ' ' : ''}онлайн бесплатно | KitsuneWatch`;
            const richDescription = `Смотреть ${q} онлайн в хорошем качестве бесплатно, без регистрации.${yearPart}${genresPart}${ratingPart} Все серии и озвучки на KitsuneWatch.`;
            const richKeywords = [`${q}`, `смотреть ${q}`, `${q} онлайн`, `${q} все серии`, `аниме ${q}`, ...genres.map(g => `аниме ${g.toLowerCase()}`)].join(', ');
            const image = md.poster_url || defaultOgImage;

            if (title) title.textContent = richTitle;
            if (metaDescription) metaDescription.content = richDescription;
            if (metaKeywords) metaKeywords.content = richKeywords;
            if (ogTitle) ogTitle.content = richTitle;
            if (ogDescription) ogDescription.content = richDescription;
            if (ogUrl) ogUrl.content = window.location.href;
            if (ogType) ogType.content = 'video.other';
            if (ogImage && image) ogImage.content = image;
            if (twitterTitle) twitterTitle.content = richTitle;
            if (twitterDescription) twitterDescription.content = richDescription;
            if (twitterImage && image) twitterImage.content = image;
            this.updateCanonicalLink(window.location.href);
            this.updateAnimeStructuredData(material);

        } else if (searchQuery && searchQuery.trim()) {
            let query = searchQuery.trim();
            try {
                query = decodeURIComponent(query);
                if (query.includes('%25')) {
                    query = decodeURIComponent(query);
                }
            } catch (e) { }

            if (title) title.textContent = `${query} - смотреть аниме онлайн | KitsuneWatch`;
            if (metaDescription) metaDescription.content = `Смотреть ${query} онлайн в хорошем качестве. Все серии ${query} на KitsuneWatch. Бесплатно, без регистрации.`;
            if (metaKeywords) metaKeywords.content = `${query}, смотреть ${query}, ${query} аниме, ${query} онлайн, аниме ${query}`;
            if (ogTitle) ogTitle.content = `${query} - смотреть онлайн | KitsuneWatch`;
            if (ogDescription) ogDescription.content = `Смотреть ${query} онлайн в хорошем качестве. Все серии ${query} на KitsuneWatch.`;
            if (ogUrl) ogUrl.content = window.location.href;
            if (ogType) ogType.content = 'website';
            if (ogImage && defaultOgImage) ogImage.content = defaultOgImage;
            if (twitterTitle) twitterTitle.content = `${query} - смотреть онлайн | KitsuneWatch`;
            if (twitterDescription) twitterDescription.content = `Смотреть ${query} онлайн в хорошем качестве. Все серии ${query} на KitsuneWatch.`;
            this.updateCanonicalLink(window.location.href);
            this.removeStructuredData('anime-structured-data');
            this.removeStructuredData('anime-breadcrumb-data');

        } else if (params.get('favorites') === 'true') {
            if (title) title.textContent = 'Избранное | KitsuneWatch';
            if (metaDescription) metaDescription.content = 'Ваши любимые аниме в избранном на KitsuneWatch. Быстрый доступ к сохраненным тайтлам.';
            if (ogTitle) ogTitle.content = 'Избранное | KitsuneWatch';
            if (ogType) ogType.content = 'website';
            this.updateCanonicalLink(window.location.origin + '/?favorites=true');
            this.removeStructuredData('anime-structured-data');
            this.removeStructuredData('anime-breadcrumb-data');

        } else if (params.get('history') === 'true') {
            if (title) title.textContent = 'История просмотров | KitsuneWatch';
            if (metaDescription) metaDescription.content = 'История просмотров аниме на KitsuneWatch. Продолжайте смотреть с того места, где остановились.';
            if (ogTitle) ogTitle.content = 'История просмотров | KitsuneWatch';
            if (ogType) ogType.content = 'website';
            this.updateCanonicalLink(window.location.origin + '/?history=true');
            this.removeStructuredData('anime-structured-data');
            this.removeStructuredData('anime-breadcrumb-data');

        } else {
            if (title) title.textContent = baseTitle;
            if (metaDescription) metaDescription.content = baseDescription;
            if (metaKeywords) metaKeywords.content = baseKeywords;
            if (ogTitle) ogTitle.content = baseTitle;
            if (ogDescription) ogDescription.content = baseDescription;
            if (ogUrl) ogUrl.content = window.location.origin;
            if (ogType) ogType.content = 'website';
            if (ogImage && defaultOgImage) ogImage.content = defaultOgImage;
            if (twitterTitle) twitterTitle.content = baseTitle;
            if (twitterDescription) twitterDescription.content = baseDescription;
            this.updateCanonicalLink(window.location.origin);
            this.removeStructuredData('anime-structured-data');
            this.removeStructuredData('anime-breadcrumb-data');
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

    // ============ СТРУКТУРИРОВАННЫЕ ДАННЫЕ (JSON-LD) ============
    injectStructuredData(id, obj) {
        this.removeStructuredData(id);
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        script.textContent = JSON.stringify(obj);
        document.head.appendChild(script);
    }

    removeStructuredData(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Собирает Schema.org разметку (Movie/TVSeries + BreadcrumbList) под
    // конкретное аниме — помогает поисковикам показывать расширенные сниппеты
    // (рейтинг, жанр, постер) в выдаче по названию тайтула.
    updateAnimeStructuredData(material) {
        const md = material.material_data || {};
        const isSeries = /serial/.test(material.type || '');
        const image = md.poster_url || undefined;
        const genres = Array.isArray(md.genres) ? md.genres : undefined;
        const rating = parseFloat(md.shikimori_rating || md.kinopoisk_rating || md.imdb_rating);

        const schema = {
            '@context': 'https://schema.org',
            '@type': isSeries ? 'TVSeries' : 'Movie',
            name: material.title,
            alternateName: material.title_orig || undefined,
            description: md.description ? md.description.slice(0, 500) : undefined,
            genre: genres,
            image,
            url: window.location.href,
            inLanguage: 'ru',
            datePublished: (material.year || md.year) ? String(material.year || md.year) : undefined,
            countryOfOrigin: md.countries?.[0] || undefined,
            aggregateRating: (!isNaN(rating) && rating > 0) ? {
                '@type': 'AggregateRating',
                ratingValue: rating,
                bestRating: 10,
                worstRating: 1,
                ratingCount: 1
            } : undefined,
            potentialAction: {
                '@type': 'WatchAction',
                target: window.location.href
            }
        };

        // Убираем пустые поля, чтобы не отдавать "undefined" в JSON-LD
        Object.keys(schema).forEach(key => schema[key] === undefined && delete schema[key]);

        const breadcrumb = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: window.location.origin },
                { '@type': 'ListItem', position: 2, name: material.title, item: window.location.href }
            ]
        };

        this.injectStructuredData('anime-structured-data', schema);
        this.injectStructuredData('anime-breadcrumb-data', breadcrumb);
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
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('SW зарегистрирован');

            // ============ ОБНОВЛЕНИЕ PWA ============
            // Новый SW мог докачаться ещё до открытия этой вкладки (в
            // фоне между визитами) и уже сидеть в состоянии "waiting" —
            // предлагаем обновиться сразу же.
            if (registration.waiting) this.showUpdateAvailable(registration);

            // Новая версия появилась прямо во время текущей сессии —
            // ждём, пока она полностью скачается (state 'installed'), и
            // раз на странице уже есть активный контроллер — значит, это
            // не первая установка, а именно обновление
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateAvailable(registration);
                    }
                });
            });

            // Вкладка может быть открыта часами/сутками — браузер сам
            // проверяет обновления SW только при навигации, поэтому
            // подстраховываемся периодической ручной проверкой
            setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);

            // Как только новый SW реально активируется (после нашего
            // SKIP_WAITING), перезагружаем страницу — иначе вкладка
            // продолжит работать со старым JS в памяти, а сеть уже будет
            // обслуживаться новым SW, что может привести к рассинхрону
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });
        } catch (e) {
            console.error('SW ошибка:', e);
        }
    }

    // Ненавязчивый тост "Доступна новая версия" — обновление происходит
    // только по явному клику пользователя, а не рывком посреди просмотра
    showUpdateAvailable(registration) {
        if (this.updateToast) return; // уже показан
        const worker = registration.waiting;
        if (!worker) return;

        this.updateToast = document.createElement('div');
        this.updateToast.className = 'pwa-update-toast';
        this.updateToast.innerHTML = `
            <i class="bi bi-arrow-repeat"></i>
            <span>Доступна новая версия сайта</span>
            <button type="button" class="pwa-update-button">Обновить</button>
            <button type="button" class="pwa-update-dismiss" title="Закрыть" aria-label="Закрыть">
                <i class="bi bi-x"></i>
            </button>
        `;
        document.body.appendChild(this.updateToast);
        requestAnimationFrame(() => this.updateToast?.classList.add('visible'));

        const updateBtn = this.updateToast.querySelector('.pwa-update-button');
        updateBtn.addEventListener('click', () => {
            updateBtn.disabled = true;
            updateBtn.textContent = 'Обновляем…';
            worker.postMessage({ type: 'SKIP_WAITING' });
        });

        this.updateToast.querySelector('.pwa-update-dismiss').addEventListener('click', () => {
            this.updateToast?.classList.remove('visible');
            setTimeout(() => {
                this.updateToast?.remove();
                this.updateToast = null;
            }, 250);
        });
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

        this.calendarContainer = document.createElement('div');
        this.calendarContainer.className = 'calendar-container';
        this.calendarContainer.style.display = 'block';
        this.calendarContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.calendar-day-tab');
            if (tab?.dataset.date) {
                this.selectCalendarDate(tab.dataset.date);
                return;
            }
            const item = e.target.closest('.calendar-item');
            if (item?.dataset.animeTitle) {
                this.searchFromCalendar(item.dataset.animeTitle);
            }
        });
        this.setupCalendarTabsScroll();

        this.collectionsContainer = document.createElement('div');
        this.collectionsContainer.className = 'collections-container';
        this.collectionsContainer.style.display = 'block';

        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.style.display = 'none';
        this.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Поиск</div>
                <button class="loading-cancel-button" title="Отменить поиск">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        // Добавляем обработчик для отмены поиска
        this.loadingOverlay.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.loading-cancel-button');
            if (cancelButton && this.isSearching) {
                this.cancelCurrentSearch();
            }
        });

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
        mainBlock.appendChild(this.cacheStatusBadgeWrapper || (this.cacheStatusBadgeWrapper = document.createElement('div')));
        this.cacheStatusBadgeWrapper.className = 'cache-status-badge-wrapper';
        mainBlock.appendChild(this.aboutProjectContainer);
        mainBlock.appendChild(this.premieresContainer);
        mainBlock.appendChild(this.calendarContainer);
        mainBlock.appendChild(this.collectionsContainer);
        // Прелоадер добавляем в body для покрытия всего приложения
        document.body.appendChild(this.loadingOverlay);
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

        // Добавляем кнопку рандомайзера
        this.addRandomButton();

        this.createShareFallbackModal();
    }

    // ============ МОДАЛКА "ПОДЕЛИТЬСЯ ССЫЛКОЙ" ============
    // Показывается вместо нативного alert(), когда navigator.share
    // недоступен и navigator.clipboard.writeText не сработал (например,
    // нет разрешения или страница открыта не по https).
    createShareFallbackModal() {
        this.shareModalOverlay = document.createElement('div');
        this.shareModalOverlay.className = 'share-modal-overlay';
        this.shareModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.shareModalOverlay) this.hideShareFallbackModal();
        });

        const modal = document.createElement('div');
        modal.className = 'share-modal';

        const icon = document.createElement('div');
        icon.className = 'share-modal-icon';
        icon.innerHTML = '<i class="bi bi-share-fill"></i>';

        const title = document.createElement('h3');
        title.className = 'share-modal-title';
        title.textContent = 'Поделиться тайтлом';

        const subtitle = document.createElement('p');
        subtitle.className = 'share-modal-subtitle';
        subtitle.textContent = 'Скопируйте ссылку и отправьте друзьям';

        const headingText = document.createElement('div');
        headingText.className = 'share-modal-heading-text';
        headingText.appendChild(title);
        headingText.appendChild(subtitle);

        const heading = document.createElement('div');
        heading.className = 'share-modal-heading';
        heading.appendChild(icon);
        heading.appendChild(headingText);

        // SVG вместо иконки шрифта — гарантирует идеальное центрирование
        // крестика внутри кнопки независимо от метрик используемого фонта.
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'share-modal-close';
        closeBtn.innerHTML = `<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>`;
        closeBtn.setAttribute('aria-label', 'Закрыть');
        closeBtn.addEventListener('click', () => this.hideShareFallbackModal());

        const header = document.createElement('div');
        header.className = 'share-modal-header';
        header.appendChild(heading);
        header.appendChild(closeBtn);

        const row = document.createElement('div');
        row.className = 'share-modal-row';

        const inputWrap = document.createElement('div');
        inputWrap.className = 'share-modal-input-wrap';

        const inputIcon = document.createElement('i');
        inputIcon.className = 'bi bi-link-45deg';

        this.shareModalInput = document.createElement('input');
        this.shareModalInput.type = 'text';
        this.shareModalInput.className = 'share-modal-input';
        this.shareModalInput.readOnly = true;
        this.shareModalInput.addEventListener('click', () => this.shareModalInput.select());

        inputWrap.appendChild(inputIcon);
        inputWrap.appendChild(this.shareModalInput);

        this.shareModalCopyBtn = document.createElement('button');
        this.shareModalCopyBtn.type = 'button';
        this.shareModalCopyBtn.className = 'share-modal-copy-button';
        this.shareModalCopyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Копировать';
        this.shareModalCopyBtn.addEventListener('click', () => this.copyShareModalLink());

        row.appendChild(inputWrap);
        row.appendChild(this.shareModalCopyBtn);

        const hint = document.createElement('p');
        hint.className = 'share-modal-hint';
        hint.innerHTML = '<i class="bi bi-info-circle"></i> Нажмите «Копировать», чтобы скопировать ссылку в буфер обмена';

        modal.appendChild(header);
        modal.appendChild(row);
        modal.appendChild(hint);
        this.shareModalOverlay.appendChild(modal);
        document.body.appendChild(this.shareModalOverlay);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.shareModalOverlay.classList.contains('active')) {
                this.hideShareFallbackModal();
            }
        });
    }

    showShareFallbackModal(url) {
        if (!this.shareModalOverlay) return;
        this.shareModalInput.value = url;
        this.resetShareModalCopyButton();
        this.shareModalOverlay.classList.add('active');
        setTimeout(() => {
            this.shareModalInput.focus();
            this.shareModalInput.select();
        }, 50);
    }

    hideShareFallbackModal() {
        if (this.shareModalOverlay) this.shareModalOverlay.classList.remove('active');
    }

    resetShareModalCopyButton() {
        if (!this.shareModalCopyBtn) return;
        this.shareModalCopyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Копировать';
        this.shareModalCopyBtn.classList.remove('copied');
    }

    async copyShareModalLink() {
        const url = this.shareModalInput.value;
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
            } else {
                this.shareModalInput.select();
                document.execCommand('copy');
            }
            this.shareModalCopyBtn.innerHTML = '<i class="bi bi-check-lg"></i> Скопировано!';
            this.shareModalCopyBtn.classList.add('copied');
            clearTimeout(this._shareModalCopyResetTimer);
            this._shareModalCopyResetTimer = setTimeout(() => this.resetShareModalCopyButton(), 2000);

            // Система достижений (achievements/) слушает это событие сама.
            document.dispatchEvent(new CustomEvent('kw:share', { detail: { url } }));
        } catch (error) {
            this.shareModalInput.select();
        }
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

        // Добавляем кнопку топ 100
        const topButton = document.createElement('button');
        topButton.className = 'top-100-button';
        topButton.innerHTML = '<i class="bi bi-trophy"></i> Топ 100';
        topButton.title = 'Топ 100 аниме';
        topButton.addEventListener('click', () => this.loadTop100());

        searchContainer.appendChild(topButton);

        // Кнопка принудительного обновления данных (обход клиентского кэша)
        const refreshButton = document.createElement('button');
        refreshButton.id = 'refreshDataButton';
        refreshButton.className = 'refresh-data-button';
        refreshButton.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
        refreshButton.title = 'Обновить данные (обойти кэш)';
        refreshButton.addEventListener('click', () => this.refreshCurrentView());

        searchContainer.appendChild(refreshButton);
        this.refreshButton = refreshButton;

        // Индикатор состояния кэша ("данные из кэша" / "обновлено")
        if (this.cacheStatusBadgeWrapper) {
            const badge = document.createElement('span');
            badge.className = 'cache-status-badge';
            this.cacheStatusBadgeWrapper.appendChild(badge);
            this.cacheStatusBadge = badge;
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
        this.searchButton.addEventListener('click', () => this.performSearch());

        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        this.searchInput.addEventListener('input', () => {
            if (!this.searchInput.value.trim()) {
                this.viewMode = 'home';
                this.clearAllResults();
                this.displayAboutProject();
                this.loadYearPremieres();
                this.loadCalendar();
                this.displayCollections();
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

    // Экранирование под HTML-атрибут (в отличие от sanitizeInput, которое
    // безопасно только для текстовых узлов) — нужно там, где значение
    // подставляется в data-* атрибут внутри строкового шаблона innerHTML
    escapeHtmlAttr(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ============ FETCH ============
    async fetchWithTimeout(url, timeout = 15000, signal = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Если передан внешний сигнал, отменяем запрос при его срабатывании
        if (signal) {
            signal.addEventListener('abort', () => controller.abort());
        }

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

    // Отмена текущей загрузки (поиск или топ 100 — оба используют один
    // контроллер, т.к. на экране одновременно может грузиться только
    // что-то одно). Помечаем отмену как "от пользователя" ДО abort(),
    // чтобы catch-блок ниже не спутал её с реальным сетевым таймаутом.
    cancelCurrentSearch() {
        if (this.currentSearchController) {
            this._cancelledByUser = true;
            this.currentSearchController.abort();
            this.currentSearchController = null;
        }
        this.hideLoading();
    }

    // ============ ЗАГРУЗКА ============
    showLoading(text = 'Поиск') {
        this.isSearching = true;
        this.searchButton.disabled = true;
        this.searchButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Поиск...';

        if (this.loadingOverlay) {
            // Обновляем текст загрузки
            const loadingText = this.loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = text;

            // Отменяем отложенное скрытие, если пользователь успел кликнуть
            // "обновить" ещё раз, пока прошлый оверлей плавно исчезал
            clearTimeout(this._hideLoadingTimeout);

            this.loadingOverlay.style.display = 'flex';
            // Форсируем синхронный reflow (чтение layout-свойства), чтобы
            // браузер зафиксировал display:flex/opacity:0 ДО добавления
            // класса .active — иначе переход может "схлопнуться" и оверлей
            // появится мгновенно вместо плавного фейда.
            //
            // Раньше здесь был requestAnimationFrame(...) — но это
            // АСИНХРОННО (следующий кадр отрисовки), и если ответ приходит
            // из локального кэша практически мгновенно (например, повторный
            // клик по "Топ 100", когда данные уже закэшированы), весь цикл
            // showLoading -> await -> hideLoading успевал завершиться
            // раньше, чем срабатывал RAF. В итоге hideLoading() убирал
            // класс .active, а через мгновение RAF-колбэк добавлял его
            // ОБРАТНО — оверлей залипал навсегда ("бесконечный прелоадер").
            // Синхронный reflow решает ту же задачу без этого разрыва.
            void this.loadingOverlay.offsetWidth;
            this.loadingOverlay.classList.add('active');

            // Исправление для мобильных браузеров
            this.loadingOverlay.style.height = '100vh';
            this.loadingOverlay.style.height = '100dvh';
        }

        this.resultsContainer.style.display = 'none';
        this.tabsContainer.style.display = 'none';
        this.videoListContainer.style.display = 'none';
        this.paginationContainer.style.display = 'none';
        this.hideAboutProject();
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        if (this.calendarContainer) this.calendarContainer.style.display = 'none';
        if (this.collectionsContainer) this.collectionsContainer.style.display = 'none';
        if (this.videoContainer) this.videoContainer.style.display = 'none';
        
        // Предотвращаем скролл страницы во время загрузки
        document.body.style.overflow = 'hidden';
        // Для iOS Safari
        document.documentElement.style.overflow = 'hidden';
        
        // Фиксация высоты для мобильных
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    hideLoading() {
        this.isSearching = false;
        this.searchButton.disabled = false;
        this.searchButton.innerHTML = '<i class="bi bi-search"></i> Искать';

        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('active');
            // Ждём завершения CSS-перехода (180ms в index.css) перед тем,
            // как убрать оверлей из потока — иначе плавное исчезновение
            // обрывается на полпути. Небольшой запас (220ms) подстраховывает
            // от рассинхрона с транзишном на медленных устройствах.
            clearTimeout(this._hideLoadingTimeout);
            this._hideLoadingTimeout = setTimeout(() => {
                if (this.loadingOverlay && !this.loadingOverlay.classList.contains('active')) {
                    this.loadingOverlay.style.display = 'none';
                }
            }, 220);
        }
        
        // Восстанавливаем скролл страницы
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
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

    // ============ КЭШ API-ДАННЫХ ============
    getCacheEntry(key) {
        try {
            const raw = localStorage.getItem(this.CACHE_PREFIX + key);
            if (!raw) return null;
            const entry = JSON.parse(raw);
            if (!entry || typeof entry.timestamp !== 'number') return null;
            return entry;
        } catch (e) { return null; }
    }

    setCacheEntry(key, data) {
        try {
            localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
            // localStorage переполнен или недоступен — работаем без кэша
        }
    }

    isCacheFresh(entry, ttl) {
        return !!entry && (Date.now() - entry.timestamp) < ttl;
    }

    clearCacheEntry(key) {
        try { localStorage.removeItem(this.CACHE_PREFIX + key); } catch (e) { }
    }

    clearAllApiCache() {
        try {
            Object.keys(localStorage)
                .filter(k => k.startsWith(this.CACHE_PREFIX))
                .forEach(k => localStorage.removeItem(k));
        } catch (e) { }
    }

    // Запрашивает JSON с TTL-кэшем в localStorage. При forceRefresh кэш
    // игнорируется и данные забираются заново с сервера. Если сеть недоступна,
    // но в кэше есть хоть устаревшие данные — отдаём их, чтобы не показывать
    // пустой экран (аналогично офлайн-фолбэку в sw.js).
    async fetchJSONCached(url, cacheKey, ttl, options = {}) {
        const { forceRefresh = false, timeout = 15000, signal = null } = options;
        const entry = this.getCacheEntry(cacheKey);

        if (!forceRefresh && this.isCacheFresh(entry, ttl)) {
            return { data: entry.data, fromCache: true, stale: false, cachedAt: entry.timestamp };
        }

        try {
            const data = await this.fetchWithTimeout(url, timeout, signal);
            this.setCacheEntry(cacheKey, data);
            return { data, fromCache: false, stale: false, cachedAt: Date.now() };
        } catch (error) {
            if (entry) {
                return { data: entry.data, fromCache: true, stale: true, cachedAt: entry.timestamp };
            }
            throw error;
        }
    }

    // ============ КНОПКА "ОБНОВИТЬ" И ИНДИКАТОР КЭША ============
    // failed=true — отдельный случай, когда обновить не удалось и даже
    // старых данных в кэше не нашлось (например, самый первый заход
    // офлайн). Раньше такой исход никак не отображался пользователю.
    showCacheStatus(fromCache, stale, cachedAt, failed = false) {
        if (!this.cacheStatusBadge) return;

        if (failed) {
            this.cacheStatusBadge.className = 'cache-status-badge visible error';
            this.cacheStatusBadge.innerHTML = '<i class="bi bi-x-circle"></i> Не удалось обновить — нет сети';
        } else if (!fromCache && !stale) {
            this.cacheStatusBadge.className = 'cache-status-badge visible';
            this.cacheStatusBadge.innerHTML = '<i class="bi bi-check-circle"></i> Данные обновлены';
        } else if (stale) {
            this.cacheStatusBadge.className = 'cache-status-badge visible stale';
            this.cacheStatusBadge.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Нет сети — показаны сохранённые данные';
        } else {
            this.cacheStatusBadge.className = 'cache-status-badge visible';
            this.cacheStatusBadge.innerHTML = `<i class="bi bi-clock-history"></i> Из кэша (${this.formatTime(cachedAt)})`;
        }

        clearTimeout(this._cacheStatusTimeout);
        this._cacheStatusTimeout = setTimeout(() => {
            if (this.cacheStatusBadge) this.cacheStatusBadge.classList.remove('visible');
        }, 4000);
    }

    // Кратко подсвечивает саму кнопку "Обновить" (галочка/крестик вместо
    // стрелки) — прямой отклик там, где пользователь только что кликнул,
    // а не только в бейдже в углу, который легко не заметить.
    flashRefreshButton(state = 'success') {
        if (!this.refreshButton) return;
        const icon = this.refreshButton.querySelector('.bi');
        if (!icon) return;

        const ORIGINAL_ICON = 'bi-arrow-clockwise';
        const stateMap = {
            success: { icon: 'bi-check2', cls: 'refresh-flash-success' },
            stale: { icon: 'bi-wifi-off', cls: 'refresh-flash-stale' },
            error: { icon: 'bi-x-lg', cls: 'refresh-flash-error' }
        };
        const { icon: iconClass, cls: stateClass } = stateMap[state] || stateMap.success;

        icon.classList.remove(ORIGINAL_ICON);
        icon.classList.add(iconClass);
        this.refreshButton.classList.add(stateClass);

        clearTimeout(this._refreshFlashTimeout);
        this._refreshFlashTimeout = setTimeout(() => {
            icon.classList.remove(iconClass);
            icon.classList.add(ORIGINAL_ICON);
            this.refreshButton.classList.remove(stateClass);
        }, 1400);
    }

    // Сводит воедино результаты обновления премьер года и календаря на
    // главном экране и показывает пользователю понятный итог (бейдж +
    // вспышка на самой кнопке). До этого фикса при нажатии "Обновить" на
    // главной обе загрузки сами ловили свои ошибки молча, а кнопка просто
    // переставала крутиться — выглядело так, будто клик вообще ни на что
    // не повлиял.
    reportRefreshResult(results) {
        const succeeded = results.filter(r => r && r.ok);

        if (succeeded.length === 0) {
            this.showCacheStatus(false, false, 0, true);
            this.flashRefreshButton('error');
            return;
        }

        const anyStale = succeeded.some(r => r.stale);
        const latestCachedAt = succeeded.reduce((max, r) => Math.max(max, r.cachedAt || 0), 0);

        this.showCacheStatus(anyStale, anyStale, latestCachedAt || Date.now());
        this.flashRefreshButton(anyStale ? 'stale' : 'success');
    }

    // Обновляет данные того, что сейчас показано на экране, принудительно
    // обходя клиентский кэш (серверный edge-кэш /api/* при этом всё ещё
    // может отдать закэшированный ответ в пределах своего s-maxage).
    async refreshCurrentView() {
        if (!this.refreshButton || this.refreshButton.disabled) return;

        this.refreshButton.disabled = true;
        this.refreshButton.classList.add('spinning');

        try {
            if (this.viewMode === 'top100') {
                await this.loadTop100(true);
                this.flashRefreshButton('success');
            } else if (this.viewMode === 'search' && this.currentSearchQuery) {
                await this.performSearch(true);
                this.flashRefreshButton('success');
            } else {
                this.clearCacheEntry('years');
                this.clearCacheEntry('calendar');
                const results = await Promise.all([this.loadYearPremieres(true), this.loadCalendar(true)]);
                this.reportRefreshResult(results);
            }
        } finally {
            this.refreshButton.disabled = false;
            this.refreshButton.classList.remove('spinning');
        }
    }

    // ============ ИСТОРИЯ ============
    addToHistory(query) {
        const clean = query.trim();
        if (!clean) return;

        const existing = this.searchHistory.find(i => i.query.toLowerCase() === clean.toLowerCase());
        const previousType = existing ? existing.type : undefined;

        this.searchHistory = this.searchHistory.filter(i => i.query.toLowerCase() !== clean.toLowerCase());
        this.searchHistory.unshift({ query: clean, timestamp: Date.now(), type: previousType });
        this.searchHistory = this.searchHistory.slice(0, 30);

        this.saveToStorage('kitsunewatch_history', this.searchHistory);
        this.displayHistory();

        // Система достижений (achievements/) слушает это событие сама.
        document.dispatchEvent(new CustomEvent('kw:search', { detail: { query: clean } }));
    }

    // Дописывает категорию (тип контента) к уже сохранённой записи истории,
    // когда становится известен результат поиска — так историю можно
    // фильтровать по категориям, как и избранное.
    updateHistoryType(query, type) {
        if (!type) return;
        const clean = query.trim().toLowerCase();
        const item = this.searchHistory.find(i => i.query.toLowerCase() === clean);
        if (item && item.type !== type) {
            item.type = type;
            this.saveToStorage('kitsunewatch_history', this.searchHistory);
        }
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
            this.historyFilterQuery = '';
            this.historyFilterType = 'all';
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

        // Поиск по истории — фильтрует список без перерисовки поля ввода,
        // чтобы не терять фокус при вводе
        const filterBar = this.createFilterBar({
            placeholder: 'Поиск по истории...',
            value: this.historyFilterQuery,
            onInput: (value) => {
                this.historyFilterQuery = value;
                this.renderHistoryList();
            }
        });
        this.historyContainer.appendChild(filterBar);

        // Категории — доступны, если хотя бы у части записей известен тип
        // (проставляется после успешного поиска, см. updateHistoryType)
        const types = [...new Set(this.searchHistory.filter(i => i.type).map(i => i.type))];
        if (types.length > 0) {
            const chips = this.createCategoryChips(types, this.historyFilterType, (type) => {
                this.historyFilterType = type;
                this.renderHistoryList();
            });
            this.historyContainer.appendChild(chips);
        } else {
            this.historyFilterType = 'all';
        }

        this.historyListWrapper = document.createElement('div');
        this.historyListWrapper.className = 'history-list-wrapper';
        this.historyContainer.appendChild(this.historyListWrapper);

        this.renderHistoryList();
    }

    // Перерисовывает только список записей истории (группировка по дням) —
    // вызывается при вводе в поиск/переключении категории, без пересоздания
    // заголовка и поля ввода
    renderHistoryList() {
        if (!this.historyListWrapper) return;
        this.historyListWrapper.innerHTML = '';

        const q = this.historyFilterQuery.trim().toLowerCase();
        let items = this.searchHistory;

        if (this.historyFilterType !== 'all') {
            items = items.filter(i => i.type === this.historyFilterType);
        }
        if (q) {
            items = items.filter(i => i.query.toLowerCase().includes(q));
        }

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'inline-filter-empty';
            empty.textContent = 'Ничего не найдено';
            this.historyListWrapper.appendChild(empty);
            return;
        }

        // Группировка по дням
        const groupedHistory = this.groupHistoryByDate(items);

        Object.entries(groupedHistory).forEach(([date, dateItems]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'history-date-group';

            const dateTitle = document.createElement('div');
            dateTitle.className = 'history-date-title';
            dateTitle.textContent = date;
            dateGroup.appendChild(dateTitle);

            const list = document.createElement('div');
            list.className = 'history-list';

            dateItems.forEach(item => {
                const div = document.createElement('div');
                div.className = 'history-item';

                if (item.type) {
                    const badge = document.createElement('i');
                    badge.className = `bi ${this.getTypeIcon(item.type)} history-item-type`;
                    badge.title = this.getTypeName(item.type);
                    div.appendChild(badge);
                }

                const span = document.createElement('span');
                span.className = 'history-query';
                span.textContent = item.query;
                span.addEventListener('click', () => {
                    // Предотвращаем повторные клики пока идет поиск
                    if (this.isSearching) return;
                    
                    let query = item.query;
                    try {
                        query = decodeURIComponent(query);
                        if (query.includes('%25')) {
                            query = decodeURIComponent(query);
                        }
                    } catch (e) { }
                    
                    this.searchInput.value = query;
                    this.currentSearchQuery = query;
                    this.performSearch();
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
            this.historyListWrapper.appendChild(dateGroup);
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

            if (!groups[groupName]) {
                groups[groupName] = [];
            }
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

            // Система достижений (achievements/) слушает это событие сама —
            // никаких прямых зависимостей от неё здесь нет.
            document.dispatchEvent(new CustomEvent('kw:favorite-added', {
                detail: { id: videoId, title: this.currentVideo.title, type: this.currentVideo.type }
            }));
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
            this.favoritesFilterQuery = '';
            this.favoritesFilterType = 'all';
            return;
        }

        this.favoritesContainer.style.display = 'block';

        const title = document.createElement('h3');
        title.className = 'favorites-title';
        title.innerHTML = '<i class="bi bi-heart-fill"></i> Избранное';
        this.favoritesContainer.appendChild(title);

        // Поиск по избранному
        const filterBar = this.createFilterBar({
            placeholder: 'Поиск по избранному...',
            value: this.favoritesFilterQuery,
            onInput: (value) => {
                this.favoritesFilterQuery = value;
                this.renderFavoritesList();
            }
        });
        this.favoritesContainer.appendChild(filterBar);

        // Категории — показываем чипы, только если есть больше одного типа
        const types = [...new Set(this.favorites.map(f => f.type || 'other'))];
        if (types.length > 1) {
            const chips = this.createCategoryChips(types, this.favoritesFilterType, (type) => {
                this.favoritesFilterType = type;
                this.renderFavoritesList();
            });
            this.favoritesContainer.appendChild(chips);
        } else {
            this.favoritesFilterType = 'all';
        }

        this.favoritesListWrapper = document.createElement('div');
        this.favoritesListWrapper.className = 'favorites-list-wrapper';
        this.favoritesContainer.appendChild(this.favoritesListWrapper);

        this.renderFavoritesList();
    }

    // Перерисовывает только список избранного (группировка по категориям) —
    // вызывается при вводе в поиск/переключении категории
    renderFavoritesList() {
        if (!this.favoritesListWrapper) return;
        this.favoritesListWrapper.innerHTML = '';

        const q = this.favoritesFilterQuery.trim().toLowerCase();
        let items = this.favorites;

        if (this.favoritesFilterType !== 'all') {
            items = items.filter(f => (f.type || 'other') === this.favoritesFilterType);
        }
        if (q) {
            items = items.filter(f => (f.title || '').toLowerCase().includes(q));
        }

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'inline-filter-empty';
            empty.textContent = 'Ничего не найдено';
            this.favoritesListWrapper.appendChild(empty);
            return;
        }

        // Группировка по категориям
        const categories = this.groupFavoritesByType(items);

        Object.entries(categories).forEach(([type, catItems]) => {
            const categoryBlock = document.createElement('div');
            categoryBlock.className = 'favorites-category';

            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'favorites-category-title';
            categoryTitle.innerHTML = `
                <i class="bi ${this.getTypeIcon(type)}"></i>
                ${this.getTypeName(type)}
                <span class="favorites-count">${catItems.length}</span>
            `;
            categoryBlock.appendChild(categoryTitle);

            const list = document.createElement('div');
            list.className = 'favorites-list';

            catItems.forEach(fav => {
                const card = document.createElement('div');
                card.className = 'favorite-card';

                const t = document.createElement('span');
                t.className = 'favorite-card-title';
                t.textContent = `${fav.title} (${fav.year || '?'})`;

                const typeInfo = document.createElement('span');
                typeInfo.className = 'favorite-card-info';
                typeInfo.textContent = this.getTypeName(fav.type);

                const play = document.createElement('button');
                play.className = 'favorite-play-button';
                play.innerHTML = '<i class="bi bi-play-fill"></i>';
                play.addEventListener('click', () => this.playFavorite(fav));

                const remove = document.createElement('button');
                remove.className = 'favorite-remove-button';
                remove.innerHTML = '<i class="bi bi-x"></i>';
                remove.addEventListener('click', () => this.removeFromFavorites(fav.id));

                card.appendChild(t);
                card.appendChild(typeInfo);
                card.appendChild(play);
                card.appendChild(remove);
                list.appendChild(card);
            });

            categoryBlock.appendChild(list);
            this.favoritesListWrapper.appendChild(categoryBlock);
        });
    }

    // ============ ПОИСК И КАТЕГОРИИ ВНУТРИ ИСТОРИИ/ИЗБРАННОГО ============
    createFilterBar({ placeholder, value, onInput }) {
        const wrapper = document.createElement('div');
        wrapper.className = 'inline-filter-bar';

        const icon = document.createElement('i');
        icon.className = 'bi bi-search inline-filter-icon';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-filter-input';
        input.placeholder = placeholder;
        input.value = value || '';
        input.addEventListener('input', () => onInput(input.value));

        wrapper.appendChild(icon);
        wrapper.appendChild(input);

        if (value) {
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.className = 'inline-filter-clear';
            clear.innerHTML = '<i class="bi bi-x"></i>';
            clear.addEventListener('click', () => {
                input.value = '';
                onInput('');
                clear.remove();
            });
            wrapper.appendChild(clear);
        }

        return wrapper;
    }

    createCategoryChips(types, activeType, onSelect) {
        const wrapper = document.createElement('div');
        wrapper.className = 'inline-category-chips';

        // При клике меняем active-класс у чипов вручную, т.к. onSelect
        // перерисовывает только список записей (renderHistoryList/
        // renderFavoritesList), а не сам блок чипов — иначе выделение
        // активной вкладки никогда не обновлялось бы.
        const setActive = (target) => {
            wrapper.querySelectorAll('.category-chip').forEach(chip => {
                chip.classList.toggle('active', chip === target);
            });
        };

        const allChip = document.createElement('button');
        allChip.type = 'button';
        allChip.dataset.type = 'all';
        allChip.className = 'category-chip' + (activeType === 'all' ? ' active' : '');
        allChip.textContent = 'Все';
        allChip.addEventListener('click', () => {
            setActive(allChip);
            onSelect('all');
        });
        wrapper.appendChild(allChip);

        types.forEach(type => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.dataset.type = type;
            chip.className = 'category-chip' + (activeType === type ? ' active' : '');
            chip.innerHTML = `<i class="bi ${this.getTypeIcon(type)}"></i> ${this.getTypeName(type)}`;
            chip.addEventListener('click', () => {
                setActive(chip);
                onSelect(type);
            });
            wrapper.appendChild(chip);
        });

        return wrapper;
    }

    groupFavoritesByType(favorites) {
        const groups = {};

        favorites.forEach(fav => {
            const type = fav.type || 'other';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(fav);
        });

        return groups;
    }

    getTypeIcon(type) {
        const icons = {
            'anime': 'bi-stars',
            'anime-serial': 'bi-collection-play',
            'foreign-movie': 'bi-film',
            'foreign-serial': 'bi-tv',
            'cartoon-serial': 'bi-easel',
            'russian-movie': 'bi-camera-reels',
            'russian-serial': 'bi-broadcast',
            'documentary-serial': 'bi-journal-text',
            'multi-part-film': 'bi-layers',
            'other': 'bi-question-circle'
        };
        return icons[type] || icons['other'];
    }

    playFavorite(favorite) {
        this.loadVideo(favorite);
        this.scrollToVideoPlayer();
    }

    // ============ ПРОКРУТКА К ПЛЕЕРУ ============
    scrollToVideoPlayer() {
        setTimeout(() => {
            const videoContainer = document.querySelector('.video-container');
            const appContainer = document.querySelector('.app');

            if (!videoContainer || !appContainer) return;

            // Проверяем, может ли .app прокручиваться
            const appHasScroll = appContainer.scrollHeight > appContainer.clientHeight;

            if (appHasScroll) {
                // Если .app имеет внутреннюю прокрутку, прокручиваем внутри него
                const appRect = appContainer.getBoundingClientRect();
                const videoRect = videoContainer.getBoundingClientRect();

                // Вычисляем позицию видео относительно .app
                const relativePosition = videoRect.top - appRect.top;

                // Целевая позиция скролла
                const targetScroll = appContainer.scrollTop + relativePosition - 20;

                // Плавная прокрутка внутри .app
                appContainer.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
            } else {
                // Если .app не имеет внутренней прокрутки, используем window
                const videoRect = videoContainer.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetPosition = videoRect.top + scrollTop - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }

    // ============ ВИДЕО ============
    loadVideo(material) {
        this.currentVideo = material;
        this.isVideoLoading = true;
        this.hideAboutProject();

        // Система достижений (achievements/) слушает это событие сама.
        document.dispatchEvent(new CustomEvent('kw:video-open', {
            detail: { id: material.id || material.link, title: material.title, type: material.type }
        }));
        if (this.premieresContainer) this.premieresContainer.style.display = 'none';
        if (this.calendarContainer) this.calendarContainer.style.display = 'none';
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
            const newUrl = this.buildSearchUrl(material.title);
            this.updateUrlWithoutReload(newUrl);
            this.updateSEO(material);
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
            const firstPageButton = this.createPageButton(1);
            this.paginationContainer.appendChild(firstPageButton);

            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                this.paginationContainer.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = this.createPageButton(i);
            this.paginationContainer.appendChild(pageButton);
        }

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
        if (this.activeFilter === 'all') {
            this.createPagination(this.currentResults.length);
        } else {
            this.createPagination(this.filteredResults.length);
        }

        // Прокрутка к началу списка
        if (this.videoListContainer) {
            const appContainer = document.querySelector('.app');

            if (appContainer && appContainer.scrollHeight > appContainer.clientHeight) {
                // Прокручиваем внутри .app
                const appRect = appContainer.getBoundingClientRect();
                const listRect = this.videoListContainer.getBoundingClientRect();
                const relativePosition = listRect.top - appRect.top;
                const targetScroll = appContainer.scrollTop + relativePosition - 20;

                appContainer.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
            } else {
                // Прокручиваем окно
                this.videoListContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
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

    // ============ ГЕНЕРАЦИЯ ССЫЛОК ДЛЯ ШЕРИНГА ============
    // Собирает URL через URLSearchParams — он сам кодирует значения при
    // toString() по правилам application/x-www-form-urlencoded, где пробел
    // становится "+", а не "%20"/"%2520". Так ссылка выглядит опрятно и в
    // адресной строке, и в сниппетах поисковиков, вместо простыни из %XX.
    buildSearchUrl(query) {
        const params = new URLSearchParams();
        params.set('search', query.trim());
        return `${window.location.origin}/?${params.toString()}`;
    }

    generateShareUrl(material) {
        if (material && material.title) {
            return this.buildSearchUrl(material.title);
        }

        if (material && material.id) {
            const params = new URLSearchParams();
            params.set('video', material.id);
            return `${window.location.origin}/?${params.toString()}`;
        }

        if (this.currentSearchQuery) {
            return this.buildSearchUrl(this.currentSearchQuery);
        }

        return window.location.origin;
    }

    // ============ ОБНОВЛЕНИЕ URL БЕЗ ПЕРЕЗАГРУЗКИ ============
    updateUrlWithoutReload(url) {
        if (window.history && window.history.pushState) {
            window.history.pushState({}, '', url);
        }
    }

    // ============ ПОИСК ============
    async performSearch(forceRefresh = false) {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Введите название аниме');
            return;
        }
        
        // Отменяем предыдущий поиск, если он еще выполняется
        if (this.currentSearchController) {
            this.currentSearchController.abort();
        }
        
        // Предотвращаем запуск нескольких поисков одновременно
        if (this.isSearching) return;

        this.currentSearchQuery = query;
        this.currentPage = 1;
        this.activeFilter = 'all';
        this.viewMode = 'search';

        const newUrl = this.buildSearchUrl(query);
        this.updateUrlWithoutReload(newUrl);
        this.updateSEO();

        // Показываем прелоадер
        this.showLoading(`Ищем "${query}"`);
        this.addToHistory(query);

        const cacheKey = `search_${query.trim().toLowerCase()}`;
        
        // Создаем новый контроллер для этого поиска
        this.currentSearchController = new AbortController();
        this._cancelledByUser = false;

        try {
            const searchUrl = `${this.API_URL}?title=${encodeURIComponent(query)}&with_material_data=true&limit=100&sort=popular`;

            const { data, fromCache, stale, cachedAt } = await this.fetchJSONCached(
                searchUrl, cacheKey, this.CACHE_TTL.search, { 
                    forceRefresh, 
                    timeout: 15000,
                    signal: this.currentSearchController.signal
                }
            );

            if (data.results?.length > 0) {
                this.hasSearched = true;
                const grouped = this.groupResultsByTitle(data.results);
                this.currentResults = grouped;
                this.filteredResults = grouped;
                this.clearErrorMessages();
                this.displayAllResults(grouped);
                this.updateHistoryType(query, grouped[0]?.type);
                this.showCacheStatus(fromCache, stale, cachedAt);

                setTimeout(() => {
                    this.displayHistory();
                    this.displayFavorites();
                }, 300);
            } else {
                this.showError('Ничего не найдено');
            }
        } catch (error) {
            console.error('Search error:', error);

            if (error.name === 'AbortError' && this._cancelledByUser) {
                // Пользователь сам нажал "отменить" — это не ошибка, тост не нужен
            } else if (error.name === 'AbortError') {
                this.showError('Превышено время ожидания');
            } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.showError('Ошибка CORS. Попробуйте через VPN или прокси.');
            } else {
                this.showError('Ошибка при поиске');
            }
        } finally {
            // Очищаем ссылку на контроллер и скрываем загрузку
            this.currentSearchController = null;
            this._cancelledByUser = false;
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

        // Прокручиваем к плееру после отображения результатов
        setTimeout(() => {
            this.scrollToVideoPlayer();
        }, 300);
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

                // Прокрутка к плееру с задержкой
                setTimeout(() => {
                    this.scrollToVideoPlayer();
                }, 200);
            });

            this.videoListContainer.appendChild(card);
        });
    }

    filterResults(type) {
        this.activeFilter = type;
        this.currentPage = 1;

        this.tabsContainer.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        if (type === 'all') {
            this.filteredResults = this.currentResults;
        } else {
            this.filteredResults = this.currentResults.filter(r => r.type === type);
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
        // Убеждаемся, что прелоадер скрыт при показе ошибки
        this.hideLoading();
        
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
        const shareUrl = this.generateShareUrl(this.currentVideo);

        if (!shareUrl || shareUrl === '#' || shareUrl === window.location.origin + '/') {
            this.showError('Нет ссылки для копирования');
            return;
        }

        // Кастомная модалка вместо системного меню "Поделиться" —
        // navigator.share() сюда специально не подключаем.
        // Модалка всегда открывается в состоянии "Копировать": раньше тут
        // была попытка скопировать ссылку в буфer сразу при открытии, из-за
        // чего кнопка почти всегда сразу показывала "Скопировано!" ещё до
        // того, как пользователь на неё нажал — это и было баг-репортом.
        this.showShareFallbackModal(shareUrl);
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