export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const token = process.env.KODIK_API_TOKEN;
    
    if (!token || token === 'your_token_here') {
        return res.status(500).json({ 
            error: 'KODIK_API_TOKEN not configured',
            message: 'Добавьте переменную KODIK_API_TOKEN в настройках Vercel'
        });
    }
    
    try {
        const { title, id, kinopoisk_id, imdb_id, limit } = req.query;
        
        // Строим URL для Kodik API
        let kodikUrl = `https://kodik-api.com/search?token=${token}`;
        
        if (title) kodikUrl += `&title=${encodeURIComponent(title)}`;
        if (id) kodikUrl += `&id=${id}`;
        if (kinopoisk_id) kodikUrl += `&kinopoisk_id=${kinopoisk_id}`;
        if (imdb_id) kodikUrl += `&imdb_id=${imdb_id}`;
        if (limit) kodikUrl += `&limit=${limit}`;
        
        kodikUrl += '&with_material_data=true';
        
        const response = await fetch(kodikUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Kodik API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch from Kodik API',
            message: error.message
        });
    }
}