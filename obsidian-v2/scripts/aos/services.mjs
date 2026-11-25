// Cross-platform start / stop / status. Same rules as start-recovery.ps1 and
// services.ps1: nothing is written or stopped until ownership is proven, and
// an intentional stop pauses recovery so nothing restarts behind the user.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {projectRoot} from '../../runner/runtime.mjs';
import {listener, processInfo, samePath, tryJson, fetchJson, sleep} from './platform.mjs';
import {autostartOwner, kickAutostart, refreshAutostartPolicy, loginItemNeedsSpeedFix, enableAutostart} from './autostart.mjs';
import {speechLanguage, speechArguments} from '../../shared/speech-language.mjs';

export const PORTS = {jarvis: 3217, preview: 3218, bridge: 3219, speech: 3220, supervisor: 3221};
const SERVICE_LABELS = new Map([['bridge', 'Ponte'], ['jarvis', 'Jarvis'], ['speech', 'Voz local'], ['preview', 'Prévia']]);
export const serviceLabel = id => SERVICE_LABELS.get(id) ?? id;
const local = port => `http://127.0.0.1:${port}`;
const OPEN_STATES = new Set(['working', 'ready', 'editing', 'starting', 'needs input']);

// On Windows a venv's Scripts\python.exe is only a launcher: it starts the real interpreter as its own child.
// Started the way the monitor starts a service (detached, hidden, no console of its own), the launcher has no
// console to pass on, so Windows opened a new, visible one for the interpreter. Closing that window stopped
// voice until the monitor restarted it (starter issue #17). pythonw.exe never opens a console. Setup keeps using
// python.exe to install packages and fetch models, where output matters.
const serverPython = (venv, platform) => platform === 'win32' ? path.join(venv, 'Scripts', 'pythonw.exe') : path.join(venv, 'bin', 'python');
export function layout(root = projectRoot) {
  const runtime = path.join(root, '.runtime'), jarvis = path.resolve(root, '..', 'jarvis-v2');
  const venv = path.join(runtime, 'speech-venv');
  return {root, runtime, jarvis, config: path.join(runtime, 'service-recovery.json'), pause: path.join(runtime, 'services-paused.json'),
    recoveryState: path.join(runtime, 'service-recovery-state.json'), vaultFile: path.join(runtime, 'vault.json'), auth: path.join(runtime, 'bridge-auth.json'),
    supervisor: path.join(root, 'runner', 'service-supervisor.mjs'), bridge: path.join(root, 'runner', 'bridge.mjs'), preview: path.join(root, 'preview', 'server.mjs'),
    next: path.join(jarvis, 'node_modules', 'next', 'dist', 'bin', 'next'), buildId: path.join(jarvis, '.next', 'BUILD_ID'),
    speechScript: path.join(root, 'runner', 'speech.py'), speechAssets: path.join(runtime, 'speech-assets'),
    speechPython: process.platform === 'win32' ? path.join(venv, 'Scripts', 'python.exe') : path.join(venv, 'bin', 'python'),
    speechServerPython: serverPython(venv, process.platform), venv};
}

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export const configuredVaultPath = at => fs.existsSync(at.vaultFile) ? readJson(at.vaultFile).vault : null;
export const speechInstalled = at => fs.existsSync(at.speechPython) && ['kokoro-v1.0.onnx', 'voices-v1.0.bin'].every(name => fs.existsSync(path.join(at.speechAssets, name)));

// Pure: the list of services the monitor should keep alive.
export function desiredServices(at, {node = process.execPath, speechUrl = null, vault = null, jarvisBuilt = false, ownSpeech = false, language = 'en', exists = fs.existsSync} = {}) {
  // A venv without pythonw.exe (not made by the standard venv module) keeps python.exe and its console.
  const speechCommand = at.speechServerPython && exists(at.speechServerPython) ? at.speechServerPython : at.speechPython;
  const env = {...(speechUrl ? {AOS_V2_SPEECH_URL: speechUrl} : {}), ...(vault ? {AOS_V2_VAULT: vault} : {})};
  const services = [{id: 'bridge', port: PORTS.bridge, command: node, args: [at.bridge], cwd: at.root, env}];
  if (jarvisBuilt) services.push({id: 'jarvis', port: PORTS.jarvis, command: node, args: [at.next, 'start', '--hostname', '127.0.0.1', '--port', String(PORTS.jarvis)], cwd: at.jarvis});
  if (ownSpeech) services.push({id: 'speech', port: PORTS.speech, command: speechCommand, args: ['-u', at.speechScript, '--assets', at.speechAssets, ...speechArguments(language)], cwd: at.root});
  return services;
}

// Pure: a normal start keeps optional services an earlier start configured.
export function mergePrior(services, prior, runtimeDir) {
  if (!prior) return services;
  if (!samePath(prior.runtimeDir, runtimeDir)) throw new Error('A configuração de recuperação pertence a outra instalação.');
  const ids = new Set(services.map(service => service.id));
  return [...services, ...(prior.services || []).filter(service => ['jarvis', 'speech'].includes(service.id) && !ids.has(service.id))];
}

async function healthySpeech(get = tryJson) {
  for (const port of [PORTS.speech, 3108]) {
    const health = await get(`${local(port)}/health`, {timeoutMs: 2000});
    if (health?.ok && health?.stt?.ok) return local(port);
  }
  return null;
}

// The one decision about voice, shared by `start` and `setup` so they cannot disagree:
//   shared - a healthy speech service that is not ours already answers on this computer; the
//            bridge uses it, and this installation neither starts nor needs a copy of its own
//   own    - this installation runs its own service on 3220 (only when its files are installed)
//   healthy - the chosen service answers right now. An address from AOS_V2_SPEECH_URL is honoured
//            without asking (as before), so it can be shared and NOT healthy: a stale setting.
export async function speechPlan(at, {get = tryJson, env = process.env, installed = speechInstalled} = {}) {
  const answers = async url => { const health = await get(`${url}/health`, {timeoutMs: 2000}); return !!(health?.ok && health?.stt?.ok); };
  const configured = env.AOS_V2_SPEECH_URL || null, found = configured || await healthySpeech(get);
  const shared = !!found && found !== local(PORTS.speech);
  const own = !shared && installed(at);
  return {url: found || (own ? local(PORTS.speech) : null), own, shared, healthy: configured ? await answers(configured) : !!found};
}

// Where another running copy of this system lives, from what its monitor reports about itself
// (<folder>/obsidian-v2/.runtime). Empty when the thing on the port is not this system at all.
export const otherInstallation = monitor => monitor?.kind === 'agentic-os-service-supervisor' && typeof monitor.runtimeDir === 'string' && monitor.runtimeDir
  ? ` A outra cópia roda em "${path.resolve(monitor.runtimeDir, '..', '..')}". Continue usando essa cópia ou rode \`node aos.mjs stop\` na pasta dela antes de continuar.` : '';

const supervisorStatus = (timeoutMs = 2000) => tryJson(`${local(PORTS.supervisor)}/status`, {timeoutMs});
async function waitForSupervisorExit() {
  for (let attempt = 0; attempt < 20; attempt++) { await sleep(500); if (!await supervisorStatus(1000)) return true; }
  return false;
}
function atomicWrite(file, text) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, text); fs.renameSync(temp, file);
}

// Another installation's login item normally blocks a start. The one deliberate exception is a
// side-by-side trial while that other installation is stopped: AOS_V2_TRIAL_BESIDE_OTHER_INSTALL=1.
// The monitor is then started directly and the foreign login item is never touched.
export const loginItemBlocks = (owner, env = process.env) => owner === 'other' && env.AOS_V2_TRIAL_BESIDE_OTHER_INSTALL !== '1';

export async function start({root = projectRoot, resetRecovery = false, log = console.log} = {}) {
  const at = layout(root);
  let supervisor = await supervisorStatus();
  if (supervisor && (supervisor.kind !== 'agentic-os-service-supervisor' || !samePath(supervisor.runtimeDir, at.runtime))) throw new Error(`A porta 3221 pertence a outra instalação. Esta cópia não foi alterada.${otherInstallation(supervisor)}`);
  if (!supervisor && listener(PORTS.supervisor)) throw new Error('Um serviço desconhecido está usando a porta 3221. Esta cópia não foi alterada.');
  fs.mkdirSync(at.runtime, {recursive: true});
  if (resetRecovery && supervisor) atomicWrite(at.pause, '{"reason":"explicit recovery reset"}');
  // A paused monitor may still be exiting. Do not clear its marker until it leaves.
  if (supervisor && fs.existsSync(at.pause)) {
    if (!await waitForSupervisorExit()) throw new Error('O monitor de recuperação ainda está pausando. Tente novamente em instantes.');
    supervisor = null;
  }
  if (resetRecovery) fs.rmSync(at.recoveryState, {force: true});
  const voice = await speechPlan(at);
  let services = desiredServices(at, {speechUrl: voice.url, vault: configuredVaultPath(at), jarvisBuilt: fs.existsSync(at.buildId), ownSpeech: voice.own, language: speechLanguage(configuredVaultPath(at)).code});
  if (supervisor && services.some(service => !supervisor.services.some(known => known.id === service.id))) {
    // Reconfigure the monitor alone when an existing installation adds a service.
    atomicWrite(at.pause, '{"reason":"recovery services changed"}');
    if (!await waitForSupervisorExit()) throw new Error('O monitor de recuperação ainda está sendo reconfigurado. Tente novamente em instantes.');
    supervisor = null;
  }
  // An old Mac login item (background priority) is replaced below. Its monitor leaves first, through the
  // pause marker, exactly as `autostart on` hands over.
  // Ours on disk AND as launchd has it loaded: a job that is foreign, or cannot be read, is never paused or replaced.
  const slowLoginItem = loginItemNeedsSpeedFix(at) && autostartOwner(at) === 'ours';
  if (slowLoginItem && supervisor) {
    atomicWrite(at.pause, '{"reason":"login item change"}');
    if (!await waitForSupervisorExit()) throw new Error('O monitor de recuperação ainda está pausando. Tente novamente em instantes.');
    supervisor = null;
  }
  if (!supervisor) {
    services = mergePrior(services, fs.existsSync(at.config) ? readJson(at.config) : null, at.runtime);
    atomicWrite(at.config, JSON.stringify({runtimeDir: at.runtime, lockPort: PORTS.supervisor, services}, null, 1));
  }
  fs.rmSync(at.pause, {force: true});
  // Only now, with the new configuration written and no marker: the job launchd loads during the swap
  // starts at once, reads that configuration and stays launchd's own.
  if (slowLoginItem) replaceSlowLoginItem(at, {log, clearMarker: () => fs.rmSync(at.pause, {force: true})});
  // Before the "already running" return, so installations that are up right now are repaired too.
  refreshLoginItem(at, {log});
  if (supervisor) { log('O monitor de recuperação já está em execução. Os serviços e as conversas foram preservados.'); return {started: false}; }
  return launchMonitor(at, {log});
}

// Windows login tasks registered before the execution-policy fix are re-registered (ours only).
// A failure here never blocks starting: the direct-start fallback below still brings services up.
export function refreshLoginItem(at, {log = console.log, refresh = refreshAutostartPolicy} = {}) {
  try { if (refresh(at)) log('-> Inicialização automática: a tarefa do Windows foi atualizada para funcionar quando a política padrão bloqueia scripts.'); }
  catch (error) { log(`-> Inicialização automática: não foi possível atualizar a tarefa do Windows (${String(error.message || error).slice(0, 200)}). Os serviços serão iniciados agora. Rode \`node aos.mjs autostart on\` mais tarde.`); }
}

// macOS login items written before the speed fix run the monitor, and every service it starts, at
// background priority (speech about eight times slower). Ours only; the caller has already let the old
// monitor leave. Services and conversations keep running throughout. A failure never blocks the start
// that follows: its direct-start fallback still brings the monitor up.
// clearMarker runs after the swap: a monitor from before the restart fix writes the pause marker when
// launchd unloads it, and that marker would otherwise stop the new one at once.
export function replaceSlowLoginItem(at, {log = console.log, enable = enableAutostart, clearMarker = () => {}} = {}) {
  try {
    enable(at);
    log('-> Inicialização automática: o item de início de sessão do Mac foi atualizado para restaurar a velocidade normal do sistema. Para aplicar a correção aos serviços em execução, rode `node aos.mjs stop` e `node aos.mjs start` ou reinicie o Mac.');
    return true;
  } catch (error) {
    log(`-> Inicialização automática: não foi possível atualizar o item de início de sessão do Mac (${String(error.message || error).slice(0, 200)}). Os serviços serão iniciados agora. Rode \`node aos.mjs autostart on\` mais tarde.`);
    return false;
  } finally { clearMarker(); }
}

// A login item owns the monitor when one is installed, so it survives this shell. When the kicked
// login item does not bring the monitor up (a task Windows refused to run, a stale LaunchAgent), the
// monitor is started directly. A late login-item start then finds our monitor holding 3221 and exits
// normally (code 0), so launchd does not keep retrying it; a stranger on the port still makes it exit
// with an error.
export async function launchMonitor(at, {log = console.log, owner = autostartOwner(at), kick = kickAutostart, spawnMonitor, status = supervisorStatus, wait = sleep, kickGraceAttempts = 12, attempts = 24} = {}) {
  if (loginItemBlocks(owner)) throw new Error('Outra instalação controla a inicialização automática. Rode `node aos.mjs autostart off` na pasta dela antes de iniciar esta cópia. Nenhum serviço foi iniciado.');
  spawnMonitor ||= () => spawn(process.execPath, [at.supervisor, '--config', at.config], {cwd: at.root, detached: true, windowsHide: true, stdio: 'ignore'}).unref();
  let direct = !(owner === 'ours' && kick(at));
  if (direct) spawnMonitor();
  for (let attempt = 0; attempt < attempts; attempt++) {
    await wait(500);
    const ready = await status(1000);
    if (ready && samePath(ready.runtimeDir, at.runtime)) { log('Monitor de recuperação dos serviços ativo em 127.0.0.1:3221.'); return {started: true}; }
    if (!direct && attempt + 1 >= kickGraceAttempts) {
      log('-> O item de início de sessão não iniciou o monitor de recuperação. Iniciando diretamente.');
      direct = true; spawnMonitor();
    }
  }
  throw new Error('O monitor de recuperação não ficou disponível. Confira .runtime/service-supervisor.jsonl.');
}

export async function waitForServices(ids, {timeoutMs = 120000} = {}) {
  const deadline = Date.now() + timeoutMs;
  let pending = ids;
  while (Date.now() < deadline) {
    const status = await supervisorStatus();
    pending = ids.filter(id => status?.services?.find(service => service.id === id)?.phase !== 'online');
    if (status && !pending.length) return [];
    await sleep(1500);
  }
  return pending;
}

export async function status({root = projectRoot} = {}) {
  void layout(root);
  return {bridge: await tryJson(`${local(PORTS.bridge)}/services`, {timeoutMs: 5000}), supervisor: await supervisorStatus()};
}

const SERVICE_PHASES = new Map([
  ['online', 'em execução'], ['starting', 'iniciando'], ['checking', 'verificando'],
  ['waiting_for_listener', 'aguardando resposta'], ['backoff', 'aguardando nova tentativa'], ['blocked', 'recuperação bloqueada'],
]);
const TASK_STATES = new Map([
  ['starting', 'iniciando'], ['working', 'em andamento'], ['ready', 'pronta'], ['editing', 'editando'],
  ['needs input', 'aguardando sua ação'], ['stopping', 'encerrando'], ['stopped', 'encerrada'], ['error', 'falhou'],
]);

export function formatStatus({bridge, supervisor}) {
  const monitor = supervisor ? supervisor.paused ? 'pausado' : 'em execução' : 'sem resposta';
  const services = supervisor?.services ?? [];
  const lines = [`Monitor de recuperação: ${monitor}`];
  for (const {id, phase, port} of services) {
    lines.push(`${serviceLabel(id)} (porta ${port}): ${SERVICE_PHASES.get(phase) ?? 'estado desconhecido'}`);
  }
  if (!services.some(service => service.id === 'bridge')) lines.push(`Ponte: ${bridge?.bridge?.online ? 'em execução' : 'sem resposta'}`);
  if (bridge?.speech?.shared) {
    const health = bridge.speech.health;
    lines.push(`Voz compartilhada: ${health?.ok && health.stt?.ok ? 'em execução' : 'indisponível'}`);
  }
  const tasks = bridge?.tasks?.filter(task => OPEN_STATES.has(task.state) || task.state === 'stopping');
  if (tasks?.length) {
    lines.push('', 'Tarefas abertas');
    for (const task of tasks) lines.push(`- ${task.title || task.id} (${TASK_STATES.get(task.state)})`);
  } else if (tasks) lines.push('Nenhuma tarefa aberta.');
  return lines.join('\n');
}

// A service proves itself over its own port; nothing is inferred from a command line.
// The bridge must refuse a request without a token and accept the token only this installation
// holds. The HUD and the speech service report their process id and location, and that id must be
// the process the operating system shows listening on the port, so a program can only ever vouch
// for itself: lying here gets nobody else stopped.
const NOBODY = '00000000-0000-4000-8000-000000000000';
export async function bridgeIsOurs(at, {post = fetchJson} = {}) {
  let token; try { token = readJson(at.auth).token; } catch { return false; }
  if (!/^[0-9a-f]{64}$/.test(token || '')) return false;
  const ask = headers => post(`${local(PORTS.bridge)}/work/stop`, {method: 'POST', headers, body: {id: NOBODY, ifIdle: true}, timeoutMs: 4000});
  try {
    const anonymous = await ask({}), known = await ask({'X-V2-Token': token});
    return anonymous.status === 401 && known.status !== 401 && known.status < 500;
  } catch { return false; }
}
export async function hudIsOurs(at, {get = tryJson, find = listener} = {}) {
  const info = find(PORTS.jarvis), service = await get(`${local(PORTS.jarvis)}/api/service`, {timeoutMs: 5000});
  return !!info && !info.ambiguous && service?.kind === 'jarvis-v2' && service.pid === info.pid && samePath(service.root, at.jarvis) ? info : null;
}
export async function speechIsOurs(at, {get = tryJson, find = listener} = {}) {
  const info = find(PORTS.speech), service = (await get(`${local(PORTS.speech)}/health`, {timeoutMs: 5000}))?.service;
  return !!info && !info.ambiguous && service?.kind === 'aos-v2-speech' && service.pid === info.pid && samePath(service.script, at.speechScript) ? info : null;
}

export async function stop({root = projectRoot, log = console.log, find = listener, inspect = processInfo, kill = pid => process.kill(pid), get = tryJson, post = fetchJson} = {}) {
  const at = layout(root);
  const vault = configuredVaultPath(at);
  if (!vault) throw new Error('Esta instalação está sem cofre configurado. Nenhum serviço foi interrompido.');
  const state = await get(`${local(PORTS.bridge)}/state`);
  // Fail closed before stopping any service: no unsent CLI drafts or active agents discarded.
  if (!state) throw new Error('A ponte está indisponível e não foi possível conferir as tarefas. Nenhum serviço foi interrompido.');
  if (!samePath(state.vault, vault)) throw new Error('A ponte pertence a outro cofre. Nenhum serviço foi interrompido.');
  if (!await bridgeIsOurs(at, {post})) throw new Error('A ponte na porta 3219 recusou a credencial desta instalação. Nenhum serviço foi interrompido.');
  const work = await get(`${local(PORTS.bridge)}/work`);
  if (!work || (work.tasks || []).some(task => task.pid || OPEN_STATES.has(task.state))) throw new Error('Encerre as tarefas ativas em Terminais. Nenhum serviço foi interrompido.');
  const targets = [];
  if (find(PORTS.jarvis)) {
    const hud = await hudIsOurs(at, {get, find});
    if (!hud) throw new Error('Um processo desconhecido está usando a porta 3217. Nenhum serviço foi interrompido.');
    const web = await get(`${local(PORTS.jarvis)}/api/state`, {timeoutMs: 5000});
    if (!web || !samePath(web.vault_root, state.vault)) throw new Error('O Jarvis pertence a outro cofre. Nenhum serviço foi interrompido.');
    targets.push({name: 'jarvis', pid: hud.pid, startedAt: hud.startedAt});
  }
  // Speech may be shared with another installation: only our own is stopped, anything else is left running.
  const speech = find(PORTS.speech) ? await speechIsOurs(at, {get, find}) : null;
  if (speech) targets.push({name: 'speech', pid: speech.pid, startedAt: speech.startedAt});
  const token = readJson(at.auth).token;
  const shutdown = await post(`${local(PORTS.bridge)}/shutdown`, {method: 'POST', headers: {'X-V2-Token': token}, body: {}, timeoutMs: 5000});
  if (!shutdown.ok) throw new Error(shutdown.data?.error || 'A ponte recusou a solicitação. Nenhum serviço foi interrompido.');
  for (const target of targets) {
    // Process ids are reused: stop only the exact process verified above.
    const current = inspect(target.pid);
    if (current && current.startedAt === target.startedAt) { try { kill(target.pid); log(`Serviço encerrado: ${serviceLabel(target.name)}.`); } catch { log(`Não foi possível encerrar ${serviceLabel(target.name)} (PID ${target.pid}).`); } }
  }
  log('Os serviços ociosos foram encerrados e a recuperação automática foi pausada. As conversas salvas e os rascunhos foram preservados. Rode `node aos.mjs start` para iniciar de novo.');
  return {stopped: ['bridge', ...targets.map(target => target.name)]};
}
