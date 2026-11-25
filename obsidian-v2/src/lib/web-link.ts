import {Notice} from 'obsidian';
import {safeWebLink} from '../../shared/web-link.mjs';
export function openWebLink(value:string,hostname?:string){
 const url=safeWebLink(value,hostname);
 if(!url){new Notice('Este relatório contém um link inválido. Abra o relatório original para verificar.');return}
 window.open(url,'_blank','noopener,noreferrer');
}
