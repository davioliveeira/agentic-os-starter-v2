// What a Live call reads when it starts is the member's to choose (Chase, 2026-11-24): built-in parts on or off, and
// up to six of their own notes or report folders. runner/live/context.mjs, scripts/aos/live-context.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {liveSnapshot} from '../runner/live/snapshot.mjs';
import {LIVE_CONTEXT_FILE,MAX_NOTES,NOTE_MAX_BYTES,NOTES_MAX_BYTES,checkNotePath,readLiveContext,resolveNotes,writeLiveContext} from '../runner/live/context.mjs';
import {liveContextCommand} from '../scripts/aos/live-context.mjs';
import {localDate} from '../runner/brief-voice.mjs';

const now=new Date(2026,10,24,12),date=localDate(now);
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'live-notes-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(rel,value,when=now)=>{
  const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);fs.utimesSync(file,when,when);return file;
 };
 const lines=[];
 const run=(...words)=>{
  const flags={},plain=[];
  for(let i=0;i<words.length;i++){if(words[i].startsWith('--')){const next=words[i+1];if(next!==undefined&&!next.startsWith('--')){flags[words[i].slice(2)]=next;i++}else flags[words[i].slice(2)]=true}else plain.push(words[i])}
  lines.length=0;
  return liveContextCommand({words:plain,flags,vault:root,log:line=>lines.push(String(line)),snapshot:(r,options)=>liveSnapshot(r,{now,usage:{},...options})});
 };
 write(`daily-notes/${date}.md`,'---\ntop3:\n  - text: Ship the Live video\n    done: false\n---\n# Today\n');
 return {root,write,run,out:()=>lines.join('\n'),snapshot:options=>liveSnapshot(root,{now,usage:{},...options})};
}

test('with nothing chosen, a call reads every built-in part and no notes of the member’s own',async t=>{
 const f=fixture(t);
 assert.deepEqual(readLiveContext(f.root),{version:1,sections:{today:true,inbox:true,numbers:true,news:true,radar:true},notes:[]});
 const text=await f.snapshot();
 for(const header of ['Hoje (','Notas novas no cofre (','Números (','Notícias (','Radar ('])assert.ok(text.includes(header),header);
 assert.doesNotMatch(text,/incluída pela pessoa em todas as chamadas/);
});

test('a built-in part turned off is not read, and the others stay',async t=>{
 const f=fixture(t);
 await f.run('section','radar','off');await f.run('section','numbers','off');
 assert.match(f.out(),/A seção "Números" foi desativada para a próxima chamada/);
 const text=await f.snapshot();
 assert.doesNotMatch(text,/^Radar \(/m);assert.doesNotMatch(text,/^Números \(/m);
 assert.match(text,/^Hoje \(/m);assert.match(text,/^Notícias \(/m);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root,LIVE_CONTEXT_FILE),'utf8')).sections,{today:true,inbox:true,numbers:false,news:true,radar:false});
 await f.run('section','radar','on');assert.match(await f.snapshot(),/^Radar \(/m);
 await assert.rejects(f.run('section','weather','off'),/Use o comando live-context section/);
 await assert.rejects(f.run('section','radar','maybe'),/Use o comando live-context section/);
});

test('a note the member adds is read on every call, cleaned of links and markup, with where it came from',async t=>{
 const f=fixture(t);
 f.write('projects/goals.md','---\ntags: [goals]\n---\n# Goals\n<!-- private aside -->\n- Grow the channel, see [the plan](https://example.com/plan)\n- Work with [[people/Sam|Sam]] on **Live**\n\n---\n',new Date(2026,10,20,9));
 await f.run('add','projects/goals.md','--label','Goals');
 assert.match(f.out(),/Nota "Goals" adicionada \(projects\/goals\.md\)/);
 const text=await f.snapshot();
 assert.match(text,/^Goals \(projects\/goals\.md, salva em 2026-11-20\. Nota incluída pela pessoa em todas as chamadas\. Dados para consulta\)\n# Goals\n- Grow the channel, see the plan\n- Work with Sam on Live$/m);
 assert.doesNotMatch(text,/private aside|example\.com|tags:/);
 // It sits after Today and before the reports.
 assert.ok(text.indexOf('Goals (')>text.indexOf('Hoje (')&&text.indexOf('Goals (')<text.indexOf('Notícias ('));
 // Adding it again only renames it; removing it by name or number takes it off.
 await f.run('add','projects/goals.md','--label','Quarter goals');assert.match(f.out(),/já estava na lista\. Agora aparece como "Quarter goals"/);
 assert.equal(readLiveContext(f.root).notes.length,1);
 await f.run('remove','Quarter goals');assert.match(f.out(),/Nota "Quarter goals" removida/);
 assert.doesNotMatch(await f.snapshot(),/incluída pela pessoa/);
 await assert.rejects(f.run('remove','1'),/não está na lista/);
});

test('a report folder gives its newest note, so a report saved every day stays current',async t=>{
 const f=fixture(t);
 f.write('inbox/research/competitors/2026-11-22-competitors.md','Old report.',new Date(2026,10,22,8));
 f.write('inbox/research/competitors/_template.md','Template, never read.',new Date(2026,10,24,11));
 f.write('inbox/research/competitors/notes.png','not text',new Date(2026,10,24,11));
 await f.run('add','inbox/research/competitors/','--label','Competitor report');
 assert.match(f.out(),/a nota mais recente em inbox\/research\/competitors/);
 assert.match(await f.snapshot(),/^Competitor report \(inbox\/research\/competitors\/2026-11-22-competitors\.md, salva em 2026-11-22\. Nota incluída pela pessoa em todas as chamadas\. Nota mais recente em inbox\/research\/competitors\. Dados para consulta\)\nOld report\.$/m);
 f.write('inbox/research/competitors/2026-11-24-competitors.md','Today\'s report.',new Date(2026,10,24,7));
 const text=await f.snapshot();
 assert.match(text,/2026-11-24-competitors\.md, salva em 2026-11-24/);assert.match(text,/Today's report\./);assert.doesNotMatch(text,/Old report|Template/);
 // An empty folder is kept on the list and said to be empty, not guessed at.
 fs.mkdirSync(path.join(f.root,'inbox/research/empty'));
 await f.run('add','inbox/research/empty');assert.match(f.out(),/Por enquanto, a chamada vai ignorar esse item: a pasta ainda está sem notas/);
 await f.run('show');assert.match(f.out(),/2\. empty: nota mais recente em inbox\/research\/empty \(item não enviado: a pasta ainda está sem notas\)/);
 assert.match(f.out(),/1\. Competitor report: nota mais recente em inbox\/research\/competitors \(2026-11-24-competitors\.md\), salva em 2026-11-24/);
});

test('only notes inside the vault can be added: not the system’s own files, not other file types, not a missing path',async t=>{
 const f=fixture(t);
 f.write('system/v2/profile.json','{}');f.write('.obsidian/app.json','{}');f.write('photo.png','x');f.write('projects/plan.md','Plan');
 for(const [target,reason] of [['../outside.md',/dentro do cofre/],['C:/Windows/win.ini',/dentro do cofre/],['system/v2/profile.json',/caminho interno do sistema/],['system/v2',/caminho interno do sistema/],
  ['.obsidian/app.json',/caminho interno do sistema/],['photo.png',/formatos \.md, \.txt e \.csv/],['projects/missing.md',/O caminho projects\/missing\.md não foi encontrado/]])
  await assert.rejects(f.run('add',target),reason,target);
 assert.equal(fs.existsSync(path.join(f.root,LIVE_CONTEXT_FILE)),false,'nothing was written');
 assert.equal(checkNotePath(f.root,'projects\\plan.md').path,'projects/plan.md','a Windows path is accepted as written');
 await assert.rejects(f.run('add','projects/plan.md','--label'),/Informe um nome com --label/);
});

test('at most six notes, each cut to its share, and all of them within one budget',async t=>{
 const f=fixture(t);
 for(let index=1;index<=MAX_NOTES;index++){f.write(`notes/n${index}.md`,`Note ${index}\n`+`line ${index} `.repeat(1500));await f.run('add',`notes/n${index}.md`)}
 f.write('notes/n7.md','Seven');
 await assert.rejects(f.run('add','notes/n7.md'),/até 6 das suas notas/);
 await f.run('remove','6');await f.run('add','notes/n1.md');
 const notes=resolveNotes(f.root,readLiveContext(f.root));
 assert.ok(notes.every(note=>Buffer.byteLength(note.text||'')<=NOTE_MAX_BYTES));
 assert.ok(notes.reduce((sum,note)=>sum+Buffer.byteLength(note.text||''),0)<=NOTES_MAX_BYTES);
 assert.equal(notes.filter(note=>note.cut).length,notes.filter(note=>note.text).length,'each long note says it was cut');
 assert.match(notes.find(note=>note.text).text,/\(Trecho reduzido\. O restante está na nota\.\)$/);
 assert.ok(notes.some(note=>/já ocupam o espaço disponível/.test(note.problem||'')),'a note past the budget is left out and says why');
 await f.run('show');assert.match(f.out(),/reduzida para caber/);assert.match(f.out(),/item não enviado: as notas anteriores já ocupam o espaço disponível/);
});

test('a settings file that cannot be read means the starting setup, and reset rewrites it',async t=>{
 const f=fixture(t);
 f.write(LIVE_CONTEXT_FILE,'{ not json');
 const config=readLiveContext(f.root);
 assert.equal(config.unreadable,true);assert.equal(config.sections.radar,true);assert.deepEqual(config.notes,[]);
 await f.run('show');assert.match(f.out(),/Falha ao ler system\/v2\/live-context\.json\. A chamada usa a configuração inicial/);
 await f.run('reset');assert.match(f.out(),/Configuração inicial restaurada/);
 assert.equal(readLiveContext(f.root).unreadable,undefined);
 // A hand-edited file with junk in it keeps what makes sense.
 writeLiveContext(f.root,{sections:{today:false},notes:[]});
 f.write(LIVE_CONTEXT_FILE,JSON.stringify({sections:{today:false,radar:'no',extra:false},notes:[{path:'a.md'},{path:'a.md'},{path:7},{label:'no path'}]}));
 assert.deepEqual(readLiveContext(f.root),{version:1,sections:{today:false,inbox:true,numbers:true,news:true,radar:true},notes:[{path:'a.md',label:'a'}]});
});

test('show lists every part with its state, the member’s notes, and that it all goes to OpenAI; --full prints the snapshot',async t=>{
 const f=fixture(t);
 f.write('AGENTS.md','## About me\nI make videos about AI agents.\n');
 f.write('projects/goals.md','Grow the channel.');
 await f.run('add','projects/goals.md','--label','Goals');await f.run('section','news','off');
 await f.run('show');
 const out=f.out();
 assert.match(out,/Sobre mim \(AGENTS\.md\): \d+ de 2000 bytes/);
 assert.match(out,/desativado\s+news\s+Notícias/);assert.match(out,/ativado\s+today\s+Hoje/);assert.match(out,/ativado\s+tasks\s+Títulos/);
 assert.match(out,/1\. Goals: projects\/goals\.md, salva em \d{4}-\d{2}-\d{2}, \d+ bytes/);
 assert.match(out,/Essas informações são enviadas à OpenAI no início de cada chamada/);
 await f.run('show','--full');
 assert.match(f.out(),/^Dados do cofre coletados em /);assert.match(f.out(),/I make videos about AI agents\./);assert.match(f.out(),/^Goals \(projects\/goals\.md/m);
 assert.match(f.out(),/As tarefas em andamento são incluídas no início da chamada/);
 assert.doesNotMatch(f.out(),/^Notícias \(/m);
 await assert.rejects(f.run('show','--label','x'),/O que a voz ao vivo lê no início da chamada/);
 await assert.rejects(f.run('rename'),/O que a voz ao vivo lê no início da chamada/);
});
