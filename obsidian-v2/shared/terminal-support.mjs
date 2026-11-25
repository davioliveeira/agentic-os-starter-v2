// Which versions of the Terminal community plugin (by polyipseity) the Obsidian
// integration works with. The plugin reaches into Terminal's internals (view
// state, profile fields, emulator and process access), so a version is either
// verified against its sources or treated with care. Shared by the plugin and
// the doctor; keep it browser-compatible (no Node imports).
export const VERIFIED_TERMINAL_VERSIONS = Object.freeze(['3.27.1', '3.27.2']);
export const JARVIS_URL = 'http://127.0.0.1:3217';

const IDENT = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const SEMVER = new RegExp(`^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-(${IDENT}(?:\\.${IDENT})*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`);

function parse(version) {
  const match = SEMVER.exec(version);
  return match ? {core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4] || ''} : null;
}
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const verified = VERIFIED_TERMINAL_VERSIONS.map(parse);
const lowest = verified[0].core, highest = verified[verified.length - 1].core;
const tested = VERIFIED_TERMINAL_VERSIONS.join(', ');

/** status: 'missing' | 'verified' | 'untested' | 'unsupported'.
 * Only 'verified' and 'untested' may open conversations; 'untested' (a stable
 * 3.x newer than every verified version) always comes with its message. */
export function terminalSupport(version) {
  if (version === undefined || version === null || (typeof version === 'string' && !version.trim())) return {status: 'missing', version: null,
    message: `Conversas no Obsidian exigem o plugin da comunidade Terminal, de polyipseity. Instale-o em Configurações → Plugins da comunidade ou use o mesmo botão no Jarvis em ${JARVIS_URL}.`};
  const text = String(version), parsed = typeof version === 'string' ? parse(version) : null;
  const notVerified = {status: 'unsupported', version: text,
    message: `Terminal ${text} ainda precisa ser verificado com o Agentic OS. Use o Jarvis em ${JARVIS_URL} até atualizar o Agentic OS (node aos.mjs update).`};
  if (!parsed) return notVerified;
  if (verified.some(entry => !compare(entry.core, parsed.core) && entry.prerelease === parsed.prerelease)) return {status: 'verified', version: text, message: ''};
  if (parsed.prerelease) return {status: 'unsupported', version: text,
    message: `A versão preliminar do Terminal (${text}) é incompatível com o Agentic OS. Instale a versão estável em Configurações → Plugins da comunidade ou use o Jarvis em ${JARVIS_URL}.`};
  if (parsed.core[0] === highest[0] && compare(parsed.core, highest) > 0) return {status: 'untested', version: text,
    message: `Terminal ${text} é mais recente que as versões testadas com o Agentic OS (${tested}). As conversas devem funcionar. Se houver problema, use o mesmo botão no Jarvis em ${JARVIS_URL} e execute node aos.mjs doctor.`};
  if (compare(parsed.core, lowest) < 0) return {status: 'unsupported', version: text,
    message: `Terminal ${text} é antigo demais para o Agentic OS. Atualize em Configurações → Plugins da comunidade ou use o Jarvis em ${JARVIS_URL}.`};
  return notVerified;
}

/** The message when an untested Terminal opened a conversation's tab but its
 * process could not be followed. It may be running, so nothing is relaunched. */
export const untrackedLaunchMessage = version => `Terminal ${version} abriu esta conversa. Esta versão do Terminal impede que o Agentic OS acompanhe a sessão. Ela ainda pode estar em execução. Confira a aba e feche-a antes de tentar novamente. Para acompanhar a sessão e continuar por voz, use o Jarvis em ${JARVIS_URL} e execute node aos.mjs doctor.`;
