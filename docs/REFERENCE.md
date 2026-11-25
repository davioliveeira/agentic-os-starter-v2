<a id="commands-and-technical-reference"></a>

# Comandos e referência técnica

Rode os comandos na pasta raiz do Agentic OS. Para uma instalação guiada, consulte o [roteiro de instalação](../setup/PLAYBOOK.md). Se você já usa o sistema, comece pelo [guia de atualização](UPGRADING.md).

<a id="commands"></a>

## Comandos

| Comando | O que faz |
|---|---|
| `node aos.mjs status [--json]` | Mostra os serviços e as tarefas abertas no terminal. Use `--json` para obter a saída estruturada. |
| `node aos.mjs start` | Inicia os serviços desta instalação. |
| `node aos.mjs stop` | Encerra os serviços quando todas as conversas no terminal estiverem fechadas. |
| `node aos.mjs doctor` | Verifica os serviços, o plugin, os provedores, a síntese e a transcrição de voz. Se a voz ao vivo estiver configurada, também verifica a chave da OpenAI salva. |
| `node aos.mjs doctor --full` | Também roda um fluxo real usando a sua conta no provedor. |
| `node aos.mjs setup` | Compila e instala o sistema com o cofre e as opções escolhidos no roteiro de instalação. |
| `node aos.mjs upgrade` | Localiza instalações existentes e mostra as opções de atualização em uma consulta somente leitura. |
| `node aos.mjs update` | Atualiza e recompila uma cópia reconhecida e sem modificações, instalando a versão completa. |
| `node aos.mjs jev-key` | Adiciona ou substitui uma chave do OpenRouter em uma página local do navegador. |
| `node aos.mjs openai-key` | Adiciona ou substitui a chave da API da OpenAI e registra sua autorização para a [voz ao vivo](LIVE-VOICE.md). A página verifica a chave na OpenAI antes de salvá-la. |
| `node aos.mjs openai-key --check` | Informa se a chave e a autorização estão salvas, mantendo a chave oculta. |
| `node aos.mjs autostart on\|off` | Ativa ou desativa o início automático desta instalação ao entrar na sessão. |
| `node aos.mjs dashboard` | Gerencia as opções do painel. Veja os [comandos de personalização](DASHBOARD.md). `dashboard list` mostra o que cada botão faz e quais são seus requisitos. |
| `node aos.mjs skills list` | Lista as skills opcionais do pacote, os requisitos de cada uma e quais já estão instaladas. Você pode instalar as que quiser como skills pessoais. |
| `node aos.mjs skills install --skills "<id>,<id>" --provider claude\|codex` | Copia as skills escolhidas para a pasta de skills da ferramenta selecionada, preservando as cópias que você editou. |
| `node aos.mjs schedule` | Agenda a execução automática de um fluxo incluído, como em `schedule add plan-today 07:00 --days weekdays`. Cada agendamento precisa ser adicionado por você. Consulte as regras em `node aos.mjs schedule help`. |
| `node aos.mjs voice` | Mostra e ajusta as respostas em voz alta, a voz, a velocidade da fala, o tempo para começar a responder e as palavras reconhecidas. Consulte `node aos.mjs voice help` ou abra o menu de voz em um dos painéis. |
| `node aos.mjs about show` | Mostra o texto de Sobre mim que a voz ao vivo recebe e quantos dos 2.000 bytes disponíveis ele ocupa. |
| `node aos.mjs about write --from <file>` | Faz uma cópia de segurança do `AGENTS.md`, se o arquivo já existir, e grava a seção Sobre mim (`## Sobre mim`) a partir de um arquivo. |
| `node aos.mjs live-context show [--full]` | Lista o que a voz ao vivo lê no início da chamada. `--full` mostra exatamente o que seria enviado agora. |
| `node aos.mjs live-context add <path> [--label "…"]` | Inclui em todas as chamadas uma nota sua ou a nota mais recente de uma pasta de relatórios. Você pode adicionar até seis entradas. |
| `node aos.mjs live-context remove <path or number>` | Remove uma nota ou pasta da lista. |
| `node aos.mjs live-context section <name> on\|off` | Ativa ou desativa qualquer uma das seções do contexto (`today`, `inbox`, `numbers`, `news` e `radar`). A opção fica salva em `system/v2/live-context.json`. |
| `node aos.mjs about migrate` | Mostra uma prévia da migração de `CLAUDE.md` para `AGENTS.md`. O `CLAUDE.md` passa a importar o `AGENTS.md`. Depois de revisar a prévia, adicione `--yes` para aplicar. |

O diagnóstico informa o motivo de cada resultado **PASS**, **FAIL**, **WAIT** ou **SKIP**. Qualquer **FAIL** retorna o código de saída 1. O resumo indica se a falha afeta uma parte essencial ou um recurso opcional. O teste de voz usa áudio gerado. Para testar o microfone, as permissões e o atalho, consulte o [guia de voz no Mac](MAC-VOICE.md).

Se ainda houver uma conversa aberta em um terminal, `stop` mantém os serviços em execução. O comando exibe a mensagem abaixo em inglês.

```text
Stop active tasks in Terminals first. No service was stopped.
```

Quando estiver pronto para encerrar a conversa, feche a aba correspondente no Jarvis ou no Obsidian e tente novamente. Uma atualização ou troca de instalação precisa da sua autorização antes de interromper uma instalação ativa. Use os scripts da instalação correspondente e mantenha em execução os serviços de voz e as tarefas de recuperação de outros programas.

`update` recusa código-fonte modificado ou desconhecido antes de parar os serviços. Preserve suas alterações e siga o [plano de integração do roteiro de atualização](../setup/UPGRADE.md) para projetos personalizados. Atualizações futuras desses projetos podem exigir integração manual.

<a id="layout-and-local-ports"></a>

## Estrutura e portas locais

```text
aos.mjs           Comando de entrada na pasta raiz
setup/            Instruções para o agente que instala ou atualiza o sistema
obsidian-v2/      Ponte, plugin do Obsidian, fluxos, voz e modelo de cofre
jarvis-v2/        Painel do Jarvis no navegador
docs/             Guias de uso e solução de problemas
```

Os serviços escutam em `127.0.0.1`. O Jarvis usa a porta **3217**, a prévia usa a **3218**, a ponte usa a **3219**, o serviço de voz desta instalação usa a **3220** e o monitor usa a **3221**. Um serviço de voz compartilhado e compatível pode estar em outro endereço, que aparece no diagnóstico. Mantenha esses serviços acessíveis apenas no computador. Só uma instalação pode usar as portas fixas por vez. Antes de iniciar outra, identifique qual instalação está usando as portas.

A nota diária segue a estrutura de `system/schemas/daily-note.md` (v1) no cofre. O painel interpreta os títulos das seções, então personalize apenas o conteúdo de cada uma. Os atalhos do painel ficam em `system/v2/dashboard.json` e são preservados nas atualizações compatíveis.

**Compartilhar títulos de tarefas** controla `liveShareWork` em `system/v2/profile.json`. O padrão é `true`. Nas configurações da voz ao vivo de qualquer painel, desative a opção (`false`) para retirar do contexto as tarefas em andamento. **Compartilhar boletim da manhã** controla `liveShareBrief`. O padrão é `false`. Ao ativar a opção (`true`), a OpenAI recebe o boletim completo, incluindo a seção de e-mails, no início de cada chamada. Assim, a voz ao vivo pode responder com base nele. Para revisar a parte pessoal do contexto da chamada, peça ao seu agente de código para “atualizar minha seção Sobre mim”.

**Atualizações de tarefas** usa `liveTaskUpdates` em `system/v2/profile.json`. Escolha `done` (**Conclusões e impedimentos**, o padrão), `silent` (**Só na tela**) ou `chatty` (**Acompanhar tarefas longas**, com atualizações a cada três minutos). Os dois painéis usam a mesma opção.

Para rodar uma skill instalada em um terminal novo com o provedor selecionado, diga “Rode a skill today” ou “Execute a skill plan-tomorrow para a próxima semana”. Use o identificador da skill como foi instalado, incluindo o hífen se houver. A ferramenta de linha de comando recebe o comando com barra e os argumentos informados.

A opção **Confirmar ações** usa `liveConfirm` em `system/v2/profile.json`. Os valores são `auto` (**Executar direto**, o padrão, com cerca de 2,5 segundos para cancelar), `voice` (**Diga “sim”**), `click` (**Clique para confirmar**) e `destructive` (**Confirmar só paradas e edições**). Os dois painéis usam a opção salva.

<a id="consultas-salvas-por-voz"></a>

## Consultas e navegação por voz

Para consultar a nota diária, pergunte “Quais são minhas prioridades de hoje?” ou “O que tem na minha agenda hoje?”. Para consultar o boletim salvo, experimente “Quais foram as principais notícias de IA de hoje?”, “Qual foi a notícia mais comentada no Hacker News hoje?” ou “Quais e-mails urgentes aparecem no boletim de hoje?”. As respostas usam os dados já salvos.

Para abrir o arquivo, diga “Abra minha nota diária de hoje”, “Abra o boletim da manhã de ontem” ou “Abra a nota [título da nota]”. “Abra o painel” e “Abra o terminal” também funcionam nos dois aplicativos. No Obsidian, você pode dizer “Busque no cofre por [termo]”, “Feche esta aba” ou pedir que uma nota abra “na barra lateral esquerda”.

Para ouvir o início de um relatório salvo, diga “Leia em voz alta o boletim da manhã de ontem” ou “Leia o resumo do cofre em voz alta”. A resposta inclui o link para ler o restante do relatório.

Na nota de hoje, diga “Adicione a tarefa Revisar a apresentação à nota de hoje”, “Conclua a tarefa Revisar a apresentação” ou “Desmarque a tarefa Revisar a apresentação”. Use o nome completo da tarefa para concluir ou reabrir o item.

Durante uma chamada, pergunte “Qual o status da tarefa?” para acompanhar o trabalho. Para pedir a interrupção de uma tarefa, diga “Pare essa tarefa do Codex” ou “Cancele a tarefa atual”. A confirmação segue o modo configurado no painel.

<a id="data-and-costs"></a>

## Dados e custos

No modo **Local**, o reconhecimento e a síntese de voz rodam no seu computador, sem cobrança por uma API de voz. Os pedidos ao Claude Code ou ao Codex usam a sua conta no provedor e podem incluir conteúdo do cofre lido pelo fluxo. Pesquisas, conectores e skills pessoais podem consultar outros serviços, com cobranças próprias.

A [voz ao vivo](LIVE-VOICE.md) é opcional e usa a organização da API da OpenAI vinculada à sua chave. A barra da chamada estima US$ 0,05 por minuto ativo e US$ 0,02 por minuto em espera. Consulte a página de consumo da API para conferir a cobrança.

O Jev é opcional e usa o OpenRouter para reduzir o tempo de encaminhamento dos pedidos de voz compatíveis. Seu papel é encaminhar o pedido. A voz também funciona com o encaminhamento pelo Claude Code ou Codex. O Jev envia o texto falado, trechos curtos de interações de voz recentes, o título e um trecho da conversa selecionada, além dos nomes dos relatórios. O pedido de encaminhamento inclui esses dados sem anexar notas inteiras. Se a conversa citar uma nota, a citação pode aparecer no trecho enviado. O OpenRouter cobra pelo uso separadamente. A velocidade e o custo variam.

Informe as chaves somente na página local de configuração. Os fluxos incluídos recebem instruções para produzir apenas rascunhos e relatórios, sem enviar mensagens, publicar, agendar publicações ou apagar notas. Skills pessoais seguem as próprias instruções e as permissões do agente de código. Confira quais contas e ações externas cada skill exige antes de conectá-las.

Para reparos, peça ao seu agente de código para “rodar o diagnóstico” e siga o [guia de solução de problemas](TROUBLESHOOTING.md).
