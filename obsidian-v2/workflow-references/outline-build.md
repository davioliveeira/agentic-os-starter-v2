---
name: outline-build
description: "Transforma uma abordagem de vídeo escolhida em um roteiro estrutural de YouTube, com gancho, promessa, três a cinco blocos, demonstração, chamada para ação e tempos. Use com /outline-build ou quando a pessoa pedir a estrutura do vídeo."
---

# Estruturar um vídeo

Receba uma abordagem de `angle-brainstorm`, uma premissa escrita pela pessoa ou uma URL. Leia todos os campos da abordagem, incluindo categoria, desejo e premissa. Quando vier em texto livre, infira categoria e desejo. Para URL, leia a fonte e identifique o que aconteceu e o que mudou. Use reação a notícia como categoria inicial para uma notícia recente, salvo indicação diferente.

Se o tema estiver aberto demais, faça uma pergunta sobre o que será demonstrado e o que quem assiste ganha no fim. Se precisar avançar, assuma um tutorial de 12 minutos voltado a domínio do assunto e registre essa escolha. Respeite duração, categoria, exemplos e demonstrações solicitados. Se a pessoa dispensar a chamada para ação ou notas visuais, omita apenas os itens dispensados.

## Duração e retenção

| Formato | Duração sugerida | Blocos de conteúdo |
|---|---:|---:|
| Reação a notícia | 6–10 min | 3 |
| Tutorial | 10–15 min | 4–5 |
| História ou bastidores | 8–12 min | 3–4 |
| Explicação, contraposição ou previsão | 10–15 min | 3–5 |
| Lista | 8–15 min | 3–5, agrupando dois ou três itens por bloco |

Apresente em até 60 segundos o motivo para continuar assistindo. Abra nos primeiros 90 segundos uma pergunta ou promessa que o vídeo realmente feche. Marque a abertura e o fechamento. Planeje retomadas de interesse e mudanças visuais ou sonoras a cada dois ou três minutos, especialmente perto de 30% e 60%. Indique demonstrações, cortes e gravações de tela.

Para notícias recentes, mostre o que mudou e o que fazer já no primeiro ou segundo bloco. Use de 20 a 30 segundos para a motivação e deixe contexto para depois da descoberta. Para temas duradouros, desenvolva a jornada até uma demonstração concreta. Coloque a chamada para ação após a entrega e vincule a um próximo passo.

Divida a duração em etapas e arredonde cada estimativa para múltiplos de 30 segundos quando fizer sentido. Como referência, reserve 15 a 30 segundos para gancho, 30 a 60 segundos para motivação, 60% a 75% para o desenvolvimento, 1 a 2 minutos para demonstração e 20 a 45 segundos para chamada. Some as partes e ajuste ao tempo pedido. Consolide blocos em vídeos curtos. Se a ideia perder contexto importante em quatro minutos, proponha um recorte ou seis a sete minutos.

## Formato

Mantenha os campos que `yt-hooks` e `yt-titles` recebem. Escreva o conteúdo em português brasileiro.

```markdown
# Outline: [título de trabalho de 5 a 10 palavras]

> _Angle bucket: [categoria]_
> _Dominant desire: [desejo]_
> _Target runtime: [duração]_
> _Bucket override (if any): [mudança solicitada, se houver]_

## Hook seed (1-2 sentences — yt-hooks will finalize)
[Uma ou duas frases com promessa ou pergunta concreta.]

**Open loop to close later:** [Pergunta que será respondida no desenvolvimento.]

## Stakes / why-watch (0:30-1:00)
[De duas a quatro frases sobre o que quem assiste poderá fazer, entender ou decidir.]

## Body

### Beat 1 — [ação deste bloco]
- **Purpose:** [como o bloco prepara, mantém ou entrega a promessa]
- **Runtime:** [intervalo aproximado]
- **Content:**
  - [ação concreta com exemplo, passo ou demonstração]
  - [segundo ponto concreto]
- **Re-hook / open-loop:** [retomada ou fechamento, quando aplicável]
- **B-roll / visual notes:** [o que aparece e que mudança de ritmo usar]

[Repita para os demais blocos, com dois a quatro pontos concretos cada.]

## Payoff / demonstration (1:00-2:00)
[Mostre o artefato em funcionamento, a comparação ou a resolução da história.]
- **What the viewer sees:** [visual específico]
- **What the viewer feels:** [ganho ligado ao desejo dominante]

## CTA (0:20-0:45)
[Próximo vídeo, pergunta concreta para comentários ou link de recurso existente.]

## Runtime summary
| Section | Runtime |
|---|---|
| [etapa] | [estimativa] |
| **Total** | **[soma]** |

## Retention scaffolding (summary)
- **Open loop opened in:** [trecho]
- **Open loop closed in:** [bloco ou demonstração]
- **Re-hooks placed at:** [blocos]
- **Pattern interrupts at:** [tempos aproximados]
```

Entregue a estrutura com três a cinco blocos e passos concretos. Deixe o texto definitivo do script, da abertura e dos títulos para a etapa seguinte. Em uma comparação de configurações, por exemplo, mostre o arquivo ou a opção que muda e o efeito observado na mesma tarefa. Em uma notícia, mostre o efeito prático antes de dedicar tempo ao contexto.
