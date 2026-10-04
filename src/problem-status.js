const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
export function removeActiveProblem(patient,item,{resolved=false,date=new Date().toISOString()}={}){
 const names=new Set([item.nome,item.titulo,item.cadastroNome].filter(Boolean).map(normalize));
 const diagnoses=(Array.isArray(patient.diagnosticos)?patient.diagnosticos:String(patient.diagnostico||'').split(' · ')).filter(v=>v&&!names.has(normalize(v)));
 const edits={...(patient.problemasAutomaticosEdicoes||{})};
 if(item.automaticoId)edits[item.automaticoId]={...edits[item.automaticoId],oculto:true,resolvido:resolved};
 return {...patient,diagnosticos:diagnoses,diagnostico:diagnoses.join(' · '),problemasDiagnosticos:(patient.problemasDiagnosticos||[]).filter(p=>p.id!==item.id),problemasAtivosOrdem:(patient.problemasAtivosOrdem||[]).filter(id=>id!==item.id),problemasAutomaticosEdicoes:edits,
 ...(resolved?{problemasResolvidos:[...(patient.problemasResolvidos||[]).filter(p=>p.id!==item.id),{...item,resolvidoEm:date}]}:{})};
}
export function resolvedProcedures(patient){return (patient.procedimentos||[]).filter(p=>p.nome?.trim()).map(p=>`Procedimento: ${p.nome}${p.data?' ('+p.data.split('-').reverse().join('/')+')':''}`);}
