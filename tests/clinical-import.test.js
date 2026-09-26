import test from 'node:test';
import assert from 'node:assert/strict';
import {parsearEntradaClinica,normalizarDadosExtraidos,validarDataImportacao,tipoArquivoClinico,mesclarLinhaImportada} from '../src/clinical-import.js';
import {createClinicalImportHandler} from '../api/import-clinical.js';

test('separa exames e controles sem criar exames espúrios e ordena intervalos',()=>{
 const r=parsearEntradaClinica('Hb 9,8 / Cr 1,2 / T 37 - 36 / FC 100 - 70 / BH -900 / BE -4 / Leuco 12k');
 assert.deepEqual(r,{valores:{hb:'9.8',cr:'1.2',c24_temp:'36 - 37',c24_fc:'70 - 100',c24_bh:'-900',be:'-4',leuco:'12000'},pendencias:[]});
});
test('preserva zero e sinais; texto desconhecido exige reconhecimento',()=>{
 assert.deepEqual(parsearEntradaClinica('T 37/36; DU 0\nNa: 140\ntexto incerto'),{valores:{c24_temp:'36 - 37',c24_diur:'0',na:'140'},pendencias:['texto incerto']});
 assert.throws(()=>parsearEntradaClinica('Hb 8 / Hb 10'),/diferentes/);
});
test('classifica o resultado extraído, sem inferir datas nem misturar pacientes',()=>{
 assert.deepEqual(normalizarDadosExtraidos({exames:{hemoglobina:'9,8',be:'-4'},controles:{c24_temp:'37 / 36',c24_bh:'-900',c24_diur:0},dataColeta:'2026-09-25'}),{valores:{hb:'9.8',be:'-4',c24_temp:'36 - 37',c24_bh:'-900',c24_diur:'0'},data:'2026-09-25'});
 assert.throws(()=>normalizarDadosExtraidos({multiplosPacientes:true}),/mais de um/);
 assert.throws(()=>normalizarDadosExtraidos({multiplasDatas:true}),/mais de um/);
 assert.throws(()=>normalizarDadosExtraidos({avisos:['valor ilegível']}),/ilegível/);
 assert.throws(()=>normalizarDadosExtraidos({exames:{hb:'ilegível'}}),/reconhecer/);
 assert.throws(()=>validarDataImportacao('2026-02-30'),/válida/);
});
test('tipos e limite de arquivo',()=>{
 assert.equal(tipoArquivoClinico({name:'coleta.pdf',size:1024}),'application/pdf');
 assert.equal(tipoArquivoClinico({name:'coleta.docx',size:1024}),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 assert.throws(()=>tipoArquivoClinico({name:'foto.png',size:4*1024*1024}),/3 MB/);
 assert.throws(()=>tipoArquivoClinico({name:'programa.exe',size:100}),/Use imagem/);
});
const res=()=>({statusCode:200,status(n){this.statusCode=n;return this},json(value){this.body=value;return this}});
test('endpoint exige sessão antes de chamar o modelo',async()=>{
 let called=false;const h=createClinicalImportHandler({authorizeRequest:async()=>false,requestModel:async()=>{called=true}}),r=res();
 await h({method:'POST',headers:{},body:{text:'Hb 10'}},r);assert.equal(r.statusCode,401);assert.equal(called,false);
});
test('endpoint envia imagem/PDF e texto sem perder o tipo e propaga resultado JSON',async()=>{
 const before=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only';
 try{for(const mime of ['application/pdf','image/png']){
 let request;const h=createClinicalImportHandler({authorizeRequest:async()=>true,requestModel:async(_url,options)=>{request=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({exames:{hb:'10'},controles:{c24_temp:'36 - 37'}})}]}}]})}}}),r=res();
 await h({method:'POST',headers:{},body:{text:'BH -900',fileBase64:'dGVzdA==',mimeType:mime}},r);
 assert.equal(r.statusCode,200);assert.equal(request.contents[0].parts[1].inline_data.mime_type,mime);assert.equal(r.body.exames.hb,'10');assert.ok(request.contents[0].parts[2].text.includes('BH -900'));
 }}finally{if(before===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=before;}
});
test('endpoint rejeita arquivo inválido',async()=>{
 const h=createClinicalImportHandler({authorizeRequest:async()=>true}),r=res();await h({method:'POST',headers:{},body:{fileBase64:'test',mimeType:'application/exe'}},r);assert.equal(r.statusCode,400);
});

test('exames adicionais e gasometria ficam visíveis e não duplicam na repetição',()=>{
 const valores={pcr:'12',pct:'2',ph:'7.3',be:'-4',c24_temp:'36 - 37'};
 const row=mesclarLinhaImportada({},valores,'2026-09-26');
 assert.equal(row._extra_pcr,'12');assert.equal(row._extra_procalcitonina,'2');
 assert.equal(JSON.parse(row._gasos)[0].ph,'7.3');
 assert.equal(JSON.parse(mesclarLinhaImportada(row,valores,'2026-09-26')._gasos).length,1);
 assert.throws(()=>normalizarDadosExtraidos({controles:{c24_temp:'-'}}),/reconhecer/);
});
