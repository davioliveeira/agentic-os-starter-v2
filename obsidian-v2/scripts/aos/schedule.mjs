// `node aos.mjs schedule ...`: run a bundled workflow by itself at a set time.
// Edits system/v2/schedule.json in the vault; the bridge reads it on its next look at the clock (within
// half a minute), so no restart is needed. Nothing is scheduled until the member adds something.
import {layout, configuredVaultPath} from './services.mjs';
import {readSchedule, editSchedule, scheduleView, schedulableSkills, DAYS, WEEKDAYS} from '../../runner/schedule.mjs';

export const SCHEDULE_HELP = `Fluxos agendados

  schedule                              listar os agendamentos, as próximas execuções e os últimos resultados
  schedule skills                       listar os fluxos disponíveis para agendamento
  schedule add <fluxo> <HH:MM> [--days daily|weekdays|mon,wed,fri]
                                        por exemplo, schedule add plan-today 07:00 --days weekdays
  schedule remove <id>                  remover um agendamento pelo ID que aparece na lista
  schedule on <id> | off <id>            ativar ou desativar um agendamento sem removê-lo
  schedule pause | resume               pausar ou retomar todos os agendamentos

Os fluxos agendados rodam apenas enquanto os serviços estão em execução e usam seu plano do Claude
ou do Codex, assim como quando você clica no botão. Se os serviços estiverem desligados no horário
marcado, o fluxo roda quando voltarem, desde que seja no mesmo dia e com até três horas de atraso.
Depois desse prazo, o sistema registra que a execução foi perdida.
`;

const daysFrom = value => {
  if (value === true) throw new Error('Informe um valor para --days. Use daily (todos os dias), weekdays (dias úteis) ou uma lista como mon,wed,fri.');
  if (value === undefined || value === 'daily') return [...DAYS];
  if (value === 'weekdays') return [...WEEKDAYS];
  const names = {sunday: 'sun', monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat'};
  const days = String(value).toLowerCase().split(',').map(day => day.trim()).filter(Boolean).map(day => names[day] || day);
  if (!days.length || days.some(day => !DAYS.includes(day))) throw new Error('--days aceita daily (todos os dias), weekdays (dias úteis) ou uma lista como mon,wed,fri.');
  return days;
};
const daysInPortuguese = new Map(Object.entries({sun: 'dom', mon: 'seg', tue: 'ter', wed: 'qua', thu: 'qui', fri: 'sex', sat: 'sáb'}));
const dayText = days => days.length === 7 ? 'todos os dias' : days.join(',') === WEEKDAYS.join(',') ? 'em dias úteis' : days.map(day => daysInPortuguese.get(day) ?? day).join(', ');
const nextLabels = new Map(Object.entries({today: 'hoje', tomorrow: 'amanhã', off: 'desativado', paused: 'em pausa', never: 'sem previsão', 'not running': 'sem execução'}));
const outcomeLabels = new Map(Object.entries({starting: 'iniciando', started: 'iniciada', failed: 'falhou', missed: 'perdida'}));
const nextText = value => {
  const exact = nextLabels.get(value);
  if (exact) return exact;
  const [day, time] = value.toLowerCase().split(' ');
  const label = nextLabels.get(day) ?? daysInPortuguese.get(day);
  return time && label ? `${label} às ${time}` : value;
};

export async function scheduleCommand({words = [], flags = {}, log = console.log, root, at = layout(root), vault = configuredVaultPath(at), now = Date.now()} = {}) {
  if (!vault) throw new Error('Ainda não há uma instalação aqui. Primeiro, rode `node aos.mjs setup --vault "<caminho>"`.');
  const [action, ...rest] = words;
  const find = (schedule, id) => { const job = schedule.jobs.find(item => item.id === id); if (!job) throw new Error(`Não há um agendamento com o ID "${String(id).slice(0, 60)}". Rode \`node aos.mjs schedule\` para ver os IDs.`); return job; };
  switch (action) {
    case undefined: case 'list': case 'show': break;
    case 'help': log(SCHEDULE_HELP); return 0;
    case 'skills': for (const skill of schedulableSkills()) log(`  ${skill.id.padEnd(22)} ${skill.label}`); return 0;
    case 'add': {
      if (rest.length !== 2) throw new Error('Use o comando schedule add <fluxo> <HH:MM> [--days daily|weekdays|mon,wed,fri].');
      const stray = Object.keys(flags).find(name => name !== 'days');
      if (stray !== undefined) throw new Error(`schedule add não aceita --${stray}. Você quis dizer --days? Nenhum fluxo foi agendado.`);
      const days = daysFrom(flags.days);
      const saved = editSchedule(vault, schedule => ({...schedule, jobs: [...schedule.jobs, {skill: rest[0], at: rest[1], days}]}));
      const job = saved.jobs.at(-1);
      log(`Agendado: ${scheduleView(vault, {now}).jobs.at(-1).label} às ${job.at}, ${dayText(job.days)} (ID ${job.id}).`);
      log('O fluxo roda automaticamente enquanto os serviços estão em execução e usa seu plano do Claude ou do Codex, assim como quando você clica no botão.');
      return 0;
    }
    case 'remove': { if (rest.length !== 1) throw new Error('Use o comando schedule remove <id>.'); editSchedule(vault, schedule => { find(schedule, rest[0]); return {...schedule, jobs: schedule.jobs.filter(job => job.id !== rest[0])}; }); log(`${rest[0]} removido do agendamento.`); return 0; }
    case 'on': case 'off': { if (rest.length !== 1) throw new Error(`Use o comando schedule ${action} <id>.`); editSchedule(vault, schedule => { find(schedule, rest[0]); return {...schedule, jobs: schedule.jobs.map(job => job.id === rest[0] ? {...job, enabled: action === 'on'} : job)}; }); log(`${rest[0]} ${action === 'on' ? 'ativado' : 'desativado'}.`); return 0; }
    case 'pause': case 'resume': { editSchedule(vault, schedule => ({...schedule, paused: action === 'pause'})); log(action === 'pause' ? 'Todos os agendamentos estão em pausa. Rode `node aos.mjs schedule resume` para retomá-los.' : 'Agendamentos retomados.'); return 0; }
    default: log(SCHEDULE_HELP); return 1;
  }
  const view = scheduleView(vault, {now});
  if (view.error) { log(view.error); return 1; }
  if (!view.jobs.length) { log('Nenhum fluxo agendado. Exemplo: node aos.mjs schedule add plan-today 07:00 --days weekdays'); log('Rode `node aos.mjs schedule help` para ver as opções.'); return 0; }
  if (view.paused) log('Agendamentos em pausa (`node aos.mjs schedule resume`).');
  for (const job of view.jobs) {
    const last = job.last ? `${outcomeLabels.get(job.last.outcome) ?? job.last.outcome}${job.last.detail ? ` (${job.last.detail})` : ''} em ${job.last.date}` : 'ainda não executado';
    log(`  ${job.id.padEnd(26)} ${job.label}, ${job.at}, ${dayText(job.days)}${job.enabled ? '' : ' [desativado]'}   próxima: ${nextText(job.next)}   última: ${last}`);
  }
  log(`\nOs horários seguem o fuso deste computador (${view.timeZone}). Os fluxos são executados apenas enquanto os serviços estão em execução.`);
  return 0;
}
