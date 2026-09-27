export type WorkflowRole = "Administrador" | "Vendas" | "Produção" | "Instalador" | "Financeiro";
export type WorkflowPermission = "viewFinancial" | "approveQuote" | "convertClient" | "issueOS" | "sendProduction" | "changeProductionStatus" | "deleteRecord" | "editRules";
export type WorkflowQuoteStatus = "Rascunho" | "Enviado" | "Aprovado" | "Cancelado";
export type ProductionStatus = "Aguardando produção" | "Em andamento" | "Parado" | "Pronto para instalar";
export type WorkflowHistory = { id: string; actor: string; role: WorkflowRole; at: string; action: string; from?: string; to?: string; origin: string };

export type WorkflowQuote = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  taxId: string;
  productModel: string;
  measurements: string;
  materials: string;
  color: string;
  finish: string;
  quantity: number;
  cost: string;
  margin: number;
  finalValue: string;
  validUntil: string;
  status: WorkflowQuoteStatus;
  notes: string;
  clientId?: string;
  osId?: string;
  history: WorkflowHistory[];
};

export type WorkflowClient = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  taxId: string;
  notes: string;
  source: "convertido de orçamento";
  sourceQuoteId: string;
  product: string;
  quoteId: string;
  osId?: string;
  history: WorkflowHistory[];
};

export type WorkflowOS = {
  id: string;
  clientId: string;
  clientName: string;
  quoteId: string;
  service: string;
  measurements: string;
  materials: string;
  quantity: number;
  color: string;
  finish: string;
  deadline: string;
  notes: string;
  responsible: string;
  priority: "Normal" | "Alta";
  status: "Emitida" | "Enviada para produção" | "Concluída" | "Cancelada";
  productionId?: string;
  history: WorkflowHistory[];
};

export type InstallationStatus = "Agendada" | "A caminho" | "Instalando" | "Concluída";

export type WorkflowInstallation = {
  id: string;
  time: string;
  customer: string;
  address: string;
  team: string;
  status: InstallationStatus;
  observations?: string;
  photos?: string[]; // base64 or URLs
  productionId?: string;
  osId?: string;
  quoteId?: string;
  clientId?: string;
  history: WorkflowHistory[];
};

export type WorkflowProduction = {
  id: string;
  osId: string;
  quoteId: string;
  clientId: string;
  clientName: string;
  model: string;
  measurements: string;
  materials: string;
  color: string;
  finish: string;
  quantity: number;
  deadline: string;
  responsible: string;
  notes: string;
  status: ProductionStatus;
  history: WorkflowHistory[];
};

export const workflowPermissions: Record<WorkflowRole, Record<WorkflowPermission, boolean>> = {
  Administrador: { viewFinancial: true, approveQuote: true, convertClient: true, issueOS: true, sendProduction: true, changeProductionStatus: true, deleteRecord: true, editRules: true },
  Vendas: { viewFinancial: true, approveQuote: true, convertClient: true, issueOS: true, sendProduction: false, changeProductionStatus: false, deleteRecord: false, editRules: false },
  Produção: { viewFinancial: false, approveQuote: false, convertClient: false, issueOS: false, sendProduction: false, changeProductionStatus: true, deleteRecord: false, editRules: false },
  Instalador: { viewFinancial: false, approveQuote: false, convertClient: false, issueOS: false, sendProduction: false, changeProductionStatus: false, deleteRecord: false, editRules: false },
  Financeiro: { viewFinancial: true, approveQuote: false, convertClient: false, issueOS: false, sendProduction: false, changeProductionStatus: false, deleteRecord: false, editRules: false },
};

export const permissionLabels: Record<WorkflowPermission, string> = {
  viewFinancial: "Ver custo, margem, desconto e valor final",
  approveQuote: "Aprovar orçamento",
  convertClient: "Converter orçamento em cliente",
  issueOS: "Emitir OS",
  sendProduction: "Enviar para produção",
  changeProductionStatus: "Alterar status crítico da produção",
  deleteRecord: "Excluir registros",
  editRules: "Alterar regras do sistema",
};

export const defaultWorkflowQuotes: WorkflowQuote[] = [
  {
    id: "#1542", customerName: "Marina Lopes", phone: "(11) 98745-2201", email: "marina@exemplo.com", address: "Rua Harmonia, 245 · Vila Madalena", city: "São Paulo", taxId: "",
    productModel: "Toldo retrátil", measurements: "18 m² · projeção 2,50 m", materials: "Lona acrílica · braços articulados", color: "Areia", finish: "Ilhós e acabamento padrão", quantity: 1, cost: "R$ 4.850", margin: 42, finalValue: "R$ 8.450", validUntil: "30 set 2024", status: "Aprovado", notes: "Instalação em fachada residencial.", clientId: "client-quote-1542", history: [],
  },
  {
    id: "#1538", customerName: "Clínica Vitta", phone: "(11) 3055-8800", email: "contato@clinicavitta.com", address: "Rua dos Pinheiros, 820", city: "São Paulo", taxId: "12.345.678/0001-90",
    productModel: "Toldo articulado", measurements: "32 m² · projeção 3,00 m", materials: "Lona bege · 2 braços · motor 45Nm", color: "Bege", finish: "Motor tubular e sensor", quantity: 1, cost: "R$ 9.600", margin: 43, finalValue: "R$ 16.800", validUntil: "29 set 2024", status: "Enviado", notes: "Priorizar instalação antes da inauguração.", history: [],
  },
  {
    id: "#1534", customerName: "Café Amora", phone: "(11) 99821-4410", email: "contato@cafeamora.com", address: "Rua Gaivota, 410", city: "São Paulo", taxId: "",
    productModel: "Cobertura fixa", measurements: "12 m² · profundidade 2,00 m", materials: "Lona tensionada · fixadores", color: "Terracota", finish: "Acabamento reforçado", quantity: 1, cost: "R$ 2.980", margin: 42, finalValue: "R$ 5.200", validUntil: "28 set 2024", status: "Enviado", notes: "Validar ponto de fixação no local.", history: [],
  },
];

export const defaultWorkflowClients: WorkflowClient[] = [
  { id: "client-quote-1542", name: "Marina Lopes", phone: "(11) 98745-2201", email: "marina@exemplo.com", address: "Rua Harmonia, 245 · Vila Madalena", city: "São Paulo", taxId: "", notes: "Cliente convertido do orçamento #1542.", source: "convertido de orçamento", sourceQuoteId: "#1542", product: "Toldo retrátil", quoteId: "#1542", history: [] },
];

export const defaultWorkflowOS: WorkflowOS[] = [];
export const defaultWorkflowProduction: WorkflowProduction[] = [];
export const defaultWorkflowInstallations: WorkflowInstallation[] = [];

export function readWorkflowList<T>(key: string, fallback: T[]) {
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

export function writeWorkflowList<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getCurrentWorkflowRole(): WorkflowRole {
  const role = window.localStorage.getItem("toldo:current-role");
  return role === "Vendas" || role === "Produção" || role === "Instalador" || role === "Financeiro" ? role : "Administrador";
}

export function canWorkflow(role: WorkflowRole, permission: WorkflowPermission) {
  return workflowPermissions[role][permission];
}

export function nowLabel() {
  return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function makeHistory(action: string, origin: string, from?: string, to?: string): WorkflowHistory {
  const role = getCurrentWorkflowRole();
  return { id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, actor: role === "Administrador" ? "Rafael Silva" : role, role, at: nowLabel(), action, from, to, origin };
}

export function nextId(prefix: string, values: { id: string }[]) {
  const numbers = values.map((item) => Number(item.id.replace(/\D/g, ""))).filter(Boolean);
  return `${prefix}-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(4, "0")}`;
}

export function normalizeQuote(raw: Partial<WorkflowQuote> & { customer?: string; product?: string; value?: string; date?: string; status?: string }, index: number): WorkflowQuote {
  const oldStatus = raw.status === "Aprovado" ? "Aprovado" : raw.status === "Cancelado" ? "Cancelado" : raw.status === "Rascunho" ? "Rascunho" : "Enviado";
  return {
    id: raw.id || `#${1542 + index}`,
    customerName: raw.customerName || raw.customer || "Cliente sem nome",
    phone: raw.phone || "Não informado",
    email: raw.email || "Não informado",
    address: raw.address || "Endereço pendente",
    city: raw.city || "São Paulo",
    taxId: raw.taxId || "",
    productModel: raw.productModel || (raw.product || "Toldo retrátil").split("·")[0].trim(),
    measurements: raw.measurements || (raw.product?.includes("·") ? raw.product.split("·").slice(1).join("·").trim() : "Medidas pendentes"),
    materials: raw.materials || "Materiais a definir",
    color: raw.color || "A definir",
    finish: raw.finish || "A definir",
    quantity: raw.quantity || 1,
    cost: raw.cost || "R$ 0",
    margin: raw.margin || 0,
    finalValue: raw.finalValue || raw.value || "R$ 0",
    validUntil: raw.validUntil || raw.date || "A definir",
    status: oldStatus,
    notes: raw.notes || "",
    clientId: raw.clientId,
    osId: raw.osId,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export function normalizeClient(raw: Partial<WorkflowClient> & { contact?: string; value?: string }, index: number): WorkflowClient {
  return {
    id: raw.id || `client-${index + 1}`,
    name: raw.name || "Cliente sem nome",
    phone: raw.phone || raw.contact || "Não informado",
    email: raw.email || "Não informado",
    address: raw.address || "Endereço pendente",
    city: raw.city || "São Paulo",
    taxId: raw.taxId || "",
    notes: raw.notes || "",
    source: raw.source || "convertido de orçamento",
    sourceQuoteId: raw.sourceQuoteId || raw.quoteId || "",
    product: raw.product || "Toldo a definir",
    quoteId: raw.quoteId || raw.sourceQuoteId || "",
    osId: raw.osId,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export function normalizeOS(raw: Partial<WorkflowOS> & { customer?: string; service?: string; origin?: string; date?: string; owner?: string; priority?: string; status?: string; materials?: string }, index: number): WorkflowOS {
  const rawStatus = raw.status || "Emitida";
  const status = rawStatus.includes("produção") ? "Enviada para produção" : rawStatus.includes("Conclu") ? "Concluída" : rawStatus.includes("Cancel") ? "Cancelada" : "Emitida";
  return {
    id: raw.id || `OS-${String(249 + index).padStart(4, "0")}`,
    clientId: raw.clientId || "",
    clientName: raw.clientName || raw.customer || "Cliente sem nome",
    quoteId: raw.quoteId || (raw.origin?.match(/#\d+/)?.[0] || ""),
    service: raw.service || "Instalação de toldo",
    measurements: raw.measurements || "Medidas herdadas do orçamento",
    materials: raw.materials || "Materiais herdados do orçamento",
    quantity: raw.quantity || 1,
    color: raw.color || "A definir",
    finish: raw.finish || "A definir",
    deadline: raw.deadline || raw.date || "A definir",
    notes: raw.notes || "",
    responsible: raw.responsible || raw.owner || "A definir",
    priority: raw.priority === "Alta" ? "Alta" : "Normal",
    status,
    productionId: raw.productionId,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export function normalizeProduction(raw: Partial<WorkflowProduction> & { customer?: string; product?: string; owner?: string; due?: string; status?: string; priority?: string }, index: number): WorkflowProduction {
  const rawStatus = raw.status || "Aguardando produção";
  const status: ProductionStatus = rawStatus === "Parado" ? "Parado" : rawStatus === "Pronto para instalar" ? "Pronto para instalar" : rawStatus === "Em andamento" ? "Em andamento" : "Aguardando produção";
  return {
    id: raw.id || `OP-${String(84 + index).padStart(3, "0")}`,
    osId: raw.osId || "",
    quoteId: raw.quoteId || "",
    clientId: raw.clientId || "",
    clientName: raw.clientName || raw.customer || "Cliente sem nome",
    model: raw.model || raw.product || "Toldo a definir",
    measurements: raw.measurements || "Medidas técnicas pendentes",
    materials: raw.materials || "Materiais técnicos pendentes",
    color: raw.color || "A definir",
    finish: raw.finish || "A definir",
    quantity: raw.quantity || 1,
    deadline: raw.deadline || raw.due || "A definir",
    responsible: raw.responsible || raw.owner || "A definir",
    notes: raw.notes || "",
    status,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}
