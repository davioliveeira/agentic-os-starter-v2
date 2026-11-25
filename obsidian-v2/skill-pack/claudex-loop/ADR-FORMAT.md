# Formato do registro de decisão arquitetural

Os registros de decisões arquiteturais (ADRs) ficam em `docs/adr/`, com numeração sequencial (`0001-slug.md` e assim por diante). Crie o diretório ao escrever o primeiro ADR. Para escolher o próximo número, procure o maior número existente.

## Modelo

```md
# {Decisão, formulada como um fato}

{Um parágrafo curto com a situação, a decisão e seu motivo.}
```

Um parágrafo já é um ADR completo. Registre o suficiente para que uma pessoa entenda que a decisão foi deliberada e por que ela foi tomada.

Acrescente seções conforme a necessidade:

- Campo `status:` no cabeçalho YAML (`proposed`, `accepted`, `deprecated` ou `superseded-by: 0007`) quando a equipe revisitar decisões.
- **Alternativas** quando for provável que alguém volte a propor as opções descartadas.
- **Consequências** quando houver um efeito posterior que possa passar despercebido.

## Três critérios para propor um ADR

1. **Reverter custa caro.** Escolhas fáceis de desfazer dispensam registro.
2. **Uma pessoa que chegue depois teria dúvidas.** Se o próprio código deixa a escolha evidente, o registro é redundante.
3. **A escolha exigiu considerar vantagens e desvantagens reais.** Registre o raciocínio que levou à decisão.

## Decisões que costumam atender aos critérios

- Compromissos estruturais, como a organização do repositório, a escolha entre event sourcing e CRUD ou entre monólito e serviços.
- Comunicação entre contextos, como eventos ou chamadas síncronas, quem é responsável por cada dado e quais dados são referenciados apenas por identificador.
- Tecnologias difíceis de substituir, como banco de dados, fila e provedor de autenticação. Reserve o registro para escolhas que levariam meses para ser trocadas.
- Desvios deliberados do caminho que outra pessoa da equipe esperaria. Explique a escolha para evitar que ela seja desfeita por engano.
- Restrições invisíveis no código, como limites de conformidade, SLAs de parceiros e restrições de hardware.
- Alternativas descartadas por um motivo pouco óbvio. Registre por que perderam para quando a ideia voltar a surgir.
