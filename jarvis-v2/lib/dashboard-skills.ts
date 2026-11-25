import {SKILLS} from '../../obsidian-v2/shared/contract.mjs';
import {DEFAULT_HUD_SKILLS,MAX_DASHBOARD_SKILLS,builtinDescription} from '../../obsidian-v2/shared/dashboard.mjs';
import {createPollStore} from '../../obsidian-v2/shared/poll-store.mjs';
import {bridge} from './bridge';

export type DashboardProvider='claude'|'codex';
export type DashboardSkill={id:string;label:string;description:string;kind:'builtin'|'installed';arg?:string;direct?:boolean;providers:DashboardProvider[];available:boolean;reason?:string};
export type DashboardSnapshot={revision:string;configured:boolean;selected:string[]|null;catalog:DashboardSkill[];installedProviders?:DashboardProvider[];error?:string};
export type DiscoveredSkill={path:string;label:string;description:string;providers:DashboardProvider[]};
export type DashboardDiscovery={skills:DiscoveredSkill[];skipped?:number;truncated?:boolean;warnings?:string[];error?:string};
export type DashboardState={data:DashboardSnapshot;loaded:boolean;error:string};
type Request=(path:string,body?:unknown,timeoutMs?:number)=>Promise<any>;

export const initialDashboard:DashboardSnapshot={revision:'',configured:false,selected:null,catalog:Object.entries(SKILLS).filter(([id])=>id!=='voice-ask').map(([id,spec])=>({id,label:spec.label,description:builtinDescription(spec),kind:'builtin',arg:spec.arg,direct:spec.direct,providers:['claude','codex'],available:true}))};
export function dashboardIds(data:DashboardSnapshot):string[]{return [...(data.selected??DEFAULT_HUD_SKILLS)]}
export function dashboardEntries(data:DashboardSnapshot):DashboardSkill[]{return dashboardIds(data).map(id=>data.catalog.find(skill=>skill.id===id)??{id,label:id,description:'Esta skill salva saiu do catálogo.',kind:'installed',providers:[],available:false,reason:'Skill indisponível. Em Personalizar painel, remova o atalho ou registre o caminho atual.'})}
export function skillUnavailable(skill:DashboardSkill,provider:DashboardProvider,installedProviders?:DashboardProvider[]):string{
  if(!skill.available)return skill.reason||'Esta skill está indisponível.';
  if(!skill.providers.includes(provider))return `Use ${skill.providers.map(p=>p==='claude'?'Claude Code':'Codex').join(' ou ')} para esta skill.`;
  if(!skill.direct&&installedProviders&&!installedProviders.includes(provider))return `${provider==='claude'?'Claude Code':'Codex'} não está instalado. Escolha uma ferramenta disponível ou instale esta.`;
  return '';
}
export function toggleDashboardSkill(ids:string[],id:string):string[]{
  if(ids.includes(id))return ids.filter(value=>value!==id);
  if(ids.length>=MAX_DASHBOARD_SKILLS)throw new Error(`Escolha até ${MAX_DASHBOARD_SKILLS} skills. Remova uma para adicionar outra.`);
  return [...ids,id];
}
export function moveDashboardSkill(ids:string[],id:string,step:-1|1):string[]{
  const index=ids.indexOf(id),next=index+step,result=[...ids];
  if(index>=0&&next>=0&&next<ids.length)[result[index],result[next]]=[result[next],result[index]];
  return result;
}
export function dashboardDiscoveryNotice(result:DashboardDiscovery):string{
  return [`${result.skills.length} skills instaladas encontradas.`,result.skipped?`${result.skipped} caminhos ilegíveis, vinculados ou inválidos foram ignorados.`:'',result.truncated?'A busca chegou ao limite. Para incluir outra skill, informe o caminho completo do SKILL.md.':'',...(result.warnings??[]),'Escolha apenas skills que você reconhece e em que confia.'].filter(Boolean).join(' ');
}
export function createDashboardSkillsStore(request:Request=bridge,isHidden=()=>typeof document!=='undefined'&&document.hidden){
  const store=createPollStore({initial:{data:initialDashboard,loaded:false,error:''} as DashboardState,intervalMs:5000,
    load:async():Promise<DashboardState>=>{if(isHidden())return store.getSnapshot();try{return {data:await request('/dashboard'),loaded:true,error:''}}catch(error){return {...store.getSnapshot(),error:error instanceof Error?error.message:'Preferências do painel indisponíveis'}}},
    onStart:(refresh:()=>void)=>{if(typeof document==='undefined')return()=>{};const wake=()=>{if(!document.hidden)refresh()};document.addEventListener('visibilitychange',wake);return()=>document.removeEventListener('visibilitychange',wake)},
  });
  const publish=(data:DashboardSnapshot)=>{store.publish({data,loaded:true,error:''});return data};
  return {...store,
    save:async(revision:string,selected:string[]|null)=>publish(await request('/dashboard',{revision,selected})),
    register:async(revision:string,skill:Pick<DiscoveredSkill,'path'|'providers'> & {label?:string}):Promise<DashboardSnapshot & {registeredId:string}>=>{const result=await request('/dashboard/register',{revision,...skill});publish(result);return result},
    discover:(provider:DashboardProvider):Promise<DashboardDiscovery>=>request('/dashboard/discover?provider='+provider,undefined,15000),
  };
}
export const dashboardSkillsStore=createDashboardSkillsStore();
export async function launchInstalledSkill<T extends {provider:DashboardProvider;model:string}>(skill:DashboardSkill,requestText:string,selection:T,request:Request=bridge,installedProviders?:DashboardProvider[]){
  if(skill.kind!=='installed')throw new Error('Escolha uma skill instalada para abrir no terminal.');
  const reason=skillUnavailable(skill,selection.provider,installedProviders);if(reason)throw new Error(reason);
  if(!requestText.trim())throw new Error('Descreva o que a skill deve fazer.');
  return request('/dashboard/launch',{id:crypto.randomUUID(),skill:skill.id,request:requestText.trim(),selection},15000);
}
