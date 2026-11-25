---
name: yt-search
description: "Pesquisa vídeos e canais no YouTube pela API oficial. Use quando a pessoa quiser encontrar vídeos sobre um tema, comparar publicações ou descobrir conteúdos em alta."
---

# Pesquisar no YouTube

Execute o script na pasta desta skill. Ele consulta a YouTube Data API v3 e reúne métricas dos vídeos encontrados.

```bash
python "<pasta da skill>/scripts/search.py" <termos> [--count N] [--months N] [--days N] [--no-date-filter] [--order relevance|date|viewCount|rating] [--lang pt] [--no-shorts] [--json]
```

- `<termos>` — palavras da busca, obrigatórias.
- `--count N` — total de resultados. O padrão é 20.
- `--months N` — publicações dos últimos N meses. O padrão é seis.
- `--days N` — publicações dos últimos N dias. Tem prioridade sobre `--months`.
- `--no-date-filter` — inclui publicações de qualquer período.
- `--order` — ordena por relevância (padrão), data, visualizações ou avaliação.
- `--lang pt` — prioriza resultados no idioma escolhido. É uma preferência de ordenação.
- `--no-shorts` — exclui vídeos de até três minutos.
- `--json` — inclui tamanho do título, idade em dias, ID do canal e URL da miniatura na saída estruturada.

```bash
python "<pasta da skill>/scripts/search.py" tutorial claude code
python "<pasta da skill>/scripts/search.py" fluxo obsidian --count 5 --months 3
python "<pasta da skill>/scripts/search.py" agentes de IA --days 14 --count 15 --order viewCount --lang pt --no-shorts
python "<pasta da skill>/scripts/search.py" agentes de IA --count 10 --no-date-filter
```

## Apresentar os resultados

Responda em português brasileiro. Para cada vídeo, apresente título original, canal e inscritos, visualizações, duração, data de publicação, relação de visualizações por inscrito e link direto. Uma relação alta indica que o vídeo alcançou um público maior em relação ao tamanho do canal. O script usa stderr para mensagens de status e stdout para os resultados.

## Tratar falhas

- `0` — resultados disponíveis.
- `1` — falha de configuração ou da API, como chave ausente, erro HTTP ou cota esgotada. Informe a causa ao usuário.
- `2` — argumentos inválidos.
- `3` — nenhum vídeo retornado. Amplie o período ou revise a consulta antes de tentar novamente.

A chave `YOUTUBE_API_KEY` deve estar no ambiente ou em `~/.claude/.env`. Use a chave configurada sem exibi-la. Cada página da pesquisa, com até 50 resultados, consome 100 unidades da cota, além de cerca de duas unidades para as estatísticas. A cota padrão de 10 mil unidades por dia é compartilhada com os demais fluxos do YouTube.
