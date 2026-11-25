// Read-only discovery: fixed metadata locations, never notes, credentials or source contents.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_BYTES = 64 * 1024, MAX_PATHS = 32, MAX_READS = 256;
const V2 = 'agentic-os-v2', V1 = 'chase-command-center';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unique = values => [...new Set(values)];
const labels = {'starter-v2': 'Agentic OS V2 (pacote inicial)', v2: 'Agentic OS V2', v1: 'Primeira versão do Agentic OS', unknown: 'Instalação não confirmada'};
const pathErrors = {
  'invalid path': 'caminho inválido',
  'path is too deep': 'caminho com níveis demais',
  'linked path': 'caminho com link simbólico',
  'invalid parent folder': 'pasta superior inválida',
  'not a folder': 'o caminho não aponta para uma pasta',
  'not an ordinary unlinked file': 'o caminho precisa apontar para um arquivo comum sem links',
  missing: 'caminho inexistente',
  unreadable: 'caminho inacessível',
};

/** No network is performed unless getMonitor is supplied. Explicit home isolates default env paths. */
export async function discoverInstallations(options = {}) {
  const {home = os.homedir(), platform = process.platform, env = options.home === undefined ? process.env : {}, root, install, vault, getMonitor} = options;
  const explicitSelection = install !== undefined || vault !== undefined;
  const warnings = [], searched = [], candidates = [], installs = new Map(), vaults = new Map(), cache = new Map();
  const key = value => platform === 'win32' ? value.toLowerCase() : value;
  const warn = message => { if (!warnings.includes(message)) warnings.push(message); };
  let reads = 0;

  function absolute(value) {
    if (typeof value !== 'string' || !value || value.length > 4096 || /[\x00-\x1f\x7f]/.test(value) || !path.isAbsolute(value)) return null;
    if (value.split(/[\\/]/).some(part => part === '..') || /^(?:\\\\|\/\/)/.test(value)) return null;
    if (process.platform === 'win32' && (!/^[a-z]:[\\/]/i.test(value) || value.slice(2).includes(':') || value.slice(3).split(/[\\/]/).some(part => /[. ]$/.test(part)))) return null;
    // macOS exposes these system-owned aliases; canonicalize only these known prefixes.
    if (process.platform === 'darwin') {
      for (const alias of ['/var', '/tmp']) {
        if ((value === alias || value.startsWith(alias + '/')) && fs.realpathSync(alias) === '/private' + alias) value = '/private' + value;
      }
    }
    return path.resolve(value);
  }

  function inspect(value, type) {
    const target = absolute(value);
    if (!target) return {error: 'invalid path'};
    const parsed = path.parse(target), pieces = target.slice(parsed.root.length).split(path.sep).filter(Boolean);
    if (pieces.length > 128) return {error: 'path is too deep'};
    let current = parsed.root, stat;
    try {
      for (let index = 0; index < pieces.length; index++) {
        current = path.join(current, pieces[index]);
        stat = fs.lstatSync(current);
        if (stat.isSymbolicLink()) return {error: 'linked path'};
        if (index < pieces.length - 1 && !stat.isDirectory()) return {error: 'invalid parent folder'};
      }
      stat ||= fs.lstatSync(target);
      if (type === 'directory' && !stat.isDirectory()) return {error: 'not a folder'};
      if (type === 'file' && (!stat.isFile() || stat.nlink !== 1)) return {error: 'not an ordinary unlinked file'};
      return {path: target, stat};
    } catch (error) { return {error: error.code === 'ENOENT' ? 'missing' : 'unreadable'}; }
  }

  function metadata(file, label) {
    const id = key(file);
    if (cache.has(id)) return cache.get(id);
    if (reads >= MAX_READS) { warn('O limite de leitura de metadados foi atingido. A busca está incompleta.'); return null; }
    reads++;
    searched.push(file);
    const checked = inspect(file, 'file');
    if (checked.error) {
      if (checked.error !== 'missing') warn(`${label}: ${pathErrors[checked.error]}.`);
      cache.set(id, null); return null;
    }
    let fd;
    try {
      if (checked.stat.size > MAX_BYTES) throw new Error('size');
      fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      const before = fs.fstatSync(fd);
      if (!before.isFile() || before.nlink !== 1 || before.size > MAX_BYTES || before.ino !== checked.stat.ino || before.dev !== checked.stat.dev) throw new Error('changed');
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      let length = 0, count;
      do { count = fs.readSync(fd, buffer, length, buffer.length - length, length); length += count; } while (count && length < buffer.length);
      const after = inspect(file, 'file');
      if (length > MAX_BYTES || after.error || after.stat.ino !== before.ino || after.stat.dev !== before.dev || after.stat.size !== length) throw new Error('changed');
      const data = JSON.parse(buffer.subarray(0, length).toString('utf8').replace(/^\uFEFF/, ''));
      if (!object(data)) throw new Error('shape');
      cache.set(id, data); return data;
    } catch { warn(`${label}: metadados inválidos, acima do limite de tamanho ou alterados durante a leitura.`); cache.set(id, null); return null; }
    finally { if (fd !== undefined) fs.closeSync(fd); }
  }

  function queue(map, value, evidence, {explicit = false, installed = false, vaultPath} = {}) {
    const normalized = absolute(value);
    if (!normalized) { warn(`${evidence}: caminho local inválido, ignorado na busca.`); return; }
    const id = key(normalized), prior = map.get(id);
    if (prior) {
      const changed = !prior.evidence.includes(evidence) || (explicit && !prior.explicit) || (installed && !prior.installed) || (vaultPath && !prior.vaultPaths.includes(vaultPath));
      prior.evidence = unique([...prior.evidence, evidence]); prior.explicit ||= explicit; prior.installed ||= installed;
      if (vaultPath && !prior.vaultPaths.includes(vaultPath)) prior.vaultPaths.push(vaultPath);
      if (changed) prior.done = false;
      return;
    }
    if (map.size >= MAX_PATHS) { warn('O limite de instalações ou cofres foi atingido. A busca está incompleta.'); return; }
    map.set(id, {path: normalized, evidence: [evidence], explicit, installed, vaultPaths: vaultPath ? [vaultPath] : [], done: false});
  }

  function add(value) {
    value.label = labels[value.kind];
    value.evidence = unique(value.evidence); value.warnings = unique(value.warnings || []);
    const same = (a, b) => a && b && key(a) === key(b);
    const exact = candidates.find(item => (item.installPath ? same(item.installPath, value.installPath) : !value.installPath) && (item.vaultPath ? same(item.vaultPath, value.vaultPath) : !value.vaultPath));
    if (exact) {
      const rank = {unknown: 0, v1: 1, v2: 2, 'starter-v2': 3};
      if (rank[value.kind] > rank[exact.kind]) { exact.kind = value.kind; exact.label = value.label; }
      exact.evidence = unique([...exact.evidence, ...value.evidence]); exact.warnings = unique([...exact.warnings, ...value.warnings]); return;
    }
    if (value.installPath && value.vaultPath) {
      for (let index = candidates.length - 1; index >= 0; index--) {
        const item = candidates[index];
        if ((!item.vaultPath && same(item.installPath, value.installPath)) || (!item.installPath && same(item.vaultPath, value.vaultPath))) {
          value.evidence = unique([...value.evidence, ...item.evidence]); value.warnings = unique([...value.warnings, ...item.warnings]); candidates.splice(index, 1);
        }
      }
    } else {
      const associated = candidates.filter(item => item.installPath && item.vaultPath && (same(item.installPath, value.installPath) || same(item.vaultPath, value.vaultPath)));
      if (associated.length) { for (const item of associated) item.evidence = unique([...item.evidence, ...value.evidence]); return; }
    }
    candidates.push(value);
  }

  function runtimeOwner(value, evidence, vaultPath) {
    const runtime = absolute(value);
    if (!runtime || path.basename(runtime) !== '.runtime') { warn(`${evidence}: não aponta para uma pasta de execução válida.`); return; }
    const checked = inspect(runtime, 'directory');
    if (checked.error && checked.error !== 'missing') { warn(`${evidence}: pasta de execução ignorada (${pathErrors[checked.error]}).`); return; }
    queue(installs, path.dirname(runtime), evidence, {installed: true, vaultPath});
  }

  if (install !== undefined) queue(installs, install, 'Caminho de instalação informado', {explicit: true});
  if (vault !== undefined) queue(vaults, vault, 'Caminho do cofre informado', {explicit: true});
  if (!explicitSelection && root !== undefined) queue(installs, root, 'Clone atual');
  const homePath = absolute(home);
  if (!explicitSelection && homePath && !inspect(homePath, 'directory').error) {
    for (const parts of [['agentic-os'], ['agentic-os-starter-v2'], ['agentic-os-starter'], ['Documents', 'agentic-os'], ['Documents', 'agentic-os-starter-v2'], ['Desktop', 'agentic-os'], ['Projects', 'agentic-os']]) queue(installs, path.join(homePath, ...parts), 'Local típico de instalação');
    const config = platform === 'win32' ? absolute(env?.APPDATA) || path.join(homePath, 'AppData', 'Roaming')
      : platform === 'darwin' ? path.join(homePath, 'Library', 'Application Support') : absolute(env?.XDG_CONFIG_HOME) || path.join(homePath, '.config');
    const registry = metadata(path.join(config, 'obsidian', 'obsidian.json'), 'Registro de cofres do Obsidian');
    if (registry) {
      if (!object(registry.vaults)) warn('A lista de cofres no registro do Obsidian é inválida.');
      else {
        const entries = Object.values(registry.vaults);
        if (entries.length > MAX_PATHS) warn('O limite de cofres do registro do Obsidian foi atingido. A busca está incompleta.');
        for (const item of entries.slice(0, MAX_PATHS)) {
          if (object(item)) queue(vaults, item.path, 'Registro de cofres do Obsidian');
          else warn('O registro de cofres do Obsidian contém uma entrada inválida.');
        }
      }
    }
  } else if (!explicitSelection) warn('A pasta pessoal estava indisponível. A busca ignorou os locais típicos de instalação.');

  if (!explicitSelection && typeof getMonitor === 'function') {
    searched.push('http://127.0.0.1:3221/status');
    let timer;
    try {
      const monitor = await Promise.race([Promise.resolve().then(() => getMonitor('http://127.0.0.1:3221/status', {timeoutMs: 1200})), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 1500); })]);
      if (monitor !== null && monitor !== undefined) {
        if (object(monitor) && monitor.kind === 'agentic-os-service-supervisor') runtimeOwner(monitor.runtimeDir, 'Monitor de serviços locais');
        else warn('O monitor local não retornou metadados de uma instalação reconhecida.');
      }
    } catch { warn('O monitor local estava indisponível. A busca continuou pelas outras fontes.'); }
    finally { clearTimeout(timer); }
  }

  // Only metadata references extend these bounded queues; there is no directory traversal.
  while ([...vaults.values(), ...installs.values()].some(item => !item.done)) {
    for (const item of vaults.values()) {
      if (item.done) continue;
      item.done = true; searched.push(item.path);
      const checked = inspect(item.path, 'directory');
      if (checked.error) {
        if (item.explicit && checked.error === 'missing') add({vaultPath: item.path, kind: 'unknown', evidence: item.evidence, warnings: ['A pasta do cofre informado não foi encontrada.']});
        else if (checked.error !== 'missing' || item.explicit) warn(`Pasta do cofre ignorada: ${pathErrors[checked.error]}.`);
        continue;
      }
      const plugin = path.join(item.path, '.obsidian', 'plugins');
      const current = metadata(path.join(plugin, V2, 'manifest.json'), 'Manifesto do plugin V2 no cofre');
      const legacy = metadata(path.join(plugin, V1, 'manifest.json'), 'Manifesto do plugin V1 no cofre');
      const v2 = current?.id === V2, v1 = legacy?.id === V1;
      if (v2) {
        const evidence = [...item.evidence, 'Manifesto do plugin V2 no cofre'];
        const marker = metadata(path.join(plugin, V2, 'terminal-runtime.json'), 'Referência à pasta de execução do terminal do V2');
        const notes = v1 ? ['O painel da primeira versão também está instalado neste cofre.'] : [];
        add({vaultPath: item.path, kind: 'v2', evidence, warnings: notes});
        if (marker && (marker.vault === undefined || (absolute(marker.vault) && key(absolute(marker.vault)) === key(item.path)))) runtimeOwner(marker.runtimeDir, 'Referência à pasta de execução do terminal do V2', item.path);
        else if (marker) warn('A referência à pasta de execução do terminal do V2 aponta para outro cofre. A instalação indicada nela foi ignorada.');
      } else if (v1) add({vaultPath: item.path, kind: 'v1', evidence: [...item.evidence, 'Manifesto do plugin V1 no cofre'], warnings: []});
      else if (item.explicit) add({vaultPath: item.path, kind: 'unknown', evidence: item.evidence, warnings: ['Nenhum manifesto de plugin do Agentic OS foi reconhecido.']});
    }
    for (const item of installs.values()) {
      if (item.done) continue;
      item.done = true; searched.push(item.path);
      const checked = inspect(item.path, 'directory');
      if (checked.error) {
        if (item.explicit && checked.error === 'missing') add({installPath: item.path, kind: 'unknown', evidence: item.evidence, warnings: ['A pasta de instalação informada não foi encontrada.']});
        else if (checked.error !== 'missing' || item.installed) warn(`Pasta de instalação ignorada: ${pathErrors[checked.error]}.`);
        continue;
      }
      let bridge = item.path, installPath = item.path;
      let manifest = metadata(path.join(bridge, 'manifest.json'), 'Manifesto da instalação');
      if (manifest?.id !== V2 && manifest?.id !== V1) {
        const nested = metadata(path.join(bridge, 'obsidian-v2', 'manifest.json'), 'Manifesto da ponte do pacote inicial');
        if (nested?.id === V2) { bridge = path.join(bridge, 'obsidian-v2'); manifest = nested; }
      }
      const packaged = manifest?.id === V2 && path.basename(bridge) === 'obsidian-v2' && !inspect(path.join(path.dirname(bridge), 'aos.mjs'), 'file').error;
      if (packaged) installPath = path.dirname(bridge);
      const state = metadata(path.join(bridge, '.runtime', 'aos-setup.json'), 'Registro de configuração do instalador');
      const associationWarnings = [];
      let savedVault = state && absolute(state.vault);
      if (savedVault) {
        const checkedVault = inspect(savedVault, 'directory');
        if (checkedVault.error && checkedVault.error !== 'missing') {
          warn(`Referência ao cofre no instalador ignorada: ${pathErrors[checkedVault.error]}.`);
          associationWarnings.push('Não foi possível verificar com segurança a referência salva do cofre. Confirme a localização.'); savedVault = null;
        }
      }
      if (state && !savedVault) { warn('O registro de configuração do instalador não contém um caminho válido para o cofre.'); associationWarnings.push('O caminho do cofre no registro de configuração do instalador não pôde ser usado.'); }
      if (savedVault) queue(vaults, savedVault, 'Registro de configuração do instalador');
      const installed = item.installed || !!savedVault;
      if (!installed && !item.explicit) continue;
      const recognized = [V1, V2].includes(manifest?.id);
      const kind = installed && recognized ? packaged ? 'starter-v2' : manifest.id === V1 ? 'v1' : 'v2' : 'unknown';
      const evidence = [...item.evidence, ...(savedVault ? ['Registro de configuração do instalador'] : []), ...(manifest?.id === V2 ? ['Manifesto da instalação V2'] : manifest?.id === V1 ? ['Manifesto da instalação V1'] : [])];
      const notes = [...associationWarnings, ...(!installed ? ['Não há indícios de que o sistema esteja instalado. Esta pode ser uma cópia de referência.'] : !recognized ? ['A referência à instalação precisa ser confirmada por um manifesto reconhecido no código-fonte.'] : [])];
      const paths = unique([...item.vaultPaths, ...(savedVault ? [savedVault] : [])]);
      if (paths.length > 1) notes.push('Esta instalação tem referências a mais de um cofre. Confirme qual está em uso.');
      if (install !== undefined && vault !== undefined && savedVault && absolute(vault) && key(savedVault) !== key(absolute(vault))) notes.push('O cofre informado difere do cofre salvo na instalação. Confirme qual deles a instalação deve usar.');
      for (const vaultPath of paths.length ? paths : [undefined]) {
        const candidateWarnings = [...notes];
        if (vaultPath) {
          const associated = inspect(vaultPath, 'directory');
          if (associated.error === 'missing') candidateWarnings.push('A pasta do cofre associado não existe mais. Confirme a localização antes de atualizar.');
          else if (associated.error) candidateWarnings.push('Não foi possível verificar com segurança a pasta do cofre associado.');
          else {
            const expected = manifest?.id === V1 ? V1 : V2;
            const plugin = metadata(path.join(vaultPath, '.obsidian', 'plugins', expected, 'manifest.json'), 'Manifesto do plugin no cofre associado');
            if (plugin?.id !== expected) candidateWarnings.push('O cofre associado não tem o manifesto do plugin do Agentic OS correspondente. Confirme qual instalação ele usa.');
          }
        } else candidateWarnings.push('Nenhum cofre associado foi identificado. Confirme qual é o cofre antes de atualizar.');
        add({installPath, ...(vaultPath ? {vaultPath} : {}), kind, evidence, warnings: candidateWarnings});
      }
    }
  }
  if (candidates.length > 1) warn('A busca encontrou mais de uma opção de instalação ou cofre. Confira os indícios e confirme a escolha.');
  return {candidates, warnings, searched: unique(searched)};
}
