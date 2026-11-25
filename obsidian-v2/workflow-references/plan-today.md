# Planejar hoje

A referência define o conteúdo. A ponte decide como gravar a nota conforme o contrato de execução.

## Evidências

Use America/Chicago para determinar a data. Leia as três últimas notas disponíveis, incluindo prioridades e rotinas pendentes e reflexões. Reconheça os títulos em português e inglês conforme o esquema da nota diária, inclusive quando a mesma nota mistura idiomas. Leia a nota de hoje e os projetos, considerando os estados `active`, `in-progress`, `blocked` e `draft`, modificados nos últimos 14 dias ou com prazo até hoje. Consulte as instâncias de hoje no conector autenticado do Google Agenda do provedor selecionado, incluindo recorrências e eventos de dia inteiro. Percorra as páginas necessárias. Falha na consulta bloqueia o fluxo. Uma consulta bem-sucedida pode retornar agenda vazia.

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

Em notas novas, depois de `# YYYY-MM-DD`, use nesta ordem `## Foco atual`, `## 3 prioridades`, `## Agenda`, `## Rotinas diárias`, `## Registro de atividades`, `## Notas` e `## Reflexão do dia`. As três linhas numeradas `1. [ ] texto` devem corresponder ao frontmatter. O plano deixa todas as novas prioridades desmarcadas. Ordene eventos em America/Chicago no formato de 24 horas `- HH:MM — Título`. Use `- 00:00 — (dia inteiro) Título` para dia inteiro. Inclua a seção de agenda mesmo vazia. Preserve contadores existentes. Em notas novas, deixe o registro de atividades e a reflexão vazios.

Use {{DAILY_DRIVERS}} para as rotinas da nota nova. Adicione rotinas desmarcadas quando houver evidência de resposta a patrocinador em `drafts/awaiting/`, revisão ou publicação de rascunho existente ou envio ou agendamento de vídeo já gravado. Referencie a nota de origem quando útil. Na seção de notas, conecte reflexões, bloqueios e atrasos em um parágrafo.

Em nota existente, use os títulos presentes na nota. A ponte atualiza apenas a seção de agenda e posições vazias na seção de prioridades. Entregue rotinas novas propostas e `### Atualização de Planejar hoje HH:MM` na seção de notas do artefato para revisão. A ponte salva a nota nova validada por inteiro.

Se a agenda falhar, comece com `BLOCKED:` e inclua `(calendar fetch failed)` no contexto. Entregue o que foi possível apurar. A ponte preserva o destino em caso de falha. Retorne o plano completo quando disponível.
