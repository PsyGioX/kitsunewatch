// api/years.js
// Проксирует запрос списка премьер по годам. Токен только на сервере.

const KODIK_URL = 'https://kodik-api.com/years';

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

    const params = new URLSearchParams({
        token,
        types: 'anime,anime-serial,foreign-movie,foreign-serial',
        sort: 'year'
    });

    try {
        const upstream = await fetch(`${KODIK_URL}?${params.toString()}`, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await upstream.json();

        // Список премьер по годам почти не меняется — можно держать
        // в кэше на edge дольше, чем результаты поиска.
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        res.status(upstream.status).json(data);
    } catch (error) {
        res.status(502).json({ error: 'Upstream request failed' });
    }
};
