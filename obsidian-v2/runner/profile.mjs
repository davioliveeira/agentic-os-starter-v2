import fs from 'node:fs';
import path from 'node:path';
// Optional per-vault preferences in system/v2/profile.json. A missing or
// malformed file means the built-in defaults, so nothing changes without one.
export const DEFAULT_DRIVERS=Object.freeze(['Publicar no Skool','Gravar para o YouTube','Triar a caixa de entrada','Revisar o dia']);
const valid=value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=60&&!/[\r\n\[\]`]/.test(value);
export function dailyDrivers(root){
 try{
  const list=JSON.parse(fs.readFileSync(path.join(root,'system/v2/profile.json'),'utf8').replace(/^\uFEFF/,'')).dailyDrivers;
  if(Array.isArray(list)&&list.length>=1&&list.length<=8&&list.every(valid)&&new Set(list).size===list.length)return list;
 }catch{}
 return DEFAULT_DRIVERS;
}
// The planning rubrics share one placeholder for the effective vault profile.
export function rubricWithDrivers(text,list){
 return text.replaceAll('{{DAILY_DRIVERS}}',()=>list.join(', '));
}
