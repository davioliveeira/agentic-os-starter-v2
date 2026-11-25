import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {routeVoice} from '../runner/bridge-core.mjs';
import {invalidateVoiceSnapshot,voiceMemory} from '../runner/voice-router.mjs';
import {invalidateTargetIndex,openIntent} from '../runner/voice-targets.mjs';
import {localDate} from '../runner/brief-voice.mjs';
import {shiftIso} from '../runner/spoken-dates.mjs';

// End-to-end through routeVoice with fake terminals: the exact utterances from
// the 2026-09-15/16 transcripts, plus dated, named, ambiguous and worker-file asks.
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'voice-open-routing-')));
 t.after(()=>{invalidateVoiceSnapshot(root);invalidateTargetIndex(root);fs.rmSync(root,{recursive:true,force:true})});
 const write=(relative,text='# Saved report\n')=>{const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return relative};
 const today=localDate(),yesterday=shiftIso(today,-1),older=shiftIso(today,-4);
 const intel={today:write(`inbox/research/morning-intel/${today}-intel.md`,'## Top Story\nA saved public headline.\n'),yesterday:write(`inbox/research/morning-intel/${yesterday}-intel.md`),older:write(`inbox/research/morning-intel/${older}-intel.md`)};
 write('projects/2026-05-10-skoot-crm-playbook.md');write('projects/2026-04-30-content-backfill-plan.md');write('projects/2026-05-02-content-calendar-plan.md');
 const calls=[],sessions=[],reopened=[];
 const terminals={live:new Map(),list:()=>sessions,get:id=>{const s=sessions.find(s=>s.id===id);if(!s)throw new Error('Task not found');return s},start:task=>{calls.push({kind:'start',...task});return {id:task.id}},send:(id,text)=>{calls.push({kind:'send',id,text})},startWorkflow:task=>{calls.push({kind:'workflow',...task});return {id:task.id}}};
 const speak=(transcript,{provider='codex',appScope='native',workTarget=null,execute=()=>assert.fail(`Opening must not call a model: ${transcript}`),conversationEpoch}={})=>routeVoice(root,{id:crypto.randomUUID(),selection:{provider,model:provider==='codex'?'astra':'sonnet'},appScope,transcript,terminalMode:true,workTarget,conversationEpoch},undefined,execute,terminals,{resolveCli:()=>({command:'unused',prefix:[]}),reopenArtifact:item=>reopened.push(item)});
 return {root,write,speak,terminals,calls,sessions,reopened,intel,today,yesterday,older};
}
const opened=(result,path)=>{assert.equal(result.deliverable,path);assert.equal(result.reveal,'open');assert.equal(result.reply,'');assert.equal(result.model,null);assert.equal(result.engine,'rules');assert.deepEqual(result.workIds,[]);assert.ok([undefined,'open'].includes(result.lookupRoute))};

for(const appScope of ['native','web'])test(`${appScope}: the September 16 phrasing opens today's brief instead of summarizing it`,async t=>{
 const f=fixture(t);
 opened(await f.speak('Can you pull up the morning Intel brief from this morning?',{appScope}),f.intel.today);
 opened(await f.speak('Can you pull up the morning Intel brief for me?',{appScope,provider:'claude'}),f.intel.today);
 opened(await f.speak("Open yesterday's intel brief",{appScope}),f.intel.yesterday);
 assert.equal(f.calls.length,0);
});

for(const appScope of ['native','web'])test(`${appScope}: Portuguese navigation uses the existing note and workspace actions`,async t=>{
 const f=fixture(t),note=f.write('projects/plano-de-integracao.md'),daily=f.write(`daily-notes/${f.yesterday}.md`);
 for(const provider of ['codex','claude']){
  opened(await f.speak('Abra o boletim da manhã de ontem.',{appScope,provider}),f.intel.yesterday);
  opened(await f.speak('Abra a nota diária de ontem.',{appScope,provider}),daily);
  const missing=await f.speak('Abra a nota Documento Inexistente de ontem.',{appScope,provider});
  assert.match(missing.reply,/com o nome "documento inexistente" para ontem/);
  for(const [utterance,action] of [
   ['Abra a nota Plano de integração.',{op:'open-note',query:note}],
   ['Abra a nota Plano de integração na barra lateral esquerda.',{op:'open-note',query:note,where:'left-sidebar'}],
   ['Abra minha nota diária de hoje.',{op:'daily-note'}],
   ['Abra o painel.',{op:'cockpit'}],
   ['Abra o terminal.',{op:'command',id:'terminal:open-terminal.default.root',label:'terminal'}],
   ['Abra o Google Agenda na barra lateral esquerda.',{op:'web',url:'https://calendar.google.com',label:'Google Agenda',where:'left-sidebar'}],
   ['Abra o Gmail.',{op:'web',url:'https://mail.google.com',label:'Gmail',where:undefined}],
   ['Abra o YouTube Studio.',{op:'web',url:'https://studio.youtube.com',label:'YouTube Studio',where:undefined}],
   ['Abra o repositório ctskool/agentic-os-starter-v2.',{op:'repo',slug:'ctskool/agentic-os-starter-v2'}],
   ...(appScope==='native'?[
    ['Feche esta aba.',{op:'command',id:'workspace:close',label:'fechar aba'}],
    ['Volte no histórico.',{op:'command',id:'app:go-back',label:'voltar no histórico'}],
    ['Avance no histórico.',{op:'command',id:'app:go-forward',label:'avançar no histórico'}],
    ['Divida a tela à direita.',{op:'command',id:'workspace:split-vertical',label:'dividir à direita'}],
    ['Divida a tela para baixo.',{op:'command',id:'workspace:split-horizontal',label:'dividir para baixo'}],
    ['Alterne a barra lateral esquerda.',{op:'command',id:'app:toggle-left-sidebar',label:'alternar barra lateral esquerda'}],
    ['Alterne a barra lateral direita.',{op:'command',id:'app:toggle-right-sidebar',label:'alternar barra lateral direita'}],
    ['Abra o gráfico do cofre.',{op:'command',id:'graph:open',label:'abrir visualização em grafo'}],
    ['Busque no cofre por plano de integração.',{op:'search',query:'plano de integração'}],
   ]:[]),
  ]){
   const result=await f.speak(utterance,{appScope,provider});
   assert.deepEqual(result.obsidian,action,utterance);assert.equal(result.engine,'rules');assert.deepEqual(result.workIds,[]);
  }
 }
 assert.deepEqual(f.calls,[]);
});

test('opening a Portuguese note does not drop other actions, conditions, or a question',()=>{
 for(const utterance of [
  'Não abra a nota Plano de integração.',
  'Como abro a nota Plano de integração?',
  'Abra a nota Plano de integração e escreva um resumo.',
  'Abra a nota Plano de integração e me diga o que está escrito.',
  'Crie outro documento. Abra a nota Plano de integração.',
  'Abra a nota Plano de integração somente se eu confirmar.',
  'Abra a nota Plano de integração quando eu terminar.',
  'Abra a nota Plano de integração ou o boletim da manhã.',
 ])assert.equal(openIntent(utterance),null,utterance);
});

test('a dated report that does not exist gets an honest answer and an offer that can be accepted in either language',async t=>{
 const f=fixture(t);
 const missingDate=shiftIso(f.today,-2);
 const missing=await f.speak(`Pull up the intel from ${missingDate}`);
 assert.equal(missing.deliverable,null);assert.equal(missing.reveal,null);assert.match(missing.reply,/^Não encontrei boletim de IA para /);assert.match(missing.reply,/Quer que eu abra essa opção\?$/);
 assert.equal(missing.lookup.source,'open-offer');assert.equal(missing.lookup.path,f.intel.older);
 opened(await f.speak('yes'),f.intel.older);
 assert.equal((await f.speak(`Pull up the intel from ${missingDate}`)).lookup.source,'open-offer');
 opened(await f.speak('Sim, por favor.'),f.intel.older);
 const none=await f.speak('open the inbox brief from last week');
 assert.match(none.reply,/^Não encontrei resumo da caixa de entrada para a semana passada nos arquivos salvos\.$/);assert.equal(none.lookup,undefined);
 assert.equal(f.calls.length,0);
});

test('named notes open by title, speech errors tolerated, and a tie becomes one question with a working follow-up',async t=>{
 const f=fixture(t);
 const note=(result,path)=>{assert.deepEqual(result.obsidian,{op:'open-note',query:path});assert.equal(result.reply,'');assert.equal(result.model,null);assert.equal(result.engine,'rules');assert.deepEqual(result.workIds,[])};
 note(await f.speak('Can you pull the scoot CRM playbook up?'),'projects/2026-05-10-skoot-crm-playbook.md');
 note(await f.speak('open the skoot playbook',{appScope:'web'}),'projects/2026-05-10-skoot-crm-playbook.md');
 const placed=await f.speak('open the skoot playbook on the right');
 assert.deepEqual(placed.obsidian,{op:'open-note',query:'projects/2026-05-10-skoot-crm-playbook.md',where:'right-sidebar'});assert.equal(placed.deliverable,null);
 const ambiguous=await f.speak('open the content plan');
 assert.match(ambiguous.reply,/^Encontrei 2 opções: content calendar plan ou content backfill plan\. Qual delas\?$/);
 assert.equal(ambiguous.lookup.source,'open-candidates');assert.equal(ambiguous.deliverable,null);
 note(await f.speak('the second one'),'projects/2026-04-30-content-backfill-plan.md');
 assert.equal((await f.speak('open the content plan')).lookup?.source,'open-candidates');
 note(await f.speak('a segunda'),'projects/2026-04-30-content-backfill-plan.md');
 const unknown=await f.speak('open the quarterly tax memo');
 assert.match(unknown.reply,/Não encontrei nada com o nome "the quarterly tax memo"/);assert.deepEqual(unknown.workIds,[]);
 assert.equal(f.calls.length,0);
});

test('voice history keeps the newer reply last when two receipts share a timestamp',t=>{
 const f=fixture(t),ts=Date.now();
 const writeReceipt=(filename,transcript,mtime)=>{
  const relative=f.write(`system/v2/voice-results/${filename}.json`,JSON.stringify({ts,provider:'codex',transcript,reply:'',appScope:'native'}));
  fs.utimesSync(path.join(f.root,relative),mtime,mtime);
 };
 writeReceipt('a-newer','Open the content plan',new Date(ts));
 writeReceipt('z-older','Open the playbook',new Date(ts-1000));
 assert.deepEqual(voiceMemory(f.root,'codex','native').map(turn=>turn.you),['Open the playbook','Open the content plan']);
});

test('a selected conversation reopens its registered file without a worker turn; an HTML-only result is explained',async t=>{
 const f=fixture(t);
 const png={id:'a'.repeat(40),taskId:'11111111-1111-4111-8111-111111111111',turnId:'t1',path:'system/v2/artifacts/files/'+'0'.repeat(64)+'.png',label:'Jev preview',mime:'image/png',bytes:4,open:true,isFinal:true};
 const task={id:png.taskId,provider:'codex',model:'astra',title:'Jev explainer',state:'ready',execution:'native',created:Date.now(),turns:[{id:'t1',ts:Date.now(),text:'Done.',artifacts:[png]}]};
 f.sessions.push(task);
 const shown=await f.speak("Can't you pull up that explainer in one of the obsidian tabs?",{workTarget:task.id});
 assert.deepEqual(f.reopened.map(r=>({taskId:r.taskId,artifactId:r.artifact.id})),[{taskId:task.id,artifactId:png.id}]);
 assert.deepEqual(shown.reopened,{taskId:task.id,artifactId:png.id,label:'Jev preview'});assert.equal(shown.reply,'');assert.deepEqual(shown.workIds,[]);assert.equal(shown.workTarget,task.id);
 await f.speak('Now, can you just pull it up for me? Can you pull up the report so I can see it inside of Obsidian?',{workTarget:task.id});
 assert.equal(f.reopened.length,2);assert.equal(f.calls.length,0);
 const localized=await f.speak('Mostre a imagem que você fez.',{workTarget:task.id});
 assert.deepEqual(localized.reopened,{taskId:task.id,artifactId:png.id,label:'Jev preview'});assert.equal(f.reopened.length,3);
 // Real work follow-ups still continue the conversation.
 await f.speak('change the colors to blue',{workTarget:task.id,execute:async()=>({text:JSON.stringify({tier:3,reply:'On it.'})})});
 assert.equal(f.calls.at(-1)?.kind,'send');assert.match(f.calls.at(-1).text,/^change the colors to blue/);
 const html={id:'22222222-2222-4222-8222-222222222222',provider:'codex',model:'astra',title:'HTML explainer',state:'ready',execution:'native',created:Date.now(),turns:[{id:'t1',ts:Date.now(),text:'Done.\n\n[View the explainer](<'+f.root.replace(/\\/g,'/')+'/outputs/jev-explainer/jev-explainer.html>)',artifactErrors:['This artifact type is not supported for preview.']}]};
 f.sessions.push(html);
 const explained=await f.speak('pull it up',{workTarget:html.id});
 assert.match(explained.reply,/^O arquivo dessa conversa está no formato html e não pode ser exibido no Obsidian nem no painel\. Ele está salvo em outputs\/jev-explainer\/jev-explainer\.html\.$/);
 assert.equal(f.reopened.length,3);assert.equal(f.calls.filter(c=>c.kind==='send').length,1);
});

test('what was just read aloud can be pulled up next, and questions are untouched',async t=>{
 const f=fixture(t);
 const headline=await f.speak('What was the top AI news today?');
 assert.match(headline.reply,/saved public headline/);assert.equal(headline.reveal,null);
 opened(await f.speak('pull that up'),f.intel.today);
 opened(await f.speak('can you show me the brief again'),f.intel.today);
 let calls=0;
 const question=await f.speak('What is my schedule looking like today?',{execute:async()=>{calls++;return {text:JSON.stringify({tier:2,reply:'Nothing scheduled.'})}}});
 assert.equal(question.reveal,null);assert.equal(question.deliverable,null);
 assert.equal(f.calls.length,0);
});

for(const {provider,appScope} of [{provider:'codex',appScope:'native'},{provider:'claude',appScope:'web'}])test(`${appScope}: Portuguese reading speaks the requested saved report without opening it`,async t=>{
 const f=fixture(t);
 f.write(f.intel.yesterday,'\uFEFF---\ntitle: metadado reservado\n---\n## Destaque de ontem\nO artigo confirma a hipótese.\n<!-- comentário reservado -->\n```txt\ncódigo reservado\n```\n');
 f.write(f.intel.today,'## Outro boletim\nTexto do relatório de hoje.');
 const played=await f.speak('Jarvis, leia em voz alta o boletim da manhã de ontem.',{provider,appScope});
 assert.equal(played.deliverable,f.intel.yesterday);
 assert.equal(played.reveal,null);
 for(const reply of [played.reply,played.spokenReply]){
  assert.match(reply,/O artigo confirma a hipótese\./);
  assert.doesNotMatch(reply,/reservado|relatório de hoje/);
 }
 assert.equal(played.model,null);
 assert.deepEqual(f.calls,[]);
 const missing=await f.speak('Leia em voz alta o boletim de anteontem.',{provider,appScope});
 assert.equal(missing.deliverable,null);
 assert.match(missing.reply,/Não encontrei o relatório para/);
 const saved=f.write('inbox/reports/v2/resumo-do-cofre.md','# Resumo do cofre\nA documentação descreve a integração.');
 f.write('system/v2/runs/example.json',JSON.stringify({id:'example',status:'ok',skill:'vault-summary',deliverable_path:saved,ts_completed:new Date().toISOString()}));
 const summary=await f.speak('Leia o resumo do cofre em voz alta.',{provider,appScope});
 assert.equal(summary.deliverable,saved);
 assert.match(summary.reply,/A documentação descreve a integração\./);
});

for(const {provider,appScope} of [{provider:'codex',appScope:'native'},{provider:'claude',appScope:'web'}])test(`${provider} on ${appScope}: a work request that only mentions open goes to the worker whole with the open promised, and never opens a saved run`,async t=>{
 const f=fixture(t);
 // The live vault on September 16: the newest run in the ledger was a content
 // cascade whose summary contains "and" and "your".
 f.write('inbox/reports/cascades/2026-09-15-1e089d8f.md','# cascade');
 f.write('system/runs/cascade.json',JSON.stringify({id:'cascade',skill:'content-cascade',status:'ok',summary:'The cascade is complete — blog is live, the LinkedIn post is scheduled, and the X tweet is drafted and waiting for your manual video upload.',deliverable_path:'inbox/reports/cascades/2026-09-15-1e089d8f.md',ts_completed:new Date().toISOString()}));
 invalidateVoiceSnapshot(f.root);invalidateTargetIndex(f.root);
 const ask='Actually, can you instead of explaining that, can you actually create using your image generation tool, a visual explainer of how Jev works? And once you create that, can you open it up for me?';
 const prompts=[];
 const result=await f.speak(ask,{provider,appScope,execute:async(root,_engine,prompt)=>{prompts.push(prompt);return {text:JSON.stringify({tier:3,reply:'Working on it.'})}}});
 assert.equal(result.deliverable,null);assert.equal(result.reveal,null);assert.equal(result.obsidian,null);
 assert.equal(result.skill,'voice-ask');assert.equal(result.workIds.length,1);assert.equal(result.openWhenDone,true);
 const [call]=f.calls;assert.equal(call.kind,'start');assert.equal(call.openWhenDone,true);
 assert.match(call.prompt,/visual explainer of how Jev works/);assert.match(call.prompt,/once you create that, can you open it up for me/);
 assert.match(call.prompt,/register the final file with the dashboard helper using --open/);
 // The saved run is still one ask away by name, without a model.
 assert.equal(call.selection.provider,provider);assert.equal(call.execution,appScope==='native'?'native':undefined);
 opened(await f.speak('show me the content cascade',{provider,appScope}),'inbox/reports/cascades/2026-09-15-1e089d8f.md');
 assert.equal((await f.speak('show me the trend scan',{provider,appScope})).reply,'Não encontrei relatório do fluxo tendências de IA nos arquivos salvos.');
 assert.equal(f.calls.length,1);
});

test('a plain work request does not promise an open, and a continuation carries the promise to the selected conversation',async t=>{
 const f=fixture(t);
 const task={id:'22222222-2222-4222-8222-222222222222',provider:'codex',model:'astra',title:'Jev explainer',state:'ready',execution:'native',created:Date.now(),turns:[{id:'t1',ts:Date.now(),text:'Done.'}]};
 f.sessions.push(task);
 const model=()=>({text:JSON.stringify({tier:3,reply:'Working on it.'})});
 const plain=await f.speak('create a visual explainer of how jev works using your image generation tool',{execute:model});
 assert.equal(plain.workIds.length,1);assert.equal(plain.openWhenDone,undefined);assert.equal(f.calls.at(-1).openWhenDone,undefined);
 const followup=await f.speak("make the title larger and once it's done, open it up for me",{workTarget:task.id,execute:model});
 assert.equal(followup.openWhenDone,true);assert.deepEqual(followup.workIds,[task.id]);
 const sent=f.calls.at(-1);assert.equal(sent.kind,'send');assert.match(sent.text,/register the final file with the dashboard helper using --open/);
});
