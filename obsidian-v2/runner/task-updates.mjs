import {SKILLS} from '../shared/contract.mjs';
import {statusIntent} from './voice-stop.mjs';

export function taskLabel(task,fallback='Tarefa'){
 const workflow=SKILLS[task?.workflow?.job?.skill||task?.workflow?.skill||task?.skill]?.label;
 const title=String(task?.title||task?.label||'').replace(/\s+/g,' ').trim();
 const id=task?.taskId||task?.id;
 return workflow||(title&&title!==id?title.slice(0,70):fallback);
}
export const taskRunning=task=>['starting','working','needs input','stopping'].includes(task.state)||task.status==='running';
const sentence=text=>/[.!?…]$/.test(text)?text:text+'.';
const max=(text,limit)=>text.length>limit?text.slice(0,limit-1).trimEnd()+'…':text;
const approval=label=>label+' precisa da sua aprovação. Veja a tarefa em Terminais.';

export function shortOutcome(value,count=1){
 const text=String(value||'').trim().replace(/^BLOCKED:\s*/i,'')
  .replace(/!?\[([^\]]+)\]\([^)]+\)/g,'$1')
  .replace(/^[#>*-]+\s+/gm,'').replace(/[\x60*_]/g,'').replace(/\s+/g,' ').trim();
 const parts=text.match(/.+?(?:[.!?](?=\s|$)|$)/g)?.slice(0,count).join('').trim()||'';
 return max(parts,count===1?150:260);
}

export function taskUpdate(item){
 const label=item.label||'Tarefa';
 const value=String(item.summary||item.text||'').trim();
 const outcome=shortOutcome(value,2);
 const reason=shortOutcome(value)||'O agente parou antes de retornar um resultado';
 if(item.kind==='attention')return {state:'needs input',text:approval(label)};
 if(['error','completion-error'].includes(item.kind)||/^BLOCKED:/i.test(value))
  return {state:'failed',text:label+' não terminou. '+sentence(reason)+' Abra a tarefa para ver o próximo passo.'};
 return {state:'done',text:label+' terminou. '+sentence(outcome||'Veja o resultado na tela')};
}

const statusPattern=/^(?:(?:hey|please|so)[,\s]+)*(?:(?:how(?:['’]?s| is) (?:it|that|(?:the )?.+? task) going|(?:is|was) (?:it|that|(?:the )?.+? task) (?:done|finished)(?: yet)?|(?:what(?:['’]?s| is)|which tasks? (?:are|is)) running(?: right now)?)|(?:what(?:['’]?s| is) (?:the )?)?status (?:of|on) (?:the )?(.+?))[\s.!?]*$/i;

export function taskStatusReply(text,readTasks,callIds=[],now=Date.now()){
 const match=statusPattern.exec(text.trim());
 const elapsed=ts=>{
  const minutes=Math.max(0,Math.floor((now-(ts??now))/60000));
  return minutes+(minutes===1?' minuto':' minutos');
 };
 // The pattern above covers the short forms. People also ask loosely ("What's going on? Why is this taking so
 // long", "where are we at with that"): those were handed to the working task they asked about, and since follow-ups
 // wait for a working task the caller heard "I'll add that as soon as that task is free" (Chase's call, 2026-11-24).
 // A loose question gets every running task and what this call has finished, and is left to the model when there
 // is neither, since "how are things going" can also be small talk.
 if(!match){
  if(!statusIntent(text))return null;
  const tasks=readTasks(),byId=new Map(tasks.map(task=>[task.id,task]));
  const active=tasks.filter(taskRunning).sort((a,b)=>(a.state==='needs input'?0:1)-(b.state==='needs input'?0:1)||(b.created||0)-(a.created||0));
  const ended=[...callIds].reverse().map(id=>byId.get(id)).filter(task=>task&&!taskRunning(task));
  if(!active.length&&!ended.length)return null;
  // A workflow has a name, and so does a task Claude Code has titled. Anything else is known only by the words it
  // was asked in, so it is quoted as a request.
  const name=task=>{const label=taskLabel(task);return SKILLS[task?.workflow?.job?.skill||task?.workflow?.skill||task?.skill]||task?.titleSource==='session'?label:'Sua solicitação “'+(label.length>60?label.slice(0,60).trimEnd()+'…':label)+'”'};
  const working=task=>{
   const label=name(task);
   // A conversation that has answered before is on a follow-up: its age is not how long this turn has run.
   const status=task.state==='needs input'?approval(label)
    :task.turns?.length&&!task.workflow?label+' ainda está processando sua mensagem de continuação.'
    :label+' está em execução há '+elapsed(task.workflow?.startedAt||task.created)+'.';
   const queued=task.queuedFollowups;
   return status+(queued?(queued===1?' Há mais uma solicitação na fila.':` Há mais ${queued} solicitações na fila.`):'');
  };
  const finished=task=>name(task)+(task.state==='error'||task.workflowStatus==='error'?' não terminou.':task.turns?.length||task.workflowStatus==='ok'?' terminou.':' foi interrompida.');
  return {reply:[...active.slice(0,4).map(working),...ended.slice(0,3).map(finished)].join(' ')};
 }
 const tasks=readTasks(),byId=new Map(tasks.map(task=>[task.id,task]));
 const recent=[...callIds].reverse().map(id=>byId.get(id)).filter(Boolean);
 const running=tasks.filter(taskRunning).sort((a,b)=>(b.created||0)-(a.created||0));
 const selected=[...new Set([...recent,...running])];
 const named=match[1]||/(?:the )?(.+?) task(?: going| (?:done|finished))/i.exec(text.replace(/^(?:how(?:['’]?s| is)|is|was) /i,''))?.[1];
 const namedTask=named?.toLowerCase().replace(/^(?:the|my)\s+/,'').replace(/\s+task$/,'').trim();
 const needle=/^(?:it|that|this|the current|current|latest)$/.test(namedTask||'')?null:namedTask;
 const candidates=needle?selected.filter(task=>taskLabel(task,'Task').toLowerCase().includes(needle)) : selected;
 const all=/^(?:(?:hey|please|so)[,\s]+)*(?:what(?:['’]s| is)|which tasks? (?:are|is)) running/i.test(text.trim());
 const task=candidates[0];
 const progress=t=>t.state==='needs input'?approval(taskLabel(t)):taskLabel(t)+' está em execução há '+elapsed(t.workflow?.startedAt||t.created)+'.';
 let reply='Nenhuma tarefa em execução no momento.';
 if(all&&running.length)reply=selected.filter(taskRunning).map(progress).join(' ');
 else if(!all&&taskRunning(task||{}))reply=progress(task);
 else if(!all&&task){
  const turn=task.turns?.at(-1);
  const outcome=shortOutcome(task.error||(turn?.ts>(task.completedAt??0)?turn.text:task.summary||turn?.text));
  reply=taskLabel(task)+' terminou há '+elapsed(Math.max(task.completedAt??0,turn?.ts??0)||task.lastActivityAt)+'. '+sentence(outcome||(task.state==='error'?'Veja o erro no terminal':'Veja o resultado na tela'));
 }
 return {reply};
}
