// cookie-widget/cookie-widget-detectors.js
//
// Реестр "сигнатур" известных сервисов сбора метрик/рекламы — мировых и
// российских. Используется движком (cookie-widget-core.js) для активного
// сканирования страницы: по src подключаемых <script> и по глобальным
// переменным, которые эти сервисы оставляют в window.
//
// Это ДАННЫЕ, а не логика — чтобы добавить/поправить сервис для нового
// проекта, правьте только этот файл, ядро трогать не нужно.
//
// Формат записи:
//   id       — уникальный строковый идентификатор
//   name     — отображаемое имя сервиса
//   company  — юрлицо/владелец (для прозрачности пользователю)
//   region   — 'world' | 'ru' — только для группировки в UI ("мир"/"РФ")
//   category — 'analytics' | 'marketing' | 'functional'
//              (категория 'necessary' зарезервирована за собственными
//              обязательными cookie сайта и в детекторах не участвует)
//   match.src     — массив RegExp, проверяются против src всех <script> на странице
//   match.globals — массив имён глобальных переменных (window.<name>), которые
//                   сервис оставляет после инициализации
//
// Достаточно совпадения ХОТЯ БЫ ОДНОГО правила (src ИЛИ global).

(function (root) {
    'use strict';

    const DETECTORS = [
        // ============ МИРОВЫЕ СЕРВИСЫ ============
        {
            id: 'google-analytics',
            name: 'Google Analytics',
            company: 'Google LLC',
            region: 'world',
            category: 'analytics',
            match: {
                src: [/google-analytics\.com\/analytics\.js/i, /googletagmanager\.com\/gtag\/js/i],
                globals: ['gtag', 'ga']
            }
        },
        {
            id: 'google-tag-manager',
            name: 'Google Tag Manager',
            company: 'Google LLC',
            region: 'world',
            category: 'analytics',
            match: {
                src: [/googletagmanager\.com\/gtm\.js/i],
                globals: ['google_tag_manager', 'dataLayer']
            }
        },
        {
            id: 'google-ads',
            name: 'Google Ads / Conversion Tracking',
            company: 'Google LLC',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/googleadservices\.com/i, /googlesyndication\.com/i, /doubleclick\.net/i]
            }
        },
        {
            id: 'meta-pixel',
            name: 'Meta Pixel (Facebook)',
            company: 'Meta Platforms, Inc.',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/connect\.facebook\.net.*\/fbevents\.js/i],
                globals: ['fbq']
            }
        },
        {
            id: 'microsoft-clarity',
            name: 'Microsoft Clarity',
            company: 'Microsoft Corporation',
            region: 'world',
            category: 'analytics',
            match: {
                src: [/clarity\.ms\/tag/i],
                globals: ['clarity']
            }
        },
        {
            id: 'hotjar',
            name: 'Hotjar',
            company: 'Hotjar Ltd.',
            region: 'world',
            category: 'analytics',
            match: {
                src: [/static\.hotjar\.com/i],
                globals: ['hj']
            }
        },
        {
            id: 'tiktok-pixel',
            name: 'TikTok Pixel',
            company: 'TikTok Pte. Ltd.',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/analytics\.tiktok\.com/i],
                globals: ['ttq']
            }
        },
        {
            id: 'linkedin-insight',
            name: 'LinkedIn Insight Tag',
            company: 'LinkedIn Corporation',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/snap\.licdn\.com/i],
                globals: ['_linkedin_data_partner_ids']
            }
        },
        {
            id: 'amplitude',
            name: 'Amplitude',
            company: 'Amplitude, Inc.',
            region: 'world',
            category: 'analytics',
            match: {
                src: [/cdn\.amplitude\.com/i],
                globals: ['amplitude']
            }
        },
        {
            id: 'mixpanel',
            name: 'Mixpanel',
            company: 'Mixpanel, Inc.',
            region: 'world',
            category: 'analytics',
            match: {
                src: [/cdn\.mxpnl\.com/i],
                globals: ['mixpanel']
            }
        },
        {
            id: 'segment',
            name: 'Segment',
            company: 'Twilio Segment',
            region: 'world',
            category: 'analytics',
            match: {
                src: [/cdn\.segment\.com/i]
            }
        },
        {
            id: 'hubspot',
            name: 'HubSpot',
            company: 'HubSpot, Inc.',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/js\.hs-scripts\.com/i, /js\.hubspot\.com/i],
                globals: ['_hsq']
            }
        },
        {
            id: 'cloudflare-insights',
            name: 'Cloudflare Web Analytics',
            company: 'Cloudflare, Inc.',
            region: 'world',
            category: 'functional',
            match: {
                src: [/static\.cloudflareinsights\.com/i]
            }
        },
        {
            id: 'sentry',
            name: 'Sentry',
            company: 'Functional Software, Inc.',
            region: 'world',
            category: 'functional',
            match: {
                src: [/browser\.sentry-cdn\.com/i, /js\.sentry-cdn\.com/i],
                globals: ['Sentry']
            }
        },
        {
            id: 'criteo',
            name: 'Criteo',
            company: 'Criteo SA',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/static\.criteo\.net/i]
            }
        },
        {
            id: 'twitter-pixel',
            name: 'X (Twitter) Ads',
            company: 'X Corp.',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/static\.ads-twitter\.com/i],
                globals: ['twq']
            }
        },
        {
            id: 'pinterest-tag',
            name: 'Pinterest Tag',
            company: 'Pinterest, Inc.',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/s\.pinimg\.com.*pinit/i],
                globals: ['pintrk']
            }
        },
        {
            id: 'snapchat-pixel',
            name: 'Snapchat Pixel',
            company: 'Snap Inc.',
            region: 'world',
            category: 'marketing',
            match: {
                src: [/sc-static\.net.*scevent/i],
                globals: ['snaptr']
            }
        },
        {
            id: 'onesignal',
            name: 'OneSignal (push)',
            company: 'OneSignal, Inc.',
            region: 'world',
            category: 'functional',
            match: {
                src: [/cdn\.onesignal\.com/i],
                globals: ['OneSignal']
            }
        },
        {
            id: 'intercom',
            name: 'Intercom',
            company: 'Intercom, Inc.',
            region: 'world',
            category: 'functional',
            match: {
                src: [/widget\.intercom\.io/i],
                globals: ['Intercom']
            }
        },

        // ============ РОССИЙСКИЕ СЕРВИСЫ ============
        {
            id: 'yandex-metrica',
            name: 'Яндекс.Метрика',
            company: 'ООО «Яндекс»',
            region: 'ru',
            category: 'analytics',
            match: {
                src: [/mc\.yandex\.(ru|by|kz|com)\/metrika\/tag\.js/i, /mc\.yandex\.(ru|by|kz|com)\/watch/i],
                globals: ['ym', 'Ya']
            }
        },
        {
            id: 'yandex-ads',
            name: 'Яндекс Директ / РСЯ',
            company: 'ООО «Яндекс»',
            region: 'ru',
            category: 'marketing',
            match: {
                src: [/an\.yandex\.ru/i, /yandex\.ru\/ads/i]
            }
        },
        {
            id: 'top-mail-ru',
            name: 'Top.Mail.Ru (VK Analytics)',
            company: 'VK (бывш. Mail.ru Group)',
            region: 'ru',
            category: 'analytics',
            match: {
                src: [/top-fwz1\.mail\.ru/i, /top-fwz\d*\.mail\.ru/i],
                globals: ['_tmr']
            }
        },
        {
            id: 'vk-pixel',
            name: 'VK Реклама (пиксель)',
            company: 'VK',
            region: 'ru',
            category: 'marketing',
            match: {
                src: [/vk\.com\/js\/api\/openapi\.js/i],
                globals: ['VK']
            }
        },
        {
            id: 'mytarget',
            name: 'myTarget',
            company: 'VK Реклама',
            region: 'ru',
            category: 'marketing',
            match: {
                src: [/top-fwz1\.mail\.ru\/js\/topry\.js/i, /ad\.mail\.ru/i]
            }
        },
        {
            id: 'rambler-top100',
            name: 'Rambler Top100',
            company: 'Rambler&Co',
            region: 'ru',
            category: 'analytics',
            match: {
                src: [/counter\.rambler\.ru/i, /r0\.ru/i]
            }
        },
        {
            id: 'liveinternet',
            name: 'LiveInternet',
            company: 'ООО «Медиа Интернешнл Груп»',
            region: 'ru',
            category: 'analytics',
            match: {
                src: [/counter\.yadro\.ru/i, /li\.ru\/js/i]
            }
        },
        {
            id: 'roistat',
            name: 'Roistat',
            company: 'ООО «Ройстат»',
            region: 'ru',
            category: 'analytics',
            match: {
                src: [/cloud\.roistat\.com/i],
                globals: ['roistat']
            }
        },
        {
            id: 'calltouch',
            name: 'CallTouch',
            company: 'ООО «Колтач Солюшнс»',
            region: 'ru',
            category: 'analytics',
            match: {
                src: [/mod\.calltouch\.ru/i]
            }
        }
    ];

    root.CookieWidgetDetectors = DETECTORS;
})(window);
