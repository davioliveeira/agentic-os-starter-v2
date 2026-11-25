// Local voice: a private Python environment, the Kokoro voice files and a
// cached Whisper model, all inside .runtime/. Safe to re-run; finished parts are skipped.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {which} from './platform.mjs';
import {SPEECH_LANGUAGES} from '../../shared/speech-language.mjs';

const RELEASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0';
export const SPEECH_ASSETS = [{name: 'kokoro-v1.0.onnx', minBytes: 200e6}, {name: 'voices-v1.0.bin', minBytes: 10e6}];

export function parsePythonVersion(text) {
  const match = String(text || '').match(/Python (\d+)\.(\d+)\.(\d+)/);
  return match ? {major: +match[1], minor: +match[2], text: `${match[1]}.${match[2]}.${match[3]}`} : null;
}
// Voice: the speech libraries (kokoro-onnx 0.6.x: Python <3.14) support 3.10-3.13. Python.org and
// Homebrew default to newer releases, so the upper bound is checked, not assumed.
export const VOICE_PYTHON = {min: 10, max: 13};
export const pythonSupported = (version, range = VOICE_PYTHON) => !!version && version.major === 3 && version.minor >= range.min && version.minor <= range.max;

// Versioned interpreters first, preferring the 3.12 the setup guide installs, so a newer default
// `py -3` / `python3` never wins over a supported one that is also present.
const PREFERRED_MINORS = [12, 13, 11, 10];
export function pythonCandidates({env = process.env, platform = process.platform} = {}) {
  const versioned = PREFERRED_MINORS.map(minor => platform === 'win32' ? ['py', `-3.${minor}`] : [`python3.${minor}`]);
  return [env.AOS_V2_PYTHON && [env.AOS_V2_PYTHON], ...versioned, ...(platform === 'win32' ? [['py', '-3'], ['python']] : [['python3'], ['python']])].filter(Boolean);
}

// {command, prefix, version} for the first supported interpreter; null otherwise, with every
// working interpreter's version added to `seen`, so the caller can say what it found instead.
export function findPython({env = process.env, run = spawnSync, platform = process.platform, range = VOICE_PYTHON, seen = []} = {}) {
  for (const [command, ...prefix] of pythonCandidates({env, platform})) {
    const file = path.isAbsolute(command) ? command : which(command, {env, platform});
    // Windows ships a `python.exe` stub that only opens the Store; a real one answers --version.
    const result = file ? run(file, [...prefix, '--version'], {encoding: 'utf8', timeout: 10000, windowsHide: true}) : null;
    const version = result && result.status === 0 ? parsePythonVersion(result.stdout || result.stderr) : null;
    if (version && !seen.includes(version.text)) seen.push(version.text);
    if (pythonSupported(version, range)) return {command: file, prefix, version: version.text};
  }
  return null;
}

export function voicePythonMissing(seen = []) {
  const install = 'Instale o Python 3.12 com `winget install Python.Python.3.12` no Windows ou `brew install python@3.12` no Mac e rode o comando novamente. Se a instalação estiver em uma pasta personalizada, defina AOS_V2_PYTHON com o caminho absoluto do executável.';
  return seen.length
    ? `Versões do Python encontradas: ${seen.join(', ')}. As bibliotecas de voz exigem Python de 3.10 a 3.13. ${install}`
    : `Nenhuma versão do Python entre 3.10 e 3.13 foi encontrada. ${install}`;
}

// The version an existing environment's interpreter reports, or null when it does not answer.
export function venvVersion(python, {run = spawnSync, exists = fs.existsSync} = {}) {
  if (!exists(python)) return null;
  const result = run(python, ['--version'], {encoding: 'utf8', timeout: 10000, windowsHide: true});
  return result.status === 0 ? parsePythonVersion(result.stdout || result.stderr) : null;
}

// A voice environment built with an unsupported Python (a 3.14 install got an old, untested voice
// library) is set aside and rebuilt, but only when it is PROVEN that nothing uses it:
//   busy()      - a reason when this installation's monitor or voice port is still up, else null
//   inUse(dir)  - pids running from `dir`, or null when that cannot be read (unknown = in use)
// Result: 'not-needed' | 'no-python' | 'deferred' (both with .reason) | 'set-aside'.
// Nothing is moved before a supported interpreter is found; a failed rename (Windows locks a
// running interpreter's folder) also defers.
export const voiceRebuildMarker = at => path.join(at.runtime, 'voice-rebuild-pending.json');
export const VOICE_BUSY = 'O ambiente de voz precisa ser recriado com uma versão compatível do Python. Como o serviço pode estar em execução, rode `node aos.mjs stop` e depois `node aos.mjs setup --voice yes`.';
export async function setAsideUnsupportedVoice(at, {run = spawnSync, find = options => findPython({run, ...options}), busy, inUse, rename = fs.renameSync, remove = fs.rmSync, now = Date.now, log = console.log} = {}) {
  if (!fs.existsSync(at.speechPython)) return {state: 'not-needed'};
  const current = venvVersion(at.speechPython, {run});
  if (pythonSupported(current)) return {state: 'not-needed'};
  const seen = [];
  if (!find({seen})) return {state: 'no-python', reason: voicePythonMissing(seen)};
  if (await busy()) return {state: 'deferred', reason: VOICE_BUSY};
  const users = inUse(at.venv);
  if (users === null || users.length) return {state: 'deferred', reason: VOICE_BUSY};
  const aside = `${at.venv}.old-${now()}`;
  // Written before the move and cleared only after the replacement installed: a failed rebuild is
  // retried by the next ordinary setup or update instead of passing for an installed voice.
  fs.writeFileSync(voiceRebuildMarker(at), JSON.stringify({since: new Date(now()).toISOString()}));
  try { rename(at.venv, aside); } catch { fs.rmSync(voiceRebuildMarker(at), {force: true}); return {state: 'deferred', reason: VOICE_BUSY}; }
  log(`  o ambiente de voz usava Python ${current?.text || '(sem resposta)'}. Ele foi separado para que um novo seja criado`);
  // Kept until the replacement installed successfully (the caller then calls removeSetAsideVoice).
  return {state: 'set-aside', aside};
}

// Environments set aside earlier are removed once nothing runs from them (unknown = keep).
export function removeSetAsideVoice(at, {inUse, remove = fs.rmSync} = {}) {
  const dir = path.dirname(at.venv), base = path.basename(at.venv) + '.old-';
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!name.startsWith(base)) continue;
    const full = path.join(dir, name), users = inUse(full);
    if (users === null || users.length) continue;
    try { remove(full, {recursive: true, force: true}); } catch { /* try again next time */ }
  }
}

async function download(url, target, minBytes, log) {
  if (fs.existsSync(target) && fs.statSync(target).size >= minBytes) { log(`  ${path.basename(target)} já está disponível`); return; }
  log(`  baixando ${path.basename(target)}…`);
  const response = await fetch(url, {redirect: 'follow', signal: AbortSignal.timeout(30 * 60 * 1000)});
  if (!response.ok || !response.body) throw new Error(`Falha ao baixar ${path.basename(target)} (HTTP ${response.status}).`);
  const part = `${target}.part`;
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(part));
  if (fs.statSync(part).size < minBytes) { fs.rmSync(part, {force: true}); throw new Error(`O download de ${path.basename(target)} ficou incompleto. Rode o comando outra vez.`); }
  fs.renameSync(part, target);
}

export async function setupSpeech(at, {log = console.log, run = spawnSync, find = options => findPython({run, ...options}), language = 'en'} = {}) {
  const step = (label, command, args, timeout) => {
    log(`  ${label}`);
    const result = run(command, args, {encoding: 'utf8', timeout, windowsHide: true, cwd: at.root, maxBuffer: 32 * 1024 * 1024});
    if (result.status !== 0) throw new Error(`Falha na etapa de voz (${label}): ${String(result.stderr || result.stdout || result.error?.message || '').trim().split(/\r?\n/).slice(-6).join(' | ').slice(0, 900)}`);
  };
  fs.mkdirSync(at.runtime, {recursive: true});
  if (!fs.existsSync(at.speechPython)) {
    const seen = [], python = find({seen});
    if (!python) throw new Error(voicePythonMissing(seen));
    step(`criando o ambiente de voz com Python ${python.version}`, python.command, [...python.prefix, '-m', 'venv', at.venv], 5 * 60 * 1000);
  } else if (!pythonSupported(venvVersion(at.speechPython, {run}))) {
    // Reached only when the caller did not set the old environment aside (it may be in use).
    throw new Error('O ambiente de voz usa uma versão incompatível do Python. Rode `node aos.mjs stop` e depois `node aos.mjs setup --voice yes` para recriá-lo.');
  }
  // Exact pins for our direct packages, bounds for the heavy ones; prefer published wheels over building.
  step('instalando os pacotes de voz. A primeira instalação pode demorar alguns minutos', at.speechPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '--prefer-binary', '-r', path.join(at.root, 'runner', 'speech-requirements.txt')], 30 * 60 * 1000);
  fs.mkdirSync(at.speechAssets, {recursive: true});
  for (const asset of SPEECH_ASSETS) await download(`${RELEASE}/${asset.name}`, path.join(at.speechAssets, asset.name), asset.minBytes, log);
  // The service loads Whisper with local_files_only, so the model is fetched once here.
  // English is always fetched: it is what the service falls back to. Another language adds its own model.
  const models = [...new Set(['small.en', SPEECH_LANGUAGES[language]?.whisper || 'small.en'])];
  for (const model of models) {
    const fetch = () => step(model === 'small.en' ? 'baixando o modelo de reconhecimento de fala (cerca de 460 MB na primeira vez)' : `baixando o modelo de reconhecimento de fala para ${SPEECH_LANGUAGES[language].name} (cerca de 460 MB na primeira vez)`, at.speechPython,
      ['-c', `from faster_whisper import WhisperModel; WhisperModel('${model}', device='cpu', compute_type='int8'); print('ready')`], 40 * 60 * 1000);
    if (model === 'small.en') { fetch(); continue; }
    // The other language is an extra. Without its model voice still works, in English, and the doctor says so.
    try { fetch(); }
    catch (error) { log(`  não foi possível baixar o modelo de fala para ${SPEECH_LANGUAGES[language].name} (${String(error.message || error).slice(0, 200)}). O serviço será iniciado em inglês até que \`node aos.mjs setup --voice yes\` seja executado com sucesso.`); }
  }
  return true;
}
