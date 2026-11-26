import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {findCli} from './cli-runtime.mjs';
import {withCodexRpc} from './wispr-mcp.mjs';
import {withoutOpenAIKey} from './child-env.mjs';

const execute=promisify(execFile);
export async function integrationCli(root,provider,args,{signal,timeout=30000,wisprAuthorization=false}={}){
 const cli=findCli(provider);
 if(!cli)throw new Error('A ferramenta de código não está instalada.');
 try{
  const pending=execute(cli.command,[...cli.prefix,...args],{cwd:root,env:withoutOpenAIKey(process.env),signal,timeout,maxBuffer:8*1024*1024,windowsHide:true});
  if(wisprAuthorization){
   let buffer='',opened=false;
   const see=chunk=>{
    if(opened)return;
    buffer=(buffer+chunk.toString()).slice(-32768);
    const authorization=buffer.match(/https:\/\/mcp-auth\.wisprflow\.com\/oauth2\/authorize\?[^\s]+(?=\s)/)?.[0];
    if(authorization){
     opened=true;
     const windows=process.platform==='win32';
     const command=windows?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
     const options=windows?['url.dll,FileProtocolHandler',authorization]:[authorization];
     void execute(command,options,{timeout:10000,windowsHide:true}).catch(()=>{});
    }
   };
   pending.child.stdout.on('data',see);
   pending.child.stderr.on('data',see);
  }
  const {stdout}=await pending;
  return stdout;
 }catch{throw new Error('O aplicativo não concluiu a operação da integração.')}
}

const names={codex:'Codex',claude:'Claude Code'};
const wisprEndpoint='https://api.wisprflow.ai/connect/mcp';
const wisprName=/\bwispr[\s_-]*flow\b/i;
function isWispr(endpoint){
 try {
  const url=new URL(endpoint);
  return url.protocol==='https:'&&url.hostname==='api.wisprflow.ai';
 }catch{return false}
}
export function parseIntegrations(provider,stdout){
 if(provider==='codex'){
  const rows=JSON.parse(stdout);
  if(!Array.isArray(rows))throw new Error('Lista de integrações inválida.');
  return rows.filter(row=>row&&typeof row.name==='string').map(row=>{
   const http=row.transport?.type==='streamable_http'||row.transport?.type==='http';
   const actions=['remove',...(http?(row.auth_status==='oauth'?['logout']:['login']):[])];
   return {provider,name:row.name,status:row.enabled===false?'desativada':({oauth:'conectada',not_logged_in:'requer autenticação',bearer_token:'credencial configurada'})[row.auth_status]||'configurada',
    scope:null,actions,wispr:!!http&&isWispr(row.transport.url)};
  });
 }
 const rows=[];
 const statusMap={Connected:'conectada','Needs authentication':'requer autenticação','Failed to connect':'indisponível','Pending approval':'aguarda aprovação',Disabled:'desativada'};
 for(const line of stdout.split(/\r?\n/)){
  const match=/^(.+?):\s+(.+?)\s+-\s+[^\p{L}]*([\p{L}][\p{L} ]*)\s*$/u.exec(line);
  if(!match)continue;
  const [,name,endpoint,status]=match;
  const managed=name.startsWith('claude.ai ');
  const actions=managed?[]:['remove',...(/^https?:\/\//i.test(endpoint)?['login','logout']:[])];
  rows.push({provider,name,status:statusMap[status.trim()]||'estado desconhecido',scope:managed?'Conta Claude':null,
   manageUrl:managed?'https://claude.ai/settings/connectors':null,actions,wispr:isWispr(endpoint.split(/\s/)[0])||managed&&wisprName.test(name)});
 }
 return rows;
}

async function codexApps(root) {
 const result=await withCodexRpc(root,AbortSignal.timeout(10000),call=>call('app/installed',{}));
 return Array.isArray(result?.apps)?result.apps:[];
}

export function createIntegrationInventory(root,{invoke=integrationCli,readApps=invoke===integrationCli?codexApps:async()=>[]}={}){
 async function read(provider){
  if(provider==='claude')return parseIntegrations(provider,await invoke(root,provider,['mcp','list']));
  const [servers,installed]=await Promise.all([
   invoke(root,provider,['mcp','list','--json']),
   readApps(root).catch(()=>[])
  ]);
  const apps=installed.filter(app=>typeof app.runtimeName==='string'&&typeof app.id==='string').map(app=>({
   provider,name:app.runtimeName,server:`app:${app.id}`,scope:'Conta Codex',
   status:app.enabled?(app.callable?'conectada':'indisponível'):'desativada',
   actions:[],manageUrl:'https://chatgpt.com/apps',wispr:wisprName.test(app.runtimeName)
  }));
  return [...apps,...parseIntegrations(provider,servers)];
 }
 async function list(){
  return Promise.all(Object.keys(names).map(async provider=>{
   try{return {provider,label:names[provider],connections:await read(provider)}}
   catch{return {provider,label:names[provider],connections:[],error:'Não foi possível listar as conexões.'}}
  }));
 }
 async function change({provider,name,action}){
  if(!Object.hasOwn(names,provider)||typeof name!=='string'||!name||name.startsWith('-')||!['login','logout','remove'].includes(action))throw new Error('Ação de integração inválida.');
  const connection=(await read(provider)).find(row=>!row.server&&row.name===name);
  if(!connection?.actions.includes(action))throw new Error('Esta ação não está disponível para a conexão.');
  let args=['mcp',action,name];
  if(provider==='claude'&&action==='remove'){
   const details=await invoke(root,provider,['mcp','get',name]);
   const scope=/^\s*Scope: (user|local|project) config\b/im.exec(details)?.[1].toLowerCase();
   if(!scope)throw new Error('O Claude Code não confirmou um escopo que possa ser removido pelo Jarvis.');
   args=['mcp',action,'--scope',scope,name];
  }
  await invoke(root,provider,args,{timeout:action==='login'?300000:30000,wisprAuthorization:action==='login'&&connection.wispr});
  return {ok:true};
 }
 let connecting=false;
 async function connectWispr(){
  if(connecting)throw new Error('Já há uma conexão do Wispr em andamento.');
  connecting=true;
  try {
   const existing=await read('codex');
   if(existing.some(row=>row.wispr&&row.server))throw new Error('O Wispr já está disponível nos aplicativos do Codex. Selecione essa conexão.');
   if(existing.some(row=>row.wispr))throw new Error('O Wispr já foi adicionado ao Codex. Use a conexão existente.');
   if(existing.some(row=>row.name==='wispr-flow'))throw new Error('Já existe uma integração chamada wispr-flow no Codex.');
   await invoke(root,'codex',['mcp','add','wispr-flow','--url',wisprEndpoint],{timeout:300000,wisprAuthorization:true});
   return {ok:true};
  } finally {connecting=false}
 }
 return {list,read,change,connectWispr};
}
