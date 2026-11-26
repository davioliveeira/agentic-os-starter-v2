# Plano de implementação das integrações e do Wispr Flow

> Para execução por agentes, use Superpowers Executing Plans ou Subagent-Driven Development.

**Objetivo**
Importar automaticamente novas calls do Wispr Flow e administrar as conexões dos agentes no Jarvis.

**Arquitetura**
A ponte local lista e administra as conexões por meio dos CLIs oficiais. O importador recebe resultados estruturados de leitura do MCP, trata paginação e grava notas Markdown no cofre. O Jarvis usa as rotas autenticadas existentes da ponte para controlar o importador.

- [ ] Implementar `runner/wispr-sync.mjs` e testar paginação, deduplicação, retomada, pausa e gravação.
- [ ] Implementar transporte e inventário de MCP pelos CLIs em `runner/integrations.mjs`, com saída filtrada e testes dos contratos nativos.
- [ ] Ligar a sincronização à ponte e criar a página `/configuracoes/integracoes` no Jarvis.
- [ ] Compilar e testar em cofre isolado, atualizar o fork e verificar a importação real e a consulta pelo Jarvis no second-brain.
