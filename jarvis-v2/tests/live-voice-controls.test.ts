import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LiveCallBar,LiveVoiceSettings} from '../components/LiveVoiceControls';
import {carryToday,liveSettings,wakeOnVoice} from '../../obsidian-v2/shared/live-controls';
import {initialLive} from '../../obsidian-v2/shared/live-session';
import {createVoicePrefsStore,type VoicePrefs} from '../../obsidian-v2/shared/voice-prefs';

const local={spokenReplies:true,voice:null,rate:1};
const live={...local,voiceMode:'live',liveVoice:'marin',liveConfirm:'voice',liveTaskUpdates:'done',liveIdleMic:'open',liveIdleHangupMin:30,liveCarryToday:false,liveShareWork:true} satisfies VoicePrefs;
const settings=(prefs:VoicePrefs,unavailable:string|null=null)=>renderToStaticMarkup(createElement(LiveVoiceSettings,{prefs,live:{...initialLive,unavailable},save:()=>{}}));

test('older bridge adds no Live controls; unavailable Live shows a disabled option and the bridge reason',()=>{
 assert.equal(settings(local),'');
 const unavailable=settings({...live,voiceMode:'local'},'Run aos openai-key to set up Live voice.');
 assert.match(unavailable,/<button[^>]*disabled=""[^>]*>Ao vivo<\/button>/);
 assert.match(unavailable,/Run aos openai-key to set up Live voice/);
 assert.doesNotMatch(unavailable,/Confirmar ações|Encerrar chamada por inatividade|Ativar por voz/);
 const enabled=settings(live);
 assert.match(enabled,/Diga “sim”/);assert.match(enabled,/Clique para confirmar/);
 assert.match(enabled,/Confirmar só paradas e edições/);
 assert.match(enabled,/Conclusões e impedimentos/);assert.match(enabled,/Só na tela/);assert.match(enabled,/Acompanhar tarefas longas/);
 assert.match(enabled,/Ativar por voz/);assert.match(enabled,/Lembrar chamadas de hoje/);
 assert.match(enabled,/Compartilhar títulos de tarefas<input[^>]*checked=""/);
 assert.match(enabled,/O modo ao vivo recebe só os títulos das tarefas em andamento/);
 assert.doesNotMatch(settings({...live,liveShareWork:undefined}),/Compartilhar títulos de tarefas/);
});

test('Live controls send the saved bridge keys and keep idle minutes numeric',async()=>{
 let saved:VoicePrefs={...live,voiceMode:'local'};
 const posted:Partial<VoicePrefs>[]=[];
 const store=createVoicePrefsStore(async(path,options)=>{
  assert.equal(path,'/voice/prefs');assert.equal(options?.method,'POST');
  const value=JSON.parse(String(options?.body));posted.push(value);saved={...saved,...value};return {status:200,json:saved};
 });
 await store.save({voiceMode:'live'});
 const rows=liveSettings(store.getSnapshot().prefs);
 for(const [key,value] of [['liveVoice','cedar'],['liveConfirm','click'],['liveTaskUpdates','silent'],['liveIdleHangupMin','60']]){
  const row=rows.find(row=>row.key===key);assert.ok(row);await store.save(row.change(value));
 }
 await store.save(wakeOnVoice(false));await store.save(carryToday(true));await store.save({liveShareWork:false});
 assert.deepEqual(posted,[{voiceMode:'live'},{liveVoice:'cedar'},{liveConfirm:'click'},{liveTaskUpdates:'silent'},{liveIdleHangupMin:60},{liveIdleMic:'muted'},{liveCarryToday:true},{liveShareWork:false}]);
 assert.deepEqual(store.getSnapshot().prefs,saved);
});

test('the call bar renders the exact pending action and only offers click confirmation in click mode',()=>{
 const staged={actionId:'fixture',description:'Start the morning-intel workflow',expiresAt:Date.now()+10000};
 const call=(mode:'voice'|'click')=>renderToStaticMarkup(createElement(LiveCallBar,{live:{...initialLive,state:'listening',ready:true,startedAt:Date.now(),cost:0.12,staged:{...staged,mode}}}));
 assert.match(call('click'),/Ao vivo 00:00 · ~US\$\s0,12/);
 assert.match(call('click'),/Start the morning-intel workflow/);assert.match(call('click'),/>Confirmar<\/button>/);
 assert.match(call('voice'),/>Cancelar<\/button>/);assert.doesNotMatch(call('voice'),/>Confirmar<\/button>/);
 const busy=renderToStaticMarkup(createElement(LiveCallBar,{live:{...initialLive,occupied:'Live call in Obsidian'}}));
 assert.match(busy,/Live call in Obsidian/);assert.doesNotMatch(busy,/Encerrar chamada/);
});
