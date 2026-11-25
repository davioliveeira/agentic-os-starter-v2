// What both screens show about scheduled workflows: one read-only line under the dashboard buttons, so a
// member can see what will run by itself and when. Changing the schedule is done with
// `node aos.mjs schedule` (or by asking the setup agent); there is no screen control for it yet.
import {createPollStore} from './poll-store.mjs';
import type {VoiceTransport} from './voice-session';

export interface ScheduleNote {lines: string[]; error: string}
const NOTHING: ScheduleNote = {lines: [], error: ''};
const WEEKDAYS = 'mon,tue,wed,thu,fri';
const daysInPortuguese: Record<string, string> = {
  mon: 'seg', tue: 'ter', wed: 'qua', thu: 'qui', fri: 'sex', sat: 'sáb', sun: 'dom',
};
const dayText = (days: unknown) => !Array.isArray(days) || days.length === 7 ? ''
  : days.join(',') === WEEKDAYS ? ' em dias úteis'
  : ` ${days.map(day => Object.hasOwn(daysInPortuguese, day) ? daysInPortuguese[day] : day).join(', ')}`;
const nextInPortuguese = new Map(Object.entries({
  ...daysInPortuguese, today: 'hoje', tomorrow: 'amanhã', off: 'desativado',
  paused: 'em pausa', never: 'sem próxima execução', 'not running': 'sem execução',
}));
function nextLabel(value: string): string {
  const normalized = value.toLowerCase();
  const exact = nextInPortuguese.get(normalized);
  if (exact) return exact;
  const [day = '', time] = normalized.split(' ');
  const translated = nextInPortuguese.get(day);
  return time && translated ? `${translated} às ${time}` : value;
}

// Pure: the bridge's /schedule answer as short lines. Anything unexpected (an older bridge, an error page)
// shows nothing rather than something misleading. The same goes for a bridge that stops answering: a line
// that can no longer be confirmed is taken off the screen, not left there as if it were current.
export function scheduleLines(view: any): ScheduleNote {
  if (!view || typeof view !== 'object' || !Array.isArray(view.jobs)) return NOTHING;
  const lines = view.jobs.filter((job: any) => job && typeof job.label === 'string' && typeof job.at === 'string').map((job: any) =>
    `${job.label} ${job.at}${dayText(job.days)}${job.enabled === false ? ' (desativado)' : view.paused ? ' (em pausa)' : typeof job.next === 'string' ? ` · próxima: ${nextLabel(job.next)}` : ''}${job.last && (job.last.outcome === 'failed' || job.last.outcome === 'missed') ? ` · ${job.last.outcome === 'failed' ? 'última execução falhou' : 'última execução perdida'}` : ''}`);
  return {lines, error: typeof view.error === 'string' ? view.error : ''};
}

export function createScheduleNoteStore(transport: VoiceTransport, {intervalMs = 60000}: {intervalMs?: number} = {}) {
  const store = createPollStore({initial: NOTHING, intervalMs, load: async (): Promise<ScheduleNote> => {
    const current: ScheduleNote = store.getSnapshot();
    try {
      // A bridge that accepts the request and then never answers is treated like one that is not there.
      const answer = await Promise.race([transport('/schedule'), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no answer')), 8000))]);
      if (answer.status !== 200) return NOTHING;
      const next = scheduleLines(answer.json);
      return next.error === current.error && next.lines.length === current.lines.length && next.lines.every((line, index) => line === current.lines[index]) ? current : next;
    } catch { return NOTHING; }
  }});
  return {getSnapshot: store.getSnapshot as () => ScheduleNote, subscribe: store.subscribe as (listener: (note: ScheduleNote) => void) => () => void, refresh: store.refresh as () => Promise<ScheduleNote>};
}
