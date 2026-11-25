import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDailyPost } from '../lib/daily-edit';
import { addDriver, setVaultRoot, readCachedVaultState, readDailyNote, toggleTaskFuzzy } from '../lib/vault';
import { replaceDaily } from '../../obsidian-v2/runner/note-edits.mjs';
import { readVoiceReport } from '../../obsidian-v2/runner/voice-documents.mjs';
import { TIME_ZONE } from '../../obsidian-v2/shared/timezone.mjs';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
const relative = `daily-notes/${date}.md`;
const before = '\ufeff---\r\nschema_version: 1\r\n---\n## Top 3 Priorities\r\n1. [ ] Write the script\r\n2. [ ] Review edit\n3. [x] Publish\r\n\r\n## Notes\r\nUnrelated words.\r\n';
const beforePt = '\ufeff## Foco atual\r\nFechar a proposta\n\n' +
  '## 3 prioridades\r\n1. [ ] Rever proposta\r\n2. [x] Enviar pauta\n\n' +
  '## Anexos\n1. [ ] Guardar recibo\n\n' +
  '## Agenda\r\n- 9:30 — Reunião da equipe\n\n' +
  '## Rotinas diárias\r\n- [ ] Organizar a documentação\r\n\r\n' +
  '## Notas\n- 12:00 — Evento de exemplo\n';
const input = { index: 0, done: true, date, text: 'Write the script' };
const request = (body: unknown = input, origin = 'http://127.0.0.1:3217') => new Request('http://127.0.0.1:3217/api/daily', {
  method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body),
});

function fixture(content = before) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-daily-')));
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  const calls: string[] = [];
  const transport = async (route: string, body?: any) => {
    calls.push(route);
    if (route === '/status') return { vault: root };
    if (route.startsWith('/report?')) return readVoiceReport(root, new URL('http://local' + route).searchParams.get('path'), [], []);
    if (route === '/notes/replace') return replaceDaily(root, body);
    throw new Error('Unexpected bridge request ' + route);
  };
  return { root, file, transport, calls, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('daily POST uses the guarded bridge write and refreshes the actual dashboard cache', async () => {
  const f = fixture();
  try {
    setVaultRoot(f.root);
    const stale = await readCachedVaultState();
    assert.equal(stale.daily?.top3[0].done, false);
    const response = await createDailyPost({ requestBridge: f.transport })(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(fs.readFileSync(f.file, 'utf8'), before.replace('1. [ ]', '1. [x]'));
    assert.deepEqual(f.calls, ['/status', '/report?path=' + encodeURIComponent(relative), '/notes/replace']);
    const fresh = await readCachedVaultState();
    assert.notEqual(fresh, stale);
    assert.equal(fresh.daily?.top3[0].done, true);
  } finally { f.cleanup(); }
});

test('dashboard reads Portuguese focus, priorities and schedule', () => {
  const f = fixture(beforePt);
  try {
    setVaultRoot(f.root);
    assert.deepEqual(readDailyNote(), {
      date,
      isToday: true,
      focus: 'Fechar a proposta',
      top3: [{ text: 'Rever proposta', done: false }, { text: 'Enviar pauta', done: true }],
      schedule: [{ time: '9:30', item: 'Reunião da equipe' }],
    });
  } finally { f.cleanup(); }
});

test('daily POST changes exactly one Portuguese checkbox and stops at other sections', async () => {
  const f = fixture(beforePt);
  try {
    const handler = createDailyPost({ requestBridge: f.transport });
    assert.equal((await handler(request({ index: 2, done: true, date, text: 'Guardar recibo' }))).status, 404);
    assert.equal((await handler(request({ index: 1, done: false, date, text: 'Enviar pauta' }))).status, 200);
    assert.equal(fs.readFileSync(f.file, 'utf8'), beforePt.replace('2. [x] Enviar pauta', '2. [ ] Enviar pauta'));
  } finally { f.cleanup(); }
});

test('fuzzy toggle changes only the matched Portuguese checkbox', () => {
  const f = fixture(beforePt);
  try {
    setVaultRoot(f.root);
    assert.deepEqual(toggleTaskFuzzy('Guardar recibo'), { ok: false });
    assert.deepEqual(toggleTaskFuzzy('documentacao'), {
      ok: true, item: 'Organizar a documentação', done: true, section: 'Rotinas diárias',
    });
    assert.equal(fs.readFileSync(f.file, 'utf8'), beforePt.replace('- [ ] Organizar', '- [x] Organizar'));
  } finally { f.cleanup(); }
});

test('adding a Portuguese driver preserves spacing and line endings outside the new item', () => {
  const f = fixture(beforePt);
  try {
    setVaultRoot(f.root);
    assert.equal(addDriver('Revisar a agenda'), true);
    assert.equal(fs.readFileSync(f.file, 'utf8'), beforePt.replace(
      '- [ ] Organizar a documentação\r\n', '- [ ] Organizar a documentação\r\n- [ ] Revisar a agenda\r\n',
    ));
  } finally { f.cleanup(); }
});

test('an Obsidian edit between daily read and write is preserved and the conflict refreshes cache', async () => {
  const f = fixture();
  try {
    setVaultRoot(f.root);
    await readCachedVaultState();
    const concurrent = before.replace('Write the script', 'My new priority');
    const handler = createDailyPost({ requestBridge: async (route, body) => {
      if (route === '/notes/replace') fs.writeFileSync(f.file, concurrent);
      return f.transport(route, body);
    } });
    const response = await handler(request());
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /edições recentes foram preservadas/);
    assert.equal(fs.readFileSync(f.file, 'utf8'), concurrent);
    assert.equal((await readCachedVaultState()).daily?.top3[0].text, 'My new priority');
    assert.equal(f.calls.filter(route => route === '/notes/replace').length, 1, 'never silently retries a conflicted write');
  } finally { f.cleanup(); }
});

test('a priority renamed before the click is read cannot toggle a different task', async () => {
  const f = fixture();
  try {
    const concurrent = before.replace('Write the script', 'New task');
    fs.writeFileSync(f.file, concurrent);
    const response = await createDailyPost({ requestBridge: f.transport })(request());
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /A prioridade mudou/);
    assert.equal(fs.readFileSync(f.file, 'utf8'), concurrent);
    assert.equal(f.calls.includes('/notes/replace'), false);
  } finally { f.cleanup(); }
});

test('daily POST rejects invalid input, stale dates and cross-origin writes before calling the bridge', async () => {
  const handler = createDailyPost({ requestBridge: async () => { throw new Error('Should not call the bridge'); } });
  for (const body of [null, {}, { ...input, index: -1 }, { ...input, done: 'true' }, { ...input, text: '' }]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal((await handler(request({ ...input, date: '1999-01-01' }))).status, 409);
  assert.equal((await handler(request(input, 'https://evil.example'))).status, 403);
});

test('daily POST keeps bridge failures actionable instead of relabeling them invalid input', async () => {
  const handler = createDailyPost({ requestBridge: async () => { throw new Error('V2 bridge is offline'); } });
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, 'V2 bridge is offline');
});
