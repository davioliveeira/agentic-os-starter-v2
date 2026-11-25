import type { App } from 'obsidian';
import { useEffect, useState } from 'preact/hooks';
import { SKILLS } from '../../shared/contract.mjs';
import { DEFAULT_COCKPIT_SKILLS, MAX_DASHBOARD_SKILLS, builtinDescription } from '../../shared/dashboard.mjs';
import { createPollStore } from '../../shared/poll-store.mjs';
import { assertTestVault, readSelection, type Health, type Provider } from './provider';
import { assertVoiceVault, v2VoiceTransport } from './v2-voice';
import { openWork, publishWorkTask, workConversations, type WorkTask } from './work';
import { writeIntent } from './queue';
import { terminalPluginStatus } from './native-terminal';

export interface DashboardSkill {
 id: string;
 label: string;
 description: string;
 kind: 'builtin' | 'installed';
 arg?: string;
 direct?: boolean;
 providers: Provider[];
 available: boolean;
 reason?: string;
}
export interface DashboardSnapshot {
 revision: string;
 configured: boolean;
 selected: string[] | null;
 catalog: DashboardSkill[];
 error: string;
 ready: boolean;
 registeredId?: string;
 installedProviders?: Provider[];
}
export interface DiscoveredSkill {
 path: string;
 label: string;
 description: string;
 providers: Provider[];
}

const defaults = (): DashboardSnapshot => ({
 revision: '', configured: false, selected: null, ready: false, error: '',
 catalog: Object.entries(SKILLS).filter(([id]) => id !== 'voice-ask').map(([id, skill]) => ({
  id, label: skill.label, description: builtinDescription(skill), kind: 'builtin',
  arg: skill.arg, direct: skill.direct, providers: ['claude', 'codex'], available: true,
 })),
});
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

async function request(path: string, data?: unknown): Promise<any> {
 const response = await v2VoiceTransport('/dashboard' + path, data === undefined ? {} : { method: 'POST', body: JSON.stringify(data) });
 if (response.status !== 200) {
  const fallback = response.status === 404
   ? 'A personalização requer uma versão mais recente da ponte. Execute node aos.mjs update na pasta do projeto.'
   : 'As configurações do painel estão indisponíveis. Inicie a ponte e tente novamente.';
  throw new Error(response.status === 404 ? fallback : response.json?.error || fallback);
 }
 return response.json;
}

function snapshot(value: any): DashboardSnapshot {
 if (!value || typeof value.revision !== 'string' || !Array.isArray(value.catalog)
  || !(value.selected === null || (Array.isArray(value.selected) && value.selected.every((id: unknown) => typeof id === 'string')))) {
  throw new Error('A ponte devolveu configurações inválidas. Atualize o Agentic OS e tente novamente.');
 }
 return { ...value, error: typeof value.error === 'string' ? value.error : '', ready: true };
}

const stores = new WeakMap<App, ReturnType<typeof createPollStore>>();
function dashboardStore(app: App) {
 const existing = stores.get(app);
 if (existing) return existing;
 const store = createPollStore({
  initial: defaults(),
  load: async (): Promise<DashboardSnapshot> => {
   try {
    await assertTestVault(app);
    await assertVoiceVault(app);
    return snapshot(await request(''));
   } catch (error) {
    return { ...store.getSnapshot(), ready: false, error: errorText(error) };
   }
  },
 });
 stores.set(app, store);
 return store;
}

export async function readDashboard(app: App): Promise<DashboardSnapshot> {
 return dashboardStore(app).refresh();
}
export function subscribeDashboard(app: App, listener: (value: DashboardSnapshot) => void) {
 return dashboardStore(app).subscribe(listener);
}
export function useDashboard(app: App) {
 const store = dashboardStore(app);
 const [value, setValue] = useState<DashboardSnapshot>(store.getSnapshot());
 useEffect(() => store.subscribe(setValue), [store]);
 return value;
}
export function dashboardSelection(value: DashboardSnapshot): string[] {
 return [...(value.selected ?? DEFAULT_COCKPIT_SKILLS)];
}
export function dashboardButtons(value: DashboardSnapshot): DashboardSkill[] {
 return dashboardSelection(value).map(id => value.catalog.find(skill => skill.id === id) ?? {
  id, label: id, description: '', kind: 'installed', providers: [], available: false,
  reason: 'Esta skill saiu do catálogo. Remova o atalho em Personalizar painel.',
 });
}
export function dashboardSkillReason(skill: DashboardSkill, provider: Provider, health?: Health | null, dashboardError = '', installedProviders?: Provider[]): string {
 if (!skill.available) return skill.reason || 'Esta skill está indisponível. Revise o atalho em Personalizar painel.';
 if (!skill.providers.includes(provider)) return `Use ${skill.providers.map(name => name === 'claude' ? 'Claude Code' : 'Codex').join(' ou ')} para executar esta skill.`;
 if (skill.kind === 'installed' && dashboardError) return dashboardError;
 if (!skill.direct && ((installedProviders && !installedProviders.includes(provider)) || (health && !health.providers[provider]?.installed))) return `${provider === 'claude' ? 'Claude Code' : 'Codex'} não está instalado.`;
 return '';
}
export async function saveDashboard(app: App, revision: string, selected: string[] | null) {
 if (selected && (selected.length > MAX_DASHBOARD_SKILLS || new Set(selected).size !== selected.length)) {
  throw new Error(`Escolha até ${MAX_DASHBOARD_SKILLS} skills diferentes.`);
 }
 await assertTestVault(app);
 await assertVoiceVault(app);
 const value = snapshot(await request('', { revision, selected }));
 dashboardStore(app).publish(value);
 return value;
}
export async function discoverDashboardSkills(app: App, provider: Provider): Promise<{ skills: DiscoveredSkill[]; warnings?: string[]; skipped?: number; truncated?: boolean }> {
 await assertTestVault(app);
 await assertVoiceVault(app);
 return request('/discover?provider=' + encodeURIComponent(provider));
}
export async function registerDashboardSkill(app: App, revision: string, path: string, providers: Provider[], label?: string) {
 await assertTestVault(app);
 await assertVoiceVault(app);
 const value = snapshot(await request('/register', { revision, path, providers, ...(label?.trim() ? { label: label.trim() } : {}) }));
 dashboardStore(app).publish(value);
 return value;
}

/** Stock workflows keep their existing background/report behavior; installed skills open an agent. */
export async function launchDashboardSkill(app: App, skill: DashboardSkill, input = '') {
 if (skill.kind === 'builtin') {
  await writeIntent(app, skill.id, skill.arg ? { [skill.arg]: input } : {});
  return;
 }
 await assertTestVault(app);
 await assertVoiceVault(app);
 const selection = await readSelection(app);
 const reason = dashboardSkillReason(skill, selection.provider);
 if (reason) throw new Error(reason);
 if (!input.trim()) throw new Error('Descreva o que a skill deve fazer.');
 // Native work needs Terminal to own the CLI. Fail before creating a pending
 // task; browser previews use their bridge-owned terminal and need no plugin.
 const native = !!(app.vault.adapter as typeof app.vault.adapter & { getBasePath?: () => string }).getBasePath;
 // A newer, untested Terminal is allowed; the native host shows its one notice.
 const { plugin: terminal, support } = terminalPluginStatus(app);
 if (native && (!terminal || support.status === 'missing' || support.status === 'unsupported')) {
  throw new Error(support.status === 'missing'
   ? 'Ative o plugin da comunidade Terminal, de polyipseity, para executar skills pessoais no Obsidian. O mesmo atalho está disponível no Jarvis em http://127.0.0.1:3217.'
   : support.message);
 }
 await workConversations.startSession();
 const task = await request('/launch', { id: crypto.randomUUID(), skill: skill.id, request: input.trim(), selection }) as WorkTask;
 if (!task || typeof task.id !== 'string' || !['claude', 'codex'].includes(task.provider) || !Array.isArray(task.turns)) {
  throw new Error('A ponte não retornou um fluxo. Atualize o Agentic OS e tente novamente.');
 }
 publishWorkTask(task);
 // A personal skill is an interactive conversation the user just started by clicking and typing a request;
 // its questions and approvals appear in the terminal, so it opens. Voice-started work stays in the background.
 openWork([task.id]);
}
