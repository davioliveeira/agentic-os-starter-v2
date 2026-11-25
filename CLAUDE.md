# Agentic OS V2 — instruções para o agente de código

Ajude a pessoa a configurar ou melhorar o sistema sem exigir que ela conheça a estrutura de pastas. Identifique a intenção primeiro. Se ela já fez uma escolha, siga em frente sem perguntar de novo.

- **Primeira instalação.** Leia `setup/PLAYBOOK.md` e siga as fases. A pessoa pode usar um cofre do Obsidian que já existe para instalar o Agentic OS pela primeira vez.
- **Atualização do Agentic OS.** Leia `setup/UPGRADE.md` primeiro. Rode `node aos.mjs upgrade` para localizar instalações e cofres sem fazer alterações. Isso vale para V1, versões anteriores do V2 e sistemas personalizados.
- **Pedido de configuração ambíguo.** Faça uma pergunta direta. “Você quer instalar o Agentic OS pela primeira vez ou atualizar uma versão que já usa?” São as duas opções de configuração inicial. A escolha de recursos específicos vem durante a conversa sobre a atualização.
- **Pedido de reparo** (“parou de funcionar”, “rode o diagnóstico”). Repare a instalação em questão sem reinstalar. Se houver dúvida sobre qual é, use primeiro a descoberta de instalações do processo de atualização. Depois que a pessoa escolher o reparo, siga a Fase 6 de `setup/PLAYBOOK.md` para a instalação identificada. Explique que `--full` executa um fluxo real.
- **Alteração pontual após a instalação** (“configure a voz ao vivo”, “atualize minha seção Sobre mim”, “adicione minha nota de metas à voz ao vivo”, “mude meus botões”, “instale uma skill”, “rode Planejar hoje toda manhã”). Pule a instalação e siga o item correspondente da Fase 7 de `setup/PLAYBOOK.md`.

O arquivo `obsidian-v2/.runtime/aos-setup.json` registra uma instalação anterior. Use-o como evidência e siga o processo de atualização se a pessoa o pediu explicitamente. Se um pedido de primeira instalação apontar para um sistema já instalado, explique o que encontrou e confirme o destino antes de rodar a instalação de novo.

## Regras obrigatórias

- Nunca peça chaves ou senhas no chat. Nunca leia, exiba ou copie `jev.json`, `openai.json`, `bridge-auth.json`, `providers.json`, `.credentials.json` ou `~/.claude/.env`. A pessoa digita a chave da OpenRouter na página local aberta por `node aos.mjs jev-key` e a chave da OpenAI para a voz ao vivo na página aberta por `node aos.mjs openai-key`.
- Nunca sobrescreva notas existentes nem substitua as configurações `.obsidian/` de um cofre existente. Nunca faça cópias de segurança do cofre inteiro, copie pastas de execução ou de credenciais nem faça commits que incluam grande parte do cofre.
- A descoberta é somente para leitura. Pule `fetch`, `pull`, instalação, verificação de saúde e qualquer tentativa de parar ou reiniciar um serviço. Os metadados de localização de um monitor ativo, sem dados secretos, ajudam a identificar a instalação. A saúde do sistema exige verificação própria.
- Mantenha o código da distribuição padrão como um conjunto publicado. Preserve `obsidian-v2/` e `jarvis-v2/` durante a instalação e o reparo. A exceção é um plano de integração personalizada aprovado pela pessoa, conforme `setup/UPGRADE.md`, aplicado no projeto dela com cópias de segurança restritas, testes e procedimento de reversão. Esses projetos exigem integrações futuras manuais até que sejam compatibilizados com a distribuição mantida.
- Use `update` em uma cópia reconhecida e sem alterações da distribuição padrão. O comando recusa código personalizado ou desconhecido antes de parar os serviços. Preserve essa proteção e as alterações para evitar forçar uma atualização.
- Peça aprovação para o plano concreto de atualização antes de aplicá-lo. Obtenha permissão explícita para a troca de serviços antes de parar ou reiniciar uma instalação em execução. Use os scripts da própria instalação e deixe os serviços de voz e as tarefas de recuperação não relacionados como estão.
- Os serviços são apenas locais (`127.0.0.1`, portas 3217–3221). Mantenha-os restritos ao computador. Só uma instalação pode usar essas portas de cada vez.

Comandos disponíveis

`node aos.mjs setup | upgrade | start | stop | status | doctor [--full] | jev-key | openai-key | autostart on|off | update | dashboard | skills | voice | schedule | about | live-context`.

`upgrade` inspeciona o que existe em modo somente leitura. `update` atualiza uma cópia da distribuição padrão. Siga o guia correspondente.
