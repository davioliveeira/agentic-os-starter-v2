// Upgrade starts with an inventory. Applying a member's chosen changes belongs
// to the reviewed procedure in setup/UPGRADE.md, never to this command.
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {projectRoot} from '../../runner/runtime.mjs';
import {discoverInstallations} from './upgrade-discovery.mjs';
import {assessCheckout} from './upgrade-checkout.mjs';

export const UPGRADE_FEATURES = Object.freeze([
  {id: 'cockpit', name: 'Painel do Obsidian', description: 'Planejamento, conversas e fluxos de trabalho dentro do seu cofre.', dependencies: ['Ponte local e plugin compatíveis. Para conversas interativas, instale o plugin Terminal.']},
  {id: 'hud', name: 'Jarvis HUD', description: 'Um painel no navegador para conversas, fluxos de trabalho e voz.', dependencies: ['Ponte e HUD com versões compatíveis, além dos dados compartilhados do painel.']},
  {id: 'voice', name: 'Voz local', description: 'Faça pedidos por voz e ouça as respostas no seu computador.', dependencies: ['Ponte e serviço de voz compatíveis, permissão para usar o microfone e Python se você for executar seu próprio serviço de voz.']},
  {id: 'jev', name: 'Roteador Jev (opcional)', description: 'Encaminhe pedidos por voz usando um modelo opcional do OpenRouter.', dependencies: ['Voz funcionando e ponte compatível. Você insere sua própria chave do OpenRouter localmente.']},
  {id: 'live', name: 'Voz ao vivo (opcional)', description: 'Converse sobre o seu dia em uma chamada e delegue tarefas aos seus agentes.', dependencies: ['Ponte, plugin e HUD com versões compatíveis a partir da 0.4 e permissão para usar o microfone. Você insere sua própria chave da API da OpenAI localmente. A OpenAI cobra pelas chamadas.']},
  {id: 'about', name: 'Sobre mim', description: 'Um perfil curto no seu cofre que os agentes leem para adaptar as respostas a você.', dependencies: ['Ponte compatível e sua aprovação do texto. Com a voz ao vivo ativada, o texto é enviado à OpenAI no início de cada chamada.']},
  {id: 'dashboard', name: 'Botões de skills personalizados', description: 'Escolha e organize até dez botões compartilhados pelos dois painéis.', dependencies: ['Ponte e painéis compatíveis. Cada skill pessoal precisa das suas próprias ferramentas e contas.']},
  {id: 'workflows', name: 'Fluxos de trabalho incluídos', description: 'Fluxos de planejamento, pesquisa e escrita que salvam relatórios no seu cofre.', dependencies: ['Ponte compatível, cofre com a estrutura esperada, uma ferramenta de programação com login ativo e as contas exigidas pelo fluxo escolhido.']},
]);

export const UPGRADE_HELP = `Confira a instalação existente do Agentic OS antes de atualizá-la.

  node aos.mjs upgrade
  node aos.mjs upgrade --install "<caminho absoluto da instalação>"
  node aos.mjs upgrade --vault "<caminho absoluto do cofre>" [--json]

Localiza possíveis instalações, verifica os metadados locais do repositório e
lista os recursos disponíveis em modo somente leitura. Consulte setup/UPGRADE.md
para escolher as mudanças e preservar suas personalizações.
`;

// Only a fixed loopback status endpoint is read. Bound both time and body size;
// redirects, arbitrary URLs and authorization material are never followed.
export function readUpgradeMonitor() {
  return new Promise(resolve => {
    let done = false, request, timer;
    const finish = value => { if (done) return; done = true; clearTimeout(timer); request?.destroy(); resolve(value); };
    timer = setTimeout(() => finish(null), 1500);
    try {
      request = http.get('http://127.0.0.1:3221/status', {agent: false}, response => {
        if (response.statusCode !== 200) { response.resume(); finish(null); return; }
        const chunks = []; let size = 0;
        response.on('data', chunk => { size += chunk.length; if (size > 128 * 1024) finish(null); else chunks.push(chunk); });
        response.on('error', () => finish(null));
        response.on('end', () => {
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            finish(value?.kind === 'agentic-os-service-supervisor' && typeof value.runtimeDir === 'string'
              ? {kind: value.kind, runtimeDir: value.runtimeDir} : null);
          } catch { finish(null); }
        });
      });
      request.on('error', () => finish(null));
    } catch { finish(null); }
  });
}

const line = value => String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 1800);

export async function inspectUpgrade(options = {}) {
  const {platform = process.platform, install, vault,
    discover = discoverInstallations, assess = assessCheckout} = options;
  const root = Object.hasOwn(options, 'root') ? options.root : options.home === undefined ? projectRoot : undefined;
  const getMonitor = Object.hasOwn(options, 'getMonitor') ? options.getMonitor : options.home === undefined ? readUpgradeMonitor : undefined;
  const home = options.home ?? os.homedir(), env = options.env ?? (options.home === undefined ? process.env : {});
  const inventory = await discover({root, home, platform, env, install, vault, getMonitor});
  const checkouts = new Map();
  const candidates = inventory.candidates.map(candidate => {
    if (candidate.installPath && !checkouts.has(candidate.installPath)) checkouts.set(candidate.installPath, assess(candidate.installPath));
    const checkout = candidate.installPath ? checkouts.get(candidate.installPath) : null;
    const route = checkout?.updateAllowed && candidate.kind === 'starter-v2' && candidate.vaultPath && !candidate.warnings?.length ? 'review-stock-update'
      : candidate.kind === 'v1' ? 'review-v1-upgrade' : 'review-custom-integration';
    return {...candidate, checkout, route};
  });
  return {
    schemaVersion: 1, readOnly: true, changesApplied: false,
    selectionRequired: candidates.length > 1,
    candidates, warnings: inventory.warnings, searched: inventory.searched,
    availableFeatures: UPGRADE_FEATURES,
    nextStep: candidates.length === 0
      ? 'Pergunte qual cofre do Obsidian a pessoa usa ou ajude a localizar a pasta pelo Obsidian. Nenhuma instalação foi selecionada.'
      : candidates.length > 1
        ? 'Mostre os nomes dos cofres e as pastas de instalação e pergunte qual sistema a pessoa quer atualizar. Aguarde a escolha antes de prosseguir.'
        : 'Confirme a instalação detectada com a pessoa, compare as personalizações que não contêm dados sigilosos e siga setup/UPGRADE.md antes de fazer alterações.',
    limitation: 'A compatibilidade precisa ser verificada separadamente. Mesmo com o repositório Git limpo, revise os arquivos do plugin instalado, o conteúdo do cofre e as integrações externas do sistema escolhido antes de recomendar a atualização.',
  };
}

export function printUpgradeReport(report, log = console.log) {
  log('Avaliação de atualização em modo somente leitura. Nenhuma alteração foi feita.');
  if (!report.candidates.length) log('Nenhuma instalação foi confirmada nos locais consultados.');
  report.candidates.forEach((candidate, index) => {
    log(`\n${index + 1}. ${line(candidate.label || candidate.kind)}`);
    if (candidate.vaultPath) log(`   Cofre: ${line(candidate.vaultPath)}`);
    if (candidate.installPath) log(`   Instalação: ${line(candidate.installPath)}`);
    log(`   Opção: ${candidate.route === 'review-stock-update' ? 'Avaliar uma atualização padrão do V2' : candidate.route === 'review-v1-upgrade' ? 'Avaliar uma atualização a partir da versão original' : 'Avaliar e preservar este sistema personalizado ou não reconhecido'}`);
    for (const issue of [...(candidate.warnings || []), ...(candidate.checkout?.issues || [])]) log(`   A verificar: ${line(issue)}`);
    for (const changed of (candidate.checkout?.changes || [])) log(`   Arquivo alterado: ${line(changed)}`);
  });
  for (const warning of report.warnings || []) log(`\nAviso da busca: ${line(warning)}`);
  log('\nRecursos disponíveis nesta versão (confira a compatibilidade)');
  for (const feature of report.availableFeatures) log(`- ${feature.name}: ${feature.description}`);
  log(`\n${report.nextStep}`);
  log(report.limitation);
  log('Guia: setup/UPGRADE.md');
}

export async function upgradeCommand({flags = {}, words = [], log = console.log, ...options} = {}) {
  const allowed = new Set(['help', 'install', 'vault', 'json']);
  if (words.length || Object.keys(flags).some(key => !allowed.has(key))) throw new Error('Use node aos.mjs upgrade [--install "<pasta>"] [--vault "<pasta>"] [--json]. O comando apenas consulta informações.');
  for (const name of ['help', 'json']) if (flags[name] !== undefined && flags[name] !== true) throw new Error(`--${name} não aceita valor.`);
  if (flags.help) { log(UPGRADE_HELP); return 0; }
  for (const name of ['install', 'vault']) if (flags[name] !== undefined && (typeof flags[name] !== 'string' || !path.isAbsolute(flags[name]) || /[\x00-\x1f\x7f]/.test(flags[name]))) throw new Error(`--${name} exige o caminho absoluto de uma pasta. Rode node aos.mjs upgrade sem indicar um caminho para localizar instalações.`);
  const report = await inspectUpgrade({...options, install: flags.install, vault: flags.vault});
  if (flags.json) log(JSON.stringify(report, null, 2)); else printUpgradeReport(report, log);
  return 0;
}
