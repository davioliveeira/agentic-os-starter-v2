import React,{useEffect,useState} from 'react';
import {carryToday,liveClock,liveModeOption,liveSettings,wakeOnVoice} from '../../obsidian-v2/shared/live-controls';
import type {LiveSnapshot} from '../../obsidian-v2/shared/live-session';
import type {VoicePrefs} from '../../obsidian-v2/shared/voice-prefs';
import {voice} from '@/lib/voiceClient';
import {openWork} from '@/lib/work';

export function LiveVoiceSettings({prefs,live,save}:{prefs:VoicePrefs;live:LiveSnapshot;save:(changes:Partial<VoicePrefs>)=>void}){
 const mode=liveModeOption(prefs,live);if(!mode)return null;
 return <div className="voice-sound live-voice-settings">
  <div className="live-voice-mode" role="group" aria-label="Modo de voz"><span>Voz</span><button type="button" aria-pressed={mode.value==='local'} onClick={()=>{if(mode.value!=='local')save({voiceMode:'local'})}}>Local</button><button type="button" aria-pressed={mode.value==='live'} disabled={mode.disabled} onClick={()=>{if(mode.value!=='live')save({voiceMode:'live'})}}>Ao vivo</button></div>
  {mode.reason&&<p role="status">{mode.reason}</p>}
  {mode.value==='live'&&<>
   {liveSettings(prefs).map(row=><label key={row.key}>{row.label}<select value={row.value} onChange={e=>save(row.change(e.currentTarget.value))}>{row.choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>)}
   {prefs.liveIdleMic!==undefined&&<button type="button" className="voice-mute" aria-pressed={prefs.liveIdleMic==='open'} onClick={()=>save(wakeOnVoice(prefs.liveIdleMic!=='open'))}><span>Ativar por voz</span><strong>{prefs.liveIdleMic==='open'?'Ativado':'Desativado'}</strong></button>}
   {prefs.liveCarryToday!==undefined&&<label>Lembrar chamadas de hoje<input type="checkbox" checked={prefs.liveCarryToday} onChange={e=>save(carryToday(e.currentTarget.checked))}/></label>}
   {prefs.liveShareWork!==undefined&&<><label>Compartilhar títulos de tarefas<input type="checkbox" aria-describedby="live-share-work-hint" checked={prefs.liveShareWork} onChange={e=>save({liveShareWork:e.currentTarget.checked})}/></label><p id="live-share-work-hint">O modo ao vivo recebe só os títulos das tarefas em andamento.</p></>}
   {prefs.liveShareBrief!==undefined&&<><label>Compartilhar boletim da manhã<input type="checkbox" aria-describedby="live-share-brief-hint" checked={prefs.liveShareBrief} onChange={e=>save({liveShareBrief:e.currentTarget.checked})}/></label><p id="live-share-brief-hint">O modo ao vivo recebe todo o boletim, incluindo a seção de e-mails.</p></>}
   {prefs.liveGreeting!==undefined&&<><label>Saudação<input type="checkbox" aria-describedby="live-greeting-hint" checked={prefs.liveGreeting} onChange={e=>save({liveGreeting:e.currentTarget.checked})}/></label><p id="live-greeting-hint">O modo ao vivo cumprimenta você pelo nome no início da chamada.</p></>}
  </>}
 </div>;
}
export function LiveCallBar({live}:{live:LiveSnapshot}){
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{if(live.startedAt===null)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[live.startedAt]);
 if(live.occupied)return <p className="live-call-other" role="status">{live.occupied}</p>;
 if(live.state==='idle')return null;
 return <div className="live-call">
  <div className="live-call-bar"><span><i aria-hidden="true"/> {liveClock(live,now)}</span><button aria-pressed={live.micMuted} disabled={!live.ready} onClick={()=>void voice.muteLive(!live.micMuted)}>{live.micMuted?'Ativar microfone':'Silenciar microfone'}</button><button onClick={()=>voice.stopLive()}>Encerrar chamada</button></div>
  {live.staged&&<section className="live-staged" aria-label="Ação aguardando confirmação"><p>{live.staged.description}</p><div><button onClick={()=>void voice.actionLive(false)}>Cancelar</button>{live.staged.mode==='click'&&<button onClick={()=>void voice.actionLive(true)}>Confirmar</button>}</div></section>}
  {live.completions?.map(card=><section key={card.seq} className="live-staged" aria-label="Atualização de tarefa"><strong>{card.label}</strong><p>{card.text}</p><div>{card.taskId&&<button onClick={()=>openWork([card.taskId!],true)}>Abrir tarefa</button>}<button onClick={()=>voice.dismissLiveCompletion(card.seq)}>Dispensar</button></div></section>)}
 </div>;
}
