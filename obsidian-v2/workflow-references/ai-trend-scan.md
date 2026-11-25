# Tendências de IA para pautas de conteúdo

## Coletar evidências

Use a lista de fontes configurada, se existir. Caso contrário, cubra Claude/Anthropic, Codex/OpenAI, Gemini/Google e modelos abertos. Aplique preferências da conversa só nesta execução. Consulte YouTube e X em paralelo se possível, em geral nas últimas 24 horas e com até cinco resultados por fonte. Verifique horários de publicação. Se a fonte só mostrar a data, indique a aproximação.

Fontes padrão do YouTube: AI Explained, Matthew Berman, David Ondrej, Yannic Kilcher e Wes Roth. Consultas padrão: Claude Code, Codex, Anthropic, Claude 4.7 e notícias de agentes de IA. No X, use @AnthropicAI, @alexalbert__, @simonw, @karpathy e @swyx, além de Claude Code, Codex e Anthropic como temas. Trate nomes de modelos como termos de busca. Configurações e pedidos explícitos têm prioridade.

Busque em `site:x.com` e `site:twitter.com` com termo e data de hoje. Verifique o conteúdo dos posts, datas e contadores. Para YouTube com apenas `upload_date`, admita a tolerância de 12 horas para granularidade diária. Marque a idade aproximada e a tolerância usada. Use horário exato apenas onde houver evidência.

Registre plataforma, título ou assunto, criador, URL, publicação verificada, contadores e relevância em uma frase. Marque contadores ausentes como desconhecidos. Se uma fonte falhar, entregue o que estiver disponível e informe a falha. Use `BLOCKED:` se ambas falharem.

## Classificar, agrupar e eliminar duplicatas

No YouTube, velocidade = visualizações / máx(idade em horas, 1). No X, velocidade = (curtidas + republicações) / máx(idade em horas, 1). Quando houver dados, aplique os pisos de 100 visualizações por hora no YouTube e 50 interações por hora no X. Classifique primeiro dentro de cada plataforma e explique a ordenação editorial conjunta.

Elimine URLs repetidas e títulos quase idênticos, com limiar de similaridade de 0,78 quando usado. Prefira a fonte primária mais forte e mantenha links corroborantes. Agrupe por Claude, OpenAI, Google, modelos abertos e locais, agentes e ferramentas, e outros. Omita grupos vazios.

## Entrega

Use `# Tendências de IA para pautas de conteúdo`. Liste até 15 ideias com plataforma, título ou assunto com link, criador, engajamento medido, idade e sua precisão, velocidade calculável e motivo da relevância. Informe a cobertura e o estado das fontes. Entregue pautas brutas. Preserve a configuração existente.
