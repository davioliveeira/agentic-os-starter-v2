---
name: github-trending
description: "Consulta repositórios novos e em alta no GitHub, identifica projetos de IA e desenvolvimento e gera um relatório no cofre. Use em /github-trending ou ao atualizar o cartão no Obsidian."
---

# Repositórios em alta no GitHub

O executor roda o script Python diretamente. Ele grava o Markdown que o cartão do Obsidian lê.

## Indicadores

1. **Em alta na semana** repositórios criados nos últimos sete dias, classificados por estrelas pela API REST.
2. **Em alta no mês** repositórios criados nos últimos 30 dias, classificados por estrelas.
3. **Maior crescimento (24h)** repositórios relevantes de qualquer idade, classificados por estrelas ganhas hoje na página `github.com/trending?since=daily`.
4. **Maior crescimento (30d)** classificação equivalente na página mensal.

Para os grupos 3 e 4, complemente estrelas, `created_at` e tópicos com uma consulta `GET /repos/{full}` por candidato. Use a contagem de crescimento da própria página. Quando a captura falhar, sinalize a seção e mantenha os outros resultados.

## Formato

O relatório fica em `inbox/research/github-trending/YYYY-MM-DD-trending.md`. Preserve os títulos e nomes de campos que `parseTrendingRepos` lê.

```
# Repositórios em alta no GitHub - YYYY-MM-DD (Dia da semana)

## 10 repositórios em alta na semana
_Repositórios criados nos últimos 7 dias em ordem de estrelas_

### N. [owner/name](url) **[AI/DEV]?**
- **Estrelas:** N | **Linguagem:** L
- **Criado em:** YYYY-MM-DD
- **Tópicos:** lista separada por vírgulas ou "nenhum"
- **Descrição:** …

---

## 5 repositórios em alta no mês
_Repositórios criados nos últimos 30 dias em ordem de estrelas_

(mesmo formato)

---

## 10 em maior crescimento (24h)
_Repositórios de IA e desenvolvimento em alta no dia, ordenados por estrelas ganhas_

### N. [owner/name](url) **[AI/DEV]?**
- **Crescimento:**  +N estrelas hoje (criado em YYYY-MM-DD)
- **Estrelas:** N | **Linguagem:** L
- **Criado em:** YYYY-MM-DD
- **Tópicos:** lista separada por vírgulas ou "nenhum"
- **Descrição:** …

---

## 10 em maior crescimento (30d)
_Repositórios de IA e desenvolvimento em alta no mês, ordenados por estrelas ganhas_

(mesmo formato, a linha Crescimento usa "+N estrelas neste mês")

(linha `**Crescimento:**` adicional nas seções 3 e 4 — `parseTrendingRepos` identifica cada bloco pelo título `## `. Use "(24h)" para velocity-day e "(30d)" para velocity-month.)

---

## Radar de conteúdo
- **Repositórios de IA e desenvolvimento:** X de 10
- **Destaque de IA:** [owner/name](url) - N estrelas
- **Por que vale conferir:** descrição

_Gerado automaticamente em YYYY-MM-DD às HH:MM_
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
