export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const token = process.env.KODIK_API_TOKEN || null;
    
    res.status(200).json({
        token: token,
        apiUrl: process.env.KODIK_API_URL || 'https://kodik-api.com/search',
        hasToken: !!token
    });
}