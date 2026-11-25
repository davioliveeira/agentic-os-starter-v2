# Planejar amanhã

Calcule amanhã pelo calendário de America/Chicago. Se já existir `daily-notes/YYYY-MM-DD.md` para a data, informe o caminho e encerre. Preserve a nota existente. A ponte verifica a ausência antes de encaminhar e ao criar o arquivo de modo exclusivo.

Leia as prioridades e rotinas pendentes e a seção de notas de hoje. Reconheça os títulos em português e inglês conforme o esquema da nota diária, inclusive em notas que misturam idiomas. Consulte projetos modificados nos últimos sete dias que estejam ativos ou tenham prazo até amanhã e obrigações com patrocinadores documentadas no cofre.

Use o conector autenticado de Google Agenda para instâncias de amanhã, recorrências e eventos de dia inteiro. Percorra as páginas e ordene pelo horário de America/Chicago. Falha de acesso bloqueia o fluxo. Zero eventos numa consulta bem-sucedida é uma agenda vazia válida.

Classifique as prioridades nesta ordem: pendências de hoje, projetos vencidos ou com prazo amanhã, preparo para compromissos de amanhã e obrigações documentadas com patrocinadores. Escolha até três prioridades distintas de impacto e deixe posições fracas vazias. Preserve notas existentes.

## Formato da nova nota

Entregue todos os campos do esquema v1.

```yaml
---
date: YYYY-MM-DD
schema_version: 1
focus: ""
top3:
  - "<sugestão 1 ou vazio>"
  - "<sugestão 2 ou vazio>"
  - "<sugestão 3 ou vazio>"
top3_done: [false, false, false]
effort: null
focus_blocks: null
posts_shipped:
  youtube: 0
  blog: 0
  linkedin: 0
  x: 0
  instagram: 0
  tiktok: 0
videos_shipped_today: 0
---
```

Depois de `# YYYY-MM-DD`, use nesta ordem `## Foco atual`, `## 3 prioridades`, `## Agenda`, `## Rotinas diárias`, `## Registro de atividades`, `## Notas` e `## Reflexão do dia`. Inclua três prioridades numeradas e desmarcadas que correspondam a `top3`. Eventos usam `- HH:MM — Título` ou `- 00:00 — (dia inteiro) Título`. Inclua `## Agenda` mesmo vazia. Use {{DAILY_DRIVERS}} para as rotinas da nota nova. Adicione somente compromissos pendentes e evidenciados. Descreva em `## Notas` o que mudou hoje, bloqueios e progresso. Deixe `## Registro de atividades` e `## Reflexão do dia` vazios, `effort` e `focus_blocks` nulos e os contadores de publicações em zero. A ponte salva a nota validada inteira.

Se o acesso à agenda falhar, comece com `BLOCKED:` e inclua contexto útil com `(calendar fetch failed)` em `## Notas`. A ponte preserva o destino em caso de falha. Retorne a nota completa quando disponível.
