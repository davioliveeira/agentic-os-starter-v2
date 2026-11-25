import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {openUrl} from './platform.mjs';
import {CONSENT_VERSION,LIVE_KEY_SHAPE,liveKeyFile} from '../../runner/live/key.mjs';
import {writePrivate} from '../../runner/live/private-store.mjs';
import {checkLiveKey,LIVE_MODEL} from '../../runner/live/transport.mjs';

const KEYS_URL='https://platform.openai.com/api-keys';
const link=(url,text)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const page=content=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Agentic OS — Voz ao vivo</title><main>${content}</main></html>`;
const form=note=>page(`<h1>Configurar voz ao vivo</h1><p>A voz ao vivo envia à OpenAI o áudio do microfone, um resumo do cofre (seção Sobre mim, plano de hoje, rotinas diárias, títulos e status das tarefas, contagens da caixa de entrada, métricas, notícias, radar e notas adicionadas com live-context), respostas de tarefas delegadas e trechos de relatórios. Você pode desativar a opção de compartilhar títulos nas configurações da voz ao vivo. O compartilhamento do resumo da manhã vem desativado. Ao ativá-lo, você também envia o resumo completo, incluindo a seção de e-mails. A ponte envia a opção store: false. A OpenAI cobra as chamadas da sua conta da API.</p><p>A chave da API fica salva neste computador. Ao salvá-la aqui, você registra seu consentimento para o envio desses dados.</p>
<h2>Precisa de uma chave?</h2><ol><li>Entre em ${link('https://platform.openai.com','platform.openai.com')}. A conta da API da OpenAI é separada do ChatGPT.</li><li>Adicione créditos em Billing. Se seu plano do ChatGPT incluir créditos de API, você pode resgatá-los. As chamadas param quando o saldo acaba.</li><li>Crie uma chave na ${link(KEYS_URL,'página de chaves da API')}, copie-a por inteiro e cole-a abaixo.</li></ol>
<form method="post" autocomplete="off"><label>Chave de API da OpenAI <input name="key" type="password" required></label><p><label><input name="consent" value="yes" type="checkbox" required> Autorizo o envio desses dados à OpenAI durante as chamadas ao vivo.</label></p><button>Salvar chave e autorização</button></form>${note?'<p role="alert"><strong>'+note+'</strong></p>':''}`);
const NEXT='<p>Abra o menu <strong>···</strong> no cartão de voz do Jarvis ou ao lado do orbe no Obsidian, selecione <strong>Ao vivo</strong>, inicie uma chamada e permita o uso do microfone. Sua primeira chamada também precisa de créditos na conta da API da OpenAI.</p><p>Você já pode fechar esta aba.</p>';
const DONE={
 accepted:'<h1>Chave salva</h1><p>A OpenAI aceitou a chave.</p>'+NEXT,
 'no-model':`<h1>Chave salva com um aviso</h1><p>A OpenAI aceitou a chave, mas o modelo de voz ao vivo (${LIVE_MODEL}) não apareceu entre os modelos disponíveis para ela. A chamada pode ser recusada. Confira o projeto e as permissões da chave na ${link(KEYS_URL,'página de chaves da API')} e teste uma chamada.</p>`+NEXT,
 unconfirmed:'<h1>Chave salva</h1><p>Não foi possível verificar a chave com a OpenAI agora. A primeira chamada servirá de teste. Se ela for recusada, a mensagem na tela mostrará o motivo.</p>'+NEXT,
};
// What is wrong with what was typed, before anything is sent anywhere.
function typed(key,consent){
 if(/^sk-or-/.test(key))return 'Esta é uma chave do OpenRouter para o Jev. A voz ao vivo usa uma chave da API da OpenAI, disponível em platform.openai.com/api-keys.';
 if(!LIVE_KEY_SHAPE.test(key))return 'O formato da chave da API da OpenAI é inválido. Copie toda a chave, incluindo o prefixo sk-, de platform.openai.com/api-keys.';
 if(consent!=='yes')return 'Marque a caixa de autorização para continuar.';
 return '';
}

// check exists for the tests; members never pass it. It asks OpenAI whether the key works before it is saved.
export function collectOpenAIKey({runtimeDir,timeoutMs=300000,open=openUrl,announce=()=>{},check=checkLiveKey}){
 const token=randomBytes(24).toString('hex'),wanted=Buffer.from('/'+token);
 return new Promise((resolve,reject)=>{
  let timer,finished=false,saved=false,checking=false;
  const finish=result=>{if(finished)return;finished=true;clearTimeout(timer);server.close();server.closeAllConnections?.();resolve(result)};
  const server=http.createServer((req,res)=>{
   const host='127.0.0.1:'+server.address().port,origin='http://'+host,supplied=Buffer.from(String(req.url||''));
   const reply=(status,html)=>{res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'"});res.end(html)};
   if(req.headers.host!==host||supplied.length!==wanted.length||!timingSafeEqual(supplied,wanted))return reply(404,page('<h1>Página não encontrada</h1>'));
   if(req.method==='GET'&&!saved)return reply(200,form());
   if(req.method!=='POST'||req.headers.origin!==origin||!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||''))return reply(403,page('<h1>Solicitação recusada</h1>'));
   let size=0;const chunks=[];
   req.on('data',chunk=>{size+=chunk.length;if(size>4096)req.destroy();else chunks.push(chunk)});
   req.on('end',async()=>{
    if(finished||saved)return reply(409,page('<h1>Esta página já foi usada</h1>'));
    if(checking)return reply(409,form('A chave ainda está sendo verificada. Aguarde um momento.'));
    const data=new URLSearchParams(Buffer.concat(chunks).toString('utf8')),key=(data.get('key')||'').trim();
    const problem=typed(key,data.get('consent'));
    if(problem)return reply(400,form(problem));
    // A key OpenAI refuses is never saved: the page stays open for another try.
    let kind='unconfirmed';
    checking=true;
    try{const result=await check(key);if(['accepted','refused','no-model'].includes(result?.kind))kind=result.kind}catch{}
    finally{checking=false}
    if(finished)return reply(409,page('<h1>Esta página expirou</h1><p>Rode o comando novamente.</p>'));
    if(kind==='refused')return reply(400,form('A OpenAI não aceitou esta chave. Copie-a novamente de platform.openai.com/api-keys ou crie outra e tente de novo.'));
    try{writePrivate(liveKeyFile(runtimeDir),JSON.stringify({key,consentAt:new Date().toISOString(),consentVersion:CONSENT_VERSION}))}
    catch{return reply(500,form('Não foi possível salvar a chave. Confira a pasta da instalação e tente novamente.'))}
    saved=true;res.once('finish',()=>finish({saved:true,check:kind}));reply(200,page(DONE[kind]));
   });
  });
  server.once('error',reject);
  server.listen({host:'127.0.0.1',port:0,exclusive:true},()=>{
   const url='http://127.0.0.1:'+server.address().port+'/'+token;
   timer=setTimeout(()=>finish({saved,reason:'timeout'}),timeoutMs);
   announce(url);try{open(url)}catch{}
  });
 });
}

// The line the command prints after the page closes, for the member and for the agent helping them.
export function openAIKeyOutcome(result){
 if(!result?.saved)return 'A página expirou após cinco minutos e a chave não foi salva. Rode o comando novamente quando quiser continuar.';
 if(result.check==='accepted')return 'Chave salva. A OpenAI aceitou a chave. Selecione Ao vivo no menu de voz e inicie uma chamada.';
 if(result.check==='no-model')return `Chave salva com um aviso. O modelo de voz ao vivo (${LIVE_MODEL}) não apareceu entre os modelos disponíveis para esta chave. Confira se o projeto da chave tem permissão para usar o modelo.`;
 return 'Chave salva. Não foi possível conectar à OpenAI para verificar a chave. A primeira chamada servirá de teste.';
}
