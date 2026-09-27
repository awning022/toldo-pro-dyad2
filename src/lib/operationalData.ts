export type AssistantCustomer = { id: string; name: string; type: string; contact: string; status: string; value: string };
export type AssistantLead = { id: string; name: string; value: string; stage: string };
export type AssistantQuote = { id: string; customer: string; product: string; value: string; status: string; date: string };
export type AssistantProduction = { id: string; customer: string; product: string; owner: string; due: string; status: string; priority: string };
export type AssistantMaterial = { id: string; name: string; sku: string; current: string; minimum: string; cost: string; status: string };
export type AssistantInstallation = { id: string; time: string; customer: string; address: string; team: string; status: string; iconName?: string };
export type AssistantEvent = { id: string; time: string; title: string; type: string; customer: string; location: string; status: string; tone: string; day?: "today" | "tomorrow" };
export type AssistantWorkOrder = { id: string; customer: string; service: string; origin: string; date: string; owner: string; priority: string; status: string; materials: string };
export type AssistantFinancialEntry = { title: string; type: string; date: string; value: string; status: string; tone: string };

export const defaultCustomers: AssistantCustomer[] = [
  { id: "customer-1", name: "Marina Lopes", type: "Pessoa física", contact: "(11) 98745-2201", status: "Em negociação", value: "R$ 8.450" },
  { id: "customer-2", name: "Clínica Vitta", type: "Pessoa jurídica", contact: "(11) 3055-8800", status: "Instalação agendada", value: "R$ 16.800" },
  { id: "customer-3", name: "Café Amora", type: "Pessoa jurídica", contact: "(11) 99821-4410", status: "Novo contato", value: "R$ 5.200" },
  { id: "customer-4", name: "Ana Beatriz Souza", type: "Pessoa física", contact: "(11) 99610-7742", status: "Medição marcada", value: "R$ 9.750" },
];

export const defaultLeads: AssistantLead[] = [
  { id: "lead-1", name: "Residencial Jardins", value: "R$ 12.800", stage: "Novo contato" },
  { id: "lead-2", name: "Café Amora", value: "R$ 5.200", stage: "Negociação" },
];

export const defaultQuotes: AssistantQuote[] = [
  { id: "#1542", customer: "Marina Lopes", product: "Toldo retrátil · 18m²", value: "R$ 8.450", status: "Aprovado", date: "18 set 2024" },
  { id: "#1538", customer: "Clínica Vitta", product: "Toldo articulado · 32m²", value: "R$ 16.800", status: "Em negociação", date: "17 set 2024" },
  { id: "#1534", customer: "Café Amora", product: "Cobertura fixa · 12m²", value: "R$ 5.200", status: "Enviado", date: "16 set 2024" },
];

export const defaultProduction: AssistantProduction[] = [
  { id: "OP-084", customer: "Clínica Vitta", product: "Toldo articulado 32m²", owner: "Equipe João", due: "20 set", status: "Em produção", priority: "Alta" },
  { id: "OP-083", customer: "Marina Lopes", product: "Toldo retrátil 18m²", owner: "Equipe Carlos", due: "21 set", status: "Acabamento", priority: "Normal" },
];

export const defaultMaterials: AssistantMaterial[] = [
  { id: "material-1", name: "Lona bege 3,00m", sku: "LON-BEG-300", current: "18 m", minimum: "25 m", cost: "R$ 48,90/m", status: "Abaixo do mínimo" },
  { id: "material-2", name: "Braço articulado 2,50m", sku: "BRA-ART-250", current: "42 un.", minimum: "20 un.", cost: "R$ 386,00", status: "Disponível" },
  { id: "material-3", name: "Motor tubular 45Nm", sku: "MOT-TUB-045", current: "7 un.", minimum: "10 un.", cost: "R$ 812,00", status: "Abaixo do mínimo" },
];

export const defaultInstallations: AssistantInstallation[] = [
  { id: "installation-1", time: "Hoje · 10:00", customer: "Clínica Vitta", address: "Rua dos Pinheiros, 820", team: "Equipe João · 3 pessoas", status: "A caminho", iconName: "truck" },
  { id: "installation-2", time: "Amanhã · 08:30", customer: "Marina Lopes", address: "Rua Harmonia, 245 · Vila Madalena", team: "Equipe Carlos · 2 pessoas", status: "Agendada", iconName: "calendar" },
];

export const defaultAgendaEvents: AssistantEvent[] = [
  { id: "event-1", time: "08:30", title: "Medição · Ana Beatriz", type: "Medição", customer: "Ana Beatriz Souza", location: "Vila Madalena", status: "Confirmado", tone: "bg-[#fff1e7] text-[#d9620d]", day: "today" },
  { id: "event-2", time: "10:00", title: "Instalação · Clínica Vitta", type: "Instalação", customer: "Clínica Vitta", location: "Pinheiros", status: "A caminho", tone: "bg-[#eaf2ff] text-[#1453a6]", day: "today" },
  { id: "event-3", time: "14:00", title: "Visita comercial · Café Amora", type: "Visita", customer: "Café Amora", location: "Moema", status: "Pendente", tone: "bg-[#f2edff] text-[#7852d6]", day: "today" },
  { id: "event-4", time: "16:30", title: "Entrega · Condomínio Horizonte", type: "Entrega", customer: "Condomínio Horizonte", location: "Itaim Bibi", status: "Programado", tone: "bg-[#eaf8f2] text-[#14835b]", day: "tomorrow" },
];

export const defaultWorkOrders: AssistantWorkOrder[] = [
  { id: "OS-0248", customer: "Clínica Vitta", service: "Instalação de toldo articulado 32m²", origin: "Orçamento #1538", date: "20 set 2024", owner: "Equipe João", priority: "Alta", status: "Em produção", materials: "Lona bege · 2 braços · motor 45Nm" },
  { id: "OS-0247", customer: "Marina Lopes", service: "Medição técnica para toldo retrátil", origin: "Orçamento #1542", date: "21 set 2024", owner: "Equipe Carlos", priority: "Normal", status: "Agendada", materials: "Trena · nível · amostras" },
  { id: "OS-0246", customer: "Café Amora", service: "Manutenção de cobertura fixa", origin: "Chamado #817", date: "22 set 2024", owner: "Equipe Paulo", priority: "Normal", status: "Aguardando", materials: "Lona de reposição · fixadores" },
];

export const defaultFinancialEntries: AssistantFinancialEntry[] = [
  { title: "Parcela · Clínica Vitta", type: "A receber", date: "20 set", value: "R$ 8.400", status: "Pendente", tone: "text-[#d9620d] bg-[#fff1e7]" },
  { title: "Fornecedor Lonas Brasil", type: "A pagar", date: "22 set", value: "R$ 3.280", status: "Agendado", tone: "text-[#2859a6] bg-[#eaf2ff]" },
  { title: "Marina Lopes · Entrada", type: "Recebido", date: "18 set", value: "R$ 4.225", status: "Pago", tone: "text-[#14835b] bg-[#eaf8f2]" },
  { title: "Equipe Carlos · Instalação", type: "Despesa", date: "19 set", value: "R$ 860", status: "Pendente", tone: "text-[#7852d6] bg-[#f2edff]" },
];

export function readLocalList<T>(key: string, fallback: T[]) {
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}
