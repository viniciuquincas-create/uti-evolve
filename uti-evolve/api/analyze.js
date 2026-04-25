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

    const prompt = `Você é médico intensivista analisando dados de UTI. Analise a imagem (pode ser tabela de controles do Tasy, monitor, exames laboratoriais, PDF de resultados, etc.) e extraia os dados clínicos.

Se for tabela de controles Tasy: use as colunas Máxima/Mínima/Total (últimas colunas) para resumir os valores do dia.
Se for PDF de exames laboratoriais: extraia os valores dos exames.
Se for monitor de sinais vitais: extraia FC, PA, SpO2, FR, Temperatura.

Retorne SOMENTE JSON válido, sem markdown, sem texto extra antes ou depois. Formato exato:
{"sistemas":{"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},"metas_sugeridas":[],"resumo":""}

Diretrizes por sistema:
- Hemodinâmico: FC máx-mín / PAM máx-mín mmHg / DVA se houver / Lactato / Glicemia
- Respiratório: modo VM / FiO2 / PEEP / FR máx-mín / Sat máx-mín / gasometria se houver
- Renal/Metabólico: Temp / HD total / BH / eletrólitos se houver
- Gastrointestinal: dieta e volume / evacuações
- Hematológico/Infeccioso: Hb / Leuco / Plaq / exames infecciosos
Deixe vazio sistemas sem dados.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1500 }
      })
    });

    // Lê resposta como texto primeiro para evitar erro de parse
    const rawText = await response.text();

    if (!response.ok) {
      console.error('Gemini HTTP error:', response.status, rawText.slice(0, 400));
      // Tenta extrair mensagem do erro JSON do Gemini
      try {
        const errJson = JSON.parse(rawText);
        return res.status(502).json({ error: errJson.error?.message || `Gemini error ${response.status}` });
      } catch {
        return res.status(502).json({ error: `Gemini error ${response.status}: ${rawText.slice(0, 200)}` });
      }
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('Failed to parse Gemini response:', rawText.slice(0, 200));
      return res.status(500).json({ error: 'Resposta inválida do Gemini' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      // Tenta encontrar JSON dentro do texto
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return res.status(200).json(JSON.parse(match[0]));
        } catch {}
      }
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        metas_sugeridas: [],
        resumo: clean.slice(0, 300)
      });
    }

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
