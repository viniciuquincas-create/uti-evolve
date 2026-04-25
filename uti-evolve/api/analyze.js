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

    const prompt = `Você é médico intensivista analisando dados de UTI.

Analise a imagem (tabela de controles do Tasy, exames laboratoriais, monitor de sinais vitais, PDF de resultados, etc.) e extraia os dados clínicos.

INSTRUÇÕES IMPORTANTES:
- Se for tabela de controles Tasy: use as colunas Máxima e Mínima (últimas colunas) para resumir sinais vitais do dia. Use Total para volumes.
- Se for PDF/laudo de exames: extraia os valores dos exames com seus números.
- Extraia SOMENTE o que está visível na imagem. Não invente valores.
- Para sinais vitais: formato "FC 102-58 bpm / PAM 111-67 mmHg"
- Para exames: formato "Cr 1,56 / Ur 66 / K 4,2 / Na 143"

Retorne SOMENTE o JSON abaixo, sem nenhum texto antes ou depois, sem markdown, sem explicações:
{"sistemas":{"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},"metas_sugeridas":[],"resumo":"resumo clínico em 1 frase"}

Exemplos de preenchimento:
- Hemodinâmico: "FC 102-58 bpm / PAM 111-67 mmHg / sem DVA / Glic 179-141 mg/dL"
- Respiratório: "TQT / FiO2 25% / PEEP 6-8 cmH2O / Sat 100-94% / FR 30-14 rpm"
- Renal/Metabólico: "Temp 36,8-36°C / HD 3000 mL / BH +1508 mL / Cr 1,27 / K 4,1 / Na 141"
- Hematológico/Infeccioso: "Hb 7,5 / Leuco 14k / Bastões 4% / Plaq 251k"
- Gastrointestinal: "Dieta enteral 1340 mL / evacuação 21/04"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1500,
          responseMimeType: "application/json"
        }
      })
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error('Gemini HTTP error:', response.status, rawText.slice(0, 400));
      try {
        const errJson = JSON.parse(rawText);
        return res.status(502).json({ error: errJson.error?.message || `Gemini error ${response.status}` });
      } catch {
        return res.status(502).json({ error: `Gemini error ${response.status}` });
      }
    }

    let geminiData;
    try {
      geminiData = JSON.parse(rawText);
    } catch {
      console.error('Failed to parse Gemini response:', rawText.slice(0, 300));
      return res.status(500).json({ error: 'Resposta inválida do Gemini' });
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini raw text:', text.slice(0, 500));

    // Remove markdown e espaços extras
    let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Tenta parsear direto
    try {
      const parsed = JSON.parse(clean);
      // Valida estrutura mínima
      if (parsed.sistemas) {
        return res.status(200).json(parsed);
      }
    } catch {}

    // Tenta encontrar JSON dentro do texto
    const match = clean.match(/\{[\s\S]*"sistemas"[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.sistemas) return res.status(200).json(parsed);
      } catch {}
    }

    // Fallback: retorna o texto no resumo para debug
    console.error('Could not parse JSON from:', clean.slice(0, 500));
    return res.status(200).json({
      sistemas: {
        "Neurológico":"","Respiratório":"","Hemodinâmico":"",
        "Renal/Metabólico":"","Gastrointestinal":"",
        "Hematológico/Infeccioso":"","Pele/Acessos":""
      },
      metas_sugeridas: [],
      resumo: `[ERRO PARSE] ${clean.slice(0, 200)}`
    });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
