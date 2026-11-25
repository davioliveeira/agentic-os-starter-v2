// Lightweight instructions shared by worker launch and synchronous prompt hooks.
// Keep this module free of speech formatters and model/runtime dependencies.
export const ARTIFACT_HANDOFF_INSTRUCTIONS = 'Disponibilizar o resultado no painel: Ao criar uma imagem, um PDF, um documento Markdown ou um arquivo de texto local, registre apenas o resultado final com o auxiliar do painel. Quando a pessoa pedir para abrir ou mostrar um resultado, use a opção --open, inclusive para resultados anteriores. Reutilize o arquivo conhecido em pedidos de continuação. Use o comando fornecido para este pedido. As ferramentas do agente podem não herdar as variáveis de ambiente do terminal. Omita --open quando a pessoa pedir apenas para salvar um resultado não visual. Registre o arquivo original gerado pela ferramenta de imagem mesmo se ela indicar que já exibiu a imagem. A exibição no terminal é independente do painel da pessoa. Não afirme que o arquivo já abriu ou foi exibido. O painel confirma a abertura. Informe o que foi produzido e inclua um link local para o arquivo nos detalhes escritos quando o formato solicitado permitir. Use o auxiliar somente para disponibilizar o resultado, sem chamadas adicionais a modelos ou reescrita da fala. O Obsidian e o painel não exibem HTML, SVG nem outros arquivos da web. Use PNG, JPEG, WebP, GIF ou PDF para visuais e Markdown ou texto para conteúdo escrito.';
export function artifactHandoffInstructions({node,helper,events,taskId,requestKey,provider,platform=process.platform}={}){
 if(!node||!helper||!events||!/^[a-f0-9-]{36}$/.test(taskId||'')||!/^[a-f0-9-]{36}$/.test(requestKey||''))return ARTIFACT_HANDOFF_INSTRUCTIONS;
 // Claude's Windows Bash tool uses Git Bash; Codex uses PowerShell.
 const powershell=platform==='win32'&&provider!=='claude';
 const quote=value=>powershell?`'${String(value).replaceAll("'","''")}'`:`'${String(value).replaceAll("'",`'"'"'`)}'`;
 // Git Bash needs a slash-separated executable path. The remaining arguments
 // are literal Windows paths consumed by Node, so preserve them verbatim.
 const executable=platform==='win32'&&!powershell?String(node).replaceAll('\\','/'):node;
 const args=[executable,helper,'<arquivo local gerado>','--outbox',events,'--task',taskId,'--request',requestKey,'--open','--label','<título curto>'];
 return `${ARTIFACT_HANDOFF_INSTRUCTIONS}\nComando deste pedido (${powershell?'PowerShell':'Bash'}):\n${powershell?'& ':''}${args.map(quote).join(' ')}\nSubstitua apenas os marcadores do arquivo e do título. Use os identificadores deste pedido em vez dos de um comando anterior.`;
}
