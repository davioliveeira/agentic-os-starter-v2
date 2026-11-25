---
name: github-trending
description: "Consulta repositórios novos e em alta no GitHub, identifica projetos de IA e desenvolvimento e gera um relatório no cofre. Use em /github-trending ou ao atualizar o cartão no Obsidian."
---

# Repositórios em alta no GitHub

O executor roda o script Python diretamente. Ele grava o Markdown que o cartão do Obsidian lê.

## Indicadores

1. **This Week:** repositórios criados nos últimos sete dias, classificados por estrelas pela API REST.
2. **This Month:** repositórios criados nos últimos 30 dias, classificados por estrelas.
3. **Fastest Growing (24h):** repositórios relevantes de qualquer idade, classificados por estrelas ganhas hoje na página `github.com/trending?since=daily`.
4. **Fastest Growing (30d):** classificação equivalente na página mensal.

Para os grupos 3 e 4, complemente estrelas, `created_at` e tópicos com uma consulta `GET /repos/{full}` por candidato. Use a contagem de crescimento da própria página. Quando a captura falhar, sinalize a seção e mantenha os outros resultados.

## Formato

O relatório fica em `inbox/research/github-trending/YYYY-MM-DD-trending.md`. Preserve os títulos e nomes de campos que `parseTrendingRepos` lê.

```
# GitHub Trending - YYYY-MM-DD (Dia da semana)

## Top 10 Trending This Week
_Repositórios criados nos últimos 7 dias em ordem de estrelas_

### N. [owner/name](url) **[AI/DEV]?**
- **Stars:** N | **Language:** L
- **Created:** YYYY-MM-DD
- **Topics:** lista separada por vírgulas ou "none"
- **Description:** …

---

## Top 5 Trending This Month
_Repositórios criados nos últimos 30 dias em ordem de estrelas_

(mesmo formato)

---

## Top 10 Fastest Growing (24h)
_Repositórios de IA e desenvolvimento em alta no dia, ordenados por estrelas ganhas_

### N. [owner/name](url) **[AI/DEV]?**
- **Growth:** +N stars today (created YYYY-MM-DD)
- **Stars:** N | **Language:** L
- **Created:** YYYY-MM-DD
- **Topics:** lista separada por vírgulas ou "none"
- **Description:** …

---

## Top 10 Fastest Growing (30d)
_Repositórios de IA e desenvolvimento em alta no mês, ordenados por estrelas ganhas_

(mesmo formato, a linha Growth usa "+N stars this month")

(linha `**Growth:**` adicional nas seções 3 e 4 — `parseTrendingRepos` identifica cada bloco pelo título `## `. Use "(24h)" para velocity-day e "(30d)" para velocity-month.)

---

## Content Radar
- **AI/Dev-relevant repos today:** X out of 10
- **Top AI pick:** [owner/name](url) - N stars
- **Why it matters:** description

_Generated automatically at HH:MM on YYYY-MM-DD_
```

## Executar

```bash
python "<pasta do projeto>/obsidian-v2/runner/scripts/github-trending/fetch.py"
```

A ponte executa com a raiz do cofre como diretório atual. Para execução manual, informe `AGENTIC_OS_VAULT`; sem ele, o script usa `~/the-vault`.

## Classificação

A correspondência ignora maiúsculas nos tópicos e na descrição:

`ai, llm, gpt, claude, anthropic, agent, mcp, prompt, embedding, rag, deepseek, kimi, gemini, openai, copilot, codex, fine-tun, transformer, ollama, langchain, ai-`

A heurística dá uma indicação rápida. Revise possíveis falsos positivos e projetos relevantes com descrições vagas.

A execução consulta a busca para semana e mês, as páginas de tendências e os dados dos candidatos. Repetir manualmente muitas vezes pode atingir os limites da API. Quando houver `GITHUB_TOKEN` no ambiente, o script usa a conexão autenticada.
