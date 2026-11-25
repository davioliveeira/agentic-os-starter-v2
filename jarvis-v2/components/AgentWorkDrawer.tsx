"use client";
import {useEffect,useRef,useState} from 'react';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {workRequest,setWorkKeep,fullAnswer,getWorkSelection,openWork,type WorkTask} from '@/lib/work';
import {voice,voicePrefs} from '@/lib/voiceClient';
import {liveToggleLabel} from '../../obsidian-v2/shared/live-controls';
import type {LiveSnapshot} from '../../obsidian-v2/shared/live-session';
import {replayTerminal} from '../../obsidian-v2/shared/terminal-playback';
import {draftKey,readDraft,saveDraft} from '../../obsidian-v2/shared/drafts';
import {readRecoveredDraft,stageRecoveredDraft,stageExpiredTaskDraft,clearRecoveredDraft,updateRecoveryText,type RecoveredDraft,type SavedRequest} from '@/lib/work-recovery';
import {isOpenWork,taskStatus,shortConversationTitle} from '../../obsidian-v2/shared/work-presentation';
import {visibleTerminalTabs,rememberOpenTerminals,tabCloseAction} from '@/lib/terminal-tabs';
import {TaskActivityBar} from './TaskActivityBar';
import {TerminalTabs} from './TerminalTabs';
import {dashboardStore} from '@/lib/dashboard-store';

function LiveTerminal({id,onError,readOnly=false}:{id:string;onError:(message:string)=>void;readOnly?:boolean}){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!host.current)return;
    const term=new Terminal({fontFamily:'Consolas, monospace',fontSize:14,scrollback:2500,theme:{background:'#0b0e14',foreground:'#e5e9ef'},allowProposedApi:false,disableStdin:readOnly});
    const fit=new FitAddon();term.loadAddon(fit);term.open(host.current);
    let gone=false,busy=false,cursor=0,instance='';
    const resize=()=>{
      if(!host.current?.clientWidth||!host.current?.clientHeight)return;
      // An unfocused viewer must not repeatedly resize the shared CLI in Obsidian.
      if(host.current.contains(document.activeElement)){fit.fit();void workRequest('/resize',{id,cols:Math.max(20,Math.min(300,term.cols)),rows:Math.max(5,Math.min(120,term.rows))}).catch(()=>{});}
    };
    // Drain already-captured keystrokes to this task even if its view is closed. The queue belongs to the TERMINAL,
    // not to this mount: a remounted view appends to the same ordered queue, so nothing typed earlier can be
    // overtaken by later input, by a terminal report, or by a close request.
    const input=term.onData(data=>{pendingInput.set(id,(pendingInput.get(id)||Promise.resolve()).then(()=>workRequest('/input',{id,data})).then(()=>{},e=>{if(!gone)onError(String(e.message||e))}))});
    const poll=async()=>{
      if(gone||busy||document.visibilityState!=='visible')return;busy=true;
      try{const r=await workRequest(`/output?id=${id}&cursor=${cursor}&instance=${instance}`);if(gone)return;await replayTerminal(term,r,()=>gone);cursor=r.cursor;instance=r.instance}
      catch(e){if(!gone)onError(e instanceof Error?e.message:String(e))}finally{busy=false}
    };
    const observer=new ResizeObserver(resize);observer.observe(host.current);
    const element=host.current;element.addEventListener('focusin',resize);
    resize();void poll();const timer=setInterval(()=>void poll(),200);
    return()=>{gone=true;clearInterval(timer);observer.disconnect();element.removeEventListener('focusin',resize);input.dispose();term.dispose()};
  },[id,onError,readOnly]);
  return <div className="agent-terminal" ref={host} aria-label="Terminal interativo do agente"/>;
}

// Keystrokes captured for a terminal and not yet delivered to the bridge. A close request waits for them, so the
// bridge judges "idle" with everything the user typed already applied.
const pendingInput=new Map<string,Promise<unknown>>();

interface Props {tasks:WorkTask[];activityTasks:WorkTask[];tasksLoaded:boolean;target:string|null;voiceTarget:string|null;select:(id:string|null)=>Promise<void>;dismissView?:(id:string)=>void;open:boolean;setOpen:(value:boolean)=>void;connectionError:string;provider:'codex'|'claude';voiceMode:string;voiceMessage:string;vaultRoot:string}
export default function AgentWorkDrawer({tasks,activityTasks,tasksLoaded,target,voiceTarget,select,dismissView,open,setOpen,connectionError,provider,voiceMode,voiceMessage,vaultRoot}:Props){
  const [hidden,setHidden]=useState<string[]>([]),[drafts,setDrafts]=useState<Record<string,string>>({});
  const [opened,setOpened]=useState<string[]>([]),[historyOpen,setHistoryOpen]=useState(false);
  const [messageTarget,setMessageTarget]=useState<string|null>(null),[answerTarget,setAnswerTarget]=useState<string|null>(null);
  const [error,setError]=useState(''),[sending,setSending]=useState(false);
  const sendingRef=useRef(false);
  const begin=()=>{if(sendingRef.current)return false;sendingRef.current=true;setSending(true);setError('');return true};
  const end=()=>{sendingRef.current=false;setSending(false)};
  const [services,setServices]=useState<any>(null);
  const [recovered,setRecovered]=useState<RecoveredDraft|null>(null);
  const current=tasks.find(t=>t.id===target)||activityTasks.find(t=>t.id===target),key=target||'new',prompt=drafts[key]||'';
  const voiceTask=tasks.find(task=>task.id===voiceTarget&&task.provider===provider);
  const lastKnown=useRef<WorkTask|null>(null);
  useEffect(()=>{if(current)lastKnown.current=current},[current]);
  const former=lastKnown.current?.id===target?lastKnown.current:null;
  const unavailable=!!target&&!current&&tasksLoaded&&!connectionError;
  const receipt=current?.execution==='headless'||current?.execution==='script';
  const terminalLive=!!current&&!receipt&&isOpenWork(current);
  const scriptActive=!!current&&receipt&&isOpenWork(current);
  const showComposer=!target||!current||messageTarget===target;
  const tabs=visibleTerminalTabs(tasks,opened,hidden,target);
  useEffect(()=>setOpened(value=>rememberOpenTerminals(value,tasks,target)),[tasks,target]);
  useEffect(()=>{
    const reveal=(event:Event)=>{const ids=(event as CustomEvent<{ids?:string[]}>).detail?.ids?.filter(id=>typeof id==='string')||[];if(ids.length){setOpened(value=>[...new Set([...value,...ids])]);setHidden(value=>value.filter(id=>!ids.includes(id)));setHistoryOpen(false)}};
    window.addEventListener('jarvis-open-work',reveal);return()=>window.removeEventListener('jarvis-open-work',reveal);
  },[]);
  const [readyCheck,setReadyCheck]=useState(false);
  useEffect(()=>setReadyCheck(false),[target,current?.state]);
  useEffect(()=>{setMessageTarget(null);setAnswerTarget(null)},[target]);
  const [answer,setAnswer]=useState('');
  const answerId=current?.turns.at(-1)?.id;
  useEffect(()=>{let gone=false;setAnswer('');if(open&&current&&answerTarget===current.id)void fullAnswer(current).then(text=>{if(!gone)setAnswer(text)}).catch(e=>{if(!gone)setError(String(e))});return()=>{gone=true}},[open,target,answerId,answerTarget]);
  const storageKey=draftKey('jarvis',vaultRoot,target);
  const newStorageKey=draftKey('jarvis',vaultRoot,null);
  useEffect(()=>{if(vaultRoot)setRecovered(readRecoveredDraft(localStorage,newStorageKey))},[vaultRoot,newStorageKey]);
  useEffect(()=>{if(vaultRoot)setDrafts(v=>({...v,[key]:readDraft(localStorage,storageKey)}))},[vaultRoot,key,storageKey]);
  const edit=(text:string)=>{setDrafts(v=>({...v,[key]:text}));try{if(!target)setRecovered(updateRecoveryText(localStorage,storageKey,recovered,text));else if(!saveDraft(localStorage,storageKey,text))throw new Error('Não foi possível salvar o rascunho neste dispositivo. Copie-o antes de recarregar.')}catch(e){setError(e instanceof Error?e.message:String(e))}};
  const active=tasks.filter(isOpenWork).length;
  useEffect(()=>{if(open&&target)setHidden(v=>v.filter(id=>id!==target));setError('')},[target,open]);
  const action=async(name:string,data:Record<string,unknown>={})=>{if(!current||!begin())return;try{await workRequest('/'+name,{id:current.id,...data});setReadyCheck(false)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{end()}};
  const toggleKeep=async()=>{if(!current||!begin())return;try{await setWorkKeep(current.id,!current.keep)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{end()}};
  // × ends an idle terminal at once and asks once more for a busy one (the second press within four seconds stops it).
  const [armed,setArmed]=useState<string|null>(null);
  const armedTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(armedTimer.current)clearTimeout(armedTimer.current)},[]);
  // One stop request per terminal at a time: a second × is ignored only while the first request is in flight.
  // Afterwards the terminal's own state decides (stopping: wait; closed: gone; cleanup failed: × may retry).
  const stopRequested=useRef(new Set<string>());
  // A closed tab's view is dismissed once the bridge confirms the terminal is gone, not before: until then the
  // drawer stays open on it, so "Stopping" and any cleanup failure remain visible.
  useEffect(()=>{if(target&&hidden.includes(target)){const task=tasks.find(item=>item.id===target);if(task&&!isOpenWork(task)){dismissView?.(target);setOpen(false)}}},[tasks,target,hidden]);
  const closeTab=(id:string)=>{
    // Decided on the terminal's state NOW, so an armed tab whose work finished meanwhile is simply closed.
    const action=tabCloseAction(tasks.find(task=>task.id===id));
    if(action==='wait'||stopRequested.current.has(id))return;
    // A press on an armed tab is the user's confirmation, whatever this page's snapshot says by now.
    const confirmed=armed===id;
    if(action==='confirm-stop'&&armed!==id){setArmed(id);if(armedTimer.current)clearTimeout(armedTimer.current);armedTimer.current=setTimeout(()=>setArmed(value=>value===id?null:value),4000);return}
    setArmed(null);
    if(action==='remove'){
      // The view goes; the voice conversation, its drafts and its History entry stay. Without dismissing it the
      // drawer would bring the closed tab straight back the next time it opens.
      setHidden(value=>[...new Set([...value,id])]);setOpened(value=>value.filter(item=>item!==id));
      if(target===id){dismissView?.(id);setOpen(false)}
      return;
    }
    stopRequested.current.add(id);
    void (async()=>{
      try{
        // Wait until the queue is really empty: typing that was appended while we waited is delivered too, and the
        // stop request leaves in the same tick as the last check, so nothing captured can be overtaken by it.
        for(;;){const tail=pendingInput.get(id);await (tail||Promise.resolve()).catch(()=>{});if(pendingInput.get(id)===tail)break}
        // A one-click close is conditional: the bridge ends the terminal only if it is STILL idle when the request
        // arrives (this page's "ready" is a poll old). A confirmed close of a busy terminal is unconditional.
        await workRequest('/stop',action==='stop'&&!confirmed?{id,ifIdle:true}:{id});
        setHidden(value=>[...new Set([...value,id])]);setOpened(value=>value.filter(item=>item!==id));
      }catch(e){
        if((e as {code?:string})?.code==='TERMINAL_NOT_IDLE'){setArmed(id);if(armedTimer.current)clearTimeout(armedTimer.current);armedTimer.current=setTimeout(()=>setArmed(value=>value===id?null:value),6000)}
        setError(e instanceof Error?e.message:String(e));
      }finally{stopRequested.current.delete(id)}
    })();
  };
  const selectTab=(id:string)=>{setOpened(value=>value.includes(id)?value:[...value,id]);setHidden(value=>value.filter(item=>item!==id));void select(id)};
  const copyExpiredDraft=()=>{
    if(!former||!unavailable||!begin())return;
    try{const metadata=stageExpiredTaskDraft(localStorage,storageKey,newStorageKey,prompt,former);setRecovered(metadata);setDrafts(v=>({...v,new:metadata.prompt}));void select(null)}
    catch(e){setError(e instanceof Error?e.message:String(e))}finally{end()}
  };
  const recover=async()=>{
    if(!current||!begin())return;
    try{
      const request=await workRequest('/request?id='+encodeURIComponent(current.id)) as SavedRequest;
      const metadata=stageRecoveredDraft(localStorage,newStorageKey,request);
      setRecovered(metadata);setDrafts(v=>({...v,new:metadata.prompt}));await select(null);
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{end()}
  };
  const submit=async()=>{
    if(!prompt.trim()||!begin())return;
    try{
      if(target){if(!current)throw new Error('Esta conversa não está mais disponível. Seu rascunho continua salvo.');await workRequest('/send',{id:target,text:prompt})}
      else{
        const recovery=readRecoveredDraft(localStorage,newStorageKey);
        if(recovered&&!recovery)throw new Error('A solicitação recuperada mudou fora da caixa de mensagem. Recupere-a de novo antes de iniciar uma tarefa.');
        const chosen=recovery?.selection||await getWorkSelection(),selection={provider:chosen.provider,model:chosen.model};
        if(recovery?.skill){
          const run=await workRequest('/skill',{id:crypto.randomUUID(),selection,skill:recovery.skill,args:recovery.args||{}});
          window.dispatchEvent(new CustomEvent('jarvis-workflow-queued',{detail:{id:run.id,skill:recovery.skill}}));
          void dashboardStore.refresh();setOpen(false);
        }else{
          const task=await workRequest('/start',{id:crypto.randomUUID(),selection:recovery?selection:selection.provider==='codex'?{provider:'codex',model:'astra'}:selection,prompt});openWork([task.id],true);
        }
        if(clearRecoveredDraft(localStorage,newStorageKey))setRecovered(null);
      }
      setDrafts(v=>({...v,[key]:''}));saveDraft(localStorage,storageKey,'');
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{end()}
  };
  const alert=connectionError||error||(current?.state!=='needs input'?current?.error:'');
  // In Live mode this button is the same action as the voice panel's, so it carries the same label.
  const [call,setCall]=useState<LiveSnapshot|null>(null);
  const [liveMode,setLiveMode]=useState(false);
  useEffect(()=>voice.onLive(setCall),[]);
  useEffect(()=>{const read=()=>setLiveMode(voicePrefs.getSnapshot().prefs.voiceMode==='live');read();return voicePrefs.subscribe(read)},[]);
  return <section className={`agent-drawer ${open?'is-open':''}`} aria-label="Terminais">
    <header className="agent-drawer-bar">
      <button className="agent-drawer-toggle" aria-expanded={open} aria-controls="agent-work-content" onClick={()=>setOpen(!open)}><span aria-hidden="true">⌘</span> Terminais <small>{connectionError?'Ponte desconectada':`${active} em aberto`}</small><span aria-hidden="true">{open?'⌄':'⌃'}</span></button>
      <TaskActivityBar tasks={activityTasks} ready={tasksLoaded} viewing={open?target:null}/>
      <button onClick={()=>void voice.toggle()} title={voiceTask?`Conversa: ${shortConversationTitle(voiceTask)}`:voiceTarget?'Conversa selecionada indisponível':'Nova conversa por voz'}>{liveMode&&call?liveToggleLabel(call):voiceMode==='listening'?'Enviar gravação':voiceMode==='working'?'Cancelar voz':voiceMode==='speaking'?'Interromper e falar':'Clique para falar'}</button>
      <button onClick={()=>{void select(null);setHistoryOpen(false);setOpen(true)}}>+ Novo terminal</button>
    </header>
    {voiceMessage&&<p className="agent-voice-status" role="status">{voiceMessage}</p>}
    {armed&&<p className="agent-voice-status" role="status">Este terminal ainda está ocupado. Clique de novo em “Parar?” para encerrá-lo. Texto não enviado será perdido e a conversa ficará no histórico.</p>}
    {open&&<div id="agent-work-content" className="agent-work-content">
      <TerminalTabs tabs={tabs} history={tasks} target={target} historyOpen={historyOpen} loaded={tasksLoaded} onHistory={setHistoryOpen} onSelect={selectTab} onClose={closeTab} armed={armed}/>
      {current&&<div className="agent-work-meta">
        <span title={current.execution==='script'?'Atualização direta da fonte, sem IA':current.model}>{current.execution==='script'?'Atualização da fonte':current.provider==='codex'?'Codex':'Claude Code'} · {taskStatus(current)}</span>
        <div>
          {!receipt&&<button aria-expanded={showComposer} aria-controls="terminal-message-box" disabled={sending} onClick={()=>setMessageTarget(showComposer?null:current.id)}>Caixa de mensagem{prompt.trim()?' · rascunho':''}</button>}
          {current.turns.length>0&&<button aria-expanded={answerTarget===current.id} aria-controls="terminal-saved-answer" onClick={()=>setAnswerTarget(answerTarget===current.id?null:current.id)}>Resposta salva</button>}
          <button className="agent-keep" aria-pressed={!!current.keep} disabled={sending||!!connectionError} title={current.keep?'Permitir a limpeza após sete dias com a tarefa parada':'Manter a tarefa no histórico'} onClick={()=>void toggleKeep()}>{current.keep?'✓ Mantida':'Manter'}</button>
          {!terminalLive&&!receipt&&current.sessionId&&<button disabled={sending} onClick={()=>void action('resume')}>Retomar</button>}
          {!terminalLive&&current.recoveryAvailable&&!receipt&&<button disabled={sending||!vaultRoot} onClick={()=>void recover()}>{current.workflow?'Revisar tentativa':'Recuperar solicitação'}</button>}
          {(terminalLive||scriptActive)&&<button disabled={sending||current.state==='stopping'} onClick={()=>void action('stop')}>{current.state==='stopping'?'Parando…':'Parar'}</button>}
        </div>
      </div>}
      {alert&&<p className="agent-error" role="alert">{alert}</p>}
      {current?.state==='needs input'&&<p className="agent-input-needed" role="status">Precisa da sua resposta: {current.inputReason||current.error||'Revise a solicitação no terminal abaixo.'}</p>}
      {current?<>
        {terminalLive?<LiveTerminal id={current.id} onError={setError} readOnly={current.state==='stopping'}/>:<div className="agent-stopped" role="status">
          {current.execution==='headless'?(scriptActive?'Executando o fluxo…':current.error?'O fluxo falhou.':'O fluxo terminou. Veja o resultado no painel.'):
            current.execution==='script'?(scriptActive?'Atualizando a fonte…':current.error||current.state==='error'?'A atualização da fonte precisa de atenção.':'A atualização da fonte foi encerrada.'):
            current.sessionId?'O terminal foi fechado. Use Retomar para continuar.':current.recoveryAvailable?'O terminal foi fechado antes de salvar a conversa. Recupere a solicitação para revisá-la.':'O terminal foi fechado.'}
        </div>}
        {answerTarget===current.id&&current.turns.length>0&&<section className="agent-answer" id="terminal-saved-answer" aria-label="Resposta salva"><pre>{answer||current.turns.at(-1)?.text}</pre></section>}
      </>:<div className="agent-empty" role={unavailable?'status':undefined}>
        <strong>{unavailable?'Este terminal não está mais salvo.':target?'Abrindo terminal…':`New ${provider==='codex'?'Codex':'Claude Code'} terminal`}</strong>
        <p>{unavailable?'Seu rascunho continua aqui. Copie-o para uma nova solicitação para recomeçar em outra conversa.':target?'Conectando ao terminal compartilhado.':'Descreva a tarefa abaixo. Cada solicitação independente abre uma aba de terminal.'}</p>
        {unavailable&&former&&prompt.trim()&&<button type="button" disabled={sending||!vaultRoot} onClick={copyExpiredDraft}>Usar rascunho em novo terminal</button>}
      </div>}
      {!target&&recovered&&<p className="agent-recovered" role="status">Recuperado: {recovered.title} · {recovered.selection.provider} / {recovered.selection.model}. Revise antes de começar. <button type="button" disabled={sending} onClick={()=>edit('')}>Limpar recuperação</button></p>}
      {showComposer&&!receipt&&<div id="terminal-message-box" className="agent-message-box">
        {terminalLive&&!['ready','stopping'].includes(current!.state)&&<div className="agent-message-guard">
          <p>Use o terminal diretamente ou aguarde até que ele esteja livre e com o campo de entrada vazio. Responda a pedidos de aprovação no terminal.</p>
          <button disabled={sending} onClick={()=>setReadyCheck(!readyCheck)}>Quero usar a caixa de mensagem</button>
          {readyCheck&&<button disabled={sending} onClick={()=>void action('ready',{confirmedEmpty:true})}>Conferi: terminal livre e campo vazio</button>}
        </div>}
        <form className="agent-compose" onSubmit={e=>{e.preventDefault();void submit()}}>
          <textarea readOnly={!target&&!!recovered?.skill} disabled={sending||!vaultRoot} aria-label={target?'Continuação no terminal':'Nova solicitação no terminal'} value={prompt} placeholder={target?'Continuar esta conversa…':'Descreva uma solicitação…'} maxLength={12000} onChange={e=>edit(e.target.value)}/>
          <button disabled={sending||!prompt.trim()||!!connectionError||!!target&&current?.state!=='ready'}>{target?'Enviar':recovered?.skill?'Tentar fluxo de novo':'Iniciar terminal'}</button>
        </form>
      </div>}
      <footer><span title={voiceTask?.title}>Conversa por voz: {voiceTask?shortConversationTitle(voiceTask):voiceTarget?'Indisponível':'Nova conversa'}</span><span>Fechar a aba encerra o terminal. A conversa fica no histórico e pode ser retomada por voz.</span></footer>
      <details className="agent-services" onToggle={e=>{if(e.currentTarget.open)void workRequest('/services').then(setServices).catch(e=>setError(String(e)))}}><summary>Conexões e rascunhos</summary><p>Os rascunhos da caixa de mensagem ficam neste dispositivo. Ao parar o terminal, texto não enviado pode se perder. Tarefas paradas expiram em 7 dias, a menos que você use Manter.</p>{services&&<><p>Ponte do terminal conectada · {services.bridge.memoryMiB} MiB · {active} sessões abertas. Voz: {services.speech.health?.ok?'online':'unavailable'}{services.speech.shared?' (compartilhada com o V1)':''}. Os conectores usam a sessão do terminal selecionado. Para parar os serviços ociosos do V2, execute <code>scripts/services.ps1 -Action Stop</code> na pasta do Obsidian V2. Encerre as tarefas ativas primeiro.</p>{Object.entries(services.providers||{}).map(([name,value])=>{const cli=value as {installed:boolean;version?:string;command?:string;source?:string;detail?:string};return <p key={name}><strong>{name==='codex'?'Codex':'Claude Code'}</strong> · {cli.installed?cli.version||'Versão indisponível':'Não instalado'}{cli.source?` · ${cli.source}`:''}{cli.command&&<code>{cli.command}</code>}{cli.detail&&<span>{cli.detail}</span>}</p>})}</>}</details>
    </div>}
  </section>;
}
