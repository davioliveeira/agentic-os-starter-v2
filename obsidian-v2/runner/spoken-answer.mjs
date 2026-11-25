// Prefer speech composed by the model already doing the work. These small
// presentation helpers never call a model or change the written deliverable.
import {createJiti} from 'jiti';
// Loaded once with this module. Measure the real number/Markdown formatter,
// which can expand a short written sentence beyond the spoken-text budget.
const {formatSpeech, isSpeechQualification, startsWithSpeechReference, speechSentences: sentences, completionSpeech, SPEECH_CLIPPED_SUFFIX} = createJiti(import.meta.url)('../shared/speech-text.ts');
export const SPOKEN_REPLY_STYLE = 'Escreva a resposta falada em português do Brasil por padrão. Use outro idioma quando a pessoa pedir explicitamente. Responda em uma a três frases naturais. Use os fatos disponíveis e preserve as incertezas relevantes, as informações que faltam e as ressalvas importantes. Comece pela resposta. Prefira frases curtas, contrações naturais e transições simples ao falar de uma sequência. Em perguntas de continuação, mantenha o assunto sem repetir a pergunta ou se apresentar novamente. Use um tom calmo e direto. Evite elogios automáticos, confirmações repetidas, entusiasmo teatral e despedidas desnecessárias. Preserve a precisão dos dados de origem quando for importante, inclusive preços, identificadores e valores exatos pedidos pela pessoa. Use linguagem simples. Evite títulos, Markdown, tabelas, caminhos de arquivos e a repetição do pedido. Não invente fatos nem dê a entender que um trabalho inacabado está pronto.';
export const WORKER_SPOKEN_STYLE = 'Use português do Brasil por padrão. Responda em outro idioma se a pessoa pedir. Quando o formato permitir, comece a resposta final com uma síntese curta e natural que possa ser lida em voz alta. Inclua na abertura todas as limitações e falhas relevantes, inclusive incertezas, entregas parciais e impedimentos, mesmo que também sejam discutidos depois. Use frases curtas, contrações naturais e transições simples para sequências. Dê contexto suficiente para identificar o resultado sem repetir o pedido ditado. Em novos pedidos da mesma conversa, prossiga naturalmente e dispense elogios automáticos, apresentações e despedidas desnecessárias. Separe a abertura dos detalhes escritos, fontes e links de arquivos com uma linha em branco. Descreva o resultado obtido. Pedidos de saída exata e formatos obrigatórios dos fluxos têm prioridade. Entregue documentos com formato exigido, esquemas, respostas apenas com código e outras saídas exatas sem abertura. Não adicione marcadores ocultos, metadados separados ou chamadas adicionais a ferramentas ou modelos para preparar a fala.';
export {ARTIFACT_HANDOFF_INSTRUCTIONS,artifactHandoffInstructions} from './artifact-instructions.mjs';

export const WRITTEN_RESULT = 'O resultado detalhado está na resposta escrita.';
const QUALIFIED_RESULT = 'O resultado tem limitações importantes. Leia a resposta completa.';
const terminate = text => /[.!?][”"')\]]*$/.test(text) ? text : text + '.';

function readable(text) {
 return text.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
  .replace(/\[\^[^\]]+\]/g, '')
  .replace(/\bhttps?:\/\/[^\s<>]+/g, 'a página do link')
  .replace(/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp|var|mnt)\/)[^\s<>"`]+/g, 'o arquivo de saída')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_match, bold, underline) => bold || underline)
  .replace(/\s+/g, ' ').trim();
}

// Read Markdown as blocks instead of flattening a table or code sample into
// an accidental sentence. Prose and list facts retain their original wording.
function spokenBlocks(input) {
 const candidate = input.trim();
 if (/^[{\[]/.test(candidate) && /[}\]]$/.test(candidate)) {
  try {if (typeof JSON.parse(candidate) === 'object') return [];} catch {}
 }
 const text = input.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
  .replace(/<!--[\s\S]*?(?:-->|$)/g, '');
 const lines = text.split(/\r?\n/), blocks = [];
 let paragraph = [], fence = null;
 const flush = () => {const value = readable(paragraph.join(' ')); if (value) blocks.push({kind: 'prose', text: value}); paragraph = [];};
 const separator = line => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
 let table = false;
 for (let index = 0; index < lines.length; index++) {
  let line = lines[index];
  const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
  if (marker) {flush(); if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null; continue;}
  if (fence) continue;
  if (!line.trim()) {flush(); table = false; continue;}
  if (separator(lines[index + 1] || '') || separator(line) || /^\s*\|.*\|\s*$/.test(line)) {flush(); table = true; continue;}
  if (table && line.includes('|')) continue;
  table = false;
  if (/^\s{0,3}#{1,6}\s|^\s*(?:[-*_]\s*){3,}$|^\s*(?:\[[^\]]+\]):\s/.test(line)) {flush(); continue;}
  // Standalone filenames, image links, and tool receipts aren't an answer.
  if (/^\s*(?:!\[[^\]]*\]\([^)]*\)|(?:SAVED|CREATED|WROTE|OUTPUT|FILE|ARTIFACT)\s*:?\s+(?:[A-Za-z]:[\\/]|\/|[\w.-]+[\\/]).*|(?:[A-Za-z]:[\\/]|\/|[\w.-]+[\\/])[^\s]+)\s*$/i.test(line)) {flush(); continue;}
  line = line.replace(/^\s*>\s?/, '');
  const item = /^\s*(?:[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)(.*)$/.exec(line);
  if (item) {flush(); const value = readable(item[1]); if (value) blocks.push({kind: 'list', text: terminate(value)});}
  else paragraph.push(line);
 }
 flush(); return blocks;
}

function fitsCompletion(text) {
 // Leave a little room below completionSpeech's 420-character limit, and check
 // its actual output too (artifact-path replacements may expand some inputs).
 return formatSpeech(text).length <= 400 && !completionSpeech('', text).endsWith(SPEECH_CLIPPED_SUFFIX);
}

function boundedCompletion(opening, limitations) {
 const required = [...new Set(limitations)];
 if (required.length && !fitsCompletion(required.join(' '))) return QUALIFIED_RESULT;
 const order=[...new Set([...opening,...required])],selected=new Set(required);
 const render=()=>order.filter(sentence=>selected.has(sentence)).join(' ');
 for (const sentence of opening) {
  if (selected.has(sentence)) continue;
  selected.add(sentence);
  if (!fitsCompletion(render())){selected.delete(sentence);break}
 }
 // Always reserve complete direct qualifications before fitting optional
 // prose. Never clip a sentence whose "but" or "not" might be at its end.
 const result = render();
 return result || WRITTEN_RESULT;
}

export function selectSpokenAnswer(text, {mode = 'completion'} = {}) {
 if (typeof text !== 'string' || !text.trim()) return WRITTEN_RESULT;
 const blocks = spokenBlocks(text);
 if (!blocks.length) return WRITTEN_RESULT;
 const all = blocks.map(block => block.text).join(' ');
 // Quick answers are already scoped by the router: retain every supplied fact
 // and requested list item. The shared speech budget is applied downstream.
 if (mode === 'reply') return all;
 if (fitsCompletion(all)) return all;
 const first = blocks[0];
 const short = all.split(/\s+/).length <= 90 && blocks.length <= 4;
 const opening = short ? blocks.flatMap(block => sentences(block.text)) : first.kind === 'prose' ? sentences(first.text).slice(0, 3) : blocks.slice(0, 3).map(block => terminate(block.text));
 const limitations = [],allSentences=blocks.flatMap(block=>sentences(block.text));
 for (const [index,sentence] of allSentences.entries()) {
  if(isSpeechQualification(sentence)){
   if(index>0&&startsWithSpeechReference(sentence))limitations.push(allSentences[index-1]);
   limitations.push(sentence);
  }
 }
 return boundedCompletion(opening, limitations);
}

export function selectCompletionAnswer(record, turn) {
 // The bridge may reject a conflicting note edit after the worker reports
 // success. Its current error is authoritative; an old workflowStatus alone
 // must not overwrite a later, unrelated successful conversation turn.
 if (record?.workflowCompleted && record.workflowStatus === 'error' && record.error) {
  const reason = String(record.error).replace(/^\s*BLOCKED:\s*/i, '');
  const answer = 'O fluxo não foi concluído. ' + reason;
  // A save rejection is authoritative even when the worker's written answer
  // says success. If its full reason cannot fit, keep the failed outcome.
  return fitsCompletion(answer) ? selectSpokenAnswer(answer, {mode: 'reply'}) : 'O fluxo não foi concluído. Ainda não consigo confirmar se o resultado foi salvo.';
 }
 return selectSpokenAnswer(turn?.text);
}
