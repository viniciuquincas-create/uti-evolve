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

    const prompt = `Analise a imagem de UTI. Extraia dados clínicos em JSON conciso.

IMPORTANTE: seja MUITO breve em cada campo. Máximo 80 caracteres por sistema.
Use abreviações: Hb, Ht, Leuco, Plaq, Cr, Ur, K, Na, FC, PA, Sat, FR.

JSON de retorno (sem markdown, sem texto fora do JSON):
{"N":"","Res":"","Cv":"","ReMe":"","TGI":"","He":"","extras":[{"nome":"","valor":"","cat":""}]}

Exemplos:
- Cv: "FC 102-58 / PAM 111-67 / sem DVA"
- Res: "FiO2 25% / PEEP 8 / Sat 100-94% / FR 30-14"
- ReMe: "Cr 1.27 / Ur 47 / K 4.1 / Na 141 / BH +1508"
- He: "Hb 7 / Ht 23% / Leuco 14k / Plaq 251k"
- extras: exames não listados acima com sugestão de categoria`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 }
      })
    });

    const rawText = await response.text();
    console.log('STATUS:', response.status);

    if (!response.ok) {
      let msg = `Gemini error ${response.status}`;
      try { msg = JSON.parse(rawText).error?.message || msg; } catch {}
      return res.status(502).json({ error: msg });
    }

    let geminiResp;
    try { geminiResp = JSON.parse(rawText); } catch {
      return res.status(500).json({ error: 'Resposta inválida do Gemini' });
    }

    const candidate = geminiResp.candidates?.[0];
    const text = (candidate?.content?.parts || []).map(p => p.text || '').join('');
    console.log('FINISH:', candidate?.finishReason, '| TEXT:', text.slice(0, 300));

    let clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();

    const tryParse = s => {
      try {
        const p = JSON.parse(s);
        // Aceita formato curto {N, Res, Cv...} ou longo {sistemas...}
        if (p.N !== undefined || p.sistemas) return p;
      } catch {}
      return null;
    };

    let parsed = tryParse(clean);
    if (!parsed) {
      const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) parsed = tryParse(clean.slice(start, end+1));
    }

    if (parsed) {
      // Normaliza para formato longo se veio no formato curto
      const MAP = { N:"Neurológico", Res:"Respiratório", Cv:"Hemodinâmico", ReMe:"Renal/Metabólico", TGI:"Gastrointestinal", He:"Hematológico/Infeccioso" };
      const sistemas = parsed.sistemas || {};
      Object.entries(MAP).forEach(([short, long]) => {
        if (parsed[short] !== undefined) sistemas[long] = parsed[short];
      });
      // Garante todos os campos
      ["Neurológico","Respiratório","Hemodinâmico","Renal/Metabólico","Gastrointestinal","Hematológico/Infeccioso","Pele/Acessos"].forEach(k => {
        if (!sistemas[k]) sistemas[k] = "";
      });

      console.log('OK. Sistemas preenchidos:', Object.entries(sistemas).filter(([,v])=>v).map(([k])=>k).join(', '));
      return res.status(200).json({ sistemas, extras: parsed.extras || [], resumo: parsed.resumo || "" });
    }

    console.error('PARSE FAILED:', clean.slice(0, 200));
    return res.status(200).json({
      sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
      extras: [],
      resumo: `[ERRO] ${clean.slice(0, 100)}`
    });

  } catch (err) {
    console.error('HANDLER ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
