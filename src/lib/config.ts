import type { CollectionKey, ModuleConfig } from "./types";

export const MODULES: ModuleConfig[] = [
  {
    key: "companies",
    title: "Empresas",
    subtitle: "Cadastro da empresa, CNPJ, dados fiscais, horário e contato",
    primaryField: "nomeFantasia",
    badgeField: "status",
    fields: [
      { name: "cnpj", label: "CNPJ" },
      { name: "razaoSocial", label: "Razão social" },
      { name: "nomeFantasia", label: "Nome fantasia", required: true },
      { name: "phone", label: "Telefone" },
      { name: "whatsapp", label: "WhatsApp" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "city", label: "Cidade" },
      { name: "status", label: "Status", type: "select", options: ["Ativa", "Inativa"] },
      { name: "workingHours", label: "Horário de funcionamento" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "users",
    title: "Usuários",
    subtitle: "Criar, editar, ativar, vincular empresa e perfil",
    primaryField: "name",
    badgeField: "role",
    fields: [
      { name: "name", label: "Nome", required: true },
      { name: "email", label: "E-mail", type: "email" },
      { name: "role", label: "Perfil", type: "select", options: ["Administrador", "Gerente", "Vendedor", "Orçamentista", "Produção", "Instalador", "Financeiro", "Estoque", "Suporte"] },
      { name: "company", label: "Empresa" },
      { name: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] }
    ]
  },
  {
    key: "roles",
    title: "Perfis e permissões",
    subtitle: "Permissões individuais e perfis personalizados",
    primaryField: "name",
    fields: [
      { name: "name", label: "Perfil", required: true },
      { name: "permissions", label: "Permissões", type: "textarea" }
    ]
  },
  {
    key: "employees",
    title: "Funcionários",
    subtitle: "Cadastro, equipe, salário e status",
    primaryField: "name",
    badgeField: "role",
    fields: [
      { name: "name", label: "Nome", required: true },
      { name: "cpf", label: "CPF" },
      { name: "phone", label: "Telefone" },
      { name: "role", label: "Função" },
      { name: "salary", label: "Salário", type: "number" },
      { name: "team", label: "Equipe" },
      { name: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] }
    ]
  },
  {
    key: "timecards",
    title: "Ponto e jornada",
    subtitle: "Entrada, saída, intervalos e horas trabalhadas",
    primaryField: "employee",
    fields: [
      { name: "employee", label: "Funcionário", required: true },
      { name: "date", label: "Data", type: "date" },
      { name: "checkIn", label: "Entrada" },
      { name: "checkOut", label: "Saída" },
      { name: "break", label: "Intervalo" },
      { name: "workedHours", label: "Horas trabalhadas" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "clients",
    title: "CRM / Clientes",
    subtitle: "Cadastro, histórico e atendimento",
    primaryField: "name",
    badgeField: "status",
    fields: [
      { name: "type", label: "Tipo", type: "select", options: ["PF", "PJ"] },
      { name: "name", label: "Nome", required: true },
      { name: "cpfCnpj", label: "CPF/CNPJ" },
      { name: "phone", label: "Telefone" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "city", label: "Cidade" },
      { name: "status", label: "Status" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "leads",
    title: "Leads",
    subtitle: "Cadastro automático ou manual com origem e follow-up",
    primaryField: "client",
    badgeField: "status",
    fields: [
      { name: "origin", label: "Origem", type: "select", options: ["WhatsApp", "Instagram", "Facebook", "Google", "Site", "Indicação", "Loja física", "Marketplace", "Outros"] },
      { name: "client", label: "Cliente", required: true },
      { name: "product", label: "Produto desejado" },
      { name: "location", label: "Local" },
      { name: "estimatedValue", label: "Valor estimado", type: "number" },
      { name: "status", label: "Status" },
      { name: "followUp", label: "Follow-up", type: "date" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "funnel",
    title: "Funil de vendas",
    subtitle: "Etapas, responsável, valor e probabilidade",
    primaryField: "lead",
    badgeField: "stage",
    fields: [
      { name: "stage", label: "Etapa", type: "select", options: ["Novo lead", "Contato", "Visita", "Medição", "Orçamento", "Negociação", "Fechado", "Perdido"] },
      { name: "lead", label: "Lead", required: true },
      { name: "responsible", label: "Responsável" },
      { name: "value", label: "Valor", type: "number" },
      { name: "probability", label: "Probabilidade (%)", type: "number" },
      { name: "lostReason", label: "Motivo da perda" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "catalog",
    title: "Catálogo de toldos",
    subtitle: "Tipos, materiais, cores, preços e margens",
    primaryField: "name",
    badgeField: "type",
    fields: [
      { name: "type", label: "Tipo", required: true },
      { name: "name", label: "Nome do modelo" },
      { name: "materials", label: "Materiais" },
      { name: "colors", label: "Cores" },
      { name: "price", label: "Preço", type: "number" },
      { name: "cost", label: "Custo", type: "number" },
      { name: "margin", label: "Margem (%)", type: "number" },
      { name: "active", label: "Ativo", type: "boolean" }
    ]
  },
  {
    key: "materials",
    title: "Materiais",
    subtitle: "Lonas, alumínio, motores, ferragens e itens personalizados",
    primaryField: "item",
    badgeField: "supplier",
    fields: [
      { name: "item", label: "Material", required: true },
      { name: "unit", label: "Unidade" },
      { name: "cost", label: "Custo", type: "number" },
      { name: "supplier", label: "Fornecedor" },
      { name: "min", label: "Estoque mínimo", type: "number" },
      { name: "max", label: "Estoque máximo", type: "number" },
      { name: "code", label: "Código" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "measurements",
    title: "Medições",
    subtitle: "Cliente, endereço, medidas, fotos e observações",
    primaryField: "client",
    badgeField: "type",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "address", label: "Endereço" },
      { name: "type", label: "Tipo de toldo" },
      { name: "width", label: "Largura", type: "number" },
      { name: "projection", label: "Projeção", type: "number" },
      { name: "height", label: "Altura", type: "number" },
      { name: "photos", label: "Fotos/Vídeos" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "inspections",
    title: "Vistorias",
    subtitle: "Riscos, acesso, equipamentos e aprovação",
    primaryField: "client",
    badgeField: "approved",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "address", label: "Endereço" },
      { name: "risks", label: "Riscos" },
      { name: "access", label: "Acesso" },
      { name: "equipment", label: "Equipamentos" },
      { name: "approved", label: "Aprovado", type: "boolean" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "quotes",
    title: "Orçamentos",
    subtitle: "Cliente, materiais, custo, margem, preço e status",
    primaryField: "client",
    badgeField: "status",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "model", label: "Modelo" },
      { name: "material", label: "Material" },
      { name: "color", label: "Cor" },
      { name: "quantity", label: "Quantidade", type: "number" },
      { name: "cost", label: "Custo", type: "number" },
      { name: "margin", label: "Margem (%)", type: "number" },
      { name: "suggestedPrice", label: "Preço sugerido", type: "number" },
      { name: "finalPrice", label: "Preço final", type: "number" },
      { name: "status", label: "Status" },
      { name: "validUntil", label: "Validade", type: "date" },
      { name: "paymentMethod", label: "Pagamento" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "pricingRules",
    title: "Precificação",
    subtitle: "Margem, markup, custo/m² e preço mínimo",
    primaryField: "name",
    fields: [
      { name: "name", label: "Nome da regra", required: true },
      { name: "basis", label: "Base de cálculo" },
      { name: "laborCost", label: "Mão de obra", type: "number" },
      { name: "displacement", label: "Deslocamento", type: "number" },
      { name: "expenses", label: "Despesas", type: "number" },
      { name: "margin", label: "Margem (%)", type: "number" },
      { name: "minimumPrice", label: "Preço mínimo", type: "number" }
    ]
  },
  {
    key: "projects",
    title: "Projeto do toldo",
    subtitle: "Modelo, medidas, estrutura, acabamento e desenhos",
    primaryField: "client",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "model", label: "Modelo" },
      { name: "width", label: "Largura", type: "number" },
      { name: "projection", label: "Projeção", type: "number" },
      { name: "material", label: "Material" },
      { name: "structure", label: "Estrutura" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "production",
    title: "Produção",
    subtitle: "Ordem, responsável, prazo e prioridade",
    primaryField: "client",
    badgeField: "status",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "product", label: "Produto" },
      { name: "materials", label: "Materiais" },
      { name: "quantity", label: "Quantidade", type: "number" },
      { name: "responsible", label: "Responsável" },
      { name: "due", label: "Prazo", type: "date" },
      { name: "priority", label: "Prioridade" },
      { name: "status", label: "Status" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "bom",
    title: "BOM / Ficha técnica",
    subtitle: "Componentes, quantidades e tempo estimado",
    primaryField: "model",
    fields: [
      { name: "model", label: "Modelo", required: true },
      { name: "component", label: "Componente" },
      { name: "qty", label: "Quantidade", type: "number" },
      { name: "unit", label: "Unidade" },
      { name: "waste", label: "Perda (%)", type: "number" },
      { name: "laborTime", label: "Tempo de mão de obra" }
    ]
  },
  {
    key: "stock",
    title: "Estoque",
    subtitle: "Entrada, saída, ajuste e controle atual",
    primaryField: "item",
    badgeField: "status",
    fields: [
      { name: "item", label: "Item", required: true },
      { name: "qty", label: "Quantidade", type: "number" },
      { name: "min", label: "Mínimo", type: "number" },
      { name: "max", label: "Máximo", type: "number" },
      { name: "cost", label: "Custo", type: "number" },
      { name: "location", label: "Local" },
      { name: "status", label: "Status" }
    ]
  },
  {
    key: "purchases",
    title: "Compras",
    subtitle: "Fornecedores, pedido e recebimento",
    primaryField: "supplier",
    badgeField: "status",
    fields: [
      { name: "supplier", label: "Fornecedor", required: true },
      { name: "items", label: "Itens" },
      { name: "quantities", label: "Quantidades" },
      { name: "price", label: "Preço", type: "number" },
      { name: "due", label: "Prazo", type: "date" },
      { name: "status", label: "Status" },
      { name: "receivedAt", label: "Recebido em", type: "date" }
    ]
  },
  {
    key: "deliveries",
    title: "Entregas",
    subtitle: "Pedido, cliente, endereço, motorista e comprovante",
    primaryField: "client",
    badgeField: "status",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "address", label: "Endereço" },
      { name: "date", label: "Data", type: "date" },
      { name: "driver", label: "Motorista" },
      { name: "team", label: "Equipe" },
      { name: "status", label: "Status" },
      { name: "proof", label: "Comprovante" }
    ]
  },
  {
    key: "installations",
    title: "Instalações",
    subtitle: "Agendamento, equipe, assinatura e status",
    primaryField: "client",
    badgeField: "status",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "address", label: "Endereço" },
      { name: "date", label: "Data", type: "date" },
      { name: "time", label: "Horário" },
      { name: "team", label: "Equipe" },
      { name: "status", label: "Status" },
      { name: "signature", label: "Assinatura" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "maintenance",
    title: "Assistência / Manutenção",
    subtitle: "Problema, diagnóstico, peças, garantia e status",
    primaryField: "client",
    badgeField: "status",
    fields: [
      { name: "client", label: "Cliente", required: true },
      { name: "problem", label: "Problema" },
      { name: "diagnostic", label: "Diagnóstico" },
      { name: "parts", label: "Peças" },
      { name: "tech", label: "Técnico" },
      { name: "warranty", label: "Garantia" },
      { name: "status", label: "Status" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "calendar",
    title: "Calendário",
    subtitle: "Visitas, medições, orçamentos, produção, instalações e tarefas",
    primaryField: "title",
    badgeField: "type",
    fields: [
      { name: "date", label: "Data", type: "date" },
      { name: "title", label: "Título", required: true },
      { name: "type", label: "Tipo" },
      { name: "responsible", label: "Responsável" },
      { name: "status", label: "Status" },
      { name: "notes", label: "Observações", type: "textarea" }
    ]
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    subtitle: "Mensagens, templates, histórico e automações",
    primaryField: "contact",
    badgeField: "status",
    fields: [
      { name: "contact", label: "Contato", required: true },
      { name: "template", label: "Template" },
      { name: "message", label: "Mensagem", type: "textarea" },
      { name: "channel", label: "Canal" },
      { name: "status", label: "Status" },
      { name: "history", label: "Histórico" }
    ]
  },
  {
    key: "finance",
    title: "Financeiro",
    subtitle: "Contas a receber, contas a pagar e fluxo de caixa",
    primaryField: "label",
    badgeField: "status",
    fields: [
      { name: "kind", label: "Tipo", type: "select", options: ["Receita", "Despesa"] },
      { name: "label", label: "Descrição", required: true },
      { name: "category", label: "Categoria" },
      { name: "amount", label: "Valor", type: "number" },
      { name: "due", label: "Vencimento", type: "date" },
      { name: "paidAt", label: "Pago em", type: "date" },
      { name: "status", label: "Status" }
    ]
  },
  {
    key: "notifications",
    title: "Notificações",
    subtitle: "Leads, orçamentos, estoque, produção e pendências",
    primaryField: "title",
    badgeField: "kind",
    fields: [
      { name: "title", label: "Título", required: true },
      { name: "kind", label: "Tipo" },
      { name: "read", label: "Lida", type: "boolean" }
    ]
  },
  {
    key: "reports",
    title: "Relatórios",
    subtitle: "Comercial, produção, estoque, financeiro e exportação",
    primaryField: "title",
    fields: [
      { name: "title", label: "Título", required: true },
      { name: "period", label: "Período" },
      { name: "type", label: "Tipo" },
      { name: "export", label: "Exportação" }
    ]
  },
  {
    key: "syncQueue",
    title: "Fila de sincronização",
    subtitle: "Operações locais, status e erro",
    primaryField: "action",
    badgeField: "status",
    fields: [
      { name: "action", label: "Ação", required: true },
      { name: "target", label: "Destino" },
      { name: "status", label: "Status" },
      { name: "error", label: "Erro" }
    ]
  }
];

export function getModuleConfig(key: CollectionKey) {
  return MODULES.find((m) => m.key === key)!;
}
