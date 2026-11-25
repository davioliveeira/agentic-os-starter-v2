<a id="troubleshooting"></a>

# Solução de problemas

Comece por `node aos.mjs doctor`. Cada linha **FAIL** indica como corrigir a falha. As verificações que ficaram sem rodar aparecem como **SKIP**, com o motivo. O comando retorna o código de saída 1 quando há falhas. A última linha indica se a falha afeta uma *parte essencial* ou só um *recurso opcional*, como a voz, o Jev ou um segundo provedor. Se o diagnóstico apontar que a mesma falha se repetiu, siga a instrução da linha antes de rodar o diagnóstico de novo. Este guia cobre situações que o comando não detecta.

<a id="where-to-look"></a>

## Onde conferir

| O que conferir | Onde |
|---|---|
| Quais serviços estão rodando | `node aos.mjs status` |
| Por que um serviço fica reiniciando | `obsidian-v2/.runtime/service-supervisor.jsonl` (uma linha por evento) |
| Por que o monitor não iniciou ao entrar na sessão | `obsidian-v2/.runtime/service-supervisor-startup-error.log` |
| Por que um fluxo falhou | Abra a tarefa em **Terminais → Histórico** no [Jarvis](http://127.0.0.1:3217). |
| O que o instalador registrou | `obsidian-v2/.runtime/aos-setup.json` (sem segredos de acesso) |

Mantenha `jev.json`, `openai.json`, `bridge-auth.json` e `speech-auth.json` em sigilo. Esses arquivos guardam chaves de API ou credenciais de acesso local.

<a id="live-voice"></a>

## Voz ao vivo

| O que aparece | Como resolver |
|---|---|
| A voz ao vivo pede uma autorização atualizada | Rode `node aos.mjs openai-key` na pasta da instalação. Informe uma chave da API da OpenAI, salve a autorização na página local e selecione **Ao vivo** novamente. |
| A página diz “A OpenAI não aceitou esta chave” | Confira se copiou a chave inteira de [platform.openai.com/api-keys](https://platform.openai.com/api-keys). Se ela tiver sido revogada, crie uma nova e tente de novo. |
| A página diz “Esta é uma chave do OpenRouter para o Jev” | Crie uma chave da API da OpenAI para a voz ao vivo. Consulte [Antes de começar](LIVE-VOICE.md#before-you-start-an-openai-api-key). |
| A chamada diz “A OpenAI não aceitou a chave de API” | Rode `node aos.mjs openai-key` e informe uma chave válida. |
| A chamada diz que a conta está sem créditos | Adicione créditos em **Billing** na plataforma da API. Se seu plano do ChatGPT oferecer créditos, confirme o resgate e use uma chave da conta vinculada ao benefício. |
| A chamada diz que a chave está sem permissão para o modelo de voz ao vivo | Crie uma chave com acesso a `gpt-live-1.1` e salve-a com `node aos.mjs openai-key`. |
| A chamada diz que a OpenAI está limitando solicitações ou teve um problema no serviço | Aguarde um minuto e tente de novo. |
| Você quer conferir a configuração | Rode `node aos.mjs doctor` e leia a linha **Voz ao vivo (chave da OpenAI)**. Confira o saldo separadamente na plataforma da API. |
| O Windows pede para atualizar o serviço de voz | Use `node aos.mjs doctor` para identificar o serviço de voz em uso. Se estiver compartilhando um serviço antigo, atualize-o ou encerre-o na instalação de origem. Quando as suas tarefas terminarem, rode `node aos.mjs stop` e `node aos.mjs setup --voice yes` nesta instalação. |
| O acesso ao microfone foi negado | Permita o microfone para o Obsidian nas configurações do sistema ou para `127.0.0.1:3217` no navegador. Confirme o microfone selecionado e inicie outra chamada. |
| A reprodução de áudio foi bloqueada | Permita som e reprodução automática para o Jarvis no navegador ou confira a saída de áudio do Obsidian e o volume do sistema. Mantenha a janela em primeiro plano e inicie outra chamada. |
| O medidor difere do consumo da OpenAI | A barra mostra uma estimativa. Quando o tempo em espera não vem separado, ela aplica a taxa ativa a todo o tempo informado. Confira a cobrança na conta da API vinculada à chave. |

Consulte o [guia de voz ao vivo](LIVE-VOICE.md) para ver as opções e os dados enviados.

<a id="common-situations"></a>

## Situações comuns

**O Python já está instalado, mas o instalador da voz não o encontra no Mac.** Depois de rodar `brew install python@3.12`, confira com `python3.12 --version`. O comando `python3` ainda pode apontar para a versão mais antiga fornecida pela Apple. O instalador procura os executáveis pelo nome com a versão e também verifica os nomes genéricos. Se ele usar outro `PATH`, acrescente `AOS_V2_PYTHON="$(brew --prefix python@3.12)/bin/python3.12"` antes do comando de instalação original e mantenha os demais argumentos. Se você instalou o Python de outra forma, use o caminho absoluto do executável. A opção seleciona o interpretador para criar um ambiente privado de voz e preserva o Python do sistema e os ambientes existentes.

**O painel indica que a ponte está offline.** Rode `node aos.mjs start`, espere 20 segundos e recarregue o plugin ou reinicie o Obsidian. Se aparecer “Bridge authentication required”, rode `node aos.mjs setup` de novo para repor o token de acesso local para o plugin.

**Uma conversa não abre no Obsidian ou um aviso menciona o plugin Terminal.** As conversas no Obsidian precisam de uma versão estável da série 3.x do plugin da comunidade Terminal, de polyipseity, a partir da 3.27.1. Se o aviso disser que a versão é “antiga demais”, atualize em **Configurações → Plugins da comunidade**. Se aparecer “versão preliminar” ou “ainda precisa ser verificado”, instale a versão estável ou use o mesmo botão no Jarvis (http://127.0.0.1:3217) até que `node aos.mjs update` traga suporte. Uma versão “mais recente que as versões testadas” deve funcionar. Se houver problema, use o Jarvis e rode o diagnóstico. Se o aviso disser que a versão “impede que o Agentic OS acompanhe a sessão”, a conversa ainda pode estar em execução. Confira a aba e feche-a antes de tentar de novo. A linha **Plugin Terminal (conversas no Obsidian)** do diagnóstico mostra o que está instalado.

**Os serviços não iniciam ao entrar na sessão do Windows.** A mensagem “The recovery monitor did not become available” pode aparecer quando uma versão antiga registrou a tarefa de login de um modo que instalações novas do Windows bloqueiam por padrão. Agora, `node aos.mjs start` repara a tarefa automaticamente e inicia os serviços diretamente se a tarefa continuar sem executá-los. Se você atualizou de uma versão antiga, rode `node aos.mjs setup` uma vez após atualizar para aplicar a correção do instalador.

**O instalador encontra o Python 3.14, mas a voz exige versões de 3.10 a 3.13.** A mensagem começa com “Found Python 3.14 …, but voice needs Python 3.10-3.13”. As bibliotecas de voz aceitam Python 3.10 a 3.13. Isso pode acontecer se a instalação padrão do python.org ou do Homebrew trouxer o Python 3.14. Instale a versão 3.12 ao lado da atual com `winget install Python.Python.3.12` no Windows ou `brew install python@3.12` no Mac. Rode a instalação de novo com `--voice yes`. O instalador seleciona a versão 3.12. Se ele avisar que o serviço de voz ainda pode estar em execução, rode antes `node aos.mjs stop`.

**Os botões usam Codex e você só tem Claude Code, ou vice-versa.** Rode `node aos.mjs setup --provider claude` ou troque `claude` por `codex`. O instalador mantém a sua escolha até você alterar o provedor.

**O comando pede para encerrar as tarefas ativas em Terminais.** Se aparecer “Stop active tasks in Terminals first.”, ainda há uma conversa aberta. Feche a aba correspondente no Jarvis pelo botão **×**, ou feche-a no Obsidian, e repita o comando.

**A porta 3221 já pertence a outra instalação.** A mensagem “Port 3221 belongs to another installation” indica que outra cópia está rodando de outra pasta. Só uma cópia pode rodar por vez. Confira a pasta indicada depois de `It runs from "..."` na mensagem. Você também pode abrir http://127.0.0.1:3221/status e consultar `runtimeDir`, que aponta para a pasta `obsidian-v2/.runtime` da outra cópia. Rode `node aos.mjs stop` na pasta raiz daquela instalação.

**O diagnóstico indica um serviço de voz compartilhado.** Outro programa no computador já oferece um serviço de voz compatível, como uma instalação anterior do Jarvis na porta 3108. Esta instalação usa o serviço existente e dispensa o download dos modelos de voz. Se o outro programa for removido ou deixar de fornecer o serviço, rode `node aos.mjs stop` e depois `node aos.mjs setup --voice yes` para instalar o serviço de voz próprio.

**O microfone não responde.** Confira a permissão do site `127.0.0.1:3217` no navegador. No Mac, confira se o navegador e o Obsidian aparecem em **Ajustes do Sistema → Privacidade e Segurança → Microfone**. O primeiro pedido depois de iniciar os serviços pode levar um minuto enquanto os modelos de voz carregam.

**Atalho global de voz no Mac.** Com o serviço de voz desta instalação, pressione **Control–Option–J** uma vez, fale e faça uma pausa para enviar. Mantenha o orbe do Obsidian habilitado ou o Jarvis visível. O aplicativo selecionado grava o áudio. Permita o acesso ao microfone para o Obsidian ou para o navegador. Ao atualizar o protocolo do atalho, recompile e recarregue os dois painéis. `node aos.mjs doctor` mostra falhas de registro, inclusive se outro aplicativo já usar a combinação. Consulte o [guia de instalação e teste da voz no Mac](MAC-VOICE.md).

**A voz não transcreve e o diagnóstico mostra status 500 em “Transcrição do áudio de teste”.** Uma versão da biblioteca de áudio é incompatível com o pacote de reconhecimento de fala. Atualize o Agentic OS, rode `node aos.mjs stop` e depois `node aos.mjs setup --voice yes` para reinstalar os pacotes de voz com a versão compatível.

**A voz e os demais serviços ficam lentos no Mac, embora o computador esteja rápido.** Versões antigas registravam o início ao entrar na sessão como uma tarefa em segundo plano. O macOS roda essas tarefas com prioridade baixa, e a voz chegava a levar cerca de oito vezes mais tempo. Atualize o Agentic OS, rode `node aos.mjs stop` e depois `node aos.mjs start`. O comando `start` substitui o item de início de sessão. Rode `stop` antes para que os serviços voltem à velocidade normal.

**Os serviços ficam parados no Mac depois de reiniciar ou sair e entrar na sessão.** Versões antigas interpretavam o desligamento do Mac como uma pausa solicitada por você. Atualize o Agentic OS e rode `node aos.mjs start` uma vez. Depois disso, os serviços voltam automaticamente ao reiniciar.

**A voz responde a algo que eu não disse ou preciso falar em outro idioma.** A voz local usa o idioma do cofre. Cofres novos deste fork já vêm com português do Brasil. Sem a preferência no cofre, o serviço local usa inglês. Para ajustar, defina `"speechLanguage": "pt"` em `system/v2/profile.json` no seu cofre (`es` para espanhol, `fr` para francês, `it` para italiano e `pt` para português do Brasil). Rode `node aos.mjs stop` e depois `node aos.mjs setup --voice yes`. O instalador baixa o modelo de reconhecimento do idioma, com cerca de 460 MB, e inicia a voz nesse idioma. `node aos.mjs doctor` testa a fala e a transcrição no idioma em uso e avisa se ele divergir da preferência do cofre. Um serviço de voz compartilhado usa o idioma definido pelo programa que o executa.

Para testar os comandos em português, experimente “O que tem na minha agenda hoje?” ou “Qual é a notícia principal do boletim?”. Alguns atalhos, como “open …”, ainda usam a forma em inglês. Pedidos que passam pelo modelo do Claude ou do Codex podem levar mais tempo. Veja outros exemplos na [referência de consultas por voz](REFERENCE.md#consultas-salvas-por-voz).

**Quero rodar Planejar hoje ou Boletim de IA automaticamente toda manhã.** Para agendar Planejar hoje, por exemplo, rode `node aos.mjs schedule add plan-today 07:00 --days weekdays`. Rode `node aos.mjs schedule` para ver os agendamentos, o horário da próxima execução e o resultado da última. O fluxo roda em segundo plano da mesma forma que pelo botão, usa seu plano do Claude ou do Codex e salva o relatório no mesmo lugar. Os serviços precisam estar rodando. Para iniciá-los todo dia ao entrar na sessão, use `node aos.mjs autostart on`. Se o computador estiver desligado no horário marcado, o fluxo roda quando os serviços iniciarem no mesmo dia, com até três horas de atraso. `node aos.mjs schedule pause` pausa todos os agendamentos.

**Quero ler as respostas em silêncio, por exemplo em uma sala compartilhada ou durante uma reunião.** Abra o menu de voz (··· ao lado do orbe no Obsidian ou no cartão **Voz** no Jarvis) e desative **Respostas em voz alta**, ou rode `node aos.mjs voice mute`. A captação e o atalho de voz continuam funcionando, e as respostas aparecem por escrito nos dois painéis.

**Quero mudar a voz ou a velocidade da fala.** Use **Voz** e **Velocidade** no mesmo menu. Você ouve uma amostra curta após cada alteração. O menu oferece as vozes disponíveis para o idioma configurado. No terminal, um exemplo para o inglês americano é `node aos.mjs voice use af_heart`. Para ajustar a velocidade, use `node aos.mjs voice speed 1.1`.

**A voz sempre entende um nome errado.** O sistema aprende palavras pouco comuns a partir dos títulos das notas. Costuma aprender sozinho um nome que aparece no título de algumas notas. Rode `node aos.mjs voice` para ver a lista. Ensine um termo com `node aos.mjs voice teach "Zettelkasten"` ou remova um termo que cause problemas com `node aos.mjs voice forget "<word>"`. A lista fica no seu computador.

**A voz demora para começar a responder.** Sem uma chave do OpenRouter, seu modelo do Claude ou do Codex encaminha cada pedido em cerca de cinco segundos. Para acelerar o encaminhamento, configure o Jev com `node aos.mjs jev-key`. `node aos.mjs doctor` informa se a chave foi recusada ou ficou sem créditos. Duas opções vêm ativadas. O sistema aproveita a resposta do modelo menor assim que o turno termina e começa a falar após a primeira frase. Se houver algum problema, rode `node aos.mjs voice fast off` para desativar todos os ajustes de velocidade de resposta, ou use `--early off` ou `--stream off` para desativar só uma delas. Veja o estado das opções com `node aos.mjs voice`. Há uma terceira opção para o Claude, desativada por padrão. Use `node aos.mjs voice fast --prestart on` para iniciar o programa do modelo menor ao receber um pedido de voz. Em um computador rápido, isso economiza cerca de um quarto de segundo quando o pedido fica pronto em até dois segundos. O ganho pode ser maior em computadores que demoram para iniciar programas.

**O Claude aparece como não instalado no Windows, embora `claude` funcione no terminal.** A versão do npm cria um intermediário `.cmd` que a ponte não consegue executar. Instale o Claude Code com o instalador nativo, abra um novo terminal e rode `node aos.mjs stop` seguido de `node aos.mjs start`.

**Planejar hoje informa que a agenda está indisponível.** Conecte o Google Agenda na ferramenta que você usa, com `/mcp` no Claude Code ou nas configurações de conectores do Codex, e rode o fluxo de novo.

**O Google Agenda já está conectado, mas Planejar hoje ainda informa que está indisponível.** Rode `node aos.mjs doctor` e leia a linha **Conectores do Claude em fluxos de segundo plano**. Se houver um `CLAUDE_CODE_OAUTH_TOKEN` salvo por `claude setup-token`, o Claude Code iniciado com esse token fica sem os conectores da conta. O sistema usa a sessão normal do Claude para os fluxos sempre que ela estiver disponível. Se a verificação falhar, abra um terminal, rode `claude`, entre com `/login` e rode o diagnóstico novamente. Você pode manter o token salvo para outras ferramentas.

**O medidor de uso semanal aparece como indisponível.** No Codex, entre uma vez na CLI do Codex. No Windows com Claude, rode `claude` uma vez. O medidor renova a sessão automaticamente depois disso. No Mac com Claude, consulte o uso pelo comando `/usage` no Claude Code. Passe o mouse sobre o medidor para ver a explicação sobre a sessão do Claude no Acesso às Chaves do Mac. Os demais recursos continuam disponíveis.

**Depois de mover a pasta do repositório.** Se ainda tiver acesso à pasta antiga, rode `node aos.mjs autostart off` nela primeiro. Depois rode `node aos.mjs setup --vault "<path>" --autostart yes` na pasta nova.

**Desinstalar.** Rode `node aos.mjs stop` e `node aos.mjs autostart off`. Desative e apague o plugin **Agentic OS V2** no Obsidian e apague a pasta da instalação. Para remover também as configurações e o estado do sistema, você pode apagar `system/v2/` dentro do cofre. Preserve o restante do cofre e suas notas.
