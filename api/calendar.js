// api/calendar.js
// График премьер на ~35 дней вперёд. Kodik API дат выхода серий не отдаёт,
// поэтому даты берём из открытого API Shikimori (https://shikimori.one/api/doc)
// и проксируем через сервер по двум причинам:
//   1) Shikimori требует описательный User-Agent и банит IP при его
//      отсутствии/подмене под браузер — держим заголовок только на сервере.
//   2) Так проще кэшировать результат на edge и не гонять клиент через CORS.
// Ссылки на просмотр не запрашиваем у Shikimori (там их нет) — на клиенте
// каждый пункт календаря ведёт на обычный поиск по названию в Kodik.

const SHIKIMORI_BASE = 'https://shikimori.one/api';
const USER_AGENT = 'KitsuneWatch (https://kitsunewatch.vercel.app)';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 35;

function toDateKey(d) {
    return d.toISOString().slice(0, 10);
}

function posterUrl(anime) {
    const path = anime?.image?.original || anime?.image?.preview || anime?.image?.x96;
    return path ? `https://shikimori.one${path}` : null;
}

async function fetchJSON(url) {
    const upstream = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT }
    });
    if (!upstream.ok) return [];
    try {
        return await upstream.json();
    } catch (e) {
        return [];
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const [calendar, anonsList] = await Promise.all([
            fetchJSON(`${SHIKIMORI_BASE}/calendar`),
            fetchJSON(`${SHIKIMORI_BASE}/animes?status=anons&order=aired_on&limit=50&censored=true`)
        ]);

        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const windowEnd = new Date(todayStart.getTime() + WINDOW_DAYS * DAY_MS);

        const days = {};
        const ensureDay = (key) => (days[key] || (days[key] = []));

        // ---- 1. Ближайший эпизод по расписанию Shikimori (реальная дата) +
        //         проекция того же дня недели на остаток окна, т.к. подавляющее
        //         большинство тайтлов выходит еженедельно в фиксированный день ----
        (Array.isArray(calendar) ? calendar : []).forEach(entry => {
            const anime = entry.anime;
            if (!anime || !entry.next_episode_at) return;

            const airDate = new Date(entry.next_episode_at);
            if (isNaN(airDate.getTime())) return;

            const baseItem = {
                id: anime.id,
                title: anime.russian || anime.name,
                title_orig: anime.name,
                kind: anime.kind,
                poster: posterUrl(anime),
                shikimoriUrl: anime.url ? `https://shikimori.one${anime.url}` : null
            };

            if (airDate >= todayStart && airDate < windowEnd) {
                ensureDay(toDateKey(airDate)).push({
                    ...baseItem,
                    type: 'episode',
                    episode: entry.next_episode || null,
                    time: airDate.toISOString()
                });
            }

            const weeksAhead = Math.ceil(WINDOW_DAYS / 7);
            for (let w = 1; w <= weeksAhead; w++) {
                const projected = new Date(airDate.getTime() + w * 7 * DAY_MS);
                if (projected >= todayStart && projected < windowEnd) {
                    ensureDay(toDateKey(projected)).push({
                        ...baseItem,
                        type: 'episode-projected',
                        episode: entry.next_episode ? entry.next_episode + w : null,
                        time: projected.toISOString()
                    });
                }
            }
        });

        // ---- 2. Анонсированные премьеры новых тайтлов с известной датой выхода ----
        (Array.isArray(anonsList) ? anonsList : []).forEach(anime => {
            if (!anime.aired_on) return;
            const airDate = new Date(anime.aired_on);
            if (isNaN(airDate.getTime())) return;
            if (airDate < todayStart || airDate >= windowEnd) return;

            ensureDay(toDateKey(airDate)).push({
                id: anime.id,
                title: anime.russian || anime.name,
                title_orig: anime.name,
                kind: anime.kind,
                poster: posterUrl(anime),
                shikimoriUrl: anime.url ? `https://shikimori.one${anime.url}` : null,
                type: 'premiere',
                episode: null,
                time: airDate.toISOString()
            });
        });

        const result = Object.keys(days)
            .sort()
            .map(date => ({
                date,
                items: days[date].sort((a, b) => new Date(a.time) - new Date(b.time))
            }));

        // У Shikimori расписание обновляется примерно раз в день — держим
        // на edge подольше, чем результаты поиска
        res.setHeader('Cache-Control', 'public, s-maxage=10800, stale-while-revalidate=43200');
        res.status(200).json({
            generated_at: now.toISOString(),
            window_days: WINDOW_DAYS,
            days: result
        });
    } catch (error) {
        res.status(502).json({ error: 'Upstream request failed' });
    }
};
