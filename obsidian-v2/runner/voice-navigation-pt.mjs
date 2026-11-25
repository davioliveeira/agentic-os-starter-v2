const courtesy = /^(?:(?:oi|ol[aá]|jarvis|por favor)[, ]+)+/;
const openLead = /^(?:(?:voc[eê] )?pode (?:me )?(?:abrir|mostrar)|(?:me )?mostre|abra|reabra|abre|v[aá] (?:para|at[eé])) +(.+)$/;
const compound = /\bou\b|\b(?:e|depois|em seguida)[, ]+(?:depois +|por favor[, ]+)?(?:me )?(?:abra|mostre|diga|explique|crie|escreva|resuma|pesquise|gere|edite|altere|atualize|leia|envie|rode|execute|apague|feche|busque|procure)\b/;
const constraint = /\b(?:n[aã]o (?:abra|mostre|quero)|sem (?:abrir|mostrar)|se eu|se voc[eê]|somente se|s[oó] depois|quando (?:(?:eu|voc[eê]) )?(?:terminar|acabar|ficar|concluir)|mais tarde|por que|como (?:abrir|abro)|o que diz)\b/;

function cleanNavigation(transcript) {
 if (typeof transcript !== 'string' || transcript.length > 300 || /[;\r\n]|https?:\/\//i.test(transcript)) return '';
 const text = transcript.normalize('NFKC').toLowerCase().trim().replace(/[.!?]+$/, '')
  .replace(/\s+/g, ' ').replace(courtesy, '').replace(/(?:,? +por favor)$/, '').trim();
 if (/[.!?]\s|["“”]/.test(text) || compound.test(text) || constraint.test(text)) return '';
 return text;
}

export function hasPortugueseOpenLead(text) {
 return openLead.test(text.replace(courtesy, '').trim());
}

const placements = [
 [/ (?:na barra lateral esquerda|[àa] esquerda)$/, 'left-sidebar', 'on the left'],
 [/ (?:na barra lateral direita|[àa] direita)$/, 'right-sidebar', 'on the right'],
 [/ (?:lado a lado|em tela dividida)$/, 'split', 'in a split'],
];

function placement(target) {
 for (const [pattern, where, english] of placements) {
  if (pattern.test(target)) return { target: target.replace(pattern, ''), where, english };
 }
 return { target };
}

const reports = [
 [/^boletim(?: (?:da manh[ãa]|matinal|de ia))?(?: salvo)?$/, 'morning brief'],
 [/^(?:relat[oó]rio (?:do que est[aá] )?em alta no github|reposit[oó]rios em alta no github)$/, 'github trending'],
 [/^radar (?:de v[ií]deos em destaque|de canais pequenos)$/, 'outlier radar'],
 [/^resumo da caixa de entrada$/, 'inbox brief'],
 [/^revis[aã]o semanal$/, 'weekly review'],
 [/^(?:an[aá]lise|revis[aã]o) semanal do youtube$/, 'youtube weekly review'],
];
const dates = [
 [/ (?:de hoje|desta manh[ãa])$/, 'today'],
 [/ de ontem$/, 'yesterday'],
 [/ de anteontem$/, 'day before yesterday'],
 [/ de amanh[ãa]$/, 'tomorrow'],
 [/ da semana passada$/, 'last week'],
 [/ desta semana$/, 'this week'],
];
const daily = /^nota (?:di[aá]ria|do dia)$/;
const determiner = /^(?:o|a|meu|minha) /;
const references = [
 [/^(?:isso|isto)$/, 'it'],
 [/^(?:ess[ea]|est[ea]) (?:nota|relat[oó]rio|documento|arquivo)$/, 'the file'],
 [/^(?:(?:ess[ea]|est[ea]) )?imagem(?: que voc[eê] (?:fez|criou|gerou))?$/, 'the image you made'],
 [/^(?:(?:ess[ea]|est[ea]) )?(?:nota|relat[oó]rio|documento|arquivo)(?: que voc[eê] (?:fez|criou|gerou|salvou))$/, 'the file you made'],
];

export function portugueseFileIntent(transcript) {
 const opened = openLead.exec(cleanNavigation(transcript));
 if (!opened) return null;
 const { target: label, where } = placement(opened[1].replace(/ no obsidian$/, ''));
 let name = label.replace(determiner, '');
 const date = dates.find(([pattern]) => pattern.test(name));
 const undated = date ? name.replace(date[0], '') : name;
 const reportName = undated.replace(/^[uú]ltim[oa] /, '').replace(/ mais recente$/, '');
 const report = reports.find(([pattern]) => pattern.test(reportName));
 if (report) return { target: report[1] + (date ? ` ${date[1]}` : ''), where, report: report[1], date: date?.[1] };
 if (date && (daily.test(undated) || undated === 'nota')) {
  if (date[1].includes('week')) return null;
  return { target: `daily note ${date[1]}`, where };
 }
 const reference = !date && references.find(([pattern]) => pattern.test(undated));
 if (reference) return { target: reference[1], where };
 if (daily.test(undated) || /^(?:painel|terminal|gmail|google agenda|agenda|youtube studio|gr[aá]fico|reposit[oó]rio|barra lateral)\b/.test(undated)) return null;
 name = undated.replace(/^(?:nota|arquivo|documento) (?:(?:chamad[oa]|intitulad[oa]) )?/, '').trim();
 if (!name || /^(?:isso|isto|ess[ea]|est[ea]|el[ea])(?: |$)/.test(name)) return null;
 return { target: name + (date ? ` ${date[1]}` : ''), where, ...(date ? { title: name } : {}) };
}

const workspace = [
 [/^(?:centro de comando|painel(?: do (?:jarvis|agentic os))?)$/, 'open dashboard'],
 [/^(?:nota di[aá]ria(?: de hoje)?|nota de hoje)$/, 'open daily note', true],
 [/^(?:google agenda|agenda do google|agenda)$/, 'open google calendar', true],
 [/^gmail$/, 'open gmail', true],
 [/^youtube studio$/, 'open youtube studio', true],
 [/^terminal$/, 'open terminal'],
 [/^(?:gr[aá]fico(?: do cofre)?|visualiza[cç][aã]o em grafo)$/, 'open graph view'],
];
const workspaceCommands = [
 [/^volte no hist[oó]rico$/, 'go back'],
 [/^avance no hist[oó]rico$/, 'go forward'],
 [/^feche (?:a|esta|essa) aba(?: atual)?$/, 'close this tab'],
 [/^divida (?:a )?(?:tela|janela) (?:[àa]|para a) direita$/, 'split right'],
 [/^divida (?:a )?(?:tela|janela) para baixo$/, 'split down'],
 [/^alterne a barra lateral esquerda$/, 'toggle left sidebar'],
 [/^alterne a barra lateral direita$/, 'toggle right sidebar'],
];

export function portugueseWorkspaceIntent(transcript) {
 const text = cleanNavigation(transcript);
 const fixed = workspaceCommands.find(([pattern]) => pattern.test(text));
 if (fixed) return { command: fixed[1] };
 const search = /^(?:busque|procure|pesquise) (?:no cofre|nas minhas notas) (?:por )?(.{1,80})$/.exec(text);
 if (search && search[1] !== 'por') return { action: { op: 'search', query: search[1] } };
 const opened = openLead.exec(text);
 if (!opened) return null;
 const { target, where, english } = placement(opened[1].replace(/ no obsidian$/, ''));
 const name = target.replace(determiner, '');
 const repo = /^reposit[oó]rio ([a-z0-9_.-]{2,}\/[a-z0-9_.-]{2,})$/.exec(name);
 if (repo) return { action: { op: 'repo', slug: repo[1], ...(where ? { where } : {}) } };
 const matched = workspace.find(([pattern]) => pattern.test(name));
 if (!matched || where && !matched[2]) return null;
 return { command: matched[1] + (english ? ` ${english}` : '') };
}
