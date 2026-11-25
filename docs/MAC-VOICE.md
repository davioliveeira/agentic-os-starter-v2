# Atalho de voz no Mac

Ao instalar seu próprio serviço de voz, o Agentic OS habilita **Control–Option–J**. O atalho funciona enquanto o serviço de voz está em execução, inclusive após iniciar a sessão quando a inicialização automática está ativa.

Pressione o atalho uma vez, espere o sinal de escuta e fale. Após cerca de 1,6 segundo de silêncio, a gravação termina e o pedido segue para o provedor escolhido no painel. Você pode soltar as teclas ao começar. A gravação também termina após 60 segundos, ou após cerca de cinco segundos sem fala.

Mantenha o Obsidian aberto e o botão flutuante do Agentic OS habilitado. O Obsidian pode ficar atrás de outro aplicativo. Se usar o Jarvis no navegador, mantenha a página visível e clique nela uma vez para permitir a reprodução de áudio. Quando o serviço de voz é compartilhado com outro programa, valem os atalhos definidos nesse programa.

## Testar com o microfone

Execute os comandos na pasta da instalação que você usa. Se **Serviço de voz operacional** indicar um serviço compartilhado, outro programa controla o áudio e o atalho. Registre **SKIP — serviço compartilhado** para o atalho desta instalação. As portas 3217–3221 pertencem a uma única instalação por vez. Uma troca de instância usa os comandos de parada e início da respectiva instalação, depois de confirmada com seu responsável.

1. Rode `node aos.mjs status` e `node aos.mjs doctor`. A linha **Atalho global de voz** verifica se a combinação está registrada. Teste a captação nos passos seguintes.
2. Abra o painel no Obsidian e deixe o botão flutuante habilitado. Coloque outro aplicativo, como o Editor de Texto, em primeiro plano. Use o teclado físico.
3. Pressione e solte **Control–Option–J**. Se o macOS pedir acesso ao microfone, confira se o aplicativo é o **Obsidian** ou o navegador usado para o Jarvis. Após permitir o acesso, espere o sinal de escuta e pressione de novo se for preciso. O painel grava e o serviço local faz a transcrição e a síntese. Se o acesso estiver bloqueado, confira **Ajustes do Sistema → Privacidade e Segurança → Microfone**. O navegador também precisa de permissão para `127.0.0.1:3217`. [Guia da Apple sobre acesso ao microfone](https://support.apple.com/guide/mac-help/control-access-to-the-microphone-on-mac-mchla1b1e1fe/mac).
4. Pergunte “Quanto é dois mais dois?” e faça uma pausa. Verifique se a gravação termina após o silêncio, se aparece um único pedido e se toca uma resposta. Repita com o outro aplicativo ainda em primeiro plano.
5. Se a inicialização automática já estiver ativada, repita no próximo login normal. Rode `node aos.mjs status` e `node aos.mjs doctor` antes de iniciar os serviços manualmente. Depois, repita os passos 2 a 4. Registre o resultado do login à parte.

Ao relatar o teste, informe a versão do macOS, o layout do teclado, o aplicativo em primeiro plano e a linha de **Atalho global de voz** do diagnóstico. Descreva o sinal de escuta, o fim da gravação, o número de pedidos e de respostas audíveis e o que aconteceu na segunda tentativa. Use **PASS** para um resultado observado, **FAIL** com a mensagem ou o comportamento observado e **Não testado** para o que ficou pendente. Registre o estado da permissão do microfone. Compartilhe somente os dados necessários ao diagnóstico.

## Se o atalho estiver indisponível

- Rode `node aos.mjs doctor`. No serviço local desta instalação, `hotkey` e `capture` ficam disponíveis em `http://127.0.0.1:3220/health`. O diagnóstico informa outro endereço se estiver usando um serviço compartilhado.
- Se outro aplicativo já usar a combinação, libere-a nesse aplicativo e reinicie o Agentic OS quando as tarefas estiverem encerradas.
- Mantenha o botão flutuante do Obsidian habilitado ou a página do Jarvis visível para que um painel possa capturar o áudio.
- Atualize o plugin, o Jarvis e o serviço de voz em conjunto e recarregue os painéis. O atalho no Mac depende do protocolo de captura entre o painel e o serviço.
- A combinação usa a posição física da tecla ANSI J. Em alguns layouts, o caractere impresso na tecla pode variar.
- Enquanto resolve o atalho, você pode usar o botão de microfone do Jarvis.

O processo auxiliar registra apenas a combinação escolhida e termina com o serviço de voz. O aplicativo pede acesso ao microfone quando a gravação começa. O atalho funciona sem permissões de Acessibilidade ou de Monitoramento de Entrada.

No Mac, o navegador ou o Obsidian grava o áudio. O serviço em segundo plano não precisa de acesso ao microfone. O campo `capture.method: "surface"` identifica esse modo. Para diagnosticar permissões, confira os ajustes do aplicativo que grava.

A variável `VOICE_HOTKEY` aceita teclas modificadoras mais uma letra ou dígito ASCII, ou `off`. Ela deve estar disponível para o serviço de voz durante a inicialização. Uma atribuição temporária no terminal só afeta processos iniciados naquele ambiente. A configuração padrão no Mac usa **Control–Option–J**.
