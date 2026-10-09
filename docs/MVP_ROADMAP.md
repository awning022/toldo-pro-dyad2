# Toldo Pro — prioridades do MVP

## Objetivo
Resolver as dores diárias de uma empresa de toldos: medir corretamente, orçar sem esquecer custos, acompanhar a execução e não perder oportunidades comerciais.

## Prioridade 0 — Confiabilidade antes de novos recursos
- [ ] Revisar se todas as telas operacionais usam registros do Supabase vinculados a `company_id`, sem dados de demonstração aparecendo como reais.
- [ ] Confirmar persistência, tratamento de falha ao salvar e prevenção de alterações duplicadas.
- [ ] Testar isolamento entre empresas e permissões no servidor/RLS.
- [ ] Validar o fluxo cliente → orçamento → ordem de serviço → produção → instalação → conclusão.
- [ ] Testar build, lint e os fluxos essenciais antes de publicar.

## Prioridade 1 — Diferenciais úteis para toldarias
### 1. Ficha de visita técnica e medição
- Registrar endereço, tipo de instalação, largura, projeção/altura, tipo de parede ou estrutura, acesso, observações e fotos.
- Checklist de itens que o medidor precisa conferir no local.
- Associar a visita ao cliente e reaproveitar as medidas na elaboração do orçamento.
- Não calcular materiais automaticamente até que as regras de cada tipo de toldo sejam configuradas e validadas.

### 2. Orçamento com custo e margem
- Separar materiais, mão de obra, deslocamento, instalação e outros custos.
- Mostrar custo estimado, valor de venda e margem para usuários autorizados.
- Alertar quando a margem estiver abaixo do mínimo definido pela empresa.
- Gerar uma proposta clara para o cliente, sem expor custos internos.

### 3. Acompanhamento de propostas pelo WhatsApp
- Gerar uma mensagem pronta com o nome do cliente e o status do orçamento.
- Atalhos para primeiro contato, envio de proposta e acompanhamento.
- Abrir o WhatsApp para o usuário revisar e enviar; não enviar mensagens automaticamente.
- Registrar a próxima data de retorno para reduzir orçamentos esquecidos.

### 4. Execução sem retrabalho
- Ao aprovar um orçamento, reaproveitar os dados para a ordem de serviço.
- Checklist de produção e instalação com fotos e observações.
- Registrar materiais usados e impedir saídas acima do saldo disponível.
- Marcar pendências e motivos de atraso.

### 5. Visão simples do dinheiro
- Exibir valores a receber, vencidos e recebidos com dados reais.
- Relacionar recebimentos ao cliente e à ordem de serviço quando aplicável.
- Não tratar orçamento aprovado como dinheiro recebido.

## Ordem recomendada de implementação
1. Auditoria e correções de persistência, dados de demonstração, permissões e isolamento.
2. Testes de ponta a ponta do fluxo comercial e operacional.
3. Ficha de visita técnica e medição.
4. Calculadora de custo e margem no orçamento.
5. Acompanhamento comercial com mensagens preparadas para WhatsApp.
6. Refinamento visual escuro/futurista e tutorial guiado.
7. Publicação somente após validação técnica e verificação de configuração do banco remoto.

## Critérios de aceite
- Nenhuma informação de exemplo aparece como registro real de uma empresa.
- Usuários de empresas diferentes não conseguem ler ou alterar registros uns dos outros.
- Erros de salvamento são mostrados; a interface não confirma sucesso quando o banco falha.
- O fluxo completo pode ser testado sem criar dados fictícios silenciosamente.
- Build e lint passam e os fluxos críticos têm testes automatizados.
