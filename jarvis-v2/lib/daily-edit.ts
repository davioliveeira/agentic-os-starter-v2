import { TIME_ZONE } from '../../obsidian-v2/shared/timezone.mjs';
import { serverBridge as bridge } from './bridge-server';
import { invalidateVaultSnapshot, parseDailyPriorities } from './vault';
import { sameOrigin } from './preview';

type Bridge = (path: string, body?: unknown) => Promise<any>;
type Directive = { index: number; done: boolean; date: string; text: string };
class DirectiveError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function parseDirective(value: unknown, today: string): Directive {
  const input = value as Partial<Directive> | null;
  if (!input || !Number.isInteger(input.index) || input.index! < 0 || input.index! > 2 ||
      typeof input.done !== 'boolean' || typeof input.text !== 'string' ||
      !input.text.trim() || input.text.length > 10000 || typeof input.date !== 'string') {
    throw new DirectiveError('Prioridade inválida');
  }
  if (input.date !== today) throw new DirectiveError("Só é possível alterar as prioridades de hoje. Atualize o painel e tente novamente.", 409);
  return input as Directive;
}

function updatePriority(before: string, directive: Directive): string {
  const item = parseDailyPriorities(before)[directive.index];
  if (!item) throw new DirectiveError('A prioridade não foi encontrada na nota de hoje. Atualize o painel e tente novamente.', 404);
  if (item.text !== directive.text.trim()) {
    throw new DirectiveError('A prioridade mudou desde que apareceu no painel. As edições recentes foram preservadas. Atualize o painel e tente novamente.', 409);
  }
  // Keep every byte outside the checkbox, including mixed line endings and BOM.
  return before.slice(0, item.offset) + (directive.done ? 'x' : ' ') + before.slice(item.offset + 1);
}

export function createDailyPost({ requestBridge = bridge, invalidate = invalidateVaultSnapshot, now = () => new Date() }: {
  requestBridge?: Bridge; invalidate?: (root: string) => void; now?: () => Date;
} = {}) {
  return async function POST(request: Request): Promise<Response> {
    if (!sameOrigin(request)) return Response.json({ error: 'Origem da solicitação não autorizada' }, { status: 403 });
    let root: string | undefined;
    try {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now());
      const directive = parseDirective(await request.json(), today);
      const status = await requestBridge('/status');
      root = status.vault;
      const path = `daily-notes/${today}.md`;
      const report = await requestBridge('/report?path=' + encodeURIComponent(path));
      if (typeof report.content !== 'string') throw new Error('Não foi possível carregar a nota diária');
      const before = report.content, after = updatePriority(before, directive);
      await requestBridge('/notes/replace', { path, before, after });
      invalidate(root!);
      return Response.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a prioridade';
      const conflict = /changed since|newer edits were preserved|edições recentes foram preservadas/i.test(message);
      // A conflict means cached dashboard data is also stale. Refresh without retrying the write.
      if (root && conflict) invalidate(root);
      const status = error instanceof DirectiveError ? error.status : error instanceof SyntaxError ? 400 : conflict ? 409 : 502;
      return Response.json({ error: message }, { status });
    }
  };
}
