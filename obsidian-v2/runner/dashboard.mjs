import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {load as parseYaml, JSON_SCHEMA} from 'js-yaml';
import {SKILLS, validateSelection} from '../shared/contract.mjs';
import {isInstalledSkill, validateDashboardSelection, builtinDescription} from '../shared/dashboard.mjs';
import {findCli} from './cli-runtime.mjs';
import {atomicRename} from './core.mjs';

const MAX_CONFIG_BYTES = 256 * 1024, MAX_SKILL_BYTES = 128 * 1024, MAX_REGISTERED = 100;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const missingRevision = 'missing';
const builtinIds = Object.keys(SKILLS).filter(id => id !== 'voice-ask');
const cliAvailable = (provider, options) => {try {return !!(options.cliAvailable || findCli)(provider);} catch {return false;}};
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
const statOrNull = file => {try {return fs.lstatSync(file);} catch (error) {if (error.code === 'ENOENT') return null; throw error;}};
const cleanText = (value, name, max) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\x00-\x1f\x7f]/.test(value)) throw new Error(`Campo inválido (${name}).`);
  return value.trim();
};
function providers(value) {
  if (!Array.isArray(value) || !value.length || value.length > 2 || value.some(p => !['claude','codex'].includes(p)) || new Set(value).size !== value.length) throw new Error('Escolha Claude, Codex ou ambos como provedores.');
  return [...value].sort();
}
function noLinks(file) {
  for (let cursor = path.resolve(file);; cursor = path.dirname(cursor)) {
    if (statOrNull(cursor)?.isSymbolicLink()) throw new Error('As configurações do painel e as skills exigem arquivos e pastas sem links simbólicos.');
    if (cursor === path.dirname(cursor)) break;
  }
}
function configPath(root) {
  const canonical = fs.realpathSync(root), file = path.join(canonical, 'system', 'v2', 'dashboard.json');
  noLinks(file);
  return file;
}
function readBytes(file, maximum) {
  noLinks(file);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.nlink > 1 || stat.size > maximum) throw new Error('Use um arquivo regular que respeite o limite de tamanho.');
    const bytes = fs.readFileSync(fd);
    if (bytes.length > maximum) throw new Error('O arquivo excede o limite de tamanho.');
    return bytes;
  } finally {fs.closeSync(fd);}
}
const skillId = file => 'installed:' + hash(process.platform === 'win32' ? file.toLowerCase() : file).slice(0,24);

function skillFile(input) {
  if (typeof input !== 'string' || !path.isAbsolute(input) || path.basename(input) !== 'SKILL.md' || input.length > 4000 || /[\x00-\x1f\x7f]/.test(input)) throw new Error('Informe o caminho absoluto de um SKILL.md instalado.');
  noLinks(input);
  const file = fs.realpathSync(input), bytes = readBytes(file, MAX_SKILL_BYTES);
  const text = bytes.toString('utf8');
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match || match[1].length > 16000) throw new Error('O cabeçalho YAML de SKILL.md precisa estar dentro do limite de tamanho e conter os campos name e description.');
  let metadata;
  try {metadata = parseYaml(match[1], {schema: JSON_SCHEMA});} catch {throw new Error('O SKILL.md contém metadados YAML inválidos ou duplicados.');}
  if (!plain(metadata)) throw new Error('Os metadados de SKILL.md precisam formar um objeto YAML.');
  const label = cleanText(metadata.name, 'nome da skill', 120);
  // YAML block descriptions commonly contain newlines. Collapse those for UI text.
  const description = cleanText(typeof metadata.description === 'string' ? metadata.description.replace(/\s+/g, ' ') : metadata.description, 'descrição da skill', 1000);
  return {id: skillId(file), path: file, label, description, hash: hash(bytes)};
}

function parseConfig(bytes) {
  let value;
  try {value = JSON.parse(bytes.toString('utf8'));} catch {throw new Error('O arquivo de configurações do painel precisa conter JSON válido para ser atualizado.');}
  if (!plain(value) || value.version !== 1 || !Array.isArray(value.skills) || value.skills.length > MAX_REGISTERED || !Object.hasOwn(value,'selected')) throw new Error('O arquivo de configurações do painel precisa usar um formato compatível para ser atualizado.');
  const seen = new Set();
  for (const entry of value.skills) {
    if (!plain(entry) || !isInstalledSkill(entry.id) || seen.has(entry.id) || typeof entry.path !== 'string' || !path.isAbsolute(entry.path) || path.basename(entry.path) !== 'SKILL.md' || entry.id !== skillId(entry.path) || !/^[a-f0-9]{64}$/.test(entry.hash)) throw new Error('Os dados de uma skill registrada estão inválidos. Corrija o cadastro antes de atualizar o painel.');
    cleanText(entry.label,'rótulo da skill registrada',120); cleanText(entry.description,'descrição da skill registrada',1000); providers(entry.providers); seen.add(entry.id);
  }
  validateDashboardSelection(value.selected, [...builtinIds, ...seen]);
  return value;
}
function readState(root) {
  const file = configPath(root);
  if (!statOrNull(file)) return {file,revision:missingRevision,config:{version:1,selected:null,skills:[]}};
  const bytes = readBytes(file, MAX_CONFIG_BYTES);
  return {file,revision:hash(bytes),config:parseConfig(bytes)};
}
const installedProvidersFor = options => ['claude','codex'].filter(provider => cliAvailable(provider,options));
function catalogFor(config, options, installedProviders = installedProvidersFor(options)) {
  const builtins = builtinIds.map(id => ({id,label:SKILLS[id].label,description:builtinDescription(SKILLS[id]),needs:[...(SKILLS[id].needs||[])],...(SKILLS[id].better?.length ? {better:[...SKILLS[id].better]} : {}),kind:'builtin',...(SKILLS[id].arg ? {arg:SKILLS[id].arg} : {}),...(SKILLS[id].direct ? {direct:true} : {}),providers:['claude','codex'],available:!!SKILLS[id].direct || installedProviders.length > 0,...(!SKILLS[id].direct && !installedProviders.length ? {reason:'Instale o Claude Code ou o Codex e entre na sua conta para executar este fluxo.'} : {})}));
  const installed = config.skills.map(entry => {
    let reason;
    try {
      const current = skillFile(entry.path);
      if (current.id !== entry.id || current.hash !== entry.hash) reason = 'Esta skill mudou. Registre o SKILL.md novamente antes de executá-la.';
    } catch {reason = 'O arquivo desta skill está ausente, vinculado ou inválido. Registre o SKILL.md novamente.';}
    if (!reason && !entry.providers.some(provider => installedProviders.includes(provider))) reason = 'Instale uma ferramenta compatível para usar esta skill.';
    return {id:entry.id,label:entry.label,description:entry.description,kind:'installed',providers:[...entry.providers],available:!reason,...(reason ? {reason} : {})};
  });
  return [...builtins,...installed];
}
const publicState = (state, options) => {
  const installedProviders = installedProvidersFor(options);
  return {revision:state.revision,configured:state.config.selected !== null,selected:state.config.selected === null ? null : [...state.config.selected],installedProviders,catalog:catalogFor(state.config,options,installedProviders)};
};

export function readDashboard(root, options = {}) {
  try {return publicState(readState(root),options);} catch (error) {
    const installedProviders = installedProvidersFor(options);
    return {revision:'invalid',configured:false,selected:null,installedProviders,catalog:catalogFor({skills:[]},options,installedProviders),error:String(error.message || error)};
  }
}

function editConfig(root, revision, update, options) {
  const file = configPath(root);
  fs.mkdirSync(path.dirname(file), {recursive:true}); noLinks(file);
  const lock = file + '.lock'; noLinks(lock);
  let fd;
  try {fd = fs.openSync(lock,'wx',0o600);} catch (error) {
    if (error.code === 'EEXIST') throw new Error('As configurações do painel estão sendo salvas. Atualize e tente novamente. Se o problema persistir, verifique o arquivo dashboard.json.lock depois que os instaladores terminarem.');
    throw error;
  }
  let temp;
  try {
    const state = readState(root);
    if (typeof revision !== 'string' || revision !== state.revision) throw new Error('As configurações do painel mudaram em outra janela. Atualize antes de salvar.');
    const extra = update(state.config) || {};
    const output = Buffer.from(JSON.stringify(state.config,null,2) + '\n');
    if (output.length > MAX_CONFIG_BYTES) throw new Error('As configurações do painel excedem o limite de tamanho.');
    // Validate the entire replacement before writing and preserve unknown fields.
    parseConfig(output);
    temp = file + '.' + crypto.randomUUID() + '.tmp';
    const outputFd = fs.openSync(temp,'wx',0o600);
    try {fs.writeFileSync(outputFd,output);fs.fsyncSync(outputFd);} finally {fs.closeSync(outputFd);}
    if (readState(root).revision !== revision) throw new Error('As configurações do painel mudaram durante o salvamento. Atualize antes de salvar novamente.');
    noLinks(file);
    atomicRename(temp,file); temp = undefined;
    return {...publicState({revision:hash(output),config:state.config},options),...extra};
  } finally {
    if (temp) {try {fs.unlinkSync(temp);} catch {}}
    fs.closeSync(fd); fs.unlinkSync(lock);
  }
}

export function saveDashboard(root, {revision,selected}, options = {}) {
  return editConfig(root,revision,config => {config.selected = validateDashboardSelection(selected,[...builtinIds,...config.skills.map(entry => entry.id)]);},options);
}

export function registerDashboardSkill(root, input, options = {}) {
  const supported = providers(input.providers), skill = skillFile(input.path);
  if (input.label !== undefined) skill.label = cleanText(input.label,'rótulo da skill',120);
  skill.providers = supported;
  return editConfig(root,input.revision,config => {
    const index = config.skills.findIndex(entry => entry.id === skill.id);
    if (index < 0) {
      if (config.skills.length >= MAX_REGISTERED) throw new Error(`É possível registrar até ${MAX_REGISTERED} skills instaladas.`);
      config.skills.push(skill);
    } else config.skills[index] = skill;
    return {registeredId:skill.id};
  },options);
}

export function discoverDashboardSkills(root, {provider,home = os.homedir(),skillRoots} = {}) {
  providers([provider]);
  const roots = skillRoots || (provider === 'claude'
    ? [path.join(home,'.claude','skills'),path.join(root,'.claude','skills')]
    : [path.join(home,'.agents','skills'),path.join(home,'.codex','skills'),path.join(root,'.agents','skills'),path.join(root,'.codex','skills')]);
  const skills = [],seen = new Set();let skipped = 0, visited = 0, examined = 0, truncated = false;
  const walk = (directory,depth) => {
    if (visited >= 300 || examined >= 200) {truncated = true;return;}
    const stat = statOrNull(directory); if (!stat) return;
    if (stat.isSymbolicLink() || !stat.isDirectory()) {skipped++;return;}
    try {noLinks(directory);} catch {skipped++;return;}
    visited++;
    let entries;try {entries = fs.readdirSync(directory,{withFileTypes:true}).sort((a,b) => a.name.localeCompare(b.name));} catch {skipped++;return;}
    if (entries.some(entry => entry.name === 'SKILL.md')) {
      examined++;
      try {
        const skill = skillFile(path.join(directory,'SKILL.md'));
        if (!seen.has(skill.id)) {seen.add(skill.id);skills.push({path:skill.path,label:skill.label,description:skill.description,providers:[provider]});}
      } catch {skipped++;}
      // Skill assets are not other installations. Never traverse their helpers.
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {skipped++;continue;}
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      if (depth >= 4) {truncated = true;continue;}
      walk(path.join(directory,entry.name),depth+1);
    }
  };
  for (const directory of roots) walk(path.resolve(directory),0);
  return {skills,skipped,truncated};
}

export function prepareDashboardSkill(root, {skill,request,selection}, options = {}) {
  const chosen = validateSelection(selection);
  if (!isInstalledSkill(skill)) throw new Error('Escolha uma skill instalada e registrada.');
  if (typeof request !== 'string' || request.length > 6000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(request)) throw new Error('Descreva a tarefa em até 6.000 caracteres.');
  const state = readState(root),entry = state.config.skills.find(item => item.id === skill);
  if (!entry) throw new Error('Esta skill instalada não está registrada. Atualize o painel.');
  if (!entry.providers.includes(chosen.provider)) throw new Error(`Esta skill não está registrada para ${chosen.provider}. Escolha um provedor compatível.`);
  if (!cliAvailable(chosen.provider,options)) throw new Error(`A CLI de ${chosen.provider} não está instalada.`);
  const current = skillFile(entry.path);
  if (current.id !== entry.id || current.hash !== entry.hash) throw new Error('Esta skill mudou. Registre o SKILL.md novamente antes de executá-la.');
  const prompt = `Use the installed skill ${JSON.stringify(entry.label)}. First read its exact SKILL.md at ${JSON.stringify(entry.path)}; resolve its relative references from ${JSON.stringify(path.dirname(entry.path))}. Respond in Brazilian Portuguese by default unless the user requests another language. This is an interactive task, so ask for missing requirements and surface permission requests. Do not assume any dependency, connector, account, or helper is available. Follow the user's request and applicable permission rules; selecting this skill does not by itself authorize publishing, sending messages, purchases, or other external account changes. Never reveal credentials.\n\nUser request:\n${request.trim() || 'Help me use this skill. Ask me what you need to get started.'}`;
  return {prompt,title:entry.label,selection:chosen};
}

// TerminalManager's ordinary replay guard intentionally predates model-specific
// dashboard launches. Bind retries to the complete accepted launch selection.
export function assertDashboardReplay(existing, prepared, appScope = 'web') {
  if (!existing) return;
  if (existing.model !== prepared.selection.model) throw new Error('O ID da tarefa já foi usado com outro modelo.');
  if (existing.provider !== prepared.selection.provider || existing.prompt !== prepared.prompt || ![undefined,'native'].includes(existing.execution) || (existing.execution === 'native') !== (appScope === 'native')) throw new Error('O ID da tarefa já foi usado por outro pedido ou aplicativo.');
}
