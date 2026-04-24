export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const prompt = `Você é médico intensivista. Analise esta imagem de UTI e extraia os dados clínicos encontrados.

Retorne SOMENTE JSON válido, sem markdown, sem texto extra, sem blocos de código. Apenas o JSON puro.

Formato exato:
{"sistemas":{"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},"metas_sugeridas":[],"resumo":""}

Preencha apenas os sistemas com dados visíveis na imagem. Seja conciso e clínico.`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-001:generateContent?key=${GEMINI_KEY}`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Gemini error:', response.status, responseText);
      return res.status(502).json({
        error: `Gemini API error ${response.status}`,
        details: responseText.slice(0, 500)
      });
    }

    const data = JSON.parse(responseText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({
        sistemas: {
          "Neurológico": "", "Respiratório": "", "Hemodinâmico": "",
          "Renal/Metabólico": "", "Gastrointestinal": "",
          "Hematológico/Infeccioso": "", "Pele/Acessos": ""
        },
        metas_sugeridas: [],
        resumo: clean.slice(0, 300)
      });
    }

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
