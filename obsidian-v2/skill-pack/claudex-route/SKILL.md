---
name: claudex-route
description: "Recomenda um modelo para uma tarefa no Claude Code ou Codex. Use para escolher quem deve conduzir o trabalho, buscar outra opinião, investigar um bloqueio ou delegar uma parte bem definida."
---

# Encaminhar uma tarefa

Identifique a ferramenta atual, o modelo quando conhecido, o objetivo, as restrições e o tipo de verificação necessário. Considere dependências, ambiguidade, tamanho do contexto e preferência por custo ou velocidade. Preserve escolhas explícitas do usuário.

## Escolher o próximo passo

| Situação | Ação |
|---|---|
| A tarefa está clara e o agente atual tem contexto suficiente | Continue com o agente atual |
| Um plano importante precisa ser validado | Peça a outro provedor para questionar requisitos, suposições e critérios de aceitação |
| A implementação já existe | Peça uma revisão do diff e dos testes |
| Tentativas repetidas falharam | Envie a reprodução, os indícios e as tentativas a outro provedor para obter uma hipótese verificável |
| Uma etapa independente tem entradas e verificações claras | Delegue a etapa para um modelo adequado e confira o resultado |
| A pessoa pediu um ciclo de alinhamento, revisão e implementação | Indique a skill `claudex-loop` |

Use os modelos disponíveis no ambiente. Modelos menores podem atender tarefas repetitivas e verificáveis. Use um modelo mais capaz para planos ambíguos, depuração complexa ou revisão substancial. Confirme o que a CLI oferece e se há uma sessão ativa antes de prometer execução. Consulte documentação oficial quando a recomendação depender de preço. Relate a incerteza quando ela mudar a escolha.

## Responder à pessoa

Em português brasileiro e com até cerca de 200 palavras, explique o modelo ou provedor recomendado, a razão e o próximo passo. Se houver delegação, descreva a tarefa, os arquivos relevantes, o resultado esperado, os limites e a verificação. Um pedido de recomendação autoriza a recomendação. Execute uma delegação somente quando houver pedido de execução.

## Executar a delegação solicitada

- Use a CLI escolhida na pasta correta. Confira a versão e a ajuda do comando e selecione o modelo acordado para essa sessão.
- Envie a tarefa completa pela entrada padrão ou por um arquivo seguro. Inclua os requisitos, a base de comparação, as restrições e os critérios de aceitação.
- Para revisão, use permissões efetivas de leitura e restrinja ferramentas externas de escrita. Para edição, respeite as permissões concedidas e preserve alterações existentes. Use um checkout isolado se houver conflito com outro trabalho.
- Use uma sessão nova, um prazo definido e arquivos temporários separados para stdout e stderr. Enquanto durar a execução, evite editar os mesmos arquivos.
- Leia o resultado e o código de saída. Trate falha, limite de tempo ou saída vazia como execução incompleta. Confirme o estado de processos ainda ativos antes de uma nova tentativa.
- Verifique o trabalho com evidências do projeto. Informe o modelo solicitado, o modelo observado se disponível, as verificações executadas e o que falta.
