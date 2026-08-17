// api/config.js
export default function handler(req, res) {
    // Разрешаем только GET запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Получаем токен из переменных окружения Vercel
    const token = process.env.KODIK_API_TOKEN || null;
    const apiUrl = process.env.KODIK_API_URL || 'https://kodik-api.com/search';

    // Логируем запрос (для отладки)
    console.log('API config requested:', {
        hasToken: !!token,
        timestamp: new Date().toISOString()
    });

    // Возвращаем конфигурацию
    res.status(200).json({
        token: token,
        apiUrl: apiUrl,
        timestamp: new Date().toISOString()
    });
}