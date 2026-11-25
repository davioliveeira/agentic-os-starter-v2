"use client";
import {useEffect,useRef,useState} from 'react';
import {skillUnavailable,type DashboardProvider,type DashboardSkill} from '@/lib/dashboard-skills';

export default function SkillBrowser({onClose,onSelect,available,catalog,provider,installedProviders}:{onClose:()=>void;onSelect:(id:string)=>void;available:boolean;catalog:DashboardSkill[];provider:DashboardProvider;installedProviders?:DashboardProvider[]}){
  const dialog=useRef<HTMLDialogElement>(null),[query,setQuery]=useState('');
  useEffect(()=>{const element=dialog.current,previous=document.activeElement as HTMLElement|null;element?.showModal();element?.querySelector('input')?.focus();return()=>{element?.close();previous?.focus()}},[]);
  const matches=catalog.filter(skill=>`${skill.id} ${skill.label} ${skill.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <dialog ref={dialog} className="skill-browser" aria-labelledby="skill-browser-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
    <header><div><h2 id="skill-browser-title">Suas skills</h2><p>Encontre o fluxo de que precisa.</p></div><button onClick={onClose} aria-label="Fechar catálogo de skills">×</button></header>
    <label className="skill-search"><span>Buscar</span><input type="search" aria-label="Buscar skills" placeholder="Pesquisa, planejamento, conteúdo…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="skill-browser-meta"><span>{matches.length} skills</span>{!available&&<span>Executor de fluxos desconectado</span>}</div>
    <div className="skill-results">
      {matches.map(skill=>{const reason=skillUnavailable(skill,provider,installedProviders);return <button key={skill.id} disabled={!available||!!reason} title={reason||skill.description} onClick={()=>{onClose();onSelect(skill.id)}}><span>{skill.label}<small>{skill.kind==='installed'?'Instalada · abre em um terminal':skill.arg==='url'?'Informe o link da fonte':skill.arg?'Informe um tema':'Fluxo incluído'}</small>{reason&&<small>{reason}</small>}</span><span aria-hidden="true">↗</span></button>})}
      {!matches.length&&<p className="skill-no-results">Nenhuma skill encontrada. Tente “pesquisa” ou “planejar”.</p>}
    </div>
    <footer>{available?'Usa o provedor selecionado. Fluxos incluídos rodam em segundo plano. Skills instaladas abrem em um terminal.':'Você pode iniciar uma conversa pela área Terminais.'}</footer>
  </dialog>;
}
