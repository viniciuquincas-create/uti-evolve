import crypto from "node:crypto";
import { applyCommandToLeitos, describeUpdates, findBed, parseWhatsappCommand } from "./whatsapp-command.js";

export const PREVIEW_TTL_MS = 10 * 60 * 1000;

export function parseClinicalTranscript(transcript = "") {
  const clean = String(transcript).trim();
  if (!clean) return { error:"Transcrição vazia" };
  const command = parseWhatsappCommand(clean);
  if (!command.bedNumber) return { error:"Não identifiquei o leito", transcript:clean, command };
  if (!Object.keys(command.updates || {}).length) return { error:"Não identifiquei dados clínicos para lançar", transcript:clean, command };
  return { transcript:clean, command };
}

export function buildPreview(leitos, parsed) {
  const result = applyCommandToLeitos(leitos, parsed.command);
  if (result.error) return { error:result.error };
  return {
    bedId:result.updatedBed.id,
    bedName:result.updatedBed.nome,
    patientName:result.updatedBed.paciente,
    updates:parsed.command.updates,
    updateLabels:describeUpdates(parsed.command.updates),
    ignoredSegments:parsed.command.unknown || [],
  };
}

export const newConfirmationToken = () => crypto.randomBytes(32).toString("base64url");
export const tokenDigest = (token, secret) => crypto.createHmac("sha256", secret).update(String(token)).digest("hex");
export function safeTokenEqual(token, digest, secret) {
  const actual=Buffer.from(tokenDigest(token,secret),"hex");
  const expected=Buffer.from(String(digest || ""),"hex");
  return actual.length===expected.length && crypto.timingSafeEqual(actual,expected);
}
export function applyConfirmedPreview(leitos,pending) {
  const current=findBed(leitos,pending.command.bedNumber);
  if (current.error) return current;
  if (current.bed.id!==pending.preview.bedId || current.bed.paciente!==pending.preview.patientName) {
    return { error:"O paciente do leito mudou desde a prévia; gere uma nova prévia" };
  }
  return applyCommandToLeitos(leitos,pending.command);
}
