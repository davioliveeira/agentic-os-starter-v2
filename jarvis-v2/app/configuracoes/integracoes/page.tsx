"use client";

import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import styles from './integrations.module.css';

type Provider = 'claude'|'codex';
type Connection = {
 provider:Provider; name:string; status:string; scope:string|null;
 actions:('login'|'logout'|'remove')[]; manageUrl?:string|null; wispr:boolean;
};
type Inventory = {
 providers:{provider:Provider;label:string;connections:Connection[];error?:string}[];
 wispr:{provider?:Provider;server?:string;enabled:boolean;running:boolean;folder:string;
  last?:{status:string;at:string;imported?:number;message?:string}};
};
const labels={login:'Conectar',logout:'Sair',remove:'Remover'};
const connectionKey=(item:{provider?:Provider;name?:string})=>JSON.stringify([item.provider,item.name]);

export default function Integrations() {
 const [state,setState]=useState<Inventory|null>(null);
 const [selected,setSelected]=useState('');
 const [pending,setPending]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  const response=await fetch('/api/integrations',{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error);
  setState(result);
 },[]);
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[refresh]);
 const wispr=state?.wispr;
 const monitor=!!(wispr?.enabled||wispr?.running);
 useEffect(()=>{
  if(!monitor)return;
  const controller=new AbortController();
  const timer=setInterval(async()=>{
   try{
    const response=await fetch('/api/integrations?status=1',{cache:'no-store',signal:controller.signal});
    if(response.ok){
     const current=await response.json();
     if(!controller.signal.aborted)setState(previous=>previous?{...previous,wispr:current}:previous);
    }
   }catch{/* Retain the last status until the connection comes back. */}
  },5000);
  return ()=>{clearInterval(timer);controller.abort();};
 },[monitor]);
 const connections=state?.providers.flatMap(group=>group.connections).filter(item=>item.wispr)||[];
 const activeKey=wispr?.server?connectionKey({provider:wispr.provider,name:wispr.server}):'';
 const selectedKey=selected||activeKey||connectionKey(connections[0]||{});
 const source=connections.find(item=>connectionKey(item)===selectedKey);
 const active=wispr?.enabled===true;
 async function act(input:Record<string,unknown>,success:string) {
  setPending(true);setMessage('');setError('');
  try {
   const response=await fetch('/api/integrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   const result=await response.json();
   if(!response.ok||result.status==='error')throw new Error(result.error||result.message);
   setMessage(success);
  }catch(e){setError(e instanceof Error?e.message:'A operação falhou.');}
  finally {await refresh().catch(e=>setError(e.message));setPending(false);}
 }
 function toggle() {
  if(active)void act({action:'configure',enabled:false},'Importação pausada.');
  else if(source)void act({action:'configure',provider:source.provider,server:source.name,enabled:true},'Importação automática ativada.');
 }
 return <main className={styles.page}>
  <Link href="/">← Voltar ao Jarvis</Link>
  <header className={styles.title}>
   <h1>Integrações</h1>
   <button disabled={pending} onClick={()=>{setError('');void refresh().catch(e=>setError(e.message));}}>Atualizar conexões</button>
  </header>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {message&&<p role="status">{message}</p>}
  {!state&&!error&&<p role="status">Carregando conexões…</p>}
  {state&&<>
   <section className={styles.card} aria-labelledby="wispr-heading">
    <div className={styles.title}><h2 id="wispr-heading">Wispr Flow</h2><span>{active?'Importação ativa':'Importação pausada'}</span></div>
    <p>Importa novas calls próprias finalizadas a cada 15 minutos. As transcrições ficam em <code>{wispr?.folder}/</code> no cofre.</p>
    <label htmlFor="wispr-connection">Conexão usada na importação</label>
    <select id="wispr-connection" disabled={pending||active||!connections.length} value={source?selectedKey:''} onChange={e=>setSelected(e.currentTarget.value)}>
     {!connections.length&&<option value="">Nenhuma conexão com Wispr Flow encontrada</option>}
     {connections.map(item=><option key={connectionKey(item)} value={connectionKey(item)}>{item.provider==='claude'?'Claude Code':'Codex'} · {item.name}</option>)}
    </select>
    <div className={styles.actions}>
     {!connections.some(item=>item.provider==='codex')&&<button disabled={pending} onClick={()=>{
      void act({action:'connect-wispr'},'Wispr Flow adicionado ao Codex.');
      setMessage('Aguardando a configuração do Codex. Conclua a autorização no navegador caso seja solicitada.');
     }}>Conectar pelo Codex</button>}
     <button disabled={!source||pending} onClick={()=>source&&void act({action:'probe',provider:source.provider,server:source.name},'Conexão com o Wispr Flow verificada.')}>Testar conexão</button>
     <button disabled={pending||(!active&&!source)} onClick={toggle}>{active?'Pausar importação':'Ativar importação automática'}</button>
     <button disabled={!active||pending||wispr?.running} onClick={()=>void act({action:'sync'},'Sincronização concluída.')}>Sincronizar agora</button>
    </div>
    {wispr?.running&&<p>Sincronização em andamento.</p>}
    {wispr?.last&&<p>Última sincronização em {new Date(wispr.last.at).toLocaleString('pt-BR')}. {wispr.last.message||`${wispr.last.imported??0} nova(s) reunião(ões).`}</p>}
   </section>
   {state.providers.map(group=><section className={styles.card} key={group.provider}>
    <h2>{group.label}</h2>
    {group.error&&<p>{group.error}</p>}
    {!group.error&&!group.connections.length&&<p>Nenhuma conexão encontrada.</p>}
    {group.connections.map(item=><div className={styles.connection} key={connectionKey(item)}>
     <div><strong>{item.name}</strong><p>{[item.status,item.scope].filter(Boolean).join(' · ')}</p></div>
     <div className={styles.actions}>
      {item.manageUrl&&<a href={item.manageUrl} target="_blank" rel="noreferrer">Gerenciar na conta</a>}
      {item.actions.map(action=><button key={action} disabled={pending} onClick={()=>{
       if(action!=='login'&&!window.confirm(`${labels[action]} da conexão ${item.name} em ${group.label}?`))return;
       void act({action,provider:item.provider,name:item.name},'Conexão atualizada.');
      }}>{labels[action]}</button>)}
     </div>
    </div>)}
   </section>)}
  </>}
 </main>;
}
