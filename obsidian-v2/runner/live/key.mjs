import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPrivate} from './private-store.mjs';

export const CONSENT_VERSION=1;
export const LIVE_KEY_SHAPE=/^sk-(?!or-)[A-Za-z0-9_-]{16,500}$/;
export const LIVE_RUNTIME_DIR=fileURLToPath(new URL('../../.runtime/',import.meta.url));
export const liveKeyFile=runtimeDir=>path.join(runtimeDir,'openai.json');
function authorization(runtimeDir){
 let saved;
 try{saved=readPrivate(liveKeyFile(runtimeDir),null)}catch{return {reason:'Não foi possível ler a autorização da voz ao vivo. Rode aos openai-key.'}}
 if(typeof saved?.key!=='string'||!LIVE_KEY_SHAPE.test(saved.key))return {reason:'Rode aos openai-key para configurar a voz ao vivo.'};
 const consentAt=typeof saved.consentAt==='string'?Date.parse(saved.consentAt):NaN;
 if(saved.consentVersion!==CONSENT_VERSION||!Number.isFinite(consentAt)||consentAt<=0||consentAt>Date.now())return {reason:'A voz ao vivo precisa de uma autorização atualizada. Rode aos openai-key.'};
 return {key:saved.key,reason:null};
}
export function liveAuthorization(runtimeDir=LIVE_RUNTIME_DIR){
 const {key,reason}=authorization(runtimeDir);
 return {ready:!!key,reason};
}
export const readLiveKey=(runtimeDir=LIVE_RUNTIME_DIR)=>authorization(runtimeDir).key||null;
