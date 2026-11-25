// Read-only, offline assessment of the stock starter checkout. The saved origin
// refs are evidence, not a fresh verification of GitHub or a proof that every
// possible customization is absent. Uncertain checkouts require an upgrade review.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const protectedNames = new Set(['jev.json', 'bridge-auth.json', 'providers.json', '.credentials.json']);
const protectedDirectories = new Set(['.runtime', '.credentials', 'credentials', '.secrets', 'secrets']);
const officialOrigins = new Map(['ctskool/agentic-os-starter-v2', 'davioliveeira/agentic-os-starter-v2'].flatMap(repository => {
  const base = `https://github.com/${repository}`;
  const https = `${base}.git`;
  // Assemble the public SSH address so the export's private-email scan remains strict.
  const ssh = ['git', `github.com:${repository}.git`].join('@');
  return [[base, https], [https, https], [ssh, https]];
}));
// Git for Windows rejects Node's \\.\nul spelling; its native NUL device works.
const gitNull = process.platform === 'win32' ? 'NUL' : os.devNull;
const controls = /[\x00-\x1f\x7f-\x9f]/;
const samePath = (left, right) => process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
const safeRelative = name => typeof name === 'string' && name.length < 4096 && !controls.test(name) && !path.isAbsolute(name) && !name.includes('\\') && name.split('/').every(part => part && part !== '.' && part !== '..');
const protectedPath = name => name.split('/').some(part => { const lower = part.toLowerCase(); return protectedNames.has(lower) || protectedDirectories.has(lower) || lower === '.env' || lower.startsWith('.env.'); });
const inspect = file => { try { return fs.lstatSync(file); } catch { return null; } };
const assessmentContexts = new WeakMap();
const inside = (folder, candidate) => { const relative = path.relative(folder, candidate); return !relative || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)); };

function noLinks(file, checked = new Set()) {
  let current = path.resolve(file);
  while (!checked.has(current)) {
    const stat = inspect(current);
    if (stat?.isSymbolicLink() || (stat?.isFile() && stat.nlink !== 1)) throw new Error('Arquivos ou pastas com links exigem uma avaliação antes da atualização.');
    checked.add(current);
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
}
function smallFile(file, maxBytes, checked) {
  noLinks(file, checked);
  const stat = inspect(file);
  if (!stat?.isFile() || stat.size > maxBytes) throw new Error('Os metadados da cópia local estão ausentes, inacessíveis ou acima do limite de tamanho para uma avaliação segura.');
  return fs.readFileSync(file, 'utf8');
}
function trustedGitContext(repositoryPath, sourceEnv) {
  // Windows searches cwd before PATH for an unqualified executable. Resolve the
  // real binary ourselves and never consider a relative or checkout-owned PATH.
  const suppliedPath = Object.entries(sourceEnv).find(([key]) => key.toUpperCase() === 'PATH')?.[1] || '';
  const directories = [];
  for (let directory of suppliedPath.split(path.delimiter)) {
    if (directory.startsWith('"') && directory.endsWith('"')) directory = directory.slice(1, -1);
    if (!path.isAbsolute(directory) || controls.test(directory) || inside(repositoryPath, directory) || (process.platform === 'win32' && directory.startsWith('\\\\'))) continue;
    try {
      directory = fs.realpathSync.native(directory);
      if (!inside(repositoryPath, directory) && fs.statSync(directory).isDirectory()) directories.push(directory);
    } catch { /* Missing PATH entries are not searched. */ }
  }
  let executable;
  for (const directory of directories) {
    try {
      const candidate = fs.realpathSync.native(path.join(directory, process.platform === 'win32' ? 'git.exe' : 'git'));
      if (inside(repositoryPath, candidate) || !fs.statSync(candidate).isFile()) continue;
      if (process.platform !== 'win32') fs.accessSync(candidate, fs.constants.X_OK);
      executable = candidate; break;
    } catch { /* No trusted Git executable in this PATH entry. */ }
  }
  if (!executable) throw new Error('Nenhum executável do Git foi encontrado fora desta cópia local.');
  const inherited = Object.fromEntries(Object.entries(sourceEnv).filter(([key]) => !/^GIT_/i.test(key) && key.toUpperCase() !== 'PATH'));
  const env = Object.freeze({...inherited, PATH: directories.join(path.delimiter), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitNull, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_ATTR_NOSYSTEM: '1', GIT_NO_LAZY_FETCH: '1'});
  const args = Object.freeze(['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=' + gitNull, '-c', 'core.untrackedCache=false', '-c', 'core.preloadIndex=false', '-c', 'credential.helper=', '-c', 'core.askPass=']);
  return Object.freeze({repositoryPath, executable, env, args});
}
function gitReader(context, run) {
  return args => {
    let result;
    try {
      result = run(context.executable, [...context.args, ...args],
        {cwd: context.repositoryPath, env: {...context.env}, encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
    } catch { return {ok: false, status: null, text: ''}; }
    if (result?.error || result?.signal || !Number.isInteger(result?.status) || typeof result.stdout !== 'string' || result.stdout.length > 2 * 1024 * 1024) return {ok: false, status: null, text: ''};
    return {ok: result.status === 0, status: result.status, text: result.stdout};
  };
}
function nulRecords(text) {
  if (!text) return [];
  if (!text.endsWith('\0')) throw new Error('O Git retornou uma lista de arquivos incompleta.');
  return text.slice(0, -1).split('\0');
}
function changedFiles(text) {
  const records = nulRecords(text), changes = new Set(); let privateChanges = false, unusualNames = false;
  const add = name => { if (!safeRelative(name)) unusualNames = true; else if (protectedPath(name)) privateChanges = true; else changes.add(name); };
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (record.length < 4 || record[2] !== ' ' || !/^[ MADRCUT?!]{2}$/.test(record.slice(0, 2))) throw new Error('O Git retornou uma lista de alterações em um formato desconhecido.');
    add(record.slice(3));
    if (/[RC]/.test(record.slice(0, 2))) {
      if (++index >= records.length) throw new Error('O Git retornou uma lista incompleta de arquivos renomeados.');
      add(records[index]);
    }
  }
  return {changes: [...changes].sort().slice(0, 200), privateChanges, unusualNames, count: records.length};
}

export function assessCheckout(installPath, {run = spawnSync, env = process.env} = {}) {
  const result = {repositoryPath: '', kind: 'unknown', updateAllowed: false, issues: [], changes: []};
  const issue = message => { result.issues.push(message); return result; };
  try {
    if (typeof installPath !== 'string' || !installPath || controls.test(installPath)) return issue('Escolha uma pasta de instalação com um caminho absoluto válido.');
    const supplied = path.resolve(installPath), checked = new Set();
    noLinks(supplied, checked);
    if (!inspect(supplied)?.isDirectory()) return issue('O caminho de instalação precisa apontar para uma pasta existente.');
    const repositoryPath = fs.realpathSync.native(path.basename(supplied).toLowerCase() === 'obsidian-v2' ? path.dirname(supplied) : supplied);
    result.repositoryPath = repositoryPath;
    for (const [name, directory] of [['aos.mjs', false], ['obsidian-v2', true], ['jarvis-v2', true], ['VERSION.json', false]]) {
      const file = path.join(repositoryPath, name); noLinks(file, checked);
      const stat = inspect(file);
      if (!stat || (directory ? !stat.isDirectory() : !stat.isFile())) return issue('Esta pasta não tem toda a estrutura do pacote inicial exportado.');
    }
    let version;
    try { version = JSON.parse(smallFile(path.join(repositoryPath, 'VERSION.json'), 8192, checked)); } catch { return issue('Os metadados de versão do pacote inicial estão ausentes ou são inválidos.'); }
    if (!version || typeof version.plugin !== 'string' || !version.plugin || typeof version.hud !== 'string' || !version.hud || !/^[a-f0-9]{7,64}$/.test(version.bridgeCommit) || !/^[a-f0-9]{7,64}$/.test(version.hudCommit)) return issue('Os metadados de versão do pacote inicial estão ausentes ou são inválidos.');
    const gitDir = path.join(repositoryPath, '.git'); noLinks(gitDir, checked);
    if (!inspect(gitDir)?.isDirectory()) return issue('É preciso usar um clone comum do Git. Metadados do Git ausentes ou worktrees vinculadas exigem uma avaliação antes da atualização.');
    for (const name of ['HEAD', 'index', 'packed-refs', 'objects', 'refs', 'refs/heads/main', 'refs/remotes/origin/main', 'info/exclude']) noLinks(path.join(gitDir, name), checked);
    for (const name of ['commondir', 'objects/info/alternates']) {
      noLinks(path.join(gitDir, name), checked);
      if (inspect(path.join(gitDir, name))) return issue('Metadados do Git redirecionados exigem uma avaliação antes da atualização.');
    }
    for (const name of ['config', 'config.worktree']) {
      const file = path.join(gitDir, name); noLinks(file, checked);
      if (name === 'config' || inspect(file)) {
        const config = smallFile(file, 256 * 1024, checked);
        // Reject includes before Git can follow a local include to another file.
        if (/\[\s*include(?:if)?\b/i.test(config)) return issue('A configuração do Git inclui outros arquivos. Revise esta cópia local antes de atualizar.');
      }
    }
    const excludeFile = path.join(gitDir, 'info', 'exclude');
    if (inspect(excludeFile) && smallFile(excludeFile, 64 * 1024, checked).split(/\r?\n/).some(line => line.trim() && !line.trim().startsWith('#'))) return issue('As regras locais de exclusão do Git podem ocultar arquivos do usuário. Revise esta cópia local antes de atualizar.');
    let context;
    try { context = trustedGitContext(repositoryPath, env); } catch { return issue('Não foi possível localizar com segurança um executável do Git fora desta cópia local.'); }
    const git = gitReader(context, run);
    const top = git(['rev-parse', '--show-toplevel']);
    if (!top.ok) return issue('O Git está indisponível ou não conseguiu ler esta cópia local com segurança.');
    const topPath = top.text.trim();
    if (controls.test(topPath) || !path.isAbsolute(topPath) || !samePath(path.resolve(topPath), repositoryPath)) return issue('A raiz do repositório Git não corresponde à pasta de instalação do pacote inicial.');
    const configuration = git(['config', '--local', '--no-includes', '--name-only', '--get-regexp', '^(filter\\.|core\\.(worktree|attributesfile|excludesfile)|extensions\\.(worktreeconfig|partialclone)|remote\\..*\\.(promisor|partialclonefilter)|url\\.)']);
    if (configuration.status !== 1 && !configuration.ok) return issue('Não foi possível verificar a configuração do Git com segurança.');
    if (configuration.ok && configuration.text.trim()) return issue('Filtros do Git, redirecionamentos de arquivos, reescritas de URL e clones parciais ou com remoto do tipo promisor exigem uma avaliação antes da atualização. Nenhum auxiliar configurado foi executado e nenhuma solicitação de rede foi feita.');
    const origin = git(['config', '--local', '--no-includes', '--get-all', 'remote.origin.url']);
    if (!origin.ok || !origin.text.trim()) return issue('Não foi possível verificar o remoto origin desta cópia local.');
    const officialHttps = officialOrigins.get(origin.text.trim());
    if (!officialHttps) { result.kind = 'customized'; return issue('O remoto origin não corresponde a um repositório oficial do pacote inicial.'); }
    const head = git(['rev-parse', '--verify', 'HEAD']);
    if (!head.ok || !/^[a-f0-9]{40,64}$/.test(head.text.trim())) return issue('Não foi possível verificar o commit atual do Git.');
    result.head = head.text.trim();
    const branch = git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
    if (!branch.ok || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/.test(branch.text.trim())) return issue('A cópia local está com HEAD destacado ou não foi possível verificar a branch.');
    result.branch = branch.text.trim();
    if (result.branch !== 'main') { result.kind = 'customized'; return issue('Esta cópia local usa uma branch diferente de main.'); }
    const upstream = git(['rev-parse', '--symbolic-full-name', '@{upstream}']);
    const branchRemote = git(['config', '--local', '--no-includes', '--get-all', 'branch.main.remote']);
    const branchMerge = git(['config', '--local', '--no-includes', '--get-all', 'branch.main.merge']);
    if (!upstream.ok || upstream.text.trim() !== 'refs/remotes/origin/main' || !branchRemote.ok || branchRemote.text.trim() !== 'origin' || !branchMerge.ok || branchMerge.text.trim() !== 'refs/heads/main') return issue('A branch main não acompanha origin/main conforme esperado.');
    const index = git(['ls-files', '--stage', '-v', '-z']);
    if (!index.ok) return issue('Não foi possível listar com segurança os arquivos rastreados pelo Git.');
    const tracked = new Set();
    for (const record of nulRecords(index.text)) {
      const match = /^([A-Za-z?]) ([0-7]{6}) ([a-f0-9]{40,64}) ([0-3])\t(.+)$/.exec(record);
      if (!match || !safeRelative(match[5])) return issue('Os metadados dos arquivos rastreados contêm entradas ou nomes de arquivos incompatíveis.');
      const [, flag, mode, , stage, name] = match;
      if (protectedPath(name)) return issue('Arquivos de configuração protegidos estão sendo rastreados pelo Git. Revise esta cópia local sem ler o conteúdo desses arquivos.');
      if (flag !== 'H' || stage !== '0' || !['100644', '100755'].includes(mode)) return issue('Arquivos com links, submódulos, conflitos de merge ou alterações ocultas em arquivos rastreados exigem uma avaliação antes da atualização.');
      noLinks(path.join(repositoryPath, name), checked); tracked.add(name);
    }
    if (!tracked.has('aos.mjs') || !tracked.has('VERSION.json')) return issue('O Git não está rastreando o script de inicialização do pacote inicial ou os metadados de versão.');
    const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=all']);
    if (!status.ok) return issue('O Git não conseguiu concluir com segurança a busca por arquivos alterados ou não rastreados.');
    const changed = changedFiles(status.text); result.changes = changed.changes;
    if (changed.count) {
      result.kind = 'customized';
      issue('Esta cópia local tem arquivos alterados, preparados para commit ou não rastreados pelo Git.');
      if (changed.privateChanges) issue('Os nomes de arquivos de configuração protegidos foram omitidos da lista de alterações.');
      if (changed.unusualNames) issue('Nomes de arquivos com caracteres incompatíveis foram omitidos da lista de alterações.');
      if (changed.count > 200) issue('A lista de alterações mostra até os 200 primeiros caminhos.');
      return result;
    }
    const divergence = git(['rev-list', '--left-right', '--count', 'HEAD...refs/remotes/origin/main']);
    const counts = divergence.ok && /^(\d+)\s+(\d+)\s*$/.exec(divergence.text);
    if (!counts) return issue('Não foi possível comparar os commits locais com a referência salva de origin/main.');
    if (Number(counts[1]) !== 0) { result.kind = 'customized'; return issue('Os commits locais estão à frente da referência salva de origin/main ou divergem dela.'); }
    result.kind = 'stock-starter'; result.updateAllowed = true; assessmentContexts.set(result, Object.freeze({...context, officialHttps})); return result;
  } catch {
    // Filesystem and Git errors can contain private paths or configuration values.
    return issue('Não foi possível avaliar esta cópia local com segurança. Revise-a antes de atualizar.');
  }
}

// Preparing the updater requires an assessment made by this module, not a JSON
// object claiming success. It binds the same trusted executable and environment
// before services are touched. Only invoking this returned function uses network.
export function prepareStockUpdate(assessment, {run = spawnSync, log = console.log} = {}) {
  const context = assessmentContexts.get(assessment);
  if (!context || assessment.updateAllowed !== true) throw new Error('É preciso ter uma avaliação recente e confiável da cópia local antes de atualizar. Rode `node aos.mjs upgrade`.');
  return () => {
    log('-> Baixando a versão oficial mais recente do pacote inicial (somente fast-forward)');
    let result;
    try {
      result = run(context.executable, [...context.args,
        '-c', 'protocol.allow=never', '-c', 'protocol.https.allow=always', '-c', 'http.followRedirects=false', '-c', 'http.extraHeader=', '-c', 'http.cookieFile=',
        'pull', '--ff-only', '--no-rebase', '--no-autostash', '--no-recurse-submodules', context.officialHttps, 'refs/heads/main:refs/remotes/origin/main'],
        {cwd: context.repositoryPath, env: {...context.env}, encoding: 'utf8', windowsHide: true, timeout: 5 * 60 * 1000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
    } catch { throw new Error('Não foi possível atualizar o pacote inicial oficial. Os serviços continuam parados. Rode `node aos.mjs start` para retomar a instalação atual e depois avalie a atualização com `node aos.mjs upgrade`.'); }
    if (result?.status !== 0 || result.error || result.signal) throw new Error('Não foi possível atualizar o pacote inicial oficial. Os serviços continuam parados. Rode `node aos.mjs start` para retomar a instalação atual e depois avalie a atualização com `node aos.mjs upgrade`.');
  };
}
