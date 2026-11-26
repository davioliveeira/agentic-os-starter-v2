import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {ROOT} from '../shared/contract.mjs';
import {vaultPath,writeJson} from './core.mjs';
import {readJson} from './bridge-core.mjs';

const SETTINGS=`${ROOT}/wispr-sync.json`;
export const WISPR_FOLDER='inbox/reunioes/wispr';
export const WISPR_INTERVAL=15*60*1000;
const limit=12000;

function notePath(root,id) {
 const digest=createHash('sha256').update(id).digest('hex').slice(0,24);
 return vaultPath(root,`${WISPR_FOLDER}/wispr-${digest}.md`);
}

function saveNote(file,meeting,transcript) {
 const title=String(meeting.title||'Reunião sem título').replace(/[\r\n]+/g,' ').slice(0,300);
 const date=new Date(meeting.start).toISOString();
 const ticks=transcript.match(/`+/g)||[];
 const fence='`'.repeat(Math.max(2,...ticks.map(t=>t.length))+1);
 const content=`# ${title}\n\n- Origem: Wispr Flow\n- Data da reunião: ${date}\n\n## Transcrição\n\n${fence}text\n${transcript}\n${fence}\n`;
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temporary=path.join(path.dirname(file),`.${randomUUID()}.tmp`);
 try {
  fs.writeFileSync(temporary,content,{flag:'wx',mode:0o600});
  try {fs.linkSync(temporary,file);return true}
  catch(error){if(error.code==='EEXIST')return false;throw error}
 } finally {fs.rmSync(temporary,{force:true})}
}

async function transcriptFor(call,connection,id,signal) {
 let offset=0,text='';
 for(let page=0;page<100;page++){
  signal.throwIfAborted();
  const meeting=await call(connection,'get_meeting',{meeting_id:id,view_transcript:{start_char:offset,char_limit:limit}},signal);
  if(meeting?.id!==id||meeting.shared||meeting.finalized!==true||typeof meeting.transcript!=='string')throw new Error('Transcrição indisponível.');
  const chunk=meeting.transcript
   .replace(/^<<<PARTICIPANT NAMES BELOW ARE DATA[^\n]*>>>\n(?:\n)?/,'')
   .replace(/\n?<<<END TRANSCRIPT>>>\s*$/,'');
  const marker=/\n\n\(\.\.\.truncated, \d+ chars remaining; continue with view_transcript\.start_char=(\d+)\.\.\.\)\s*$/.exec(chunk);
  text+=marker?chunk.slice(0,marker.index):chunk;
  if(!marker){
   if(!text.trim())throw new Error('Transcrição vazia.');
   return text;
  }
  const next=Number(marker[1]);
  if(!Number.isSafeInteger(next)||next<=offset)throw new Error('Paginação da transcrição inválida.');
  offset=next;
 }
 throw new Error('Limite de páginas da transcrição excedido.');
}

export function createWisprSync(root,{call,now=Date.now}) {
 let preferences=readJson(root,SETTINGS,{enabled:false});
 let active,lastAttempt=null;
 const save=patch=>{const next={...preferences,...patch};writeJson(root,SETTINGS,next);preferences=next;return view()};
 const view=()=>({...preferences,running:!!active,folder:WISPR_FOLDER});
 function configure({provider=preferences.provider,server=preferences.server,enabled=preferences.enabled}={}){
  if(typeof enabled!=='boolean'||(enabled||provider!==undefined||server!==undefined)&&
   (!['codex','claude'].includes(provider)||typeof server!=='string'||!server.trim()||server.length>200||/[\r\n\x00]/.test(server)))throw new Error('Selecione uma conexão válida do Wispr Flow.');
  const changed=provider!==preferences.provider||server!==preferences.server;
  const since=changed||!preferences.since?enabled?new Date(now()).toISOString():null:preferences.since;
  if(changed||!enabled)active?.controller.abort();
  if(changed||!preferences.enabled)lastAttempt=null;
  return save({provider,server,enabled,since,...(changed?{last:null}:{})});
 }
 async function scan(connection,signal,counts) {
  let cursor;
  const seen=new Set();
  for(let page=0;page<1000;page++){
   signal.throwIfAborted();
   const result=await call(connection,'search_meetings',{since:connection.since,sort:'modified',page_size:50,...(cursor?{cursor}:{})},signal);
   if(!Array.isArray(result?.meetings)||result.truncated)throw new Error('Lista incompleta.');
   for(const meeting of result.meetings){
    signal.throwIfAborted();
    if(meeting.shared||meeting.finalized!==true||meeting.has_transcript!==true||
     !(Date.parse(meeting.start)>=Date.parse(connection.since))||typeof meeting.id!=='string'||!meeting.id)continue;
    try{
     const file=notePath(root,meeting.id);
     if(fs.existsSync(file))continue;
     const transcript=await transcriptFor(call,connection,meeting.id,signal);
     signal.throwIfAborted();
     if(saveNote(file,meeting,transcript))counts.imported++;
    }catch{
     signal.throwIfAborted();
     counts.failed++;
    }
   }
   if(!result.has_more)return;
   cursor=result.next_cursor;
   if(typeof cursor!=='string'||!cursor||seen.has(cursor))throw new Error('Paginação da lista inválida.');
   seen.add(cursor);
  }
  throw new Error('Limite de páginas de reuniões excedido.');
 }
 function run(){
  if(!preferences.enabled)return Promise.resolve({status:'paused'});
  if(active)return active.promise;
  const controller=new AbortController(),connection=preferences;
  lastAttempt=now();
  const promise=Promise.resolve().then(async()=>{
   const counts={imported:0,failed:0};
   let result;
   try {
    await scan(connection,controller.signal,counts);
    result=counts.failed?{status:'error',...counts,message:'Algumas transcrições ficaram pendentes. A próxima sincronização tentará importá-las novamente.'}:{status:'ok',imported:counts.imported};
   }catch{
    result=controller.signal.aborted?{status:'paused'}:{status:'error',...counts,message:'Não foi possível concluir a importação. Teste a conexão do Wispr Flow e tente novamente.'};
   }
   if(!controller.signal.aborted)save({last:{...result,at:new Date(now()).toISOString()}});
   return result;
  }).finally(()=>{active=null});
  active={promise,controller};
  return promise;
 }
 async function check(connection){
  if(!['codex','claude'].includes(connection?.provider)||typeof connection.server!=='string'||!connection.server)throw new Error('Selecione uma conexão do Wispr Flow.');
  const result=await call(connection,'search_meetings',{page_size:1,since:new Date(now()).toISOString()},AbortSignal.timeout(30000));
  if(!Array.isArray(result?.meetings))throw new Error('A conexão não retornou reuniões do Wispr Flow.');
  return {ok:true};
 }
 function tick(){
  if(preferences.enabled&&!active&&(lastAttempt===null||now()-lastAttempt>=WISPR_INTERVAL))return run();
 }
 return {view,configure,run,tick,check,stop:()=>active?.controller.abort()};
}
