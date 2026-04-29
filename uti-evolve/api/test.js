export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  const results = {
    keyPresent: !!GEMINI_KEY,
    keyPrefix: GEMINI_KEY ? GEMINI_KEY.slice(0,8) + '...' : 'AUSENTE',
    models: {}
  };

  if (!GEMINI_KEY) {
    return res.status(200).json(results);
  }

  // Test each model with a simple text prompt (no image)
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro'];
  
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas: ok' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        }
      );
      const body = await r.text();
      if (r.ok) {
        results.models[model] = '✅ OK';
      } else {
        results.models[model] = `❌ HTTP ${r.status}: ${body.slice(0,200)}`;
      }
    } catch(e) {
      results.models[model] = `❌ ERRO: ${e.message}`;
    }
  }

  return res.status(200).json(results);
}
