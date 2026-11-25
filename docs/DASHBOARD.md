# Personalizar o painel

Abra **Personalizar painel** no Obsidian ou no Jarvis. Escolha até dez atalhos, organize a ordem e salve. Em alguns segundos, os dois painéis passam a mostrar a mesma seleção.

- **Padrões.** Antes da primeira personalização, o Obsidian mostra dez atalhos e o Jarvis mostra quatro. A opção de restaurar os padrões recupera o conjunto de cada aplicativo.
- **Seleção própria.** A lista salva substitui os atalhos rápidos nos dois painéis. Você pode escolher menos de dez ou deixar a lista vazia. O catálogo de fluxos continua disponível.
- **Salvar ou cancelar.** A seleção de atalhos muda ao salvar. Ao registrar uma skill instalada, ela entra no catálogo imediatamente e aguarda um pedido para ser executada.
- **Duas janelas.** Se outra janela alterar a configuração enquanto você estiver editando, recarregue a tela e revise a seleção antes de salvar.

## Fluxos incluídos e skills pessoais

Fluxos incluídos, como **Planejar hoje**, **Pesquisa aprofundada** e **Reaproveitar conteúdo**, executam em segundo plano e salvam um relatório no cofre. Alguns precisam de acesso à agenda, ao e-mail ou de um link de origem.

Na seção **Adicionar skills instaladas**, procure skills nas pastas padrão da ferramenta de código escolhida. Registre uma skill existente para incluí-la no catálogo e adicione-a ao painel. Você também pode registrar o caminho local de um `SKILL.md` específico. A busca se limita às pastas de skills da ferramenta.

Uma skill pessoal abre uma conversa no Claude Code ou no Codex. Escreva o que você quer que ela faça. Perguntas e pedidos de aprovação aparecem no terminal. Se houver conectores, ferramentas auxiliares ou contas para configurar, faça isso durante a conversa.

Para executar uma skill pessoal dentro do Obsidian, habilite o plugin da comunidade **Terminal**, de polyipseity. Use uma versão estável da série 3.x a partir da 3.27.1. As versões 3.27.1 e 3.27.2 foram testadas, e versões mais recentes exibem um aviso na primeira vez. Você também pode usar o atalho no Jarvis. Os fluxos incluídos executam em segundo plano sem o plugin Terminal.

O cadastro de cada skill especifica em quais provedores ela pode rodar. Trocar de provedor pode desabilitar um atalho incompatível. Se o arquivo da skill for alterado ou removido, revise o novo arquivo e registre-o novamente. Encontrar uma skill na busca apenas mostra a opção de cadastrá-la.

Para registrar, escolha o arquivo real em sua pasta de origem. Use arquivos locais comuns. A busca pode ignorar pastas inválidas ou vinculadas por links e avisa quando atinge o limite de busca.

## Comandos do instalador

Execute no repositório do Agentic OS. Os comandos usam o cofre configurado. Para selecionar outro cofre já preparado, use `--vault "<caminho absoluto do cofre>"`. O cadastro pode ser feito com os serviços ligados ou desligados.

```text
node aos.mjs dashboard list
node aos.mjs dashboard discover --provider claude
node aos.mjs dashboard discover --provider codex
```

O comando `list` retorna o catálogo, a seleção salva e a revisão atual. Informe essa revisão ao alterar a configuração.

```text
node aos.mjs dashboard select --skills "plan-today,deep-research-chase,weekly-review" --revision "<revisão>"
node aos.mjs dashboard add --path "<caminho absoluto de SKILL.md>" --provider claude --revision "<revisão>"
node aos.mjs dashboard reset --revision "<revisão>"
```

No cadastro, `--provider` aceita `claude`, `codex` ou `both`. Confirme a compatibilidade com as duas ferramentas antes de usar `both`. Para definir o texto do botão, use por exemplo `--label "Escrever propostas"`. O cadastro retorna `registeredId` e a nova revisão. Use o ID retornado no próximo `select` para fixar a skill no painel. Para salvar sem atalhos rápidos, use `--skills none`.

A configuração fica em `system/v2/dashboard.json`, dentro do cofre. A instalação e a atualização preservam esse arquivo. Se o painel indicar que o arquivo está inválido, peça ao agente de código para repará-lo antes de salvar.

## O que cada atalho precisa

Consulte a descrição de cada fluxo em **Personalizar painel** ou em `node aos.mjs dashboard list`. Ela informa o resultado esperado e as dependências. Em um cofre novo, você já pode resumir o cofre, fazer pesquisa aprofundada, revisar a organização, gerar o boletim de IA e o relatório da manhã, investigar tendências e trabalhar em ângulos e roteiros. **Planejar hoje**, **Planejar amanhã** e **Atualizar agenda** precisam do Google Agenda. O resumo da caixa de entrada e o boletim com e-mails precisam do Gmail. Fluxos do YouTube usam uma chave da API do YouTube, e a pesquisa de leads precisa de uma base fornecida por você.

## Pacote de skills

Os atalhos incluídos fazem parte do Agentic OS. O pacote separado reúne skills que você pode ler, editar e usar em qualquer conversa. Use `node aos.mjs skills list` para ver o catálogo e `node aos.mjs skills install --skills "<id>" --provider claude` para instalar uma skill. Para o Codex, use `--provider codex`. Para adicioná-la ao painel, registre com `dashboard add` o caminho informado pelo instalador. Atualizações preservam as cópias que você editou.

## Escolher os primeiros atalhos

Conte ao agente que tipo de trabalho você faz e quais skills usa com frequência. Ele pode sugerir uma lista curta para você aprovar ou manter os atalhos padrão. Se quiser um fluxo novo, descreva o resultado desejado e peça ao agente para ajudar a criar e revisar o `SKILL.md` antes de cadastrá-lo no painel.
