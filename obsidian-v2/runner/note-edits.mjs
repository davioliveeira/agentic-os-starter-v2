import fs from 'node:fs';import crypto from 'node:crypto';
import {vaultPath,atomicRename} from './core.mjs';
import {localDate} from './brief-voice.mjs';
import {appendDailyDriver,dailyCheckboxes} from '../shared/daily-note.mjs';
export function replaceDaily(root,{path,before,after},beforeWrite){
 if(typeof path!=='string'||!/^daily-notes\/\d{4}-\d{2}-\d{2}\.md$/.test(path)||typeof before!=='string'||typeof after!=='string'||after.length>500000)throw new Error('Edição da nota diária inválida.');
 const file=vaultPath(root,path);
 if(fs.readFileSync(file,'utf8')!==before)throw new Error('A nota mudou desde que foi carregada. Atualize e tente novamente. As edições recentes foram preservadas.');
 beforeWrite?.();
 const temporary=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temporary,after);atomicRename(temporary,file);return {ok:true};
}

export function dailyCheckboxEdit({section,text,line,position},replacement){
 return {kind:'checkbox',item:{section,text,line,position},replacement};
}
export function resolveDailyEdit(root,{path,edit}){
 const changed=()=>new Error('O item planejado ou a posição dele na nota diária mudou. Repita o pedido.');
 if(path!==`daily-notes/${localDate()}.md`)throw changed();
 let before;try{before=fs.readFileSync(vaultPath(root,path),'utf8')}catch{throw changed()}
 if(edit.kind==='add'){
  const after=appendDailyDriver(before,edit.text);
  if(after===null)throw changed();
  return {path,before,after};
 }
 const matches=dailyCheckboxes(before).filter(item=>item.section===edit.item.section&&item.line===edit.item.line&&item.text===edit.item.text);
 // Daily notes have no item IDs. The exact checkbox identifies the item, and
 // its section order detects a move. Identical checkboxes are ambiguous.
 if(matches.length!==1||matches[0].position!==edit.item.position)throw changed();
 const {start,end}=matches[0];
 return {path,before,after:before.slice(0,start)+edit.replacement+before.slice(end)};
}
