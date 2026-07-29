import { applyConfirmedPreview, safeTokenEqual } from "../lib/chatgpt-clinical-flow.js";
import { json, readConfig, requireApiKey, supabaseAdmin, writeConfig } from "../lib/chatgpt-api.js";

export default async function handler(req,res) {
  if (req.method!=="POST") return json(res,405,{ok:false,error:"Method Not Allowed"});
  if (!requireApiKey(req,res)) return;
  try {
    const body=typeof req.body==="string"?JSON.parse(req.body):(req.body || {});
    if (body.confirm!==true) return json(res,400,{ok:false,error:"Confirmação explícita obrigatória: confirm=true"});
    if (!body.previewId || !body.confirmationToken) return json(res,400,{ok:false,error:"previewId e confirmationToken são obrigatórios"});
    const admin=supabaseAdmin();
    const pendingKey=`chatgpt_pending_${body.previewId}`;
    const pending=JSON.parse(await readConfig(admin,pendingKey) || "null");
    if (!pending) return json(res,404,{ok:false,error:"Prévia não encontrada"});
    if (pending.status!=="pending") return json(res,409,{ok:false,error:`Prévia já está ${pending.status}`});
    if (Date.now()>Date.parse(pending.expiresAt)) return json(res,410,{ok:false,error:"Prévia expirada; gere uma nova"});
    const secret=process.env.CHATGPT_CONFIRMATION_SECRET || process.env.CHATGPT_INTEGRATION_SECRET;
    if (!safeTokenEqual(body.confirmationToken,pending.confirmationDigest,secret)) return json(res,403,{ok:false,error:"Token de confirmação inválido"});

    const leitos=JSON.parse(await readConfig(admin,"leitos_data") || "[]");
    const evolutions=JSON.parse(await readConfig(admin,"evolucao_data") || "{}");
    const result=applyConfirmedPreview(leitos,evolutions,pending);
    if (result.error) return json(res,422,{ok:false,error:result.error});
    await writeConfig(admin,"leitos_data",result.updatedLeitos);
    await writeConfig(admin,"evolucao_data",result.updatedEvolutions);
    await writeConfig(admin,pendingKey,{...pending,status:"confirmed",confirmedAt:new Date().toISOString(),confirmationDigest:"used"});
    return json(res,200,{ok:true,confirmed:true,previewId:pending.previewId,bed:{id:result.updatedBed.id,name:result.updatedBed.nome,patientName:result.updatedBed.paciente},updates:pending.preview.updateLabels});
  } catch(error) {
    console.error("ChatGPT confirm error",error?.message || error);
    return json(res,500,{ok:false,error:"Falha ao confirmar lançamento"});
  }
}
