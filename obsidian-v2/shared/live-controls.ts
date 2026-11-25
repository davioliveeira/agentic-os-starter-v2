import {LIVE_VOICES,type VoicePrefs} from './voice-prefs';
import type {LiveSnapshot} from './live-session';

export const liveModeOption=(prefs:VoicePrefs,live:LiveSnapshot)=>prefs.voiceMode===undefined?null:{
 value:prefs.voiceMode,disabled:Boolean(live.unavailable),reason:live.unavailable
};
type Choice={value:string;label:string};
export function liveSettings(prefs:VoicePrefs){
 const rows:{key:keyof VoicePrefs;label:string;value:string;choices:Choice[];change:(value:string)=>Partial<VoicePrefs>}[]=[];
 if(prefs.liveVoice!==undefined)rows.push({key:'liveVoice',label:'Voz ao vivo',value:prefs.liveVoice,choices:LIVE_VOICES.map(value=>({value,label:value.charAt(0).toUpperCase()+value.slice(1)})),change:value=>({liveVoice:value})});
 if(prefs.liveConfirm!==undefined)rows.push({key:'liveConfirm',label:'Confirmar ações',value:prefs.liveConfirm,choices:[{value:'auto',label:'Executar direto'},{value:'voice',label:'Diga “sim”'},{value:'click',label:'Clique para confirmar'},{value:'destructive',label:'Confirmar só paradas e edições'}],change:value=>({liveConfirm:value as VoicePrefs['liveConfirm']})});
 if(prefs.liveTaskUpdates!==undefined)rows.push({key:'liveTaskUpdates',label:'Atualizações de tarefas',value:prefs.liveTaskUpdates,choices:[{value:'done',label:'Conclusões e impedimentos'},{value:'silent',label:'Só na tela'},{value:'chatty',label:'Acompanhar tarefas longas'}],change:value=>({liveTaskUpdates:value as VoicePrefs['liveTaskUpdates']})});
 if(prefs.liveIdleHangupMin!==undefined)rows.push({key:'liveIdleHangupMin',label:'Encerrar chamada por inatividade',value:String(prefs.liveIdleHangupMin),choices:[15,30,60].map(min=>({value:String(min),label:`${min} min`})),change:value=>({liveIdleHangupMin:Number(value) as VoicePrefs['liveIdleHangupMin']})});
 return rows;
}
export const wakeOnVoice=(on:boolean):Partial<VoicePrefs>=>({liveIdleMic:on?'open':'muted'});
export const carryToday=(on:boolean):Partial<VoicePrefs>=>({liveCarryToday:on});
export const liveLabel=(live:LiveSnapshot)=>({idle:'Iniciar chamada',connecting:'Conectando',listening:'Ouvindo',speaking:'Falando',standby:'Em espera',muted:'Microfone desligado'}[live.state]);
// The orb starts a call and wakes a muted one; only the End call button ends it (Chase, 2026-11-22).
export const liveToggleLabel=(live:LiveSnapshot)=>live.state==='idle'?'Iniciar chamada':live.state==='standby'&&live.micMuted?'Ativar microfone':'Chamada em andamento';
const liveCostFormat=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'});
export function liveClock(live:LiveSnapshot,now=Date.now()){
 const elapsed=Math.max(0,Math.floor((now-(live.startedAt??now))/1000));
 return `Ao vivo ${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')} · ~${liveCostFormat.format(live.cost??0)}`;
}
