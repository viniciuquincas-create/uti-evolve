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

    const prompt = `Você é médico intensivista. Analise esta imagem de UTI e extraia os dados clínicos.

REGRAS IMPORTANTES:
- IGNORE completamente: nomes de pacientes, datas de nascimento, número de prontuário, cabeçalhos de documentos, rodapés, assinaturas, carimbos, médicos solicitantes. Esses dados NÃO devem aparecer em nenhum sistema.
- Extraia SOMENTE valores clínicos (exames laboratoriais, sinais vitais, parâmetros ventilatórios, volumes).
- Não invente valores. Deixe vazio se não visível.

CATEGORIZAÇÃO DOS EXAMES:
Renal/Metabólico: Creatinina, Ureia, Sódio, Potássio, Magnésio, Cálcio iônico, Fósforo, pH, HCO3, Bicarbonato, Cloro, Lactato, Glicemia, PCR, Ureia, BH, Diurese, Balanço
Hematológico/Infeccioso: Hemoglobina, Hematócrito, Leucócitos, Neutrófilos, Bastões, Linfócitos, Plaquetas, RNI, TTPA, Fibrinogênio, VHS, Procalcitonina
Hemodinâmico: FC, PA, PAM, Pressão, DVA, Noradrenalina, Vasopressina
Respiratório: FR, Sat, SpO2, FiO2, PEEP, pO2, pCO2, Volume corrente, modo ventilatório
TGI/Hepático vai em Gastrointestinal: TGO, TGP, Bilirrubinas, Fosfatase, GGT, Albumina, Amilase, Lipase

Retorne EXATAMENTE este JSON sem nenhum texto fora dele:
{
  "sistemas": {
    "Neurológico": "",
    "Respiratório": "",
    "Hemodinâmico": "",
    "Renal/Metabólico": "",
    "Gastrointestinal": "",
    "Hematológico/Infeccioso": "",
    "Pele/Acessos": ""
  },
  "extras": [],
  "resumo": ""
}

Em "extras" coloque exames que não se encaixam claramente acima: [{"nome":"nome do exame","valor":"valor com unidade","sugestao":"sistema sugerido"}]`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: { temperature: 0, maxOutputTokens: 2000 }
      })
    });

    const rawText = await response.text();
    console.log('STATUS:', response.status);

    if (!response.ok) {
      let msg = `Gemini error ${response.status}`;
      try { msg = JSON.parse(rawText).error?.message || msg; } catch {}
      console.error('Gemini error:', msg);
      return res.status(502).json({ error: msg });
    }

    let geminiResp;
    try { geminiResp = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: 'Resposta inválida do Gemini' }); }

    const parts = geminiResp.candidates?.[0]?.content?.parts || [];
    const finishReason = geminiResp.candidates?.[0]?.finishReason;
    let text = parts.map(p => p.text || '').join('');
    
    console.log('FINISH:', finishReason);
    console.log('TEXT:', text.slice(0, 600));

    if (!text) {
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        extras: [], resumo: `[SEM RESPOSTA: ${finishReason}]`
      });
    }

    let clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();

    const tryParse = s => {
      try { const p = JSON.parse(s); if (p?.sistemas) return p; } catch {} return null;
    };

    let parsed = tryParse(clean);
    if (!parsed) {
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end > start) parsed = tryParse(clean.slice(start, end + 1));
    }

    if (parsed) {
      if (!parsed.extras) parsed.extras = [];
      // Auto-categoriza extras conhecidos
      const MAPA_EXTRAS = {
        'magnésio': 'Renal/Metabólico', 'magnesio': 'Renal/Metabólico', 'mg': 'Renal/Metabólico',
        'cálcio': 'Renal/Metabólico', 'calcio': 'Renal/Metabólico', 'cal': 'Renal/Metabólico', 'cai': 'Renal/Metabólico',
        'pcr': 'Renal/Metabólico', 'proteína c': 'Renal/Metabólico',
        'fósforo': 'Renal/Metabólico', 'fosforo': 'Renal/Metabólico',
        'procalcitonina': 'Hematológico/Infeccioso', 'pct': 'Hematológico/Infeccioso',
        'troponina': 'Hemodinâmico', 'bnp': 'Hemodinâmico', 'nt-probnp': 'Hemodinâmico',
        'tgo': 'Gastrointestinal', 'tgp': 'Gastrointestinal', 'bilirrubina': 'Gastrointestinal',
        'albumina': 'Gastrointestinal', 'ggt': 'Gastrointestinal', 'amilase': 'Gastrointestinal',
      };
      parsed.extras = parsed.extras.map(ex => {
        const nomeLower = (ex.nome||'').toLowerCase();
        for (const [k, v] of Object.entries(MAPA_EXTRAS)) {
          if (nomeLower.includes(k)) return { ...ex, sugestao: v };
        }
        return ex;
      });
      console.log('OK. Sistemas preenchidos:', Object.entries(parsed.sistemas).filter(([,v])=>v).map(([k])=>k));
      return res.status(200).json(parsed);
    }

    console.error('PARSE FAILED:', clean.slice(0, 300));
    return res.status(200).json({
      sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
      extras: [], resumo: `[PARSE FALHOU] ${clean.slice(0, 100)}`
    });

  } catch (err) {
    console.error('ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
