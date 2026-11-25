import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {main} from '../scripts/aos.mjs';
import {aboutCommand} from '../scripts/aos/about.mjs';

const IMPORT='<!-- O Claude Code lê AGENTS.md por esta importação. Edite AGENTS.md. -->';
const IMPORT_LINE='@AGENTS.md';
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aos-about-')),vault=path.join(dir,'vault');
  fs.mkdirSync(vault);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const at={vaultFile:path.join(dir,'vault.json')};fs.writeFileSync(at.vaultFile,JSON.stringify({vault}));
  const target=name=>path.join(vault,name),put=(name,text)=>fs.writeFileSync(target(name),text);
  const run=(action,flags)=>{const output=[];assert.equal(aboutCommand({words:[action],flags,at,log:text=>output.push(text)}),0);return output};
  const write=text=>{const from=path.join(dir,'input.md');fs.writeFileSync(from,text);return run('write',{from})};
  const get=name=>fs.readFileSync(target(name),'utf8'),files=()=>fs.readdirSync(vault).sort();
  const saved=name=>{
    const backup=fs.readdirSync(target('system/v2/backups'));
    assert.equal(backup.length,1);assert.ok(backup[0].startsWith(name+'.'));assert.match(backup[0],/\.\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.\d{3}Z$/);
    return fs.readFileSync(target(`system/v2/backups/${backup[0]}`));
  };
  return {run,write,put,get,files,saved,target};
}

for(const eol of ['\r\n','\n'])test(`about write replaces only the section and backs up the original (${JSON.stringify(eol)})`,t=>{
  const {put,write,get,saved}=fixture(t);
  const prefix=['\uFEFF# Vault','<!-- preface -->','','## AbOuT me  ',''].join(eol)+eol;
  const suffix=eol+eol+['## Conventions','Keep café  ','<!-- untouched -->','No newline at end'].join(eol);
  const before=prefix+'Old About me'+suffix,claude='<!-- Claude Code reads AGENTS.md through this import; edit AGENTS.md. -->'+eol+'@AGENTS.md'+eol;
  put('AGENTS.md',before);put('CLAUDE.md',claude);
  const output=write('## About me\n\nI work with [[team/Sam|Sam]].\nUse short replies.\n');
  assert.equal(get('AGENTS.md'),prefix+['I work with [[team/Sam|Sam]].','Use short replies.'].join(eol)+suffix);
  assert.deepEqual(saved('AGENTS.md'),Buffer.from(before));assert.equal(get('CLAUDE.md'),claude);
  assert.deepEqual(output,['I work with Sam.\nUse short replies.','AGENTS.md · 35 / 2000 bytes']);
});

test('about write creates the canonical file and import in an empty vault',t=>{
  const {write,get,files}=fixture(t);
  const output=write('A short biography.');
  assert.deepEqual(files(),['AGENTS.md','CLAUDE.md']);
  assert.equal(get('AGENTS.md'),'## Sobre mim\n\nA short biography.\n\n## Convenções do cofre\n\nVeja os guias em `docs/`.\n');
  assert.equal(get('CLAUDE.md'),[IMPORT,IMPORT_LINE,''].join('\n'));
  assert.equal(output[0],'A short biography.');
});

test('about write inserts after a title or at the top and keeps existing prose private',t=>{
  const {put,write,get,run}=fixture(t),rest='Working conventions à la carte.\r\n## More\r\nPreserve this.';
  const title='<!-- # Commented title -->\r\n# Vault\r\n';
  put('AGENTS.md',title+rest);
  write('About body');
  assert.equal(get('AGENTS.md'),title+'\r\n## Sobre mim\r\n\r\nAbout body\r\n\r\n## Convenções do cofre\r\n\r\n'+rest);
  assert.equal(run('show')[0],'About body');
  const noTitle='## Existing\nKeep these bytes.\n';put('AGENTS.md',noTitle);
  write('New bio');assert.equal(get('AGENTS.md'),'## Sobre mim\n\nNew bio\n\n'+noTitle);
  const metadata='---\nprivate: example\n---\n';put('AGENTS.md',metadata+noTitle);
  write('New bio');assert.equal(get('AGENTS.md'),metadata+'\n## Sobre mim\n\nNew bio\n\n'+noTitle);
  assert.equal(run('show')[0],'New bio');
});

test('about write keeps an existing CLAUDE.md without the import and points to the next step',t=>{
  const {put,write,get}=fixture(t),before='# Existing Claude rules\n<!-- @AGENTS.md -->\n';
  put('CLAUDE.md',before);
  assert.match(write('New bio')[0],/Adicione `@AGENTS\.md` em uma linha separada.*about migrate/);
  assert.equal(get('CLAUDE.md'),before);
});

for(const existing of [false,true])test(`about migrate previews and copies exact CRLF bytes (${existing?'identical AGENTS.md':'no AGENTS.md'})`,t=>{
  const {put,get,run,files,saved,target}=fixture(t);
  const before=Buffer.from('\uFEFF# Vault\r\n## About me\r\nA note about café.\r\n\r\n## Keep\r\nConventions');
  put('CLAUDE.md',before);if(existing)put('AGENTS.md',before);
  const initial=files();assert.match(run('migrate')[0],/A migração fará uma cópia de segurança de CLAUDE\.md.*--yes/);
  assert.deepEqual(files(),initial);assert.deepEqual(fs.readFileSync(target('CLAUDE.md')),before);
  if(existing)assert.deepEqual(fs.readFileSync(target('AGENTS.md')),before);
  assert.match(run('migrate',{yes:true})[0],/Migração concluída/);
  assert.deepEqual(fs.readFileSync(target('AGENTS.md')),before);assert.deepEqual(saved('CLAUDE.md'),before);
  assert.equal(get('CLAUDE.md'),[IMPORT,IMPORT_LINE,''].join('\r\n'));
  assert.equal(run('show')[0],'A note about café.');
});

for(const [label,agents,claude,reason] of [
  ['missing CLAUDE.md',null,null,/CLAUDE\.md não foi encontrado/],
  ['only the import','Contents',['<!-- import -->',IMPORT_LINE,''].join('\n'),/já importa/],
  ['conflicting AGENTS.md','Agent rules','Claude rules',/é diferente de CLAUDE\.md/]
])test(`about migrate refuses ${label} without changes`,t=>{
  const {put,get,run,files}=fixture(t);
  if(agents!==null)put('AGENTS.md',agents);if(claude!==null)put('CLAUDE.md',claude);
  const initial=files();
  assert.throws(()=>run('migrate',{yes:true}),reason);assert.deepEqual(files(),initial);
  if(agents!==null)assert.equal(get('AGENTS.md'),agents);if(claude!==null)assert.equal(get('CLAUDE.md'),claude);
});

test('about write rejects an oversized body or another section before any write',t=>{
  const {write,files}=fixture(t);
  assert.throws(()=>write('## About me\n'+'é'.repeat(4097)),/8 KB/);
  assert.throws(()=>write('## About me\nKeep this.\n## More\nDo not split it.'),/título de nível dois/);
  assert.throws(()=>write('First line\n## About me\nA second section'),/título de nível dois/);
  assert.deepEqual(files(),[]);
});

test('about show prints a one-line how-to or the cleaned text with the byte counts',t=>{
  const {put,run}=fixture(t);
  const missing=run('show');assert.equal(missing.length,1);assert.match(missing[0],/Adicione a seção ## Sobre mim.*about write/);
  const text='é'.repeat(1000);put('CLAUDE.md',`## About me\n${text}\n1234`);
  assert.deepEqual(run('show'),[text,'CLAUDE.md · 2000 / 2000 bytes · 5 bytes omitidos']);
});

test('aos dispatches about and lists it in help',async()=>{
  const output=[];
  assert.equal(await main(['help'],text=>output.push(text)),0);assert.match(output.pop(),/about help/);
  assert.equal(await main(['about','help'],text=>output.push(text)),0);assert.match(output.pop(),/^Sobre mim\n[\s\S]*about write --from <arquivo>/);
});
