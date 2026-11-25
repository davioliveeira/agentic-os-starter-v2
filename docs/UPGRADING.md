# Atualizar uma instalação existente do Agentic OS

Você pode partir do V1, de uma versão antiga do V2 ou de uma instalação personalizada. Abra o Claude Code ou o Codex e diga:

```text
Use https://github.com/davioliveeira/agentic-os-starter-v2 para me ajudar a atualizar meu Agentic OS. Localize minha instalação e meu cofre, explique o que posso adicionar e preserve minhas personalizações. Mostre o plano antes de alterar a instalação.
```

O agente começa localizando a instalação e o cofre. Se encontrar mais de um, vai perguntar qual você usa. Se precisar de ajuda para encontrar o cofre, você pode localizá-lo pelo Obsidian e pelo gerenciador de arquivos.

```text
Localizar a instalação    Consultar sem alterar arquivos nem interromper serviços
        |
Escolher melhorias        Preservar suas personalizações
        |
Revisar o plano           Conferir arquivos, dependências, testes e restauração
        |
Aplicar e verificar       Combinar a transição antes de interromper os serviços
```

Você pode pedir o painel do Obsidian, o Jarvis, voz local, chamadas ao vivo, o roteador Jev, o perfil Sobre mim, botões personalizados ou os fluxos incluídos. O agente explica os requisitos e verifica a compatibilidade. Alguns recursos precisam de versões correspondentes da ponte, do plugin e do Jarvis.

Diga ao agente quais partes da configuração importam para você e quais skills costuma usar. Ele pode comparar versões em arquivos que sejam relevantes e não contenham segredos. A lista de skills instaladas mostra as opções disponíveis. Para identificar quais você usa no dia a dia, conte ao agente sobre a sua rotina.

| De onde você parte | Como atualizar |
|---|---|
| V2 original reconhecido, sem alterações | Atualize a instalação como uma versão completa. As notas do cofre, os ajustes do painel e as preferências compatíveis são preservados. |
| V1 | Prepare e teste o V2 com o mesmo cofre. Mantenha o plugin anterior disponível até verificar o novo sistema. |
| Projeto personalizado ou de versão desconhecida | Revise um plano de integração, preserve suas alterações, implemente as melhorias compatíveis e teste antes da transição. Futuras atualizações podem exigir integração manual. |

Se houver conflitos, o agente deve mostrar quais arquivos são afetados e confirmar suas preferências. Antes de editar, ele deve guardar cópias apenas dos arquivos envolvidos que não contenham segredos e preservar as notas e configurações do Obsidian. Mantenha o cofre e as pastas de credenciais fora do backup da atualização. Digite chaves apenas na página de configuração local.

```text
node aos.mjs upgrade    # Localiza instalações e exibe um relatório de consulta
node aos.mjs update     # Atualiza e recompila uma instalação original reconhecida
```

**Ao atualizar da primeira versão pública de setembro de 2026**, o comando `update` baixa os arquivos novos e executa o código de instalação que já estava carregado. Depois da atualização, rode `node aos.mjs stop` e `node aos.mjs setup` uma vez para aplicar também as etapas novas. Isso inclui a seleção do provedor, as verificações do Python, os pacotes de voz e os ajustes de inicialização no Windows e no macOS. Antes desse passo, o diagnóstico informa que a instalação não foi concluída para a versão. As versões seguintes executam automaticamente o código de instalação atualizado.

Se `update` recusar uma instalação personalizada ou de versão desconhecida, peça ao agente para avaliar as alterações e preparar uma integração que preserve seu código.

Uma única instalação pode usar as portas fixas do Agentic OS por vez. Combine a transição antes de encerrar a instalação em uso e guarde um caminho para restaurá-la. Use os scripts da própria instalação e aguarde a liberação das portas para rodar testes que dependam delas. Deixe outros serviços de voz e tarefas de recuperação fora da transição.

Depois das verificações, o agente pode oferecer o perfil Sobre mim, seus botões personalizados e a [voz ao vivo](LIVE-VOICE.md). Cada recurso é ativado de acordo com a sua escolha. Você também pode pedir para configurar a voz ao vivo ou atualizar o perfil Sobre mim a qualquer momento.

Ao final, confira o que mudou, quais testes passaram, quais falharam ou foram pulados, qual instalação está rodando e como fazer a próxima atualização. **O suporte ao macOS está em beta.** Teste o microfone, o painel do Obsidian e o Jarvis no seu Mac.

Veja as instruções detalhadas no [roteiro de atualização](../setup/UPGRADE.md). Para reparar a instalação atual, peça para rodar o diagnóstico da instalação existente.
