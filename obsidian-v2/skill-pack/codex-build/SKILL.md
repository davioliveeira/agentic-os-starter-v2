---
name: codex-build
description: "Delega ao Codex a implementação de um plano definido e depois revisa o diff e verifica o resultado. Use para /codex-build ou para pedidos explícitos de implementação de uma especificação pelo Codex."
---

# Implementar com Codex

O agente supervisor cuida da especificação, da revisão e da comunicação em português brasileiro. O Codex implementa o escopo autorizado. Uma sessão nova pode usar o mesmo modelo. Fluxo adaptado do padrão Codex-first de Peter Steinberger.

## Preparar

- Leia o plano fornecido, por padrão `PLAN.md`. Inclua objetivo, caminhos relevantes, limites, entregas e critérios de aceitação no prompt. Resolva pelo repositório o que for possível e pergunte apenas quando a decisão mudar a implementação.
- Identifique os comandos de verificação na especificação, nos scripts do projeto ou no CI.
- Inspecione as alterações locais. Preserve o trabalho existente, inclusive entradas que ainda não entraram em commit. Use um checkout isolado quando apropriado e autorizado.
- Confira `codex --version`, `codex exec --help` e `codex exec resume --help`. Use o modelo configurado, salvo escolha explícita da pessoa. Registre o modelo efetivo se a CLI o expuser. Verifique as capacidades exigidas, como MCP, credenciais ou geração de imagens.
- Use as permissões já concedidas e respeite a política do ambiente.

## Executar

Grave o prompt em UTF-8 em um arquivo exclusivo na área de trabalho da tarefa. Rode na pasta de destino. Mantenha o prompt, relatório final, eventos JSONL e stderr no diretório da execução. Use `workspace-write` para as edições autorizadas quando o ambiente oferecer esse modo.

```powershell
Get-Content -LiteralPath $buildPromptPath -Raw |
    codex exec -s workspace-write --json -o $buildReportPath - 2> $buildErrorPath |
    Set-Content -LiteralPath $buildEventsPath -Encoding utf8
$buildExitCode = $LASTEXITCODE
```

Bash example:

```bash
codex exec -s workspace-write --json -o "$build_report_path" - < "$build_prompt_path" > "$build_events_path" 2> "$build_error_path"
build_exit_code=$?
```

Use o mecanismo de sessão assíncrona do ambiente e acompanhe o processo até terminar. Capture o ID da sessão no evento `thread.started`. Para considerar a execução concluída, confira o código de saída zero e um relatório final substancial. Em caso de falha, inspecione stderr.

## Verificar e corrigir

1. Leia o diff completo desde o estado inicial, confira escopo e correção e execute as verificações.
2. Caso haja erros, escreva um pedido de correção específico e retome a sessão pelo ID no mesmo checkout. Preserve a política de permissões. Confira na ajuda o mecanismo de configuração para retomada, como `-c sandbox_mode='"workspace-write"'`.
3. Use no máximo duas rodadas de correção delegada por padrão (`MAX_FIX_ROUNDS=2)). Depois disso, o supervisor conclui as correções autorizadas.
4. Registre o resultado e as evidências em `PLAN-REVIEW-LOG.md` ou no local escolhido pela pessoa.

## Entregar

Apresente a implementação, as verificações, os desvios e as pendências em português brasileiro. O supervisor cuida de commits e operações remotas conforme a autorização do usuário. Respeite os momentos de aprovação que ele tiver definido.
