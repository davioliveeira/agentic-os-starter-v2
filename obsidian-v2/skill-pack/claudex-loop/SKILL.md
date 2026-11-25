---
name: claudex-loop
description: "Revisa planos em quatro fases: investigação, alinhamento, revisão independente no Codex e implementação opcional. Use para /claudex-loop, /crucible ou quando a pessoa pedir alinhamento e revisão cruzada antes de uma implementação importante."
---

# Revisar um plano com Claude e Codex

Responda em português brasileiro. A pessoa confirma as premissas, decide os pontos essenciais, aprova o plano convergido e revisa o diff final caso escolha implementar. Até aprovar o plano, todo trabalho no Codex é de leitura.

## Fase 0 — Investigar

Em projeto existente, leia a arquitetura, os módulos relevantes, os padrões, o esquema, a autenticação e a infraestrutura que o plano vai afetar. Procure `CONTEXT.md`, `CONTEXT-MAP.md` e `docs/adr/`. Use os termos e decisões já registrados.

Para projeto novo, pesquise soluções anteriores, uma stack padrão com uma alternativa relevante e três a cinco armadilhas que afetam a decisão.

### Definir a profundidade da pesquisa

Quando fontes externas ajudarem, ofereça os níveis com uma recomendação. Respeite `research=none|web|deep` já informado.

- `none` — use o contexto disponível e o código.
- `web` — faça buscas direcionadas sobre documentação, decisões e armadilhas. É o ponto de partida para a maioria dos projetos novos.
- `deep` — proponha uma pesquisa coordenada com agentes que buscam e aprofundam fontes, seguida de síntese. Use para tema desconhecido ou de alto impacto. Mostre primeiro o recorte e três a cinco perguntas para aprovação. Após a escolha e aprovação, use `model: 'opus'` em cada chamada de agente, com esforço padrão, e normalize argumentos recebidos com `const A = typeof args === 'string' ? JSON.parse(args) : args`. Salve a síntese em `inbox/research/YYYY-MM-DD-<slug>-crucible-research.md` com a seção `## Key Takeaways`. Vincule o arquivo ao plano e às premissas correspondentes.

Compare as entregas com [CODEX-CAPABILITIES.md](./CODEX-CAPABILITIES.md). Se houver trabalho de mídia paralelo, proponha a divisão descrita em [TANDEM-MODE.md](../codex-build/TANDEM-MODE.md) para aprovação. As fases de investigação, alinhamento e revisão não executam a parte de mídia.

Verifique skills relevantes em `~/.claude/skills/` e `~/.agents/skills/`, usando nomes e descrições. Registre em qual ferramenta cada skill existe e quais capacidades ainda precisam de teste no modo não interativo. Carregue skills para implementar apenas quando constarem na seção `## Toolchain` do plano aprovado.

Entregue de uma vez uma lista de premissas numeradas, com a fonte de cada uma, para a pessoa confirmar ou corrigir. Leve as correções que exigem escolha ao mapa de decisões.

## Fase 1 — Alinhar as decisões

Apresente um mapa que separa decisões caras de reverter de ajustes simples. Pergunte sobre uma decisão essencial por vez. Explique a pergunta, por que importa, a sua recomendação e a consequência concreta de uma escolha errada. Espere a resposta antes de avançar. Resolva dúvidas que o código ou a pesquisa já esclareçam. Agrupe ajustes simples com valores sugeridos e justificativas curtas.

A pessoa pode pedir para aceitar todas as recomendações restantes. Registre no plano quais decisões seguiram esse caminho. Ofereça essa opção quando houver mais de oito decisões essenciais.

Quando o projeto tiver glossário e ADRs, confira termos ambíguos e alegações sobre o código. Use cenários para explicitar limites entre conceitos. Atualize o glossário à medida que os termos forem definidos, conforme [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md). Use [ADR-FORMAT.md](./ADR-FORMAT.md) quando a decisão for cara de reverter, difícil de entender sem contexto e envolver uma escolha real entre opções. Se a estratégia em paralelo tiver sido aprovada, incorpore as decisões de mídia em `assets.contract.json` e congele o contrato junto com o plano.

Com o mapa resolvido, escreva `PLAN.md` com objetivo, etapas, decisões e alternativas, premissas com fontes, riscos, questões abertas e limites. Inclua `## Toolchain` quando a investigação tiver identificado skills ou capacidades relevantes. Inicialize o `PLAN-REVIEW-LOG.md` com o resultado do alinhamento e o limite de rodadas.

## Fase 2 — Revisar o plano

Confira `codex --version` (0.130 ou superior) e a autenticação. Use o modelo padrão da CLI. Antes da primeira rodada, mostre o modelo configurado ou informe que a CLI escolhe o padrão, junto com as opções abaixo.

| Opção | Padrão | Uso |
|---|---|---|
| `MAX_ROUNDS` | 5 | Limite absoluto de rodadas de revisão |
| `PLAN_FILE` | `PLAN.md` | Plano a revisar |
| `LOG_FILE` | `PLAN-REVIEW-LOG.md` | Histórico cumulativo da revisão |
| `research` | perguntar | `none`, `web` ou `deep` |
| `inspect` | `on` | Inspeção independente após implementação pelo Claude |
| `MAX_INSPECTION_ROUNDS` | 2 | Inspeção inicial e uma nova rodada após correções |

### Prompt de revisão

Peça ao Codex para ler o plano, o glossário e os ADRs aplicáveis. Ele deve apontar problemas concretos de segurança, concorrência, casos de borda, esquema, premissas, observabilidade e complexidade, com uma correção curta por problema. Dê acesso somente de leitura. Exija que a última linha seja exatamente `VERDICT: APPROVED` ou `VERDICT: REVISE`.

### Primeira rodada

```bash
codex exec -s read-only --json -o /tmp/codex-verdict.txt "$(cat REVIEW_PROMPT)" \
  < /dev/null 2>/dev/null | grep '"type":"thread.started"'
```
Capture `thread_id` do evento `thread.started`. Confira o arquivo de veredito junto com o evento. Se a invocação falhar por autenticação ou modelo, informe a causa e interrompa.

### Rodadas seguintes

```bash
# A retomada usa -c sandbox_mode para fixar o modo somente leitura.
codex exec resume "$THREAD_ID" -c sandbox_mode="read-only" --json \
  -o /tmp/codex-verdict.txt \
  "Revise novamente PLAN.md. Confira as correções e indique novos problemas. Termine com VERDICT: APPROVED ou VERDICT: REVISE." \
  < /dev/null 2>/dev/null >/dev/null
```
Use a mesma sessão para conservar o histórico da crítica. Feche a entrada padrão quando o prompt for argumento. Limite cada chamada a dez minutos e informe um eventual limite de tempo antes de tentar novamente.

Depois de cada rodada, acrescente a crítica completa ao log. Com `VERDICT: REVISE`, decida quais críticas procedem, corrija o plano, registre as razões e retome a análise até o limite. Com `VERDICT: APPROVED`, mostre o plano final, o número de rodadas, os principais ajustes e as questões que sobraram. Se atingir o limite sem convergir, mostre os desacordos à pessoa. Aguarde seu aval antes da implementação.

## Fase 3 — Implementar, se solicitado

- Se a pessoa escolher Codex, use [codex-build](../codex-build/SKILL.md) com `SPEC_FILE=PLAN.md` e o mesmo `LOG_FILE`. O Claude revisa o diff completo e roda as verificações.
- Se escolher Claude, implemente e rode as verificações. Depois abra uma sessão nova do Codex somente para leitura, com plano, commit base e diff. Peça achados de correção, fidelidade e casos de borda. Corrija os achados aceitos, com nova verificação, e registre os rejeitados com justificativa. Respeite `MAX_INSPECTION_ROUNDS`. Se a pessoa escolher `inspect=off`, registre a escolha no log.
- Se a opção em paralelo foi aprovada, siga [TANDEM-MODE.md](../codex-build/TANDEM-MODE.md), que inclui a inspeção dos resultados.

Mostre o diff final, o que as verificações demonstram e o que ainda precisa de decisão. Use este fluxo para revisar planos antes de implementar. Para revisar código que já existia, use `/codex:review`.
