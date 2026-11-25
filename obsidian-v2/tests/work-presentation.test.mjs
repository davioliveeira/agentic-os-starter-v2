import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['shared/work-presentation.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {isOpenWork,isHistoryWork,taskStatus,workLabel,shortTaskTitle}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('terminal lifecycle puts only closed or process-free failed tasks in history',()=>{
 for(const state of ['starting','working','ready','editing','needs input','stopping']){
  assert.equal(isOpenWork({state,pid:null}),true,state);assert.equal(isHistoryWork({state,pid:null}),false,state);
 }
 for(const state of ['stopped','error']){
  assert.equal(isOpenWork({state,pid:null}),false,state);assert.equal(isHistoryWork({state,pid:null}),true,state);
  assert.equal(isOpenWork({state,pid:1234}),true,'a live process must remain accessible');assert.equal(isHistoryWork({state,pid:1234}),false);
 }
 assert.equal(isOpenWork(undefined),false);assert.equal(isHistoryWork(undefined),false);
});

test('status preserves needs-input and error semantics without treating closed as successful',()=>{
 const expected={starting:'Iniciando',working:'Em execução','needs input':'Precisa de resposta',ready:'Pronto',editing:'Editando',stopping:'Parando',stopped:'Encerrado',error:'Precisa de atenção'};
 for(const [state,label] of Object.entries(expected)){assert.equal(taskStatus({state}),label);assert.equal(workLabel({state}),label)}
 const previousAnswer={state:'stopped',turns:[{text:'An earlier turn succeeded'}],error:null};assert.equal(taskStatus(previousAnswer),'Encerrado');
 assert.equal(taskStatus({state:'error',pid:2345}),'Precisa de atenção');assert.equal(taskStatus({state:'new-provider-state'}),'Estado desconhecido');assert.equal(isOpenWork({state:'new-provider-state'}),true);
 assert.equal(taskStatus(null),'Nenhuma tarefa selecionada');
});

test('direct scripts follow task lifecycle without being mistaken for success on cancellation',()=>{
 const script={execution:'script',pid:null,title:'Pull metrics'};
 assert.equal(isOpenWork({...script,state:'working'}),true);assert.equal(taskStatus({...script,state:'stopping'}),'Parando');
 assert.equal(isHistoryWork({...script,state:'stopped'}),true);assert.equal(taskStatus({...script,state:'stopped'}),'Encerrado');
 assert.equal(isHistoryWork({...script,state:'error'}),true);assert.equal(taskStatus({...script,state:'error'}),'Precisa de atenção');
});

test('task titles normalize whitespace, preserve Unicode and fall back without model calls',()=>{
 assert.equal(shortTaskTitle({state:'working',title:'  Review\n\t pricing   changes '}),'Review pricing changes');
 assert.equal(shortTaskTitle({state:'working',title:'Compare 🌌 galaxy options'},10),'Compare 🌌…');
 assert.equal(shortTaskTitle({state:'stopped',title:' ',provider:'codex'}),'Tarefa do Codex');assert.equal(shortTaskTitle({state:'working',provider:'claude'}),'Tarefa do Claude');
 assert.equal(shortTaskTitle({state:'working',execution:'script',provider:'codex'}),'Atualização da fonte');assert.equal(shortTaskTitle({state:'working'}),'Tarefa do agente');
 assert.equal(shortTaskTitle({state:'working',title:'Long name'},1),'…');
});
