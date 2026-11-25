import React from 'react';
import {shortTaskTitle,taskStatus} from '../../obsidian-v2/shared/work-presentation';
import type {WorkTask} from '../lib/work';
import {tabCloseAction} from '../lib/terminal-tabs';

interface Props {
  tabs:WorkTask[];history:WorkTask[];target:string|null;historyOpen:boolean;loaded:boolean;
  onHistory:(open:boolean)=>void;onSelect:(id:string)=>void;onClose:(id:string)=>void;
  /** The tab whose × has been pressed once while its terminal is busy: the next press stops it. */
  armed?:string|null;
}
const closeHint={remove:'Remover esta aba. A conversa fica no histórico.',stop:'Fechar encerra este terminal. A conversa fica no histórico.','confirm-stop':'Este terminal está ocupado. Clique de novo para pará-lo. Texto digitado e ainda não enviado será perdido.',wait:'Parando…'} as const;
export function TerminalTabs({tabs,history,target,historyOpen,loaded,onHistory,onSelect,onClose,armed=null}:Props){
  return <>
    <div className="agent-session-nav">
      <nav className="agent-tabs" aria-label="Abas de terminal">
        {tabs.map(task=><div key={task.id} className={target===task.id?'selected':''}>
          <button aria-pressed={target===task.id} onClick={()=>onSelect(task.id)} title={task.title}>{shortTaskTitle(task)}<small>{task.execution==='script'?'Atualização da fonte':task.provider==='codex'?'Codex':'Claude Code'} · {taskStatus(task)}</small></button>
          <button className={armed===task.id?'is-armed':undefined} aria-label={armed===task.id?`Parar e fechar: ${task.title}`:`Fechar aba: ${task.title}`} title={closeHint[tabCloseAction(task)]} disabled={task.state==='stopping'} onClick={()=>onClose(task.id)}>{armed===task.id?'Parar?':'×'}</button>
        </div>)}
        {!tabs.length&&<span className="agent-tabs-empty">{loaded?'Nenhum terminal aberto':'Conectando…'}</span>}
      </nav>
      <button className="agent-history-toggle" aria-expanded={historyOpen} aria-controls="terminal-history" onClick={()=>onHistory(!historyOpen)}>Histórico</button>
    </div>
    {historyOpen&&<section className="agent-history" id="terminal-history" aria-label="Histórico de terminais">
      <div className="agent-history-list">{history.map(task=><button key={task.id} aria-pressed={target===task.id} onClick={()=>{onSelect(task.id);onHistory(false)}}>
        <span>{shortTaskTitle(task,110)}</span><small>{task.provider==='codex'?'Codex':'Claude Code'} · {taskStatus(task)}{task.keep?' · Mantido':''}</small>
      </button>)}</div>
      {!history.length&&<p>{loaded?'Nenhum terminal salvo.':'Carregando histórico…'}</p>}
      <p>Abrir o histórico mostra as sessões salvas. Tarefas paradas expiram em 7 dias, a menos que você use Manter.</p>
    </section>}
  </>;
}
