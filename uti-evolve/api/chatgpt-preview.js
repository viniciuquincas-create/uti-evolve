import crypto from "node:crypto";
import { buildPreview, newConfirmationToken, parseClinicalTranscript, PREVIEW_TTL_MS, tokenDigest } from "../lib/chatgpt-clinical-flow.js";
import { json, readConfig, requireApiKey, supabaseAdmin, writeConfig } from "../lib/chatgpt-api.js";

export default async function handler(req,res) {
  if (req.method==="GET") return json(res,200,{ok:true,service:"uti-evolve-chatgpt-preview"});
  if (req.method!=="POST") return json(res,405,{ok:false,error:"Method Not Allowed"});
  if (!requireApiKey(req,res)) return;
  try {
    const body=typeof req.body==="string"?JSON.parse(req.body):(req.body || {});
    const parsed=parseClinicalTranscript(body.transcript);
    if (parsed.error) return json(res,422,{ok:false,error:parsed.error,transcript:parsed.transcript || ""});
    const admin=supabaseAdmin();
    const leitos=JSON.parse(await readConfig(admin,"leitos_data") || "[]");
    const preview=buildPreview(leitos,parsed);
    if (preview.error) return json(res,422,{ok:false,error:preview.error,transcript:parsed.transcript});

    const previewId=crypto.randomUUID();
    const confirmationToken=newConfirmationToken();
    const now=Date.now();
    const secret=process.env.CHATGPT_CONFIRMATION_SECRET || process.env.CHATGPT_INTEGRATION_SECRET;
    const pending={version:1,status:"pending",previewId,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+PREVIEW_TTL_MS).toISOString(),transcript:parsed.transcript,command:parsed.command,preview,confirmationDigest:tokenDigest(confirmationToken,secret)};
    await writeConfig(admin,`chatgpt_pending_${previewId}`,pending);
    return json(res,200,{ok:true,requiresConfirmation:true,previewId,confirmationToken,expiresAt:pending.expiresAt,transcript:parsed.transcript,preview,confirmationPrompt:`Confirme explicitamente o lançamento em ${preview.bedName} para ${preview.patientName}.`});
  } catch(error) {
    console.error("ChatGPT preview error",error?.message || error);
    return json(res,500,{ok:false,error:"Falha ao gerar prévia"});
  }
}
