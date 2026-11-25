const origin='https://api.openai.com';
const sessionId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(id);
export const validLiveSessionId=sessionId;
export class LiveCreateRejected extends Error{}
export const LIVE_MODEL='gpt-live-1.1';
// What a member can do about OpenAI's answer, or null when the answer is not one of the known cases.
export function liveRejection(status,code=''){
 if(status===401)return {kind:'refused',text:'A OpenAI não aceitou a chave de API. Rode aos openai-key e use uma chave válida de platform.openai.com/api-keys'};
 if(code==='insufficient_quota'||code==='billing_not_active')return {kind:'no-credit',text:'a conta da API da OpenAI associada a esta chave está sem créditos. Adicione créditos em Billing, em platform.openai.com, ou resgate os créditos incluídos se seu plano ChatGPT oferecer esse benefício. Depois, tente novamente'};
 if(status===429)return {kind:'busy',text:'a OpenAI está limitando as solicitações desta conta. Aguarde um minuto e tente de novo'};
 if(status===403||status===404||code==='model_not_found')return {kind:'no-model',text:'esta chave não tem permissão para usar o modelo de voz ao vivo ('+LIVE_MODEL+'). Confira o projeto e as permissões da chave em platform.openai.com'};
 if(status>=500)return {kind:'openai-down',text:'houve um problema no serviço da OpenAI. Tente novamente em um minuto'};
 return null;
}
// Asks OpenAI whether it accepts this key and shows it the Live model. It cannot see credit: only a call can.
// accepted | refused | no-model | unconfirmed (offline, a restricted key that may not list models, anything else).
export async function checkLiveKey(key,{httpOrigin=origin,fetchImpl=globalThis.fetch,timeoutMs=8000}={}){
 let response;
 try{response=await fetchImpl(httpOrigin+'/v1/models/'+LIVE_MODEL,{redirect:'error',headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(timeoutMs)})}
 catch{return {kind:'unconfirmed',detail:'Não foi possível conectar à OpenAI'}}
 try{await response.body?.cancel()}catch{}
 if(response.ok)return {kind:'accepted',detail:''};
 if(response.status===401)return {kind:'refused',detail:'HTTP 401'};
 if(response.status===404)return {kind:'no-model',detail:'HTTP 404'};
 return {kind:'unconfirmed',detail:'HTTP '+response.status};
}
export function createLiveTransport({httpOrigin=origin,wsOrigin=httpOrigin.replace(/^http/,'ws'),fetchImpl=globalThis.fetch,WebSocketImpl=globalThis.WebSocket}={}){
 return {
  async create(key,body,signal){
   const response=await fetchImpl(httpOrigin+'/v1/live/sessions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal});
   if(!response.ok){
    // Keep OpenAI's own reason (status, code, short message) so a rejection is diagnosable. Never the key or body.
    let reason='',code='';try{const error=(await response.json())?.error;code=typeof error?.code==='string'?error.code:'';reason=[error?.code,error?.message].filter(v=>typeof v==='string'&&v).join(': ')}catch{}
    reason=reason.split(key).join('').replace(/sk-[A-Za-z0-9_-]{8,}/g,'').replace(/\s+/g,' ').slice(0,180);
    // A known cause is said in plain words with what to do; anything else keeps OpenAI's own reason.
    const known=liveRejection(response.status,code);
    if(known)throw new LiveCreateRejected('A OpenAI recusou a solicitação de sessão ao vivo: '+known.text+'. (HTTP '+response.status+(/^[a-z_]{1,40}$/.test(code)?' '+code:'')+')');
    throw new LiveCreateRejected('A OpenAI recusou a solicitação de sessão ao vivo (HTTP '+response.status+(reason?' '+reason:'')+').');
   }
   const data=await response.json(),id=data?.session?.id;
   if(!sessionId(id))throw new Error('A resposta da chamada ao vivo veio sem o ID da sessão.');
   // Keep a valid ID even if the SDP is missing so recovery can close it.
   return {id,answerSdp:data.transport?.sdp??data.transport?.answer_sdp??data.answer_sdp??data.sdp};
  },
  attach(key,id,{signal,onEvent,onLoss}){
   if(!sessionId(id))throw new Error('O ID da sessão ao vivo é inválido.');
   return new Promise((resolve,reject)=>{
    if(signal.aborted)return reject(signal.reason);
    // Node 22's WebSocket accepts the Undici WebSocketInit dictionary.
    const socket=new WebSocketImpl(wsOrigin+'/v1/live/sessions/'+id+'/attach',{headers:{Authorization:'Bearer '+key}});
    let opened=false, intentional=false,lost=false;
    const forget=()=>signal.removeEventListener('abort',abort);
    const close=()=>{intentional=true;forget();try{socket.close()}catch{}};
    const abort=()=>{close();if(!opened)reject(signal.reason)};
    const loss=()=>{if(lost||intentional)return;lost=true;close();if(opened)onLoss();else reject(new Error('Não foi possível abrir a conexão auxiliar da chamada.'))};
    signal.addEventListener('abort',abort,{once:true});
    socket.addEventListener('open',()=>{if(intentional)return;opened=true;forget();resolve({send:event=>socket.send(JSON.stringify(event)),close})},{once:true});
    socket.addEventListener('message',({data})=>{if(intentional||typeof data!=='string'||data.length>1000000)return;let event;try{event=JSON.parse(data)}catch{return}onEvent(event)});
    socket.addEventListener('close',loss,{once:true});socket.addEventListener('error',loss,{once:true});
   });
  }
 };
}
