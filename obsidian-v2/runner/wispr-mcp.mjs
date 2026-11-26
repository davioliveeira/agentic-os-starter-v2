import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {findCli} from './cli-runtime.mjs';
import {withoutOpenAIKey} from './child-env.mjs';

function parseMcp(result){
 if(result?.isError)throw new Error('A consulta ao Wispr foi recusada.');
 if(result?.structuredContent&&typeof result.structuredContent==='object')return result.structuredContent;
 const text=result?.content?.find?.(item=>item.type==='text')?.text;
 if(!text)throw new Error('O Wispr não retornou dados.');
 return JSON.parse(text);
}

export function withCodexRpc(root,signal,operation,{resolve=findCli,launch=spawn}={}){
 const cli=resolve('codex');
 if(!cli)throw new Error('Codex indisponível.');
 return new Promise((resolveResult,reject)=>{
  const proc=launch(cli.command,[...cli.prefix,'app-server','--stdio'],{cwd:root,env:withoutOpenAIKey(process.env),stdio:['pipe','pipe','ignore'],windowsHide:true});
  const lines=createInterface({input:proc.stdout});
  const pending=new Map();
  let id=0,closed=false;
  const send=record=>proc.stdin.write(JSON.stringify(record)+'\n');
  const finish=(error,value)=>{
   if(closed)return;
   closed=true;
   clearTimeout(timer);
   signal?.removeEventListener('abort',cancel);
   lines.close();
   proc.stdin.end();
   proc.kill();
   for(const {reject:fail} of pending.values())fail(error||new Error('Conexão encerrada.'));
   pending.clear();
   if(error)reject(error);else resolveResult(value);
  };
  const cancel=()=>finish(new Error('Consulta ao Codex cancelada.'));
  const timer=setTimeout(()=>finish(new Error('Tempo limite da integração com Codex excedido.')),45000);
  const call=(method,params)=>new Promise((done,fail)=>{
   if(closed){fail(new Error('Conexão encerrada.'));return}
   const requestId=++id;
   pending.set(requestId,{resolve:done,reject:fail});
   send({id:requestId,method,params});
  });
  const fail=()=>finish(new Error('O Codex encerrou a conexão MCP.'));
  proc.once('error',fail);
  proc.once('exit',fail);
  proc.stdin.on('error',fail);
  lines.on('line',line=>{
   let message;
   try{message=JSON.parse(line)}catch{return}
   if(message.method&&message.id!=null){
    send({id:message.id,error:{code:-32601,message:'A operação não permite aprovações interativas.'}});
    return;
   }
   const entry=pending.get(message.id);
   if(!entry)return;
   pending.delete(message.id);
   if(message.error)entry.reject(new Error('O Codex recusou a operação MCP.'));
   else entry.resolve(message.result);
  });
  if(signal?.aborted){cancel();return}
  signal?.addEventListener('abort',cancel,{once:true});
  (async()=>{
   await call('initialize',{clientInfo:{name:'agentic_os_wispr',version:'1.0.0'},capabilities:{experimentalApi:true}});
   send({method:'initialized'});
   return operation(call);
  })().then(value=>finish(null,value),finish);
 });
}

export async function callWisprWithCodex(root,server,tool,args,signal,rpc=withCodexRpc){
 return rpc(root,signal,async call=>{
  const {thread}=await call('thread/start',{cwd:root,ephemeral:true,approvalPolicy:'never',sandbox:'read-only'});
  const result=await call('mcpServer/tool/call',{threadId:thread.id,server,tool,arguments:args});
  return parseMcp(result);
 });
}
