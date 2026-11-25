<%*
// O Templater prepara a data. O plugin Notas diárias já cria o arquivo
// em daily-notes/YYYY-MM-DD.md, por isso o modelo reaproveita seu nome.
const dateIso = tp.file.title.match(/^\d{4}-\d{2}-\d{2}$/)
  ? tp.file.title
  : tp.date.now("YYYY-MM-DD");
-%>
---
date: <% dateIso %>
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

# <% dateIso %>

## Foco atual


## 3 prioridades
1. [ ] 
2. [ ] 
3. [ ] 

## Agenda
- 

## Rotinas diárias
- [ ] Triar a caixa de entrada
- [ ] Separar um bloco de foco
- [ ] Revisar o dia

## Registro de atividades


## Notas


## Reflexão do dia

