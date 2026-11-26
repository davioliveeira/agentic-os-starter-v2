#!/usr/bin/env node
// One command for every install, on Windows and macOS alike:
//   node aos.mjs setup --vault "<path>" [--provider claude|codex] [--voice yes|no] [--autostart yes|no]
//   node aos.mjs start | stop | status | doctor [--full] | jev-key | autostart on|off | update
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {formatStatus, layout, stop, status} from './aos/services.mjs';
import {disableAutostart} from './aos/autostart.mjs';
import {collectJevKey, hasJevKey} from './aos/jev-key.mjs';
import {doctor} from './aos/doctor.mjs';
import {setup, update, startAtLogin, startCommand} from './aos/setup.mjs';

const HELP = `Agentic OS V2

  setup --vault "<caminho>" [--provider claude|codex] [--voice yes|no] [--autostart yes|no] [--rebuild]
                      instalar ou reparar o sistema e executar o diagnóstico
                      (--provider escolhe a ferramenta dos botões e da voz, entre as instaladas)
  start [--no-wait]   iniciar os serviços locais (ponte, Jarvis e voz) e aguardar resposta
  stop                parar os serviços quando não houver tarefas abertas
  status [--json]     mostrar os serviços e as tarefas abertas
  doctor [--full]     executar o diagnóstico, com um fluxo real se usar --full
  jev-key             abrir uma página local para salvar a chave do OpenRouter ou da TypeSafe, sem expô-la ao agente
  openai-key          salvar a chave da OpenAI e a autorização para a voz ao vivo (consulte com --check)
  autostart on|off    ativar ou desativar a inicialização ao entrar no sistema
  update              baixar a versão mais recente e recompilar
  upgrade             localizar a instalação atual e avaliar uma atualização em modo somente leitura
  dashboard           listar, buscar, registrar, selecionar ou restaurar skills do painel
  skills              listar e instalar as skills do pacote (skills help)
  voice               configurar a voz, a velocidade e as palavras reconhecidas (voice help)
  schedule            agendar um fluxo, como Planejar o dia às 7h (schedule help)
  about               mostrar ou atualizar a seção Sobre mim do cofre (about help)
  live-context        escolher as notas e os relatórios que a voz ao vivo lê ao iniciar (live-context help)
`;

export function parseArgs(argv) {
  const [command = 'help', ...rest] = argv, flags = {}, words = [];
  for (let index = 0; index < rest.length; index++) {
    const item = rest[index];
    if (!item.startsWith('--')) { words.push(item); continue; }
    const name = item.slice(2), next = rest[index + 1];
    if (next !== undefined && !next.startsWith('--')) { flags[name] = next; index++; } else flags[name] = true;
  }
  return {command, flags, words};
}
const yesNo = (value, name) => { if (value === undefined) return undefined; if (['yes', 'true', true].includes(value)) return true; if (['no', 'false'].includes(value)) return false; throw new Error(`Use yes ou no com --${name}.`); };

const providerFlag = value => { if (value === undefined) return undefined; if (['claude', 'codex'].includes(value)) return value; throw new Error('Use --provider claude ou --provider codex.'); };

export async function main(argv = process.argv.slice(2), log = console.log) {
  const {command, flags, words} = parseArgs(argv);
  switch (command) {
    case 'setup': return (await setup({vault: typeof flags.vault === 'string' ? flags.vault : undefined, voice: yesNo(flags.voice, 'voice'), autostart: yesNo(flags.autostart, 'autostart'), provider: providerFlag(flags.provider), rebuild: flags.rebuild === true, ci: flags.ci === true, adopt: flags.adopt === true, log})).ok ? 0 : 1;
    case 'start': return startCommand({resetRecovery: flags['reset-recovery'] === true, wait: flags['no-wait'] !== true, log});
    case 'stop': await stop({log}); return 0;
    case 'status': {
      const snapshot = await status();
      log(process.stdout.isTTY && flags.json !== true ? formatStatus(snapshot) : JSON.stringify(snapshot, null, 1));
      return 0;
    }
    case 'doctor': return (await doctor({ci: flags.ci === true, full: flags.full === true, phase: flags.phase === 'install' ? 'install' : 'ready', log})).ok ? 0 : 1;
    case 'jev-key': {
      if (flags.check === true) { log(JSON.stringify({saved: hasJevKey(layout().runtime)})); return 0; }
      const result = await collectJevKey({runtimeDir: layout().runtime, announce: url => log(`Acesse esta página no navegador se ela não abrir automaticamente.\n${url}\nAguardando por até cinco minutos…`)});
      log(JSON.stringify(result));
      if (result.saved) log('Chave salva. O roteador de voz vai usá-la em alguns segundos, sem reiniciar o serviço.');
      return result.saved ? 0 : 1;
    }
    case 'openai-key': {
      // --check says whether a key and consent are saved, without opening anything. Never the key.
      if (flags.check === true) { const {liveAuthorization}=await import('../runner/live/key.mjs'); log(JSON.stringify(liveAuthorization(layout().runtime))); return 0; }
      const {collectOpenAIKey,openAIKeyOutcome}=await import('./aos/openai-key.mjs');
      const result=await collectOpenAIKey({runtimeDir:layout().runtime,announce:url=>log(`Abra a página local para configurar a voz ao vivo.\n${url}\nAguardando por até cinco minutos…`)});
      log(JSON.stringify(result));log(openAIKeyOutcome(result));return result.saved?0:1;
    }
    case 'autostart': {
      if (!['on', 'off'].includes(words[0])) throw new Error('Use autostart on ou autostart off.');
      if (words[0] === 'on') await startAtLogin({log}); else log(disableAutostart(layout()));
      return 0;
    }
    case 'update': return (await update({log})).ok ? 0 : 1;
    case 'upgrade': return (await import('./aos/upgrade.mjs')).upgradeCommand({words, flags, log});
    case 'dashboard': return (await import('./aos/dashboard.mjs')).dashboardCommand({words, flags, log});
    case 'skills': return (await import('./aos/skills.mjs')).skillsCommand({words, flags, log});
    case 'voice': return (await import('./aos/voice.mjs')).voiceCommand({words, flags, log});
    case 'schedule': return (await import('./aos/schedule.mjs')).scheduleCommand({words, flags, log});
    case 'about': return (await import('./aos/about.mjs')).aboutCommand({words, flags, log});
    case 'live-context': return (await import('./aos/live-context.mjs')).liveContextCommand({words, flags, log});
    default: log(HELP); return command === 'help' ? 0 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(`\nOperação interrompida: ${error.message}`); process.exitCode = 1; });
}
