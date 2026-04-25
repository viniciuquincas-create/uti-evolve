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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const prompt = `Você é médico intensivista. Analise esta imagem de UTI e extraia todos os dados clínicos visíveis.

Retorne SOMENTE este JSON (sem markdown, sem texto fora do JSON):
{"sistemas":{"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},"extras":[],"resumo":""}

Preencha "sistemas" com os dados encontrados. Em "extras" coloque exames não listados: [{"nome":"","valor":"","sugestao":""}]. Deixe vazio o que não estiver visível.`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 2000 }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const rawText = await response.text();
    console.log('STATUS:', response.status);
    console.log('RAW (500 chars):', rawText.slice(0, 500));

    if (!response.ok) {
      let msg = `Gemini error ${response.status}`;
      try { msg = JSON.parse(rawText).error?.message || msg; } catch {}
      return res.status(502).json({ error: msg });
    }

    let geminiResp;
    try { geminiResp = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: 'Resposta não é JSON válido' }); }

    // Extrai o texto da resposta
    const candidate = geminiResp.candidates?.[0];
    console.log('FINISH REASON:', candidate?.finishReason);
    
    const parts = candidate?.content?.parts || [];
    console.log('PARTS COUNT:', parts.length);
    
    let text = parts.map(p => p.text || '').join('');
    console.log('TEXT (400 chars):', text.slice(0, 400));

    if (!text) {
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        extras: [],
        resumo: `[SEM TEXTO] finishReason: ${candidate?.finishReason}`
      });
    }

    // Limpa e parseia
    let clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    
    const tryParse = s => { try { const p=JSON.parse(s); if(p.sistemas) return p; } catch {} return null; };
    
    let parsed = tryParse(clean);
    if (!parsed) {
      const m = clean.match(/\{[\s\S]*"sistemas"[\s\S]*?\}/);
      if (m) parsed = tryParse(m[0]);
    }
    if (!parsed) {
      // Última tentativa: acha o primeiro { e o último }
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) parsed = tryParse(clean.slice(start, end+1));
    }

    if (parsed) {
      if (!parsed.extras) parsed.extras = [];
      console.log('PARSED OK. Sistemas keys:', Object.keys(parsed.sistemas));
      return res.status(200).json(parsed);
    }

    console.error('PARSE FAILED. Clean text:', clean.slice(0, 300));
    return res.status(200).json({
      sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
      extras: [],
      resumo: `[PARSE FALHOU] ${clean.slice(0, 150)}`
    });

  } catch (err) {
    console.error('HANDLER ERROR:', err.message, err.stack?.slice(0,200));
    return res.status(500).json({ error: err.message });
  }
}
