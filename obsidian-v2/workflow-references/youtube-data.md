# Conexão compartilhada de pesquisa no YouTube

Use a ferramenta `youtube_research_data` de `agentic_vault` para descobrir vídeos e consultar metadados públicos. A ferramenta usa a conexão local existente para ambos os provedores. Um ambiente de shell filtrado não indica que a conexão está ausente. Mantenha credenciais fora de comandos, prompts e relatórios. Esta consulta independe de Gmail e Google Agenda.

- `operation: search` usa `query` e aceita `publishedAfter`, `order` (`date`, `viewCount` ou `relevance`) e `maxResults` (1–50). Verifique a publicação e a relevância dos vídeos retornados. A busca tem cobertura limitada.
- `operation: videos` consulta contadores, durações e status de transmissão para até 50 `videoIds` observados.
- `operation: channels` consulta a identidade e o número público de inscritos para até 50 `channelIds` observados. Contagens privadas permanecem indisponíveis e as públicas podem estar arredondadas.
- `operation: channel_uploads` recebe um `channelId` observado e `maxResults` de até 50 para estabelecer a referência do canal. Aplique as exclusões do radar, informe o tamanho final da amostra e registre os limites de cobertura.

Agrupe IDs conhecidos e reutilize os metadados já coletados. Use pesquisas recentes em cache somente quando verificáveis e quando o fluxo permitir. Preserve o tema, o período, as fontes configuradas e as regras de pontuação. Registre falhas, cota esgotada e contagens ausentes como indisponíveis. Contadores públicos acumulados são insuficientes para afirmar crescimento do canal no período, taxa de cliques ou retenção.

Para analisar o conteúdo dos vídeos, leia as legendas, use um leitor de transcrição instalado ou consulte uma fonte autorizada e existente no NotebookLM. Títulos e descrições servem para selecionar fontes. Para a análise semanal do canal próprio, use `youtube_review_data`.
