import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock3,
  DollarSign,
  Download,
  FileBarChart,
  FileText,
  Filter,
  ListChecks,
  MapPin,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { ModuleKey } from "@/components/ModuleViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceView } from "@/components/FinanceView";
import type { AppNotification, StockMaterial } from "@/lib/operationsStore";
import type { FinanceEntry } from "@/components/FinanceView";
import type { WorkflowClient, WorkflowInstallation, WorkflowOS, WorkflowProduction, WorkflowQuote } from "@/lib/workflowData";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type OperationalModule = "agenda" | "notificacoes" | "os" | "financeiro" | "relatorios" | "configuracoes";
type EventRecord = { id: string; time: string; title: string; type: string; customer: string; location: string; status: string; tone: string };
type WorkOrder = { id: string; customer: string; service: string; origin: string; date: string; owner: string; priority: string; status: string; materials: string };

type Field = { id: string; label: string; placeholder: string; type?: string; required?: boolean };

const shell = "rounded-[22px] border border-[#e6ecf2] bg-white shadow-[0_9px_26px_rgba(24,43,73,0.045)]";
const initialOrders: WorkOrder[] = [
  { id: "OS-0248", customer: "Clínica Vitta", service: "Instalação de toldo articulado 32m²", origin: "Orçamento #1538", date: "20 set 2024", owner: "Equipe João", priority: "Alta", status: "Em produção", materials: "Lona bege · 2 braços · motor 45Nm" },
  { id: "OS-0247", customer: "Marina Lopes", service: "Medição técnica para toldo retrátil", origin: "Orçamento #1542", date: "21 set 2024", owner: "Equipe Carlos", priority: "Normal", status: "Agendada", materials: "Trena · nível · amostras" },
  { id: "OS-0246", customer: "Café Amora", service: "Manutenção de cobertura fixa", origin: "Chamado #817", date: "22 set 2024", owner: "Equipe Paulo", priority: "Normal", status: "Aguardando", materials: "Lona de reposição · fixadores" },
];


function PageHeader({ eyebrow, title, description, action, onAction }: { eyebrow: string; title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#f47b20]">{eyebrow}</p><h1 className="font-display text-[28px] font-extrabold tracking-[-0.055em] text-[#17324d]">{title}</h1><p className="mt-2 max-w-[680px] text-[13px] leading-5 text-[#718398]">{description}</p></div>{action && <Button onClick={onAction} className="h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white shadow-[0_6px_14px_rgba(244,123,32,0.2)] hover:bg-[#db6812]"><Plus size={16} /> {action}</Button>}</div>;
}

function SummaryCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: string }) {
  return <div className={`${shell} p-4 sm:p-5`}><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] ${tone}`}><Icon size={18} /></div><p className="text-[12px] font-semibold text-[#708096]">{label}</p><p className="mt-1 font-display text-[25px] font-extrabold tracking-[-0.05em] text-[#17324d]">{value}</p><p className="mt-1 text-[10px] text-[#9aa8b7]">{helper}</p></div>;
}

function RecordDialog({ title, fields, onClose, onSave }: { title: string; fields: Field[]; onClose: () => void; onSave: (values: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#172b4d]/35 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[500px] rounded-[26px] bg-white p-5 shadow-[0_24px_70px_rgba(23,43,77,0.24)]"><div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#f47b20]">Novo registro</p><h2 className="mt-1 font-display text-[20px] font-extrabold text-[#17324d]">{title}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-[#9aa6b6]" aria-label="Fechar"><X size={18} /></button></div><form onSubmit={(event) => { event.preventDefault(); onSave(values); }} className="grid gap-3.5">{fields.map((field) => <label key={field.id} className="grid gap-1.5 text-[11px] font-bold text-[#52647d]">{field.label}<Input required={field.required !== false} type={field.type ?? "text"} placeholder={field.placeholder} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} className="h-10 rounded-xl text-[12px]" /></label>)}<div className="mt-2 flex gap-2"><Button type="button" variant="ghost" onClick={onClose} className="h-10 flex-1 rounded-xl text-[11px] font-bold">Cancelar</Button><Button type="submit" className="h-10 flex-1 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#db6812]">Salvar <Check size={15} /></Button></div></form></div></div>;
}

function Toolbar({ query, setQuery, filter, setFilter, filters }: { query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void; filters: string[] }) {
  return <div className={`${shell} mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6b6]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar registros..." className="h-10 rounded-xl border-[#e1e7ef] pl-9 text-[11px]" /></div><div className="flex items-center gap-2"><Filter size={15} className="text-[#9aa6b6]" /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 min-w-[150px] rounded-xl border border-[#e1e7ef] bg-white px-3 text-[11px] font-bold text-[#52647d] outline-none"><option value="Todos">Todos</option>{filters.map((item) => <option key={item}>{item}</option>)}</select></div></div>;
}

function AgendaModule({ onModuleChange }: { onModuleChange: (module: ModuleKey) => void }) {
  const { records: events, setRecords: setEvents } = useCompanyRecords<EventRecord>("agenda");
  const [view, setView] = useState("Dia");
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = events.filter((event) => filter === "Todos" || event.type === filter).filter((event) => `${event.title} ${event.customer} ${event.location}`.toLowerCase().includes(query.toLowerCase()));
  return <div><PageHeader eyebrow="Operação" title="Agenda" description="Organize visitas, medições, produção, instalações, entregas e tarefas da empresa." action="Novo evento" onAction={() => setOpen(true)} /><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><SummaryCard label="Compromissos" value={String(events.length)} helper="na agenda da empresa" icon={CalendarDays} tone="bg-[#eaf2ff] text-[#1453a6]" /><SummaryCard label="Amanhã" value={String(events.filter((event) => event.time.includes("amanhã")).length)} helper="eventos cadastrados" icon={CalendarRange} tone="bg-[#f2edff] text-[#7852d6]" /><SummaryCard label="Pendentes" value={String(events.filter((event) => event.status === "Pendente").length)} helper="aguardando confirmação" icon={Clock3} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Concluídos" value={String(events.filter((event) => event.status === "Concluído").length)} helper="registros concluídos" icon={CircleCheck} tone="bg-[#eaf8f2] text-[#14835b]" /></div><div className={`${shell} mb-4 flex flex-wrap items-center justify-between gap-3 p-3`}><div className="flex rounded-xl bg-[#f4f7fa] p-1">{["Dia", "Semana", "Mês"].map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-4 py-2 text-[10px] font-extrabold ${view === item ? "bg-white text-[#17324d] shadow-sm" : "text-[#91a0b0]"}`}>{item}</button>)}</div><div className="flex items-center gap-2 text-[10px] font-semibold text-[#8b9bad]"><span className="h-2 w-2 rounded-full bg-[#f47b20]" /> Agenda da empresa <span className="rounded-lg bg-[#fff1e7] px-2 py-1 text-[#d9620d]">Visão {view.toLowerCase()}</span></div></div><Toolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} filters={["Medição", "Instalação", "Visita", "Entrega", "Produção", "Manutenção"]} /><div className={`${shell} overflow-hidden`}><div className="border-b border-[#eef1f5] p-4 sm:p-5"><div className="flex items-center justify-between"><div><h2 className="font-display text-[16px] font-extrabold text-[#17324d]">Compromissos de hoje</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Clique para abrir o contexto do atendimento.</p></div><button onClick={() => onModuleChange("instalacoes")} className="text-[10px] font-extrabold text-[#2859a6]">Ver instalações <ChevronRight size={13} className="inline" /></button></div></div><div className="divide-y divide-[#eef1f5]">{filtered.map((event) => <button key={event.id} onClick={() => toast.info(`${event.title} aberto`, { description: `${event.customer} · ${event.location}` })} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[#fbfcfd] sm:gap-4"><span className="w-[58px] shrink-0 text-[11px] font-extrabold text-[#f47b20]">{event.time}</span><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${event.tone}`}><CalendarDays size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-extrabold text-[#344861]">{event.title}</span><span className="mt-1 block truncate text-[10px] text-[#9aa6b6]">{event.customer} · {event.location}</span></span><span className="hidden rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[9px] font-bold text-[#708096] sm:inline">{event.status}</span><ChevronRight size={15} className="text-[#c4cfdb]" /></button>)}</div></div>{open && <RecordDialog title="Novo evento" fields={[{ id: "title", label: "Título do compromisso", placeholder: "Ex.: Medição · João da Silva" }, { id: "type", label: "Tipo", placeholder: "Visita, medição ou instalação" }, { id: "date", label: "Data e horário", placeholder: "Ex.: 24 set · 09:00" }, { id: "location", label: "Local", placeholder: "Rua, número e bairro" }]} onClose={() => setOpen(false)} onSave={(values) => { setEvents((current) => [{ id: `event-${Date.now()}`, time: values.date, title: values.title, type: values.type, customer: values.title, location: values.location, status: "Pendente", tone: "bg-[#fff1e7] text-[#d9620d]" }, ...current]); setOpen(false); toast.success("Evento adicionado à agenda"); }} />}</div>;
}

function NotificationsModule() {
  const { records: allNotifications, setRecords: setNotifications } = useCompanyRecords<AppNotification & { id: string }>("notifications");
  const access = useCompanyAccess();
  const notifications = allNotifications.filter((item) => !item.read);
  const dismiss = (item: AppNotification) => {
    setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, read: true } : notification));
  };
  return <div><PageHeader eyebrow="Central de alertas" title="Notificações" description="Solicitações de material e alertas automáticos da operação." action={notifications.length ? "Marcar todas como lidas" : undefined} onAction={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))} /><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><SummaryCard label="Não lidas" value={String(notifications.length)} helper="da empresa" icon={Bell} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Solicitações" value={String(notifications.filter((item) => item.title.includes("Solicitação")).length)} helper="materiais pedidos" icon={PackageCheck} tone="bg-[#eaf2ff] text-[#2859a6]" /><SummaryCard label="Operação" value={String(notifications.filter((item) => item.type === "Estoque").length)} helper="estoque e equipes" icon={Wrench} tone="bg-[#eaf8f2] text-[#14835b]" /><SummaryCard label="Sistema" value={access.companyName} helper="notificações da empresa" icon={Settings} tone="bg-[#f2edff] text-[#7852d6]" /></div><div className={shell + " overflow-hidden"}><div className="border-b border-[#eef1f5] p-5"><h2 className="font-display text-[16px] font-extrabold text-[#17324d]">Atividade para acompanhamento</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Solicitações, consumo de estoque e alertas são salvos na empresa.</p></div>{notifications.length ? <div className="divide-y divide-[#eef1f5]">{notifications.map((item) => <div key={item.id} className="flex items-start gap-3 p-4 sm:p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1e7] text-[#d9620d]"><Bell size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-extrabold text-[#344861]">{item.title}</p><span className="rounded-full bg-[#f4f6f8] px-2 py-0.5 text-[9px] font-bold text-[#8190a0]">{item.type}</span></div><p className="mt-1 text-[11px] leading-5 text-[#8d9aaa]">{item.description}</p><p className="mt-1.5 text-[10px] font-semibold text-[#b1bbc6]">{new Date(item.createdAt).toLocaleString("pt-BR")}</p></div><button onClick={() => dismiss(item)} className="rounded-lg p-2 text-[#c0cad5] hover:text-[#d9620d]" aria-label={"Marcar como lida " + item.title}><X size={15} /></button></div>)}</div> : <div className="p-10 text-center"><CircleCheck size={28} className="mx-auto text-[#1da675]" /><p className="mt-3 text-[13px] font-bold text-[#52647d]">Tudo em dia</p><p className="mt-1 text-[11px] text-[#9aa6b6]">Nenhuma notificação pendente.</p></div>}</div></div>;
}

function WorkOrdersModule() {
  const [orders, setOrders] = useState<WorkOrder[]>(initialOrders);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const visible = orders.filter((order) => filter === "Todos" || order.status === filter);
  return <div><PageHeader eyebrow="Operação" title="Emitir OS" description="Transforme orçamentos aprovados em ordens de serviço completas e rastreáveis." action="Emitir nova OS" onAction={() => setOpen(true)} /><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><SummaryCard label="OS abertas" value={String(orders.length)} helper="em toda a operação" icon={ClipboardList} tone="bg-[#eaf2ff] text-[#2859a6]" /><SummaryCard label="Em produção" value="1" helper="com prazo ativo" icon={Wrench} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Agendadas" value="1" helper="próximos 7 dias" icon={CalendarDays} tone="bg-[#f2edff] text-[#7852d6]" /><SummaryCard label="Alta prioridade" value="1" helper="requer atenção" icon={CircleAlert} tone="bg-[#fff0ec] text-[#c35c42]" /></div><div className={`${shell} mb-4 flex flex-wrap items-center justify-between gap-3 p-3`}><div className="flex items-center gap-2 text-[11px] font-bold text-[#52647d]"><SlidersHorizontal size={15} className="text-[#f47b20]" /> Filtrar por status</div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 rounded-xl border border-[#e1e7ef] bg-white px-3 text-[11px] font-bold text-[#52647d] outline-none"><option>Todos</option><option>Em produção</option><option>Agendada</option><option>Aguardando</option></select></div><div className="space-y-3">{visible.map((order) => <div key={order.id} className={`${shell} p-4 sm:p-5`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2859a6]"><ClipboardList size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-extrabold text-[#344861]">{order.id} · {order.customer}</p><span className="rounded-full bg-[#fff1e7] px-2.5 py-1 text-[9px] font-extrabold text-[#d9620d]">{order.priority}</span><span className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[9px] font-bold text-[#708096]">{order.status}</span></div><p className="mt-2 text-[11px] text-[#526b82]">{order.service}</p><div className="mt-3 grid gap-2 text-[10px] text-[#8d9aaa] sm:grid-cols-3"><span>Origem: <b className="text-[#52647d]">{order.origin}</b></span><span>Prazo: <b className="text-[#52647d]">{order.date}</b></span><span>Responsável: <b className="text-[#52647d]">{order.owner}</b></span></div><p className="mt-3 flex items-center gap-1 text-[10px] text-[#8d9aaa]"><ListChecks size={13} className="text-[#f47b20]" /> Materiais: {order.materials}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: item.status === "Aguardando" ? "Agendada" : item.status === "Agendada" ? "Em produção" : "Concluída" } : item))} className="rounded-xl bg-[#f3f7fd] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]">Avançar status</button><button onClick={() => toast.success(`${order.id} pronta para impressão`)} className="rounded-xl bg-[#f47b20] p-2 text-white" aria-label="Gerar PDF"><Download size={15} /></button></div></div></div>)}{!visible.length && <div className={`${shell} p-10 text-center text-[12px] text-[#8d9aaa]`}>Nenhuma OS neste status.</div>}</div>{open && <RecordDialog title="Emitir ordem de serviço" fields={[{ id: "customer", label: "Cliente", placeholder: "Ex.: Clínica Vitta" }, { id: "service", label: "Tipo de serviço", placeholder: "Instalação, medição ou manutenção" }, { id: "origin", label: "Orçamento ou chamado de origem", placeholder: "Ex.: Orçamento #1548" }, { id: "date", label: "Data prevista", placeholder: "Ex.: 25 set 2024" }, { id: "owner", label: "Responsável", placeholder: "Ex.: Equipe Carlos" }]} onClose={() => setOpen(false)} onSave={(values) => { setOrders((current) => [{ id: `OS-${249 + current.length}`, customer: values.customer, service: values.service, origin: values.origin, date: values.date, owner: values.owner, priority: "Normal", status: "Aguardando", materials: "A definir" }, ...current]); setOpen(false); toast.success("OS emitida com sucesso"); }} />}</div>;
}

function ReportsModule() {
  const access = useCompanyAccess();
  const { records: quotes } = useCompanyRecords<WorkflowQuote>("quotes", { enabled: access.can("manageQuotes") });
  const { records: leads } = useCompanyRecords<{ id: string; name?: string; value?: string; stage: string }>("leads", { enabled: access.can("manageCustomers") });
  const { records: workOrders } = useCompanyRecords<WorkflowOS>("work_orders", { enabled: access.can("issueOS") });
  const { records: production } = useCompanyRecords<WorkflowProduction>("production", { enabled: access.can("manageProduction") });
  const { records: installations } = useCompanyRecords<WorkflowInstallation>("installations", { enabled: access.can("manageInstallations") });
  const { records: materials } = useCompanyRecords<StockMaterial>("materials", { enabled: access.can("manageStock") || access.can("manageProduction") || access.can("manageInstallations") || access.can("requestMaterials") });
  const { records: clients } = useCompanyRecords<WorkflowClient>("customers", { enabled: access.can("manageCustomers") });
  const { records: finance } = useCompanyRecords<FinanceEntry>("finance", { enabled: access.can("viewFinancial") });
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const closedLeads = leads.filter((lead) => lead.stage === "Fechado").length;
  const completedProduction = production.filter((item) => item.status === "Concluída").length;
  const completedInstallations = installations.filter((item) => item.status === "Concluída").length;
  const lowStock = materials.filter((item) => Number(item.quantity) < Number(item.minimum));
  const openQuoteCount = quotes.filter((quote) => !["Aprovado", "Cancelado"].includes(quote.status)).length;
  const financeTotal = finance.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const reports = [
    { title: "Desempenho comercial", helper: "Leads fechados sobre os contatos cadastrados", value: leads.length ? `${Math.round(closedLeads / leads.length * 100)}%` : "—", detail: `${closedLeads} de ${leads.length} leads fechados`, icon: Sparkles, tone: "bg-[#eaf2ff] text-[#2859a6]" },
    { title: "Orçamentos", helper: "Oportunidades ainda não aprovadas ou canceladas", value: String(openQuoteCount), detail: `${quotes.length} orçamento(s) cadastrados`, icon: FileText, tone: "bg-[#fff1e7] text-[#d9620d]" },
    { title: "Produção", helper: "Ordens marcadas como concluídas", value: production.length ? `${completedProduction}/${production.length}` : "—", detail: `${workOrders.length} ordem(ns) de serviço`, icon: ClipboardList, tone: "bg-[#fff1e7] text-[#d9620d]" },
    { title: "Instalações", helper: "Instalações registradas como concluídas", value: String(completedInstallations), detail: `${installations.length} instalação(ões) cadastradas`, icon: Wrench, tone: "bg-[#eaf8f2] text-[#14835b]" },
    { title: "Saúde do estoque", helper: "Materiais abaixo do mínimo cadastrado", value: String(lowStock.length), detail: `${materials.length} material(is) cadastrados`, icon: ListChecks, tone: "bg-[#f2edff] text-[#7852d6]" },
    { title: "Financeiro", helper: access.can("viewFinancial") ? "Soma dos lançamentos financeiros cadastrados" : "Seu perfil não possui acesso aos valores financeiros", value: access.can("viewFinancial") ? money(financeTotal) : "Restrito", detail: access.can("viewFinancial") ? `${finance.length} lançamento(s)` : "Acesso controlado por permissão", icon: Wallet, tone: "bg-[#fff5db] text-[#a97810]" },
    { title: "Clientes", helper: "Cadastros vinculados à empresa", value: String(clients.length), detail: "Registros da empresa atual", icon: Users, tone: "bg-[#eaf2ff] text-[#2859a6]" },
  ];
  return <div>
    <PageHeader eyebrow="Inteligência" title="Relatórios" description="Indicadores calculados a partir dos registros da empresa. Áreas sem dados aparecem vazias, sem números de demonstração." />
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard label="Orçamentos" value={String(quotes.length)} helper="registros da empresa" icon={FileBarChart} tone="bg-[#eaf2ff] text-[#2859a6]" />
      <SummaryCard label="Leads" value={String(leads.length)} helper="contatos cadastrados" icon={Users} tone="bg-[#eaf8f2] text-[#14835b]" />
      <SummaryCard label="Ordens de serviço" value={String(workOrders.length)} helper="OS cadastradas" icon={ClipboardList} tone="bg-[#f2edff] text-[#7852d6]" />
      <SummaryCard label="Última atualização" value="Ao abrir" helper="dados consultados do banco" icon={CircleCheck} tone="bg-[#fff1e7] text-[#d9620d]" />
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {reports.map((report) => { const Icon = report.icon; return <div key={report.title} className={`${shell} p-5`}>
        <div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${report.tone}`}><Icon size={19} /></div><span className="rounded-full bg-[#f4f6f8] px-2 py-1 text-[9px] font-bold text-[#8190a0]">Dados atuais</span></div>
        <h2 className="mt-5 font-display text-[16px] font-extrabold text-[#17324d]">{report.title}</h2>
        <p className="mt-1 text-[11px] text-[#8d9aaa]">{report.helper}</p>
        <div className="mt-5 flex items-end justify-between gap-3"><strong className="break-words font-display text-[24px] font-extrabold tracking-[-0.05em] text-[#17324d]">{report.value}</strong><span className="text-right text-[10px] text-[#8d9aaa]">{report.detail}</span></div>
      </div>; })}
    </div>
  </div>;
}

function SettingsModule() {
  const access = useCompanyAccess();
  type UserSettings = { dark: boolean; camera: boolean; gps: boolean; pwa: boolean; sync: boolean; notifications: boolean };
  const settingsKey = `toldo:settings:${access.user.id}`;
  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaults: UserSettings = { dark: false, camera: true, gps: true, pwa: true, sync: true, notifications: true };
    try {
      const saved = window.localStorage.getItem(settingsKey);
      return saved ? { ...defaults, ...(JSON.parse(saved) as Partial<UserSettings>) } : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    window.localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settingsKey, settings]);
  const [editOpen, setEditOpen] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    trade_name: "", legal_name: "", document: "", phone: "", whatsapp: "", email: "",
    street: "", number: "", complement: "", neighborhood: "", city: "", state: "", postal_code: "",
  });
  const toggle = (key: keyof typeof settings) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const rows: { key: keyof typeof settings; label: string; helper: string; icon: LucideIcon }[] = [{ key: "dark", label: "Tema escuro", helper: "Use o Toldo Pro com menos brilho em campo.", icon: SlidersHorizontal }, { key: "camera", label: "Câmera", helper: "Permitir fotos para medições e instalações.", icon: Wrench }, { key: "gps", label: "Localização", helper: "Apoiar equipes com endereço e chegada.", icon: MapPin }, { key: "pwa", label: "Aplicativo instalado", helper: "Manter o acesso rápido na tela inicial.", icon: Download }, { key: "sync", label: "Sincronização automática", helper: "Enviar pendências assim que houver conexão.", icon: CalendarRange }, { key: "notifications", label: "Notificações", helper: "Receber alertas de clientes e operação.", icon: Bell }];

  const openCompanyEditor = async () => {
    if (!supabase) {
      toast.error("O acesso ao banco de dados não está configurado.");
      return;
    }
    setLoadingCompany(true);
    setEditOpen(true);
    const { data, error } = await supabase.from("companies")
      .select("trade_name, legal_name, document, phone, whatsapp, email, address")
      .eq("id", access.companyId).maybeSingle();
    if (error || !data) {
      toast.error("Não foi possível carregar os dados da empresa.", { description: error?.message });
      setLoadingCompany(false);
      return;
    }
    const address = data.address && typeof data.address === "object" ? data.address as Record<string, unknown> : {};
    setCompanyForm({
      trade_name: data.trade_name || "", legal_name: data.legal_name || "", document: data.document || "",
      phone: data.phone || "", whatsapp: data.whatsapp || "", email: data.email || "",
      street: String(address.street || address.logradouro || ""), number: String(address.number || address.numero || ""),
      complement: String(address.complement || address.complemento || ""), neighborhood: String(address.neighborhood || address.bairro || ""),
      city: String(address.city || address.cidade || ""), state: String(address.state || address.uf || ""),
      postal_code: String(address.postal_code || address.cep || ""),
    });
    setLoadingCompany(false);
  };

  const saveCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || savingCompany) return;
    if (!["admin", "administrador", "owner", "proprietario", "proprietário"].includes(String(access.role).toLowerCase())) {
      toast.error("Seu perfil não tem permissão para editar os dados da empresa.");
      return;
    }
    setSavingCompany(true);
    const address = {
      street: companyForm.street.trim(), number: companyForm.number.trim(), complement: companyForm.complement.trim(),
      neighborhood: companyForm.neighborhood.trim(), city: companyForm.city.trim(), state: companyForm.state.trim().toUpperCase(),
      postal_code: companyForm.postal_code.trim(),
    };
    const { error } = await supabase.from("companies").update({
      trade_name: companyForm.trade_name.trim(), legal_name: companyForm.legal_name.trim(),
      document: companyForm.document.trim() || null, phone: companyForm.phone.trim() || null,
      whatsapp: companyForm.whatsapp.trim() || null, email: companyForm.email.trim() || null, address,
      updated_at: new Date().toISOString(),
    }).eq("id", access.companyId);
    setSavingCompany(false);
    if (error) {
      toast.error("Não foi possível salvar os dados da empresa.", { description: error.message });
      return;
    }
    toast.success("Dados da empresa atualizados.");
    setEditOpen(false);
    await access.reloadMemberships();
  };

  const setCompanyField = (field: keyof typeof companyForm, value: string) => setCompanyForm((current) => ({ ...current, [field]: value }));
  const companyFields: { id: keyof typeof companyForm; label: string; type?: string; required?: boolean }[] = [
    { id: "trade_name", label: "Nome fantasia", required: true }, { id: "legal_name", label: "Razão social", required: true },
    { id: "document", label: "CNPJ" }, { id: "phone", label: "Telefone" }, { id: "whatsapp", label: "WhatsApp" },
    { id: "email", label: "E-mail", type: "email" }, { id: "street", label: "Rua / logradouro" }, { id: "number", label: "Número" },
    { id: "complement", label: "Complemento" }, { id: "neighborhood", label: "Bairro" }, { id: "city", label: "Cidade" },
    { id: "state", label: "UF" }, { id: "postal_code", label: "CEP" },
  ];
  return <div>
    <PageHeader eyebrow="Sistema" title="Configurações" description="Ajuste a experiência do Toldo Pro para o escritório e para as equipes de campo." />
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className={`${shell} overflow-hidden`}><div className="border-b border-[#eef1f5] p-5"><h2 className="font-display text-[16px] font-extrabold text-[#17324d]">Preferências do aplicativo</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">As escolhas ficam vinculadas ao usuário atual.</p></div><div className="divide-y divide-[#eef1f5]">{rows.map((row) => { const Icon = row.icon; return <div key={row.key} className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#2859a6]"><Icon size={17} /></div><div className="min-w-0 flex-1"><p className="text-[12px] font-extrabold text-[#344861]">{row.label}</p><p className="mt-1 text-[10px] leading-4 text-[#9aa6b6]">{row.helper}</p></div><button onClick={() => toggle(row.key)} className={`relative h-6 w-11 rounded-full transition ${settings[row.key] ? "bg-[#f47b20]" : "bg-[#d4dce5]"}`} aria-label={`Alternar ${row.label}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${settings[row.key] ? "left-6" : "left-1"}`} /></button></div>; })}</div></div>
      <div className="space-y-5"><div className="rounded-[22px] bg-[#17324d] p-5 text-white shadow-[0_12px_28px_rgba(23,50,77,0.14)]"><div className="flex items-center gap-2 text-[#9fb6cd]"><ShieldCheck size={17} /><span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">Empresa e segurança</span></div><h2 className="mt-4 font-display text-[19px] font-extrabold">{access.companyName || "Sua empresa"}</h2><p className="mt-2 text-[11px] leading-5 text-[#b2c3d4]">Edite o cadastro da empresa, contatos e endereço.</p><Button onClick={openCompanyEditor} className="mt-5 h-10 w-full rounded-xl bg-white/10 text-[10px] font-bold text-white hover:bg-white/15">Editar dados da empresa</Button></div><div className={`${shell} p-5`}><div className="flex items-center gap-2"><Settings size={17} className="text-[#f47b20]" /><h2 className="font-display text-[16px] font-extrabold text-[#17324d]">Agente Toldo Pro IA</h2></div><p className="mt-2 text-[11px] leading-5 text-[#8d9aaa]">A assistente usa a sessão, empresa e permissões atuais. Não existe um banco separado.</p><button onClick={() => toast.success("Preferências da IA atualizadas")} className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#f3f7fd] px-3 py-2.5 text-[10px] font-extrabold text-[#2859a6]">Gerenciar preferências <ChevronRight size={14} /></button></div></div>
    </div>
    {editOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10243a]/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="company-edit-title"><form onSubmit={saveCompany} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="company-edit-title" className="text-lg font-extrabold text-[#17324d]">Editar dados da empresa</h2><p className="mt-1 text-sm text-[#718096]">As alterações serão salvas no cadastro desta empresa.</p></div><button type="button" onClick={() => setEditOpen(false)} className="rounded-lg p-2 text-[#718096] hover:bg-slate-100" aria-label="Fechar"><X size={18} /></button></div>{loadingCompany ? <p className="py-10 text-center text-sm text-slate-500">Carregando dados da empresa...</p> : <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{companyFields.map((field) => <label key={field.id} className="block"><span className="mb-1.5 block text-xs font-bold text-[#344861]">{field.label}</span><Input value={companyForm[field.id]} onChange={(e) => setCompanyField(field.id, e.target.value)} type={field.type || "text"} required={field.required} maxLength={field.id === "state" ? 2 : undefined} className="h-10 rounded-xl" /></label>)}</div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancelar</Button><Button type="submit" disabled={savingCompany} className="rounded-xl bg-[#f47b20] text-white hover:bg-[#df6a13]">{savingCompany ? "Salvando..." : "Salvar alterações"}</Button></div></>}</form></div>}
  </div>;
}

export function OperationalView({ module, onModuleChange }: { module: OperationalModule; onModuleChange: (module: ModuleKey) => void }) {
  if (module === "agenda") return <AgendaModule onModuleChange={onModuleChange} />;
  if (module === "notificacoes") return <NotificationsModule />;
  if (module === "os") return <WorkOrdersModule />;
  if (module === "financeiro") return <FinanceView />;
  if (module === "relatorios") return <ReportsModule />;
  return <SettingsModule />;
}
