# Boletim diário de IA

Use America/Chicago para datar o relatório e uma janela móvel de 24 horas. Use ferramentas disponíveis ou resultados recentes e verificáveis em cache. Quando possível, consulte fontes independentes em paralelo.

## Fontes

- **Notícias de IA:** cobertura atual do smol.ai, anúncios originais, históricos de versões e reportagens primárias vinculadas. Cubra Anthropic/Claude, OpenAI/Codex e demais provedores relevantes.
- **Hacker News:** notícias recentes de IA e da página inicial. Registre pontos e comentários observados.
- **YouTube:** vídeos recentes, com título, canal, inscritos, visualizações, data e URL. Use a razão visualizações/inscritos de pelo menos 0,3 como sinal de público no radar principal. Nomeie a fórmula e as entradas indisponíveis.
- **Destaques de canais pequenos:** siga `outlier-radar` ou use um relatório existente e recente. Destaque as últimas 24 horas. Diferencie o multiplicador contra a mediana do canal da razão visualizações/inscritos.
- **GitHub:** repositórios relevantes novos ou em alta em 7 e 30 dias. Use a captura determinística se recente, com a idade. Para afirmar crescimento, compare observações históricas.
- **Gmail:** triagem das últimas 24 horas em modo de leitura. Prazos primeiro, seguidos de oportunidades, itens que pedem resposta, informativos e contagem de ruído. Preserve as mensagens.
- **X:** anúncios primários e reações de quem desenvolve com as ferramentas. Pesquise os domínios atual e antigo quando necessário. Confirme datas nos posts ou em fontes datadas. Marque engajamento não observado como desconhecido.

## Pesquisas complementares e triagem

Mantenha as seguintes consultas para cobrir lacunas, ajustando tema e data:

- `site:x.com AnthropicAI OR claudeai OR ClaudeDevs <termos do tema>`
- `site:x.com bcherny OR _catwu OR alexalbert__ claude code`
- `site:x.com sama OR gdb OR OpenAIDevs OR Codex_Changelog`
- `Anthropic OR "Claude Code" announcement news <data de hoje>`
- `OpenAI OR Codex announcement news <data de hoje>`

Use consultas equivalentes no domínio antigo quando útil. Verifique as prévias antes de tratá-las como fatos. Use smol.ai como fonte indireta de discussões de Reddit e Discord e indique possível atraso de um a dois dias. Só declare cobertura direta quando tiver usado um conector autorizado. Evite insistir em fontes bloqueadas.

No Gmail, deduplique por conversa e use a data da mensagem mais recente. Classifique por prévia quando suficiente. Leia o fio inteiro para mensagens operacionais, transações, contatos relevantes ou decisões dependentes de contexto. Use as categorias **Precisam de resposta**, **Oportunidades**, **Newsletters que valem a leitura**, **Informativos** e **Mensagens ignoradas**, com uma frase sobre a relevância. Comece por cota, cobrança e falhas do site. Conte os ignorados. Evite links de rastreamento e preserve rótulos, rascunhos e mensagens.

## Estrutura do resultado

Use os títulos abaixo e escreva o relatório em português brasileiro.

# Boletim de IA — YYYY-MM-DD (dia da semana)

## Resumo
Três a seis pontos em ordem de relevância. Inclua itens operacionais urgentes quando existirem.

## Notícia principal
Um ou dois parágrafos com fontes diretas e um dado útil verificado, se disponível.

## Notícias de IA (últimas 24h)
Use as subseções `### Anthropic e Claude`, `### OpenAI e Codex` e `### Outras notícias de IA`. Vincule afirmações e mudanças de versão relevantes.

## Radar do Hacker News
Use a tabela `Notícia | Pontos | Comentários | Relevância`, com os contadores observados e o link de cada notícia.

## Radar do YouTube
Use a tabela `Vídeo | Canal | Inscritos | Visualizações | Motivo`, com links e a razão visualizações/inscritos identificada. Discuta ganchos recorrentes e lacunas do público com evidência.

### Destaques de canais pequenos (últimas 24h)
Use a tabela `Vídeo | Canal (inscritos) | Visualizações e idade | Multiplicador | Origem`. Inclua o link no título e formatos como `Nome (2.300)` e `12.000 / 6h`. Identifique velocidade inicial separadamente e diferencie busca sem resultados de fonte indisponível ou antiga.

## Radar do GitHub
Repositórios vinculados novos ou em crescimento em 7 ou 30 dias. Explique em uma frase a consequência de cada um para quem desenvolve com IA.

## Caixa de entrada (últimas 24h)
Identifique **Urgentes**, **Precisam de resposta**, **Propostas de patrocínio**, demais oportunidades, informativos e a contagem de mensagens ignoradas quando houver.

## Plano de conteúdo
Use as subseções `### YouTube`, `### LinkedIn` e `### Vídeos curtos e carrosséis`. Classifique de três a cinco pautas para YouTube com título provisório, gancho de duas frases, evidências, prazo e valor duradouro. Inclua de duas a três ideias para LinkedIn e uma ou duas para vídeo curto ou carrossel. Relacione às linhas editoriais Agentic OS, skills do Codex, qualidade de conteúdo e construção prática de agentes. Marque temas corroborados nos dois radares do YouTube. Priorize resultados de língua inglesa e destaque sinais internacionais comprovados.

No LinkedIn, mantenha a estrutura “Use meu X para conseguir Y”, com recurso existente e resultado concreto. Se faltar um recurso, indique a lacuna e proponha a pauta sem prometer download.

## Situação das fontes
Tabela `Fonte | Situação | Data da consulta ou falha`, incluindo Gmail e X. Preserve achados parciais, informe indisponibilidades e termine com a hora observada em America/Chicago. Entregue o relatório completo para a ponte gravar.
