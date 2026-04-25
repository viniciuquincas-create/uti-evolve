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

    const prompt = `Analise esta imagem de exames laboratoriais ou controles de UTI.

IGNORE: nomes de pacientes, datas de nascimento, prontuários, médicos, assinaturas, carimbos.
Extraia APENAS valores clínicos e a DATA E HORA DA COLETA se visível.

IMPORTANTE - DATA E HORA DA COLETA:
- Procure por "Coleta:", "Colhido em:", "Data coleta:", textos com data próximos a horários
- Extraia data E hora se disponível (ex: "23/04/2026 05:15")
- Converta para: DATA:AAAA-MM-DD e HORA:HH:MM
- Se não encontrar, não inclua as linhas DATA e HORA

Categorias:
- RM: Creatinina, Ureia, Sódio, Potássio, Magnésio, Cálcio iônico, Fósforo, pH, HCO3, Lactato, Glicemia, PCR, BH, Diurese
- HI: Hemoglobina, Hematócrito, Leucócitos, Neutrófilos, Bastões, Linfócitos, Plaquetas, RNI, TTPA, Fibrinogênio, Procalcitonina
- H: FC, PA, PAM, DVA, Troponina, BNP
- R: FR, Sat, FiO2, PEEP, pO2, pCO2
- GI: TGO, TGP, Bilirrubinas, Albumina, GGT, FA
- EX: exames não categorizados acima

Responda SOMENTE com linhas CHAVE:VALOR:
DATA:AAAA-MM-DD
HORA:HH:MM
RM:Cr X / Ur X / K X / Na X / Mg X / Ca X
HI:Hb X / Ht X% / Leuco Xk / Bastões X% / Plaq Xk
EX:NomeExame=Valor

Exemplo:
DATA:2026-04-23
HORA:05:15
HI:Hb 7.5 / Ht 24.2% / Leuco 17.65k / Bastões 4% / Neutrófilos 82% / Plaq 251k
EX:IgG=689 mg/dL
EX:Procalcitonina=1.95 ng/mL`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1000,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    const rawText = await response.text();
    if (!response.ok) {
      let msg = `Gemini error ${response.status}`;
      try { msg = JSON.parse(rawText).error?.message || msg; } catch {}
      return res.status(502).json({ error: msg });
    }

    let geminiResp;
    try { geminiResp = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: 'Resposta inválida' }); }

    const text = (geminiResp.candidates?.[0]?.content?.parts || [])
      .filter(p => !p.thought)
      .map(p => p.text || '').join('');

    console.log('TEXT:', text.slice(0, 600));

    if (!text.trim()) {
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        extras: [], resumo: '[SEM RESPOSTA]', dataColeta: null, horaColeta: null
      });
    }

    const MAP_SISTEMA = {
      'N': 'Neurológico', 'R': 'Respiratório', 'H': 'Hemodinâmico',
      'RM': 'Renal/Metabólico', 'GI': 'Gastrointestinal',
      'HI': 'Hematológico/Infeccioso', 'PA': 'Pele/Acessos'
    };

    const AUTO_CAT = {
      'mg':'Renal/Metabólico','magnésio':'Renal/Metabólico',
      'ca':'Renal/Metabólico','cai':'Renal/Metabólico','cálcio':'Renal/Metabólico',
      'pcr':'Renal/Metabólico','fósforo':'Renal/Metabólico',
      'procalcitonina':'Hematológico/Infeccioso','pct':'Hematológico/Infeccioso',
      'igg':'Hematológico/Infeccioso','imunoglobulina':'Hematológico/Infeccioso',
      'troponina':'Hemodinâmico','bnp':'Hemodinâmico',
      'tgo':'Gastrointestinal','tgp':'Gastrointestinal','bilirrubina':'Gastrointestinal',
      'albumina':'Gastrointestinal','ggt':'Gastrointestinal',
    };

    const sistemas = {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""};
    const extras = [];
    let dataColeta = null;
    let horaColeta = null;

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx <= 0) continue;
      const key = trimmed.slice(0, colonIdx).trim().toUpperCase();
      const val = trimmed.slice(colonIdx + 1).trim();

      if (key === 'DATA') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) dataColeta = val;
        else if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
          const [d,m,y] = val.split('/'); dataColeta = `${y}-${m}-${d}`;
        }
        continue;
      }
      if (key === 'HORA') {
        if (/^\d{2}:\d{2}/.test(val)) horaColeta = val.slice(0,5);
        continue;
      }
      if (key === 'EX') {
        const eqIdx = val.indexOf('=');
        if (eqIdx > 0) {
          const nome = val.slice(0, eqIdx).trim();
          const valor = val.slice(eqIdx + 1).trim();
          const nl = nome.toLowerCase();
          let sugestao = '';
          for (const [k,v] of Object.entries(AUTO_CAT)) {
            if (nl.includes(k)) { sugestao = v; break; }
          }
          extras.push({ nome, valor, sugestao });
        }
        continue;
      }
      if (MAP_SISTEMA[key] && val) sistemas[MAP_SISTEMA[key]] = val;
    }

    // Monta chave com data+hora
    let dataColeta_final = dataColeta;
    if (dataColeta && horaColeta) {
      dataColeta_final = `${dataColeta}T${horaColeta}`;
    }

    console.log('DATA:', dataColeta_final, '| HI:', sistemas['Hematológico/Infeccioso'].slice(0,60));
    return res.status(200).json({ sistemas, extras, resumo: '', dataColeta: dataColeta_final, horaColeta });

  } catch (err) {
    console.error('ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
