import test from 'node:test';import assert from 'node:assert/strict';import {revealSbariFields,sbariVisibleFields} from '../src/sbari-visibility.js';
test('imported optional fields open even when previously hidden; empty fields stay hidden',()=>{
 const merged=revealSbariFields({nEFExtra:'West Haven II',rmTRS:'HD',nObs:'',_vis_:{nEFExtra:false,nObs:false,cvObs:true}},{nEFExtra:'West Haven II',rmTRS:'HD',nObs:'',custom:[]});
 assert.equal(merged._vis_.nEFExtra,true);assert.equal(merged._vis_.rmTRS,true);assert.equal(merged._vis_.nObs,false);assert.equal(merged._vis_.cvObs,true);
 assert.equal(sbariVisibleFields(JSON.parse(JSON.stringify({...merged,_vis_:{nEFExtra:false}}))).nEFExtra,true);
});
test('legacy SBARI fields and consultation panels are revealed',()=>{
 assert.equal(sbariVisibleFields({rmTRS:'HD',_datas:{rmTRS:'2026-10-01T12:00:00.000Z'}}).rmTRS,true);
 const e=revealSbariFields({res_exames:[{id:'x',resultado:'Laudo'}]}, {res_exames:[{id:'x',resultado:'Laudo'}]});assert.equal(e._vis_.add_res_exames,true);
 assert.deepEqual(sbariVisibleFields({nObs:'',_sbariVisibleFields:{nObs:true}}),{});
});
