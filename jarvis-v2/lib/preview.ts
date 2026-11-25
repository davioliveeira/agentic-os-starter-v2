import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { VaultState, RunEntry, Metric } from "./vault";

export type Provider = "claude" | "codex";
export type PreviewState = VaultState & { preview: { provider: Provider; execution: "disconnected"; simulated: true } };
// Intentionally fixed to THIS app. V1 environment variables cannot redirect it.
export const TEST_ROOT = path.resolve(process.cwd(), "test-vault");
const DB_FILE = path.join(TEST_ROOT, "system", "preview.json");
const MARKER = path.join(TEST_ROOT, ".jarvis-v2-test-vault");
const SKILLS = new Set(["metrics-pull", "morning-report", "inbox-brief", "github-trending", "ai-trend-scan", "yt-week-review", "plan-today", "plan-tomorrow", "weekly-review", "vault-cleanup"]);
interface PreviewRun extends RunEntry { provider: Provider; simulated: true }
interface Store { provider: Provider; done: boolean[]; runs: PreviewRun[] }
function assertIsolated() {
  if (!fs.existsSync(MARKER) || fs.readFileSync(MARKER, "utf8").trim() !== "jarvis-v2-preview-only") {
    throw new Error("O cofre de demonstração está sem o identificador V2. Restaure o test-vault incluído antes de iniciar.");
  }
}
function readStore(): Store {
  assertIsolated();
  if (!fs.existsSync(DB_FILE)) return { provider: "codex", done: [false, false, false], runs: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveStore(data: Store) {
  assertIsolated();
  const temporary = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2));
  fs.renameSync(temporary, DB_FILE);
}
export function selectProvider(provider: unknown) {
  if (provider !== "codex" && provider !== "claude") throw new Error("Provedor desconhecido");
  const store = readStore(); store.provider = provider; saveStore(store);
  return { provider, execution: "disconnected" };
}
export function setDirective(index: unknown, done: unknown) {
  if (!Number.isInteger(index) || Number(index) < 0 || Number(index) > 2 || typeof done !== "boolean") throw new Error("Prioridade inválida");
  const store = readStore(); store.done[Number(index)] = done; saveStore(store);
}
export function simulateJob(skill: unknown) {
  if (typeof skill !== "string" || !SKILLS.has(skill)) throw new Error("Ação desconhecida na demonstração");
  const store = readStore();
  if (store.runs.some(r => r.status === "running" && Date.now() - Date.parse(r.ts_started!) < 6500)) throw new Error("Já existe uma demonstração em execução");
  const id = crypto.randomUUID();
  store.runs.unshift({ id, skill, provider: store.provider, simulated: true, label: `${skill.replace(/-/g, " ")} · demonstração com ${store.provider}`, link: null, status: "running", summary: "Fluxo simulado, sem execução de agente.", ts_started: new Date().toISOString(), ts_completed: null, duration_s: null, deliverable_path: null });
  store.runs = store.runs.slice(0, 12); saveStore(store);
  return { id, simulated: true, provider: store.provider };
}
export function previewReport(reportPath: string): string {
  if (reportPath === "inbox/reports/welcome.md") return "# Bem-vindo ao Jarvis V2\n\nEsta demonstração usa métricas e compromissos de exemplo em um cofre isolado.\n\n## Explore o painel\n- Alterne entre Claude e Codex no cabeçalho.\n- Confira as animações de escuta, execução, fala e erro.\n- Clique em um fluxo para ver um resultado simulado.\n- Marque uma prioridade para salvar o estado no cofre de demonstração.\n\n## Conexões\nA demonstração funciona com dados locais de exemplo e sem conectar agentes, microfone, APIs, e-mail, agenda ou seu cofre principal.";
  const match = /^inbox\/reports\/([a-f0-9-]{36})\.md$/.exec(reportPath);
  if (!match) throw new Error("Relatório não encontrado");
  const run = readStore().runs.find(r => r.id === match[1] && r.status === "ok");
  if (!run) throw new Error("Relatório não encontrado");
  return `# ${run.skill.replace(/-/g, " ")}\n\n**Resultado simulado, gerado sem chamar um modelo.**\n\n## O que a demonstração verifica\n- O painel enviou uma ação.\n- A demonstração registrou **${run.provider}** como o provedor selecionado ao iniciar.\n- O fluxo passou de em execução a concluído e gerou este documento.\n\nA execução real depende do adaptador e da skill do provedor selecionado. A demonstração usou o cofre de exemplo e os serviços isolados.`;
}
export function previewState(): PreviewState {
  const store = readStore();
  let changed = false;
  for (const run of store.runs) {
    if (run.status === "running" && Date.now() - Date.parse(run.ts_started!) >= 6500) {
      run.status = "ok"; run.ts_completed = new Date().toISOString(); run.duration_s = 6.5;
      run.summary = "Demonstração concluída. O resultado é um exemplo produzido sem chamar um agente.";
      run.deliverable_path = `inbox/reports/${run.id}.md`; changed = true;
    }
  }
  if (changed) saveStore(store);
  const now = new Date(), timestamp = now.toISOString();
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const metric = (source: string, name: string, value: number, growth: number): Metric => ({ source, metric: name, value, status: "mock", timestamp, delta: growth / 7, deltaWeek: growth, history: Array.from({length: 18}, (_, i) => ({ timestamp, status: "mock", value: value - growth + growth * i/17 + Math.sin(i * 1.7) * growth * 0.04 })) });
  const active = store.runs.filter(r => r.status === "running").length;
  const welcome: RunEntry = { id: "welcome", skill: "preview-guide", label: "Bem-vindo ao V2", link: null, status: "ok", summary: "Demonstração pronta", ts_started: timestamp, ts_completed: timestamp, duration_s: 0, deliverable_path: "inbox/reports/welcome.md" };
  return {
    generated_at: timestamp, vault_root: TEST_ROOT,
    preview: { provider: store.provider, execution: "disconnected", simulated: true },
    metrics: [metric("youtube", "subscribers", 128400, 1820), metric("instagram", "followers", 64200, 930)],
    runner: { ts: timestamp, pid: 0, version: "preview", busy: active > 0, active, max_concurrent: 1, pending: 0, heartbeat_age_s: 0, alive: false },
    latestVideo: null,
    daily: { date, isToday: true, top3: ["Explorar a galáxia do Codex", "Experimentar um fluxo", "Comparar o núcleo do Claude"].map((text, i) => ({ text, done: store.done[i] })), schedule: [{ time: "09:00", item: "Planejar o dia · exemplo" }, { time: "11:30", item: "Produzir conteúdo · exemplo" }, { time: "15:00", item: "Revisar e publicar · exemplo" }], focus: "Reserve tempo para a próxima ideia." },
    runs: [...store.runs, welcome], queue: [], morning: null, outliers: null, trendingRepos: [], etas: {},
  };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const url = new URL(request.url);
  // Next may normalize request.url to localhost even for a 127.0.0.1 Host.
  // Accept only our loopback server, and compare Origin to the actual Host.
  const host = request.headers.get("host") || url.host;
  if (!/^(127\.0\.0\.1|localhost):3217$/.test(host)) return false;
  return (origin === `${url.protocol}//${host}` || !origin && site === 'same-origin') && site !== "cross-site";
}
