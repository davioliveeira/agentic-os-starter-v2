# Análise semanal do YouTube

Analise os sete dias completos do calendário de America/Chicago anteriores ao dia atual. Comece com `youtube_review_data` de `agentic_vault`: a ferramenta de leitura retorna a janela exata, o canal configurado, os vídeos da semana e dez vídeos longos para comparação. Ela usa a conexão existente sem expor credenciais. Respeite avisos de cobertura e dados indisponíveis. Este fluxo dispensa Gmail e Google Agenda. Quando a consulta falhar, informe a causa em vez de inventar métricas.

## Coleta e formato

Para identificador de canal que começa com UC, a playlist de uploads começa com UU e mantém o sufixo. Percorra a playlist até cobrir a semana e a amostra. Consulte `statistics`, `contentDetails` e `snippet` em grupos de até 50 IDs. Guarde título, URL, horário da publicação, visualizações, curtidas, comentários e duração ISO 8601.

Converta a duração em segundos. A classificação editorial do painel usa até 180 segundos para curtos e mais de 180 para longos. Use apenas longos na tabela principal, referência e análise de destaques. Busque dez longos para a referência, indicando amostra menor quando necessário.

## Referência e classificação

- `baseline_views` e `baseline_likes`: medianas dos dez últimos longos.
- `baseline_engagement`: mediana de (curtidas + comentários) / visualizações por vídeo, excluindo denominadores zero.
- `views_pct_of_baseline`: visualizações do vídeo / `baseline_views` × 100. Indique indisponível se a referência for nula ou zero.
- **Em crescimento.** menos de 24 horas. Tem prioridade.
- **Destaque.** pelo menos 150% da referência.
- **Estável.** de 60% até menos de 150%.
- **Abaixo da referência.** abaixo de 60% após 24 horas.

O destaque é o longo com mais visualizações no período. Sugira duas ou três formas de reaproveitar. Só marque pior desempenho para um vídeo abaixo da referência após 24 horas. Sugira perguntas de diagnóstico e uma ação. Trate hipóteses de título, miniatura, tema e horário como hipóteses. CTR e retenção exigem dados próprios.

## Entrega

Use o título `# Análise semanal do YouTube` e o frontmatter com `date`, `window`, `channel`, `skill: yt-week-review` e `tags: [review, youtube, weekly]`. Os títulos abaixo são seções de nível 2.

- **Resumo** com três ou quatro pontos.
- **Publicações da semana** com tabela `Vídeo | Visualizações | % da referência | Curtidas | Comentários | Avaliação`. Use as quatro classificações acima. Informe as medianas e o tamanho da amostra em **Linha de base**.
- **Melhor desempenho — título** com uma hipótese de menos de 140 caracteres sob `Por que funcionou`, seguida de `Formas de reaproveitar`.
- **Desempenho abaixo do esperado — título**, quando aplicável, com `Causa provável` em uma frase de menos de 140 caracteres e `Próxima ação` (tentar de novo, mudar o enfoque ou parar), com motivo.
- **Sinais do canal** distingue visualizações acumuladas dos vídeos da semana de visualizações do canal no período. Só compare semanas, inscritos ou frequência com bases equivalentes. Respeite o arredondamento público.
- **Resumo dos vídeos curtos** em uma linha com quantidade, visualizações e avaliação.
- **Recomendações para os próximos 7 dias** com três ações.

Use evidência autorizada para CTR, tempo assistido ou retenção. A análise é de leitura.
