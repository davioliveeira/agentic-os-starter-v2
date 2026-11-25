<a name="fresh-install-playbook-for-the-coding-agent"></a>

# Primeira instalação do Agentic OS V2

Você é o agente responsável por instalar, orientar e diagnosticar o Agentic OS V2. A pessoa clonou este repositório ou pediu que você o fizesse. Ela quer usar o painel do Obsidian, o Jarvis no navegador, a voz e os fluxos em segundo plano, executados na assinatura dela do Claude Code, do Codex ou de ambos. Faça o que for possível para poupar digitação.

<a name="choose-the-right-route-first"></a>

## Escolha o processo adequado

Siga o pedido explícito de primeira instalação ou atualização. Se a pessoa apenas disser “configure isso” e a intenção for ambígua, pergunte *“Você quer instalar o Agentic OS pela primeira vez ou atualizar uma versão que já usa?”* Resolva isso antes de pedir que ela procure pastas.

- **Primeira instalação.** Continue neste guia. Um cofre do Obsidian pode existir sem uma instalação do Agentic OS.
- **Atualização do Agentic OS, incluindo V1 ou uma versão personalizada.** Siga [UPGRADE.md](UPGRADE.md). O guia começa com uma descoberta somente para leitura e um plano que preserva as personalizações. Converse sobre os recursos nessa etapa.
- **Reparo de uma instalação identificada.** Siga a [Fase 6](#phase-6--prove-it-works) e explique que `--full` executa um fluxo real. Se houver dúvida sobre qual é a instalação, identifique-a antes de iniciar ou parar qualquer serviço.

O arquivo `obsidian-v2/.runtime/aos-setup.json` registra uma instalação anterior. Se a pessoa pediu atualização, siga esse processo mesmo com o arquivo presente. Se pediu uma primeira instalação, explique que encontrou outra instalação e confirme o destino antes de fazer alterações.

<a name="rules"></a>

## Regras

- Faça uma pergunta de cada vez. Se uma correção for segura e reversível, faça-a e diga o que mudou.
- **Nunca peça um segredo no chat nem o exiba.** A pessoa digita as chaves em uma página local ou em um arquivo que ela mesma abre. Nunca leia, exiba ou copie `jev.json`, `openai.json`, `bridge-auth.json`, `speech-auth.json`, `providers.json`, `.credentials.json` ou `~/.claude/.env`. Se a pessoa colar uma chave no chat, oriente-a a revogá-la e criar outra.
- Nunca sobrescreva uma nota nem edite as configurações `.obsidian/` de um cofre existente. `aos setup` já garante isso. Mantenha a mesma proteção no trabalho manual.
- Os serviços locais escutam em `127.0.0.1`, nas portas 3217–3221. Não abra essas portas no firewall nem configure túneis ou acesso remoto. Ofereça a voz ao vivo (GPT-Live) uma vez, na Fase 7. A pessoa decide se quer usar, lê o aviso e digita a chave em uma página local. Consulte o [guia da voz ao vivo](../docs/LIVE-VOICE.md).
- Se a mesma etapa falhar duas vezes com o mesmo erro, pare de tentar. Mostre o erro exato e indique o melhor próximo passo.
- Rode todos os comandos abaixo na raiz do repositório, a pasta que contém `aos.mjs`.
- Preserve o código da distribuição padrão durante a instalação e o reparo. Uma integração personalizada intencional exige aprovação explícita e segue o processo de `setup/UPGRADE.md`.
- Se outra instalação estiver usando as portas, identifique-a e explique as opções. Pare-a somente com a permissão da pessoa para a troca de serviços e use os scripts daquela instalação.

<a name="phase-0--permissions-and-prerequisites"></a>

## Fase 0 — Permissões e pré-requisitos

Você vai instalar pacotes da internet, gravar fora desta pasta (no cofre e em um item de início de sessão) e iniciar serviços em segundo plano.

- **Codex.** Peça que a pessoa autorize essas ações na sessão, aprovando os pedidos de acesso ou mudando a sessão para acesso completo. A instalação precisa de acesso à rede e de escrita fora da pasta, que o isolamento padrão bloqueia.
- **Claude Code.** A pessoa aprova os comandos conforme forem solicitados.

Confira cada item e corrija o que puder.

| Requisito | Como conferir | Se estiver faltando |
|---|---|---|
| Git | `git --version` | No Windows, `winget install Git.Git`. No Mac, `xcode-select --install`. A pessoa confirma na caixa de diálogo. |
| Node.js 22 ou superior | `node --version` | No Windows, `winget install OpenJS.NodeJS.LTS`. No Mac, `brew install node`. Depois, abra outro terminal. |
| Python 3.12 para voz e conversas no Obsidian | No Windows, `py -3.12 --version`. No Mac, `python3.12 --version`. | No Windows, `winget install Python.Python.3.12`. No Mac, `brew install python@3.12`. A voz funciona com as versões 3.10 a 3.13. python.org e Homebrew instalam por padrão o 3.14, que as bibliotecas de voz ainda não aceitam. Instale o 3.12 em paralelo. |
| Ferramentas de compilação, só no Mac | `xcode-select -p` | `xcode-select --install`. Basta instalar uma vez para o componente de terminal. |
| Homebrew, só no Mac | `brew --version` | Encaminhe a pessoa para https://brew.sh. O instalador pede senha, então ela mesma deve executá-lo. |
| Obsidian | No Windows, `%LOCALAPPDATA%\Programs\Obsidian` ou `%LOCALAPPDATA%\Obsidian`. No Mac, `/Applications/Obsidian.app`. | No Windows, `winget install Obsidian.Obsidian`. No Mac, `brew install --cask obsidian`. Prossiga mesmo se ele ainda não estiver disponível. |
| Claude Code ou Codex com sessão ativa | `claude --version`, `codex --version` | Uma ferramenta basta, mas ter as duas é preferível. Para Claude Code, use o instalador nativo de https://claude.com/claude-code. No Windows, a instalação via npm não é detectada. Para Codex, use `npm install -g @openai/codex`. A pessoa entra na própria conta rodando `claude` ou `codex` uma vez. |

**Voz no Mac.** Verifique se o Homebrew está disponível antes de usar os comandos `brew`. A [fórmula do Python 3.12](https://formulae.brew.sh/formula/python@3.12) instala `python3.12`. O comando `python3` ainda pode apontar para o Python mais antigo da Apple, pois os nomes genéricos ficam em outro diretório, `libexec/bin`. Após a instalação, confira `python3.12 --version`. O instalador procura primeiro pelos nomes com versão, na ordem 3.12, 3.13, 3.11, 3.10 (no Windows, `py -3.12` e assim por diante), e só depois tenta `python3` ou `py -3`. Assim, uma versão padrão mais recente fica em segundo plano. Você pode manter o Python do sistema e os aliases globais.

Se o interpretador estiver instalado, mas fora do `PATH` usado pelo instalador, prefixe o comando de instalação com `AOS_V2_PYTHON="$(brew --prefix python@3.12)/bin/python3.12"`. Mantenha os argumentos de cofre, voz e início automático já escolhidos. Se o Python veio de outra fonte, defina `AOS_V2_PYTHON` com o caminho absoluto do executável. O interpretador cria um ambiente dedicado à voz. O ambiente existente é reutilizado se usar Python 3.10 a 3.13. Ambientes com versões incompatíveis, como 3.14, são recriados automaticamente, mas apenas com os serviços parados. Se o instalador indicar isso, rode `node aos.mjs stop` e repita a instalação com `--voice yes`. O instalador também prepara um ambiente Python pequeno e separado para o plugin Terminal, usado para conversar dentro do Obsidian. No Windows, ele contém `psutil` e `pywinctl`, que o Terminal usa para dimensionar a janela. Sem Python, as conversas continuam disponíveis no Jarvis.

Mantenha o repositório em uma pasta comum, como `~/agentic-os`, fora do cofre e de pastas sincronizadas pelo OneDrive, iCloud Drive ou Dropbox. Essas pastas interferem no funcionamento dos pacotes e dos sockets locais. Se o repositório estiver em uma delas, mova-o antes de continuar.

<a name="phase-1--one-question-where-is-the-vault"></a>

## Fase 1 — Escolha o cofre

Pergunte *“Onde você quer guardar seu cofre? Posso criar um novo em `~/agentic-vault` ou usar um cofre do Obsidian que você já tem, preservando o conteúdo.”*

- Em um cofre existente, preserve todas as notas e configurações do Obsidian e adicione as pastas do modelo que estiverem faltando.
- **Se a pessoa usa o primeiro kit de instalação**, siga `setup/UPGRADE.md` antes de rodar a instalação. Mantenha o cofre e o plugin antigo. Desative o painel antigo depois de verificar o V2 e obter aprovação para a troca dos serviços. Investigue o executor ou o item de início de sessão antigo antes de concluir que ele é inofensivo e preserve-o até haver uma decisão.

Faça duas perguntas de sim ou não, uma por vez.

1. *“Você quer usar voz? É gratuita e roda no seu computador. No primeiro uso, baixa cerca de 1,3 GB.”*
2. *“Você quer que o sistema inicie automaticamente quando você entrar na sua sessão do computador?”* (recomendado)

<a name="phase-2--install"></a>

## Fase 2 — Instale o sistema

```
node aos.mjs setup --vault "<absolute path>" --provider claude|codex --voice yes|no --autostart yes|no
```

`--provider` escolhe a ferramenta de código que os botões e a voz usam. Passe a ferramenta em que você está rodando (Claude Code → `claude`, Codex → `codex`). Ao omitir a opção para um cofre novo, a instalação usa uma das ferramentas instaladas. Reexecuções e atualizações preservam a escolha anterior. Passe `--provider` novamente apenas para trocar a ferramenta.

Cofres novos deste fork já usam português brasileiro na voz. Se a pessoa escolheu voz em português para um cofre existente, defina `"speechLanguage": "pt"` em `system/v2/profile.json` antes de instalar a voz.

A primeira execução leva de 5 a 15 minutos entre pacotes, compilação do Jarvis e modelos de voz. O instalador instala pacotes, compila o plugin e o Jarvis, cria ou completa o cofre, instala o plugin no cofre, instala a voz, inicia os serviços e exibe uma lista de verificações. Pode rodar de novo com segurança, pois as etapas concluídas são puladas.

Leia o resultado. Use estas correções para os problemas mais comuns.

- Se `npm ci` falhar no Mac com erros de compilação, rode `xcode-select --install` e repita a instalação.
- Se o Python estiver ausente, for antigo demais ou recente demais (como na mensagem original `Found Python 3.14…, but voice needs Python 3.10-3.13`), instale a versão 3.12 pela tabela acima, abra um terminal novo e repita a instalação. No Mac, confira `python3.12 --version` ou informe o caminho do interpretador como na Fase 0. O comando `python3` ainda pode apontar para a versão antiga da Apple.
- Se os botões e a voz estiverem usando Codex sem que esteja instalado (no original, `Your buttons and voice use Codex, which is not installed here`), rode `node aos.mjs setup --provider claude`. Se a ferramenta ausente for Claude Code, use `codex`.
- Se outra instalação estiver ocupando a porta 3221 (no original, `Another installation of this system ... is running on port 3221`), outra cópia está rodando a partir de outra pasta. A mensagem indica qual (no original, `It runs from "..."`). Continue usando essa cópia ou consulte `setup/UPGRADE.md` para planejar a troca. Obtenha permissão antes de pará-la com os scripts dela. Se a mensagem vier sem a pasta, `node aos.mjs upgrade` pode ajudar a identificá-la pelos metadados de localização do monitor que não contêm dados secretos.
- Se o instalador indicar que vai compartilhar um serviço de voz (no original, `Voice: a speech service is already running on this computer ... and will be shared`), outro programa já fornece voz compatível. Os downloads são pulados e a lista de verificações indica um *serviço compartilhado*.
- Se um download da voz falhar no meio, rode o mesmo comando de instalação com `--voice yes`. A opção faz o instalador verificar os arquivos de voz, manter os completos e baixar o que falta.

A lista final pode mostrar `WAIT  Plugin ativo no Obsidian` (no original, `WAIT  Plugin switched on in Obsidian`). Isso é esperado até a Fase 5. Em um cofre novo, o plugin está pronto, mas o Obsidian ainda precisa abrir o cofre. Um cofre em que o plugin já funciona mostra PASS.

**Como ler o resultado.** Cada verificação imprime PASS, FAIL, WAIT (só a pessoa pode concluir a etapa pela interface) ou SKIP (não foi possível executar, com a razão). O comando retorna código 1 se houver pelo menos um FAIL. A última linha indica se falharam *itens essenciais*, que precisam ser corrigidos antes de continuar, ou apenas *itens opcionais*, como voz ou Jev. Nesse caso, o sistema pode ser usado e você pode concluir as demais fases antes de voltar a esses itens.

**Se os serviços não estiverem rodando um minuto após a instalação**, o ambiente isolado do agente pode ter encerrado os processos em segundo plano ao concluir o comando. Peça que a pessoa rode `node aos.mjs start` no próprio terminal ou use `--autostart yes`, que entrega os serviços ao sistema operacional.

<a name="phase-3--jev-the-fast-voice-router-optional-recommended"></a>

## Fase 3 — Jev, roteamento de voz mais rápido (opcional, recomendado)

Explique em três frases. *Jev é um modelo opcional da OpenRouter que pode reduzir a demora para encaminhar pedidos de voz compatíveis, enquanto a resposta e o trabalho ficam com o agente e a voz pode ser usada sem Jev. O modelo recebe o que você falou, trechos curtos das duas últimas interações por voz, o título e um trecho da última resposta da conversa selecionada e os nomes dos relatórios, sem receber os arquivos completos das notas, embora os trechos possam citar conteúdo delas. A OpenRouter cobra o uso à parte, e a velocidade e o custo do roteamento variam.*

1. A pessoa cria uma conta em https://openrouter.ai, adiciona alguns dólares de crédito e cria uma chave em https://openrouter.ai/keys.
2. Rode `node aos.mjs jev-key`. Uma página abre no navegador **da pessoa**, onde ela só precisa colar a chave. O comando imprime apenas `{"saved":true}` ou `{"saved":false}`.
3. Confira com `node aos.mjs jev-key --check`.

A etapa 2 espera até cinco minutos pela página. Se sua ferramenta for incapaz de manter o comando aberto pelo tempo necessário, peça que a pessoa rode `node aos.mjs jev-key` no próprio terminal e avise quando a página confirmar que a chave foi salva. Então siga a etapa 3.

<a name="phase-4--calendar-and-mail-optional"></a>

## Fase 4 — Agenda e e-mail (opcional)

Planejar hoje, Resumo da caixa de entrada e Boletim de IA usam os conectores da ferramenta de código para ler a agenda e os e-mails, sem chaves de API.

- No Claude Code, a pessoa roda `/mcp` ou abre claude.ai → Configurações → Conectores e conecta Google Agenda, Gmail e Google Drive.
- No Codex, a pessoa conecta os mesmos serviços nas configurações de conectores.

A pessoa entra na própria conta. O restante funciona sem isso e os fluxos que precisam da agenda avisam quando ela está indisponível.

<a name="phase-5--the-clicks-only-the-user-can-do"></a>

## Fase 5 — Etapas que a pessoa faz pela interface

1. Abra o Obsidian → *Abrir pasta como cofre* → selecione a pasta do cofre.
2. Em um cofre novo, o Obsidian pede para confiar no autor e habilitar os plugins. Escolha **Confiar**. Em um cofre existente, vá em *Configurações → Plugins da comunidade → Ativar plugins da comunidade* e ative **Agentic OS V2**. O painel abre sozinho na primeira vez. Se estiver fechado ou não aparecer, clique no ícone de pulso na barra lateral esquerda do Obsidian (*Abrir Agentic OS V2*) ou pressione Cmd/Ctrl+P e execute *Abrir Agentic OS V2*.
3. Para conversar e usar botões de skills pessoais no Obsidian, vá em *Plugins da comunidade → Explorar → Terminal* (de polyipseity), instale e ative o plugin. Use uma versão 3.x estável a partir da 3.27.1. A 3.27.1 e a 3.27.2 foram testadas e versões mais novas mostram um aviso uma vez. Versões de pré-lançamento são incompatíveis. A linha **Plugin Terminal (conversas no Obsidian)** do diagnóstico informa a versão instalada. A pessoa pode pular essa etapa e usar o Jarvis para skills pessoais e conversas. Os fluxos de segundo plano incluídos continuam funcionando no Obsidian. Explique a escolha antes de configurar atalhos para skills pessoais.
4. Abra o Jarvis em http://127.0.0.1:3217.
5. No primeiro uso, autorize o microfone no navegador. No Mac, confira também *Ajustes do Sistema → Privacidade e Segurança → Microfone*.
6. No Mac, o serviço de voz próprio da instalação registra **Control–Option–J** automaticamente. Mantenha o Obsidian aberto com o orbe do Agentic OS habilitado ou deixe o Jarvis visível. Pressione uma vez e solte as teclas, fale e faça uma pausa para enviar. Um serviço de voz compartilhado mantém os atalhos definidos pelo programa que o executa. Siga o [guia do atalho de voz no Mac](../docs/MAC-VOICE.md). O painel selecionado grava o áudio, então confira a permissão de microfone do Obsidian ou do navegador. Ao atualizar esse recurso, compile e recarregue o plugin e o Jarvis junto com o serviço de voz.

Peça que a pessoa avise quando o painel estiver visível no Obsidian.

<a name="phase-6--prove-it-works"></a>

## Fase 6 — Confirme que funciona

```
node aos.mjs doctor --full
```

Cada linha mostra PASS, FAIL, WAIT ou SKIP. Todo FAIL indica uma correção, e verificações que não puderam rodar aparecem como SKIP com o motivo. `--full` também roda um fluxo real (Resumir cofre) na assinatura da pessoa e verifica se o relatório foi salvo no cofre. Aplique a correção e rode novamente. Se a mesma verificação falhar do mesmo jeito duas vezes seguidas, o diagnóstico informa isso e muda a orientação. Nesse ponto, pare de repetir o comando e siga o que a linha indicar. Consulte `docs/TROUBLESHOOTING.md` se precisar de ajuda.

Peça à pessoa que faça três testes.

1. Clique em um botão que funcione com os serviços conectados. Se ela conectou o Google Agenda na Fase 4, use **Planejar hoje**. Caso contrário, use **Boletim de IA**, que roda sem conectores. Diga *“Planejar hoje precisa da sua agenda e avisa quando ela está indisponível. Vamos testar primeiro o Boletim de IA.”* Se um botão parar por falta de uma conta, registre a dependência ausente.
2. No cartão Voz do Jarvis, selecione **Clique para falar**, pergunte *“Quais são meus compromissos de hoje?”* e faça uma pausa para enviar. Teste depois que Planejar hoje tiver escrito a nota do dia. Pule essa etapa se a agenda estiver desconectada. Se estiver testando em inglês, diga *“What is on my schedule today?”*.
3. Diga *“Abra o boletim de IA”* depois de rodar o Boletim de IA uma vez. Se estiver testando em inglês, diga *“Open the morning intel”*.

No Mac com serviço de voz próprio, coloque outro aplicativo em primeiro plano, pressione **Control–Option–J**, faça um pedido simples e inofensivo e aguarde em silêncio. Confira se a gravação termina, se um único pedido é enviado e se a resposta é audível. O PASS na linha do atalho confirma o registro. O teste manual confirma o microfone e o uso com outro aplicativo em primeiro plano. Se a pessoa escolheu o início automático, peça que repita no próximo início de sessão normal.

<a name="phase-7--make-it-theirs-each-item-optional"></a>

## Fase 7 — Personalize o sistema (tudo opcional)

<a name="tell-your-assistant-about-you"></a>

### Apresente-se ao assistente

“Essas informações ficam no arquivo AGENTS.md do seu cofre. Claude e Codex leem a seção. Se você usar a voz ao vivo, a OpenAI recebe o texto no início de cada chamada.”

Faça uma pergunta por vez. A pessoa pode pular qualquer pergunta ou a seção inteira.

1. Qual é seu nome e o que você faz, em uma ou duas frases?
2. Em que você está focando agora, como projetos ou metas deste mês?
3. Quem aparece no seu trabalho ou na sua vida que você gostaria que o assistente conhecesse? Qual o papel de cada pessoa?
4. Como você prefere as respostas, incluindo tamanho, tom e o que o assistente deve ter sempre em mente?
5. Existe algo que o assistente nunca deve dizer ou fazer?

Escreva a seção **Sobre mim** (`## About me`) com o que a pessoa contou. Mostre o texto e peça aprovação. Salve o corpo aprovado em um arquivo temporário, rode `node aos.mjs about write --from <tmp file>` e depois `node aos.mjs about show` para confirmar o texto que a voz ao vivo vai receber. A pessoa pode repetir esse processo quando pedir “atualize minha seção Sobre mim”.

<a name="choose-their-dashboard-buttons"></a>

### Escolha os botões do painel

Apresente opções para a pessoa escolher de uma lista.

1. Pergunte *“Para que você mais usa IA? Para organizar o dia, trabalhar com clientes, pesquisar, produzir conteúdo ou outra coisa?”* Use a resposta para escolher o que sugerir.
2. Rode `node aos.mjs dashboard list`. Cada entrada de `catalog` corresponde a um botão possível. Os fluxos incluídos (`"kind": "builtin"`) trazem instruções no aplicativo e dispensam a instalação de uma skill. Cada entrada tem uma `description` e uma lista `needs`.
3. Com a concordância da pessoa, rode também `node aos.mjs dashboard discover --provider claude` (ou `codex`) para localizar skills já instaladas. Diga *“Encontrei estas skills no seu computador: A, B e C.”* Evite presumir quais ela usa.
4. Diga o que está no painel agora. Na saída de `dashboard list`, `"selected": null` indica os botões padrão, e uma lista indica que a pessoa já escolheu os botões. Em uma instalação nova, diga *“O Jarvis começa com Planejar hoje, Resumo da caixa de entrada, Pesquisa aprofundada e Reaproveitar conteúdo. O painel do Obsidian tem dez botões iniciais.”*
5. Mostre **uma lista** agrupada pelo tipo de trabalho. Em cada linha, informe o nome, o resultado, os requisitos e se eles estão disponíveis hoje. Use o que a pessoa disse na Fase 4 sobre agenda e e-mail.

   ```text
   Organizar o dia
     [x] Planejar hoje                Nota de hoje com três prioridades, agenda e pendências.     Precisa do Google Agenda (conectado).
     [ ] Resumo da caixa de entrada   Triagem das últimas 24 horas de e-mail.                     Precisa do Gmail (ainda desconectado).
     [ ] Revisão semanal              Revisão das últimas sete notas diárias.                     Precisa de alguns dias de notas.
   Pesquisa
     [x] Pesquisa aprofundada        Síntese com fontes sobre qualquer tema.                     Pode rodar agora.
   Suas skills encontradas neste computador
     [ ] <skill da pessoa>           <descrição da skill>
   ```

   Marque de três a cinco opções que combinem com o que a pessoa contou e explique por quê em poucas palavras. Ponha primeiro os fluxos que já podem rodar sem configuração. Marque apenas os fluxos cujos requisitos a pessoa consegue atender hoje. Por exemplo, pule Resumo da caixa de entrada sem Gmail ou Pesquisar leads sem uma base de leads. Se bastar um minuto para resolver a dependência, ofereça a opção. *“Quer conectar o Gmail agora ou prefere deixar o Resumo da caixa de entrada de fora por enquanto?”*
6. Pergunte *“Quais destes você quer como botões? Sua escolha substitui o conjunto inicial. Você pode trocar qualquer botão por uma skill sua, usar alguns de cada ou manter os botões iniciais. São até dez, em qualquer ordem. Você pode mudar depois em Personalizar painel.”* Se ela escolher manter os botões, preserve a seleção e continue.
7. Confirme a escolha antes de salvar. *“Seu painel vai ter A, B e C. Os botões X e Y vão sair.”*

Confira a disponibilidade das ferramentas e contas de uma skill instalada. Leia suas instruções antes de recomendá-la e explique quais ferramentas ou contas faltam. Instale skills e conecte contas somente se a pessoa escolher essa etapa.

Se ela quiser uma skill que ainda não existe, ajude a definir o que ela faz, os dados de entrada e o resultado esperado. Depois que ela decidir criá-la, siga o processo normal de criação de skills da ferramenta de código e use uma pasta de skills adequada, pessoal ou no cofre. Confira o `SKILL.md` criado, a compatibilidade com a ferramenta e as dependências antes de configurar o botão. Preserve o código do aplicativo e confirme que as integrações estão disponíveis antes de afirmar que funcionam. Se a skill ainda exigir configuração, diga o que falta e aguarde a pessoa antes de configurar o botão. Nunca publique, envie mensagens, faça compras ou execute outras ações externas só para testar um botão.

Para uma skill pessoal existente, registre o caminho exato do `SKILL.md` instalado com `node aos.mjs dashboard add --path "<absolute SKILL.md path>" --provider claude|codex|both --revision "<revision from list>"`. Use `both` somente após verificar que as instruções funcionam nas duas ferramentas. O registro retorna `registeredId` e uma nova revisão. Iniciar a skill e fixar o botão são ações separadas. Skills fora das pastas padrão de descoberta podem ser registradas pelo caminho exato.

Depois da aprovação, rode `node aos.mjs dashboard select --skills "<comma-separated IDs in their chosen order>" --revision "<latest revision>"`. Use `--skills none` apenas se a pessoa pedir explicitamente para ficar sem atalhos. Um conflito de revisão indica que outra janela alterou o painel. Recarregue a seleção salva e concilie com as escolhas da pessoa antes de tentar de novo.

Rode `node aos.mjs dashboard list` novamente para confirmar a ordem salva. O Obsidian e o Jarvis atualizam em alguns segundos. Mostre **Personalizar painel** em qualquer um dos aplicativos, onde a pessoa pode adicionar, retirar e reordenar botões, encontrar skills instaladas e restaurar o padrão. Os fluxos incluídos produzem relatórios em segundo plano. As skills pessoais abrem uma conversa comum na ferramenta escolhida, com perguntas e aprovações visíveis. Para rodar uma skill instalada, peça primeiro a tarefa real, sem executá-la só para testar o registro.

Consulte `docs/DASHBOARD.md` para ver todos os comandos e limites. As escolhas do painel ficam em `system/v2/dashboard.json` no cofre, persistem nas atualizações e podem ser feitas com os comandos acima, sem editar o código do aplicativo.

<a name="offer-the-skill-pack"></a>

### Ofereça o pacote de skills

A distribuição inclui um pequeno pacote de skills pessoais. A instalação copia essas skills para a pasta da ferramenta de código, onde a pessoa pode ler, editar e usar em qualquer conversa.

1. Rode `node aos.mjs skills list --provider claude` (ou `codex`, conforme a ferramenta que a pessoa usa). O comando mostra a `description`, o que a skill requer em `needs` e se já está `installed`.
2. Mostre uma lista como a dos botões, uma linha por skill. Pergunte *“Quer instalar alguma destas como skill pessoal?”* Se ela disser não, aceite a decisão. Registre as skills mostradas com `node aos.mjs skills offered --skills "<every id you showed>"` em qualquer caso, para evitar que sejam oferecidas de novo após uma atualização.
3. Instale somente o que ela escolheu com `node aos.mjs skills install --skills "<id>,<id>" --provider claude`. Se uma skill depender de outra, o comando também a instala e avisa. O estado `kept-yours` indica que já existia uma cópia diferente e ela foi preservada.
4. Pergunte se a pessoa quer alguma dessas skills como botão. Para cada sim, use o `path` exibido pela instalação com `dashboard add` e depois `dashboard select`, como acima.

A instalação apenas disponibiliza a skill. A pessoa pode editar a cópia, que é preservada em instalações ou atualizações futuras.

<a name="live-voice-optional"></a>

### Voz ao vivo (opcional)

Pergunte *“Quer conversar com seu assistente em uma chamada ao vivo? Ele responde com base no seu plano do dia e encaminha tarefas reais aos seus agentes. Você precisa da sua própria chave da API da OpenAI, que cobra cerca de cinco centavos de dólar por minuto enquanto você fala.”* Se a pessoa disser não, aceite a decisão. A voz local continua funcionando sem custo de API.

Prossiga apenas com um sim claro.

1. Pergunte se a pessoa já tem uma chave da **API** da OpenAI. Se não tiver, guie-a para entrar em platform.openai.com (a plataforma da API é separada do ChatGPT), adicionar créditos em Billing e criar uma chave na página de chaves da API. O ChatGPT Pro e o Business incluem créditos mensais da API. Oriente a pessoa a resgatar o benefício uma vez nas configurações de cobrança do ChatGPT e a usar uma chave da conta da API vinculada ali. O Plus não inclui esses créditos. Consulte `docs/LIVE-VOICE.md`. A chave fica com a pessoa.
2. Rode `node aos.mjs openai-key` e passe a página local que o comando exibe. A pessoa lê o aviso, cola a chave e salva a autorização na página. Nunca peça a chave no chat nem leia `openai.json`. A página consulta a OpenAI para verificar a chave antes de salvar, e o comando imprime o resultado em uma linha. Leia e siga a orientação correspondente.
   - *Chave salva. A OpenAI aceitou a chave.* Continue.
   - *Chave salva com um aviso. O modelo de voz ao vivo não apareceu entre os modelos disponíveis para esta chave.* Informe que o projeto da chave talvez ainda não tenha acesso e que a primeira chamada vai testar isso.
   - *Chave salva. Não foi possível conectar à OpenAI para verificar a chave.* Continue e use a primeira chamada como teste.
   - *A chave não foi salva.* A página expirou, ou a OpenAI recusou a chave e a pessoa fechou a página. Rode o comando novamente quando ela estiver pronta.
3. Peça à pessoa que abra **···** no cartão **Voz** do Jarvis ou ao lado do orbe no Obsidian, escolha **Ao vivo**, inicie uma chamada e autorize o microfone. Se a chamada não iniciar, a tela indica a causa, como chave recusada pela OpenAI, falta de crédito na conta da API ou falta de acesso ao modelo. Corrija com a pessoa o problema indicado. `docs/TROUBLESHOOTING.md` tem uma orientação para cada caso.
4. Peça que teste três coisas: uma pergunta comum, *“Qual é meu plano de hoje?”* (a voz ao vivo responde com o contexto que recebe) e *“Rode a skill Inbox Brief”* (a voz ao vivo encaminha o pedido ao V2, e a pessoa pode dizer “pare” em cerca de 2,5 segundos). Depois, selecione **Encerrar chamada**.
5. **Escolha o que a voz ao vivo recebe no início da chamada.** Diga *“Cada chamada começa com um resumo curto da sua seção Sobre mim, do plano de hoje e de alguns relatórios. Você pode desativar partes e acrescentar notas ou relatórios seus, como uma nota de metas ou um relatório salvo por uma skill. A OpenAI recebe tudo o que estiver nesse contexto no começo de cada chamada.”* Faça uma pergunta por vez.
   1. Rode `node aos.mjs live-context show` e diga em linguagem comum o que a chamada lê hoje.
   2. Pergunte *“Quais desses itens você quer em toda chamada?”* Se uma seção depende de um fluxo que a pessoa não roda, ela fica vazia. A seção de métricas (`numbers`) depende de Atualizar métricas. A de notícias (`news`) depende de Boletim de IA. A de radar (`radar`) depende de Radar de vídeos em destaque ou Em alta no GitHub. Desative as seções indesejadas com `node aos.mjs live-context section <name> off`.
   3. Pergunte *“Tem algo que você quer que a voz ao vivo saiba em toda chamada, como uma nota de metas ou projetos, uma lista de clientes ou um relatório salvo por uma skill?”* Procure a nota ou pasta no cofre com a pessoa e confirme o caminho antes de adicionar. Rode `node aos.mjs live-context add "<path>" --label "<short name>"`. Para uma pasta, a chamada lê a nota mais recente, o que serve para relatórios salvos diariamente por uma skill. São até seis entradas, lidas até cerca de 6.000 caracteres cada. Uma nota curta de resumo cabe melhor. Adicione apenas o que a pessoa indicar. Nunca inclua notas que contenham senhas, chaves, números de conta ou dados de saúde.
   4. Coloque informações que mudam pouco, como quem é a pessoa, com quem ela trabalha e como prefere as respostas, em **Sobre mim**. Ofereça as perguntas dessa seção se o texto estiver incompleto.
   5. Rode `node aos.mjs live-context show` de novo para mostrar o resultado. Diga que a pessoa pode alterar isso a qualquer momento com pedidos como *“adicione minha nota de metas à voz ao vivo”* ou *“pare de enviar o radar à voz ao vivo”*.
6. Mostre **Compartilhar boletim da manhã** nas configurações da voz ao vivo e deixe a pessoa escolher. A opção vem desativada. Se for ativada, a OpenAI recebe o boletim inteiro no início de cada chamada, incluindo a seção de e-mails, e a voz ao vivo pode responder com base nele. Ofereça a opção ao falar do agendamento do Boletim de IA abaixo, pois ela só serve para quem roda o fluxo.

Mais tarde, `node aos.mjs openai-key --check` indica se a chave e a autorização foram salvas, e `node aos.mjs doctor` verifica a chave salva com a OpenAI. Ambos preservam o segredo da chave.

Consulte `docs/LIVE-VOICE.md` para ver detalhes, configurações e custos. Deixe a pessoa ativar a voz ao vivo, **Compartilhar boletim da manhã** e outras opções de compartilhamento.

<a name="other-preferences"></a>

### Outras preferências

- **Rotinas diárias (Daily Drivers).** Pergunte quais três ou quatro itens a pessoa quer na lista de todos os dias. Grave em `<vault>/system/v2/profile.json` como `{"dailyDrivers": ["…", "…"]}`, com um a oito rótulos curtos. O campo opcional `"cta"` guarda o parágrafo final que Reaproveitar conteúdo deve usar para divulgar a comunidade ou a newsletter da pessoa.
- **Cartões de métricas** do YouTube, Instagram, TikTok e GitHub. As configurações ficam em `~/.claude/.env`. O sistema lê o arquivo mesmo em um computador que só usa Codex. Se a pasta `~/.claude` não existir, crie-a e crie o arquivo a partir de `docs/env.example`. Abra no editor da pessoa (`notepad` ou `open -e`), indique quais linhas preencher e aguarde. Nomes de usuário podem ser informados, mas a chave do YouTube é secreta e deve ser digitada pela própria pessoa.
- **Fluxos agendados.** Pergunte se a pessoa quer automatizar algum fluxo, como Planejar hoje de manhã ou Boletim de IA antes de começar a trabalhar. Só com um sim claro, rode `node aos.mjs schedule add plan-today 07:00 --days weekdays` para o exemplo de Planejar hoje às 7h nos dias úteis. `node aos.mjs schedule skills` lista os fluxos que podem ser agendados. Explique que o fluxo só roda enquanto os serviços estiverem ativos e usa a assinatura da mesma forma que clicar no botão. Agende exclusivamente o que ela pedir.
- **Som e vocabulário da voz.** Se a pessoa usa voz, pergunte se quer ouvir as respostas (`node aos.mjs voice mute` desativa a fala). Ofereça outra voz ou velocidade (`node aos.mjs voice use <name>`, `node aos.mjs voice speed 1.1`) e ensine dois ou três nomes que ela quer que o sistema entenda, como o próprio nome, a empresa ou o produto principal (`node aos.mjs voice teach "<word>" "<word>"`). `node aos.mjs voice` mostra o resultado. Ela pode mudar essas opções no menu de voz de qualquer um dos painéis.
- **Idioma da voz.** Os cofres novos deste fork já vêm com português brasileiro. Um cofre existente sem preferência usa inglês na escuta e na fala. Para usar espanhol, francês, italiano ou português brasileiro, adicione `"speechLanguage": "es"` (ou `fr`, `it`, `pt`, respectivamente) ao mesmo `profile.json`. Rode `node aos.mjs stop`, depois `node aos.mjs setup --voice yes` para baixar o modelo de voz do idioma (cerca de 460 MB) e `node aos.mjs doctor`. Explique que muitos comandos instantâneos continuam em inglês. Este fork também reconhece algumas frases em português, como “planejar hoje”. Pedidos fora dessas regras vão ao modelo e podem demorar alguns segundos a mais. Para outros idiomas, deixe a opção de fora.
- **Fuso horário.** As datas seguem o relógio do computador. Se o fuso mudar, rode `node aos.mjs stop` e depois `node aos.mjs start`.

<a name="phase-8--hand-over"></a>

## Fase 8 — Entregue o sistema

Faça um resumo curto e voltado à pessoa.

- Diga que a ponte, o Jarvis e a voz rodam sozinhos, inclusive ao entrar na sessão se a pessoa escolheu o início automático. Explique as solicitações à conta do Claude ou do Codex, o roteamento opcional de Jev pela OpenRouter e eventuais buscas na web ou serviços conectados. Revise o acesso a dados e as ações externas que as skills pessoais escolhidas exigem.
- Explique os custos da assinatura do Claude ou Codex, do uso opcional da OpenRouter para Jev e da OpenAI para chamadas ao vivo, e das ferramentas ou serviços pagos exigidos pelas skills pessoais. A voz local funciona sem cobrança de API.
- Passe os comandos de dia a dia `node aos.mjs status | stop | start | doctor | update`. Explique que `update` mantém uma cópia padrão como um conjunto e que `upgrade` faz descoberta somente para leitura e orienta o planejamento em um sistema existente ou personalizado.
- Mostre onde encontrar os resultados. Relatórios ficam em `inbox/reports/` e `inbox/research/`, notas diárias em `daily-notes/` e convenções em `CLAUDE.md` e `AGENTS.md` do cofre.
- Lembre que o serviço de voz próprio usa **Control–Option–J** no Mac e **Ctrl–Alt–J** no Windows. Pressione uma vez, fale e pause para enviar. Mantenha o Obsidian aberto com o orbe habilitado ou o Jarvis visível. No Mac, o medidor de uso semanal do Claude pode aparecer como indisponível. O suporte ao Mac é recente. Se algo falhar, comece com `node aos.mjs doctor`.
- Para resolver problemas mais tarde, abra esta pasta no Claude Code ou Codex e peça *“rode o diagnóstico”*.
