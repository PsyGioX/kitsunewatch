// api/config.js
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const token = process.env.KODIK_API_TOKEN || null;
    
    res.status(200).json({
        token: token,
        hasToken: !!token && token !== 'your_token_here'
    });
};