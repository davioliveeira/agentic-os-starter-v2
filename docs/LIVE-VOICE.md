# Voz ao vivo

A voz **Local** vem habilitada por padrão e usa Whisper e Kokoro no seu computador. O modo **Ao vivo** usa o GPT-Live em uma chamada e encaminha ao Agentic OS os pedidos que precisam gerar um relatório ou executar uma ação.

<a id="before-you-start-an-openai-api-key"></a>

## Antes de começar, crie uma chave da API da OpenAI

1. Entre em [platform.openai.com](https://platform.openai.com). A plataforma da API é separada do ChatGPT.
2. Adicione créditos em **Billing**. Se seu plano do ChatGPT incluir créditos da API, resgate-os e use uma chave da conta vinculada ao benefício. As chamadas param quando o saldo acaba. Consulte as [condições de elegibilidade e resgate da OpenAI](https://help.openai.com/en/articles/20001626-api-credits-benefit-for-eligible-chatgpt-subscriptions).
3. Crie uma chave na [página de chaves da API](https://platform.openai.com/api-keys) e copie-a inteira, incluindo o prefixo `sk-`. Você vai colá-la na página local aberta pelo comando abaixo.

## Configurar a voz ao vivo

1. Na pasta do Agentic OS, rode `node aos.mjs openai-key` ou `aos openai-key`. Você também pode pedir ao seu agente de código para **configurar a voz ao vivo**. Abra a página local, leia quais dados são enviados, cole a chave e registre sua autorização. A página verifica a chave na OpenAI e permite outra tentativa se ela for recusada.
2. Abra o menu **···** ao lado do orbe no Obsidian ou no cartão de voz do Jarvis. Escolha **Ao vivo**, inicie uma chamada e permita o microfone. Só uma janela pode controlar a chamada por vez.
3. Na barra da chamada, você pode silenciar o microfone ou selecionar **Encerrar chamada**. A chamada também termina por inatividade, ao fechar ou recarregar a janela, ao voltar para **Local** ou quando a ponte reinicia. O orbe, Escape, Ctrl+Alt+J, a troca de terminal e a troca de janela mantêm a chamada ativa.
4. Na primeira chamada, faça uma pergunta comum e depois pergunte “Qual é meu plano de hoje?”. Por fim, diga “Rode a skill Inbox Brief”. Esse último pedido é encaminhado ao Agentic OS. Para interromper a ação no modo padrão, diga “pare” nos primeiros 2,5 segundos.

Se a chamada falhar, a mensagem na tela indica a causa conhecida e o próximo passo. `node aos.mjs doctor` verifica o acesso da chave salva na linha **Voz ao vivo (chave da OpenAI)**. O saldo da conta precisa ser conferido na plataforma da API.

## Ajustar a chamada

- **Executar direto** é o padrão. A voz ao vivo anuncia a ação e dá cerca de 2,5 segundos para dizer “pare”, dizer “espera” ou selecionar **Cancelar**. As outras opções ficam em **Configurações da voz ao vivo → Confirmar ações**.
- **Diga “sim”** pede confirmação antes de agir. Depois do “sim”, você tem 1,5 segundo para dizer “espera”, corrigir o pedido ou selecionar **Cancelar**. **Clique para confirmar** exige o clique. **Confirmar só paradas e edições** inicia tarefas novas direto e pede um clique antes de parar ou substituir tarefas, editar notas ou trocar de conversa.
- O microfone fica aberto em espera por padrão para você poder retomar a conversa pela voz. Você pode desativar essa opção e reativar o microfone com um clique ou **Ctrl+Alt+J** no Windows.
- **Encerrar chamada por inatividade** vem configurado para 30 minutos. Você pode escolher 15 ou 60 minutos. As chamadas se renovam automaticamente antes do limite de sessão da OpenAI. **Lembrar chamadas de hoje** vem desativado. Ao ativá-lo, uma nova chamada pode receber um resumo curto das chamadas anteriores no mesmo aplicativo.
- **Compartilhar títulos de tarefas** vem ativado. Desative a opção para retirar as tarefas em andamento do contexto da chamada.
- **Compartilhar boletim da manhã** vem desativado. Ao ativá-lo, a OpenAI recebe o resumo completo no começo da chamada, incluindo a seção de e-mails. Assim, a voz ao vivo pode responder direto a perguntas como “Tem algum e-mail importante hoje?” e “Quais são as três prioridades?”. Com a opção desativada, ela recebe só as manchetes e encaminha essas perguntas ao Agentic OS.

## Acompanhar tarefas na chamada

A voz ao vivo confirma o pedido uma vez e deixa você continuar falando enquanto a tarefa roda. Pergunte “Como está a pesquisa?” ou “O que está rodando?”. Para iniciar uma skill instalada numa conversa nova com o provedor selecionado, diga, por exemplo, “Rode a skill today”.

No Jarvis, um cartão ao lado do núcleo mostra que o pedido está sendo delegado. Em seguida, mostra a tarefa iniciada ou a nota usada na resposta e desaparece após alguns segundos.

A voz espera uma pausa para falar sobre conclusões e impedimentos. Tarefas concluídas quase juntas são anunciadas em conjunto. Em espera, um som curto e um cartão sinalizam a atualização. Quando a chamada retomar e houver uma pausa, a voz fala a atualização. Os resultados continuam na tela após o fim da chamada. No Jarvis, abra o item em **Terminais** ou selecione **Ver** no aviso. No Obsidian, confira a lista de tarefas ou selecione **Ver** no aviso.

Em **Configurações da voz ao vivo → Atualizações de tarefas**, escolha **Conclusões e impedimentos** (padrão), **Só na tela** ou **Acompanhar tarefas longas**. A última opção acrescenta uma atualização a cada três minutos para as tarefas iniciadas na chamada.

## Quais pedidos são delegados

| Modo | Exemplos |
|---|---|
| Resposta direta | Conhecimento geral, explicações, ideias, conversa e dados já incluídos no contexto da chamada. |
| Encaminhamento ao Agentic OS | Dados fora do contexto da chamada, ações no computador, pesquisa na internet e notícias que precisam ser consultadas. |

Quando faltam dados sobre você ou o cofre, a voz ao vivo encaminha a consulta. Se ela oferecer uma ação concreta, diga “sim” em até um minuto. Quando ela oferecer para ler um resultado, a confirmação usa o último resultado disponível na chamada. As outras ofertas aceitas são encaminhadas como novos pedidos.

## Dados enviados e custo estimado

A voz ao vivo envia áudio, o contexto do cofre e respostas de tarefas delegadas à OpenAI com a opção `store:false`. Dependendo das suas configurações, esse contexto pode incluir **Sobre mim**, as três prioridades do dia e a agenda da nota diária do `/today`, rotinas diárias, até cinco títulos de tarefas com provedor e status, contagens de notas novas nas pastas de `inbox/` nas últimas 24 horas, métricas, vídeo mais recente, manchetes, radar e notas adicionadas por você. O contexto inicial deixa de fora os nomes das notas contadas na caixa de entrada, as solicitações e respostas das tarefas e os caminhos dos relatórios.

Quando o compartilhamento do resumo da manhã está ativado, o resumo inteiro substitui as manchetes, até 36.000 bytes e sem os links. Ele inclui a seção de e-mails. Com a opção desativada, o conteúdo dos e-mails fica no seu computador.

### Escolher o contexto da chamada

- Rode `node aos.mjs live-context show` para listar o que entra no contexto. Use `node aos.mjs live-context show --full` para ver exatamente o que seria enviado agora.
- Desative uma seção com `node aos.mjs live-context section radar off`. As outras seções configuráveis são `today`, `inbox`, `numbers` e `news`. Se você ainda não usa o fluxo que preenche uma seção, ela fica vazia.
- Adicione suas notas com `node aos.mjs live-context add "projects/goals.md" --label "Metas"`. Ao apontar para uma pasta, o sistema usa a nota mais recente. Você pode adicionar até seis entradas. Cada uma é lida até cerca de 6.000 caracteres.
- Guarde informações duradouras na seção Sobre mim, detalhes de hoje na nota diária e outros materiais de referência nas notas adicionadas ao contexto. Claude e Codex leem essa seção do `AGENTS.md` do cofre. A voz ao vivo recebe até 2.000 bytes. Rode `node aos.mjs about show` para conferir o texto.

Pedidos digitados seguem o fluxo normal do Agentic OS. O GPT-Live recebe os resultados curtos das tarefas que ele delegou. Com **Ao vivo** selecionado, as atualizações dessas tarefas continuam na tela depois de encerrar a chamada.

A barra da chamada usa **US$ 0,05 por minuto ativo** e **US$ 0,02 por minuto em espera** como estimativas internas. Quando a OpenAI informa só o tempo total, o medidor aplica a taxa ativa. Consulte o consumo na conta da API para conferir a cobrança.

Consulte [Solução de problemas da voz ao vivo](TROUBLESHOOTING.md#live-voice) se precisar corrigir um erro de configuração ou áudio.
