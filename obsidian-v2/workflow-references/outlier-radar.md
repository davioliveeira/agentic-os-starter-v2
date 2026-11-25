# Radar de vídeos em destaque em canais pequenos

Use a lista de canais configurada e os relatórios anteriores quando disponíveis. Consulte a conexão autenticada de metadados do YouTube ou a API configurada. Este relatório preserva listas monitoradas e registros de itens já vistos.

## Critérios e referência do canal

Considere publicações sobre IA ou criação de agentes dos últimos sete dias. Inclua canais com 200 a 100 mil inscritos e vídeos com pelo menos 500 visualizações. Exclua transmissões ao vivo e vídeos de até 180 segundos. Preserve as contagens de inscritos como retornadas. Busque canais diversos e use até 75 entradas da lista configurada. Consulte até 30 dias de relatórios anteriores para marcar itens já vistos.

Para cada candidato, use até 50 publicações recentes comparáveis do canal, excluindo o próprio candidato, lives e vídeos curtos. Reaproveite metadados verificáveis de até 24 horas. Calcule o multiplicador principal como visualizações acumuladas do candidato divididas pela mediana das visualizações acumuladas da amostra. Considere destaque principal a partir de 1,5×. Informe o tamanho da amostra e marque como inconclusiva uma referência ausente, insuficiente ou igual a zero.

Vídeos com menos de 48 horas podem ser sinalizados cedo se atingirem 10× a velocidade relativa de visualizações por hora. Registre isso como indicador secundário. Visualizações por inscrito medem outra coisa e devem ficar fora desse cálculo.

## Entrega

Gere um relatório datado com título e link, canal, inscritos, publicação, idade, duração, visualizações, multiplicador acumulado, velocidade inicial opcional, tamanho da amostra e método de descoberta. Para que o cartão do Obsidian reconheça cada destaque, use uma linha neste formato:

```markdown
- **[Título do vídeo](URL)** — **12,3×** | 55,9 mil visualizações em 2,4 dias | [Canal](URL) (53,8 mil inscritos) | via busca "consulta"
```

Use `via lista monitorada (nome)` para vídeos descobertos na lista configurada. Quando houver velocidade inicial, acrescente `(vel. 31,5×)` depois do multiplicador acumulado. Inclua data de publicação, duração e tamanho da amostra em uma sublista.

Diferencie destaques, sinais iniciais e itens já vistos. Explique o que o tema sugere e separe hipótese de causa comprovada. Informe consultas usadas, limites de cota, acesso ausente, idade dos dados e confiança. Use “nenhum destaque novo” somente quando a busca tiver sido concluída. A ponte grava o relatório completo.
