// Which coding tool (Claude Code or Codex) the buttons and voice use: system/v2/provider.json in the
// vault. It is the member's choice, so setup writes it only on a fresh install or when --provider is
// passed; an existing choice is never changed behind their back, only explained.
import fs from 'node:fs';
import path from 'node:path';
import {resolveCli} from '../../runner/cli-runtime.mjs';
import {MODELS, modelFamily} from '../../shared/contract.mjs';

export const DEFAULT_MODEL = Object.freeze({codex: 'astra', claude: 'opus'});
const NAME = {claude: 'Claude Code', codex: 'Codex'};
const other = provider => provider === 'claude' ? 'codex' : 'claude';
export const providerFile = vault => path.join(vault, 'system', 'v2', 'provider.json');

// 'installed' | 'missing' | 'unknown', resolved exactly as the bridge does (including this
// installation's pinned paths). A broken pin or unreadable pin file is unknown, never missing.
export function cliPresence(provider, {runtimeDir, env = process.env, resolve = resolveCli} = {}) {
  let pins = {};
  const pinFile = runtimeDir && path.join(runtimeDir, 'providers.json');
  if (pinFile && fs.existsSync(pinFile)) { try { pins = JSON.parse(fs.readFileSync(pinFile, 'utf8').replace(/^﻿/, '')); } catch { return 'unknown'; } }
  try { return resolve(provider, {env, pins}) ? 'installed' : 'missing'; } catch { return 'unknown'; }
}

export function readStoredSelection(vault) {
  const file = providerFile(vault);
  if (!fs.existsSync(file)) return {state: 'absent'};
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    const model = Object.hasOwn(MODELS, value?.provider) ? modelFamily(value.provider, value.model) : null;
    return model && MODELS[value.provider].includes(model) ? {state: 'valid', selection: {provider: value.provider, model}} : {state: 'invalid'};
  } catch { return {state: 'invalid'}; }
}

// Pure. explicit: 'claude' | 'codex' | undefined; stored: readStoredSelection(); presence: {claude, codex}.
// Returns {selection, write, note}: write=false means the file is left exactly as it is.
export function chooseProvider({explicit, stored, presence, env = {}}) {
  if (explicit) {
    const model = stored.state === 'valid' && stored.selection.provider === explicit ? stored.selection.model : DEFAULT_MODEL[explicit];
    return {selection: {provider: explicit, model}, write: !(stored.state === 'valid' && stored.selection.provider === explicit && stored.selection.model === model),
      note: presence[explicit] === 'missing' ? `Instale o ${NAME[explicit]} e entre na sua conta antes de usar os botões.` : ''};
  }
  if (stored.state === 'valid') {
    const chosen = stored.selection.provider;
    const note = presence[chosen] === 'missing' && presence[other(chosen)] === 'installed'
      ? `Os botões e a voz usam o ${NAME[chosen]}, que ainda precisa ser instalado. Para usar o ${NAME[other(chosen)]}, que já está instalado, execute node aos.mjs setup --provider ${other(chosen)}`
      : '';
    return {selection: stored.selection, write: false, note};
  }
  if (stored.state === 'invalid') return {selection: null, write: false, note: 'Não foi possível ler system/v2/provider.json. O arquivo foi preservado. Para escolher novamente, execute node aos.mjs setup --provider claude (ou use codex no lugar de claude).'};
  const installed = ['claude', 'codex'].filter(provider => presence[provider] === 'installed');
  // Both installed: the tool running this setup (Claude Code sets CLAUDECODE=1 in its shells).
  const provider = installed.length === 1 ? installed[0] : installed.length === 2 && env.CLAUDECODE === '1' ? 'claude' : 'codex';
  return {selection: {provider, model: DEFAULT_MODEL[provider]}, write: true, note: installed.length ? '' : 'Nenhuma das duas ferramentas foi encontrada. Para usar os botões, instale o Claude Code ou o Codex.'};
}

export function applyProviderChoice(vault, {explicit, runtimeDir, env = process.env, log = console.log, presence} = {}) {
  presence ||= {claude: cliPresence('claude', {runtimeDir, env}), codex: cliPresence('codex', {runtimeDir, env})};
  const choice = chooseProvider({explicit, stored: readStoredSelection(vault), presence, env});
  if (choice.write) {
    const file = providerFile(vault), temporary = `${file}.${process.pid}.tmp`;
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(temporary, JSON.stringify(choice.selection));
    fs.renameSync(temporary, file);
    log(`-> Os botões e a voz usam o ${NAME[choice.selection.provider]} (${choice.selection.model})`);
  }
  if (choice.note) log(`-> ${choice.note}`);
  return choice;
}
