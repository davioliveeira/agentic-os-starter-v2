import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {voiceCommand, VOICE_HELP} from '../scripts/aos/voice.mjs';
import {layout} from '../scripts/aos/services.mjs';
import {main} from '../scripts/aos.mjs';

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'aos-voice-command-'));
test.after(() => fs.rmSync(scratch, {recursive: true, force: true}));

// An installation folder and a vault with a few notes, none of it real.
function installation() {
  const root = path.join(fs.mkdtempSync(path.join(scratch, 'install-')), 'obsidian-v2'), vault = path.join(path.dirname(root), 'vault'), at = layout(root);
  fs.mkdirSync(at.runtime, {recursive: true});
  for (const file of ['projects/2026-11-01-jev-plan.md', 'projects/2026-11-02-jev-batch.md', 'system/v2/profile.json']) { fs.mkdirSync(path.join(vault, path.dirname(file)), {recursive: true}); fs.writeFileSync(path.join(vault, file), file.endsWith('.json') ? '{"dailyDrivers":["Inbox triage"]}' : '# note'); }
  const run = async (...words) => { const lines = []; const flags = {}; const plain = []; for (let index = 0; index < words.length; index++) { if (String(words[index]).startsWith('--')) { flags[words[index].slice(2)] = words[index + 1]; index++; } else plain.push(words[index]); } const code = await voiceCommand({words: plain, flags, log: line => lines.push(line), at, vault}); return {code, text: lines.join('\n')}; };
  const profile = () => JSON.parse(fs.readFileSync(path.join(vault, 'system/v2/profile.json'), 'utf8'));
  return {at, vault, run, profile};
}

test('voice shows every setting, and each one can be changed from the command line', async () => {
  const f = installation();
  let shown = await f.run();
  assert.equal(shown.code, 0);
  for (const line of [/Respostas faladas:\s+ativadas/, /Voz:\s+padrão/, /Velocidade da fala:\s+normal/, /Idioma:\s+Inglês/, /iniciar o programa do modelo antes \(desativado\), receber a resposta conforme chega \(ativado\), falar após a primeira frase \(ativado\)/, /aprendidas: Jev/]) assert.match(shown.text, line);

  assert.match((await f.run('mute')).text, /Respostas faladas desativadas/);
  assert.match((await f.run('use', 'af_heart')).text, /Heart · Inglês americano, voz feminina/);
  assert.match((await f.run('speed', '1.2')).text, /1\.2/);
  assert.deepEqual(f.profile(), {dailyDrivers: ['Inbox triage'], spokenReplies: false, voice: 'af_heart', voiceRate: 1.2}, 'the member\'s other preferences are untouched');

  assert.match((await f.run('teach', 'Zettelkasten', 'Acme Cloud')).text, /Zettelkasten, Acme Cloud/);
  assert.match((await f.run('forget', 'jev')).text, /A voz deixou de reconhecer: jev/);
  const words = JSON.parse(fs.readFileSync(path.join(f.at.runtime, 'voice-words.json'), 'utf8'));
  assert.deepEqual(words.words, ['Zettelkasten', 'Acme Cloud'], 'the voice service\'s list is rewritten at once: yours in, the forgotten one out');
  assert.match((await f.run('learn', 'off')).text, /reconhece apenas as palavras que você ensina/);

  assert.match((await f.run('fast', 'off')).text, /antes: desativado\. Receber a resposta conforme chega: desativado\. Falar após a primeira frase: desativado/);
  assert.match((await f.run('fast', '--early', 'on')).text, /antes: desativado\. Receber a resposta conforme chega: ativado\. Falar após a primeira frase: desativado/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.at.runtime, 'voice-speed.json'), 'utf8')), {earlyAnswer: true, streamSpeech: false, prestart: false});
  assert.match((await f.run('fast', '--prestart', 'on')).text, /antes: ativado\./);
  // "fast on" is the two that are on by default; the third stays as the member set it. "fast off" turns all off.
  assert.match((await f.run('fast', 'on')).text, /antes: ativado\. Receber a resposta conforme chega: ativado\. Falar após a primeira frase: ativado/);
  await f.run('fast', '--prestart', 'off');
  assert.match((await f.run('fast', 'on')).text, /antes: desativado\. Receber a resposta conforme chega: ativado/);
  await f.run('fast', '--prestart', 'on');
  assert.match((await f.run('fast', 'off')).text, /antes: desativado\. Receber a resposta conforme chega: desativado\. Falar após a primeira frase: desativado/);
  await f.run('fast', '--early', 'on');

  shown = await f.run();
  for (const line of [/Respostas faladas:\s+desativadas/, /Heart · Inglês americano, voz feminina/, /Velocidade da fala:\s+1\.2/, /antes \(desativado\), receber a resposta conforme chega \(ativado\), falar após a primeira frase \(desativado\)/, /aprendizado pelos títulos das notas desativado/, /ensinadas:\s+Zettelkasten, Acme Cloud/, /esquecidas: jev/]) assert.match(shown.text, line);

  assert.match((await f.run('unmute')).text, /Respostas faladas ativadas/);
  assert.match((await f.run('use', 'default')).text, /Voz padrão restaurada/);
  await f.run('speed', '1');
  assert.deepEqual(Object.keys(f.profile()).sort(), ['dailyDrivers', 'voiceWords', 'voiceWordsIgnore', 'voiceWordsLearn']);
});

test('a wrong command explains itself and changes nothing', async () => {
  const f = installation(), before = fs.readFileSync(path.join(f.vault, 'system/v2/profile.json'), 'utf8');
  for (const [words, message] of [[['speed', 'fast'], /entre 0\.8 e 1\.4/], [['speed', '3'], /entre 0\.8 e 1\.4/], [['use'], /voice use <nome>/], [['use', '../x'], /identificador de voz válido/], [['teach'], /voice teach/], [['teach', 'x'], /pelo menos duas letras/], [['learn', 'maybe'], /aceita on ou off/], [['fast'], /voice fast on\|off/], [['fast', 'sometimes'], /aceita on ou off/]])
    await assert.rejects(f.run(...words), message, words.join(' '));
  assert.equal(fs.readFileSync(path.join(f.vault, 'system/v2/profile.json'), 'utf8'), before);
  assert.equal(fs.existsSync(path.join(f.at.runtime, 'voice-speed.json')), false);
  const unknown = await f.run('louder');
  assert.equal(unknown.code, 1); assert.equal(unknown.text, VOICE_HELP);
  assert.match((await f.run('help')).text, /^Configurações de voz\n/);
  await assert.rejects(voiceCommand({words: [], at: f.at, vault: null}), /Ainda não há uma instalação/);
});

test('the command is listed in the launcher\'s help', async () => {
  const lines = [];
  await main(['help'], line => lines.push(line));
  assert.match(lines.join('\n'), /\n  voice\s+configurar a voz, a velocidade e as palavras reconhecidas/);
});
