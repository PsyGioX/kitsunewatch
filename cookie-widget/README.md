# Cookie-виджет KitsuneWatch

Полностью самостоятельный, переносимый в другие проекты модуль:
cookie-баннер + панель настроек + **активное сканирование страницы** на
известные скрипты метрик/рекламы — мировые (Google, Meta, TikTok и т.д.)
и российские (Яндекс.Метрика, Top.Mail.Ru, VK, Rambler Top100 и т.д.).
Не зависит от остального сайта и от Bootstrap/Bootstrap Icons — только
свои 4 файла.

## Структура

```text
cookie-widget/
├── README.md                    # этот файл
├── cookie-widget.css            # стили (адаптируются под тему хоста)
├── cookie-widget-detectors.js   # ДАННЫЕ: реестр известных сервисов метрик/рекламы
├── cookie-widget-core.js        # ядро: сканирование, хранение согласия, consent-gate
└── cookie-widget-ui.js          # баннер, панель настроек, плавающая кнопка
```

## Подключение на новом сайте

Скопируйте папку `cookie-widget/` целиком и подключите файлы **в этом
порядке** (порядок важен — детекторы нужны ядру, ядро нужно UI):

```html
<link rel="stylesheet" href="/cookie-widget/cookie-widget.css">
...
<script src="/cookie-widget/cookie-widget-detectors.js" defer></script>
<script src="/cookie-widget/cookie-widget-core.js" defer
        data-site-name="Мой сайт"
        data-policy-url="/privacy"
        data-position="bottom"
        data-locale="ru"></script>
<script src="/cookie-widget/cookie-widget-ui.js" defer></script>
```

Ничего дополнительно вызывать не нужно — баннер появится автоматически,
если пользователь ещё не сохранял выбор.

## Настройка под конкретный сайт

### Через data-атрибуты на `<script>` (см. пример выше)
- `data-site-name` — имя сайта в тексте баннера
- `data-policy-url` — ссылка на политику конфиденциальности (необязательно)
- `data-position` — `bottom` (по умолчанию) | `bottom-left` | `bottom-right`
- `data-locale` — `ru` (по умолчанию) | `en`
- `data-reopen-button="false"` — скрыть плавающую кнопку повторного
  открытия настроек

### Через `window.CookieWidgetConfig` (если нужна большая гибкость)
Определите **до** подключения `cookie-widget-core.js`:

```html
<script>
    window.CookieWidgetConfig = {
        siteName: 'Мой сайт',
        policyUrl: '/privacy',
        position: 'bottom-right',
        locale: 'ru',
        showReopenButton: true,
        optionalCategories: ['analytics', 'marketing'] // без 'functional', если не нужна
    };
</script>
```

## Адаптация под тему/стиль сайта

Виджет читает переменные темы хоста через `var(--accent, #7c3aed)` и
похожие — то есть **если на сайте уже есть** `--accent`, `--accent-rgb`,
`--bg-app-rgb`, `--radius-lg` и т.п. (как в KitsuneWatch, см.
`assets/styles/index.css`), виджет автоматически подхватывает акцентный
цвет, фон и скругления — включая смену темы на лету, без перезагрузки.

Если этих переменных на сайте нет — работают адекватные фолбэки, и
виджет выглядит хорошо "из коробки" на любом сайте.

Чтобы задать цвета вручную (например, под сайт без системы тем),
переопределите в своих стилях:

```css
:root {
    --cw-accent: #ff6b35;
    --cw-accent-rgb: 255, 107, 53;
    --cw-bg-rgb: 20, 20, 24;
}
```

## Как расширить список отслеживаемых сервисов

Откройте `cookie-widget-detectors.js` и добавьте объект в массив.
Код ядра трогать не нужно — сканер подхватит новый детектор автоматически:

```js
{
    id: 'my-service',
    name: 'My Analytics',
    company: 'My Company Inc.',
    region: 'world', // или 'ru'
    category: 'analytics', // 'analytics' | 'marketing' | 'functional'
    match: {
        src: [/my-analytics\.example\.com\/tag\.js/i],
        globals: ['myAnalytics']
    }
}
```

Сканирование срабатывает при загрузке страницы и повторно — через
`MutationObserver` — при появлении новых `<script>` (например, если
трекер подключается динамически другим виджетом или после SPA-перехода).
Это и есть "активное отслеживание": список найденных сервисов в панели
настроек обновляется вживую, без перезагрузки страницы.

## Реальная блокировка скриптов до согласия (необязательно)

По умолчанию виджет только **находит и показывает** уже работающие на
странице трекеры — этого достаточно для прозрачности. Если нужно
по-настоящему не давать трекеру запуститься до согласия пользователя,
подключайте его как "заглушку":

```html
<script type="text/plain" data-cookie-category="marketing"
        data-cookie-src="https://connect.facebook.net/en_US/fbevents.js"></script>
```

Браузер не исполняет `type="text/plain"` сам по себе — ядро виджета
заменяет такой тег на настоящий `<script>` только когда пользователь дал
согласие на указанную `data-cookie-category` (или сразу, если согласие
уже было сохранено ранее).

## Публичное API — `window.CookieWidget`

| Метод/поле | Описание |
|---|---|
| `.ready` | Promise, резолвится после первого скана страницы |
| `.getConsent()` | `{ necessary, analytics, marketing, functional, timestamp }` |
| `.setConsent(partial)` | сохранить согласие по переданным категориям |
| `.acceptAll()` | согласие на все опциональные категории |
| `.rejectOptional()` | согласие только на необходимые |
| `.hasChosen()` | пользователь уже сохранял выбор |
| `.getDetectedServices()` | текущий список найденных сервисов |
| `.onConsentChange(cb)` | подписка на изменение согласия |
| `.onDetectionChange(cb)` | подписка на изменение списка найденных сервисов |
| `.openSettings()` | открыть панель настроек программно |

Также при каждом изменении диспетчерятся `CustomEvent`:
`document.addEventListener('cw:consent-change', e => ...)` и
`document.addEventListener('cw:detection-change', e => ...)`.

## Хранение

Согласие пользователя хранится в `localStorage` под ключом `cw_consent_v1`
(на устройстве пользователя, не передаётся никуда сторонним сервисам).
