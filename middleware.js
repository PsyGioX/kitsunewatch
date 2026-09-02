// middleware.js
// Vercel Edge Middleware. Перехватывает запросы на "/" с параметром ?search=
// и подставляет корректные <title>/<meta>/<link rel="canonical"> в HTML
// ДО того, как он уйдёт клиенту/боту — вместо того чтобы полагаться на
// клиентский updateSEO() в index.js, который выполняется слишком поздно
// для первичного краула Googlebot.
//
// Статичный index.html при этом не трогаем: он по-прежнему открывается
// напрямую (и для клиентской гидратации), а для запросов с ?search=
// middleware подменяет ответ на модифицированную копию.

export const config = {
    matcher: '/',
};

const SITE_URL = 'https://kitsunewatch.vercel.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/imgs/KitsuneWatch-og.jpg`;

export default async function middleware(request) {
    const url = new URL(request.url);
    const rawSearch = url.searchParams.get('search');

    // Нет ?search= — отдаём статичный index.html как есть.
    if (!rawSearch || !rawSearch.trim()) {
        return;
    }

    const query = decodeSearchParam(rawSearch);
    if (!query) {
        return;
    }

    const originResponse = await fetch(new URL('/index.html', request.url));
    if (!originResponse.ok) {
        return; // fallback на обычную отдачу
    }
    let html = await originResponse.text();

    const title = `${query} - смотреть аниме онлайн | KitsuneWatch`;
    const description =
        `Смотреть ${query} онлайн в хорошем качестве. Все серии ${query} на KitsuneWatch. Бесплатно, без регистрации.`;
    const keywords = `${query}, смотреть ${query}, ${query} аниме, ${query} онлайн, аниме ${query}`;
    const canonicalUrl = `${SITE_URL}/?search=${encodeURIComponent(query)}`;

    const t = escapeHtml(title);
    const d = escapeHtml(description);
    const k = escapeHtml(keywords);

    html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
    html = replaceAttr(html, /<meta name="description"[\s\S]*?>/, 'content', d, 'meta name="description"');
    html = replaceAttr(html, /<meta name="keywords"[\s\S]*?>/, 'content', k, 'meta name="keywords"');
    html = replaceAttr(html, /<link rel="canonical"[\s\S]*?>/, 'href', canonicalUrl, 'link rel="canonical"');
    html = replaceAttr(html, /<meta property="og:title"[\s\S]*?>/, 'content', t, 'meta property="og:title"');
    html = replaceAttr(html, /<meta property="og:description"[\s\S]*?>/, 'content', d, 'meta property="og:description"');
    html = replaceAttr(html, /<meta property="og:url"[\s\S]*?>/, 'content', canonicalUrl, 'meta property="og:url"');
    html = replaceAttr(html, /<meta name="twitter:title"[\s\S]*?>/, 'content', t, 'meta name="twitter:title"');
    html = replaceAttr(html, /<meta name="twitter:description"[\s\S]*?>/, 'content', d, 'meta name="twitter:description"');

    return new Response(html, {
        status: 200,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}

function decodeSearchParam(raw) {
    let value = raw.trim();
    try {
        value = decodeURIComponent(value);
        if (value.includes('%25')) {
            value = decodeURIComponent(value);
        }
    } catch {
        // оставляем как есть, если не декодируется
    }
    return value.trim();
}

function replaceTag(html, tagRegex, replacement) {
    if (!tagRegex.test(html)) return html;
    return html.replace(tagRegex, replacement);
}

// Заменяет значение конкретного атрибута (content/href) внутри найденного тега,
// не трогая остальные атрибуты тега (например data-default на og:image).
function replaceAttr(html, tagRegex, attr, value, label) {
    const match = html.match(tagRegex);
    if (!match) return html;
    const original = match[0];
    const attrRegex = new RegExp(`${attr}="[^"]*"`);
    if (!attrRegex.test(original)) return html;
    const updated = original.replace(attrRegex, `${attr}="${value}"`);
    return html.replace(original, updated);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
