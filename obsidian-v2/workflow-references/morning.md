# Boletim da manhã com caixa de entrada

Siga as referências `morning-report` e `inbox-brief`. Rode a pesquisa e a leitura da caixa de entrada em paralelo quando o provedor permitir. Caso contrário, faça em sequência e preserve os dois resultados. Respeite a autorização e disponibilidade dos conectores.

A pesquisa cobre YouTube, web, X e GitHub nas últimas 24 horas. A triagem segue as seis categorias e qualifica leads. A execução inicial só gera o relatório.

Use frontmatter `date`, `skill: morning` e `tags: [morning, brief]`, depois:

```
# Boletim da manhã

## Tendências de IA e agentes de código
<Relatório completo, fontes e lacunas>

## Caixa de entrada (últimas 24h)
<Triagem completa, com listas numeradas separadas para leads e patrocínios>

## Próximas ações propostas
<Totais de leads e propostas que merecem resposta, com referência aos IDs>
```

Preserve o conteúdo de cada seção. Remova duplicatas. Se uma fonte estiver indisponível, indique claramente e mantenha o resultado da outra. Guarde só o mínimo necessário dos e-mails para revisar e identificar itens.

## Identificadores da triagem

Mantenha numeração estável e separada. Após a triagem, inclua as duas seções abaixo com listas JSON válidas. Preserve os IDs exatos. Use `[]` para listas vazias e `null` para identificadores indisponíveis. Registre a lacuna. Use apenas dados, respostas de formulário e classificações verificáveis.

### SPONSOR_PITCHES

```json
[
  {"number":1,"id":"<source message or thread id>","from":"<observed sender>","subject":"<observed subject>","firstName":"<verified first name or null>","messageIdHeader":"<actual RFC Message-ID header or null>"}
]
```

### LEADS

```json
[
  {"number":1,"source":"<agency or mentorship>","name":"<prospect name>","firstName":"<prospect first name or null>","email":"<prospect address parsed from submission>","formAnswers":{},"verdict":"PURSUE","rationale":"<evidence-based reason>","researchNote":"<concise observed web check or no web check>"}
]
```

Mantenha em `formAnswers` as perguntas e respostas relevantes para a qualificação. Use `PURSUE`, `PURSUE?` ou `PASS` em `verdict`. Inclua os leads descartados na triagem e identifique o prospect pela resposta do formulário. Os dados ficam no relatório local.

## Seleção posterior

Se houver itens, apresente opções em português e aceite os comandos originais:

- Leads: quantidade em `PURSUE`. Ofereça “avançar com todos” (`pursue all`), “avançar com 1,3” (`pursue 1,3`) ou `pass`.
- Patrocínios: quantidade de propostas. Ofereça “rascunhar todos” (`draft all`), “rascunhar exceto 3,7” (`draft except 3,7`) ou `skip`.

Resolva números pela lista correta. “Todos” para leads seleciona `PURSUE` e deixa `PURSUE?` para revisão. IDs explícitos selecionam os itens indicados. Peça a categoria quando o pedido for ambíguo. `pass`, `skip` ou `no` deixam a categoria como está. Se ambas as listas estiverem vazias, diga que não há leads nem propostas de patrocínio.

A execução inicial termina no relatório, sem efeito remoto. Para preparar rascunhos solicitados depois, use o modelo aprovado. Em leads, escreva uma nova mensagem ao prospect, com uma linha sobre objetivo ou desafio observado em `formAnswers` ou `researchNote`, primeiro nome verificado e link de agendamento. Preserve os assuntos `Your project inquiry — next step` e `Your mentorship application — next step`. Para patrocínio, responda usando o `messageIdHeader` real e o link de mídia configurado. Se faltar algum identificador, modelo ou link, aponte o impedimento.

Entregue textos locais por padrão. A criação de rascunho no Gmail exige pedido específico e conector autenticado. Envio exige autorização própria. Informe apenas rascunhos criados ou preparados e as falhas por item.
