export type ObsidianWhere = "tab" | "split" | "right-sidebar" | "left-sidebar";
export type ObsidianAction =
  | { op: "daily-note"; where?: ObsidianWhere }
  | { op: "cockpit" }
  | { op: "open-note"; query: string; where?: ObsidianWhere }
  | { op: "search"; query: string }
  | { op: "command"; id: string; label: string }
  | { op: "web"; url: string; label: string; where?: ObsidianWhere }
  | { op: "repo"; slug: string; where?: ObsidianWhere };

// command ids the orb may execute — ALSO the allowlist for model-emitted
// actions (a model must never invoke arbitrary command ids)
export const COMMAND_ALLOW: Record<string, string> = {
  "app:go-back": "voltar no histórico",
  "app:go-forward": "avançar no histórico",
  "workspace:close": "fechar aba",
  "workspace:split-vertical": "dividir à direita",
  "workspace:split-horizontal": "dividir para baixo",
  "app:toggle-left-sidebar": "alternar barra lateral esquerda",
  "app:toggle-right-sidebar": "alternar barra lateral direita",
  "graph:open": "abrir visualização em grafo",
  // opens in a bottom split via the terminal plugin's own newInstanceBehavior.
  // id format is open-terminal.<default|integrated|external|select>.<root|current>
  // since the plugin's 3.27 update (the old open-terminal.default died silently);
  // verified against main.js: for m of [kinds] for o of [places] → `open-terminal.${m}.${o}`
  "terminal:open-terminal.default.root": "terminal",
};

// named web targets → urls (model picks a NAME, never a raw url); opened in
// Obsidian's core Web Viewer
export const WEB_TARGETS: Record<string, { url: string; label: string }> = {
  calendar: { url: "https://calendar.google.com", label: "Google Agenda" },
  gmail: { url: "https://mail.google.com", label: "Gmail" },
  "youtube-studio": { url: "https://studio.youtube.com", label: "YouTube Studio" },
};

