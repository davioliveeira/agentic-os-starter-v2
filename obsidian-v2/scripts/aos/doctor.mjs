// The member's test. Every line is PASS, FAIL, WAIT (needs a click from the
// user) or SKIP, and every FAIL carries the one thing to do about it.
// Two promises to the reader: a check never disappears (a check that cannot run
// prints SKIP with the reason), and the same failure twice in a row stops
// saying "try again".
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {projectRoot} from '../../runner/runtime.mjs';
import {tryJson, probeJson, fetchJson, request, run, sleep} from './platform.mjs';
import {layout, PORTS, configuredVaultPath, speechInstalled} from './services.mjs';
import {pluginInstalled, pluginEnabled} from './vault.mjs';
import {hasJevKey} from './jev-key.mjs';
import {liveAuthorization, readLiveKey} from '../../runner/live/key.mjs';
import {checkLiveKey, LIVE_MODEL} from '../../runner/live/transport.mjs';
import {terminalSupport, VERIFIED_TERMINAL_VERSIONS, JARVIS_URL} from '../../shared/terminal-support.mjs';
import {recordedTerminalPython} from '../../runner/terminal-python-record.mjs';
import {terminalPythonWorks} from './terminal-python.mjs';
import {readStoredSelection} from './provider.mjs';
import {setupStatus} from './setup-stamp.mjs';
import {SPEECH_LANGUAGES, SPEECH_LANGUAGE_CODES, speechLanguage, speechCheck} from '../../shared/speech-language.mjs';

const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
const SUPERVISOR_LOG = 'obsidian-v2/.runtime/service-supervisor.jsonl';
const SHOW_SOMEONE = `Mostre esta mensagem e as últimas 30 linhas de ${SUPERVISOR_LOG} ao seu agente de código ou publique as duas na comunidade.`;
const SETUP_CHECK = 'Instalação concluída para esta versão';
const VOICE_CHECKS = ['Serviço de voz operacional', 'Síntese de voz', 'Transcrição do áudio de teste'];
const HOTKEY_CHECK = 'Atalho global de voz';
const STILL_STARTING = new Set(['checking', 'starting', 'waiting_for_listener', 'backoff']);
const LIVE_CHECK = 'Voz ao vivo (chave da OpenAI)';
const CONNECTOR_CHECK = 'Conectores do Claude em fluxos de segundo plano';
const PROVIDER_CHECK = 'Provedor dos botões e da voz';
const PROVIDER_NAME = {claude: 'Claude Code', codex: 'Codex'};
const TERMINAL_CHECK ='Plugin Terminal (conversas no Obsidian)';
const TERMINAL_PYTHON_CHECK = 'Auxiliar Python para conversas no Obsidian';

// Only matters once the Terminal plugin is in use; the record exists only after setup verified it.
export function terminalPythonCheck(runtime, {terminal, recorded = recordedTerminalPython, works = python => terminalPythonWorks(python)} = {}) {
  if (terminal.status !== 'PASS' && terminal.status !== 'FAIL') return {status: 'SKIP', detail: 'necessário somente quando o plugin Terminal estiver instalado e ativo'};
  const fix = `Rode \`node aos.mjs setup\` novamente com Python 3.12. No Windows, use \`winget install Python.Python.3.12\`. No Mac, use \`xcode-select --install\`. Os mesmos botões estão disponíveis no Jarvis em ${JARVIS_URL}.`;
  const python = recorded(runtime);
  if (!python) return {status: 'FAIL', detail: 'preparação pendente', fix};
  // The record alone proves nothing today: the base Python may be gone or a module broken since.
  return works(python) ? {status: 'PASS', detail: 'preparado na instalação e carregado'} : {status: 'FAIL', detail: 'preparado na instalação. Falha ao executar ou carregar os módulos', fix};
}

// The optional Terminal community plugin, from the vault's own files. Never throws: whatever
// is wrong here, Jarvis still runs every conversation, so it can never be a core failure.
export function terminalPluginCheck(vault) {
  const reinstall = `Reinstale o plugin Terminal, de polyipseity, em Configurações > Plugins da comunidade ou use os mesmos botões no Jarvis em ${JARVIS_URL}.`;
  if (!vault || !fs.existsSync(vault)) return {status: 'SKIP', detail: 'nenhum cofre configurado'};
  const manifestFile = path.join(vault, '.obsidian', 'plugins', 'terminal', 'manifest.json');
  if (!fs.existsSync(manifestFile)) return {status: 'SKIP', detail: 'instalação opcional. As conversas e as skills pessoais já funcionam no Jarvis. Para usá-las dentro do Obsidian, instale o Terminal, de polyipseity, em Configurações > Plugins da comunidade.'};
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { return {status: 'FAIL', detail: 'falha ao ler o arquivo manifest.json', fix: reinstall}; }
  if (manifest?.id !== 'terminal') return {status: 'SKIP', detail: 'outro plugin ocupa a pasta .obsidian/plugins/terminal'};
  let enabled = false;
  try { const list = JSON.parse(fs.readFileSync(path.join(vault, '.obsidian', 'community-plugins.json'), 'utf8')); enabled = Array.isArray(list) && list.includes('terminal'); }
  catch (error) { if (error.code !== 'ENOENT') return {status: 'SKIP', detail: 'falha ao ler a lista de plugins ativos (.obsidian/community-plugins.json)'}; }
  const support = terminalSupport(manifest.version);
  if (!enabled) return {status: 'SKIP', detail: `${support.version || 'instalado'} e desativado. Para conversar dentro do Obsidian, ative o plugin em Configurações > Plugins da comunidade.`};
  if (support.status === 'verified') return {status: 'PASS', detail: support.version};
  if (support.status === 'untested') return {status: 'PASS', detail: `${support.version}, mais recente que as versões testadas (${VERIFIED_TERMINAL_VERSIONS.join(' e ')}). Deve funcionar`};
  if (support.status === 'missing') return {status: 'FAIL', detail: 'a versão está ausente no manifesto', fix: reinstall};
  return {status: 'FAIL', detail: `versão ${support.version}`, fix: support.message};
}

// Why the voice line failed, from what the bridge, the monitor and the disk say. Pure.
//   probe     - the answer of the bridge's /voice/health: {status, data, error}
//   speechUrl - the speech service the bridge uses; own - whether that is this installation's (3220)
export function voiceProblem({probe, speechUrl, own, installed, phase, waitedSeconds = 0}) {
  if (!probe.data) return {detail: `a ponte ficou sem resposta no teste de voz (${probe.error || `HTTP ${probe.status}`})`,
    fix: 'Rode `node aos.mjs status`. Se a ponte estiver offline, rode `node aos.mjs start`. Se estiver online, investigue a comunicação com o diagnóstico.'};
  if (!own) return {detail: `o serviço de voz compartilhado em ${speechUrl} ficou sem resposta`,
    fix: 'Reinicie o programa que fornece a voz compartilhada. Para instalar a voz própria, remova AOS_V2_SPEECH_URL se você a configurou, pare o serviço compartilhado e rode `node aos.mjs stop`, seguido de `node aos.mjs setup --voice yes`.'};
  if (!installed) return {detail: 'instalação pendente', fix: 'Rode `node aos.mjs setup --voice yes`.'};
  if (!phase) return {detail: 'instalado, aguardando início pelo monitor de recuperação', fix: 'Rode `node aos.mjs stop`, seguido de `node aos.mjs start`, para recriar a lista de serviços.'};
  if (phase === 'blocked') return {detail: 'o serviço caiu repetidamente e o monitor suspendeu as tentativas de reinício',
    fix: `Leia as últimas linhas que mencionam "speech" em ${SUPERVISOR_LOG}. Repare os arquivos com \`node aos.mjs setup --voice yes\` e rode \`node aos.mjs start --reset-recovery\`.`};
  if (STILL_STARTING.has(phase)) return {detail: `serviço indisponível após ${waitedSeconds} segundos de espera`,
    fix: {first: `O monitor informa o estado "${phase}". A primeira inicialização pode levar mais um minuto em disco lento. Rode \`node aos.mjs doctor\` mais uma vez. Veja o andamento em ${SUPERVISOR_LOG}.`,
      repeated: `O serviço não iniciou nas tentativas anteriores. Repare a voz com \`node aos.mjs setup --voice yes\` e rode \`node aos.mjs start --reset-recovery\`.`}};
  return {detail: 'o serviço está em execução e ainda não está pronto', fix: `Rode \`node aos.mjs stop\` e \`node aos.mjs start\`. Se a falha persistir, repare os arquivos com \`node aos.mjs setup --voice yes\`.`};
}

// The speech health response can report microphone or helper failures in hotkey.error.
// Only known conflict codes/messages justify telling the member to change keys.
export function hotkeyProblem({hotkey, capture, platform}) {
  const error = String(capture?.error || hotkey?.error || '').slice(0, 300);
  const detail = error || (capture?.available === false ? 'suporte ao microfone indisponível' : 'falha ao registrar o atalho no serviço de voz');
  const inspect = `Leia as linhas que mencionam "speech" em ${SUPERVISOR_LOG}. ${SHOW_SOMEONE}`;
  if (/^Microphone dependency unavailable:/i.test(error) || capture?.available === false) return {detail,
    fix: {first: 'Ao terminar as tarefas ativas, rode `node aos.mjs stop` seguido de `node aos.mjs setup --voice yes` para reparar o acesso ao microfone.',
      repeated: `O acesso ao microfone continua indisponível após a orientação de reparo. ${inspect}`}};
  if (capture?.error || /^Capture failed:/i.test(error)) return {detail,
    fix: `Confira a entrada de áudio e a permissão de microfone do processo Python do serviço de voz em ${platform === 'darwin' ? 'Ajustes do Sistema > Privacidade e Segurança > Microfone' : 'Configurações do Windows > Privacidade e segurança > Microfone, incluindo aplicativos da área de trabalho'}. Depois, teste o atalho novamente. ${inspect}`};
  const launchSetting = "Altere a configuração de inicialização do serviço. Variáveis definidas apenas no terminal não persistem ao entrar no sistema.";
  if (/^(Use modifiers plus one letter or digit|A hotkey needs a letter or digit|Mac hotkeys (require Control or Command|support ANSI physical letter and digit keys))/i.test(error)) return {detail,
    fix: `Corrija VOICE_HOTKEY ou remova a opção personalizada para restaurar ctrl+alt+j. Use modificadores e uma letra ou um dígito ASCII. No Mac, inclua ctrl (Control) ou win (Command). ${launchSetting} Reinicie o Agentic OS depois de concluir as tarefas ativas.`};
  // ERROR_HOTKEY_ALREADY_REGISTERED / eventHotKeyExistsErr. Other OS error
  // codes use the same "another app may own it" runtime text, so do not match it.
  if (/\(Windows error 1409\)|\(macOS error -9878\)|already (?:owned|registered)/i.test(error)) return {detail,
    fix: `Outro aplicativo registrou essa combinação. Libere-a ou escolha outra combinação em VOICE_HOTKEY. ${launchSetting} Reinicie o Agentic OS depois de concluir as tarefas ativas. ${platform === 'darwin' ? 'No Mac, use Control+Option para ctrl+alt.' : 'No Windows, use Ctrl+Alt para ctrl+alt.'} Enquanto isso, use o botão do microfone no painel.`};
  if (/^(?:Mac )?hotkey (?:helper|registration timed out|event )|^Mac hotkeys must run on the macOS helper main thread/i.test(error)) return {detail,
    fix: {first: 'O monitor do atalho falhou ao iniciar ou durante a execução. Depois de concluir as tarefas ativas, rode `node aos.mjs stop` e `node aos.mjs start`.',
      repeated: `O monitor do atalho falhou novamente. ${inspect}`}};
  return {detail, fix: `A causa da falha do atalho ainda está indefinida. ${inspect}`};
}

// phase 'install' = before the user has opened Obsidian: the plugin switch is WAIT, not FAIL.
// ports, runCommand, pause, now, voiceWaitMs, platform and checkLive exist for the tests; members never pass them.
export async function doctor({root = projectRoot, ci = false, full = false, phase = 'ready', log = console.log,
  ports = PORTS, runCommand = run, pause = sleep, now = Date.now, voiceWaitMs = 90000, platform = process.platform, checkLive = checkLiveKey} = {}) {
  const at = layout(root), setup = readJson(path.join(at.runtime, 'aos-setup.json')), results = [];
  const local = port => `http://127.0.0.1:${port}`;
  const memoryFile = path.join(at.runtime, 'aos-doctor-last.json'), before = readJson(memoryFile).failures || {}, failing = {};

  // fix is a sentence, or {first, repeated} when the second identical failure needs different advice.
  const add = (status, name, detail = '', fix = '', {optional = false} = {}) => {
    let lines = '';
    if (status === 'FAIL') {
      const repeats = before[name]?.detail === detail ? before[name].count : 0;
      failing[name] = {detail, count: repeats + 1};
      const advice = typeof fix === 'string' ? fix : (repeats && fix.repeated) || fix.first;
      if (advice) lines += `\n     correção: ${advice}`;
      if (repeats) lines += `\n     A mesma falha ocorreu em ${repeats + 1} diagnósticos consecutivos. Siga a correção indicada antes de repetir o diagnóstico. ${SHOW_SOMEONE}`;
    }
    results.push({status, name, detail, optional});
    log(`${status.padEnd(4)} ${name}${detail ? ' - ' + detail : ''}${lines}`);
  };
  const reported = name => results.some(item => item.name === name);
  // A group of checks that depend on each other. `names` is every line the group owes: whatever
  // ends it early (a failed step, a thrown error), the lines it did not reach are printed as SKIP.
  const group = async (names, fn, {optional = false} = {}) => {
    let reason = '';
    try { reason = (await fn()) || ''; }
    catch (error) {
      add('FAIL', names.find(name => !reported(name)) || `${names[0]} (erro inesperado)`, String(error.code || error.message || error).slice(0, 300),
        {first: 'Rode `node aos.mjs doctor` mais uma vez.', repeated: 'A falha persistiu na nova tentativa.'}, {optional});
    }
    const failedStep = names.find(name => results.some(item => item.name === name && item.status === 'FAIL'));
    for (const name of names) if (!reported(name)) add('SKIP', name, `teste pulado: ${reason || (failedStep ? `"${failedStep}" falhou` : 'uma etapa anterior ficou incompleta')}`);
  };

  const major = Number(process.versions.node.split('.')[0]);
  add(major >= 22 ? 'PASS' : 'FAIL', 'Node.js 22 ou superior', process.versions.node, 'Instale a versão LTS atual de nodejs.org, abra outro terminal e rode o setup novamente.');

  // An older update command can replace the files and then run its old setup (see setup-stamp.mjs).
  const finished = setupStatus(at);
  if (finished === 'current') add('PASS', SETUP_CHECK);
  else if (finished === 'unknown') add('SKIP', SETUP_CHECK, 'falha ao ler o código de instalação nesta pasta');
  else add('FAIL', SETUP_CHECK, setup.vault ? 'os arquivos foram atualizados e a instalação ainda não terminou' : 'instalação pendente nesta pasta',
    setup.vault ? 'Rode `node aos.mjs stop` e `node aos.mjs setup` para concluir a atualização. O setup preserva o cofre, as notas e as preferências. Depois, rode o diagnóstico novamente.' : 'Rode `node aos.mjs setup --vault "<caminho absoluto>"`.');

  // Asked first, printed in their usual place: the plugin line below needs the bridge's answer.
  let supervisor = await tryJson(`${local(ports.supervisor)}/status`);
  const services = await tryJson(`${local(ports.bridge)}/services`, {timeoutMs: 6000});
  const hud = await tryJson(`${local(ports.jarvis)}/api/state`, {timeoutMs: 15000});

  const vault = configuredVaultPath(at);
  await group(['Cofre configurado', 'Modelo de nota diária no cofre', 'Arquivos do plugin instalados no Obsidian', 'Plugin ativo no Obsidian'], async () => {
    if (!vault || !fs.existsSync(vault)) { add('FAIL', 'Cofre configurado', vault || 'ausente', 'Rode `node aos.mjs setup --vault "<caminho absoluto>"`.'); return; }
    add('PASS', 'Cofre configurado', vault);
    add(fs.existsSync(path.join(vault, 'system', 'schemas', 'daily-note.md')) ? 'PASS' : 'FAIL', 'Modelo de nota diária no cofre', '', 'Rode o setup novamente para adicionar os modelos que faltam. Ele preserva as notas.');
    add(pluginInstalled(vault) ? 'PASS' : 'FAIL', 'Arquivos do plugin instalados no Obsidian', '', 'Rode novamente `node aos.mjs setup --vault "<caminho>"`.');
    // A new vault arrives with the plugin already listed as enabled, which proves nothing: Obsidian
    // still asks the user to trust it the first time the vault is opened. Proof is the cockpit
    // being connected to the bridge right now, or Obsidian having opened this vault before.
    const connected = (services?.surfaces || []).some(surface => surface.kind === 'native');
    const openedBefore = ['workspace.json', 'workspace-mobile.json', 'app.json', 'appearance.json'].some(name => fs.existsSync(path.join(vault, '.obsidian', name)));
    const needsUser = phase === 'install' || ci ? 'WAIT' : 'FAIL';
    if (pluginEnabled(vault) && (connected || openedBefore)) add('PASS', 'Plugin ativo no Obsidian', connected ? 'o painel está conectado' : '');
    else if (pluginEnabled(vault)) add(needsUser, 'Plugin ativo no Obsidian', 'configurado no cofre novo. Abra o cofre no Obsidian', 'No Obsidian, escolha Abrir pasta como cofre, selecione a pasta e confirme que confia no autor para ativar os plugins.');
    else add(needsUser, 'Plugin ativo no Obsidian', 'ativação pendente', 'No Obsidian, abra Configurações > Plugins da comunidade, permita plugins da comunidade e ative Agentic OS V2.');
  });
  await group([TERMINAL_CHECK, TERMINAL_PYTHON_CHECK], () => {
    const check = terminalPluginCheck(vault);
    add(check.status, TERMINAL_CHECK, check.detail, check.fix || '', {optional: true});
    const python = terminalPythonCheck(at.runtime, {terminal: check});
    add(python.status, TERMINAL_PYTHON_CHECK, python.detail, python.fix || '', {optional: true});
  }, {optional: true});

  add(supervisor ? 'PASS' : 'FAIL', 'Monitor de recuperação em execução', supervisor ? `${supervisor.services.length} serviços monitorados` : '', 'Rode `node aos.mjs start`.');
  add(services?.bridge?.online ? 'PASS' : 'FAIL', `Ponte respondendo na porta ${ports.bridge}`, '', `Rode \`node aos.mjs start\`, aguarde 20 segundos e consulte ${SUPERVISOR_LOG}.`);
  add(hud ? 'PASS' : 'FAIL', `Jarvis respondendo na porta ${ports.jarvis}`, '', 'Rode `node aos.mjs setup` para compilar o Jarvis e depois `node aos.mjs start`.');
  const bridgeDown = 'a ponte está sem resposta. Veja a falha acima';

  const signedIn = [], installed = [];
  for (const provider of ['claude', 'codex']) {
    const info = services?.providers?.[provider];
    if (!services) { add('SKIP', `CLI de ${provider}`, `teste pulado: ${bridgeDown}`); continue; }
    if (!info?.installed) { add('SKIP', `CLI de ${provider}`, 'instalação opcional. Basta um provedor'); continue; }
    installed.push(provider);
    add('PASS', `CLI de ${provider} encontrada`, String(info.version || '').slice(0, 60));
    if (ci) { add('SKIP', `Sessão de ${provider} conectada`, 'teste pulado com --ci'); continue; }
    await group([`Sessão de ${provider} conectada`], async () => {
      const args = provider === 'claude' ? ['--print', '--model', 'haiku', 'Reply with the single word OK.'] : ['exec', '--skip-git-repo-check', '-s', 'read-only', 'Reply with the single word OK.'];
      // Not spawnSync: a CLI can take two minutes to answer, and a frozen doctor cannot keep a timer or a connection alive.
      const result = await runCommand(info.command, args, {timeoutMs: 120000, cwd: at.runtime, input: ''});
      if (result.status === 0 && /\bOK\b/i.test(result.stdout || '')) { signedIn.push(provider); add('PASS', `Sessão de ${provider} conectada`); }
      else add('FAIL', `Sessão de ${provider} conectada`, result.timedOut ? 'sem resposta após dois minutos' : 'sem resposta', `Abra um terminal, rode \`${provider}\`, entre na conta e rode o diagnóstico novamente.`, {optional: true});
    }, {optional: true});
  }
  if (!ci && services && !installed.length) add('FAIL', 'Claude Code ou Codex', 'instalação de um provedor pendente', 'Instale o Claude Code ou o Codex, entre na sua conta e rode `node aos.mjs setup` para salvar o caminho da CLI.');
  else if (!ci && installed.length && !signedIn.length) add('FAIL', 'Provedor com sessão conectada', `${installed.join(' e ')} instalado(s), sem resposta`, 'Abra um terminal, rode `claude` ou `codex`, entre na sua conta e rode o diagnóstico novamente.');

  // The buttons and voice run on the ONE tool saved in the vault (system/v2/provider.json), not on
  // whichever is signed in. A vault can keep a choice from another computer or an older release
  // (early 0.3.64 seeded Codex into new vaults), and then every workflow ends "codex CLI not installed"
  // while the lines above all pass.
  const stored = vault && fs.existsSync(vault) ? readStoredSelection(vault) : {state: 'novault'};
  const chosen = stored.selection?.provider, other = chosen === 'claude' ? 'codex' : 'claude';
  const switchTo = `\`node aos.mjs setup --provider ${other}\` troca o provedor dos botões e da voz para ${PROVIDER_NAME[other]}`;
  if (stored.state === 'novault') add('SKIP', PROVIDER_CHECK, 'nenhum cofre configurado');
  else if (stored.state === 'absent') add('SKIP', PROVIDER_CHECK, 'escolha pendente. O setup salva o provedor no cofre');
  else if (stored.state === 'invalid') add('FAIL', PROVIDER_CHECK, 'falha ao ler system/v2/provider.json no cofre', 'Para escolher o provedor novamente, rode `node aos.mjs setup --provider claude` ou use `codex` como valor.');
  else if (!services) add('SKIP', PROVIDER_CHECK, `usa ${PROVIDER_NAME[chosen]}. Teste pulado: ${bridgeDown}`);
  else if (ci) add('SKIP', PROVIDER_CHECK, `usa ${PROVIDER_NAME[chosen]}. Teste pulado com --ci`);
  else if (!services.providers?.[chosen]?.installed) add('FAIL', PROVIDER_CHECK, `os botões e os fluxos dependem de ${PROVIDER_NAME[chosen]}, que precisa ser instalado neste computador`,
    installed.includes(other) ? `${switchTo}, que já está instalado. Você também pode instalar ${PROVIDER_NAME[chosen]} e entrar na sua conta.` : `Instale ${PROVIDER_NAME[chosen]}, entre na sua conta e rode \`node aos.mjs setup\` novamente.`);
  else if (!signedIn.includes(chosen)) add('FAIL', PROVIDER_CHECK, `${PROVIDER_NAME[chosen]} ficou sem resposta no teste de login`,
    signedIn.includes(other) ? `Abra um terminal, rode \`${chosen}\` e entre na sua conta. Você também pode usar a sessão ativa de ${PROVIDER_NAME[other]}. ${switchTo}.` : `Abra um terminal, rode \`${chosen}\`, entre na conta e rode o diagnóstico novamente.`);
  else add('PASS', PROVIDER_CHECK, `${PROVIDER_NAME[chosen]} (${stored.selection.model})`);
  const providerProblem = results.find(item => item.name === PROVIDER_CHECK && item.status === 'FAIL');

  // A saved CLAUDE_CODE_OAUTH_TOKEN signs Claude in without the account's connectors, so calendar and mail workflows
  // end "blocked" with the connector connected. The bridge reports what it found; it never reports the token.
  const signIn = services?.claudeSignIn, signInFix = 'Abra um terminal, rode `claude`, entre com /login e rode o diagnóstico novamente. O token salvo pode continuar disponível para outras ferramentas.';
  if (!services) add('SKIP', CONNECTOR_CHECK, `teste pulado: ${bridgeDown}`);
  else if (!services.providers?.claude?.installed) add('SKIP', CONNECTOR_CHECK, 'Claude Code está sem instalação');
  else if (!signIn) add('SKIP', CONNECTOR_CHECK, 'esta versão da ponte ainda não informa o estado. Reinicie os serviços após atualizar');
  else if (!signIn.token) add('PASS', CONNECTOR_CHECK, 'os fluxos usam a sessão habitual do Claude');
  else if (signIn.fallback) add('FAIL', CONNECTOR_CHECK, 'a sessão do Claude expirou. Os fluxos voltaram a usar CLAUDE_CODE_OAUTH_TOKEN, que não dá acesso a calendário e e-mail', signInFix, {optional: true});
  else if (signIn.stored === true) add('PASS', CONNECTOR_CHECK, 'há um CLAUDE_CODE_OAUTH_TOKEN neste computador. Os fluxos usam a sessão habitual do Claude e mantêm acesso a calendário e e-mail');
  else if (signIn.stored === null) add('SKIP', CONNECTOR_CHECK, 'a ponte verifica em até um minuto após iniciar. Rode o diagnóstico novamente');
  else add('FAIL', CONNECTOR_CHECK, 'o Claude entrou apenas com CLAUDE_CODE_OAUTH_TOKEN. Planejar o dia, Resumo da caixa de entrada e outros fluxos de calendário e e-mail ficarão bloqueados', signInFix, {optional: true});

  if (setup.voice === false) {
    add('SKIP', 'Voz', 'instalação opcional com `node aos.mjs setup --voice yes`');
    add('SKIP', HOTKEY_CHECK, 'voz desativada');
  } else await group([VOICE_CHECKS[0], HOTKEY_CHECK, ...VOICE_CHECKS.slice(1)], async () => {
    if (!services?.bridge?.online) return bridgeDown;
    const healthUrl = `${local(ports.bridge)}/voice/health`, speechUrl = services.speech?.url || local(ports.speech), own = speechUrl === local(ports.speech);
    const speechPhase = () => supervisor?.services?.find(service => service.id === 'speech')?.phase || '';
    // What the monitor says NOW: the sign-in checks above can take minutes, and a service may have
    // come up, crashed or been given up on meanwhile.
    const refresh = async () => { supervisor = await tryJson(`${local(ports.supervisor)}/status`, {timeoutMs: 2000}) || supervisor; };
    await refresh();
    let probe = await probeJson(healthUrl, {timeoutMs: 8000});
    // Our own service loads its models before it opens its port. Wait for that here, once,
    // instead of sending the person round in circles with "run the doctor again". The limit is on
    // the clock, slow probes included (the last round can run over by one probe, never by more),
    // and the wait ends as soon as the monitor stops calling it "starting".
    if (!probe.data?.ok && own && speechInstalled(at) && STILL_STARTING.has(speechPhase())) {
      log(`     carregando os modelos de voz. Aguardando até ${Math.round(voiceWaitMs / 1000)} segundos…`);
      const started = now(), left = () => voiceWaitMs - (now() - started);
      while (!probe.data?.ok && STILL_STARTING.has(speechPhase()) && left() > 0) {
        await pause(Math.min(3000, left())); await refresh();
        probe = await probeJson(healthUrl, {timeoutMs: 8000});
      }
    }
    if (!probe.data?.ok) {
      // The configured limit, not the measured time: the line must read the same on the next run for a repeat to be recognised.
      const problem = voiceProblem({probe, speechUrl, own, installed: speechInstalled(at), phase: speechPhase(), waitedSeconds: Math.round(voiceWaitMs / 1000)});
      add('FAIL', VOICE_CHECKS[0], problem.detail, problem.fix, {optional: true}); return;
    }
    const whose = own ? `serviço desta instalação na porta ${ports.speech}` : `serviço compartilhado em ${speechUrl}, iniciado por outro programa neste computador`;
    // The language the service is REALLY running (an older or shared service reports none: English),
    // against the one this vault asks for. A wrong language is not a hiccup: the English-only model
    // writes down English-looking words for any other language, and every check below would still pass.
    const running = probe.data.speech?.language, runningCode = Object.hasOwn(SPEECH_LANGUAGES, running?.code) ? running.code : 'en';
    const want = speechLanguage(vault), runningName = SPEECH_LANGUAGES[runningCode].name;
    if (!want.known) add('FAIL', VOICE_CHECKS[0], `"speechLanguage" em system/v2/profile.json é "${want.asked}", idioma incompatível. A voz está em ${runningName}`,
      `Escolha um destes códigos: ${SPEECH_LANGUAGE_CODES.join(', ')}. Sem o campo, o serviço usa inglês. Rode \`node aos.mjs stop\` e \`node aos.mjs setup --voice yes\`.`, {optional: true});
    else if (want.code !== runningCode) add('FAIL', VOICE_CHECKS[0], `o cofre está configurado para ${SPEECH_LANGUAGES[want.code].name}. A voz está em ${runningName}${running?.error ? ' porque falta o modelo do idioma configurado' : ''}`,
      own ? 'Rode `node aos.mjs stop` e depois `node aos.mjs setup --voice yes` para baixar o modelo e iniciar a voz no idioma configurado.' : `O serviço compartilhado em ${speechUrl} define o próprio idioma. "speechLanguage" só se aplica ao serviço de voz desta instalação.`, {optional: true});
    else add('PASS', VOICE_CHECKS[0], `${probe.data.engine ? probe.data.engine + ', ' : ''}${whose}${runningCode === 'en' ? '' : ', ouvindo e falando em ' + runningName}`);
    // Say and expect the language that is running, so a working non-English voice is not reported broken.
    const check = speechCheck(runningCode);
    // Use the fresh health response: provider sign-in and model loading can outlive
    // the initial /services snapshot. Registration is not proof of microphone access.
    const hotkey = probe.data.speech?.hotkey;
    if (!own) add('SKIP', HOTKEY_CHECK, 'outro programa gerencia o serviço de voz compartilhado');
    else if (!['darwin', 'win32'].includes(platform)) add('SKIP', HOTKEY_CHECK, 'disponível no Mac e no Windows. Nesta plataforma, use o botão de voz');
    else if (hotkey?.enabled === false) add('SKIP', HOTKEY_CHECK, 'desativado na configuração do serviço de voz');
    else if (ci) add('SKIP', HOTKEY_CHECK, 'teste pulado com --ci. Rode o diagnóstico na sessão gráfica');
    else if (hotkey?.enabled !== true || typeof hotkey.ok !== 'boolean') add('WAIT', HOTKEY_CHECK, 'o serviço de voz ainda não informa se o atalho está registrado. Atualize, reinicie os serviços e rode o diagnóstico novamente');
    else if (hotkey.ok) add('PASS', HOTKEY_CHECK, `${hotkey.combo || 'atalho configurado'} registrado. Teste manualmente a captação do microfone e o atalho em outro aplicativo`);
    else {
      const problem = hotkeyProblem({hotkey, capture: probe.data.speech?.capture, platform});
      add('FAIL', HOTKEY_CHECK, problem.detail, problem.fix, {optional: true});
    }
    // The same two calls the bridge makes, against the same service, own or shared.
    const repair = own ? 'Rode `node aos.mjs setup --voice yes` novamente para reparar os arquivos de voz.' : `O serviço compartilhado em ${speechUrl} responde ao teste de conexão, mas falhou nesta operação. Reinicie o programa que o executa.`;
    const spoken = await request(`${speechUrl}/speak?text=${encodeURIComponent(check.phrase)}`, {timeoutMs: 60000});
    if (!spoken.ok || spoken.body.length < 5000) { add('FAIL', VOICE_CHECKS[1], `status ${spoken.status}, ${spoken.body.length} bytes`, repair, {optional: true}); return; }
    add('PASS', VOICE_CHECKS[1], `${Math.round(spoken.body.length / 1024)} KB de áudio`);
    const heard = await request(`${speechUrl}/stt`, {method: 'POST', headers: {'Content-Type': 'audio/wav'}, body: spoken.body, timeoutMs: 120000});
    let text = ''; try { text = heard.ok ? String(JSON.parse(heard.body.toString('utf8')).text || '') : ''; } catch { /* not JSON */ }
    add(check.heard(text) ? 'PASS' : 'FAIL', VOICE_CHECKS[2], heard.ok ? text.slice(0, 60) || 'áudio sem transcrição' : `status ${heard.status}`, repair, {optional: true});
  }, {optional: true});

  if (!hasJevKey(at.runtime)) add('SKIP', 'Roteamento rápido de voz com Jev', 'chave do OpenRouter opcional. Para salvar, use `node aos.mjs jev-key`');
  else if (ci) add('PASS', 'Chave do Jev salva');
  else await group(['Roteamento rápido de voz com Jev'], async () => {
    const {readJevConfig, jevState, classifyJev} = await import('../../runner/jev.mjs');
    const config = readJevConfig();
    try {
      const result = await classifyJev(jevState({transcript: 'What is on my schedule today?'}), {key: config.key, deadlineMs: 8000, tier2kind: config.tier2kind, rulebook: config.rulebook});
      add('PASS', 'Roteamento rápido de voz com Jev', `respondeu em ${Math.round(result.ms)} ms`);
    } catch (error) {
      // Timings differ per run; keep the detail stable so a repeat is recognised.
      add('FAIL', 'Roteamento rápido de voz com Jev', String(error.message).replace(/\d+(\.\d+)? ?ms/g, 'N ms'), /HTTP 40[13]/.test(error.message) ? 'O OpenRouter recusou a chave. Rode `node aos.mjs jev-key` e informe uma chave atual de openrouter.ai/keys.' : /HTTP 402/.test(error.message) ? 'A conta do OpenRouter está sem saldo. Consulte openrouter.ai/credits.' : 'Confira a conexão com a internet. A voz continua disponível sem o Jev, com resposta mais lenta.', {optional: true});
    }
  }, {optional: true});

  // Live voice is optional. With a key saved, ask OpenAI whether it still accepts it; credit only shows on a call.
  const live = liveAuthorization(at.runtime);
  if (!live.ready && /^Run aos openai-key to set up/.test(live.reason || '')) add('SKIP', LIVE_CHECK, 'configuração opcional com `node aos.mjs openai-key`');
  else if (!live.ready) add('FAIL', LIVE_CHECK, String(live.reason || 'a chave salva está indisponível').replace(/\s*Run aos openai-key\.?$/, ''), 'Rode `node aos.mjs openai-key` e salve novamente a chave e a autorização.', {optional: true});
  else if (ci) add('PASS', LIVE_CHECK, 'chave e autorização salvas. O teste com a OpenAI foi pulado com --ci');
  else await group([LIVE_CHECK], async () => {
    const result = await checkLive(readLiveKey(at.runtime));
    if (result?.kind === 'accepted') add('PASS', LIVE_CHECK, 'a OpenAI aceita a chave salva. Para ligar, também é preciso crédito de API e microfone');
    else if (result?.kind === 'refused') add('FAIL', LIVE_CHECK, 'a OpenAI recusou a chave salva', 'Rode `node aos.mjs openai-key` e informe uma chave atual de platform.openai.com/api-keys.', {optional: true});
    else if (result?.kind === 'no-model') add('FAIL', LIVE_CHECK, `a chave salva não tem acesso ao modelo de voz ao vivo (${LIVE_MODEL}) na OpenAI`, 'Confira o projeto e as permissões em platform.openai.com/api-keys ou use `node aos.mjs openai-key` para salvar uma chave com acesso.', {optional: true});
    else add('SKIP', LIVE_CHECK, `chave e autorização salvas. A OpenAI não confirmou o acesso agora${result?.detail ? ' (' + result.detail + ')' : ''}`);
  }, {optional: true});

  const WORKFLOW = 'Execução de um fluxo completo';
  if (!full) add('SKIP', WORKFLOW, 'use `node aos.mjs doctor --full` para incluir este teste');
  else if (ci) add('SKIP', WORKFLOW, 'teste pulado com --ci');
  else if (providerProblem) add('SKIP', WORKFLOW, `teste pulado porque "${PROVIDER_CHECK}" falhou`);
  else await group([WORKFLOW], async () => {
    if (!services?.bridge?.online) return bridgeDown;
    const token = JSON.parse(fs.readFileSync(at.auth, 'utf8')).token, id = crypto.randomUUID();
    const started = await fetchJson(`${local(ports.bridge)}/work/skill`, {method: 'POST', headers: {'X-V2-Token': token, 'X-V2-App': 'web'}, body: {id, skill: 'vault-summary'}, timeoutMs: 15000});
    if (!started.ok) { add('FAIL', WORKFLOW, started.data?.error || `status ${started.status}`, 'Entre na conta do provedor selecionado e rode `node aos.mjs doctor --full` novamente. Para mudar de provedor, use `node aos.mjs setup --provider claude` ou informe `codex`.'); return; }
    for (let waited = 0; waited < 300; waited += 3) {
      await pause(3000);
      const task = (await tryJson(`${local(ports.bridge)}/work`, {timeoutMs: 8000}))?.tasks?.find(item => item.id === id);
      const destination = task?.workflow?.destination;
      if (task?.state === 'stopped' && !task.error && destination && fs.existsSync(path.join(vault, destination))) { add('PASS', WORKFLOW, destination); return; }
      if (task && (task.state === 'error' || task.state === 'needs input' || (task.state === 'stopped' && task.error))) { add('FAIL', WORKFLOW, String(task.error || task.state).slice(0, 200), `Abra o Jarvis em ${local(ports.jarvis)}, encontre a tarefa no Histórico e mostre a mensagem ao seu agente de código.`); return; }
    }
    add('FAIL', WORKFLOW, 'sem resultado após cinco minutos', 'No Jarvis, abra Terminais, confira a tarefa e mostre a mensagem ao agente de código.');
  });

  try { fs.mkdirSync(at.runtime, {recursive: true}); fs.writeFileSync(memoryFile, JSON.stringify({failures: failing}, null, 1)); } catch { /* a read-only folder only loses the repeat detection */ }

  const fails = results.filter(item => item.status === 'FAIL'), core = fails.filter(item => !item.optional), waiting = results.filter(item => item.status === 'WAIT').length;
  const listed = items => items.map(item => item.name).join(', ');
  const optionalFailures = fails.length === 1 ? 'o item opcional com falha' : `os ${fails.length} itens opcionais com falha`;
  log(`\n${!fails.length ? (waiting ? 'Instalação concluída. Restam as etapas marcadas como WAIT.' : 'Diagnóstico concluído com sucesso.')
    : !core.length ? `O sistema principal está funcionando. Revise ${optionalFailures} (${listed(fails)}) seguindo as correções acima.`
    : `${fails.length} verificações falharam, incluindo itens essenciais (${listed(core)}). Siga as correções de cima para baixo.`}`);
  return {ok: fails.length === 0, failed: fails.length, coreFailed: core.length, waiting, results};
}
