# Integrações no Jarvis e importação automática do Wispr Flow

A página **Configurações → Integrações** reúne as conexões que o cliente já usa no Claude Code e no Codex e as integrações configuradas no Agentic OS. O primeiro caso de uso é salvar as transcrições do Wispr Flow automaticamente no cofre, para que o Jarvis consiga responder com base nelas.

## Página de integrações

- Listar os servidores MCP que cada aplicativo expõe, usando o cofre como diretório de trabalho para respeitar o escopo do projeto. Mostrar a origem, o estado informado pelo aplicativo e o escopo quando disponível.
- Encaminhar as ações disponíveis aos comandos oficiais, mantendo as aprovações e a autenticação do provedor. Para conexões gerenciadas pela conta ou pela organização, indicar onde administrá-las.
- No cartão do Wispr Flow, permitir selecionar a conexão do Claude Code ou do Codex, testar o acesso, ativar ou pausar a importação, sincronizar agora e ver o último resultado. Guardar a preferência fora do histórico de conversas.

## Importação automática

- Uma vez ativada, a ponte local busca novas reuniões próprias finalizadas com transcrição. A proposta para a primeira versão é verificar a cada 15 minutos enquanto o Agentic OS estiver rodando e recuperar reuniões elegíveis que ficaram pendentes enquanto estava desligado. A ativação define o início da janela. O histórico e as reuniões compartilhadas ficam fora da importação inicial.
- Reaproveitar a autorização da conexão selecionada, respeitando as permissões do provedor. Se a conexão não estiver disponível ao processo em segundo plano, mostrar o erro no cartão e preservar o progresso. A alternativa nesse caso é uma conexão MCP própria do Agentic OS via OAuth no navegador.
- Buscar todos os trechos da transcrição antes de gravar. Criar uma nota por identificador estável em `inbox/reunioes/wispr/`, com título, data, origem e falas. Concluir a gravação antes de marcar a reunião como importada. Repetições preservam as notas existentes e nunca avançam sobre páginas que falharam. Pausar ou desconectar interrompe novas importações e mantém as notas já gravadas.
- Tratar transcrições como dados de consulta. O processo de gravação controla os caminhos de destino. O sistema registra contagens e erros sem reproduzir texto de reunião ou credenciais no painel de status.

## Alternativas consideradas

A importação manual permite escolher cada call e tem menos dependências, mas exige uma ação a cada reunião. A integração com o MCP próprio do Jarvis pode dar mais controle ao processo em segundo plano, mas requer uma autorização adicional. A primeira implementação prioriza importar automaticamente usando a conexão que o cliente já tem, com teste explícito de acesso em segundo plano.

## Critérios de aceitação

- A página mostra separadamente as conexões disponíveis pelo Claude Code e pelo Codex.
- Um teste controlado cobre transcript paginado, repetição sem duplicatas, falhas recuperáveis e pausa da sincronização.
- No `second-brain`, confirmar uma importação pelo Wispr Flow e perguntar ao Jarvis por um fato verificável da call, com a resposta apontando para a nota local.
