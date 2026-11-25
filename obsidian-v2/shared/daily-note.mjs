export const DAILY_HEADINGS = Object.freeze({
  focus: 'Foco atual',
  priorities: '3 prioridades',
  schedule: 'Agenda',
  drivers: 'Rotinas diárias',
  activity: 'Registro de atividades',
  notes: 'Notas',
  reflection: 'Reflexão do dia',
});

const LEGACY_HEADINGS = {
  focus: 'Current Focus',
  priorities: 'Top 3 Priorities',
  schedule: 'Schedule',
  drivers: 'Daily Drivers',
  activity: 'Activity Log',
  notes: 'Notes',
  reflection: 'EOD Reflection',
};
const SECTION_KEYS = new Map(Object.keys(DAILY_HEADINGS).flatMap(key => [
  [DAILY_HEADINGS[key], key], [LEGACY_HEADINGS[key], key],
]));

export const dailySectionKey = heading => SECTION_KEYS.get(heading.trim());

// Return offsets into the source so a writer can edit just the intended section.
export function dailySections(raw) {
  const sections = [];
  const frontmatterEnd = /^\uFEFF?---[ \t]*\r?\n(?:[^\r\n]*\r?\n)*?---[ \t]*(?:\r?\n|$)/.exec(raw)?.[0].length ?? 0;
  let fence = null;
  for (const match of raw.matchAll(/^\uFEFF?(?: {0,3}(`{3,}|~{3,})([^\r\n]*)|##[ \t]+([^\r\n]*))(?=\r?$)/gm)) {
    if (match.index < frontmatterEnd) continue;
    const [line, marker, afterMarker, heading] = match;
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length && !afterMarker.trim()) fence = null;
      continue;
    }
    if (fence) continue;
    const start = match.index, name = heading.trim(), headingEnd = start + line.length;
    const bodyStart = headingEnd + (raw.startsWith('\r\n', headingEnd) ? 2 : raw[headingEnd] === '\n' ? 1 : 0);
    if (sections.length) sections.at(-1).end = start;
    sections.push({name, key: dailySectionKey(name), start, headingEnd, bodyStart, end: raw.length});
  }
  return sections;
}

export const findDailySection = (raw, key) => dailySections(raw).find(section => section.key === key);

export function appendDailySectionLine(raw, {headingEnd, bodyStart, end}, line) {
  const eol = raw.slice(headingEnd, bodyStart) || (raw.includes('\r\n') ? '\r\n' : '\n');
  let insertAt = bodyStart;
  for (const match of raw.slice(bodyStart, end).matchAll(/([^\r\n]*)(?:\r?\n|$)/g)) {
    if (match[1].trim()) insertAt = bodyStart + match.index + match[0].length;
  }
  const leadingBreak = raw[insertAt - 1] === '\n' ? '' : eol;
  return raw.slice(0, insertAt) + leadingBreak + line + eol + raw.slice(insertAt);
}

export function appendDailyDriver(raw, text) {
  const section = findDailySection(raw, 'drivers');
  return section ? appendDailySectionLine(raw, section, '- [ ] ' + text) : null;
}

export function dailyCheckboxes(raw, sections=dailySections(raw)){
 const items=[];
 for(const {key,name,bodyStart,end} of sections){
  if(key!=='priorities'&&key!=='drivers')continue;
  let position=0;
  for(const match of raw.slice(bodyStart,end).matchAll(/^(\d+\.|-)[ \t]+\[( |x)\][ \t]+([^\r\n]*)/gm)){
   const [line,bullet,state,text]=match;
   const start=bodyStart+match.index;
   items.push({key,section:name,text:text.trim(),line,position:position++,numbered:bullet!=='-',done:state==='x',offset:start+line.indexOf('[')+1,start,end:start+line.length});
  }
 }
 return items;
}
