import fs from 'node:fs';
import path from 'node:path';
import {vaultPath} from './core.mjs';
import {WISPR_FOLDER} from './wispr-sync.mjs';

const normalize=text=>String(text).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const inquiry=/^(?:o que|qual|quais|quem|quando|onde|por que|como|quanto|quantos|me (?:diga|conte)|(?:leia|resuma|consulte) a transcricao)\b/;
const source=/\b(?:call|reuniao|transcricao|wispr)\b/;
const joinedAction=/\b(?:e|depois|tambem|entao) (?:envie|mande|salve|grave|crie|edite|escreva|pesquise|agende|execute)\b/;

function passage(text,query){
 const max=6200;
 if(text.length<=max)return {text,truncated:false};
 const keywords=new Set(query.split(' ').filter(word=>word.length>=4));
 const chunks=text.match(/[\s\S]{1,1800}/g)||[];
 const scored=chunks.map((chunk,index)=>({index,score:normalize(chunk).split(' ').reduce((count,word)=>count+Number(keywords.has(word)),0)}));
 const selected=scored.sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,3).sort((a,b)=>a.index-b.index);
 return {text:selected.map(({index})=>chunks[index]).join('\n[…]\n'),truncated:true};
}

export function findWisprNote(root,question){
 const query=normalize(question);
 if(!inquiry.test(query)||!source.test(query)||joinedAction.test(query))return null;
 let files;
 try{files=fs.readdirSync(vaultPath(root,WISPR_FOLDER),{withFileTypes:true})}catch{return null}
 const matches=[];
 for(const entry of files){
  if(!entry.isFile()||!/^wispr-[a-f0-9]{24}\.md$/.test(entry.name))continue;
  const rel=path.posix.join(WISPR_FOLDER,entry.name);
  try{
   const file=vaultPath(root,rel),fd=fs.openSync(file,'r');
   let header;
   try{const buffer=Buffer.alloc(1536);header=buffer.subarray(0,fs.readSync(fd,buffer)).toString('utf8')}
   finally{fs.closeSync(fd)}
   const title=/^# ([^\n]+)/.exec(header)?.[1],key=normalize(title||'');
   if(key.length>=4&&` ${query} `.includes(` ${key} `)&&header.includes('\n- Origem: Wispr Flow\n'))matches.push({rel,file,title,key});
  }catch{/* A removed or inaccessible note is not a source. */}
 }
 matches.sort((a,b)=>b.key.length-a.key.length);
 if(!matches.length)return null;
 const chosen=matches[0];
 if(matches[1]?.key===chosen.key)return {ambiguous:true,title:chosen.title};
 try{
  if(fs.statSync(chosen.file).size>5*1024*1024)return null;
  const raw=fs.readFileSync(chosen.file,'utf8');
  const content=/\n## Transcrição\n\n(`{3,})text\n([\s\S]*)\n\1\n?$/.exec(raw)?.[2];
  if(!content)return null;
  return {title:chosen.title,path:chosen.rel,...passage(content,query)};
 }catch{return null}
}
