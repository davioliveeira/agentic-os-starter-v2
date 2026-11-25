---
name: metrics-pull
description: "Atualiza as métricas de audiência e o uso local do Claude, com estado separado por fonte no CSV do cofre. Use em pedidos de atualização do painel ou com /metrics-pull."
---

# Atualizar métricas

O Jarvis e o painel do Obsidian usam estes indicadores. A ponte executa os scripts incluídos e mantém os resultados parciais quando uma fonte falha.

## Formato dos arquivos

O histórico em `<cofre>/system/metrics/metrics.csv` é incremental. Acrescente linhas conforme o esquema:

```
timestamp,source,metric,value,status,error
2026-05-13T03:20:30Z,claude_code,tokens_5h,1055478,ok,
2026-05-13T03:20:29Z,youtube,subscribers,124000,ok,
2026-05-13T03:20:29Z,tiktok,followers,1102,stale,layout_change
```

- `timestamp` — ISO 8601 em UTC, com sufixo Z.
- `source` — `claude_code`, `youtube`, `instagram` ou `tiktok`.
- `metric` — `tokens_5h`, `billable_5h`, `cache_read_5h`, `subscribers`, `views_28d`, `latest_video_views` ou `followers`.
- `value` — número. Use decimais para moeda e inteiros para contagens.
- `status` — `ok` para fonte atualizada, `mock` para dado simulado, `stale` para último valor conhecido, ou `error` em caso de falha.
- `error` — motivo curto e legível por máquina. Fica vazio com `ok`.

`last-pull.json` guarda uma fotografia do último estado por fonte, com `ts`, `status` e `error`. Ele é atualizado a cada coleta.

## Fontes e execução

O uso do Claude vem do registro local. A coleta do YouTube usa `YOUTUBE_API_KEY` e `YOUTUBE_CHANNEL_ID`. Para Instagram e TikTok, os scripts usam `INSTAGRAM_HANDLE` ou `TIKTOK_HANDLE` e leem o perfil público via Playwright/Chromium. Mantenha credenciais fora da saída. Uma mudança na página pode forçar o uso da última medição conhecida.

A ponte roda os scripts em sequência para proteger o CSV e os estados compartilhados:

```bash
python "<starter>/obsidian-v2/runner/scripts/metrics-pull/pull_claude_usage.py"
python "<starter>/obsidian-v2/runner/scripts/metrics-pull/pull_youtube.py"
python "<starter>/obsidian-v2/runner/scripts/metrics-pull/pull_instagram.py"
python "<starter>/obsidian-v2/runner/scripts/metrics-pull/pull_tiktok.py"
```

Cada execução acrescenta medições ao histórico. O painel compara a leitura mais recente com a referência anterior quando disponível. Em caso de fonte simulada ou desatualizada, mostre a condição junto ao valor. Preserve os identificadores e estados do esquema.
