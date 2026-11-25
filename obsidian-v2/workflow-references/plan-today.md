# Planejar hoje

A referência define o conteúdo. A ponte decide como gravar a nota conforme o contrato de execução.

## Evidências

Use America/Chicago para determinar a data. Leia as três últimas notas disponíveis, incluindo prioridades e rotinas pendentes e reflexões. Leia a nota de hoje e os projetos, considerando os estados `active`, `in-progress`, `blocked` e `draft`, modificados nos últimos 14 dias ou com prazo até hoje. Consulte as instâncias de hoje no conector autenticado do Google Agenda do provedor selecionado, incluindo recorrências e eventos de dia inteiro. Percorra as páginas necessárias. Falha na consulta bloqueia o fluxo. Uma consulta bem-sucedida pode retornar agenda vazia.

## Três prioridades

Some os sinais de cada candidato e ordene por pontuação:

| Sinal | Pontos |
|---|---:|
| Prioridade de ontem pendente | +50 |
| Projeto com prazo hoje | +40 |
| Projeto atrasado | +30 |
| Compromisso de agenda que exige preparo | +25 |
| Tema que se repete nas últimas três reflexões | +20 |
| Prioridade pendente de dois ou três dias atrás | +15 |

Escolha até três prioridades distintas e relevantes. Preserve as escolhidas pela pessoa e suas marcações. Sugira adições apenas nos espaços vazios, sem duplicar temas. Use o histórico existente e indique lacunas.

## Formato

Use todos os campos do esquema v1 em `system/schemas/daily-note.md`. Mantenha três textos e três marcações correspondentes. Use texto vazio nas posições não preenchidas.

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

Depois de `# YYYY-MM-DD`, mantenha os títulos exatos: `## Current Focus`, `## Top 3 Priorities`, `## Schedule`, `## Daily Drivers`, `## Activity Log`, `## Notes`, `## EOD Reflection`. As três linhas numeradas `1. [ ] texto` devem corresponder ao frontmatter. O plano deixa todas as novas prioridades desmarcadas. Ordene eventos em America/Chicago no formato de 24 horas `- HH:MM — Título`. Use `- (all-day) — Título` para dia inteiro. Mantenha Schedule mesmo vazio, contadores existentes, e Activity Log e EOD Reflection vazios em notas novas.

Rotinas para uma nota nova: {{DAILY_DRIVERS}}. Adicione rotinas desmarcadas só com evidência: resposta a patrocinador em `drafts/awaiting/`, revisão ou publicação de rascunho existente ou envio/agendamento de vídeo já gravado. Referencie a nota de origem quando útil. Em Notes, conecte reflexões, bloqueios e atrasos em um parágrafo.

Em nota existente, a ponte atualiza apenas Schedule e posições vazias em Top 3. Preserve o restante. Entregue rotinas novas propostas e `### Plan Today refresh HH:MM` em Notes do artefato para revisão. A ponte preserva o conteúdo validado de notas novas.

Se a agenda falhar, comece com `BLOCKED:` e inclua `(calendar fetch failed)` no contexto. Entregue o que foi possível apurar. A ponte preserva o destino em caso de falha. Retorne o plano completo quando disponível.
