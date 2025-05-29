export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем preflight-запрос (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только POST-запросы разрешены
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверяем распаршен ли body, если нет — парсим вручную:
  let prompt = undefined;
  if (!req.body) {
    let data = '';
    await new Promise((resolve, reject) => {
      req.on('data', chunk => data += chunk);
      req.on('end', resolve);
      req.on('error', reject);
    });
    try {
      req.body = JSON.parse(data);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  prompt = req.body?.prompt;

  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'No OpenAI API key set' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    // Если OpenAI прислал ошибку – пробрасываем её
    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'OpenAI API error' });
    }

    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
