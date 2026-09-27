import {
  defaultAgendaEvents,
  defaultCustomers,
  defaultFinancialEntries,
  defaultInstallations,
  defaultLeads,
  defaultMaterials,
  defaultProduction,
  defaultQuotes,
  defaultWorkOrders,
  type AssistantCustomer,
  type AssistantEvent,
  type AssistantFinancialEntry,
  type AssistantInstallation,
  type AssistantLead,
  type AssistantMaterial,
  type AssistantProduction,
  type AssistantQuote,
  type AssistantWorkOrder,
} from "@/lib/operationalData";

export type AssistantCategory = "agenda" | "clientes" | "comercial" | "orcamentos" | "os" | "producao" | "estoque" | "financeiro" | "instalacoes" | "manutencao" | "relatorios" | "sincronizacao" | "sistema";
export type AssistantIntentKey = "installations-tomorrow" | "installations-today" | "agenda" | "unanswered" | "customers" | "leads" | "quotes-pending" | "stock-low" | "create-lead" | "create-visit" | "create-measurement" | "create-quote" | "create-work-order" | "create-maintenance" | "pending" | "sync" | "day-summary" | "payments-open" | "work-orders" | "production" | "maintenance" | "reports" | "unsupported";
export type AssistantPendingAction = { title: string; description: string; kind: "action" };

export type AssistantSnapshot = {
  customers: AssistantCustomer[];
  leads: AssistantLead[];
  quotes: AssistantQuote[];
  production: AssistantProduction[];
  materials: AssistantMaterial[];
  installations: AssistantInstallation[];
  agenda: AssistantEvent[];
  workOrders: AssistantWorkOrder[];
  financialEntries: AssistantFinancialEntry[];
  pendingQueue: number;
  online: boolean;
};

export type AssistantResult = {
  category: AssistantCategory;
  intent: AssistantIntentKey;
  text: string;
  pendingAction?: AssistantPendingAction;
};

const actionWords = ["crie", "criar", "registre", "registrar", "emita", "emitir", "agende", "agendar", "gere", "gerar"];
const genericActionWords = ["para", "amanha", "hoje", "agora", "whatsapp", "telefone", "cliente", "empresa", "um", "uma", "o", "a"];

export function normalizeAssistantText(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function hasWord(value: string, word: string) {
  return new RegExp(`(^|\\s)${word}(?=\\s|$)`).test(value);
}

function isActionRequest(value: string) {
  return includesAny(value, actionWords);
}

function formatResponse(summary: string, data: string, action: string) {
  return `${summary}\n${data}\nPróxima ação: ${action}`;
}

function parseNumber(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number(normalized) || 0;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function pendingQuotes(quotes: AssistantQuote[]) {
  return quotes.filter((quote) => !includesAny(normalizeAssistantText(quote.status), ["aprovado", "pago", "cancelado", "concluido"]));
}

function criticalMaterials(materials: AssistantMaterial[]) {
  return materials.filter((material) => {
    if (normalizeAssistantText(material.status).includes("baixo")) return true;
    return parseNumber(material.current) < parseNumber(material.minimum);
  });
}

function openPayments(entries: AssistantFinancialEntry[]) {
  return entries.filter((entry) => normalizeAssistantText(entry.status) !== "pago");
}

function contactWaitingForReply(customers: AssistantCustomer[], leads: AssistantLead[]) {
  const customerContacts = customers.filter((customer) => includesAny(normalizeAssistantText(customer.status), ["negociacao", "novo contato", "aguardando", "sem resposta"])).map((customer) => customer.name);
  const leadContacts = leads.filter((lead) => includesAny(normalizeAssistantText(lead.stage), ["novo contato", "negociacao", "aguardando"])).map((lead) => lead.name);
  return Array.from(new Set([...customerContacts, ...leadContacts]));
}

function actionHasContext(text: string, intent: AssistantIntentKey) {
  const words = normalizeAssistantText(text).split(/\s+/).filter((word) => word.length > 2 && !genericActionWords.includes(word));
  if (intent === "create-lead") return words.some((word) => !["lead", "criar", "crie", "cadastre", "cadastrar", "whatsapp"].includes(word));
  if (intent === "create-visit" || intent === "create-measurement") return words.some((word) => !["visita", "agendar", "agenda", "medicao", "medir", "criar", "crie", "marcar", "marque", "registre", "registrar"].includes(word));
  if (intent === "create-quote") return words.some((word) => !["orcamento", "orcar", "toldo", "criar", "crie", "montar", "monte"].includes(word));
  if (intent === "create-work-order" || intent === "create-maintenance") return words.some((word) => !["os", "emitir", "emita", "ordem", "servico", "manutencao", "registrar", "registre", "criar", "crie"].includes(word));
  return false;
}

export function classifyAssistantIntent(rawText: string): { category: AssistantCategory; intent: AssistantIntentKey } {
  const text = normalizeAssistantText(rawText);
  const action = isActionRequest(text);

  if (action && includesAny(text, ["lead", "novo contato", "cadastrar contato"])) return { category: "comercial", intent: "create-lead" };
  if (action && includesAny(text, ["medicao", "medir"])) return { category: "agenda", intent: "create-measurement" };
  if (action && includesAny(text, ["visita", "agendar visita"])) return { category: "agenda", intent: "create-visit" };
  if (action && includesAny(text, ["orcamento", "orcar"])) return { category: "orcamentos", intent: "create-quote" };
  if (action && (hasWord(text, "os") || includesAny(text, ["ordem de servico", "ordem de serviço"]))) return { category: "os", intent: "create-work-order" };
  if (action && includesAny(text, ["manutencao", "manutenção"])) return { category: "manutencao", intent: "create-maintenance" };
  if (action && includesAny(text, ["lista de compras", "compras"])) return { category: "estoque", intent: "stock-low" };

  if (includesAny(text, ["sincron", "fila"])) return { category: "sincronizacao", intent: "sync" };
  if (includesAny(text, ["sem resposta", "aguardando retorno", "retorno do cliente"])) return { category: "clientes", intent: "unanswered" };
  if (includesAny(text, ["pagamento", "pagamentos", "em aberto", "a receber", "a pagar"])) return { category: "financeiro", intent: "payments-open" };
  if (includesAny(text, ["resumir o dia", "resuma o dia", "resumo do dia", "como esta meu dia"])) return { category: "relatorios", intent: "day-summary" };
  if (includesAny(text, ["pendencia", "pendencias", "pendente", "o que falta"])) return { category: "sistema", intent: "pending" };
  if (includesAny(text, ["instalacao", "instalacoes"]) && text.includes("amanha")) return { category: "instalacoes", intent: "installations-tomorrow" };
  if (includesAny(text, ["instalacao", "instalacoes"]) && text.includes("hoje")) return { category: "instalacoes", intent: "installations-today" };
  if (includesAny(text, ["orcamento", "orcamentos"]) && includesAny(text, ["pendente", "pendentes", "aberto", "abertos", "aguardando"])) return { category: "orcamentos", intent: "quotes-pending" };
  if (includesAny(text, ["estoque", "material", "materiais"]) && includesAny(text, ["baixo", "critico", "criticos", "minimo"])) return { category: "estoque", intent: "stock-low" };
  if (includesAny(text, ["ordem de servico", "ordens de servico", "os aberta", "os abertas"])) return { category: "os", intent: "work-orders" };
  if (includesAny(text, ["producao", "produção"])) return { category: "producao", intent: "production" };
  if (includesAny(text, ["manutencao", "manutenção", "chamado"])) return { category: "manutencao", intent: "maintenance" };
  if (includesAny(text, ["relatorio", "relatorios", "indicador", "indicadores"])) return { category: "relatorios", intent: "reports" };
  if (includesAny(text, ["lead", "leads", "oportunidade"])) return { category: "comercial", intent: "leads" };
  if (includesAny(text, ["cliente", "clientes", "crm"])) return { category: "clientes", intent: "customers" };
  if (includesAny(text, ["agenda", "compromisso", "compromissos", "visita"])) return { category: "agenda", intent: "agenda" };
  if (includesAny(text, ["instalacao", "instalacoes"])) return { category: "instalacoes", intent: "agenda" };

  return { category: "sistema", intent: "unsupported" };
}

function actionResponse(rawText: string, category: AssistantCategory, intent: AssistantIntentKey) {
  if (!actionHasContext(rawText, intent)) {
    const missing = intent === "create-lead" ? "nome ou empresa e telefone" : intent === "create-visit" ? "cliente, data e horário" : intent === "create-measurement" ? "cliente e data da medição" : intent === "create-quote" ? "cliente e modelo de toldo" : intent === "create-maintenance" ? "cliente e serviço de manutenção" : "cliente, serviço e data da OS";
    return {
      category,
      intent,
      text: formatResponse("Falta contexto para preparar esse registro.", `Preciso de: ${missing}.`, "envie esses dados para eu montar a ação"),
    };
  }

  const actionLabel = intent === "create-lead" ? "criação do lead" : intent === "create-visit" ? "visita" : intent === "create-measurement" ? "medição" : intent === "create-quote" ? "orçamento" : intent === "create-maintenance" ? "manutenção" : "ordem de serviço";
  return {
    category,
    intent,
    text: formatResponse(`Preparei a ${actionLabel}.`, `Solicitação: ${rawText.trim()}.`, "confirmar para registrar na fila do Toldo Pro"),
    pendingAction: {
      title: rawText.trim(),
      description: `A ${actionLabel} será registrada com as permissões atuais do seu usuário. A IA não executa ações críticas sem confirmação.`,
      kind: "action" as const,
    },
  };
}

export function buildAssistantResult(rawText: string, snapshot: AssistantSnapshot): AssistantResult {
  const classified = classifyAssistantIntent(rawText);
  const { intent, category } = classified;
  const quotes = pendingQuotes(snapshot.quotes);
  const materials = criticalMaterials(snapshot.materials);
  const waiting = contactWaitingForReply(snapshot.customers, snapshot.leads);
  const payments = openPayments(snapshot.financialEntries);
  const tomorrowInstallations = snapshot.installations.filter((item) => normalizeAssistantText(item.time).includes("amanha"));
  const todayInstallations = snapshot.installations.filter((item) => normalizeAssistantText(item.time).includes("hoje"));
  const openOrders = snapshot.workOrders.filter((item) => !includesAny(normalizeAssistantText(item.status), ["concluida", "concluido", "cancelada", "cancelado"]));
  const maintenance = openOrders.filter((item) => normalizeAssistantText(item.service).includes("manutencao"));

  if (intent.startsWith("create-")) return actionResponse(rawText, category, intent);

  if (intent === "installations-tomorrow") {
    const list = tomorrowInstallations.length ? tomorrowInstallations : snapshot.agenda.filter((item) => item.day === "tomorrow" && normalizeAssistantText(item.type).includes("instalacao"));
    const details = list.length ? list.slice(0, 3).map((item) => `${item.time} · ${item.customer} · ${item.address || item.location}`).join(" | ") : "Nenhuma instalação está cadastrada para amanhã.";
    return { category, intent, text: formatResponse(`Você tem ${list.length} instalação${list.length === 1 ? "" : "ões"} amanhã.`, details, list.length ? "abrir a agenda ou confirmar com o cliente" : "abrir a agenda e cadastrar a instalação") };
  }

  if (intent === "installations-today") {
    const list = todayInstallations;
    const details = list.length ? list.map((item) => `${item.time} · ${item.customer} · ${item.status}`).join(" | ") : "Nenhuma instalação está cadastrada para hoje.";
    return { category, intent, text: formatResponse(`Você tem ${list.length} instalação${list.length === 1 ? "" : "ões"} hoje.`, details, list.length ? "abrir a OS ou atualizar o status da equipe" : "abrir a agenda") };
  }

  if (intent === "unanswered") {
    const details = waiting.length ? waiting.slice(0, 3).join(" · ") : "Nenhum contato está marcado como aguardando retorno.";
    return { category, intent, text: formatResponse(`${waiting.length} contato${waiting.length === 1 ? "" : "s"} aguarda${waiting.length === 1 ? "" : "m"} retorno.`, details, waiting.length ? "abrir o CRM e fazer o próximo contato" : "seguir para a próxima atividade") };
  }

  if (intent === "customers") {
    const recent = snapshot.customers.slice(0, 3).map((customer) => `${customer.name} · ${customer.status}`).join(" | ");
    return { category, intent, text: formatResponse(`${snapshot.customers.length} clientes estão cadastrados.`, recent || "A base de clientes está vazia.", "abrir o CRM para consultar um cliente") };
  }

  if (intent === "leads") {
    const recent = snapshot.leads.slice(0, 3).map((lead) => `${lead.name} · ${lead.stage}`).join(" | ");
    return { category, intent, text: formatResponse(`${snapshot.leads.length} leads estão no funil.`, recent || "Nenhum lead foi cadastrado.", "abrir vendas para avançar o próximo contato") };
  }

  if (intent === "quotes-pending") {
    const details = quotes.length ? quotes.slice(0, 3).map((quote) => `${quote.id} · ${quote.customer} · ${quote.status}`).join(" | ") : "Nenhum orçamento está aguardando retorno.";
    return { category, intent, text: formatResponse(`${quotes.length} orçamento${quotes.length === 1 ? "" : "s"} está${quotes.length === 1 ? "" : "ão"} pendente${quotes.length === 1 ? "" : "s"}.`, details, quotes.length ? "abrir o orçamento mais antigo e enviar retorno" : "seguir para a próxima atividade") };
  }

  if (intent === "stock-low") {
    const details = materials.length ? materials.slice(0, 3).map((material) => `${material.name} · ${material.current} de ${material.minimum}`).join(" | ") : "Nenhum material está abaixo do mínimo.";
    return { category, intent, text: formatResponse(`${materials.length} item${materials.length === 1 ? "" : "ens"} está${materials.length === 1 ? "" : "ão"} abaixo do mínimo.`, details, materials.length ? "gerar a lista de compras e revisar a produção" : "seguir para a próxima atividade") };
  }

  if (intent === "pending") {
    const details = `${materials.length} alerta${materials.length === 1 ? "" : "s"} de estoque · ${quotes.length} orçamento${quotes.length === 1 ? "" : "s"} pendente${quotes.length === 1 ? "" : "s"} · ${snapshot.pendingQueue} operação${snapshot.pendingQueue === 1 ? "" : "ões"} na fila`;
    return { category, intent, text: formatResponse("Há pendências operacionais para revisar.", details, "abrir a fila, o estoque ou os orçamentos") };
  }

  if (intent === "sync") {
    if (!snapshot.online) return { category, intent, text: formatResponse("A fila está salva no aparelho.", `${snapshot.pendingQueue} operação${snapshot.pendingQueue === 1 ? "" : "ões"} aguarda${snapshot.pendingQueue === 1 ? "" : "m"} conexão.`, "voltar ao online para sincronizar") };
    return { category, intent, text: formatResponse(snapshot.pendingQueue ? "Sincronização solicitada." : "A fila está limpa.", `${snapshot.pendingQueue} operação${snapshot.pendingQueue === 1 ? "" : "ões"} pendente${snapshot.pendingQueue === 1 ? "" : "s"}.`, snapshot.pendingQueue ? "acompanhar o status da fila" : "continuar a operação") };
  }

  if (intent === "day-summary") {
    const details = `${todayInstallations.length} instalação${todayInstallations.length === 1 ? "" : "ões"} hoje · ${quotes.length} orçamento${quotes.length === 1 ? "" : "s"} pendente${quotes.length === 1 ? "" : "s"} · ${materials.length} alerta${materials.length === 1 ? "" : "s"} de estoque`;
    return { category, intent, text: formatResponse("Este é o resumo operacional do dia.", details, "abrir a agenda e tratar a primeira pendência") };
  }

  if (intent === "payments-open") {
    const total = payments.reduce((sum, entry) => sum + parseNumber(entry.value), 0);
    const details = payments.length ? `${formatCurrency(total)} em aberto · ${payments.slice(0, 3).map((entry) => `${entry.title} · ${entry.value}`).join(" | ")}` : "Nenhum pagamento em aberto foi encontrado.";
    return { category, intent, text: formatResponse(`${payments.length} lançamento${payments.length === 1 ? "" : "s"} financeiro${payments.length === 1 ? "" : "s"} está${payments.length === 1 ? "" : "ão"} em aberto.`, details, payments.length ? "abrir o financeiro e priorizar os vencimentos" : "seguir para a próxima atividade") };
  }

  if (intent === "work-orders") {
    const details = openOrders.length ? openOrders.slice(0, 3).map((order) => `${order.id} · ${order.customer} · ${order.status}`).join(" | ") : "Nenhuma OS aberta foi encontrada.";
    return { category, intent, text: formatResponse(`${openOrders.length} OS está${openOrders.length === 1 ? "" : "ão"} aberta${openOrders.length === 1 ? "" : "s"}.`, details, openOrders.length ? "abrir a OS prioritária e atualizar o status" : "emitir uma nova OS") };
  }

  if (intent === "production") {
    const active = snapshot.production.filter((order) => !includesAny(normalizeAssistantText(order.status), ["pronto", "concluido"]));
    const details = active.length ? active.slice(0, 3).map((order) => `${order.id} · ${order.customer} · ${order.status}`).join(" | ") : "Nenhuma ordem está em produção.";
    return { category, intent, text: formatResponse(`${active.length} ordem${active.length === 1 ? "" : "s"} está${active.length === 1 ? "" : "ão"} em andamento.`, details, active.length ? "abrir produção e revisar o próximo prazo" : "criar uma ordem de produção") };
  }

  if (intent === "maintenance") {
    const details = maintenance.length ? maintenance.map((order) => `${order.id} · ${order.customer} · ${order.status}`).join(" | ") : "Nenhuma manutenção aberta foi encontrada.";
    return { category, intent, text: formatResponse(`${maintenance.length} chamado${maintenance.length === 1 ? "" : "s"} de manutenção está${maintenance.length === 1 ? "" : "ão"} aberto${maintenance.length === 1 ? "" : "s"}.`, details, maintenance.length ? "abrir a OS e confirmar a equipe" : "registrar uma manutenção") };
  }

  if (intent === "reports") {
    const details = `${snapshot.customers.length} clientes · ${snapshot.leads.length} leads · ${snapshot.quotes.length} orçamentos · ${openOrders.length} OS abertas`;
    return { category, intent, text: formatResponse("O painel operacional está atualizado.", details, "abrir relatórios para analisar o indicador desejado") };
  }

  if (intent === "agenda") {
    const items = snapshot.agenda.slice(0, 3).map((event) => `${event.time} · ${event.title} · ${event.status}`).join(" | ");
    return { category, intent, text: formatResponse(`${snapshot.agenda.length} compromissos estão no contexto da agenda.`, items || "A agenda está vazia.", "abrir a agenda e escolher o próximo atendimento") };
  }

  return {
    category: "sistema",
    intent: "unsupported",
    text: formatResponse("Esse pedido está fora do escopo operacional de toldos.", "Atendo agenda, clientes, leads, orçamentos, OS, produção, estoque, financeiro e campo.", "informe o módulo ou a ação que você precisa resolver"),
  };
}

export function createDefaultAssistantSnapshot(online: boolean, pendingQueue: number): AssistantSnapshot {
  return { customers: defaultCustomers, leads: defaultLeads, quotes: defaultQuotes, production: defaultProduction, materials: defaultMaterials, installations: defaultInstallations, agenda: defaultAgendaEvents, workOrders: defaultWorkOrders, financialEntries: defaultFinancialEntries, pendingQueue, online };
}
