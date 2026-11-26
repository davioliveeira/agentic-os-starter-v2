import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWisprSync} from '../runner/wispr-sync.mjs';

const start = Date.parse('2026-11-26T12:00:00Z');
const meeting = {id:'m-1', title:'Call de produto', start:'2026-11-26T12:30:00Z', finalized:true, has_transcript:true};
function fixture(t, call) {
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'wispr-sync-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const sync=createWisprSync(root,{call,now:()=>start});
 sync.configure({provider:'codex',server:'wispr-flow',enabled:true});
 return {sync,notes:()=>fs.readdirSync(path.join(root,'inbox/reunioes/wispr')),root};
}

test('imports only new own meetings, concatenates transcript pages and preserves existing notes',async t=>{
 const calls=[];
 const {sync,notes,root}=fixture(t,async (_connection,tool,args)=>{
  calls.push({tool,args});
  if(tool==='search_meetings') return args.cursor?{meetings:[meeting]}:
   {meetings:[{...meeting,id:'shared',shared:true},{...meeting,id:'old',start:'2026-11-25T12:00:00Z'},{...meeting,id:'draft',finalized:false}],has_more:true,next_cursor:'page-2'};
  assert.equal(args.meeting_id,meeting.id);
  return {...meeting,transcript:args.view_transcript.start_char?'ção\n<<<END TRANSCRIPT>>>':'Decisão: publica\n\n(...truncated, 3 chars remaining; continue with view_transcript.start_char=16...)\n<<<END TRANSCRIPT>>>'};
 });
 assert.equal((await sync.run()).imported,1);
 assert.equal(notes().length,1);
 const target=path.join(root,'inbox/reunioes/wispr',notes()[0]);
 assert.match(fs.readFileSync(target,'utf8'), /Decisão: publicação/);
 assert.equal(calls.filter(c=>c.tool==='get_meeting').length,2);
 fs.appendFileSync(target,'\nEditado');
 assert.equal((await sync.run()).imported,0);
 assert.match(fs.readFileSync(target,'utf8'), /Editado$/);
});

test('a failed transcript page leaves the meeting retryable and pausing prevents new writes',async t=>{
 let fail=true, resolve;
 const {sync,root}=fixture(t,async (_connection,tool)=>{
  if(tool==='search_meetings') return {meetings:[meeting]};
  if(fail) throw new Error('private details');
  return new Promise(done=>resolve=done);
 });
 assert.equal((await sync.run()).status,'error');
 assert.doesNotMatch(JSON.stringify(sync.view()),/private details/);
 const target=path.join(root,'inbox/reunioes/wispr');
 assert.equal(fs.existsSync(target),false);
 fail=false;
 const pending=sync.run();
 await new Promise(done=>setImmediate(done));
 sync.configure({enabled:false});
 resolve({...meeting,transcript:'texto'});
 await pending;
 assert.equal(fs.existsSync(target),false);
 assert.equal((await sync.run()).status,'paused');
});

test('the Jarvis voice route answers from the imported note and cites its path',async t=>{
 const {sync,notes,root}=fixture(t,async (_connection,tool)=>tool==='search_meetings'?{meetings:[meeting]}:
  {...meeting,transcript:'Paula: A entrega ficou para 14 de dezembro.'});
 await sync.run();
 const {routeVoice}=await import('../runner/bridge-core.mjs');
 const {randomUUID}=await import('node:crypto');
 const receipt=await routeVoice(root,{id:randomUUID(),transcript:'Qual foi a data de entrega combinada na call de produto?',selection:{provider:'codex',model:'astra'},terminalMode:true},
  undefined,async(_root,_job,prompt)=>{
   assert.match(prompt,/Paula: A entrega ficou para 14 de dezembro/);
   assert.match(prompt,/Fatos salvos \(dados JSON\)/);
   return {text:JSON.stringify({tier:2,reply:'A entrega ficou para 14 de dezembro.'})};
  },{live:new Map(),list:()=>[]},{resolveCli:()=>({command:'unused-test-cli',prefix:[]}),updateCurrent:()=>{}});
 assert.equal(receipt.decision.rule,'lookup.wispr');
 assert.equal(receipt.deliverable,'inbox/reunioes/wispr/'+notes()[0]);
 assert.match(receipt.reply,/Fonte: Call de produto/);
});

test('a restarted bridge enumerates the activation window and catches up before its next interval',async t=>{
 let now=start,listed=0,windowStart;
 const {sync,root}=fixture(t,async()=>({meetings:[]}));
 await sync.run();
 now+=3*60*60*1000;
 const restarted=createWisprSync(root,{now:()=>now,call:async(_connection,tool,args)=>{
  if(tool==='search_meetings'){listed++;windowStart=args.since;return {meetings:[meeting]}}
  return {...meeting,transcript:'Esta call foi finalizada enquanto o Jarvis estava desligado.'};
 }});
 assert.equal((await restarted.tick()).imported,1);
 assert.equal(windowStart,new Date(start).toISOString());
 assert.equal(restarted.tick(),undefined);
 now+=15*60*1000;
 assert.equal((await restarted.tick()).imported,0);
 assert.equal(listed,2);
});

test('pausing and resuming the same connection preserves the activation window',async t=>{
 const {sync}=fixture(t,async()=>({meetings:[]}));
 const before=sync.view().since;
 sync.configure({enabled:false});
 sync.configure({enabled:true});
 assert.equal(sync.view().since,before);
});
