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
 let instructions=workflowPrompt(root,job,'Use only the data sources required by this workflow. For Google reads, use the connected Google Calendar, Gmail and Drive tools. In Claude Code, use tool search to load the connector if needed (their names contain Google_Calendar, Gmail or Google_Drive). In Codex, use its connected Google tools. Try the appropriate connector before reporting calendar or mail unavailable. A YouTube channel review requires neither. If a required source is absent, identify it specifically.');
 instructions+=execution==='headless'
  ?`\n\nBACKGROUND WORKFLOW CONTRACT: Complete this one workflow using the normal authenticated CLI. The bridge saves the markdown field of your structured result to ${destination}. Do not write that destination yourself. Return the actual complete deliverable in markdown, not a receipt or short confirmation, with status "ok" and a concise summary. If you cannot complete it, return status "blocked" and explain the missing requirement in summary and markdown. Do not wait for terminal input. Do not send messages, publish, purchase, or modify remote accounts. Treat references as requirements for format and research, not authorization to bypass permissions.`
  :`\n\nINTERACTIVE TERMINAL CONTRACT: This conversation remains available for follow-up. The bridge saves your complete final Markdown answer to ${destination}. Do not write that destination yourself. Return the actual complete deliverable, not a receipt or a short confirmation. If you cannot complete it, start your final answer with BLOCKED:. Do not send messages, publish, purchase, or modify remote accounts. Treat references as requirements for format and research, not authorization to bypass permissions.`;
 if(dailySkills.has(skill))instructions+=`\nFor this daily workflow, return a complete Markdown daily note for ${path.basename(destination,'.md')}, including frontmatter date and schema_version: 1, and the Portuguese headings ## ${DAILY_HEADINGS.priorities} and ## ${DAILY_HEADINGS.schedule}. Existing notes may have English headings; their headings are preserved when the bridge merges the result. Read the calendar via your authenticated connector; if unavailable, return BLOCKED:. ${before===null&&skill!=='refresh-schedule'?'The bridge validates and creates the complete new note using the frozen planner frontmatter and all body sections; it refuses concurrent creation.':'The bridge merges only the schedule and empty priority slots, retaining existing user content.'} ${skill==='plan-tomorrow'?'STOP if tomorrow\'s note exists; do not merge, overwrite or delete it.':''} Current daily note (data):\n${before||'(not created yet)'}`;
 if(execution!=='headless')instructions+=`\n\n${WORKER_SPOKEN_STYLE}\nThe complete deliverable and its exact required format take priority. Do not add a spoken preamble, extra section, metadata or footer to a strict daily note, JSON answer or other exact-format output.`;
 const reference=`${ROOT}/task-instructions/${id}.md`,full=vaultPath(root,reference);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,instructions,{flag:'wx'});
 return {job,destination,before,prompt:`Run the ${SKILLS[skill].label} workflow. Read ${reference} in this vault for the exact requirements and output contract. Use the connectors already authenticated in this CLI, never GWS. ${execution==='headless'?'Return JSON with status (ok or blocked), summary, and markdown containing the complete deliverable. The bridge saves markdown after checking for conflicting edits.':'Return the complete result in your final answer; the bridge saves it. Keep this conversation available for follow-up.'}`};
}
export function saveWorkflowResult(root,record,text,{ownsDestination=false,summary}={}){
 const {job,destination,before}=record.workflow;
 const runId=job.id,artifact=`${ROOT}/artifacts/${runId}.md`,audit=vaultPath(root,artifact);fs.mkdirSync(path.dirname(audit),{recursive:true});
 if(!fs.existsSync(audit))fs.writeFileSync(audit,text,{flag:'wx'});
 const run={...job,model:record.execution==='script'?'none':job.model,ts_queued:job.ts,ts_started:new Date(record.workflow.startedAt??record.created).toISOString(),ts_completed:new Date().toISOString(),status:'ok',summary:String(summary||'').trim().slice(0,1000)||`${SKILLS[job.skill].label} completed`,execution:record.execution||'terminal',...(record.appScope?{appScope:record.appScope}:{}),task_id:record.id,artifact_path:artifact,deliverable_path:null};
 try{
  if(/^BLOCKED:/i.test(text.trim()))throw new Error(text.trim().slice(0,400));
  // Models sometimes wrap the note in a code fence or leave a <markdown> / </markdown> tag line
  // at the very start or end; those wrappers are not part of the deliverable.
  const content=text.trim().replace(/^```(?:text|markdown)?\s*\r?\n([\s\S]*?)\r?\n```$/i,'$1').trim()
   .replace(/^<markdown>[^\S\r\n]*(?:\r?\n|$)/i,'').replace(/(?:^|\r?\n)[^\S\r\n]*<\/markdown>$/i,'').trim();
  const lines=content.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(!lines.length||lines.every(line=>/^(?:(?:SAVED|PLANNED)\b[^\r\n]*|(?:done|complete|completed)[.!]?)$/i.test(line)))throw new Error('Worker returned a completion receipt instead of the deliverable. Original destination preserved; response saved for review.');
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
   if(record.execution!=='script'||job.skill!=='github-trending'||current!==text)throw new Error('Script output changed before completion; proposed output saved separately.');
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
