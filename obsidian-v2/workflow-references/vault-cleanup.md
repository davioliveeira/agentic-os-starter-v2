# Revisão de arquivos do cofre

Inspecione os arquivos e devolva uma proposta completa para revisão. Durante esta etapa, preserve todos os arquivos, inclusive temporários. A ponte grava o relatório final.

## O que inspecionar

Considere arquivos em `projects/`, `inbox/`, `content/blog/`, `content/linkedin/` e `content/twitter/` cuja modificação real seja anterior a sete dias. Use metadados do sistema de arquivos. Exclua wiki, pessoas, notas diárias, sistema, `.obsidian/`, pastas ocultas, `demo-assets/`, árvores arquivadas, coleções de relatórios, índices, scripts e projetos ativos, em andamento ou bloqueados. Para capturas de tendências do GitHub, use 14 dias e preserve a mais recente. Arquivos de configuração e scripts `.py` e `.ps1` ficam fora.

Proponha `archive/` sob a mesma pasta elegível e mantenha o nome do arquivo. Resolva origem e destino no cofre, inclusive links simbólicos e junções. Exclua caminhos externos e colisões.

Um link `[[nome]]` que aponta para um nome de arquivo único pode continuar válido após a mudança. Confira destinos reais para links com caminho, links Markdown relativos, nomes duplicados, aliases, seções e anexos. Registre ambiguidades concretas. A atualização automática depende da configuração e do modo como o Obsidian move os arquivos. Consulte [links internos](https://obsidian.md/help/links) e [configurações](https://obsidian.md/help/settings).

Agrupe notas `.md` com arquivos `.excalidraw`, `.png` e outros anexos associados. Indique anexos ausentes ou ambíguos.

## Temporários para revisão separada

Em `content/temp/`, procure artefatos reais de produção, como JSON intermediário, legendas VTT e transcrições brutas. Use **Arquivos temporários candidatos à exclusão** com ID, caminho exato, tipo, modificação, tamanho e motivo. Liste casos incertos em **Revisão necessária**. O limite de idade do arquivamento não é autorização de exclusão. A proposta inicial apenas lista os temporários. Uma ação posterior exige selecionar IDs de `content/temp/` explicitamente e verificar de novo caminho, conteúdo e metadados. Uma seleção para arquivar autoriza apenas mover os itens selecionados.

## Entrega

Use `# Proposta de limpeza do cofre`. Informe quando a inspeção ocorreu, limites, quantidade de candidatos e a tabela `ID | Origem | Destino proposto | Última modificação | Idade | Tamanho em bytes | Motivo | Links e anexos`. Use caminhos relativos ao cofre e metadados exatos. Para itens ambíguos, um hash pode ajudar na revalidação. Inclua **Arquivos ignorados e motivos** e **Revisão necessária**. Registre que a inspeção preservou as origens.

Encerre após entregar a proposta. Uma solicitação posterior pode selecionar IDs para mover. Antes de aplicar, releia a origem e seus metadados, resolva ambos os caminhos novamente, confira links e confirme que o destino está livre. Se algo mudar ou continuar ambíguo, apresente a proposta revisada. Preserve qualquer destino existente. Exclua somente temporários selecionados explicitamente e revalidados.
