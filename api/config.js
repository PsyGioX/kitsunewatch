export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const token = process.env.KODIK_API_TOKEN;
    
    // Проверяем, что токен не равен плейсхолдеру
    const validToken = token && token !== 'your_token_here' && token !== 'undefined' ? token : null;
    
    console.log('Config request - token exists:', !!validToken);
    
    res.status(200).json({
        token: validToken,
        apiUrl: process.env.KODIK_API_URL || 'https://kodik-api.com/search',
        hasToken: !!validToken
    });
}