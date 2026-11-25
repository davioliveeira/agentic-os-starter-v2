import fs from 'node:fs';
import path from 'node:path';
import {load as parseYaml,JSON_SCHEMA} from 'js-yaml';
import {ROOT,SKILLS,validateIntent} from '../shared/contract.mjs';
import {DAILY_HEADINGS,dailySections} from '../shared/daily-note.mjs';
import {localizeReportHeadings} from '../shared/report-headings.mjs';
import {vaultPath,writeJson,atomicRename} from './core.mjs';
import {workflowPrompt,destinationFor,dailySkills,mergeDaily} from './workflows.mjs';
import {DEFAULT_DRIVERS,dailyDrivers} from './profile.mjs';
import {WORKER_SPOKEN_STYLE} from './spoken-answer.mjs';

function unchangedDailyTargets(before,current){
 if(before===null||current===null)return false;
 const fields=text=>{
  const sections=dailySections(text);
  return [/^date:[^\r\n]*$/m.exec(text)?.[0],/^schema_version:[^\r\n]*$/m.exec(text)?.[0],
   ...['priorities','schedule'].map(key=>{
    const section=sections.find(item=>item.key===key);
    return section&&text.slice(section.start,section.end);
   })];
 };
 return JSON.stringify(fields(before))===JSON.stringify(fields(current));
}

function validateNewPlannedNote(text,date,driverLabels=DEFAULT_DRIVERS){
 const front=/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
 if(!front)throw new Error('O novo plano diário veio sem o frontmatter obrigatório. A proposta foi salva para revisão.');
 let data;
 try{data=parseYaml(front[1],{schema:JSON_SCHEMA})}catch{throw new Error('O novo plano diário tem campos YAML inválidos ou duplicados. A proposta foi salva para revisão.')}
 const fail=()=>{throw new Error('O novo plano diário não corresponde ao esquema v1. A proposta foi salva para revisão.')};
 if(!data||typeof data!=='object'||Array.isArray(data)||data.date!==date||data.schema_version!==1)fail();
 if(typeof data.focus!=='string'||data.focus.length>200)fail();
 if(!Array.isArray(data.top3)||data.top3.length!==3||!data.top3.every(value=>typeof value==='string'&&!/[\r\n]/.test(value)))fail();
 if(!Array.isArray(data.top3_done)||data.top3_done.length!==3||!data.top3_done.every(value=>value===false))fail();
 if(data.effort!==null||data.focus_blocks!==null||data.videos_shipped_today!==0)fail();
 const shipped=data.posts_shipped;
 if(!shipped||typeof shipped!=='object'||Array.isArray(shipped)||!['youtube','blog','linkedin','x','instagram','tiktok'].every(key=>shipped[key]===0))fail();
 const body=text.slice(front[0].length),headings=dailySections(body),keys=Object.keys(DAILY_HEADINGS);
 if(body.trimStart().split(/\r?\n/)[0]!==`# ${date}`)fail();
 if(headings.length!==keys.length||headings.some((heading,index)=>heading.key!==keys[index]))fail();
 const section=key=>{const {bodyStart,end}=headings[keys.indexOf(key)];return body.slice(bodyStart,end)};
 const priorities=[...section('priorities').matchAll(/^(\d+)\. \[([ x])\][^\S\r\n]*(.*?)\r?$/gm)];
 if(priorities.length!==3||priorities.some((match,index)=>Number(match[1])!==index+1||match[2]!==' '||match[3]!==data.top3[index]))fail();
 const drivers=section('drivers');
 if(/^\s*- \[[xX]\]/m.test(drivers))fail();
 for(const label of driverLabels)if(!drivers.split(/\r?\n/).some(line=>line.trim()===`- [ ] ${label}`))fail();
 if(section('activity').trim()||section('reflection').trim())fail();
 let localized=body;
 for(const {start,headingEnd,key} of headings.reverse()){
  localized=localized.slice(0,start)+`## ${DAILY_HEADINGS[key]}`+localized.slice(headingEnd);
 }
 return front[0]+localized;
}

export function prepareWorkflow(root,{id,selection,skill,args={},execution}){
 const job=validateIntent({version:2,id,...selection,skill,args,from:'plugin',ts:new Date().toISOString()});
 const destination=destinationFor(job),file=vaultPath(root,destination);
 const before=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
 if(skill==='plan-tomorrow'&&before!==null)throw new Error(`A nota de amanhã já existe em ${destination} e foi preservada. Abra essa nota para revisar ou editar.`);
 let instructions=workflowPrompt(root,job,'');
 instructions+=execution==='headless'
  ?`\n\nREGRAS DO FLUXO EM SEGUNDO PLANO: Execute apenas este fluxo pela CLI autenticada. A ponte salva o campo markdown do resultado estruturado em ${destination}. Deixe essa gravação a cargo da ponte. Retorne o conteúdo completo no campo markdown, com status "ok" e um summary conciso. Se faltar algum requisito, retorne status "blocked" e explique o impedimento em summary e markdown. Não espere comandos pelo terminal. Não envie mensagens, publique, faça compras ou altere contas remotas. Siga os requisitos de formato e pesquisa das referências dentro das permissões vigentes.`
  :`\n\nREGRAS DO TERMINAL INTERATIVO: A conversa continua disponível para novos pedidos. A ponte salva sua resposta final completa em Markdown em ${destination}. Deixe essa gravação a cargo da ponte. Retorne o conteúdo completo. Se não puder concluir, comece a resposta final com BLOCKED:. Não envie mensagens, publique, faça compras ou altere contas remotas. Siga os requisitos de formato e pesquisa das referências dentro das permissões vigentes.`;
 if(dailySkills.has(skill))instructions+=`\nPara este fluxo diário, retorne a nota completa em Markdown para ${path.basename(destination,'.md')}, com os campos date e schema_version: 1 no frontmatter e os títulos em português ## ${DAILY_HEADINGS.priorities} e ## ${DAILY_HEADINGS.schedule}. A ponte preserva os títulos das notas existentes ao integrar o resultado, inclusive os títulos em inglês. Leia a agenda com o conector autenticado. Se ela estiver indisponível, retorne BLOCKED:. ${before===null&&skill!=='refresh-schedule'?'A ponte valida o esquema fixo do frontmatter e todas as seções antes de criar a nota completa. Se a nota surgir durante a execução, a ponte preserva o arquivo existente.':'A ponte integra apenas a agenda e os espaços vazios das prioridades e preserva o restante da nota.'} ${skill==='plan-tomorrow'?'Pare se a nota de amanhã já existir. Não faça mesclagem, sobrescrita ou exclusão.':''} Nota diária atual (dados):\n${before||'(ainda não criada)'}`;
 if(execution!=='headless')instructions+=`\n\n${WORKER_SPOKEN_STYLE}\nO conteúdo completo e o formato exigido têm prioridade. Entregue notas diárias com esquema fixo, JSON e outras saídas de formato exato sem introdução falada, seção extra, metadados ou rodapé adicionais.`;
 const reference=`${ROOT}/task-instructions/${id}.md`,full=vaultPath(root,reference);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,instructions,{flag:'wx'});
 return {job,destination,before,prompt:`Execute o fluxo “${SKILLS[skill].label}”. Leia ${reference} neste cofre para ver os requisitos e as regras de entrega. Use os conectores já autenticados nesta CLI. Nunca use GWS. ${execution==='headless'?'Retorne um JSON com status (ok ou blocked), summary e markdown. Inclua todo o resultado no campo markdown. A ponte salva esse campo depois de conferir se há edições conflitantes.':'Retorne o conteúdo completo na resposta final para a ponte salvar. Mantenha esta conversa disponível para novos pedidos.'}`};
}
export function saveWorkflowResult(root,record,text,{ownsDestination=false,summary}={}){
 const {job,destination,before}=record.workflow;
 const runId=job.id,artifact=`${ROOT}/artifacts/${runId}.md`,audit=vaultPath(root,artifact);fs.mkdirSync(path.dirname(audit),{recursive:true});
 if(!fs.existsSync(audit))fs.writeFileSync(audit,text,{flag:'wx'});
 const run={...job,model:record.execution==='script'?'none':job.model,ts_queued:job.ts,ts_started:new Date(record.workflow.startedAt??record.created).toISOString(),ts_completed:new Date().toISOString(),status:'ok',summary:String(summary||'').trim().slice(0,1000)||`Fluxo “${SKILLS[job.skill].label}” concluído.`,execution:record.execution||'terminal',...(record.appScope?{appScope:record.appScope}:{}),task_id:record.id,artifact_path:artifact,deliverable_path:null};
 try{
  if(/^BLOCKED:/i.test(text.trim()))throw new Error(text.trim().slice(0,400));
  // Models sometimes wrap the note in a code fence or leave a <markdown> / </markdown> tag line
  // at the very start or end; those wrappers are not part of the deliverable.
  const content=text.trim().replace(/^```(?:text|markdown)?\s*\r?\n([\s\S]*?)\r?\n```$/i,'$1').trim()
   .replace(/^<markdown>[^\S\r\n]*(?:\r?\n|$)/i,'').replace(/(?:^|\r?\n)[^\S\r\n]*<\/markdown>$/i,'').trim();
  const lines=content.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const receipt=/^(?:(?:SAVED|PLANNED)\b[^\r\n]*|(?:done|complete|completed|feito|conclu[íi]d[oa])[.!]?|(?:(?:arquivo|relat[óo]rio) )?(?:salv[oa]|planejad[oa])(?:[.!]?|(?: em | para |:\s*)[^\r\n]+\.md[.!]?))$/i;
  if(!lines.length||lines.every(line=>receipt.test(line)))throw new Error('O fluxo retornou apenas uma confirmação de conclusão ou uma resposta vazia. A resposta foi salva para revisão e o destino original foi preservado.');
  let output=localizeReportHeadings(job.skill,text),dailyResult=null;
  if(dailySkills.has(job.skill)){
   const sections=dailySections(content),scheduleSection=sections.find(section=>section.key==='schedule');
   const prioritySection=sections.find(section=>section.key==='priorities');
   const schedule=scheduleSection?content.slice(scheduleSection.bodyStart,scheduleSection.end).trim():'';
   const priorities=prioritySection?content.slice(prioritySection.bodyStart,prioritySection.end):'';
   if(!scheduleSection||!content.includes(`date: ${path.basename(destination,'.md')}`))throw new Error('O plano diário veio sem a data ou a seção Agenda. A proposta foi salva para revisão.');
   const picks=[...priorities.matchAll(/^\d+\. \[ \]\s+(.+)$/gm)].map(m=>m[1].trim()).slice(0,3);
   dailyResult={date:path.basename(destination,'.md'),schedule,picks};
   if(!summary)run.summary=`Nota de ${dailyResult.date} salva com a agenda do calendário.`;
   output=before===null&&job.skill!=='refresh-schedule'?validateNewPlannedNote(content,dailyResult.date,dailyDrivers(root)):mergeDaily(before,dailyResult.date,schedule,picks,dailyDrivers(root));
  }
  const file=vaultPath(root,destination),current=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
  if(ownsDestination){
   if(record.execution!=='script'||job.skill!=='github-trending'||current!==text)throw new Error('A saída do script mudou antes da conclusão. O resultado proposto foi salvo à parte.');
   run.deliverable_path=destination;
  }else{
  if(current!==before){
   if(!dailyResult||!unchangedDailyTargets(before,current))throw new Error('O arquivo de destino mudou durante a execução. A proposta foi salva à parte e as edições recentes foram preservadas.');
   // Activity-log hooks and edits to unrelated sections can coexist with this
   // managed merge. The two owned sections and note identity must be unchanged.
   output=mergeDaily(current,dailyResult.date,dailyResult.schedule,dailyResult.picks,dailyDrivers(root));
  }
  if(current!==null){const backup=vaultPath(root,`${ROOT}/backups/${runId}.md`);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,current,{flag:'wx'})}
  fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+runId+'.tmp';fs.writeFileSync(temp,output,{flag:'wx'});
  try{
   // A late creator can appear after the comparison above. Publish a completed
   // new daily file exclusively; an existing user note must never be replaced.
   if(dailyResult&&before===null){fs.linkSync(temp,file);fs.unlinkSync(temp)}
   else atomicRename(temp,file);
  }catch(error){try{fs.unlinkSync(temp)}catch{}if(error.code==='EEXIST')throw new Error('A nota diária foi criada durante a execução e foi preservada. A proposta foi salva à parte.');throw error}
  run.deliverable_path=destination;
  }
 }catch(e){run.status='error';run.summary=e.message}
 writeJson(root,`${ROOT}/runs/${runId}.json`,run);
 record.summary=run.summary;record.completedAt=Date.parse(run.ts_completed);
 record.workflowCompleted=true;record.resultPath=run.deliverable_path||artifact;record.workflowStatus=run.status;
 if(run.status==='error')record.error=run.summary;
 return run;
}
