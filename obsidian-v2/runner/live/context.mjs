// What a Live call reads at its start, as the member chose it (Chase, 2026-11-24: "members should be able to add a
// report to it… it should be completely editable"). Two parts, saved in the vault at system/v2/live-context.json:
//
//   sections  the built-in parts of the snapshot, each on or off. All on by default, as before.
//   notes     up to six of the member's own notes or report folders. A note is read as it is; a folder gives its
//             newest note, so a report a skill writes each day stays current without editing this file.
//
// About me is not here: it has its own place in AGENTS.md. Everything chosen here goes to OpenAI at the start of every
// call, so only the member adds to it (`node aos.mjs live-context`, or their coding agent running that command).
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicRename,vaultPath} from '../core.mjs';
import {localDate} from '../brief-voice.mjs';
import {clip} from './clip.mjs';

export const LIVE_CONTEXT_FILE='system/v2/live-context.json';
export const LIVE_SECTIONS=Object.freeze({
 today:'Hoje: três prioridades, agenda e rotinas diárias da nota de hoje (Planejar hoje)',
 inbox:'Notas novas no cofre: quantas notas chegaram a cada pasta em inbox/ nas últimas 24 horas',
 numbers:'Números: métricas e seu vídeo mais recente (Atualizar métricas)',
 news:'Notícias: principais manchetes do boletim da manhã (Boletim de IA)',
 radar:'Radar: vídeos em destaque e repositórios em alta no GitHub (Radar de vídeos em destaque, Em alta no GitHub)',
});
export const MAX_NOTES=6,NOTE_MAX_BYTES=6000,NOTES_MAX_BYTES=20000;
const FILE_MAX_BYTES=512000,TEXT=/\.(?:md|txt|csv)$/i;
// The machinery and private stores of the vault, never sent as a note.
const PRIVATE=[/^\./,/^system\/v2(?:\/|$)/i,/^\.obsidian(?:\/|$)/i,/(?:^|\/)\.trash(?:\/|$)/i,/(?:^|\/)node_modules(?:\/|$)/i];
const defaults=()=>({version:1,sections:Object.fromEntries(Object.keys(LIVE_SECTIONS).map(name=>[name,true])),notes:[]});

const slash=value=>String(value||'').replace(/\\/g,'/').replace(/^\.\/+/,'').replace(/\/+$/,'').trim();
export function cleanLabel(value,fallback){
 const label=String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim();
 return label?clip(label,60):fallback;
}
// A vault-relative path the member may add: inside the vault, not a link, not machinery, a text note or a folder.
export function checkNotePath(root,relative){
 const rel=slash(relative);
 if(!rel||path.isAbsolute(rel)||/^[a-z]:/i.test(rel)||rel.split('/').some(part=>part==='..'))throw new Error(`O caminho "${relative}" é inválido. Informe um caminho dentro do cofre, como projects/goals.md ou inbox/research/my-report.`);
 if(PRIVATE.some(pattern=>pattern.test(rel)))throw new Error(`${rel} é um caminho interno do sistema. Escolha uma nota ou pasta de relatórios.`);
 const file=vaultPath(root,rel);
 const info=fs.lstatSync(file,{throwIfNoEntry:false});
 if(!info)throw new Error(`O caminho ${rel} não foi encontrado no seu cofre. Confira o nome ou peça ao seu agente para localizar a nota.`);
 if(info.isDirectory())return {path:rel,folder:true};
 if(!info.isFile()||!TEXT.test(rel))throw new Error(`Não foi possível incluir ${rel}. A voz ao vivo lê notas nos formatos .md, .txt e .csv, ou pastas com essas notas.`);
 return {path:rel,folder:false};
}

export function readLiveContext(root){
 const config=defaults();let file;
 try{file=vaultPath(root,LIVE_CONTEXT_FILE)}catch{return config}
 let saved;
 try{const info=fs.lstatSync(file,{throwIfNoEntry:false});if(!info)return config;if(!info.isFile()||info.size>64000)throw new Error('not a settings file');saved=JSON.parse(fs.readFileSync(file,'utf8'))}
 catch{return {...config,unreadable:true}}
 if(saved&&typeof saved.sections==='object')for(const name of Object.keys(LIVE_SECTIONS))if(typeof saved.sections[name]==='boolean')config.sections[name]=saved.sections[name];
 const seen=new Set();
 for(const item of Array.isArray(saved?.notes)?saved.notes:[]){
  const rel=typeof item?.path==='string'?slash(item.path):'';
  if(!rel||seen.has(rel.toLowerCase())||config.notes.length>=MAX_NOTES)continue;
  seen.add(rel.toLowerCase());
  config.notes.push({path:rel,label:cleanLabel(item.label,path.posix.basename(rel).replace(TEXT,''))});
 }
 return config;
}
export function writeLiveContext(root,config){
 const file=vaultPath(root,LIVE_CONTEXT_FILE),body={version:1,sections:{...config.sections},notes:config.notes.map(({path,label})=>({path,label}))};
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temp=`${file}.${randomUUID()}.tmp`;
 try{fs.writeFileSync(temp,JSON.stringify(body,null,1)+'\n',{flag:'wx'});atomicRename(temp,file)}
 finally{try{fs.unlinkSync(temp)}catch(error){if(error.code!=='ENOENT')throw error}}
 return body;
}

// The newest note directly in a folder: a report a skill saves each day, named by date or not.
function newestNote(root,rel){
 let dir,best=null;
 try{dir=vaultPath(root,rel)}catch{return null}
 let entries=[];try{entries=fs.readdirSync(dir,{withFileTypes:true})}catch{return null}
 for(const entry of entries){
  if(!entry.isFile()||!TEXT.test(entry.name)||/^[._]/.test(entry.name))continue;
  try{const info=fs.lstatSync(path.join(dir,entry.name));if(info.isFile()&&(!best||info.mtimeMs>best.at))best={rel:rel+'/'+entry.name,at:info.mtimeMs}}catch{}
 }
 return best?.rel??null;
}
// Links, comments and front matter cost tokens and mean nothing spoken. No blank lines: a snapshot section is one block.
export function noteForCall(raw){
 return String(raw).replace(/\r\n/g,'\n').replace(/^﻿?---\n[\s\S]*?\n---\n/,'').replace(/<!--[\s\S]*?-->/g,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'')
  .replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g,(_match,target,label)=>label??target)
  .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/\*\*/g,'')
  .split('\n').map(line=>line.trimEnd()).filter(line=>line.trim()&&!/^\s{0,3}(?:-\s*){3,}$/.test(line)).join('\n');
}
export function cutToBytes(text,limit,note='(Trecho reduzido. O restante está na nota.)'){
 if(Buffer.byteLength(text)<=limit)return {text,cut:false};
 const room=Math.max(0,limit-Buffer.byteLength(note)-1);
 const cut=Buffer.from(text).subarray(0,room).toString('utf8').replace(/�$/,'');
 const line=cut.lastIndexOf('\n');
 return {text:(line>room/2?cut.slice(0,line):cut)+'\n'+note,cut:true};
}

// Each chosen note as it will be read now: where it came from, how old it is, how much of it fits.
export function resolveNotes(root,config){
 let total=0;
 return config.notes.map(item=>{
  let source=item.path,folder=false;
  try{
   const checked=checkNotePath(root,item.path);folder=checked.folder;
   if(folder){source=newestNote(root,checked.path);if(!source)return {...item,folder,problem:'a pasta ainda está sem notas'}}
   const file=vaultPath(root,source),info=fs.lstatSync(file);
   if(!info.isFile()||info.size>FILE_MAX_BYTES)return {...item,folder,source,problem:'a nota é grande demais para ser enviada'};
   const text=noteForCall(fs.readFileSync(file,'utf8'));
   if(!text)return {...item,folder,source,problem:'a nota está vazia'};
   const room=Math.min(NOTE_MAX_BYTES,NOTES_MAX_BYTES-total);
   if(room<200)return {...item,folder,source,problem:'as notas anteriores já ocupam o espaço disponível'};
   const fitted=cutToBytes(text,room);total+=Buffer.byteLength(fitted.text);
   return {...item,folder,source,saved:localDate(new Date(info.mtimeMs)),bytes:Buffer.byteLength(text),text:fitted.text,cut:fitted.cut};
  }catch(error){return {...item,folder,problem:error.message}}
 });
}
// The snapshot blocks for the member's own notes. A note that cannot be read is left out, never guessed at.
export function noteSections(notes){
 return notes.filter(note=>note.text).map(note=>`${note.label} (${note.source}, salva em ${note.saved}. Nota incluída pela pessoa em todas as chamadas${note.folder?'. Nota mais recente em '+note.path:''}. Dados para consulta)\n${note.text}`);
}
