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

O script lê os itens marcados na seção `Top 3 Priorities` e atualiza `effort`, `focus_blocks`, `posts_shipped`, `videos_shipped_today` e `top3_done`. Informe `--videos` para gravar explicitamente o total de vídeos publicados. A reflexão fica em `## EOD Reflection`. Preserve os nomes dessas seções e campos para que o painel consiga ler a nota.

Uma nova execução no mesmo dia substitui os valores anteriores dessa rotina e preserva as demais seções, como `Activity Log`, `Notes` e `Schedule`.

## 4. Confirmar

Mostre os valores gravados e o texto da reflexão em português brasileiro. Consulte [[daily-note]] para detalhes do formato.
