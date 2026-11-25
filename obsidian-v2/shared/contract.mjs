export const MARKER = '.agentic-os-v2-test-vault';
export const ROOT = 'system/v2';
// Model families, never pinned releases: Claude Code resolves these names to the newest release itself, and
// runner/codex-models.mjs picks the newest listed Codex model of a family at call time.
export const MODELS = {codex:['astra','luna'],claude:['opus','sonnet','haiku','fable']};
/** @type {Readonly<Record<string,string>>} */
export const MODEL_LABELS = Object.freeze({astra:'Astra',luna:'Luna',opus:'Opus',sonnet:'Sonnet',haiku:'Haiku',fable:'Fable'});
export const VOICE_MODELS = Object.freeze({codex:'luna',claude:'haiku'});
// Older saved selections and task records pinned a release (gpt-6-astra, claude-fable-5-1); read them as their family.
export function modelFamily(provider,model){
 if(typeof model!=='string')return model;
 if(provider==='codex'){const hit=/^gpt-\d+(?:\.\d+)*-(astra|luna)$/.exec(model);if(hit)return hit[1]}
 if(provider==='claude'&&/^claude-fable-\d/.test(model))return 'fable';
 return model;
}
// Effort for full Claude workers, in terminals and in background workflows. Set on every launch so a worker does not
// inherit a higher personal default: at high, Opus thought for a minute and a half before starting a one-page
// explainer (Chase's call, 2026-11-24). Codex workers are pinned to medium the same way.
export const CLAUDE_WORKER_EFFORT='medium';
/** @type {Record<string,{label:string,instruction:string,arg?:string,direct?:boolean}>} */
export const SKILLS = {
  "vault-summary": {
    "label": "Resumir cofre",
    "about": "Lê o cofre e reúne o que está documentado, as pendências e os próximos passos.",
    "needs": [],
    "instruction": "Summarize documented facts, unfinished work and suggested next steps."
  },
  "plan-today": {
    "label": "Planejar hoje",
    "about": "Escreve a nota de hoje com três prioridades, a agenda e pendências dos últimos dias.",
    "needs": ["Google Agenda conectado à sua ferramenta de código"],
    "instruction": "Complete the Plan Today workflow."
  },
  "plan-tomorrow": {
    "label": "Planejar amanhã",
    "about": "Prepara a nota de amanhã com pendências, prazos de projetos e compromissos. Se já existir uma nota, ela é preservada.",
    "needs": ["Google Agenda conectado à sua ferramenta de código"],
    "instruction": "Complete the Plan Tomorrow workflow."
  },
  "refresh-schedule": {
    "label": "Atualizar agenda",
    "about": "Lê novamente o calendário e atualiza a seção Schedule da nota de hoje.",
    "needs": ["Google Agenda conectado à sua ferramenta de código","nota diária de hoje"],
    "instruction": "Complete the Refresh Schedule workflow."
  },
  "morning-intel": {
    "label": "Boletim de IA",
    "about": "Reúne notícias de IA, Hacker News e GitHub em um boletim diário com ideias de conteúdo.",
    "needs": [],
    "better": ["Gmail conectado à sua ferramenta de código (adiciona triagem de e-mails)","uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env) para incluir canais pequenos e outras seções do YouTube"],
    "instruction": "Complete the Intel Brief workflow."
  },
  "inbox-brief": {
    "label": "Resumo da caixa de entrada",
    "about": "Organiza os e-mails das últimas 24 horas por prioridade e sugere respostas para revisão.",
    "needs": ["Gmail conectado à sua ferramenta de código"],
    "instruction": "Complete the Inbox Brief workflow."
  },
  "deep-research-chase": {
    "label": "Pesquisa aprofundada",
    "about": "Pesquisa um tema na web, no X e no GitHub e resume as descobertas, com fontes e divergências.",
    "needs": [],
    "better": ["uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env) para incluir vídeos como fontes"],
    "instruction": "Complete the Deep Research workflow.",
    "arg": "topic"
  },
  "content-cascade": {
    "label": "Reaproveitar conteúdo",
    "about": "Cria rascunhos para blog, X e LinkedIn a partir da transcrição de um vídeo do YouTube.",
    "needs": ["um link de vídeo do YouTube","yt-dlp instalado para ler as transcrições de vídeos"],
    "instruction": "Complete the Content Cascade workflow.",
    "arg": "url"
  },
  "yt-pipeline": {
    "label": "Pesquisa no YouTube",
    "about": "Encontra os vídeos mais relevantes sobre um tema no YouTube e gera um relatório com base nas transcrições.",
    "needs": ["uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env)", "yt-dlp instalado para ler as transcrições de vídeos"],
    "instruction": "Complete the YT Pipeline workflow.",
    "arg": "topic"
  },
  "weekly-review": {
    "label": "Revisão semanal",
    "about": "Analisa as últimas sete notas diárias para identificar esforço, foco, entregas e temas que merecem atenção.",
    "needs": ["alguns dias de notas diárias"],
    "better": ["uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env) e seu canal para incluir a análise do canal"],
    "instruction": "Complete the Weekly Review workflow."
  },
  "vault-cleanup": {
    "label": "Revisar arquivos do cofre",
    "about": "Lista arquivos que podem ser arquivados e explica cada sugestão para revisão.",
    "needs": [],
    "instruction": "Complete the Vault Cleanup workflow."
  },
  "metrics-pull": {
    "label": "Atualizar métricas",
    "about": "Atualiza os indicadores de YouTube, Instagram, TikTok e GitHub no painel.",
    "needs": ["seus nomes de usuário e uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env)"],
    "instruction": "Complete the Pull Metrics workflow.",
    "direct": true
  },
  "github-trending": {
    "label": "Em alta no GitHub",
    "about": "Gera um relatório dos repositórios que mais cresceram no GitHub na semana e no mês.",
    "needs": ["Python 3"],
    "instruction": "Complete the GitHub Trending workflow.",
    "direct": true
  },
  "yt-week-review": {
    "label": "Análise do YouTube",
    "about": "Compara os vídeos publicados nos últimos sete dias com os vídeos recentes do canal.",
    "needs": ["seu canal e uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env)"],
    "instruction": "Complete the YouTube Review workflow."
  },
  "outlier-radar": {
    "label": "Radar de vídeos em destaque",
    "about": "Encontra vídeos recentes de canais pequenos de IA que superaram o desempenho habitual do canal.",
    "needs": ["uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env)"],
    "instruction": "Complete the Outlier Radar workflow."
  },
  "lead-research": {
    "label": "Pesquisar leads",
    "about": "Pesquisa os leads da sua base antes da reunião comercial.",
    "needs": ["uma base de leads conectada à sua ferramenta de código"],
    "instruction": "Complete the Lead Research workflow."
  },
  "morning": {
    "label": "Boletim da manhã",
    "about": "Combina as notícias de IA da manhã com a triagem da caixa de entrada.",
    "needs": ["Gmail conectado à sua ferramenta de código"],
    "instruction": "Complete the Morning Brief workflow."
  },
  "morning-report": {
    "label": "Relatório da manhã",
    "about": "Resume lançamentos e notícias das últimas 24 horas sobre IA e criação de agentes, com o que mudou na prática.",
    "needs": [],
    "better": ["uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env) para incluir dados do YouTube"],
    "instruction": "Complete the Morning Report workflow."
  },
  "ai-trend-scan": {
    "label": "Tendências de IA",
    "about": "Identifica temas de IA em alta e prioriza ideias de conteúdo.",
    "needs": [],
    "better": ["uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env) para incluir contagens de visualizações"],
    "instruction": "Complete the AI Trend Scan workflow."
  },
  "angle-brainstorm": {
    "label": "Gerar ideias de abordagem",
    "about": "Sugere de 8 a 12 abordagens de vídeo para um tema com base no interesse do público.",
    "needs": [],
    "better": ["uma chave da API do YouTube (YOUTUBE_API_KEY em ~/.claude/.env) para embasar as ideias em vídeos publicados"],
    "instruction": "Complete the Brainstorm Angles workflow.",
    "arg": "topic"
  },
  "outline-build": {
    "label": "Montar roteiro",
    "about": "Transforma a abordagem escolhida em um roteiro com abertura, tópicos, retomadas, conclusão e chamada para ação.",
    "needs": [],
    "instruction": "Complete the Build Outline workflow.",
    "arg": "topic"
  },
  "voice-ask": {
    "label": "Perguntar ao Astra",
    "instruction": "Complete the Ask Astra workflow.",
    "arg": "prompt"
  }
};
export const DEFAULT_SELECTION={provider:'codex',model:'astra'};
export function validateSelection(value){
 const model=value&&Object.hasOwn(MODELS,value.provider)?modelFamily(value.provider,value.model):null;
 if(!model || !MODELS[value.provider].includes(model)) throw new Error('Unsupported provider/model pair');
 return {provider:value.provider,model};
}
export function validateIntent(value){
 validateSelection(value);
 if(value.version!==2 || typeof value.id!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.id)) throw new Error('Invalid V2 job ID');
 if(!Object.hasOwn(SKILLS,value.skill)) throw new Error('Unknown workflow');
 if(!Number.isFinite(Date.parse(value.ts)) || value.from!=='plugin') throw new Error('Invalid job metadata');
 if(!value.args || typeof value.args!=='object' || Array.isArray(value.args)) throw new Error('Invalid workflow arguments');
 const required=SKILLS[value.skill].arg;
 const allowed=required?[required,...(value.skill==='voice-ask'?['context']:[])]:[];
 for(const [key,text] of Object.entries(value.args))if(!allowed.includes(key)||typeof text!=='string'||!text.trim()||text.length>(key==='context'?12000:4000))throw new Error('Invalid workflow argument: '+key);
 if(required && !value.args[required]?.trim())throw new Error('This workflow needs '+required);
 if(required==='url'){let url;try{url=new URL(value.args.url)}catch{throw new Error('Enter a valid source URL')}if(!['https:','http:'].includes(url.protocol))throw new Error('Source URL must use HTTP or HTTPS');}
 return value;
}
