// V1 workflow content adapted for either provider. Persistence belongs to the caller.
import {TIME_ZONE} from '../shared/timezone.mjs';
const todayDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE}).format(new Date());
const tomorrowDate=()=>{const [y,m,d]=todayDate().split('-').map(Number);return new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10)};
const slugify=s=>String(s||'request').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,48);
export function deliverablePathFor(intent) {
  const id8 = (intent.id || "x").slice(0, 8);
  const date = todayDate();
  const args = intent.args || {};
  switch (intent.skill) {
    case "plan-today":
    case "refresh-schedule":
      return `daily-notes/${date}.md`;
    case "plan-tomorrow":
      return `daily-notes/${tomorrowDate()}.md`;
    case "morning":
      return `inbox/reports/morning/${date}-${id8}.md`;
    case "morning-report":
      return `inbox/reports/morning/${date}-morning-report-${id8}.md`;
    case "inbox-brief":
      return `inbox/reports/inbox-briefs/${date}-${id8}.md`;
    case "deep-research-chase":
      return `inbox/research/${date}-${slugify(args.topic)}.md`;
    case "content-cascade":
      return `inbox/reports/cascades/${date}-${id8}.md`;
    case "weekly-review":
      return `inbox/reports/weekly/${date}-weekly-review.md`;
    case "yt-pipeline":
      return `inbox/research/${date}-yt-pipeline-${slugify(args.topic)}.md`;
    case "vault-cleanup":
      return `inbox/reports/vault-cleanup/${date}-cleanup-${id8}.md`;
    case "metrics-pull":
      return `inbox/reports/metrics/${date}-pull-${id8}.md`;
    case "yt-week-review":
      return `inbox/reports/yt-reviews/${date}-yt-week-review.md`;
    case "github-trending":
      return `inbox/research/github-trending/${date}-trending.md`;
    case "ai-trend-scan":
      return `inbox/reports/trend-scan/${date}-trend-scan-${id8}.md`;
    case "morning-intel":
      // converged 2026-08-14: interactive /morning-intel writes here natively;
      // the runner now matches (was inbox/reports/morning/) so the voice
      // "open morning intel" target and the briefing reader have ONE home
      return `inbox/research/morning-intel/${date}-intel-${id8}.md`;
    case "outlier-radar":
      return `inbox/research/outlier-radar/${date}-outliers.md`;
    case "lead-research":
      return `inbox/reports/lead-research/${date}-leads-${id8}.md`;
    case "voice-ask":
      return `inbox/voice/${date}-${slugify(args.prompt || "ask")}-${id8}.md`;
    case "angle-brainstorm":
      return `inbox/reports/angles/${date}-angles-${slugify(args.seed || args.topic || id8)}.md`;
    case "outline-build":
      return `inbox/reports/outlines/${date}-outline-${slugify(args.angle || args.topic || id8)}.md`;
    default:
      return null;
  }
}

// Keep content requirements separate from transport-specific output contracts.
// The worker returns the deliverable; neither this layer nor its references tell
// a model to write the bridge-owned destination or substitute a save receipt.
export function originalPrompt(intent) {
  const args = intent.args || {};
  switch (intent.skill) {
    case 'plan-today':
      return 'Proponha a nota diária completa de hoje conforme o roteiro de planejamento e o esquema da nota diária do cofre. Use títulos em português em uma nota nova. Leia as últimas três notas diárias, os projetos recentes ativos ou com prazo e a agenda autenticada de hoje. Preserve as prioridades existentes e os itens marcados. A ponte aplica apenas a agenda e preenche os espaços vazios das prioridades.';
    case 'refresh-schedule':
      return `Retorne a nota diária completa de hoje com a seção da agenda atualizada (## Agenda ou ## Schedule em uma nota antiga). Use a agenda autenticada no fuso ${TIME_ZONE}. Ordene os compromissos com hora no formato de 24 horas e identifique os eventos de dia inteiro. Preserve exatamente o restante da nota atual. Deixe a agenda vazia se a consulta confirmar que não há compromissos. Se não houver acesso, informe o bloqueio.`;
    case 'plan-tomorrow':
      return 'Prepare a nota diária completa de amanhã somente se ela ainda não existir. Use o roteiro fornecido e títulos em português. Considere o trabalho pendente, os projetos com prazo, os compromissos documentados e a agenda autenticada de amanhã. Se a nota já existir, pare e informe o caminho dela. Retorne a nota nova completa para a ponte validar e salvar. Não mescle, sobrescreva ou exclua uma nota existente.';
    case 'morning':
      return 'Monte um boletim da manhã consolidado seguindo os roteiros do relatório da manhã e do resumo da caixa de entrada. Pesquise tendências e faça a triagem da caixa de entrada em modo somente leitura, em paralelo quando houver suporte. Reúna os resultados completos e numere as próximas ações propostas.';
    case 'morning-report':
      return 'Produza o relatório completo da manhã sobre novidades em IA e construção de agentes, seguindo o roteiro de fontes das últimas 24 horas e o formato de entrega fornecido.';
    case 'inbox-brief':
      return 'Leia e organize as últimas 24 horas da caixa de entrada autenticada de acordo com as categorias, a pontuação dos leads e o roteiro do relatório. Retorne a triagem e as ações sugeridas. Nesta execução inicial, não crie rascunhos nem envie mensagens.';
    case 'deep-research-chase':
      return args.topic?.trim() ? `Pesquise este tema no YouTube, na web, no X e no GitHub conforme os roteiros de pesquisa fornecidos: ${JSON.stringify(args.topic)}. Retorne a síntese completa com citações, fontes selecionadas, divergências e oportunidades de conteúdo. Leia fontes existentes no NotebookLM ou transcrições disponíveis. A criação de um notebook remoto exige um pedido específico.` : null;
    case 'content-cascade':
      return args.url?.trim() ? `Obtenha a transcrição real de ${JSON.stringify(args.url)}. Siga o roteiro editorial para produzir o rascunho completo do blog, o post e a resposta no X e o post e o primeiro comentário no LinkedIn. Reúna todos os rascunhos e metadados em um único documento Markdown. Se todos os métodos de obter a transcrição falharem, retorne BLOCKED: com a causa. Esta etapa inicial se limita aos rascunhos e metadados. Publicar, agendar e alterar bancos de dados exige um pedido separado.` : null;
    case 'weekly-review':
      return `Revise as notas diárias dos últimos sete dias no fuso ${TIME_ZONE} e o canal do YouTube conforme os roteiros de revisão pessoal e do canal. Identifique valores ausentes e mantenha explícitos os valores iguais a zero. Retorne a revisão completa com evidências, temas recorrentes e recomendações práticas.`;
    case 'yt-week-review':
      return `Compare os vídeos publicados no canal nos sete dias completos do calendário de ${TIME_ZONE} com os últimos dez vídeos longos, seguindo o roteiro semanal do YouTube. Chame primeiro a ferramenta youtube_review_data do agentic_vault. Ela usa a conexão de leitura configurada e retorna os dados da fonte sem expor credenciais. O fluxo dispensa Gmail e Google Agenda. Não inspecione arquivos de credenciais nem conclua que o YouTube está indisponível só porque as variáveis de ambiente do shell foram filtradas. Preserve os títulos exigidos pelo painel e as explicações breves de desempenho.`;
    case 'yt-pipeline':
      return args.topic?.trim() ? `Selecione as fontes mais relevantes do YouTube sobre ${JSON.stringify(args.topic)}. Analise as transcrições reais ou o conteúdo de fontes já existentes no NotebookLM seguindo o roteiro fornecido. Retorne o relatório completo da pesquisa para ser salvo localmente. Criação de notebook remoto, envio de fontes ou geração de conteúdo remoto exige um pedido específico.` : null;
    case 'vault-cleanup':
      return 'Inspecione os arquivos antigos elegíveis seguindo o roteiro e retorne uma lista de propostas para revisão. Nesta etapa inicial, apenas inspecione os arquivos. Não mova, renomeie ou exclua arquivos de origem. Inclua os caminhos de origem e destino propostos, a idade, a justificativa, os arquivos vinculados e os motivos para deixar itens de fora. Pare após a prévia para que a pessoa possa escolher quais arquivos mover em um pedido posterior.';
    case 'metrics-pull':
      return 'A integração de métricas faz a coleta. Retorne o estado observado de cada fonte e os valores anteriores e atuais disponíveis. Não substitua esses dados por estimativas geradas pelo modelo.';
    case 'github-trending':
      return 'A integração do GitHub executa a consulta e salva os dados com a data da coleta. Retorne o relatório completo gerado por ela.';
    case 'ai-trend-scan':
      return 'Pesquise tendências atuais de IA no YouTube e no X. Siga o roteiro de velocidade, remoção de duplicatas e agrupamento. Retorne uma lista ordenada de ideias iniciais. A escolha de abordagens e a elaboração de estruturas ficam para os fluxos correspondentes.';
    case 'morning-intel':
      return 'Produza o boletim completo de IA com notícias atuais, Hacker News, YouTube, destaques de canais pequenos, GitHub e triagem da caixa de entrada em modo somente leitura. Siga os roteiros de fontes, situação das fontes e plano de conteúdo. Inclua os achados parciais úteis e indique quais fontes estão indisponíveis.';
    case 'outlier-radar':
      return 'Encontre vídeos recentes de IA com desempenho acima do habitual em canais pequenos do YouTube. Use os critérios de elegibilidade, linha de base histórica e velocidade inicial do roteiro. Retorne o relatório completo com data, evidências, cobertura das fontes e comparações com relatórios existentes quando houver.';
    case 'lead-research':
      return 'Leia os registros autorizados de leads que estiverem disponíveis e pesquise cada lead conforme o roteiro de preparação para a chamada. Retorne o resumo completo de cada lead. Se a conexão à base estiver indisponível, retorne BLOCKED:. Nesta execução inicial, mantenha os registros remotos em modo somente leitura.';
    case 'angle-brainstorm':
      return args.topic?.trim() ? `Crie de 8 a 12 abordagens distintas para um vídeo no YouTube sobre ${JSON.stringify(args.topic)}. Use o roteiro de enquadramento e interesses do público. Retorne as abordagens completas com uma etiqueta de desejo do público e uma justificativa baseada em evidências para cada uma.` : null;
    case 'outline-build':
      return args.topic?.trim() ? `Desenvolva a abordagem ${JSON.stringify(args.topic)} em uma estrutura completa para YouTube com foco em retenção. Siga o roteiro e inclua título provisório, gancho, o que está em jogo, blocos do desenvolvimento, novos ganchos, entrega ou demonstração, chamada para ação, duração e indicações visuais por bloco.` : null;
    case 'voice-ask':
      return args.prompt?.trim() ? `Execute este pedido transcrito da voz: ${JSON.stringify(args.prompt)}. Use a conversa recente apenas como contexto: ${JSON.stringify(args.context || '')}. Retorne o resultado completo, evidências e links úteis para as fontes. Não invente ações concluídas ou URLs de destino. A resposta falada é preparada separadamente a partir deste resultado.` : null;
    default:
      return null;
  }
}
