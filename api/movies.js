// api/movies.js

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Обработка OPTIONS запроса
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Получаем параметры запроса
    const { q, kp, imdb, tmdb, item, token, items, page } = req.query;

    // Проверяем токен
    if (!token) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Token is required' 
        });
    }

    try {
        // Формируем URL для API videoseed
        let apiUrl = 'https://api.videoseed.tv/apiv2.php';
        const params = new URLSearchParams();
        
        params.append('token', token);
        
        if (item) {
            params.append('item', item);
        } else {
            params.append('item', 'search');
        }
        
        if (q) params.append('q', q);
        if (kp) params.append('kp', kp);
        if (imdb) params.append('imdb', imdb);
        if (tmdb) params.append('tmdb', tmdb);
        
        // Сортировка по умолчанию
        params.append('sort_by', 'kp desc');
        
        // Количество элементов
        params.append('items', items || '50');
        
        // Пагинация
        if (page && page > 1) {
            params.append('from', page);
        }

        apiUrl += '?' + params.toString();

        console.log('Requesting:', apiUrl);

        // Выполняем запрос к API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Логируем результат
        console.log('API Response status:', data.status);
        console.log('Results count:', data.data?.length || 0);

        // Возвращаем данные
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        
        return res.status(500).json({ 
            status: 'error', 
            message: 'Proxy error: ' + error.message 
        });
    }
}