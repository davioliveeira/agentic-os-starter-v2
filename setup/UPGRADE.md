<a name="upgrade-playbook-for-the-coding-agent"></a>

# Atualização do Agentic OS para agentes de código

Ajude a pessoa a melhorar o Agentic OS que já usa, preservando suas notas, skills e personalizações. No início, ela escolhe entre **primeira instalação** e **atualizar uma instalação existente**. Discuta a escolha de recursos depois de identificar o sistema atual.

Siga um pedido explícito de atualização mesmo se o repositório contiver `obsidian-v2/.runtime/aos-setup.json`. Esse arquivo registra uma instalação anterior. Em um pedido de reparo, use a mesma descoberta para localizar a instalação e depois siga as instruções de reparo em `PLAYBOOK.md`.

```text
Localizar o sistema atual (somente leitura)
              |
Explicar o que pode ser adicionado e o que precisa mudar em conjunto
              |
A pessoa aprova um plano concreto
              |
Preparar e testar as mudanças longe dos serviços em execução
              |
A pessoa autoriza a troca de serviços -> verificar -> manter a reversão disponível
```

<a name="1-find-their-installation-for-them"></a>

## 1. Localize a instalação

Rode na raiz desta distribuição.

```text
node aos.mjs upgrade
```

Se você obteve esta cópia separadamente para orientar a atualização, trate-a como referência. Identifique a cópia em execução antes de prosseguir. Ao obter estas instruções, clone em uma pasta separada de qualquer projeto existente.

O comando encontra candidatos em locais de instalação conhecidos, nos cofres registrados pelo Obsidian e nos metadados de localização de um monitor ativo que não contêm dados secretos. É **somente descoberta**, sem baixar versões, instalar pacotes, alterar arquivos, rodar o diagnóstico, parar serviços ou aplicar atualizações. Deixe `git fetch`, `git pull`, verificações de saúde e reinícios de serviços fora dessa fase. O comando `upgrade --apply` não existe.

Se o Node estiver ausente, explique que o comando de descoberta precisa dele e siga os pré-requisitos em `PLAYBOOK.md` com as permissões normais de instalação. A permissão para instalar o Node cobre apenas esse pré-requisito.

Leia o relatório real, incluindo locais indisponíveis, erros e verificações puladas. Um candidato indica que pode haver uma instalação. A saúde e a compatibilidade ainda precisam ser verificadas. A ausência de candidatos pede uma checagem com a pessoa. Mostre um resumo curto em linguagem comum, por exemplo.

> “Encontrei seu cofre Trabalho com clientes e uma pasta do Agentic OS associada. Vou comparar o código e as configurações que não contêm dados secretos antes de recomendar mudanças. O seu sistema continua rodando como estava.”

Se houver vários candidatos plausíveis, pergunte pelo **nome do cofre** que a pessoa usa, listando os nomes encontrados. Use as evidências para identificar a instalação correspondente. Recorra aos caminhos somente para distinguir candidatos que continuarem ambíguos. Para confirmar um destino conhecido, use estas opções você mesmo.

```text
node aos.mjs upgrade --install "<identified installation folder>" --vault "<identified vault folder>"
```

Se a descoberta não encontrar candidatos, oriente a pessoa a abrir o seletor de cofres do Obsidian e identificar o cofre que usa. Ajude-a a revelar a pasta com a opção do Obsidian que abre o local no explorador do sistema e use o caminho exibido. Se a versão do aplicativo não tiver essa opção, oriente a pessoa pelo Finder ou Explorador de Arquivos a partir do cofre que ela reconhece. Não peça que a pessoa saiba os caminhos de memória nem faça uma busca recursiva na pasta pessoal inteira. Se realmente não houver Agentic OS instalado, explique o resultado e ofereça a primeira instalação.

<a name="2-compare-the-chosen-system-without-disturbing-it"></a>

## 2. Compare o sistema escolhido sem interferir nele

Limite a inspeção à instalação escolhida e aos arquivos pertinentes do cofre que não contenham dados secretos. Leia manifestos, versões de pacotes, pontos de entrada do código, scripts de inicialização, instruções das skills escolhidas e esquemas explícitos de configuração conforme necessário. O status do Git, as diferenças limitadas aos nomes dos arquivos e os IDs de commits ajudam a identificar mudanças. Abra só os arquivos selecionados que não contenham dados secretos. Nunca despeje todas as variáveis de ambiente, todos os arquivos de execução ou configuração ou todas as diferenças do repositório.

Nunca leia, exiba ou copie `jev.json`, `bridge-auth.json`, `providers.json`, `.credentials.json` ou `~/.claude/.env`. Nunca obtenha chaves pelo chat. A presença de um arquivo de credenciais não autoriza a leitura. Se for preciso configurar uma chave para a troca de serviços, a própria pessoa usa a página local existente para inseri-la.

Registre evidências sobre estes pontos.

- Qual cofre, pasta de instalação e revisão de código correspondem entre si e qual instalação usa as portas dos serviços, se for possível identificar.
- Se é uma versão V2 da distribuição mantida, uma V1 ou um projeto personalizado ou desconhecido. Uma cópia Git sem mudanças pendentes pode conter personalizações em commits. Confirme a origem do código.
- O painel personalizado, as skills, os fluxos, a estrutura das notas e as alterações de integração relevantes. Pergunte o que a pessoa valoriza e usa com frequência. A presença de um arquivo informa o que está disponível.
- Quais mudanças propostas exigem versões correspondentes da ponte, do plugin, do Jarvis ou do inicializador. Leia os contratos antes de afirmar que há compatibilidade.

Reserve o diagnóstico e a execução de fluxos existentes para a validação no plano aprovado. `doctor --full` consome a cota do provedor e grava um relatório. Limite o inventário às notas pertinentes e preserve as configurações do cofre.

<a name="3-explain-choices-then-recommend-a-compatible-plan"></a>

## 3. Explique as opções e recomende um plano compatível

Comece com *“O que você quer melhorar na versão que já usa? Posso também explicar o que esta distribuição oferece e sugerir por onde começar.”* Preserve as personalizações por padrão. A pessoa pode escolher quais recursos quer. Alguns componentes precisam ser atualizados em conjunto.

Use a lista para orientar a conversa e verifique a compatibilidade no código.

| Recurso | O que oferece | Dependências a conferir |
|---|---|---|
| Painel do Obsidian | Plano diário, métricas e controles de fluxos no cofre | Plugin e ponte compatíveis, convenções existentes de notas e de interpretação dos arquivos e Obsidian. Conversas de skills pessoais no Obsidian também exigem o plugin da comunidade Terminal, em uma versão 3.x estável a partir da 3.27.1. |
| Jarvis | Painel no navegador e terminais para agentes | Jarvis, ponte e configuração do inicializador e do monitor compatíveis, mais a CLI do Claude Code ou Codex escolhida. |
| Voz local | Reconhecimento de fala e respostas faladas no computador | Ponte e cliente de voz compatíveis, requisitos de Python e modelos, permissão de microfone e um serviço de voz próprio ou compartilhado já compatível. |
| Jev opcional | Encaminhamento de pedidos falados pela OpenRouter | Roteamento de voz compatível, conta e créditos da pessoa na OpenRouter e chave inserida localmente. A voz funciona sem Jev. |
| Voz ao vivo opcional | Chamada de voz em que o assistente responde com base no dia da pessoa e encaminha tarefas reais aos agentes | Versões correspondentes da ponte, do plugin e do Jarvis a partir da 0.4, permissão de microfone e conta própria da API da OpenAI com créditos. ChatGPT Pro e Business incluem créditos mensais da API após resgate. O Plus não inclui. A pessoa insere a chave localmente e a OpenAI cobra as chamadas. A voz local segue disponível. |
| Sobre mim | Perfil curto no `AGENTS.md` do cofre, lido pelos agentes | Ponte compatível e texto aprovado pela pessoa. Se a voz ao vivo estiver ativa, a OpenAI recebe o texto no início de cada chamada. |
| Botões personalizados do painel | Escolha e ordenação de até dez skills incluídas ou instaladas | APIs do painel, esquema de configuração e versões da interface correspondentes. Confira a ferramenta de código e as dependências de cada skill pessoal. No Obsidian, elas exigem o Terminal. O Jarvis pode executá-las sem esse plugin. |
| Fluxos incluídos | Relatórios e rascunhos de planejamento, pesquisa e conteúdo, entre outros | Executor, ponte e convenções do cofre compatíveis, sessão ativa no provedor de código e conectores exigidos pelo fluxo. |

Por exemplo, diga *“Você quer botões para suas skills e gosta do desenho atual do seu painel. Recomendo manter o desenho e integrar juntos a API do painel, o armazenamento da seleção e os controles de botões compatíveis. Vou conferir os contratos da ponte antes de integrar esses componentes.”*

Leia os trechos pertinentes do código atual e do novo para fundamentar a recomendação. Identifique o que pode continuar, o que precisa mudar junto e o que ainda exige confirmação. Se um recurso não se encaixar com segurança na versão atual, explique a dependência ausente e ofereça uma atualização mais ampla e coerente ou adie o recurso. Nunca prometa uma mesclagem automática universal.

Antes de aplicar mudanças, apresente um plano concreto. Inclua o cofre e o projeto escolhidos, os recursos pedidos, os arquivos ou grupos de componentes exatos a alterar, as personalizações a preservar, as decisões sobre conflitos, o local da cópia de segurança restrita, os testes, o procedimento de reversão e qualquer interrupção posterior dos serviços. Explique custos opcionais e configuração de contas quando forem relevantes. Obtenha aprovação para o plano com esses detalhes.

<a name="4-use-the-appropriate-execution-case"></a>

## 4. Aplique o procedimento adequado ao projeto

Esses casos orientam o trabalho do agente. Explique as consequências de forma simples, sem pedir que a pessoa diagnostique o próprio projeto.

<a name="a-recognized-stock-v2-starter-update-it-as-a-whole"></a>

### A. Distribuição padrão V2 reconhecida

Use a pasta da instalação existente. O atualizador deste fork reconhece o repositório original da Chase AI (`ctskool/agentic-os-starter-v2`) e o fork em português (`davioliveeira/agentic-os-starter-v2`). O remoto `origin` é um dos critérios. O comando também avalia o estado do checkout, e cada distribuição se atualiza a partir do próprio repositório. A ponte, o plugin do Obsidian, o Jarvis e os inicializadores são mantidos em uma mesma versão. A pessoa ainda pode escolher quais recursos opcionais usar. Preserve o cofre, a seleção de botões e as preferências compatíveis.

Depois que a pessoa aprovar o plano e a troca específica dos serviços, rode `node aos.mjs update` da pasta existente. O comando altera o código e recompila o sistema. A proteção recusa cópias personalizadas ou desconhecidas **antes de parar os serviços**. Se houver recusa, identifique as personalizações e vá para o caso C. Preserve os arquivos e a proteção. Nunca force um pull nem clone por cima da pasta existente para contornar a recusa.

Uma instalação antiga pode ter um atualizador sem essa proteção. As versões 0.3.64 anteriores a 22 de setembro de 2026 também executam o instalador *antigo* após o pull. Nesses casos, as etapas novas, como a escolha da ferramenta de código, a atualização dos pacotes de voz e os reparos do início de sessão, ficam pendentes. Depois de uma atualização assim, rode `node aos.mjs doctor`. Se aparecer `FAIL Instalação concluída para esta versão` (no original, `FAIL Setup finished for these files`), rode `node aos.mjs stop` e depois `node aos.mjs setup` uma vez. O comando preserva o cofre, as notas e as escolhas salvas, e parar os serviços primeiro permite atualizar os pacotes de voz. Rode o diagnóstico de novo e só informe que a atualização terminou quando essa linha passar. Antes de usar um atualizador antigo, inspecione seu código sem dados secretos. A cópia de referência é separada do código instalado. Use o atualizador antigo apenas se a comparação somente para leitura confirmar que é a distribuição padrão e se o comportamento revisado fizer parte do plano aprovado. Se faltar essa confirmação, siga o caso C.

Faça as verificações disponíveis sem mexer nos serviços antes da troca. Siga a seção 6 para verificar o sistema em execução e decidir sobre reversão. Se houver recusa por trabalho ativo, deixe a pessoa concluir as tarefas antes de continuar.

<a name="b-v1-to-v2-migrate-the-whole-system-while-keeping-the-vault"></a>

### B. Migração de V1 para V2 com o mesmo cofre

Mantenha a instalação V1 e o plugin antigo disponíveis. Prepare o V2 em uma pasta própria comum, fora do cofre e das pastas sincronizadas na nuvem. Reuse o cofre só depois de comparar as convenções das notas existentes com os arquivos que o V2 adicionará. Preserve cada nota e todas as configurações do Obsidian. Resolva convenções incompatíveis com a pessoa, mantendo as notas existentes.

Compile e valide o V2 primeiro em um cofre descartável, apenas com dados fictícios ou outros exemplos sem dados secretos. Revise o executor antigo e identifique o que controla a inicialização. Investigue o que o executor faz e preserve tanto o executor quanto seu item de início de sessão durante a preparação. Se houver conflito com as portas fixas dos serviços, combine uma troca com a autorização da pessoa.

Para instalar no cofre real após aprovação, siga as fases pertinentes do guia de primeira instalação com o cofre já selecionado. Inicie apenas um dos conjuntos de serviços em conflito. Peça à pessoa que habilite o plugin V2 para verificar. Mantenha o plugin antigo instalado. Só desative o painel antigo depois de verificar o V2 e obter a aceitação da troca. Se o V2 falhar, volte a iniciar os serviços anteriores pelos scripts deles e peça à pessoa que restaure o painel antigo. Remover a instalação antiga é uma decisão separada para depois.

<a name="c-customized-or-unknown-project-integrate-the-approved-scope"></a>

### C. Integração aprovada em projeto personalizado ou desconhecido

Esse trabalho acontece no projeto da pessoa e exige comparação de código, implementação e testes. Explique que atualizações futuras podem exigir o mesmo cuidado. Aplique `setup`, `update`, cherry-picks ou substituições de pastas nesse projeto somente após revisão.

Depois da aprovação do plano, siga estas etapas.

1. **Prepare uma cópia de trabalho ou branch isolada.** Preserve o código em execução durante a implementação. Trabalhe no projeto da pessoa e delimite explicitamente os arquivos de código e teste sem dados secretos que podem ser usados. Nunca copie `.runtime`, pastas de credenciais, o cofre inteiro ou toda a pasta `.obsidian`. Nunca faça commit de grande parte do cofre. Se usar Git, prepare para commit somente as alterações revisadas sem dados secretos. A integração pode ser feita sem commit.
2. **Prepare uma reversão restrita.** Salve, fora do cofre, as versões exatas prévias dos arquivos sem dados secretos que a integração aprovada vai alterar. Registre os caminhos novos, a revisão do código, os arquivos de travamento de dependências e o procedimento de início e parada da própria instalação. Preserve a compilação em uso até validar a substituta. Nunca faça cópia de segurança de segredos copiando o diretório de execução.
3. **Resolva os conflitos reais.** Mostre qual comportamento muda com cada conflito. Se a intenção for ambígua, pergunte se a pessoa prefere manter sua versão, adotar o comportamento da distribuição ou combinar partes específicas. Resolva cada conflito com base no comportamento desejado. Nunca escolha `theirs` ou `ours` para a mesclagem inteira só para concluí-la. Deixe código personalizado, notas e configurações não relacionados fora do diff.
4. **Implemente um conjunto compatível.** Em cada recurso escolhido, compare os endpoints da ponte, a autenticação e a identidade do aplicativo, o tratamento de tarefas, provedores e modelos, os formatos de eventos, os esquemas do cofre, os consumidores no plugin e no Jarvis e os caminhos dos inicializadores. Integre juntas as dependências necessárias. Preserve as interfaces existentes ou adicione um adaptador explícito quando for viável. Valide a compatibilidade por esses contratos e testes.
5. **Valide longe do sistema que a pessoa está usando.** Rode os testes unitários e de contrato pertinentes e compile com dados sintéticos. Use um cofre descartável para testes de instalação e fluxos. Simule as ações externas e use arquivos descartáveis de skills. Mantenha o cofre real fora dos dados de teste. Nunca envie mensagens, publique, compre ou faça outras alterações em contas só para testar uma skill. Se a instalação atual ocupar as portas fixas, espere a troca combinada para testar os serviços nessas portas. Depois dos testes offline, valide os serviços em execução.
6. **Revise o resultado antes da troca.** Resuma o comportamento implementado, os arquivos exatos alterados, os testes que passaram, cada falha ou verificação pulada, os riscos restantes e o procedimento de reversão. Se a implementação revelar conflitos novos ou exigir uma ampliação significativa do escopo, resolva com a pessoa antes de ampliar.

A integração aprovada é a exceção explícita à regra de preservar o código da distribuição. A aprovação para adicionar uma skill pela configuração do painel cobre apenas a configuração. Mantenha no projeto um registro curto da integração, limitado a informações sem dados secretos e aos arquivos cuja criação a pessoa aprovou. Marque o projeto como dependente de **integrações manuais futuras** até que seja compatibilizado com uma versão reconhecida da distribuição mantida. Antes de orientar o uso de `update`, confira se a instalação atende aos requisitos da distribuição padrão.

<a name="5-preserve-preferences-and-secrets"></a>

## 5. Preserve as preferências e os segredos

Mantenha as notas, skills personalizadas, preferências do perfil e ordem do painel, salvo mudanças explícitas que a pessoa escolheu. Preserve as configurações `.obsidian` e oriente a pessoa a ativar ou desativar plugins pela interface do Obsidian. Se for necessário migrar um esquema, mostre exatamente quais configurações sem dados secretos mudam e faça cópia de segurança apenas desse conjunto antes de aplicar.

Um serviço de voz compartilhado compatível pertence a quem o opera. Mantenha-o em execução e com a configuração de origem durante os testes. Preserve tarefas de recuperação e itens de início de sessão não relacionados. Para mudar o que inicia a própria instalação, inclua no plano a permissão específica e o procedimento de reversão.

Quando for necessário configurar a chave de Jev, a pessoa usa a página de `node aos.mjs jev-key`. Para a chave da OpenAI da voz ao vivo, usa a página de `node aos.mjs openai-key`. Deixe os arquivos secretos da instalação antiga fechados. Explique e verifique os conectores necessários com a pessoa, sem ler credenciais. A inspeção da instalação identifica configurações, e o acesso à conta é verificado à parte.

<a name="6-handoff-verification-and-rollback"></a>

## 6. Troca de serviços, verificação e reversão

Antes de interromper qualquer serviço, mostre qual instalação vai parar, qual vai iniciar, o que a pessoa deve concluir antes e como restaurar o sistema anterior. Obtenha consentimento explícito para essa troca. A aprovação para inspecionar ou preparar código cobre apenas essas etapas. Se a pessoa já aprovou expressamente a mesma troca para esse ponto do plano, siga com a autorização existente.

Use os scripts de parada e início da instalação correspondente. Identifique cada processo antes de agir e deixe os processos não identificados em execução. Respeite as proteções de conversas ativas. Só uma instalação pode usar as portas 3217–3221 por vez. Deixe como estão os serviços de voz e de recuperação não relacionados.

Depois da troca aprovada, rode o diagnóstico da instalação escolhida. Rode `doctor --full` somente se estiver no plano de validação aprovado e explique que executa um fluxo real na assinatura da pessoa e grava um relatório. Teste os recursos escolhidos além da inicialização. Abra o painel do Obsidian e o Jarvis, confira a ordem salva dos botões e teste a voz se estiver ativa. Para uma skill pessoal, peça uma tarefa real e inofensiva ou use uma amostra descartável. Verifique a execução do fluxo depois do registro.

Relate PASS / FAIL / WAIT / SKIP exatamente como aparecerem, com o texto dos erros e a razão de cada verificação pulada. Se a substituição não atender aos critérios combinados, aplique a reversão restrita e restaure os serviços da instalação anterior. Preserve evidências da falha no registro aprovado do projeto, sem dados secretos. Deixe apenas um conjunto de serviços usando as portas.

No macOS, relate separadamente as verificações automáticas e os testes manuais feitos. O suporte a Mac continua em beta. Use testes manuais para verificar a permissão de microfone, o plugin do Obsidian e as interações do Jarvis no computador da pessoa. Informe apenas testes manuais realmente executados.

<a name="7-offer-what-is-new-once"></a>

## 7. Ofereça uma vez o que for novo para a pessoa

A atualização traz o código. As etapas de configuração de recursos novos são feitas depois. Assim que as verificações da seção 6 passarem, identifique o que a pessoa ainda não usou e ofereça cada item uma vez. Aceite um não como resposta e siga em frente sem repetir a oferta na sessão. Deixe as opções de compartilhamento para a própria pessoa ativar.

Comece com estas verificações, sem abrir arquivos secretos.

- `node aos.mjs about show` mostra se há uma seção **Sobre mim**.
- `node aos.mjs openai-key --check` imprime `{"ready":true}` se a chave e a autorização da voz ao vivo estiverem salvas. Nunca abra `openai.json`.
- `node aos.mjs live-context show` lista o que uma chamada lê ao começar, incluindo as notas adicionadas pela pessoa.
- `node aos.mjs dashboard list` mostra os botões salvos. Cada botão tem uma `description` e uma lista `needs`.
- `node aos.mjs skills list --provider claude` (ou `codex`) mostra o pacote de skills, com o estado em `installed` e a indicação `offered` para cada skill.

Mostre só o que for novo para a pessoa. Uma skill do pacote é nova se o estado for `missing` e `offered` for `false`. Use esses estados porque uma atualização anterior pode ter ocorrido sem apresentar os recursos. Depois de mostrar as skills, registre quais ofereceu com `node aos.mjs skills offered --skills "<every id you showed>"`, em qualquer caso. Pule decisões que a pessoa já tomou.

Siga esta ordem.

1. **Sobre mim.** Se estiver vazia, faça as perguntas do [guia de primeira instalação](PLAYBOOK.md#tell-your-assistant-about-you).
2. **Botões do painel.** Preserve a seleção salva e pule o menu para quem já personalizou. Mostre **Personalizar painel** em qualquer um dos aplicativos. Agora cada botão informa o que faz e o que exige. Se a pessoa ainda usa a seleção inicial, ofereça as opções em [Escolha os botões do painel](PLAYBOOK.md#choose-their-dashboard-buttons).
3. **Pacote de skills.** Para as skills novas para a pessoa, siga [Ofereça o pacote de skills](PLAYBOOK.md#offer-the-skill-pack). Uma skill com estado `update` é uma cópia antiga sem mudanças locais. Instalá-la novamente traz a versão atual. Uma com estado `edited` foi personalizada e fica preservada.
4. **Voz ao vivo.** Se ainda estiver sem configuração, siga [Voz ao vivo (opcional)](PLAYBOOK.md#live-voice-optional) como descrito, incluindo a frase sobre o custo, a página local da chave e os três testes da primeira chamada.
5. **Contexto no início da chamada.** Se a voz ao vivo já estiver configurada e `live-context show` não listar notas adicionadas pela pessoa, ofereça a etapa 5 de [Voz ao vivo (opcional)](PLAYBOOK.md#live-voice-optional). Ela permite desativar partes do contexto e acrescentar notas e relatórios próprios. Disponível a partir da versão 0.4.6.

<a name="8-final-report"></a>

## 8. Relatório final

Diga o que mudou, quais personalizações foram preservadas, o que foi verificado, o que ainda está indisponível, qual instalação ficou ativa, onde está o material de reversão e como fazer uma atualização futura. Nomeie os recursos novos que a pessoa configurou e os que deixou de fora, para que ela saiba o que pedir mais tarde. Se você só fez a descoberta, encerre com a recomendação e indique que a atualização ainda está por fazer.
