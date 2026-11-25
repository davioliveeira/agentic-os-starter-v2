# Projeto do modo de implementação em paralelo

Revisão 8. O projeto inicial foi aprovado na rodada 5. As emendas A e B foram revisadas após a segunda rodada de avaliação. O projeto amplia [claudex-loop](./SKILL.md), que se chamava Crucible até 16/08/2026, e a skill codex-build. O procedimento interativo disponível está em [TANDEM-MODE.md](../codex-build/TANDEM-MODE.md).

## Problema

Ao chegar à implementação, o fluxo original escolhe entre Claude e Codex. A geração raster nativa do Codex em modo sem interface, com autenticação ChatGPT e PNGs gravados em disco, pode contribuir em paralelo. A investigação precisa identificar essas capacidades conforme a entrega prevista.

## Capacidade, investigação e contrato

Cada entrada em [CODEX-CAPABILITIES.md](./CODEX-CAPABILITIES.md) tem ID estável, condições ligadas ao tipo de entrega, limites técnicos e de uso, ID implementado em `probes.sh` e registro da versão da CLI, modelo e conta usados. A primeira entrada, `image-gen-raster`, vale para entregas raster em PNG, como sprites, ícones, texturas e imagens de destaque. Geração vetorial exige entrada e verificação próprias. Mantenha os comandos no script auditado, com lista de verificações permitidas. Uma mudança nos dados do ambiente ou mais de 90 dias exige nova verificação.

Na fase 0, após detectar o contexto, compare as entregas com as condições. Registre a estratégia proposta no registro de suposições. Use `matched, unverified` se a verificação estiver desatualizada. As fases 0 a 2 admitem checagens sem escrita, como `codex --version` e leitura da configuração. Reserve a prova que gera arquivos para a abertura do Ato 3, depois de a pessoa confirmar a estratégia e numa área isolada.

Na fase 1, inclua no mapa de decisões dimensões, âncoras, atlas ou arquivos separados, disposição dos quadros, escalonamento, alfa, ação e alternativa de cada recurso. Trate paleta e descrição do estilo como decisões cosméticas. Congele `assets.contract.json` junto ao plano e referencie o manifesto na seção `## Assets` de `PLAN.md`.

```json
{
  "id": "player-idle",
  "path": "assets/sprites/player-idle.png",
  "action": "create",
  "baseline_sha256": null,
  "format": "png-rgba",
  "dims": [64, 64],
  "anchor": [32, 60],
  "frames": {"count": 4, "layout": "horizontal-strip"},
  "scaling": "nearest",
  "alpha": "straight",
  "style": "pixel art com quatro cores, luz no canto superior esquerdo",
  "fallback": "procedural-placeholder"
}
```

`create` pressupõe destino livre. `replace` exige o `baseline_sha256` do arquivo existente. A importação recusa colisões sem `replace` declarado e hash correspondente. Valide `procedural-placeholder`, `stock:<path>`, `omit` ou `user-provided:<path>` na fase 1. Confirme no disco as fontes fornecidas ou prontas e registre seus hashes no contrato. Se uma alternativa depender de nova decisão ou de o Claude consertar o recurso durante a execução, recuse o modo na resolução. O produtor mantém o contrato intacto e grava `out-r<N>/results.json` com IDs, hashes dos arquivos produzidos, estado de geração e origem. O Claude valida o manifesto com base no contrato imutável.

## Implementação e isolamento

Ofereça este modo na resolução somente quando a investigação registrar a estratégia. Exija commit base aprovado pela pessoa e árvore limpa. Num projeto novo, a pessoa pode preparar ou aprovar um commit inicial antes de escolher o modo. Na abertura, registre as áreas de escrita e o hash da base imutável usada na revisão de cada trilha. Se a capacidade estiver `matched, unverified`, execute uma verificação isolada na abertura do Ato 3, com um PNG pequeno para geração raster. A pessoa define a política de falha ao escolher o modo. Por padrão, o Claude implementa com as alternativas declaradas. Aplique a política automaticamente quando houver falha.

### Trilha de recursos

1. O Claude cria uma área de preparação inédita com cópias de `PLAN.md` e de `assets.contract.json` e uma pasta `out-r1/` vazia. A área deve ficar fora do repositório, sem contê-lo e sem outros processos com direito de escrita.
2. Antes de iniciar, confira a configuração efetiva da CLI. Fixe `-c sandbox_mode="workspace-write"` restrito à área de preparação e `-c approval_policy="never"`. Exclua raízes temporárias implicitamente graváveis. No Windows, tanto a preparação quanto pastas próximas do repositório podem estar na hierarquia de temporários. O Codex pode ler o repositório e só escreve na área de preparação.
3. Grave o prompt em arquivo temporário, passe por stdin (`codex exec ... - < "$PROMPT_FILE"`), capture os eventos com `--json` e a última mensagem com `-o`. Execute a tarefa Bash em segundo plano com limite de dez minutos. Extraia `thread_id` do evento `thread.started` correspondente à própria execução. Se ele faltar, declare falha.
4. Informe no prompt um `run_id` único para a chamada. Instrua a gerar sob `out-r1/<path>`, gravar `out-r1/results.json` e então criar `out-r1/READY-<run_id>` por último.
5. Encerre a árvore completa do processo se o tempo expirar. Uma rodada válida exige saída bem-sucedida registrada, marcador da própria rodada e manifesto completo. Marcadores na raiz ou de rodadas anteriores são inválidos.

### Trilha de código

6. O Claude implementa o aplicativo no repositório em paralelo, com arquivos carregados dos caminhos contratados. Enquanto os recursos estiverem ausentes, renderize substitutos em memória nas dimensões do contrato e mantenha testes sem interface. A área de recursos fica reservada à importação. As trilhas passam a compartilhar resultados após a preparação. A execução sequencial é o modo degradado.

### Conferência na preparação

7. Valide todo `results.json` contra o contrato, verificando presença de todos os IDs e correspondência de arquivos, hashes, dimensões, formato e alfa. Resolva os caminhos canônicos dentro da área permitida. Recuse caminhos absolutos, `..`, links simbólicos, pontos de nova análise, nomes reservados do Windows e colisões por maiúsculas ou com destinos não declarados.
8. Preencha o HTML fixo e auditado da skill com o contrato e os resultados. Abra-o sem acesso à rede. Mantenha o modelo sem scripts e fora da trilha de geração. Confira escala real, caixas de dimensões, linhas de âncora, fundo quadriculado para alfa, linhas de sprites e tiras de quadros.
9. Retome `codex exec resume <THREAD_ID>` com a mesma configuração explícita de sandbox e aprovação. Verifique o diretório de trabalho, cite achados por ID e use uma nova pasta `out-r<N>/` com seu próprio marcador. Registre como achado a mudança de hash de item aprovado. Após `MAX_FIX_ROUNDS=2`, aplique na preparação as alternativas declaradas para itens pendentes.
10. Congele o conjunto final de arquivos gerados e alternativas ativadas com seus hashes.

## Importação com registro recuperável

11. Declare um único `asset_root` canônico no contrato. Confirme que todos os destinos ficam abaixo dessa raiz ao aprovar o plano.
12. Forme a árvore candidata a partir da base completa, sobrepondo criações e substituições aceitas. Confira que todos os arquivos fora do contrato mantêm seus hashes e continuam presentes.
13. Imediatamente antes da primeira troca, compare a árvore viva com a base registrada na abertura. Aborte em caso de qualquer mudança externa não declarada ou conflito com o hash esperado em `replace`.
14. Grave cada transição do diário em `<staging>/import-journal-<run_id>.json`, fora das duas árvores, por arquivo temporário e troca de nome. Use `PREPARED` quando a revalidação passar e o candidato estiver congelado, `OLD_MOVED` ao mover `asset_root` para `asset_root.pre-<run_id>`, `NEW_ACTIVE` ao mover o candidato para `asset_root`, e `CLEANED` após remover a base temporária. Se um contrato formado apenas por `create` apontar para uma raiz inexistente, pule a primeira troca com `baseline_absent: true`. Só remova o diário depois de `CLEANED`.

O registro `<staging>/import-journal-<run_id>.json` fica fora das árvores. Grave-o por arquivo temporário e troca de nome. A tabela descreve a recuperação prevista:

| Estado | Situação | Recuperação |
|---|---|---|
| `PREPARED` | Base intacta | Descarte candidato e registro |
| `OLD_MOVED` | Base em `.pre`, destino vazio | Avance se o candidato verificar. Senão, restaure a base |
| `OLD_MOVED` com `baseline_absent` | Destino vazio sem base anterior | Avance se o candidato verificar. Senão, descarte candidato e registro |
| `NEW_ACTIVE` | Candidato ativo verificado e base em `.pre` | Conclua a limpeza, marque `CLEANED` e remova o registro |
| `CLEANED` | Registro restante sem `.pre` | Remova o registro |

Na próxima sessão ou sob demanda, confira a presença e os hashes das árvores durante a recuperação. O caminho principal pode ficar ausente entre as duas trocas de nome. A garantia do projeto é recuperação após interrupção com diário. O Windows exige operações separadas para substituir uma pasta não vazia. Registre os hashes importados e suas origens. A versão interativa usa a cópia validada descrita no guia de execução.

### Inspeção, comprovação e aprovação

15. Use uma nova sessão `codex exec -s read-only` para revisar o código com o plano, a base, o mapa de áreas e o diff somente do código. O Claude aceita ou rejeita achados registrando a justificativa conforme a fase 2. A inspeção dos recursos pelo Claude já aconteceu na preparação.
16. Só o Claude escreve no `PLAN-REVIEW-LOG.md`. Registre integralmente a saída dos revisores depois de cada execução, nas subseções de recursos e código de `## Act 3 — Tandem Build`.
17. O Claude executa testes, verificação de desempenho e captura de tela previstos no plano com os recursos reais.
18. Mostre diff, folha de contato da conferência visual, manifesto com hashes alterados e origem de cada recurso, incluindo rodada de geração ou alternativa acionada. Faça commit só depois da aprovação explícita da pessoa.

Mantenha intacto o procedimento de revisão da fase 2, inclusive prompt como argumento com `< /dev/null` e uso de `-s read-only` ou `-c sandbox_mode="read-only"`. As novas chamadas do Ato 3 no Windows usam prompt por stdin, configuração explícita, limite de dez minutos, encerramento da árvore e evento `thread.started` correlacionado. Limite as rodadas de revisão a `MAX_ROUNDS` e preserve as decisões humanas sobre suposições, requisitos, plano e entrega final.

## Emenda A — Avaliação visual

Escolha na fase 1 uma referência identificável, acessível e comparável. Busque e confira seu hash e guarde-a com os artefatos do plano aprovado, fora da árvore de trabalho. Na abertura do Ato 3, copie os bytes verificados para a área neutra de avaliação. Trave critérios ponderados, limites mínimos e normalização. Avalie adequação à tarefa, fidelidade ao contrato, legibilidade em escala real, composição, coerência e qualidade em relação à referência. `PASS` exige os mínimos e ausência de diferença material em favor da referência. Referência aspiracional serve como contexto.

Sorteie A/B e registre a semente. Para recursos, uma sessão independente do Claude recebe apenas a composição e os critérios. Para a interface, uma sessão nova do Codex em modo somente leitura recebe imagens anônimas e os critérios, fora do repositório. Registre escolha cega e justificativa integral antes de revelar A/B. Diferença material em favor da referência impede aprovação do candidato.

Use `PASS`, `FAIL`, `INVALID_COMPARISON`, `UNJUDGED` ou `NOT_APPLICABLE`. Uma comparação inválida permite uma repetição de preparação sem consumir a cota. A segunda exige `NEEDS_REPLAN`. Sem revisor independente, mostre a comparação à pessoa e use `DEGRADED_READY`. Sem referência comparável aplicável, use `NOT_APPLICABLE`.

Sprites usam resolução nativa e ampliação inteira por vizinho mais próximo, com fundo, ocupação e tempos equivalentes. Interfaces usam viewport, escala, tema, fontes, dados, estado e corte equivalentes. Preserve as cores e os pixels originais. Execute a avaliação dos recursos antes de congelar e importar, e a da interface após a prova integrada e antes da inspeção final. Alteração decorrente da avaliação exige repetir os controles afetados antes do julgamento seguinte ou da importação. `MAX_BAR_ROUNDS=2` inclui a avaliação inicial e admite só uma revisão. A segunda avaliação pode usar como candidato uma alternativa que passou pelas verificações de correção. Se continuar reprovado, declare `DEGRADED_READY` e mostre à pessoa a escolha entre entregar, refazer manualmente ou ajustar a referência.

## Emenda B — Execução autônoma prevista no Ato 3

Ao aprovar o plano, congele três artefatos: manifesto de autorização, grafo de dependências das verificações e máquina de estados. O manifesto declara raízes graváveis, comandos permitidos, política de rede e de dependências, tempo e ações proibidas. Toda ação passa por um executor único, que confere antes de executar o comando, diretório de trabalho, caminhos canônicos, rede, alterações de dependências e efeitos colaterais. Chamadas do Codex também carregam `-c` para impor sandbox e aprovação. Ações de shell do Claude passam pela mesma lista de permissões. Ações fora da autorização, incluindo decisões de produto, segurança, esquema ou escopo ausentes do plano, geram `NEEDS_REPLAN` com estado preservado. O manifesto pode restringir o plano aprovado. Commits, pushes, publicações, deploys, migrações e comunicações externas ficam fora deste ato em qualquer configuração.

Use uma ordem estável para desempatar verificações prontas. A sequência é recuperação e segurança, correção do contrato, avaliação de recursos, importação, prova integrada, avaliação da interface, inspeção cruzada e repetição dos controles afetados. A inspeção é a última verificação da execução e só perde validade se o diff inspecionado mudar. Faça uma inspeção e uma reinspeção após correções aceitas (`MAX_INSPECTION_ROUNDS=2`). Faça as correções voltarem aos controles afetados, registre razões para rejeições e use `NEEDS_REPLAN` para achados fora da autorização.

O estado durável fica em `system/runs/<run_id>/`, com escrita atômica por arquivo temporário e troca de nome antes e depois de cada ação, sempre com chave de idempotência. Garanta um proprietário exclusivo com ID, época, heartbeat e transferência condicional por compare-and-swap. Evite duplicação de ação quando a fila repetir uma entrega ou houver sobreposição de sessões. Na retomada, reconcilie `RUNNING` pelos efeitos, hashes e ID de sessão e conclua ou reverta antes de avançar. Guarde ID, modo, estado final, hashes da base, plano, contrato, referências e autorização, condições, contadores e limites, ações atual e pendentes com chaves, IDs de sessões Codex, diretório e sandbox esperados, processo, caminhos e hashes de artefatos, diário da importação, ordem e vereditos selados da comparação, decisões de inspeção e última transição concluída.

Cada ação incrementa um contador monotônico. Use `MAX_FIX_ROUNDS=2`, `MAX_BAR_ROUNDS=2`, `MAX_INSPECTION_ROUNDS=2` e o limite global `MAX_ACT3_ITERATIONS=20`. Ciclo, falta de progresso ou limite global atingido produzem `NEEDS_REPLAN` e preservam o diff, o estado, os contadores e os últimos artefatos verificados.

`run=session` é o padrão, na sessão ativa, com trilhas do Codex em segundo plano. `run=headless` é o modo previsto para compilar o Ato 3 em um prompt autossuficiente para a fila do Agentic OS. Antes de iniciar, o executor exato gera um atestado byte a byte igual ao manifesto aprovado, incluindo raízes canônicas, hashes de base e artefatos, permissões efetivas, versão, modelo, conta, ferramentas e limites. Aborte antes de iniciar se houver desvio. Aplique políticas declaradas para falhas, alternativas, limites e decisões. Mostre atualizações de estado sem bloquear e notificações de conclusão. Entregue resultado, diff, folha de contato, manifesto, origem, justificativas e provas.

Use `SUCCESS` para verificações e avaliações aprovadas, `DEGRADED_READY` para correção comprovada com avaliação esgotada ou alternativa ativada, `NEEDS_REPLAN` para decisão necessária além da autorização, e `HARD_FAILED` para prova de capacidade falha, importação irrecuperável ou divergência na sandbox ou no atestado.

## Decisões de escopo da revisão

- Considere um esquema completo para o catálogo quando ele superar cerca de cinco entradas.
- Execute em paralelo quando houver isolamento. Use o modo sequencial como alternativa degradada.
- Avalie capacidade com base na entrega e registre como proposta. A revisão manteve essa avaliação sem um motor estruturado de elegibilidade.
