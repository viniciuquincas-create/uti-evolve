export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(200).json({ error: 'Sem chave' });

  // List available models
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`
  );
  const data = await r.json();
  
  // Filter vision-capable models
  const vision = (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name);

  return res.status(200).json({ total: vision.length, models: vision });
}
