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

    // Usa gemini-2.5-flash com thinking desabilitado para resposta direta
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const prompt = `Analise esta imagem de exames laboratoriais ou controles de UTI.
IGNORE: nomes, datas de nascimento, prontuários, médicos, assinaturas.
Extraia APENAS valores numéricos de exames e sinais vitais.

Responda SOMENTE com linhas no formato CHAVE:VALOR, uma por linha.
Use estas chaves exatas:
RM para Renal/Metabólico (Cr, Ur, Na, K, Mg, Ca, P, pH, HCO3, Lactato, Glicemia, PCR, BH, Diurese)
HI para Hematológico (Hb, Ht, Leuco, Bastões, Plaq, RNI, TTPA, Procalcitonina)
H para Hemodinâmico (FC, PA, PAM, DVA, Troponina, BNP)
R para Respiratório (FR, Sat, FiO2, PEEP, pO2, pCO2)
GI para Gastrointestinal/Hepático (TGO, TGP, Bili, Albumina, GGT)
N para Neurológico
EX para cada exame não categorizado (formato: NomeExame=Valor)

Exemplo de resposta:
RM:Cr 1.27 / Ur 47 / K 4.1 / Na 141 / Mg 1.9 / PCR 85
HI:Hb 7.0 / Ht 23% / Leuco 11.17k / Plaq 204k
EX:Amilase=320 U/L
EX:Lipase=180 U/L`;

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
    console.log('STATUS:', response.status);

    if (!response.ok) {
      let msg = `Gemini error ${response.status}`;
      try { msg = JSON.parse(rawText).error?.message || msg; } catch {}
      return res.status(502).json({ error: msg });
    }

    let geminiResp;
    try { geminiResp = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: 'Resposta inválida' }); }

    const text = (geminiResp.candidates?.[0]?.content?.parts || [])
      .filter(p => !p.thought) // ignora partes de raciocínio
      .map(p => p.text || '').join('');
    
    console.log('TEXT:', text.slice(0, 500));

    if (!text.trim()) {
      return res.status(200).json({
        sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
        extras: [], resumo: '[SEM RESPOSTA]'
      });
    }

    // Parse do formato chave:valor linha por linha
    const MAP = {
      'N': 'Neurológico', 'R': 'Respiratório', 'H': 'Hemodinâmico',
      'RM': 'Renal/Metabólico', 'GI': 'Gastrointestinal',
      'HI': 'Hematológico/Infeccioso', 'PA': 'Pele/Acessos'
    };

    const AUTO_CAT = {
      'mg':'Renal/Metabólico','magnésio':'Renal/Metabólico',
      'ca':'Renal/Metabólico','cai':'Renal/Metabólico','cálcio':'Renal/Metabólico',
      'pcr':'Renal/Metabólico','fósforo':'Renal/Metabólico','fosforo':'Renal/Metabólico',
      'procalcitonina':'Hematológico/Infeccioso','pct':'Hematológico/Infeccioso',
      'troponina':'Hemodinâmico','bnp':'Hemodinâmico',
      'tgo':'Gastrointestinal','tgp':'Gastrointestinal','bilirrubina':'Gastrointestinal',
      'albumina':'Gastrointestinal','ggt':'Gastrointestinal','amilase':'Gastrointestinal','lipase':'Gastrointestinal',
    };

    const sistemas = {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""};
    const extras = [];

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Formato EX:Nome=Valor
      if (trimmed.startsWith('EX:')) {
        const rest = trimmed.slice(3);
        const eqIdx = rest.indexOf('=');
        if (eqIdx > 0) {
          const nome = rest.slice(0, eqIdx).trim();
          const valor = rest.slice(eqIdx + 1).trim();
          const nl = nome.toLowerCase();
          let sugestao = '';
          for (const [k,v] of Object.entries(AUTO_CAT)) {
            if (nl.includes(k)) { sugestao = v; break; }
          }
          extras.push({ nome, valor, sugestao });
        }
        continue;
      }

      // Formato CHAVE:valor
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim();
        if (MAP[key] && val) {
          sistemas[MAP[key]] = val;
        }
      }
    }

    console.log('PARSED RM:', sistemas['Renal/Metabólico'].slice(0,60));
    console.log('PARSED HI:', sistemas['Hematológico/Infeccioso'].slice(0,60));
    console.log('EXTRAS:', extras.length);

    return res.status(200).json({ sistemas, extras, resumo: '' });

  } catch (err) {
    console.error('ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
