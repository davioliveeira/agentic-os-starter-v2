# Formato do glossário do projeto

`CONTEXT.md` é o glossário do projeto. Registre os termos escolhidos, com uma definição por termo. Mantenha detalhes de implementação, especificações e anotações de trabalho nos respectivos documentos.

## Estrutura

```md
# {Nome do projeto ou contexto}

{Uma frase que delimite este contexto.}

## Termos

**Acordo**
Compromisso negociado com um patrocinador que inclui suas entregas.
Evite: "campanha", "contrato", "ação"

**Marco**
Etapa de pagamento de um acordo, definida por valor e vencimento.
Evite: "fatura", "parcela"
```

## Regras

- Adote um termo oficial por conceito e liste os sinônimos descartados na linha `Evite:`.
- Escreva uma ou duas frases para definir o conceito. Registre descrições de comportamento no código ou no plano.
- Inclua apenas termos do domínio. Termos de programação reconhecíveis em qualquer projeto, como retry, handler e cache, ficam fora do glossário.
- Mantenha uma lista simples. Use subtítulos quando surgirem grupos que façam sentido.
- Crie o arquivo quando o primeiro termo estiver definido.

## Repositórios com mais de um domínio

Quando um repositório reúne vocabulários de contextos distintos, como pedidos e faturamento, crie `CONTEXT-MAP.md` na raiz. Liste cada contexto, sua pasta e como ele se comunica com os demais, incluindo os eventos que consome e os identificadores compartilhados. Cada contexto mantém seu próprio `CONTEXT.md` em sua pasta.

Ao executar a skill, procure primeiro `CONTEXT-MAP.md` para identificar o contexto do trabalho. Pergunte se houver ambiguidade. Se houver apenas `CONTEXT.md` na raiz, use-o como contexto único. Se ambos estiverem ausentes, crie `CONTEXT.md` na raiz quando surgir o primeiro termo.
