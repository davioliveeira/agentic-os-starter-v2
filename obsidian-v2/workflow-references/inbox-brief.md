# Resumo da caixa de entrada

Esta execução prepara um relatório de triagem por leitura. Preserve mensagens, rótulos, modelos e configuração.

## Leitura

Use a conexão autenticada de leitura e pesquisa do Gmail do provedor selecionado. Por padrão, leia as últimas 24 horas, com páginas de 50 e limite de 100 conversas. Informe cortes. Para cada fio, registre assunto, remetente, data, prévia, IDs da mensagem e da conversa, estado de leitura e presença de `SENT`. Abra o fio inteiro quando a classificação ou identificação do lead exigir. Confirme respostas anteriores por evidência.

Aplique a configuração explícita ou `system/workflow-config/inbox-brief.json` para exclusões, assinaturas de formulários, janela, modelos e links. Preserve o arquivo. Na ausência de configuração, use os padrões e indique quando o remetente não pôde ser validado.

## Uma categoria por conversa, da mais recente à mais antiga

1. **Leads** primeiro. Siga as assinaturas de formulários, inclusive os prefixos `New Agency Inquiry` e `New Mentorship Application`, e as restrições de remetente. Identifique o lead no corpo.
2. **Urgent** para assinaturas, prazos, avisos de segurança, mudanças de link de afiliado ou ações explícitas de agenda. Informe ação e data.
3. **Warm threads** para parceiros ou fios já respondidos que aguardam decisão.
4. **Sponsor pitches** para primeiro contato com marca identificada e pedido explícito de parceria paga, vídeo patrocinado ou integração. Exclua testes grátis, ofertas vagas, newsletters, coaching e disparos em massa. Fios já respondidos entram em **Warm threads**.
5. **Meetings** para avisos e acompanhamentos de reuniões.
6. **Noise** para o restante. Informe a contagem.

Quando houver dúvida, escolha a categoria menos exigente e explique ambiguidades importantes.

## Qualificar os leads

Extraia nome, e-mail e respostas. Para agência: Website, Services, Timeline, Budget e Challenge. Para mentoria: Situation, Timeline e Biggest Challenge. Faça até duas verificações públicas de leitura por lead usando nome e domínio ou nome e empresa informada para e-mail gratuito. Use `(no web check)` quando faltar acesso.

- Agência: faixa de 5 mil a 15 mil ou maior favorece avançar. Abaixo de 5 mil, confirme empresa ou domínio e desafio concreto. Pedidos vagos ou de uso pessoal tendem a `PASS`.
- Mentoria: papel ou empresa verificável, desafio específico e prontidão favorecem `PURSUE`. Spam, sinais de falta de orçamento e respostas genéricas tendem a `PASS`.
- Casos incertos recebem `PURSUE?` para revisão. Mantenha todos os leads visíveis.

## Entrega

Use `date`, `skill: inbox-brief` e `tags: [inbox, brief]`. Preserve a abertura `Inbox brief: N messages in the last Xh, Y unread.` e as seções Leads, Urgent, Warm threads pressing for reply, New sponsor pitches, Meetings e Noise count para a leitura do painel. Numere leads e propostas separadamente. Para cada lead, inclua fonte, dado confirmado ou resposta-chave, classificação e razão. Em patrocínios, inclua marca, plataforma e orçamento informado. Guarde os identificadores necessários para revisão posterior.

Termine com ações propostas e totais de leads e propostas que merecem resposta. Um pedido posterior de rascunhos deve especificar os itens. Resolva destinatário, modelo aprovado e links de agendamento ou mídia. Para leads, o destinatário vem do corpo do formulário. Para patrocinadores, use o identificador da mensagem mais recente. O pedido de rascunhos autoriza apenas prepará-los.

Personalize uma linha com o desafio ou objetivo verificado. Substitua apenas o `firstName` observado e o link de agendamento configurado. Preserve os assuntos `Your project inquiry — next step` e `Your mentorship application — next step` onde esses modelos forem usados. Para patrocinadores, preserve o modelo, link de mídia e ID reais. Quando o relatório integrar o boletim combinado, mantenha as listas numeradas `SPONSOR_PITCHES` e `LEADS` para seleção posterior.
