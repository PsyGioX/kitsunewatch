# Система достижений KitsuneWatch

Полностью самостоятельный модуль, подключаемый к основному приложению
только через `CustomEvent`, без прямых вызовов из `assets/scripts/index.js`
(за исключением 4 строк-«диспетчеров» события, см. ниже) — так же, как
`theme-manager.js` работает независимо от `KitsuneWatchApp`.

Сейчас в `data/achievements.json` — **66 достижений** в 8 категориях
(Поиск, Избранное, Просмотр, Социальное, Персонализация, Мастерство,
Преданность, Прогресс).

## Структура

```text
achievements/
├── README.md                     # этот файл
├── achievements.css              # стили (тосты, кнопка, страница)
├── achievements-core.js          # ядро: трекинг событий, хранение прогресса, условия разблокировки
├── achievements-notifications.js # всплывающие уведомления о новом достижении
├── achievements-page.js          # кнопка в шапке + отдельная страница со списком достижений
└── data/
    └── achievements.json         # ВСЕ достижения и задания — редактируется отдельно от кода
```

## Как добавить новое достижение

Откройте `data/achievements.json` и добавьте объект в массив `achievements`.
Код трогать не нужно — движок подхватит новое достижение автоматически при
следующей загрузке страницы.

```json
{
    "id": "unique_id",
    "category": "search",
    "title": "Название",
    "description": "Что нужно сделать",
    "icon": "bi-star",
    "points": 20,
    "condition": { "type": "count", "stat": "search", "target": 5 }
}
```

Поле `condition.type` — один из:

| type            | Что означает                                                            |
|-----------------|---------------------------------------------------------------------------|
| `count`         | счётчик события `condition.stat` достиг `condition.target`                |
| `unique`        | число уникальных значений в наборе `condition.stat` достигло `target`     |
| `streak`        | число дней подряд с визитом достигло `target`                             |
| `totalUnlocked` | всего получено любых достижений >= `target` (ранги «Новичок» → «Легенда сообщества») |
| `points`        | суммарно заработано очков >= `target`                                     |
| `allCategories` | получено хотя бы одно достижение в каждой категории                       |
| `meta`          | выдаётся, когда получены все остальные (не мета) достижения               |

Доступные `stat` для `count`/`unique` — те, что уже инкрементируются в
`achievements-core.js` (`bindAppEvents`): `search`, `favoriteAdded`,
`favoriteRemoved`, `videoOpen`, `share`, `install`, `shortcutUse`,
`nightWatch`, `earlyWatch`, а также наборы уникальных значений:
`searchQueries`, `videoTypes`, `themes`.

Чтобы добавить новую категорию — допишите объект в массив `categories` того
же JSON-файла (`{ "id", "name", "icon" }`).

Чтобы завести совершенно новый тип условия или новую отслеживаемую
метрику — добавьте инкремент в `bindAppEvents()` (или новый `document`
listener) и новый `case` в `checkCondition()` в `achievements-core.js`.

## Как приложение сообщает о событиях

В `assets/scripts/index.js` добавлено 4 короткие строки-диспетчера
(не логика, а просто оповещение), в местах, где что-то реально произошло:

- `toggleFavorite()` → `kw:favorite-added`
- `addToHistory()` → `kw:search`
- `loadVideo()` → `kw:video-open`
- `copyShareModalLink()` → `kw:share`

Смена темы (`themechange` из `theme-manager.js`) и установка PWA
(`appinstalled`, нативное событие браузера) слушаются напрямую — эти
файлы вообще не редактировались.

## Хранилище

Прогресс хранится в `localStorage`, отдельно от данных основного
приложения:

- `kw_achv_stats_v1` — счётчики и наборы уникальных значений
- `kw_achv_unlocked_v1` — какие достижения получены и когда

## Публичное API

```js
window.KWAchievements.ready              // Promise — резолвится, когда JSON загружен
window.KWAchievements.getDefinitions()   // все достижения
window.KWAchievements.getCategories()    // все категории
window.KWAchievements.getState()         // { unlocked, stats, unlockedCount, totalCount, earnedPoints, totalPoints }
window.KWAchievements.getProgress(id)    // { current, target, unlocked }
window.KWAchievements.openPage()         // открыть страницу достижений программно
```
