// api/search.js
// Проксирует запросы к Kodik API. Токен живёт только тут, в переменной
// окружения KODIK_API_TOKEN на Vercel — на клиенте его больше нет.
//
// Vercel: Settings → Environment Variables → KODIK_API_TOKEN = <ваш токен>

const KODIK_URL = 'https://kodik-api.com/search';

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const token = process.env.KODIK_API_TOKEN;
    if (!token) {
        res.status(500).json({ error: 'Server misconfigured: KODIK_API_TOKEN is not set' });
        return;
    }

    const { title, limit, sort, with_material_data } = req.query;

    if (!title || typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ error: 'Missing "title" query parameter' });
        return;
    }

    const params = new URLSearchParams({
        token,
        title: title.trim().slice(0, 200),
        limit: String(Math.min(parseInt(limit, 10) || 100, 100)),
        sort: sort === 'popular' || sort === 'year' ? sort : 'popular',
        with_material_data: with_material_data === 'false' ? 'false' : 'true'
    });

    try {
        const upstream = await fetch(`${KODIK_URL}?${params.toString()}`, {
            headers: { 'Accept': 'application/json' }
        });

        const data = await upstream.json();

        // Публичные данные каталога — можно кэшировать на edge на 5 минут,
        // это разгружает и Kodik, и уменьшает время ответа для повторных
        // одинаковых поисков от разных пользователей.
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.status(upstream.status).json(data);
    } catch (error) {
        res.status(502).json({ error: 'Upstream request failed' });
    }
};
