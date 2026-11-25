# Capacidades do Codex para trabalho em paralelo

Na fase de investigação, compare as entregas com os critérios abaixo. Se houver correspondência, registre a divisão de trabalho como proposta. A pessoa escolhe se quer usar a estratégia em paralelo.

- Os identificadores abaixo correspondem às verificações em `probes.sh`. Mantenha os comandos executáveis nesse script.
- Vincule a verificação à versão da CLI, ao modelo configurado e à conta. Se algum componente mudar, volte ao estado `matched, unverified` e faça a verificação de novo antes de depender dela. Revalide também ao atingir 90 dias.
- Na investigação, use checagens sem escrita, como `codex --version`. Rode verificações que criam arquivos na área isolada da implementação, após a escolha da estratégia.
- Registre somente o que foi verificado e em qual modo. Diferencie raster de vetor e sessões CLI de sessões no editor.

## image-gen-raster

A geração de imagens produz PNGs em uma sessão `codex exec` sem interface, autenticada pelo ChatGPT e sem chave de API. A verificação gera uma imagem de 64 × 64 e confere dimensões e canal alfa. O teste histórico também comprovou repetição sem emendas, com zero diferenças de pixels nas bordas opostas e uma composição 4 × 4. Considere para texturas, ícones, sprites, elementos de interface, imagens de destaque, decalques e faces de skybox. Restrinja a geração a imagens raster sem marcas registradas. Descreva o estilo de cada recurso no contrato para manter consistência.

Identificador: `image-gen-raster`. Referência histórica: 2026-08-16, codex-cli 0.144.5, gpt-5.6-sol, autenticação ChatGPT. Confirme as capacidades atuais antes da implementação.

## procedural-threejs-model

Considere para objetos 3D low-poly gerados por código em three.js, como móveis, veículos simples e outros adereços. Os módulos são autossuficientes e retornam `THREE.Group`. A verificação grava uma função mínima e a executa em Node com um namespace de teste. O módulo histórico de 17 malhas passou na checagem de sintaxe e na execução com three.js em Node. Defina exportação, limites de dimensões, quantidade de malhas e versão da biblioteca no contrato. Verifique execução e aparência. Personagens orgânicos e malhas com rig ou animação exigem capacidades diferentes.

Identificador: `procedural-threejs-model`. Referência histórica: 2026-08-16, codex-cli 0.144.5, gpt-5.6-sol, autenticação ChatGPT.

## self-visual-verify

Quando o ambiente autorizar `sandbox_workspace_write.network_access=true`, o agente pode instalar Puppeteer e Chromium localmente, servir a cena e inspecionar sua captura com a ferramenta de imagem. O teste histórico usou WebGL via ANGLE/D3D11 na GPU do host. Isso ajuda a verificar o trabalho 3D antes da inspeção independente do Claude. Habilitar rede permite instalações npm na área de preparação e exige decisão explícita. Reserve de um a dois minutos para o primeiro download do Chromium. Use `npm_config_cache=./.npm-cache` se o cache global estiver sem permissão de escrita. Sem essa capacidade, entregue os arquivos para a conferência visual do Claude e declare que a verificação do produtor ficou pendente.

Identificador: `self-visual-verify`. A verificação é opcional e fica desativada por padrão devido ao download. Referência histórica: 2026-08-16, codex-cli 0.144.5, gpt-5.6-sol, autenticação ChatGPT.

## Capacidades pendentes de verificação

- Vetor ou SVG e geração de áudio aguardam verificações próprias.
- O catálogo 3D do Higgsfield MCP respondeu na sessão Codex, mas o envio de mídia travou no modo sem interface. A conversão completa de imagem em GLB segue pendente. Módulos procedurais com verificação da renderização cobrem os casos descritos acima.
- Blender e outras ferramentas de edição 3D externa pertencem a sessões no editor ou no desktop. O ambiente `codex exec` testado não oferecia acesso a elas.

Para acrescentar uma capacidade, verifique-a em uma execução real, registre o ambiente, implemente a verificação em `probes.sh` e documente o resultado. Se a lista superar cerca de cinco entradas, revise sua estrutura conforme [TANDEM-DESIGN.md](./TANDEM-DESIGN.md).
