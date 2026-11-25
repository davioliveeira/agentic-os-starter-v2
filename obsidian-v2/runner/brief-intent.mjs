// Slot extraction for the bounded questions the saved briefing can answer.
// Unknown content is ambiguous, never discarded: a small classifier may resolve
// it, while requests with work, date, freshness or filter constraints stay out.
const work=/\b(?:research|browse|search|verify|fact.check|write|draft|publish|send|create|generate|run|refresh|update|compare|analy[sz]e|analysis|deep|dig|open|execute|download|build|make|delete|edit|schedule|post it)\b/;
const constraints=/\b(?:live|fresh|latest|right now|currently|since|after|before|yesterday|tomorrow|last|next week|this week|this month|tonight|tonights|afternoon|evening|no|not|never|don't|dont|instead|except|excluding|without|only|about|why|how|weather|subscriber|quota|inbox|financial|finance|world|sports|stock|market|geopolitical|political|politics|business|show hn|python|robotics)\b|\b\d{4}[-/]\d{1,2}|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/;
const numbers={one:1,two:2,three:3,four:4,five:5};
const ordinals={first:0,second:1,third:2,fourth:3,fifth:4,'1st':0,'2nd':1,'3rd':2,'4th':3,'5th':4};
const vagueNews=/\b(?:news|headlines?|stor(?:y|ies)|brief(?:ing)?|intel|hn|hacker)\b/;
const grammar=new Set(('so hey okay ok please well what whats which tell read give show list recap summarize summarise remind me us was is were are did does do has had have the a an on in from for my our your at with of by s to can could would will you i want wanted need wondering wondered know hear see find out let lets just quick quickly briefly real really again then say said says cover covered lead led leading topped today morning this saved report reports briefing brief intel news story stories headline headlines item items post posts article articles score points comments biggest top main leading highest most important popular discussed commented scored rated major principal number ranked rank').split(' '));
function normalize(value){return String(value||'').toLowerCase().replace(/[’]/g,"'").replace(/\bof the day\b/g,'today').replace(/\b(?:uh+|um+|erm|er|you know|like)\b/g,' ').replace(/\b(?:artificial intelligence)\b/g,'ai').replace(/\bwhat's\b/g,'what is').replace(/\bwhat about (?=(?:the )?(?:second|third|fourth|fifth|next)\b)/g,'what is ').replace(/\s+/g,' ').trim();}
function validPrevious(previous){
 return previous&&/^\d{4}-\d{2}-\d{2}$/.test(previous.date||'')&&typeof previous.briefSource==='string'&&/^inbox\/(?:research\/morning-intel|reports\/morning)\/\d{4}-\d{2}-\d{2}[^/\\]*\.md$/.test(previous.briefSource)&&Array.isArray(previous.plan)&&previous.plan.length===1&&validPlanItem(previous.plan[0]);
}

// Portuguese reads use complete question shapes. Extra topics, dates or work
// stay in the original request for the normal router.
const PT_ASK='(?:(?:qual|quais)(?: (?:e|sao|foi|foram))?|(?:me )?(?:diga|cont[ae]|fal[ae]|leia|mostr[ae]|liste)|(?:voce )?pode (?:me )?(?:dizer|contar|ler|mostrar|listar))';
const PT_ARTICLE='(?:(?:a|as|o|os) )?';
const PT_DAY='(?:hoje|de hoje|do dia|desta manha|nesta manha)';
const PT_REPORT='(?:(?:do|no) boletim(?: da manha| salvo)?(?: de hoje)?)';
const PT_SCOPE=`(?:${PT_DAY}|${PT_REPORT})`;
function portugueseQuestion(subject, scope=PT_SCOPE){
 return new RegExp(`^(?:${PT_ASK} )?${PT_ARTICLE}(?:${subject}) ${scope}$`);
}
const PT_TOP_STORY=portugueseQuestion([
 '(?:principal|maior) (?:noticia|manchete)(?: de ia)?',
 '(?:noticia|manchete)(?: (?:principal|mais importante)(?: de ia)?| de ia(?: principal| mais importante)?)?',
 'destaque(?: de ia)?',
].join('|'));
const PT_HEADLINES=portugueseQuestion('(?:principais )?(?:noticias|manchetes|destaques)(?: de ia)?');
const PT_HN_SCOPE=`(?:${PT_SCOPE} (?:no|do) (?:hacker news|hn)|(?:no|do) (?:hacker news|hn) ${PT_SCOPE})`;
const PT_HN_STORY='(?:noticia|historia|publicacao|post|item|assunto|artigo)';
const PT_HN_STORIES='(?:noticias|historias|publicacoes|posts|itens|assuntos|artigos)';
const PT_COMMENTS='(?:mais (?:comentad[oa]s?|discutid[oa]s?)|com mais comentarios)';
const PT_POINTS='(?:mais votad[oa]s?|com mais pontos)';
const PT_RANKINGS=[
 [portugueseQuestion(`${PT_HN_STORY} ${PT_COMMENTS}`,PT_HN_SCOPE),'comments',1],
 [portugueseQuestion(`${PT_HN_STORIES} ${PT_COMMENTS}`,PT_HN_SCOPE),'comments',3],
 [portugueseQuestion(`(?:principal ${PT_HN_STORY}|${PT_HN_STORY} ${PT_POINTS})`,PT_HN_SCOPE),'points',1],
 [portugueseQuestion(`(?:principais ${PT_HN_STORIES}|${PT_HN_STORIES} ${PT_POINTS})`,PT_HN_SCOPE),'points',3],
];
const PT_WHOLE_BRIEF=/^(?:(?:me )?resum[ae]|(?:qual (?:e )?o|me de um) resumo (?:do|no)) (?:o )?boletim (?:da manha|de hoje|salvo)(?: de hoje)?$/;

function inspectPortugueseBrief(utterance){
 const raw=String(utterance||'');
 const text=raw.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
 if(!/\b(?:noticias?|manchetes?|boletim|destaques de ia)\b/.test(text)&&
    !(/\b(?:hacker news|hn)\b/.test(text)&&/\b(?:qual|quais|hoje|comentad[oa]s?|discutid[oa]s?|publicacoes?)\b/.test(text)))return null;
 const outside={kind:'outside',guarded:true,reason:'unsupported-constraint'};
 if(raw.length>500||/[;\r\n]/.test(raw))return outside;
 const question=text.replace(/^(?:(?:oi|ola|jarvis|por favor)[,\s]+)+/,'')
  .replace(/(?:[,\s]+por favor)?[.!?]*$/,'').replace(/\s+/g,' ').trim();
 // Leave the named workflow and opening its document to their regular handlers.
 if(/^(?:(?:rode|execute|gere|abra|abrir) )?(?:o )?boletim (?:de ia|da manha|de hoje)$/.test(question))return {kind:'outside'};
 for(const [pattern,rank,count] of PT_RANKINGS){
  if(pattern.test(question))return {kind:'lookup',plan:[{source:'hn',rank,...(count>1?{count}:{})}]};
 }
 if(PT_TOP_STORY.test(question))return {kind:'lookup',plan:[{source:'brief',rank:'points'}]};
 if(PT_HEADLINES.test(question))return {kind:'lookup',plan:[{source:'brief',rank:'points',count:3}]};
 if(PT_WHOLE_BRIEF.test(question))return {kind:'ambiguous',reason:'whole-brief',candidates:['brief']};
 return outside;
}

export function validPlanItem(p){return p&&['brief','hn'].includes(p.source)&&['points','comments'].includes(p.rank)&&(p.source==='hn'||p.rank==='points')&&(p.count===undefined||Number.isInteger(p.count)&&p.count>=1&&p.count<=5)&&(p.offset===undefined||Number.isInteger(p.offset)&&p.offset>=0&&p.offset<=4)&&(p.count||1)+(p.offset||0)<=5;}
export function inspectBriefRequest(utterance,{previous}={}){
 const portuguese=inspectPortugueseBrief(utterance);
 if(portuguese)return portuguese;
 const text=normalize(utterance),outside={kind:'outside',...(vagueNews.test(text)?{guarded:true,reason:'unsupported-constraint'}:{})};
 if(/^(?:open|read)\s+(?:(?:my|the|today's|today)\s+)*(?:morning\s+)?(?:intel|brief|briefing)(?:\s+report)?[.!?]*$/.test(text))return {kind:'outside'};
 if(!text||text.length>500||work.test(text))return outside;
 const prior=validPrevious(previous)?previous:null;
 // Context can resolve "why does that matter?" without sending an entire
 // dashboard to the model. Keep date/live/action/filter guards in force.
 const detailText=text.replace(/\b(?:about|why|how)\b/g,'');
 const singleDetail=!/\b(?:and|also|then|plus)\b|;/.test(text)&&!constraints.test(detailText);
 if(prior&&/\b(?:that|those|it|its|them)\b/.test(text)&&/\b(?:more|explain|why|how)\b/.test(text)&&singleDetail)return {kind:'ambiguous',reason:'saved-story-detail',candidates:[prior.plan[0].source]};
 if(/\b(?:why|how|explain)\b/.test(text)&&/\b(?:news|story|headline)\b/.test(text)&&/\b(?:today|morning|brief|saved)\b/.test(text)&&singleDetail)return {kind:'ambiguous',reason:'saved-story-detail',candidates:[/\b(?:hacker news|hn)\b/.test(text)?'hn':'brief']};
 if(constraints.test(text))return outside;
 const follow=/\b(?:second|third|fourth|fifth|next|other|another|that|those|them|\d(?:st|nd|rd|th))\b/.test(text);
 const likely=vagueNews.test(text)||Boolean(prior&&follow);
 if(!likely)return outside;
 const ambiguous=reason=>({kind:'ambiguous',reason,candidates:['brief','hn']});
 // Day-scoped answers need an explicit current source, or a validated previous
 // saved lookup. Bare topical questions may need general knowledge/research.
 if(!/\b(?:today|this morning|morning (?:intel|brief(?:ing)?)|saved (?:brief|report)|brief(?:ing)?)\b/.test(text)&&!prior)return ambiguous('source-or-date');
 if(/\b(?:but|because|whether|if|unless|plus)\b/.test(text))return ambiguous('additional-clause');
 const parts=text.split(/\b(and|also|then|i mean|i meant|sorry|rather)\b|(;)/).filter(p=>p!==undefined),clauses=[];
 let correction=false,pending=false;
 for(const part of parts){
  if(/^(?:and|also|then|;)$/.test(part)){correction=false;pending=true;continue;}
  if(/^(?:i mean|i meant|sorry|rather)$/.test(part)){correction=true;pending=true;continue;}
  if(!part.replace(/[\s?!.,"'—–-]/g,''))continue;
  const hn=/\b(?:hacker\s+news|hn)\b/.test(part),ai=/\bai\b/.test(part),brief=/\b(?:morning (?:intel|brief(?:ing)?)|saved (?:brief|report)|brief(?:ing)?)\b/.test(part);
  if(hn&&ai)return outside;
  const source=hn?'hn':ai||brief?'brief':null;
  const comments=/\b(?:most (?:discussed|discussion|commented|comments)|highest comments)\b|\b(?:top|leading|highest)\b.*\bby comments\b/.test(part);
  let rank=comments?'comments':/\b(?:biggest|top|topped|main|lead|led|leading|highest|major|principal|most (?:important|popular|points))\b/.test(part)?'points':null;
  const ordinalMatch=Object.keys(ordinals).find(word=>new RegExp(`\\b${word}\\b`).test(part));
  const numberMatch=/\b(?:top|first)\s+(one|two|three|four|five|\d+)\b/.exec(part)||/\b(one|two|three|four|five|\d+)\s+(?:highest|top|leading|biggest|most)\b/.exec(part);
  const numbered=/\bnumber\s+(one|two|three|four|five|[1-5])\b/.exec(part),next=prior&&/\bnext\b/.test(part);
  let count=numberMatch?(numbers[numberMatch[1]]||Number(numberMatch[1])):1,offset=ordinalMatch?ordinals[ordinalMatch]:numbered?(numbers[numbered[1]]||Number(numbered[1]))-1:next?(prior.plan[0].offset||0)+(prior.plan[0].count||1):0;
  const plural=/\b(?:stories|headlines|posts|articles|items)\b/.test(part);
  if(!numberMatch&&plural&&!/\b(?:topped|led|lead)\b/.test(part))count=3;
  if(numberMatch)offset=0;
  if(!rank&&(ordinalMatch||numbered||next||plural))rank=prior&&(!source||source===prior.plan[0].source)?prior.plan[0].rank:'points';
  if(count<1||count>5||count+offset>5)return ambiguous('unsupported-count');
  if(brief&&!hn&&!ai&&!rank)return ambiguous('whole-brief');
  const words=part.replace(/\bhacker\s+news\b/g,'hn').match(/[a-z]+|\d+(?:st|nd|rd|th)?/g)||[];
  const unknown=words.filter(word=>!grammar.has(word)&&!['ai','hn','scoring','attracted','discussion'].includes(word)&&!(word in numbers)&&!(word in ordinals)&&!(numberMatch&&word===numberMatch[1])&&!(numbered&&word===numbered[1])&&!(prior&&['that','those','it','its','them','next'].includes(word)));
  if(unknown.length){
   const qualified=/\b(?:top|biggest|leading|main|highest)\s+([a-z\s]+?)\s+(?:news|stor(?:y|ies)|headlines?|hn)\b/.exec(part)?.[1]||'';
   // An unknown topic between a ranking and its subject ("top Julia HN
   // story") is a filtered ranking, not harmless conversational wording.
   if(clauses.length||pending||unknown.some(word=>qualified.split(/\s+/).includes(word)))return outside;
   return ambiguous('unresolved-wording');
  }
  // Bare "comments" asks for comment contents, not a numeric ranking.
  if(/\bcomments\b/.test(part)&&!comments&&!/\b(?:by points|most points)\b/.test(part))return ambiguous('comment-detail');
  if(!source&&!rank)return ambiguous('missing-intent');
  const replaced=correction?clauses.pop():null;
  clauses.push({source:source||replaced?.source||null,rank:rank||replaced?.rank||null,count,offset,genericNews:/\b(?:news|stor(?:y|ies)|headlines?)\b/.test(part)||replaced?.genericNews||false});
  correction=false;pending=false;if(clauses.length>4)return ambiguous('too-many-lookups');
 }
 if(pending||!clauses.length)return ambiguous('unfinished-request');
 const plan=[];
 for(const [index,clause] of clauses.entries()){
  const before=clauses.slice(0,index).reverse(),after=clauses.slice(index+1);
  const source=clause.source||before.find(c=>c.source)?.source||after.find(c=>c.source)?.source||prior?.plan[0].source||(clause.genericNews?'brief':null);
  const rank=clause.rank||before.find(c=>c.rank)?.rank||after.find(c=>c.rank)?.rank||prior?.plan[0].rank;
  if(!source||!rank||(source==='brief'&&rank!=='points'))return ambiguous('missing-ranking');
  const item={source,rank,...(clause.count>1?{count:clause.count}:{}),...(clause.offset?{offset:clause.offset}:{})};
  if(!plan.some(p=>JSON.stringify(p)===JSON.stringify(item)))plan.push(item);
 }
 return {kind:'lookup',plan,...(prior&&follow?{date:prior.date,briefSource:prior.briefSource}:{})};
}
export function briefLookupPlan(utterance){const request=inspectBriefRequest(utterance);return request.kind==='lookup'?request.plan:null;}
