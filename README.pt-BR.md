# Agentic OS V2 em português do Brasil

Este fork mantém os dois painéis do projeto da Chase AI. O Jarvis roda no navegador e o Agentic OS V2 abre dentro do Obsidian. Os dois usam o mesmo cofre para consultar notas e gravar relatórios em Markdown.

## Instalação

Você precisa de Node.js 22 ou superior, Git, Obsidian e Claude Code ou Codex com uma sessão ativa. Para usar a voz local, instale também Python 3.10 a 3.13. O instalador recomenda Python 3.12.

Clone o fork, entre na pasta e troque o caminho de exemplo pelo caminho do seu cofre:

```sh
git clone https://github.com/davioliveeira/agentic-os-starter-v2.git
cd agentic-os-starter-v2
node aos.mjs setup --vault "/caminho/do/cofre" --provider codex --voice yes --autostart no
```

Use `--provider claude` se quiser usar Claude Code. Para um cofre existente, defina `"speechLanguage": "pt"` em `system/v2/profile.json` antes de instalar a voz. Cofres novos deste fork já recebem essa preferência. A instalação da voz baixa os modelos para o seu computador.

- No Obsidian, habilite **Agentic OS V2** em **Configurações → Plugins da comunidade**. Para abrir o painel, use a paleta de comandos e procure **Abrir Agentic OS V2**.
- No navegador, abra o [Jarvis](http://127.0.0.1:3217). Em **Voz**, clique para falar e faça uma pausa para enviar. Na primeira vez, libere o microfone no aplicativo em que você vai falar.
- Use `node aos.mjs doctor` para checar os serviços. O teste `node aos.mjs doctor --full` usa seu provedor para ler o cofre e gravar um relatório de teste.

Se você já tem o original rodando, ele precisa liberar as portas antes que outra instalação possa iniciar. Use `node aos.mjs stop` na pasta da instalação original quando suas tarefas estiverem concluídas.

## Tradução e compatibilidade

Os painéis, o catálogo de fluxos e a configuração inicial da voz usam português brasileiro. Comandos do instalador, IDs dos fluxos, seções estruturais das notas e atalhos de voz instantâneos seguem as convenções do projeto original. As respostas e os relatórios gerados pelo agente podem incluir termos de fontes e ferramentas externas.

A base do fork é o [Agentic OS V2 da Chase AI](https://github.com/ctskool/agentic-os-starter-v2), com [licença MIT](LICENSE) e [avisos de terceiros](THIRD_PARTY_NOTICES.md). Veja também a [documentação original em inglês](README.md).
