// api/search.js
module.exports = async (req, res) => {
    // CORS headers
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
    
    console.log('Token exists:', !!token);
    
    if (!token || token === 'your_token_here') {
        return res.status(500).json({ 
            error: 'Token not configured',
            message: 'Add KODIK_API_TOKEN in Vercel'
        });
    }
    
    try {
        const { title } = req.query;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const kodikUrl = `https://kodik-api.com/search?token=${token}&title=${encodeURIComponent(title)}&with_material_data=true`;
        
        console.log('Fetching:', kodikUrl);
        
        const response = await fetch(kodikUrl);
        
        if (!response.ok) {
            throw new Error(`Kodik API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch',
            message: error.message 
        });
    }
};