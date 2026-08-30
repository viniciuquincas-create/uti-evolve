import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

async function authorize(req){
  const session=String(req.headers["x-uti-session"]||""),url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!session||!url||!key)return false;
  const db=createClient(url,key,{auth:{persistSession:false}}),{data,error}=await db.from("config").select("value").eq("key","pwd_hash").single();
  if(error||!data?.value)return false;const a=Buffer.from(session),b=Buffer.from(String(data.value));return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

const prompt=`Você receberá uma foto de uma FOLHA DE COLETA manuscrita da UTI Evolve em formato de TABELA: cada coluna corresponde a um LEITO/PACIENTE e os nomes dos parâmetros ficam nas linhas à esquerda.
Transcreva somente o que estiver legível. Não invente nem complete valores. Preserve sinais negativos e casas decimais.
Retorne APENAS JSON válido, sem markdown, nesta estrutura:
{"data":"AAAA-MM-DD ou vazio","leitos":[{"leito":"","paciente":"","labs":{"hb":"","ht":"","leuco":"","plaq":"","cr":"","ur":"","na":"","k":"","mg":"","cai":"","p":"","pcr":"","ph":"","pco2":"","po2":"","hco3":"","be":"","lact":""},"controles":{"c24_temp":"","c24_fc":"","c24_fr":"","c24_sat":"","c24_pam":"","c24_dextro":"","c24_diur":"","c24_bh":""},"evolucao":{"nEF":"","cvEF":"","reEF":"","rm24h":"","tgEF":"","heLabs":""},"observacoes":""}]}
Inclua apenas colunas que tenham algum dado manuscrito. Siga verticalmente cada coluna e use o número impresso do leito para não misturar dados entre pacientes.`;

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Método não permitido"});
  try{
    if(!await authorize(req))return res.status(401).json({error:"Sessão inválida. Entre novamente no UTI Evolve."});
    const image=String(req.body?.imageBase64||""),mimeType=String(req.body?.mimeType||"image/jpeg");
    if(!image)return res.status(400).json({error:"Imagem não fornecida."});
    const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("A análise de imagem não foi configurada no servidor.");
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:mimeType,data:image}}]}],generationConfig:{temperature:0,maxOutputTokens:5000,responseMimeType:"application/json"}})});
    const payload=await response.json();if(!response.ok||payload.error)throw new Error(payload.error?.message||"Não foi possível analisar a folha.");
    const raw=payload.candidates?.[0]?.content?.parts?.[0]?.text||"";let parsed;
    try{parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{throw new Error("A imagem foi lida, mas os dados não puderam ser estruturados. Tente uma foto mais nítida.");}
    return res.status(200).json({data:parsed.data||"",leitos:Array.isArray(parsed.leitos)?parsed.leitos:[]});
  }catch(error){return res.status(500).json({error:error?.message||"Falha ao analisar a folha de coleta."});}
}
