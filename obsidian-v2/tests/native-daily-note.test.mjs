import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const bundle = await build({
 stdin: {contents: `
  export * from './src/lib/vault';
  export * from './src/lib/vault-writer';
  export {setRequestHandler} from 'obsidian';
 `, resolveDir: fileURLToPath(new URL('..', import.meta.url))},
 bundle: true, write: false, platform: 'node', format: 'esm',
 plugins: [{name: 'obsidian-test', setup(builder) {
  builder.onResolve({filter: /^obsidian$/}, () => ({path: 'obsidian', namespace: 'fixture'}));
  builder.onLoad({filter: /.*/, namespace: 'fixture'}, () => ({contents: `
   let handler;
   export function setRequestHandler(next) { handler = next; }
   export function requestUrl(request) { return handler(request); }
   export class Notice {}
  `}));
 }}],
});
const {readDailyNote, toggleTaskByText, addTaskToSection, setTop3TextByIndex, toggleTop3ByIndex, setRequestHandler} =
 await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const path = 'daily-notes/2026-11-25.md';
function fixture(initial) {
 let raw = initial;
 const file = {path, extension: 'md'};
 const app = {
  vault: {adapter: {}, getAbstractFileByPath: p => p === path ? file : null, read: async () => raw, cachedRead: async () => raw},
  metadataCache: {getFileCache: () => ({frontmatter: {date: '2026-11-25', schema_version: 1, top3_done: [false, true]}})},
 };
 setRequestHandler(request => {
  assert.equal(request.method, 'POST');
  assert.equal(new URL(request.url).pathname, '/notes/replace');
  const body = JSON.parse(request.body);
  assert.equal(body.path, path);
  assert.equal(body.before, raw);
  raw = body.after;
  return {status: 200, json: {}, headers: {}};
 });
 return {app, read: () => raw};
}

for (const headings of [
 ['Foco atual', '3 prioridades', 'Agenda', 'Rotinas diárias', 'Registro de atividades', 'Notas', 'Reflexão do dia'],
 ['Current Focus', 'Top 3 Priorities', 'Schedule', 'Daily Drivers', 'Activity Log', 'Notes', 'EOD Reflection'],
]) {
 const [focus, priorities, schedule, drivers, activity, notes, reflection] = headings;
 const note = [
  '\uFEFF---', 'date: 2026-11-25', 'schema_version: 1', 'top3:', '  - "Escrever"', '  - "Revisar"', '---',
  '# 2026-11-25', `## ${focus}`, 'Trabalho principal', '', `## ${priorities}`, '1. [x] Escrever', '2. [ ] Revisar', '',
  `## ${schedule}`, '- 10:00 — Reunião', '', `## ${drivers}`, '- [ ] Caminhar', '',
  `## ${activity}`, '- 11:00 — Escrevi', '', `## ${notes}`, 'Manter estas notas', 'Outra linha', '',
  `## ${reflection}`, 'Fechar o dia', '',
 ].join('\r\n');

 test(`reads ${focus} and the other daily sections from a BOM/CRLF note`, async () => {
  const {app} = fixture(note);
  assert.deepEqual(await readDailyNote(app, path), {
   path, date: '2026-11-25', schemaVersion: 1, supported: true, focus: 'Trabalho principal',
   top3: [{text: 'Escrever', done: true}, {text: 'Revisar', done: true}],
   schedule: [{time: '10:00', title: 'Reunião'}], drivers: [{text: 'Caminhar', done: false}],
   activityLog: '- 11:00 — Escrevi', notes: 'Manter estas notas\nOutra linha', eodReflection: 'Fechar o dia',
  });
 });

 test(`edits ${priorities} and its frontmatter mirror while preserving BOM and CRLF`, async () => {
  const {app, read} = fixture(note);
  assert.equal(await setTop3TextByIndex(app, path, 0, 'Escrever um resumo'), true);
  assert.equal(await toggleTop3ByIndex(app, path, 1), true);
  assert.equal(await setTop3TextByIndex(app, path, 2, 'Enviar'), true);
  assert.equal(read(), note
   .replace('  - "Escrever"', '  - "Escrever um resumo"')
   .replace('1. [x] Escrever', '1. [x] Escrever um resumo')
   .replace('2. [ ] Revisar\r\n', '2. [x] Revisar\r\n3. [ ] Enviar\r\n'));
 });

 test(`edits ${drivers} when the caller uses the Portuguese heading`, async () => {
  const {app, read} = fixture(note);
  assert.equal(await toggleTaskByText(app, path, 'Rotinas diárias', 'Caminhar'), true);
  assert.equal(await addTaskToSection(app, path, 'Rotinas diárias', 'Ler'), true);
  assert.equal(read(), note.replace('- [ ] Caminhar', '- [x] Caminhar\r\n- [ ] Ler'));
 });
}

test('edits the exact custom heading and keeps neighboring sections intact', async () => {
 const note = '## Rotinas da equipe amanhã\n- [ ] Rever\n\n## Rotinas da equipe\n- [ ] Rever\n\n## Anexos\n- [ ] Rever\n';
 const {app, read} = fixture(note);
 assert.equal(await toggleTaskByText(app, path, 'Rotinas da equipe', 'Rever'), true);
 assert.equal(await addTaskToSection(app, path, 'Rotinas da equipe', 'Responder'), true);
 assert.equal(read(), note.replace('## Rotinas da equipe\n- [ ] Rever', '## Rotinas da equipe\n- [x] Rever\n- [ ] Responder'));
});
