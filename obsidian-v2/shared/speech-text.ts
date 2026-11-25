import {normalizeForSpeech,scrubRunSummary} from './spoken-text';
// The shared speech server accepts 900 characters. Reserve room below that
// boundary after normalization, which can expand numbers and abbreviations.
export const MAX_SPEECH_CHARS=880;
export const SPEECH_CLIPPED_SUFFIX=' A resposta completa está no texto.';
const spokenSentences=new Intl.Segmenter('pt-BR',{granularity:'sentence'});
export function speechSentences(text:string){return [...spokenSentences.segment(text)].map(part=>part.segment.trim()).filter(Boolean)}
// Preserve qualifying language verbatim, whether it describes our work or the
// subject of an answer. This is a shortening guard, not a task-status classifier.
const englishQualification=/\b(?:not|no|never|cannot|without|unless|except|but|however|although|unverified|uncertain|uncertainty|disputed|alleged|reportedly|incomplete|partial(?:ly)?|blocked|unavailable|unable|failed|failure|fails|pending|denied|refused|rejected|requires?|remaining|limitation|caveat|provisional|proposed|draft|only|may|might)\b|\b\w+n['’]t\b|\b(?:need|waiting)\b.{0,45}\b(?:approval|permission|access|confirm)|\b(?:rather than|instead of|yet to|could not|could be)\b/i;
const portugueseQualification=/(?<![\p{L}\p{M}])(?:não|nunca|sem|exceto|mas|porém|embora|contudo|incert[oa]s?|incerteza|incomplet[oa]s?|parcia(?:l|is)(?:mente)?|bloquead[oa]s?|indisponíve(?:l|is)|falh(?:a|as|ou)|pendentes?|negad[oa]s?|recusad[oa]s?|rejeitad[oa]s?|exige|falt(?:a|am)|limitaç(?:ão|ões)|ressalvas?|provisóri[oa]s?|rascunhos?|apenas|talvez|pode ser|a menos que|(?:precis[oa]|aguardo).{0,40}(?:aprovação|permissão|acesso|confirmar))(?![\p{L}\p{M}])/iu;
export function isSpeechQualification(text:string){return englishQualification.test(text)||portugueseQualification.test(text)}
export function startsWithSpeechReference(text:string){return /^(?:it|this|that|they|these|those|otherwise|isso|isto|essa|esse|essas|esses|ela|ele|elas|eles|nesse caso|caso contrário)(?![\p{L}\p{M}])/iu.test(text)}
export function formatSpeech(input:string){return normalizeForSpeech(scrubRunSummary(input.replace(/```[\s\S]*?(?:```|$)/g,' O código está na resposta escrita. ').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'a página do link'))).replace(/\s+/g,' ').trim()}
export function speechText(input:string,max=MAX_SPEECH_CHARS){
  max=Math.max(0,Math.min(MAX_SPEECH_CHARS,Number.isFinite(max)?Math.floor(max):MAX_SPEECH_CHARS));
 const clean=formatSpeech(input);
 if(clean.length<=max)return clean;
 const suffix=SPEECH_CLIPPED_SUFFIX;
 const fallback=[suffix.trim(),'Veja a resposta.','Veja o texto.',''].find(text=>max>=text.length)!;
 const parts=speechSentences(clean),required=new Set<number>();
 parts.forEach((part,index)=>{if(isSpeechQualification(part)){required.add(index);if(index>0&&startsWithSpeechReference(part))required.add(index-1)}});
 const selected=new Set(required),render=()=>parts.filter((_,index)=>selected.has(index)).join(' ');
 if(render().length+suffix.length>max)return fallback;
 for(let index=0;index<parts.length;index++){
  if(selected.has(index))continue;
  selected.add(index);if(render().length+suffix.length>max){selected.delete(index);break}
 }
 const result=render();return result?result+suffix:fallback;
}
// Speak the worker's result, never the request used as its tab title. Keep the
// wording (including failures and qualifications) instead of inventing success.
export function completionSpeech(_title:string,text:string){
 const result=text.replace(/^\s{0,3}#{1,6}\s+(?:result|summary|answer|outcome|resultado|resumo|resposta)\s*\r?$/gim,'')
  .replace(/^\s*[-*+]\s+/gm,'')
  .replace(/(?:[A-Za-z]:[\\/]|\/)?(?:[\w.-]+[\\/])+[\w.-]+\.(?:png|jpe?g|webp|svg|pdf|pptx|docx)\b/gi,'o arquivo de saída');
 return speechText(result,420)||'A tarefa terminou. Confira o resultado no terminal.';
}
export function workAttentionSpeech(provider:string,state:'needs input'|'error',reason=''){
 const name=provider==='claude'?'Claude Code':'Codex';
 if(state==='error')return `${name} encontrou um problema. Confira os detalhes no terminal.`;
 const detail=speechText(reason,220);
 if(/^(?:Codex|Claude Code)\b/.test(detail))return detail;
 return `${name} precisa da sua ajuda. ${detail||'Abra o terminal para continuar.'}`;
}
export class SilenceGate {
 private heardAt:number|null=null; private started:number|null=null;
 update(level:number,now:number){this.started??=now;if(level>0.018)this.heardAt=now;return this.heardAt!==null&&now-this.heardAt>=1600&&now-this.started>1000}
}
