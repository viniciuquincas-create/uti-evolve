import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_KEY   = process.env.TWILIO_API_KEY_SID;
const TWILIO_SEC   = process.env.TWILIO_API_KEY_SECRET;
const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM; // ex: whatsapp:+14155238886

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

// VM mode aliases
const VM_MODE_MAP = {
  "psv": "vm_psv", "pressure support": "vm_psv",
  "pcv": "vm_pcv", "pressure control": "vm_pcv",
  "vcv": "vm_vcv", "volume control": "vm_vcv",
  "vni": "vni", "bipap": "vni",
  "cpap": "vm_psv",
  "cnaf": "cnaf", "optiflow": "cnaf",
  "cateter nasal": "cn", "o2": "cn",
  "ar ambiente": "ar",
  "mascara": "ms",
};

// Drug name aliases → protocol key
const DRUG_MAP = {
  "nora": "noradrenalina", "noradrenalina": "noradrenalina", "noradrenaline": "noradrenalina",
  "ad": "adrenalina", "adrenalina": "adrenalina", "epinefrina": "adrenalina",
  "dob": "dobutamina", "dobutamina": "dobutamina",
  "vaso": "vasopressina", "vasopressina": "vasopressina",
  "prop": "propofol", "propofol": "propofol",
  "mid": "midazolam", "midazolam": "midazolam",
  "fent": "fentanil", "fentanil": "fentanil",
  "ket": "cetamina", "cetamina": "cetamina", "ketamina": "cetamina",
  "prec": "precedex", "precedex": "precedex", "dexmet": "precedex",
  "cloni": "clonidina", "clonidina": "clonidina",
  "amiod": "amiodarona", "amiodarona": "amiodarona",
  "furo": "furosemida", "furosemida": "furosemida",
  "ins": "insulina", "insulina": "insulina",
  "levo": "levossimendana",
  "nitro": "nitroglicerina", "nitroglicerina": "nitroglicerina",
  "nitrop": "nitroprussiato", "nitroprussiato": "nitroprussiato",
  "morfina": "morfina",
};

async function parseMessage(msg) {
  const prompt = `Você é um assistente de UTI. Interprete a mensagem abaixo e extraia dados clínicos estruturados.

MENSAGEM: "${msg}"

Retorne APENAS um JSON válido com essa estrutura (omita campos ausentes):
{
  "leito": "número ou nome do leito (string)",
  "drogasVazao": { "chave_droga": "vazão_mL_h" },
  "vm_modo": "um de: vm_psv, vm_pcv, vm_vcv, vni, cnaf, cn, ms, mnr, venturi, ar",
  "vm_ps": "cmH2O",
  "vm_peep": "cmH2O",
  "vm_fio2": "percentual sem % (ex: 40)",
  "vm_fr": "ipm",
  "vm_vt": "mL",
  "vm_pplat": "cmH2O",
  "glicemia": "mg/dL",
  "temp": "Celsius",
  "fc": "bpm",
  "pas": "mmHg",
  "pad": "mmHg"
}

Regras:
- Drogas: nora=noradrenalina, ad=adrenalina, dob=dobutamina, vaso=vasopressina, prop=propofol, mid=midazolam, fent=fentanil, ket=cetamina, prec=precedex, cloni=clonidina, furo=furosemida, ins=insulina
- VM: psv=vm_psv, pcv=vm_pcv, vcv=vm_vcv
- fi/fio2 = FiO2, ps = pressure support, peep = PEEP, vt/vc = volume corrente
- Se não souber o leito, use "desconhecido"
- Retorne apenas o JSON, sem explicações`;

  const resp = await fetch(GEMINI_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function replyWhatsapp(to, body) {
  const auth = Buffer.from(`${TWILIO_KEY}:${TWILIO_SEC}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const params = new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body });
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

async function updateLeito(supabase, leitoNum, parsed) {
  // Find leito by name/number
  const { data: leitos } = await supabase
    .from("leitos")
    .select("id, nome, data")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!leitos?.length) return null;

  // Match by leito field: try exact, then includes
  let target = leitos.find(l => {
    const nome = (l.nome || l.data?.nome || "").toLowerCase();
    const num = leitoNum.toLowerCase().replace("leito", "").trim();
    return nome.includes(num) || nome === num || nome === "leito " + num;
  });
  if (!target) target = leitos[0]; // fallback to first

  const current = typeof target.data === "string"
    ? JSON.parse(target.data || "{}")
    : (target.data || {});

  // Merge drogasVazao
  const drogasVazao = { ...(current.drogasVazao || {}), ...(parsed.drogasVazao || {}) };

  // Build update patch
  const patch = { ...current, drogasVazao };
  const vmFields = ["vm_modo","vm_ps","vm_peep","vm_fio2","vm_fr","vm_vt","vm_pplat"];
  vmFields.forEach(k => { if (parsed[k]) patch[k] = parsed[k]; });
  if (parsed.glicemia || parsed.temp || parsed.fc || parsed.pas || parsed.pad) {
    patch.ultimosVitais = {
      ...(current.ultimosVitais || {}),
      ...(parsed.glicemia && { glicemia: parsed.glicemia }),
      ...(parsed.temp && { temp: parsed.temp }),
      ...(parsed.fc && { fc: parsed.fc }),
      ...(parsed.pas && { pas: parsed.pas }),
      ...(parsed.pad && { pad: parsed.pad }),
    };
  }

  await supabase.from("leitos").update({ data: patch }).eq("id", target.id);
  return { leito: current.nome || target.nome || leitoNum, patch };
}

function buildSummary(leito, parsed) {
  const parts = [];
  if (parsed.drogasVazao) {
    const drogas = Object.entries(parsed.drogasVazao)
      .map(([k, v]) => `${k.charAt(0).toUpperCase()+k.slice(1)} ${v} mL/h`)
      .join(" · ");
    if (drogas) parts.push(drogas);
  }
  if (parsed.vm_modo) {
    const modeLabel = { vm_psv:"PSV", vm_pcv:"PCV", vm_vcv:"VCV", vni:"VNI", cn:"Cateter nasal", ar:"Ar ambiente" };
    let vm = modeLabel[parsed.vm_modo] || parsed.vm_modo;
    if (parsed.vm_ps) vm += ` PS ${parsed.vm_ps}`;
    if (parsed.vm_peep) vm += ` PEEP ${parsed.vm_peep}`;
    if (parsed.vm_fio2) vm += ` FiO₂ ${parsed.vm_fio2}%`;
    parts.push(vm);
  }
  const vitais = [
    parsed.fc && `FC ${parsed.fc}`,
    parsed.glicemia && `Dextro ${parsed.glicemia}`,
    parsed.temp && `T ${parsed.temp}°C`,
  ].filter(Boolean).join(" · ");
  if (vitais) parts.push(vitais);

  return `✅ *Leito ${leito}* atualizado\n${parts.join(" · ")}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const from = req.body?.From || "";
  const msg  = (req.body?.Body || "").trim();

  if (!msg) return res.status(200).send("<Response/>");

  try {
    const parsed = await parseMessage(msg);

    if (!parsed.leito || parsed.leito === "desconhecido") {
      await replyWhatsapp(from, "❓ Não entendi o leito. Ex: \"Leito 1, nora 20, psv ps 10 peep 6 fi 40\"");
      return res.status(200).send("<Response/>");
    }

    const result = await updateLeito(supabase, parsed.leito, parsed);
    const summary = buildSummary(result?.leito || parsed.leito, parsed);
    await replyWhatsapp(from, summary);
  } catch (err) {
    console.error("whatsapp webhook error:", err);
    await replyWhatsapp(from, `⚠️ Erro ao processar: ${err.message}`);
  }

  res.status(200).send("<Response/>");
}
