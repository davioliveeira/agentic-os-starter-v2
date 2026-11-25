---
name: angle-brainstorm
description: "Gera de 8 a 12 abordagens distintas para um vídeo no YouTube, a partir de URL, manchete, tema ou pauta de ai-trend-scan. Use com /angle-brainstorm ou quando a pessoa procurar maneiras de cobrir um assunto."
---

# Gerar abordagens para um vídeo

Use uma URL, uma manchete, uma frase ou um item escolhido em `ai-trend-scan`. Para URL, leia a fonte antes de propor ideias. Identifique o acontecimento, os envolvidos, a interpretação mais comum e o que mudou. Para item da varredura, use a justificativa de relevância. Se faltar o recorte, faça uma pergunta específica e avance com uma suposição explícita quando necessário.

Gere de 8 a 12 propostas por padrão. Aceite quantidades menores ou até 20 quando solicitado. Respeite filtros de abordagens e público. O público padrão acompanha Claude Code e IA aplicada a agentes no YouTube.

## Abordagens

Atribua exatamente uma categoria a cada proposta:

| Categoria | Como usar |
|---|---|
| `contrarian` | Contraponha a interpretação dominante com um argumento verificável. |
| `how-to` | Mostre passos concretos para chegar a um resultado. |
| `story` | Estruture começo, mudança e desfecho em uma experiência real. |
| `listicle` | Reúna itens específicos em uma lista numerada. |
| `news-reaction` | Explique o que aconteceu e suas consequências agora. |
| `explainer` | Ensine o conceito que continua relevante após a notícia. |
| `behind-the-scenes` | Mostre bastidores, configuração, processo ou falhas reais. |
| `prediction` | Proponha uma consequência em 6 ou 12 meses e explique a hipótese. |

Escolha um desejo dominante por abordagem: `mastery` (domínio), `FOMO` (medo de ficar para trás), `status` (reconhecimento), `curiosity` (curiosidade), `fear` (prevenção), `aspiration` (aspiração) ou `belonging` (pertencimento). Ajuste a ordenação ao público. Aprendizado costuma funcionar para tutoriais. Curiosidade pode ter mais peso num post curto.

## Seleção

1. Esboce uma ideia por categoria que o assunto sustentar.
2. Acrescente de duas a quatro ideias nas categorias mais promissoras, com premissas que tenham resultados distintos. Duas reações a uma notícia podem funcionar quando defendem interpretações diferentes.
3. Remova ideias fracas, duplicadas ou que repitam algo que a pessoa já publicou. Se duas propostas compartilham categoria, desejo e formato, escolha a mais forte.
4. Para notícias, mantenha pelo menos uma contraposição, um tutorial e uma previsão. Para outros temas, procure cobrir ao menos cinco categorias. Evite inventar uma história ou preencher a lista com propostas parecidas.
5. Depois de 48 a 72 horas, trate a reação imediata como menos prioritária. Dê mais peso a tutoriais e explicações depois de 72 horas. Se a entrada já contiver uma abordagem escolhida, confirme e encaminhe para `outline-build` ou gere alternativas quando solicitado.

## Formato

Use as etiquetas abaixo para a passagem ao próximo fluxo. Escreva as propostas e justificativas em português brasileiro, em ordem de força.

```markdown
# Angles for: [tema em uma linha]

_Seed type: [URL, manchete, item da varredura ou frase]. [Resumo da fonte quando houver URL.]_

## 1. [Título provisório de 5 a 10 palavras]

- **Bucket:** [identificador da abordagem]
- **Desire:** [identificador do desejo dominante]
- **Why this lands:** [em uma frase, por que alguém desse público assistiria]
- **Premise:** [duas ou três frases com o que será mostrado, o ganho de quem assiste e o desfecho]

[Repita um bloco por proposta.]

## Recommended pick

**[Número e título da primeira proposta que você gravaria.]** [Motivo em uma frase.]
```

Use um título de trabalho que ajude a escolher. Deixe abertura final, testes de título e texto de miniatura para `yt-hooks` e `yt-titles`. Passe a proposta escolhida para `outline-build`.

## Exemplos de premissas

- Novidade de subagentes, contraposição: compare o mesmo fluxo de escrita, edição e publicação com e sem um orquestrador. Mostre o que simplifica e em qual etapa a coordenação continua necessária.
- Novidade de subagentes, tutorial: construa um fluxo de cinco agentes e deixe a pessoa com uma configuração que consegue adaptar.
- Novidade de subagentes, previsão: explique como o trabalho de uma pessoa criadora pode mudar em 12 meses. Ligue cada hipótese ao que o recurso realmente faz hoje.
