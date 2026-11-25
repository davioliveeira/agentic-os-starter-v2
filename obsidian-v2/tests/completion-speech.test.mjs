import test from 'node:test';
import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
const {completionSpeech,workAttentionSpeech}=await createJiti(import.meta.url).import('../shared/speech-text.ts');

test('completion speaks the result without repeating a dictated request',()=>{
 const title='Hey I want you to create a graphic for the new stuff';
 const answer='Created a visual roundup with RubyGems as the lead story, plus Claude Code and GitHub picks.\n\nThe graphic corrects the earlier summary: **new sign-ups paused for four days**, rather than the entire registry going offline.';
 const spoken=completionSpeech(title,answer);
 assert.ok(spoken.startsWith('Created a visual roundup with RubyGems'));
 assert.match(spoken,/rather than the entire registry going offline/);
 assert.doesNotMatch(spoken,/Hey I want|is now done|\*\*/);
});

test('unsuccessful work never gets a fabricated completion claim',()=>{
 const text="I couldn't verify today's biggest Hacker News story because the web tool failed to start. Paste the headlines and I can compare them.";
 assert.equal(completionSpeech('Find the biggest story',text),text);
 assert.doesNotMatch(completionSpeech('Create a graphic','I need your approval before I can save it.'),/done|ready|completed/i);
 assert.match(completionSpeech('Save the report','## Unable to save\nThe folder is unavailable.'),/^Unable to save/);
 for(const file of ['/tmp/report.pdf','outputs/report.pdf','C:\\work\\report.pdf']){
  assert.equal(completionSpeech('Save it',`Não consegui criar ${file} porque a permissão foi negada.`),'Não consegui criar o arquivo de saída porque a permissão foi negada.');
  assert.equal(completionSpeech('Save it',`Não consegui salvar ${file}.`),'Não consegui salvar o arquivo de saída.');
 }
});

test('spoken results omit document chrome and paths and stay short',()=>{
 const spoken=completionSpeech('Make a graphic','## Result\nYour graphic is ready.\n\nSaved to C:\\work\\outputs\\news.png. [Open the graphic](https://example.com/a).\n```js\nsecretCode()\n```');
 assert.ok(spoken.startsWith('Your graphic is ready.'));
 assert.doesNotMatch(spoken,/C:|outputs|secretCode|https:|##/);
 const long=completionSpeech('Summarize this','Here is the result. '+ 'More details follow. '.repeat(100));
 assert.ok(long.length<=420);
 assert.match(long,/A resposta completa está no texto\.$/);
});

test('empty results and attention states remain honest and omit the task request',()=>{
 assert.equal(completionSpeech('Please create a report',''),'A tarefa terminou. Confira o resultado no terminal.');
 assert.equal(workAttentionSpeech('codex','needs input','Approve the edit in the terminal.'),'Codex precisa da sua ajuda. Approve the edit in the terminal.');
 assert.equal(workAttentionSpeech('claude','error'),'Claude Code encontrou um problema. Confira os detalhes no terminal.');
 assert.equal(workAttentionSpeech('claude','needs input'),'Claude Code precisa da sua ajuda. Abra o terminal para continuar.');
 const approval='Codex is waiting for your approval. Review the requested action in its terminal.';
 assert.equal(workAttentionSpeech('codex','needs input',approval),approval);
});
