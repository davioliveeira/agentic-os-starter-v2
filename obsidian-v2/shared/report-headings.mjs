export const BRIEF_HEADINGS = Object.freeze({
  summary: 'Resumo', headlines: 'Manchetes', topStory: 'Notícia principal',
  ai: 'Notícias de IA (últimas 24h)', hn: 'Radar do Hacker News',
  youtube: 'Radar do YouTube', outliers: 'Destaques de canais pequenos (últimas 24h)',
  github: 'Radar do GitHub', inbox: 'Caixa de entrada (últimas 24h)',
  plan: 'Plano de conteúdo', sources: 'Situação das fontes',
  youtubeTrending: 'Em alta no YouTube', web: 'Notícias e artigos na web',
  x: 'Conversa no X e Twitter', githubActivity: 'Atividade de desenvolvimento no GitHub',
  opportunities: 'Oportunidades de conteúdo',
});

export const BRIEF_HEADING_PATTERNS = Object.freeze({
  summary: /^(?:TL;DR|Resumo)$/i,
  headlines: /^(?:Headlines|Manchetes)$/i,
  topStory: /^(?:Top Story|Notícia principal)$/i,
  ai: /^(?:AI News\b|Notícias de IA\b)/i,
  hn: /^(?:(?:Hacker\s+News|HN)(?:\s+Pulse)?|Radar do Hacker News)$/i,
  youtube: /^(?:YouTube Radar\b|Radar do YouTube\b)/i,
  outliers: /^(?:(?:small[- ]channel )?outliers\b|Destaques de canais pequenos\b)/i,
  github: /^(?:GitHub (?:Radar|Trending)\b|Radar do GitHub\b)/i,
  inbox: /^(?:Inbox\b|Caixa de entrada\b)/i,
  plan: /^(?:So What\b.*Content Plan|Content Plan\b|Plano de conteúdo\b)/i,
  sources: /^(?:Source Status\b|Situação das fontes\b)/i,
  xHighlights: /^(?:(?:X|Twitter)(?: highlights| radar)|Destaques do X|Radar do X)$/i,
});

const morningIntel = new Map([
  ['morning intel', 'Boletim de IA'], ['tl;dr', BRIEF_HEADINGS.summary],
  ['top story', BRIEF_HEADINGS.topStory], ['ai news (last 24h)', BRIEF_HEADINGS.ai],
  ['hacker news pulse', BRIEF_HEADINGS.hn], ['youtube radar', BRIEF_HEADINGS.youtube],
  ['small-channel outliers (last 24h)', BRIEF_HEADINGS.outliers], ['github radar', BRIEF_HEADINGS.github],
  ['inbox (last 24h)', BRIEF_HEADINGS.inbox], ['so what - content plan', BRIEF_HEADINGS.plan],
  ['so what — content plan', BRIEF_HEADINGS.plan], ['content plan', BRIEF_HEADINGS.plan],
  ['source status', BRIEF_HEADINGS.sources], ['headlines', BRIEF_HEADINGS.headlines],
]);
const morningReport = new Map([
  ['headlines', BRIEF_HEADINGS.headlines], ['youtube — what\'s trending', BRIEF_HEADINGS.youtubeTrending],
  ['web — news & articles', BRIEF_HEADINGS.web], ['x / twitter — the conversation', BRIEF_HEADINGS.x],
  ['github — builder activity', BRIEF_HEADINGS.githubActivity], ['content opportunities', BRIEF_HEADINGS.opportunities],
  ['source status', BRIEF_HEADINGS.sources], ['own-channel performance', 'Desempenho do próprio canal'],
  ['competitor moves', 'Movimentos da concorrência'], ['morning report', 'Relatório da manhã'],
]);
const inboxBrief = new Map([
  ['inbox brief', 'Resumo da caixa de entrada'], ['leads', 'Leads'], ['urgent', 'Urgentes'],
  ['warm threads pressing for reply', 'Conversas que precisam de resposta'],
  ['new sponsor pitches', 'Novas propostas de patrocínio'], ['meetings', 'Reuniões'],
  ['noise count', 'Mensagens ignoradas'], ['proposed next actions', 'Próximas ações propostas'],
]);
const combined = new Map([...morningReport, ...inboxBrief,
  ['good morning', 'Boletim da manhã'], ['ai & coding agent trends', 'Tendências de IA e agentes de código'],
  ['inbox brief (last 24h)', BRIEF_HEADINGS.inbox],
]);
const youtubeWeekly = new Map([
  ['tl;dr', 'Resumo'], ['uploads this week', 'Publicações da semana'], ['baseline', 'Linha de base'],
  ['top performer', 'Melhor desempenho'], ['underperformer', 'Desempenho abaixo do esperado'],
  ['channel-wide signal', 'Sinais do canal'], ['short-form snapshot', 'Resumo dos vídeos curtos'],
  ['recommended next 7 days', 'Recomendações para os próximos 7 dias'], ['weekly youtube review', 'Análise semanal do YouTube'],
]);
const reports = new Map([
  ['morning-intel', morningIntel], ['morning-report', morningReport], ['morning', combined],
  ['inbox-brief', inboxBrief], ['yt-week-review', youtubeWeekly],
]);

export function reportHeadingLines(markdown) {
  const lines = markdown.split(/(\r?\n)/), headings = [], hidden = new Set();
  let fence = null, comment = false;
  for (let index = 0; index < lines.length; index += 2) {
    const line = lines[index];
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      hidden.add(index);
      if (delimiter?.[1][0] === fence[0] && delimiter[1].length >= fence.length && !delimiter[2].trim()) fence = null;
      continue;
    }
    if (comment || line.includes('<!--')) {
      hidden.add(index);
      comment = line.lastIndexOf('<!--') > line.lastIndexOf('-->') || (comment && !line.includes('-->'));
      continue;
    }
    if (delimiter) { fence = delimiter[1]; hidden.add(index); continue; }
    const heading = /^(\uFEFF?(#{1,6})[ \t]+)(.+?)([ \t]+#+)?([ \t]*)$/.exec(line);
    if (heading) headings.push({index, level: heading[2].length, name: heading[3], prefix: heading[1], suffix: (heading[4] || '') + heading[5]});
  }
  return {lines, headings, hidden};
}

export function readReportSection({lines, headings, hidden}, title, {maxLevel = 3, visibleOnly = false} = {}) {
  const start = headings.findIndex(heading => heading.level >= 2 && heading.level <= maxLevel && title.test(heading.name));
  if (start === -1) return null;
  const end = headings.slice(start + 1).find(heading => heading.level <= maxLevel)?.index;
  const firstLine = headings[start].index + 2;
  const body = lines.slice(firstLine, end);
  return (visibleOnly ? body.map((line, index) => hidden.has(firstLine + index) ? '' : line) : body).join('');
}

export function localizeReportHeadings(skill, markdown) {
  const translations = reports.get(skill);
  if (!translations) return markdown;
  const {lines, headings} = reportHeadingLines(markdown);
  for (const {index, name, prefix, suffix} of headings) {
    if (name === 'LEADS' || name === 'SPONSOR_PITCHES') continue;
    let label = translations.get(name.toLowerCase());
    if (skill === 'yt-week-review' && !label) {
      const ranked = /^(Top performer|Underperformer)(\s+[—–-]\s+.+)$/i.exec(name);
      if (ranked) label = translations.get(ranked[1].toLowerCase()) + ranked[2];
    } else if (skill === 'morning-intel' && !label) {
      const dated = /^Morning Intel\s+[-—]\s+(\d{4}-\d{2}-\d{2})(?:\s+\([^)]+\))?$/i.exec(name);
      if (dated) label = `Boletim de IA — ${dated[1]}`;
    }
    if (label) lines[index] = prefix + label + suffix;
  }
  return lines.join('');
}
