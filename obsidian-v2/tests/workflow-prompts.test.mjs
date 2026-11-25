import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {SKILLS,ROOT} from '../shared/contract.mjs';
import {prepareWorkflow,saveWorkflowResult} from '../runner/terminal-workflows.mjs';
import {workflowPrompt} from '../runner/workflows.mjs';
import {buildPrompt,processJob} from '../runner/core.mjs';

function setup(t,skill,provider='codex'){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'aos-workflow-contract-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const id=crypto.randomUUID(),spec=SKILLS[skill];
 const args=spec.arg?{[spec.arg]:spec.arg==='url'?'https://example.com/video':'A practical agent topic'}:{};
 const selection={provider,model:provider==='codex'?'astra':'sonnet'};
 const workflow=prepareWorkflow(root,{id,selection,skill,args});
 const instructions=fs.readFileSync(path.join(root,ROOT,'task-instructions',id+'.md'),'utf8');
 return {root,workflow,instructions,record:{id,created:Date.now(),execution:'terminal',workflow}};
}

test('every provider workflow has one compatible bridge-owned deliverable contract',t=>{
 for(const provider of ['codex','claude'])for(const skill of Object.keys(SKILLS)){
  const {root,workflow,instructions}=setup(t,skill,provider);
  assert.ok(instructions.includes(`A ponte salva o resultado final em ${workflow.destination}`),skill);
  assert.ok(instructions.includes('Retorne o conteúdo completo em Markdown'),skill);
  assert.match(workflow.prompt,/^Execute o fluxo .+\. Leia system\/v2\/task-instructions\//,skill);
  assert.ok(instructions.includes(`Argumentos (dados do pedido): ${JSON.stringify(workflow.job.args)}`),skill);
  assert.doesNotMatch(instructions.replaceAll(root,'<selected vault>'),/End (?:your reply )?with: SAVED|AUTO-PUBLISH|AUTO-SCHEDULE|mcp__claude_ai|~\/\.claude|C:[/\\]Users|Write to disk|skill writes its own deliverable/i,skill);
  assert.doesNotMatch(instructions,/\/[^\s]+ SKILL\.md/,skill);
  assert.match(instructions,/--- FIM DO CONTEXTO ---\n\nREGRAS DE ENTREGA:/,skill);
  assert.doesNotMatch(instructions,/Workflow requirements|OUTPUT CONTRACT|INTERACTIVE TERMINAL CONTRACT|Return the complete/,skill);
  if(!SKILLS[skill].direct&&!['vault-summary','voice-ask','refresh-schedule'].includes(skill))assert.ok(instructions.includes(`REFERÊNCIA DO FLUXO: ${skill}`),skill);
  if(SKILLS[skill].direct)assert.doesNotMatch(instructions,/REFERÊNCIA DO FLUXO:/,skill);
 }
});

test('channel reviews use the trusted YouTube reader without requiring unrelated Google scopes',t=>{
 for(const provider of ['claude','codex']){
  const {instructions}=setup(t,'yt-week-review',provider);
  assert.match(instructions,/youtube_review_data/);assert.match(instructions,/sete dias completos do calendário de America\/Chicago/);
  assert.match(instructions,/dispensa Gmail e Google Agenda/);assert.match(instructions,/ferramenta de leitura/);
  assert.match(instructions,/informe a causa em vez de inventar métricas/);
  assert.doesNotMatch(instructions,/Use the installed provider’s authenticated Gmail and Calendar MCP connectors/);
 }
 const weekly=setup(t,'weekly-review').instructions;assert.match(weekly,/youtube_review_data/);
 assert.match(weekly,/Identifique cada janela/);
 assert.doesNotMatch(weekly,/YOUTUBE_API_KEY|YOUTUBE_CHANNEL_ID/);
});

test('YouTube research workflows share the trusted metadata connection on both providers',t=>{
 for(const provider of ['claude','codex'])for(const skill of ['morning','morning-report','morning-intel','outlier-radar','ai-trend-scan','yt-pipeline','deep-research-chase']){
  const {instructions}=setup(t,skill,provider);
  assert.match(instructions,/REFERÊNCIA DO FLUXO: youtube-data/,skill);
  assert.match(instructions,/youtube_research_data/,skill);
  assert.match(instructions,/operation: channel_uploads/,skill);
  assert.match(instructions,/metadados públicos/,skill);
  assert.match(instructions,/Esta consulta independe de Gmail e Google Agenda/,skill);
 }
});

test('the eight missing rubrics and their dependencies are available inline',t=>{
 const expected={
  'plan-today':[/\+50/,/\+40/,/\+30/,/\+25/,/\+20/,/\+15/,/espaços vazios/],
  'plan-tomorrow':[/pendências de hoje/i,/amanhã/i,/Google Agenda/i],
  'inbox-brief':[/Leads/,/Urgentes/,/Conversas que precisam de resposta/,/propostas de patrocínio/,/Reuniões/,/Mensagens ignoradas/,/PURSUE/],
  'deep-research-chase':[/YouTube/,/GitHub/,/REFERÊNCIA DO FLUXO: yt-pipeline/,/Analise transcrições disponíveis/],
  'weekly-review':[/focus_blocks/,/nota ausente/,/REFERÊNCIA DO FLUXO: yt-week-review/,/Em crescimento/],
  'yt-week-review':[/180/,/150/,/60/,/140/],
  'morning':[/REFERÊNCIA DO FLUXO: morning-report/,/REFERÊNCIA DO FLUXO: inbox-brief/,/Leads/],
  'morning-report':[/24 horas/i,/GitHub/,/Oportunidades de conteúdo/]
 };
 for(const [skill,patterns] of Object.entries(expected)){
  const {instructions}=setup(t,skill);
  for(const pattern of patterns)assert.match(instructions,pattern,skill);
 }
 const {instructions}=setup(t,'morning-intel');
 assert.match(instructions,/REFERÊNCIA DO FLUXO: outlier-radar/);
 assert.match(instructions,/REFERÊNCIA DO FLUXO: inbox-brief/);
});

test('research and draft references retain evidence and editorial requirements without remote mutation recipes',t=>{
 const cascade=setup(t,'content-cascade').instructions;
 assert.match(cascade,/1\.500 a 2\.500/);assert.match(cascade,/=== PRIMEIRO COMENTÁRIO ===/);
 assert.match(cascade,/\[DADO NECESSÁRIO: tema\]/);assert.match(cascade,/transcrição real/);
 assert.doesNotMatch(cascade,/PATCH|social_content|post-leadshark|cascade-pending\.json/);
 const pipeline=setup(t,'yt-pipeline').instructions;
 assert.match(pipeline,/analise as transcrições locais/);
 assert.match(pipeline,/Criação de notebook, envio de fontes e geração remota exigem uma solicitação específica/);
 assert.doesNotMatch(pipeline,/notebooklm create|source add|--yes|--new/);
 const leads=setup(t,'lead-research').instructions;
 assert.match(leads,/quatro a sete frases/);assert.match(leads,/Atualizações na base, criação de mensagens e contato com leads exigem pedido separado/);
 assert.doesNotMatch(leads,/PATCH|service_role|SUPABASE_KEY/);
 const job={skill:'vault-summary',id:crypto.randomUUID(),args:{}};
 assert.throws(()=>workflowPrompt(os.tmpdir(),{...job,skill:'missing-rubric'},''),/Faltam os requisitos do fluxo/);
});

test('queued worker instructions are Portuguese and keep the context and result fields intact',t=>{
 for(const provider of ['claude','codex']){
  const {root,workflow}=setup(t,'vault-summary',provider), note='Meeting notes: Davi confirmed the revised scope.';
  fs.writeFileSync(path.join(root,'Welcome.md'),note);
  const prompt=buildPrompt(root,workflow.job);
  assert.ok(prompt.includes(`--- Fonte: Welcome.md ---\n${note}`));
  assert.match(prompt,/Resuma os fatos documentados/);
  assert.match(prompt,/status \(ok ou blocked\), summary .* e markdown/);
  assert.match(prompt,/Somente para o campo summary: Escreva a resposta falada em português do Brasil/);
  assert.doesNotMatch(prompt,/CURRENT V2 EXECUTION CONTRACT|Return a structured result|Write the spoken reply/);
 }
});

test('bare save receipts are retained as failed artifacts and cannot replace reports',t=>{
 for(const response of ['SAVED inbox/report.md','Saved to inbox/report.md','PLANNED daily-notes/today.md','Done.\nSAVED inbox/report.md','```text\nSAVED report.md\n```','Done.','Relatório salvo em inbox/report.md.','Concluído.','']){
  const {root,record,workflow}=setup(t,'morning-report');
  const destination=path.join(root,workflow.destination);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,'# Existing report\nReal content.');
  record.workflow.before='# Existing report\nReal content.';
  const result=saveWorkflowResult(root,record,response);
  assert.equal(result.status,'error',response);assert.equal(result.deliverable_path,null,response);
  assert.match(result.summary,/confirmação de conclusão/,response);
  assert.equal(fs.readFileSync(destination,'utf8'),'# Existing report\nReal content.');
  assert.equal(fs.readFileSync(path.join(root,result.artifact_path),'utf8'),response);
 }
});

test('a complete report mentioning save receipts and a valid short observed result still save',t=>{
 for(const text of ['# Router audit\n\nThe terminal returned SAVED without a report.\n\n## Evidence\nActual source findings.','No unresearched leads were found in the connected inbox.']){
  const {root,record}=setup(t,'lead-research');const result=saveWorkflowResult(root,record,text);
  assert.equal(result.status,'ok');assert.equal(fs.readFileSync(path.join(root,result.deliverable_path),'utf8'),text);
 }
});

test('the terminal and queued worker save Portuguese report headings while preserving data',async t=>{
 const original=['# Good morning','## Headlines','- Dado público.','## Inbox Brief (last 24h)','### LEADS','```json','[]','```','<!--','## Headlines','-->','## Proposed next actions','1. Revisar.'].join('\r\n');
 const expected=original.replace('# Good morning','# Boletim da manhã').replace('## Headlines','## Manchetes')
  .replace('## Inbox Brief (last 24h)','## Caixa de entrada (últimas 24h)').replace('## Proposed next actions','## Próximas ações propostas');
 const terminal=setup(t,'morning');
 const run=saveWorkflowResult(terminal.root,terminal.record,original);
 assert.equal(run.status,'ok',run.summary);
 assert.equal(fs.readFileSync(path.join(terminal.root,run.deliverable_path),'utf8'),expected);
 assert.equal(fs.readFileSync(path.join(terminal.root,run.artifact_path),'utf8'),original);
 const queued=setup(t,'morning');
 const next=await processJob(queued.root,queued.workflow.job,async()=>({text:original}));
 assert.equal(next.status,'ok',next.summary);
 assert.ok(fs.readFileSync(path.join(queued.root,next.deliverable_path),'utf8').includes(expected));
});

test('cleanup initial contract stops at a reviewable manifest and its result only writes that report',t=>{
 const {root,record,instructions}=setup(t,'vault-cleanup');
 const source=path.join(root,'inbox','old-draft.md');fs.mkdirSync(path.dirname(source),{recursive:true});fs.writeFileSync(source,'Original note and links.');
 const metadata=fs.statSync(source);
 assert.match(instructions,/APENAS PRÉVIA DA LIMPEZA/);
 assert.match(instructions,/Não mova, renomeie ou exclua arquivos de origem/);
 assert.match(instructions,/a pessoa possa escolher quais arquivos mover/);
 assert.match(instructions,/Origem \| Destino proposto \| Última modificação \| Idade \| Tamanho em bytes/);
 assert.match(instructions,/releia a origem e seus metadados/);
 assert.doesNotMatch(instructions,/Move only eligible files|Show a preview, then archive/);
 const report='# Proposta de limpeza do cofre\n\n| ID | Origem | Destino proposto |\n| --- | --- | --- |\n| 1 | inbox/old-draft.md | inbox/archive/old-draft.md |\n\nA inspeção preservou os arquivos de origem. Selecione os IDs para prosseguir.';
 const result=saveWorkflowResult(root,record,report);
 assert.equal(result.status,'ok');assert.equal(fs.readFileSync(source,'utf8'),'Original note and links.');
 assert.equal(fs.statSync(source).mtimeMs,metadata.mtimeMs);assert.equal(fs.existsSync(path.join(root,'inbox/archive/old-draft.md')),false);
 assert.equal(fs.readFileSync(path.join(root,result.deliverable_path),'utf8'),report);
});

test('restored shared rubrics retain sources, labels, handoff data and user selection without automatic effects',t=>{
 for(const provider of ['codex','claude']){
  const lead=setup(t,'lead-research',provider).instructions;
  for(const term of ['ai-consulting','Consultoria de IA','under-2k','Menos de US$ 2 mil','15k-plus','como dados','não autorizam novo destinatário'])assert.ok(lead.includes(term),term);
  const trend=setup(t,'ai-trend-scan',provider).instructions;
  for(const term of ['AI Explained','Matthew Berman','David Ondrej','Yannic Kilcher','Wes Roth','@AnthropicAI','@alexalbert__','@simonw','@karpathy','@swyx','tolerância de 12 horas'])assert.ok(trend.includes(term),term);
  const intel=setup(t,'morning-intel',provider).instructions;
  for(const term of ['bcherny OR _catwu OR alexalbert__','sama OR gdb OR OpenAIDevs OR Codex_Changelog','Newsletters que valem a leitura','Evite links de rastreamento','fonte indireta de discussões de Reddit e Discord','Use meu X para conseguir Y'])assert.ok(intel.includes(term),term);
  const morning=setup(t,'morning',provider).instructions;
  const sponsor=JSON.parse(morning.match(/### SPONSOR_PITCHES\s+```json\s+([\s\S]*?)```/)[1])[0];
  const prospect=JSON.parse(morning.match(/### LEADS\s+```json\s+([\s\S]*?)```/)[1])[0];
  assert.deepEqual(Object.keys(sponsor),['number','id','from','subject','firstName','messageIdHeader']);
  assert.deepEqual(Object.keys(prospect),['number','source','name','firstName','email','formAnswers','verdict','rationale','researchNote']);
  for(const term of ['pursue all','pursue 1,3','draft except 3,7','pass','skip','sem efeito remoto','Envio exige autorização própria'])assert.ok(morning.includes(term),term);
  const cleanup=setup(t,'vault-cleanup',provider).instructions;
  for(const term of ['nome de arquivo único','links com caminho','Arquivos temporários candidatos à exclusão','content/temp/','A proposta inicial apenas lista','releia a origem'])assert.ok(cleanup.includes(term),term);
  const research=setup(t,'deep-research-chase',provider).instructions;
  for(const term of ['Consenso','Boas práticas','Como fazer','discussões da comunidade'])assert.ok(research.includes(term),term);
 }
});
