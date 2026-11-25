// node aos.mjs live-context: see and change what a Live call reads when it starts (runner/live/context.mjs).
// The member's coding agent runs these on their behalf during setup and later ("add my goals note to Live").
import fs from 'node:fs';
import {vaultPath} from '../../runner/core.mjs';
import {withFileLock} from '../../runner/file-lock.mjs';
import {readVoicePrefs} from '../../runner/voice-prefs.mjs';
import {ABOUT_MAX_BYTES,readAboutMe} from '../../runner/live/about.mjs';
import {LIVE_CONTEXT_FILE,LIVE_SECTIONS,MAX_NOTES,checkNotePath,cleanLabel,readLiveContext,resolveNotes,writeLiveContext} from '../../runner/live/context.mjs';
import {configuredVaultPath,layout} from './services.mjs';

const TITLE='O que a voz ao vivo lê no início da chamada';
const HELP=`${TITLE}

  live-context show [--full]                 mostrar o que a chamada lê. Com --full, mostrar o conteúdo como é enviado
  live-context add <caminho> [--label "…"]   incluir uma nota ou a nota mais recente de uma pasta de relatórios
  live-context remove <caminho ou número>    retirar uma nota da lista
  live-context section <nome> on|off         ativar ou desativar uma seção padrão (${Object.keys(LIVE_SECTIONS).join(', ')})
  live-context reset                         restaurar a configuração inicial, com todas as seções padrão ativas e sem notas extras

As informações lidas são enviadas à OpenAI no início da chamada. Para alterar a seção Sobre mim,
peça ao seu agente. Para consultar a seção, rode \`node aos.mjs about show\`.
`;
const kb=bytes=>bytes<1000?`${bytes} ${bytes===1?'byte':'bytes'}`:`${(bytes/1000).toFixed(1).replace('.',',')} KB`;
const status=enabled=>enabled?'ativado   ':'desativado';

function describe(root,log){
 const config=readLiveContext(root),about=readAboutMe(root),prefs=readVoicePrefs(root);
 log(`${TITLE}\n`);
 log(about?.text?`Sobre mim (${about.source}): ${about.bytes} de ${ABOUT_MAX_BYTES} bytes${about.dropped?`, ${about.dropped} ${about.dropped===1?'byte omitido':'bytes omitidos'}`:''}. Para alterar a seção, peça ao seu agente.`
  :'A seção Sobre mim ainda está em branco. Peça ao seu agente para preenchê-la.');
 log('\nSeções padrão');
 for(const [name,text] of Object.entries(LIVE_SECTIONS))log(`  ${status(config.sections[name])}  ${name.padEnd(8)} ${text}`);
 log(`  ${status(prefs.liveShareWork)}  tasks    Títulos e estados de até cinco tarefas recentes (opção "Compartilhar títulos de tarefas" no menu de voz)`);
 log(`  ${status(prefs.liveShareBrief)}  brief    Boletim da manhã completo, incluindo a seção de e-mails (opção "Compartilhar boletim da manhã" no menu de voz)`);
 const notes=resolveNotes(root,config);
 log(`\nSuas notas (${notes.length} de ${MAX_NOTES})${notes.length?'':'. Para incluir uma nota, rode node aos.mjs live-context add <caminho>'}`);
 notes.forEach((note,index)=>{
  const where=note.folder?`nota mais recente em ${note.path}${note.source?' ('+note.source.slice(note.path.length+1)+')':''}`:note.path;
  log(`  ${index+1}. ${note.label}: ${where}`+(note.problem?` (item não enviado: ${note.problem})`:`, salva em ${note.saved}, ${kb(Buffer.byteLength(note.text))}${note.cut?` de ${kb(note.bytes)}, reduzida para caber`:''}`));
 });
 if(config.unreadable)log(`\nFalha ao ler ${LIVE_CONTEXT_FILE}. A chamada usa a configuração inicial. Rode \`node aos.mjs live-context reset\` para regravar o arquivo.`);
 log('\nEssas informações são enviadas à OpenAI no início de cada chamada. Use --full para ver o conteúdo como é enviado.');
}

export async function liveContextCommand({words=[],flags={},log=console.log,at=layout(),vault,snapshot}={}){
 const [action='show',...rest]=words;
 if(action==='help'){log(HELP);return 0}
 const allowed={show:['full'],add:['label'],remove:[],section:[],reset:[]}[action];
 if(!allowed||Object.keys(flags).some(name=>!allowed.includes(name)))throw new Error(HELP);
 vault??=configuredVaultPath(at);
 if(!vault)throw new Error('Ainda não há uma instalação aqui. Primeiro, rode `node aos.mjs setup --vault "<caminho>"`.');
 const root=fs.realpathSync(vault);
 if(action==='show'){
  if(rest.length)throw new Error(HELP);
  if(!flags.full){describe(root,log);return 0}
  const build=snapshot||(await import('../../runner/live/snapshot.mjs')).liveSnapshot;
  log(await build(root,{tasks:()=>[]}));
  log('\n(As tarefas em andamento são incluídas no início da chamada.)');
  return 0;
 }
 const file=vaultPath(root,LIVE_CONTEXT_FILE);
 const change=work=>withFileLock(file,()=>{const config=readLiveContext(root);const message=work(config);writeLiveContext(root,config);return message});
 if(action==='reset'){
  if(rest.length)throw new Error(HELP);
  log(change(config=>{for(const name of Object.keys(config.sections))config.sections[name]=true;config.notes=[];return 'Configuração inicial restaurada. Todas as seções padrão estão ativas e a lista de notas está vazia.'}));
  return 0;
 }
 if(action==='section'){
  const [name,state]=rest;
  if(rest.length!==2||!Object.hasOwn(LIVE_SECTIONS,name)||!['on','off'].includes(state))throw new Error(`Use o comando live-context section <${Object.keys(LIVE_SECTIONS).join('|')}> on|off.`);
  log(change(config=>{config.sections[name]=state==='on';return `A seção "${LIVE_SECTIONS[name].split(':')[0]}" foi ${state==='on'?'ativada':'desativada'} para a próxima chamada.`}));
  return 0;
 }
 if(action==='add'){
  if(rest.length!==1)throw new Error('Use o comando live-context add <caminho no cofre> [--label "nome"].');
  const checked=checkNotePath(root,rest[0]);
  if(flags.label===true)throw new Error('Informe um nome com --label, como --label "Objetivos".');
  log(change(config=>{
   const existing=config.notes.find(note=>note.path.toLowerCase()===checked.path.toLowerCase());
   const label=cleanLabel(flags.label,existing?.label||checked.path.split('/').pop().replace(/\.(?:md|txt|csv)$/i,''));
   if(existing){existing.label=label;return `${checked.path} já estava na lista. Agora aparece como "${label}".`}
   if(config.notes.length>=MAX_NOTES)throw new Error(`Cada chamada lê até ${MAX_NOTES} das suas notas. Rode \`node aos.mjs live-context show\` para ver a lista e remova uma nota antes de incluir outra.`);
   config.notes.push({path:checked.path,label});
   return `Nota "${label}" adicionada (${checked.folder?'a nota mais recente em '+checked.path:checked.path}). Ela será lida na próxima chamada.`;
  }));
  const added=resolveNotes(root,readLiveContext(root)).find(note=>note.path.toLowerCase()===checked.path.toLowerCase());
  if(added?.problem)log(`Por enquanto, a chamada vai ignorar esse item: ${added.problem}.`);
  else if(added?.cut)log(`A nota tem ${kb(added.bytes)}. A chamada vai ler apenas os primeiros ${kb(Buffer.byteLength(added.text))}. Uma nota mais curta ou um resumo cabe por inteiro.`);
  return 0;
 }
 // remove
 if(rest.length!==1)throw new Error('Use o comando live-context remove <caminho ou número mostrado por live-context show>.');
 const target=rest[0].replace(/\\/g,'/').replace(/\/+$/,'');
 log(change(config=>{
  const index=/^\d+$/.test(target)?Number(target)-1:config.notes.findIndex(note=>note.path.toLowerCase()===target.toLowerCase()||note.label.toLowerCase()===target.toLowerCase());
  if(index<0||index>=config.notes.length)throw new Error(`"${rest[0]}" não está na lista. Rode \`node aos.mjs live-context show\` para ver as notas incluídas.`);
  const [removed]=config.notes.splice(index,1);return `Nota "${removed.label}" removida. Ela ficará fora da próxima chamada.`;
 }));
 return 0;
}
