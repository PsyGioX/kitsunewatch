// api/top.js
// Проксирует запрос топ-100 аниме. Токен только на сервере.

const KODIK_URL = 'https://kodik-api.com/list';

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
        types: 'anime,anime-serial',
        sort: 'rating',
        limit: '100'
    });

    try {
        const upstream = await fetch(`${KODIK_URL}?${params.toString()}`, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await upstream.json();

        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        res.status(upstream.status).json(data);
    } catch (error) {
        res.status(502).json({ error: 'Upstream request failed' });
    }
};
