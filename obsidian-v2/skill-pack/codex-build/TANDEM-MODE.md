# Modo de implementação em paralelo

Use quando a investigação de `claudex-loop` encontrar uma capacidade em [CODEX-CAPABILITIES.md](../claudex-loop/CODEX-CAPABILITIES.md) e a pessoa escolher esse modo. O Codex produz os recursos em uma área isolada. O Claude implementa o aplicativo no repositório e verifica os recursos. Uma sessão nova do Codex, somente de leitura, revisa o código. A revisão visual independente recebe a composição e os critérios sem o histórico dos produtores.

Este é o fluxo interativo da primeira versão de [TANDEM-DESIGN.md](../claudex-loop/TANDEM-DESIGN.md), aprovado em 16/08/2026 após oito rodadas de revisão. O modo futuro sem interface incluirá recuperação pelo diário de importação, execução exclusiva e verificação de quem iniciou o processo.

| Entrega | Produz | Confere |
|---|---|---|
| Texturas, sprites e modelos | Codex | Claude, com validação automática e visual |
| Código | Claude | Nova sessão do Codex em modo somente leitura |
| Qualidade visual dos recursos | Codex | Nova sessão de revisão do Claude, com contexto limpo |
| Qualidade visual da interface | Claude | Nova sessão de revisão do Codex, sem acesso ao repositório |

## Controles

| Opção | Padrão | Uso |
|---|---|---|
| `MAX_FIX_ROUNDS` | 2 | Rodadas de correção de recursos antes das alternativas previstas |
| `MAX_BAR_ROUNDS` | 2 | Julgamento visual inicial e uma nova avaliação |
| `MAX_INSPECTION_ROUNDS` | 2 | Revisão de código inicial e uma nova inspeção |
| `LOG_FILE` | `PLAN-REVIEW-LOG.md` | Só o Claude escreve em `## Act 3 — Tandem Build`. Registre a saída completa de cada revisor após a execução |

Informe exatamente um estado final. Use `SUCCESS` se todas as verificações e comparações aplicáveis aprovarem, `DEGRADED_READY` se as verificações de correção passarem com alguma alternativa acionada ou comparação visual pendente ou esgotada, `NEEDS_REPLAN` se uma correção necessária sair do plano, ou `HARD_FAILED` se a verificação de capacidade, o isolamento ou a importação falhar sem recuperação. Preserve o estado e devolva à pessoa decisões de produto, segurança ou esquema.

## Contrato

Congele `assets.contract.json` junto ao plano. Use um único `asset_root` e caminhos relativos dentro dele. Cada item tem ID, tipo, caminho, ação, especificação, hash da base para substituições e alternativa. Exemplo:

```json
{
  "id": "wall-concrete",
  "type": "raster",
  "path": "textures/wall-concrete.png",
  "action": "create",
  "baseline_sha256": null,
  "format": "png-rgba",
  "dims": [64, 64],
  "tileable": true,
  "style": "concreto cinza frio, iluminação uniforme, sem texto",
  "fallback": "procedural-placeholder"
}
```

Para raster, use `anchor`, `frames: {count, layout}`, `scaling` e `alpha` quando necessários. Para `model-module`, registre a assinatura em `export`, a faixa em `mesh_count: [min, max]`, as dimensões em `bounds`, a versão em `three_version` e, se aplicável, `render_check: true`. `action` permite `create` e `replace`. As alternativas permitidas são `procedural-placeholder`, `stock:<path>`, `omit` e `user-provided:<path>`. Confira a existência e o hash das fontes fornecidas ou prontas no momento de aprovar o plano. Use este modo apenas quando toda alternativa prevista puder ser aplicada sem nova decisão.

Se houver referência visual, registre caminho, hash SHA-256, critérios e normalização em `bar`. Registre `medium` e `fidelity_class` para verificar se referência e entrega têm meio e fidelidade comparáveis. Compare um jogo web low-poly com outro da mesma categoria, pixel art com pixel art de resolução comparável e interfaces web com interfaces da mesma classe de viewport. Troque referências incompatíveis por opções comparáveis ou marque-as como `"aspirational": true`. Referências aspiracionais aparecem na entrega sem veredito `PASS` ou `FAIL`.

## 1. Iniciar

Confirme `PLAN.md`, contrato, árvore limpa e commit base aprovado pela pessoa. Em projeto novo, a pessoa precisa registrar primeiro o commit da estrutura inicial. Registre o hash do commit base e as áreas de escrita. A zona de importação do Codex corresponde ao `asset_root` do contrato, e a zona do Claude é o restante do repositório. O Claude usa substitutos em memória até a importação. Confirme que todos os caminhos contratados ficam dentro de `asset_root`. Rejeite caminhos absolutos, `..`, links simbólicos, pontos de nova análise, nomes reservados do Windows e colisões sem distinção de maiúsculas.

Crie a área de preparação fora do repositório, com cópias do plano e contrato e uma pasta `out-r1/`. Se a capacidade estiver como `matched, unverified`, execute `bash ../claudex-loop/probes.sh <probe-id> <staging>` na preparação. Em caso de falha, aplique a política definida na resolução, normalmente a implementação pelo Claude com as alternativas declaradas.

## 2. Produzir

Execute `codex exec` a partir da área isolada, com `workspace-write` restrito a essa área, conforme as permissões do ambiente. Passe o prompt por stdin e registre o relatório e os eventos da própria execução. Obtenha `THREAD_ID` do evento correspondente `thread.started`. Se o evento faltar, declare falha. Use `run_in_background: true` e `timeout: 600000` por chamada. Habilite rede apenas se o contrato incluir módulos com verificação de renderização e o ambiente autorizar instalações locais. Redirecione o cache com `npm_config_cache=./.npm-cache`. O Codex pode consultar o código para integração. A escrita no repositório pertence à outra etapa.

Peça os arquivos sob `out-r1/<caminho>`, um `results.json` com ID, caminho, hash, estado e origem de cada recurso, e `READY-<RUN_ID>` criado por último. Peça dimensões exatas, formato, alfa e estilo para imagens raster. Para imagens repetíveis, exija zero diferenças entre pixels de bordas opostas. Para módulos, exija JavaScript autossuficiente com a assinatura combinada, que retorne um `THREE.Group` dentro da faixa de malhas e dimensões e possa ser executado em Node. Use captura de tela se a verificação da renderização estiver prevista. Mantenha `assets.contract.json` intacto. Uma rodada válida termina com código zero, manifesto completo e seu próprio marcador. Se expirar, encerre a árvore do processo e rejeite a rodada inteira.

Em paralelo, o Claude implementa o código sem gravar na área de recursos. Use caminhos previstos no contrato e substitutos em memória, com testes possíveis antes da importação.

## 3. Conferir recursos

1. Valide arquivos, hashes, formato, dimensões, alfa e caminhos. Para modelos, execute em Node e confira exportação, número de malhas e dimensões. Para texturas que se repetem, verifique as bordas.
2. Preencha [asset-lab-template.html](./asset-lab-template.html) com o contrato e os resultados e abra no painel do navegador. Confira escala real, âncoras, silhuetas, tiras de quadros e emendas.
3. Para correções, use `codex exec resume "$THREAD_ID"` com as mesmas permissões. Especifique achados por ID e grave uma nova pasta `out-r<N>/` com seu próprio marcador. Se algum hash já aprovado mudar sem explicação, registre como achado. Ao atingir `MAX_FIX_ROUNDS`, aplique na preparação as alternativas previstas para itens pendentes.
4. Se houver comparação visual contratada, compare os recursos na preparação, antes de importar. Normalize a apresentação, confira o hash da referência e sorteie A/B, registrando a semente. Abra uma sessão nova do Claude com acesso somente à composição anônima e aos critérios. Exija que o revisor responda primeiro qual imagem é melhor e persista o veredito antes de revelar a ordem. Se a referência tiver vantagem significativa, marque `FAIL` e use os critérios para explicar em que o candidato ficou aquém. Registre a justificativa integral. Aceite `PASS`, `FAIL` com os pontos a melhorar, ou `INVALID_COMPARISON`. Uma comparação inválida permite uma nova tentativa. A segunda invalidação exige `NEEDS_REPLAN`. Sem revisor, marque `UNJUDGED` e mostre a comparação na entrega. Após `FAIL`, revise uma vez com nova geração ou a alternativa declarada e julgue de novo. Se continuar reprovado após atingir o limite, use `DEGRADED_READY`.
5. Congele o conjunto validado e seus hashes.

## 4. Importar e verificar

Imediatamente antes de copiar, confira se a área de recursos do repositório mantém a base registrada e interrompa em caso de alteração externa não declarada. Copie só os caminhos contratados. Criações devem ter destino livre. Substituições exigem o `baseline_sha256` previsto. Registre hashes e origem da rodada ou alternativa. Mantenha dependências, arquivos temporários e repositórios auxiliares na área de preparação.

O Claude roda os testes, a verificação de desempenho e a captura de tela previstos no plano com os recursos reais. Trate os relatos do Codex como subsídios para a conferência. Para a comparação visual da interface, quando declarada, renderize o aplicativo com viewport, tema e estado fixos e use uma sessão nova do Codex, somente de leitura, em diretório neutro com as imagens anônimas e os critérios. Aplique as mesmas regras da comparação de recursos, incluindo escolha cega primeiro e justificativa integral. Reexecute as verificações afetadas por revisões. Por último, faça a inspeção de código em uma nova sessão somente de leitura (`codex exec -s read-only`) com plano, commit base, mapa de áreas e diff somente do código. O Claude aceita os achados e corrige, ou registra a justificativa de rejeição. Refaça as verificações afetadas até `MAX_INSPECTION_ROUNDS`. Mudança fora do escopo exige `NEEDS_REPLAN`.

Apresente resultado, diff, folha de contato dos recursos gerada no laboratório, manifesto com hashes e origem por item, comparações pendentes ou esgotadas, resumo de inspeção, evidências das verificações e rodadas utilizadas. Pergunte se a pessoa quer registrar o commit. Só o Claude pode fazer o commit depois da autorização.

## Regras do modo

- O Codex escreve na área de preparação. O Claude importa o conjunto validado.
- O contrato aprovado é imutável. O produtor registra sua entrega em `results.json`.
- A inspeção pertence sempre a quem não produziu o trabalho, com revisores de contexto limpo e sem acesso ao repositório quando a comparação for cega.
- Limite todas as rodadas. Se a comparação continuar reprovada ao atingir o limite, use `DEGRADED_READY`.
- Durante o Ato 3, mantenha commits, pushes, releases, implantações, migrações e comunicações externas suspensos.
- Aplique as decisões já previstas para cada desvio. Mantenha notificações de conclusão e atualizações curtas de estado.
