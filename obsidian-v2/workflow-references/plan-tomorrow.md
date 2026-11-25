# Planejar amanhã

Calcule amanhã pelo calendário de America/Chicago. Se já existir `daily-notes/YYYY-MM-DD.md` para a data, informe o caminho e encerre. Preserve a nota existente. A ponte verifica a ausência antes de encaminhar e ao criar o arquivo de modo exclusivo.

Leia prioridades e rotinas pendentes e Notes de hoje. Consulte projetos modificados nos últimos sete dias que estejam ativos ou tenham prazo até amanhã e obrigações com patrocinadores documentadas no cofre.

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

Depois de `# YYYY-MM-DD`, mantenha os títulos nesta ordem: `## Current Focus`, `## Top 3 Priorities`, `## Schedule`, `## Daily Drivers`, `## Activity Log`, `## Notes`, `## EOD Reflection`. Inclua três prioridades numeradas e desmarcadas que correspondam a `top3`. Eventos usam `- HH:MM — Título` ou `- (all-day) — Título`. Mantenha Schedule quando vazio. Rotinas para uma nota nova: {{DAILY_DRIVERS}}. Adicione somente compromissos pendentes e evidenciados. Descreva em Notes o que mudou hoje, bloqueios e progresso. Activity Log e EOD Reflection ficam vazios, esforço e foco ficam nulos e publicações começam em zero. A ponte salva a nota validada inteira.

Se o acesso à agenda falhar, comece com `BLOCKED:` e inclua contexto útil com `(calendar fetch failed)` em Notes. A ponte preserva o destino em caso de falha. Retorne a nota completa quando disponível.
