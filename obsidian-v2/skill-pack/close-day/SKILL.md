---
name: close-day
description: "Rotina de fechamento do dia em um cofre Agentic OS. Registra esforço, blocos de foco, publicações e uma reflexão na nota de hoje. Use com /close-day ou quando a pessoa quiser fechar, registrar ou revisar o dia."
---

# Fechar o dia

## 1. Encontrar a nota de hoje

Verifique se existe `daily-notes/YYYY-MM-DD.md`. Se faltar, peça à pessoa para usar **Planejar hoje** no painel. Encerre o fluxo nesse caso.

## 2. Coletar a reflexão

Pergunte de uma vez ou aceite uma resposta livre com os mesmos dados:

- **Esforço (1 a 10)** — quanto você se dedicou?
- **Blocos de foco** — quantos blocos de trabalho concentrado você completou?
- **Publicações** — quantas saíram em cada plataforma? Use `youtube`, `blog`, `linkedin`, `x`, `instagram` ou `tiktok`.
- **Reflexão** — em duas ou três frases, o que funcionou e o que precisa mudar?

## 3. Atualizar a nota diária

Execute o script a partir da raiz do cofre. Em outro diretório, defina `AGENTIC_OS_VAULT` com o caminho do cofre.

```bash
python "<pasta da skill>/scripts/close_day.py" \
  --effort 7 \
  --blocks 3 \
  --posts "youtube=1,linkedin=2" \
  --text "Concluí o painel e comecei a preparar a próxima entrega."
```

O script lê os itens marcados em `## 3 prioridades` ou `## Top 3 Priorities` e atualiza `effort`, `focus_blocks`, `posts_shipped` e `top3_done`. Informe `--videos` para atualizar `videos_shipped_today` com o total de vídeos publicados.

O script grava a reflexão na seção existente, em `## Reflexão do dia` ou `## EOD Reflection`, e mantém seu título. Se a seção estiver ausente, acrescenta `## Reflexão do dia`. Uma nova execução no mesmo dia substitui os valores registrados por essa rotina e preserva as demais seções.

## 4. Confirmar

Mostre os valores gravados e o texto da reflexão em português brasileiro. Consulte [[daily-note]] para detalhes do formato.
