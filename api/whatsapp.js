const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_KEY  = process.env.TWILIO_API_KEY_SID;
const TWILIO_SEC  = process.env.TWILIO_API_KEY_SECRET;
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM;
const SB_URL      = process.env.SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_KEY;
const GEMINI_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_MDL  = "gemini-2.0-flash";
const GEMINI_URL  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MDL}:generateContent?key=${GEMINI_KEY}`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "uti-evolve-whatsapp" });
  }
  if (req.method !== "POST") {
    return res.status(200).send("<Response/>");
  }

  const from = req.body && req.body.From ? req.body.From : "";
  const msg  = req.body && req.body.Body ? String(req.body.Body).trim() : "";
  if (!msg) return res.status(200).send("<Response/>");

  console.log("WA recv:", from, msg);

  try {
    const parsed = await parseMsg(msg);
    const leitoNome = await updateLeito(parsed);
    const txt = buildSummary(leitoNome, parsed);
    await sendReply(from, txt);
    console.log("WA sent:", txt);
  } catch (err) {
    console.error("WA err:", err.message);
    try { await sendReply(from, "Erro interno. Tente novamente."); } catch(_) {}
  }

  return res.status(200).send("<Response/>");
}

async function parseMsg(msg) {
  const prompt = "Interprete a mensagem de UTI e retorne APENAS JSON valido:\n{\"leito\":\"string\",\"drogasVazao\":{\"chave\":\"mLh\"},\"vm_modo\":\"vm_psv|vm_pcv|vm_vcv|vni|cnaf|cn|ar\",\"vm_ps\":\"\",\"vm_peep\":\"\",\"vm_fio2\":\"\",\"vm_fr\":\"\",\"vm_vt\":\"\"}\n\nAliases: nora=noradrenalina,ad=adrenalina,dob=dobutamina,vaso=vasopressina,prop=propofol,mid=midazolam,fent=fentanil,ket=cetamina,prec=precedex,psv=vm_psv,pcv=vm_pcv,vcv=vm_vcv,fi=vm_fio2,ps=vm_ps,peep=vm_peep\n\nMENSAGEM: " + msg;

  const r = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const d = await r.json();
  const raw = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text) ? d.candidates[0].content.parts[0].text : "{}";
  const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

async function updateLeito(parsed) {
  if (!parsed || !parsed.leito || parsed.leito === "desconhecido") return "?";
  const heads = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" };
  const r = await fetch(SB_URL + "/rest/v1/leitos?select=id,data&limit=100", { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } });
  const rows = await r.json();
  if (!rows || !rows.length) return parsed.leito;
  const num = parsed.leito.toLowerCase().replace("leito", "").trim();
  let target = null;
  for (let i = 0; i < rows.length; i++) {
    const d = (typeof rows[i].data === "string") ? JSON.parse(rows[i].data || "{}") : (rows[i].data || {});
    const nome = (d.nome || "").toLowerCase().replace("leito", "").trim();
    if (nome === num) { target = rows[i]; break; }
  }
  if (!target) target = rows[0];
  const cur = (typeof target.data === "string") ? JSON.parse(target.data || "{}") : (target.data || {});
  const patch = Object.assign({}, cur);
  if (parsed.drogasVazao) {
    patch.drogasVazao = Object.assign({}, cur.drogasVazao || {}, parsed.drogasVazao);
  }
  const vmKeys = ["vm_modo","vm_ps","vm_peep","vm_fio2","vm_fr","vm_vt"];
  for (let i = 0; i < vmKeys.length; i++) {
    if (parsed[vmKeys[i]]) patch[vmKeys[i]] = parsed[vmKeys[i]];
  }
  await fetch(SB_URL + "/rest/v1/leitos?id=eq." + target.id, { method: "PATCH", headers: heads, body: JSON.stringify({ data: patch }) });
  return cur.nome || parsed.leito;
}

async function sendReply(to, body) {
  const auth = Buffer.from(TWILIO_KEY + ":" + TWILIO_SEC).toString("base64");
  const params = new URLSearchParams();
  params.set("From", TWILIO_FROM);
  params.set("To", to);
  params.set("Body", body);
  await fetch("https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_SID + "/Messages.json", {
    method: "POST",
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

function buildSummary(leitoNome, parsed) {
  const parts = ["Leito " + leitoNome + " atualizado"];
  if (parsed && parsed.drogasVazao) {
    const names = Object.keys(parsed.drogasVazao);
    for (let i = 0; i < names.length; i++) {
      const k = names[i];
      parts.push(k.charAt(0).toUpperCase() + k.slice(1) + " " + parsed.drogasVazao[k] + "mL/h");
    }
  }
  if (parsed && parsed.vm_modo) {
    const modeMap = { vm_psv:"PSV", vm_pcv:"PCV", vm_vcv:"VCV", vni:"VNI", cnaf:"CNAF", cn:"Cateter nasal", ar:"Ar ambiente" };
    let vm = modeMap[parsed.vm_modo] || parsed.vm_modo;
    if (parsed.vm_ps) vm = vm + " PS " + parsed.vm_ps;
    if (parsed.vm_peep) vm = vm + " PEEP " + parsed.vm_peep;
    if (parsed.vm_fio2) vm = vm + " FiO2 " + parsed.vm_fio2 + "%";
    parts.push(vm);
  }
  return parts.join(" | ");
}
