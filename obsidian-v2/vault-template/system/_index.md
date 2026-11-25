# Sistema

O plugin, a ponte local e as skills usam esta pasta. Edite arquivos manualmente apenas quando a documentação do esquema indicar como fazê-lo.

- **schemas/** — esquemas como o formato da nota diária. Consulte [[daily-note]] antes de alterar notas diárias.
- **templates/** — modelo de nota diária conforme o esquema.
- **metrics/** — histórico incremental em `metrics.csv` e estado de cada fonte em `last-pull.json`.
- **bases/** — visões do Obsidian Bases para projetos e publicações, alimentadas pelo frontmatter.
- **v2/** — estado do V2, incluindo `queue/`, `processing/`, `runs/`, `logs/`, `artifacts/` e as preferências em `profile.json`.
- **queue/** e **runs/** — pastas históricas. O V2 ainda lê os registros antigos em `runs/`.

Um pedido por botão ou por voz entra em `v2/queue/<id>.json`, passa por `v2/processing/` e é executado pelo Claude ou Codex. O estado fica em `v2/runs/<id>.json`. Use `v2/logs/` e `v2/artifacts/` para acompanhar os detalhes e arquivos.

Consulte [[CLAUDE]] para as convenções dos agentes. Para iniciar o Agentic OS ao entrar no computador, use `node aos.mjs autostart on` na pasta do projeto.
