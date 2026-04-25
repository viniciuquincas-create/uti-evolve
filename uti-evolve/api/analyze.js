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

    const prompt = `Médico intensivista. Analise a imagem e extraia dados clínicos laboratoriais e sinais vitais.

IGNORE: nomes de pacientes, datas de nascimento, prontuários, médicos, assinaturas, carimbos.

Categorias:
- Renal/Metabólico: Cr, Ur, Na, K, Mg, Ca, P, pH, HCO3, Cl, Lactato, Glicemia, PCR, BH, Diurese
- Hematológico/Infeccioso: Hb, Ht, Leuco, Neutrófilos, Bastões, Linfócitos, Plaquetas, RNI, TTPA, Fibrinogênio, Procalcitonina
- Hemodinâmico: FC, PA, PAM, DVA, Troponina, BNP
- Respiratório: FR, Sat, FiO2, PEEP, pO2, pCO2
- Gastrointestinal: TGO, TGP, Bilirrubinas, Albumina, GGT, FA

Retorne APENAS este JSON compacto (sem espaços extras, sem markdown):
{"N":"","R":"","H":"","RM":"","GI":"","HI":"","PA":"","ex":[]}

Onde: N=Neurológico, R=Respiratório, H=Hemodinâmico, RM=Renal/Metabólico, GI=Gastrointestinal, HI=Hematológico/Infeccioso, PA=Pele/Acessos
"ex" = exames não categorizados: [{"n":"nome","v":"valor","s":"sistema sugerido"}]

Seja BREVE. Exemplo de RM: "Cr 1.27 / Ur 47 / K 4.1 / Na 141 / Mg 1.9 / PCR 85"
Exemplo de HI: "Hb 7.0 / Ht 23% / Leuco 11.17k / Plaq 204k"`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: { temperature: 0, maxOutputTokens: 800 }
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
    try { geminiResp = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: 'Resposta inválida' }); }

    const text = (geminiResp.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    const finishReason = geminiResp.candidates?.[0]?.finishReason;
    console.log('FINISH:', finishReason, '| TEXT:', text.slice(0, 400));

    if (!text) {
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        extras: [], resumo: `[SEM RESPOSTA: ${finishReason}]`
      });
    }

    // Extrai JSON do texto
    let clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    
    console.log('CLEAN:', clean.slice(0,300));

    if (start === -1 || end === -1 || end <= start) {
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        extras: [], resumo: `[SEM JSON] ${clean.slice(0,100)}`
      });
    }

    let compact;
    try { compact = JSON.parse(clean.slice(start, end + 1)); }
    catch(e) {
      console.error('PARSE ERR:', e.message, clean.slice(start, end+1).slice(0,200));
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        extras: [], resumo: `[PARSE FALHOU] ${e.message}`
      });
    }

    // Expande formato compacto para formato completo
    const AUTO_CAT = {
      'mg':'Renal/Metabólico','magnésio':'Renal/Metabólico','magnesio':'Renal/Metabólico',
      'ca':'Renal/Metabólico','cal':'Renal/Metabólico','cai':'Renal/Metabólico','cálcio':'Renal/Metabólico',
      'pcr':'Renal/Metabólico','proteína c':'Renal/Metabólico','p':'Renal/Metabólico','fósforo':'Renal/Metabólico',
      'procalcitonina':'Hematológico/Infeccioso','pct':'Hematológico/Infeccioso',
      'troponina':'Hemodinâmico','bnp':'Hemodinâmico','nt-probnp':'Hemodinâmico',
      'tgo':'Gastrointestinal','tgp':'Gastrointestinal','bilirrubina':'Gastrointestinal',
      'albumina':'Gastrointestinal','ggt':'Gastrointestinal','fa':'Gastrointestinal','amilase':'Gastrointestinal',
    };

    const extras = (compact.ex || []).map(e => {
      const nl = (e.n||'').toLowerCase();
      let sugestao = e.s || '';
      for (const [k,v] of Object.entries(AUTO_CAT)) {
        if (nl.includes(k)) { sugestao = v; break; }
      }
      return { nome: e.n, valor: e.v, sugestao };
    });

    const result = {
      sistemas: {
        "Neurológico":            compact.N  || "",
        "Respiratório":           compact.R  || "",
        "Hemodinâmico":           compact.H  || "",
        "Renal/Metabólico":       compact.RM || "",
        "Gastrointestinal":       compact.GI || "",
        "Hematológico/Infeccioso":compact.HI || "",
        "Pele/Acessos":           compact.PA || "",
      },
      extras,
      resumo: compact.resumo || ""
    };

    console.log('OK. RM:', result.sistemas["Renal/Metabólico"].slice(0,60), '| HI:', result.sistemas["Hematológico/Infeccioso"].slice(0,60));
    return res.status(200).json(result);

  } catch (err) {
    console.error('ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
