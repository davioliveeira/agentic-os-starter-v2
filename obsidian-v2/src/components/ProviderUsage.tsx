import {h} from 'preact';
import {useEffect,useState} from 'preact/hooks';
import {createPollStore} from '../../shared/poll-store.mjs';
import type {CodexUsage} from '../../shared/usage-types';
import {v2VoiceTransport} from '../lib/v2-voice';
import type {Provider} from '../lib/provider';

const stores=new Map<Provider,ReturnType<typeof createPollStore>>();
function usageStore(provider:Provider){
 const existing=stores.get(provider);if(existing)return existing;
 const store=createPollStore({initial:null as CodexUsage|null,intervalMs:60000,load:async()=>{
  try{const r=await v2VoiceTransport('/usage?provider='+provider);if(r.status!==200)throw new Error('A leitura de uso da conta está indisponível.');return r.json as CodexUsage}
  catch{const old=store.getSnapshot() as CodexUsage|null;return {status:old?.windows.length?'stale':'unavailable',checkedAt:old?.checkedAt||null,windows:old?.windows||[],message:'Não foi possível atualizar o uso. Confira a conexão com a ponte do V2.'} as CodexUsage}
 }});stores.set(provider,store);return store;
}
export function ProviderUsage({provider}:{provider:Provider}){
 const store=usageStore(provider);
 const [reading,setReading]=useState<{provider:Provider;usage:CodexUsage|null}>({provider,usage:store.getSnapshot()});
 useEffect(()=>store.subscribe((usage:CodexUsage|null)=>setReading({provider,usage})),[store,provider]);
 const usage=reading.provider===provider?reading.usage:store.getSnapshot() as CodexUsage|null;
 const name=provider==='codex'?'Codex':'Claude';
 const weekly=usage?.windows.find(w=>w.windowDurationMins===10080);
 const pct=weekly?.usedPercent;
 const issue=usage&&usage.status!=='ok'?usage.message:undefined;
 return <section className="weekly-gauge aos-v2-cc-tokenburn" data-provider={provider} aria-label={'Uso semanal do '+name} title={usage?.status!=='ok'?usage?.message:undefined}>
  {['tl','tr','bl','br'].map(corner=><span key={corner} aria-hidden="true" className={'aos-v2-cc-tokenburn-corner aos-v2-cc-tokenburn-corner--'+corner}/>)}
  <header className="aos-v2-cc-tokenburn-head"><span className="aos-v2-cc-tokenburn-title">{name} · Uso semanal</span>{usage?.notice&&<small className="aos-v2-usage-login" data-level={usage.notice.level} tabIndex={0} title={usage.notice.text} aria-label={usage.notice.text}>{usage.notice.level==='expired'?'Entrar':'Sessão expira em breve'}</small>}{usage?.status==='stale'&&<small tabIndex={0} title={issue} aria-label={'Último valor conhecido. '+issue}>Último valor conhecido</small>}</header>
  <div className="aos-v2-cc-tokenburn-meter">
   <div className="aos-v2-cc-tokenburn-pct"><span className="aos-v2-cc-tokenburn-pct-num">{pct===undefined?'—':Math.round(pct)}</span><span tabIndex={pct===undefined&&issue?0:undefined} title={pct===undefined?issue:undefined} aria-label={pct===undefined&&issue?'Indisponível. '+issue:undefined} className={'aos-v2-cc-tokenburn-pct-unit'+(pct===undefined?' weekly-gauge-unavailable':'')}>{pct===undefined?(!usage?'Carregando':'Indisponível'):'%'}</span></div>
   <div className="aos-v2-cc-tokenburn-bar-wrap">
    <div className="aos-v2-cc-tokenburn-bar" role="progressbar" aria-label={'Uso semanal do '+name} aria-valuenow={pct} aria-valuetext={pct===undefined?(!usage?'Carregando':'Indisponível'):Math.round(pct)+'% usado'} aria-valuemin={0} aria-valuemax={100}>
     <div className="aos-v2-cc-tokenburn-bar-track"/>
     <div className="aos-v2-cc-tokenburn-bar-ticks"/>
     <div className="aos-v2-cc-tokenburn-bar-fill" style={{width:(pct??0)+'%'}}><span className="aos-v2-cc-tokenburn-bar-scan"/><span className="aos-v2-cc-tokenburn-bar-comet"/></div>
     {pct!==undefined&&pct>0&&<div className="aos-v2-cc-tokenburn-bar-endpoint" style={{left:pct+'%'}}><span className="aos-v2-cc-tokenburn-bar-endpoint-pulse"/><span className="aos-v2-cc-tokenburn-bar-endpoint-core"/></div>}
    </div>
    <div className="aos-v2-cc-tokenburn-scale" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
   </div>
  </div>
 </section>;
}
