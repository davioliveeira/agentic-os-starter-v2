---
schema: daily-note
schema_version: 1
status: frozen
since: 2026-05-11
---

# Esquema da nota diária

Este formato é usado pelo modelo em `system/templates/daily.md`, pelos leitores do Jarvis e do plugin do Obsidian, por `/today`, por `/close-day` e pelo registro de atividade que usa `activity-log.js`. Mudanças incompatíveis exigem nova `schema_version` e atualização de todos os leitores e gravadores. Os leitores recusam versões desconhecidas.

## Arquivo

- Pasta: `daily-notes/`.
- Nome: `YYYY-MM-DD.md`, com data ISO 8601.
- Codificação: UTF-8. O leitor aceita LF e CRLF.
- Uma nova execução de `/today` preserva a nota existente.

## Frontmatter YAML

```yaml
---
date: 2026-05-11
schema_version: 1
focus: ""
top3:
  - ""
  - ""
  - ""
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

`date` e `schema_version` são obrigatórios. A data deve corresponder ao nome do arquivo. `focus` aceita um texto de até 200 caracteres. `top3` e `top3_done` são listas correspondentes, de até três elementos. `effort` é um inteiro de 1 a 10. `focus_blocks` e contadores são inteiros. `null` representa o que ainda não foi preenchido. Zero representa uma contagem registrada. A skill `/close-day` atualiza o esforço, o foco e as publicações. O plugin consulta o frontmatter pelo cache de metadados do Obsidian.

## Corpo em Markdown

Mantenha os títulos abaixo exatamente escritos e na ordem indicada. O texto de cada seção pode ficar em português.

```
# YYYY-MM-DD

## Current Focus
<um parágrafo>

## Top 3 Priorities
1. [ ] ...
2. [ ] ...
3. [ ] ...

## Schedule
- HH:MM — <título do evento>

## Daily Drivers
- [ ] Triar a caixa de entrada
- [ ] Separar um bloco de foco
- [ ] Revisar o dia

## Activity Log
<registro acrescentado pelo hook PostToolUse>

## Notes
<texto livre>

## EOD Reflection
<reflexão registrada por /close-day>
```

| Seção | Quem escreve | Onde aparece |
|---|---|---|
| `# YYYY-MM-DD` | Modelo | Título |
| `## Current Focus` | Pessoa ou planejamento | Cartão de foco |
| `## Top 3 Priorities` | Pessoa ou planejamento | Cartão de prioridades |
| `## Schedule` | Planejamento ou sincronização do calendário | Agenda |
| `## Daily Drivers` | Modelo e pessoa | Lista de rotinas |
| `## Activity Log` | Hook de atividade | Registro opcional |
| `## Notes` | Pessoa | Nota |
| `## EOD Reflection` | `/close-day` | Nota |

O leitor preserva espaços do conteúdo e ignora seções que não conhece. Sem uma seção de foco, prioridades ou rotinas, o cartão correspondente pode aparecer vazio. Em prioridades, use linhas como `1. [ ] tarefa` ou `1. [x] tarefa`. A posição da linha corresponde ao índice de `top3_done`. As rotinas usam caixas sem numeração. Na agenda, separe horário e evento com travessão e use relógio de 24 horas.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 1 | 2026-05-11 | Formato inicial. |
