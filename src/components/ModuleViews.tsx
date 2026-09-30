import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Bot,
  Boxes,
  CalendarDays,
  CalendarRange,
  Camera,
  ClipboardList,
  DollarSign,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  CloudOff,
  Download,
  FileBarChart,
  FileText,
  Filter,
  Hammer,
  ListChecks,
  MapPin,
  MessageSquare,
  Mic,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wallet,
  Wifi,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OperationalView } from "@/components/OperationalViews";
import { WorkflowView } from "@/components/WorkflowViews";
import { InventoryView } from "@/components/InventoryView";
import { InstallationsView as WorkflowInstallationsView } from "@/components/InstallationsView";
import { toast } from "sonner";

export type ModuleKey = "painel" | "agenda" | "notificacoes" | "clientes" | "vendas" | "orcamentos" | "os" | "operacao" | "estoque" | "instalacoes" | "financeiro" | "relatorios" | "equipe" | "gestao" | "agente" | "configuracoes";
type ModuleViewProps = { module: ModuleKey; onModuleChange: (module: ModuleKey) => void };
type StatCardProps = { label: string; value: string; helper: string; icon: LucideIcon; tone: string };
type Field = { id: string; label: string; placeholder: string; type?: string; required?: boolean };

type Customer = { id: string; name: string; type: string; contact: string; status: string; value: string };
type Quote = { id: string; customer: string; product: string; value: string; status: string; date: string };
type Production = { id: string; customer: string; product: string; owner: string; due: string; status: string; priority: string };
type Material = { id: string; name: string; sku: string; current: string; minimum: string; cost: string; status: string };
type Installation = { id: string; time: string; customer: string; address: string; team: string; status: string; iconName?: string };

const initialCustomers: Customer[] = [
  { id: "customer-1", name: "Marina Lopes", type: "Pessoa física", contact: "(11) 98745-2201", status: "Em negociação", value: "R$ 8.450" },
  { id: "customer-2", name: "Clínica Vitta", type: "Pessoa jurídica", contact: "(11) 3055-8800", status: "Instalação agendada", value: "R$ 16.800" },
  { id: "customer-3", name: "Café Amora", type: "Pessoa jurídica", contact: "(11) 99821-4410", status: "Novo contato", value: "R$ 5.200" },
  { id: "customer-4", name: "Ana Beatriz Souza", type: "Pessoa física", contact: "(11) 99610-7742", status: "Medição marcada", value: "R$ 9.750" },
];
const initialQuotes: Quote[] = [
  { id: "#1542", customer: "Marina Lopes", product: "Toldo retrátil · 18m²", value: "R$ 8.450", status: "Aprovado", date: "18 set 2024" },
  { id: "#1538", customer: "Clínica Vitta", product: "Toldo articulado · 32m²", value: "R$ 16.800", status: "Em negociação", date: "17 set 2024" },
  { id: "#1534", customer: "Café Amora", product: "Cobertura fixa · 12m²", value: "R$ 5.200", status: "Enviado", date: "16 set 2024" },
];
const initialProduction: Production[] = [
  { id: "OP-084", customer: "Clínica Vitta", product: "Toldo articulado 32m²", owner: "Equipe João", due: "20 set", status: "Em produção", priority: "Alta" },
  { id: "OP-083", customer: "Marina Lopes", product: "Toldo retrátil 18m²", owner: "Equipe Carlos", due: "21 set", status: "Acabamento", priority: "Normal" },
];
const initialMaterials: Material[] = [
  { id: "material-1", name: "Lona bege 3,00m", sku: "LON-BEG-300", current: "18 m", minimum: "25 m", cost: "R$ 48,90/m", status: "Abaixo do mínimo" },
  { id: "material-2", name: "Braço articulado 2,50m", sku: "BRA-ART-250", current: "42 un.", minimum: "20 un.", cost: "R$ 386,00", status: "Disponível" },
  { id: "material-3", name: "Motor tubular 45Nm", sku: "MOT-TUB-045", current: "7 un.", minimum: "10 un.", cost: "R$ 812,00", status: "Abaixo do mínimo" },
];
const initialInstallations: Installation[] = [
  { id: "installation-1", time: "Hoje · 10:00", customer: "Clínica Vitta", address: "Rua dos Pinheiros, 820", team: "Equipe João · 3 pessoas", status: "A caminho", iconName: "truck" },
  { id: "installation-2", time: "Amanhã · 08:30", customer: "Marina Lopes", address: "Rua Harmonia, 245 · Vila Madalena", team: "Equipe Carlos · 2 pessoas", status: "Agendada", iconName: "calendar" },
];

function useStoredList<T>(key: string, initial: T[]) {
  const [items, setItems] = useState<T[]>(() => {
    const saved = window.localStorage.getItem(key);
    if (!saved) return initial;
    try { return JSON.parse(saved) as T[]; } catch { return initial; }
  });
  useEffect(() => { window.localStorage.setItem(key, JSON.stringify(items)); }, [items, key]);
  return [items, setItems] as const;
}

function CreateDialog({ title, fields, onClose, onSave }: { title: string; fields: Field[]; onClose: () => void; onSave: (values: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(values); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#172b4d]/30 p-3 backdrop-blur-[2px] sm:items-center"><div className="w-full max-w-[480px] rounded-[24px] border border-[#e9edf3] bg-white p-5 shadow-[0_24px_70px_rgba(23,43,77,0.24)]"><div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f47b20]">Novo registro</p><h2 className="mt-2 font-display text-[20px] font-bold text-[#172b4d]">{title}</h2></div><button onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-[#9aa6b6]">×</button></div><form onSubmit={submit} className="grid gap-4">{fields.map((field) => <label key={field.id} className="grid gap-1.5 text-[11px] font-bold text-[#52647d]">{field.label}<Input type={field.type ?? "text"} required={field.required !== false} placeholder={field.placeholder} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} className="h-10 rounded-xl text-[12px]" /></label>)}<div className="mt-2 flex gap-2"><Button type="button" variant="ghost" onClick={onClose} className="h-10 flex-1 rounded-xl text-[11px] font-bold">Cancelar</Button><Button type="submit" className="h-10 flex-1 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#db6812]">Salvar registro <Check size={15} /></Button></div></form></div></div>;
}

function StatCard({ label, value, helper, icon: Icon, tone }: StatCardProps) {
  return <div className="rounded-[20px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] ${tone}`}><Icon size={19} /></div><p className="text-[12px] font-semibold text-[#708096]">{label}</p><p className="mt-1 font-display text-[26px] font-bold tracking-[-0.04em] text-[#172b4d]">{value}</p><p className="mt-1 text-[11px] text-[#9aa6b6]">{helper}</p></div>;
}

function PageHeading({ eyebrow, title, description, action, onAction }: { eyebrow: string; title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#f47b20]">{eyebrow}</p><h1 className="font-display text-[28px] font-bold tracking-[-0.05em] text-[#172b4d]">{title}</h1><p className="mt-2 text-[13px] text-[#708096]">{description}</p></div>{action && <Button onClick={onAction} className="h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white shadow-[0_6px_14px_rgba(244,123,32,0.2)] hover:bg-[#db6812]"><Plus size={16} /> {action}</Button>}</div>;
}

function CustomersView() {
  const [customers, setCustomers] = useStoredList("toldo:customers", initialCustomers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => customers.filter((item) => `${item.name} ${item.contact}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  return <div><PageHeading eyebrow="Relacionamento" title="Clientes e CRM" description="Uma visão completa de clientes, contatos e histórico comercial." action="Novo cliente" onAction={() => setOpen(true)} /><div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3"><StatCard label="Clientes ativos" value={String(customers.length)} helper="salvos neste dispositivo" icon={Users} tone="bg-[#eaf2ff] text-[#1453a6]" /><StatCard label="Contatos em negociação" value="38" helper="R$ 142.650 no funil" icon={MessageSquare} tone="bg-[#fff1e7] text-[#d9620d]" /><StatCard label="Aniversários próximos" value="6" helper="nos próximos 7 dias" icon={CircleCheck} tone="bg-[#eaf8f2] text-[#14835b]" /></div><div className="overflow-hidden rounded-[22px] border border-[#e9edf3] bg-white shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="flex flex-col justify-between gap-3 border-b border-[#eef1f5] p-5 sm:flex-row sm:items-center"><div><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Clientes cadastrados</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Os novos registros ficam salvos para a próxima visita.</p></div><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6b6]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente..." className="h-9 w-full rounded-xl border-[#e1e7ef] pl-9 text-[11px] sm:w-[230px]" /></div></div><div className="divide-y divide-[#eef1f5]">{filtered.map((customer) => <button key={customer.id} onClick={() => toast.info(`Abrindo histórico de ${customer.name}`)} className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-[#fbfcfd] sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e4b89c] text-[11px] font-bold text-[#6d3e2a]">{customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="min-w-0"><p className="truncate text-[12px] font-bold text-[#344861]">{customer.name}</p><p className="mt-1 text-[11px] text-[#9aa6b6]">{customer.type} · {customer.contact}</p></div></div><span className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[10px] font-bold text-[#708096]">{customer.status}</span><span className="w-24 text-right text-[12px] font-bold text-[#172b4d]">{customer.value}</span><ChevronRight size={16} className="text-[#c4cfdb]" /></button>)}</div></div>{open && <CreateDialog title="Cadastrar cliente" fields={[{ id: "name", label: "Nome ou razão social", placeholder: "Ex.: João da Silva" }, { id: "contact", label: "Telefone ou WhatsApp", placeholder: "(11) 99999-9999" }, { id: "value", label: "Valor estimado", placeholder: "R$ 0,00" }]} onClose={() => setOpen(false)} onSave={(values) => { setCustomers((current) => [{ id: `customer-${Date.now()}`, name: values.name, type: "Pessoa física", contact: values.contact, status: "Novo contato", value: values.value || "R$ 0" }, ...current]); setOpen(false); toast.success("Cliente salvo com sucesso"); }} />}</div>;
}

function SalesView() {
  const [leads, setLeads] = useStoredList("toldo:leads", [{ id: "lead-1", name: "Residencial Jardins", value: "R$ 12.800", stage: "Novo contato" }, { id: "lead-2", name: "Café Amora", value: "R$ 5.200", stage: "Negociação" }]);
  const [open, setOpen] = useState(false);
  return <div><PageHeading eyebrow="Comercial" title="Leads e vendas" description="Acompanhe cada oportunidade desde o primeiro contato até o fechamento." action="Novo contato" onAction={() => setOpen(true)} /><div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4"><StatCard label="Contatos no funil" value={String(leads.length)} helper="salvos localmente" icon={Users} tone="bg-[#eaf2ff] text-[#1453a6]" /><StatCard label="Valor em negociação" value="R$ 142 mil" helper="32 oportunidades" icon={Wallet} tone="bg-[#fff1e7] text-[#d9620d]" /><StatCard label="Conversão média" value="32,4%" helper="+4,2% no período" icon={CircleCheck} tone="bg-[#eaf8f2] text-[#14835b]" /><StatCard label="Tempo até fechar" value="8,6 dias" helper="-1,4 dia no período" icon={Clock3} tone="bg-[#f2edff] text-[#7852d6]" /></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Funil comercial</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Os novos contatos aparecem automaticamente no primeiro estágio.</p></div></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{["Novo contato", "Negociação", "Fechado"].map((stage) => <div key={stage} className="rounded-2xl bg-[#f7f9fb] p-3"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold text-[#718096]">{stage}</span><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-[#8d9aaa]">{leads.filter((lead) => lead.stage === stage).length}</span></div><div className="space-y-2">{leads.filter((lead) => lead.stage === stage).map((lead) => <button key={lead.id} onClick={() => setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, stage: stage === "Novo contato" ? "Negociação" : "Fechado" } : item))} className="w-full rounded-xl border border-[#edf1f5] bg-white p-3 text-left shadow-sm"><p className="text-[11px] font-bold text-[#344861]">{lead.name}</p><p className="mt-1 text-[10px] text-[#9aa6b6]">{lead.value}</p><p className="mt-2 text-[9px] font-bold text-[#1453a6]">Clique para avançar</p></button>)}</div></div>)}</div></div>{open && <CreateDialog title="Cadastrar contato" fields={[{ id: "name", label: "Cliente ou empresa", placeholder: "Ex.: Residencial Jardins" }, { id: "value", label: "Valor estimado", placeholder: "R$ 0,00" }]} onClose={() => setOpen(false)} onSave={(values) => { setLeads((current) => [{ id: `lead-${Date.now()}`, name: values.name, value: values.value || "R$ 0", stage: "Novo contato" }, ...current]); setOpen(false); toast.success("Contato salvo no funil"); }} />}</div>;
}

function QuotesView() {
  const [quotes, setQuotes] = useStoredList("toldo:quotes", initialQuotes);
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState(18);
  const [projection, setProjection] = useState(3.5);
  const material = area * 84;
  const labor = area * 42;
  const installation = 480;
  const suggested = (material + labor + installation) * 1.45;
  return <div><PageHeading eyebrow="Propostas" title="Orçamentos e precificação" description="Monte propostas com custo, margem, desconto e preço sugerido." action="Novo orçamento" onAction={() => setOpen(true)} /><div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="overflow-hidden rounded-[22px] border border-[#e9edf3] bg-white shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="border-b border-[#eef1f5] p-5"><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Orçamentos recentes</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Registros salvos neste dispositivo.</p></div><div className="divide-y divide-[#eef1f5]">{quotes.map((quote) => <button key={quote.id} onClick={() => toast.info(`Abrindo orçamento ${quote.id}`)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[#fbfcfd]"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#1453a6]"><FileText size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-[12px] font-bold text-[#344861]">{quote.id} · {quote.customer}</p><span className="rounded-full bg-[#f3f5f8] px-2 py-0.5 text-[9px] font-bold text-[#718096]">{quote.status}</span></div><p className="mt-1 truncate text-[11px] text-[#9aa6b6]">{quote.product} · {quote.date}</p></div><p className="text-[12px] font-bold text-[#172b4d]">{quote.value}</p><ChevronRight size={15} className="text-[#c4cfdb]" /></button>)}</div></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f47b20]">Calculadora rápida</p><h2 className="mt-2 font-display text-[18px] font-bold text-[#172b4d]">Preço sugerido</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Materiais + mão de obra + instalação + margem.</p></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-[11px] font-bold text-[#52647d]">Área (m²)<Input type="number" value={area} onChange={(event) => setArea(Number(event.target.value))} className="h-10 rounded-xl text-[12px]" /></label><label className="grid gap-1.5 text-[11px] font-bold text-[#52647d]">Projeção (m)<Input type="number" value={projection} onChange={(event) => setProjection(Number(event.target.value))} className="h-10 rounded-xl text-[12px]" /></label></div><div className="mt-5 space-y-3 rounded-2xl bg-[#f8fafc] p-4 text-[11px]"><div className="flex justify-between text-[#718096]"><span>Materiais</span><b className="text-[#344861]">R$ {material.toLocaleString("pt-BR")}</b></div><div className="flex justify-between text-[#718096]"><span>Mão de obra</span><b className="text-[#344861]">R$ {labor.toLocaleString("pt-BR")}</b></div><div className="flex justify-between text-[#718096]"><span>Instalação e deslocamento</span><b className="text-[#344861]">R$ {installation.toLocaleString("pt-BR")}</b></div><div className="flex justify-between border-t border-[#e4eaf1] pt-3 text-[#718096]"><span>Margem aplicada</span><b className="text-[#15916a]">45%</b></div></div><div className="mt-5 flex items-end justify-between"><span className="text-[11px] font-bold text-[#718096]">Preço sugerido</span><strong className="font-display text-[26px] font-bold text-[#f47b20]">R$ {suggested.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong></div><Button onClick={() => { setQuotes((current) => [{ id: `#${1543 + current.length}`, customer: "Novo orçamento", product: `${area}m² · projeção ${projection}m`, value: `R$ ${suggested.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, status: "Rascunho", date: "Agora" }, ...current]); toast.success("Orçamento salvo"); }} className="mt-5 h-10 w-full rounded-xl bg-[#172b4d] text-[11px] font-bold hover:bg-[#274263]">Salvar este orçamento <Check size={15} /></Button></div></div>{open && <CreateDialog title="Cadastrar orçamento" fields={[{ id: "customer", label: "Cliente", placeholder: "Ex.: João da Silva" }, { id: "product", label: "Produto ou modelo", placeholder: "Ex.: Toldo retrátil" }, { id: "value", label: "Preço", placeholder: "R$ 0,00" }]} onClose={() => setOpen(false)} onSave={(values) => { setQuotes((current) => [{ id: `#${1543 + current.length}`, customer: values.customer, product: values.product, value: values.value, status: "Rascunho", date: "Agora" }, ...current]); setOpen(false); toast.success("Orçamento salvo"); }} />}</div>;
}

function ProductionView({ onModuleChange }: ModuleViewProps) {
  const [orders, setOrders] = useStoredList("toldo:production", initialProduction);
  const [, setInst] = useStoredList("toldo:installations", initialInstallations);
  const [open, setOpen] = useState(false);
  return <div><PageHeading eyebrow="Operação" title="Produção, estoque e instalações" description="Mantenha materiais, ordens e equipes sincronizados em cada entrega." action="Nova ordem de produção" onAction={() => setOpen(true)} /><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><StatCard label="Ordens em produção" value={String(orders.length)} helper="salvas neste dispositivo" icon={Hammer} tone="bg-[#fff1e7] text-[#d9620d]" /><StatCard label="Itens em estoque" value="1.284" helper="2 alertas de mínimo" icon={Boxes} tone="bg-[#eaf2ff] text-[#1453a6]" /><StatCard label="Instalações agendadas" value="24" helper="4 nesta semana" icon={Wrench} tone="bg-[#eaf8f2] text-[#14835b]" /></div><div className="mt-5 rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Ordens de produção</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Clique em uma ordem para avançar o status.</p></div><button onClick={() => onModuleChange("estoque")} className="text-[11px] font-bold text-[#1453a6]">Ver materiais</button></div><div className="space-y-3">{orders.map((order) => <button key={order.id} onClick={() => setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: item.status === "Aguardando produção" ? "Em produção" : item.status === "Em produção" ? "Acabamento" : "Pronto" } : item))} className="flex w-full flex-col gap-3 rounded-2xl border border-[#edf1f5] p-4 text-left transition hover:border-[#f3b07f] sm:flex-row sm:items-center"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff1e7] text-[#d9620d]"><Hammer size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-[12px] font-bold text-[#344861]">{order.id} · {order.customer}</p><span className="rounded-full bg-[#fff1e7] px-2 py-0.5 text-[9px] font-bold text-[#d9620d]">{order.priority}</span></div><p className="mt-1 truncate text-[11px] text-[#9aa6b6]">{order.product} · {order.owner}</p></div><div className="sm:text-right"><p className="text-[11px] font-bold text-[#52647d]">{order.status}</p><p className="mt-1 text-[10px] text-[#9aa6b6]">Prazo: {order.due}</p></div><ChevronRight size={15} className="text-[#c4cfdb]" /></button>)}</div></div>

{/* Botão para mover ordens prontas para instalação */}
{orders.some((o) => o.status === "Pronto") && (
  <Button
    onClick={() => {
      const pronto = orders.filter((o) => o.status === "Pronto");
      setInst((current) => {
        const newInstalls = pronto.map((order) => ({
          id: `install-${Date.now()}-${order.id}`,
          time: `Hoje ${new Date().toLocaleTimeString()}`,
          customer: order.customer,
          address: `Produção: ${order.id} - ${order.product}`,
          team: order.owner || "Equipe Padrão",
          status: "Agendada",
        }));
        return [...current, ...newInstalls];
      });
      toast.success(`${pronto.length} ordem(ns) movida(s) para instalação`);
      onModuleChange("instalacoes");
    }}
    className="mt-4 w-full rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#db6812]"
  >
    Mover ordens prontas para instalação
  </Button>
)}

{open && <CreateDialog title="Nova ordem de produção" fields={[{ id: "customer", label: "Cliente", placeholder: "Ex.: Clínica Vitta" }, { id: "product", label: "Toldo ou produto", placeholder: "Ex.: Toldo articulado 32m²" }, { id: "due", label: "Prazo", placeholder: "Ex.: 25 set" }]} onClose={() => setOpen(false)} onSave={(values) => { setOrders((current) => [{ id: `OP-${85 + current.length}`, customer: values.customer, product: values.product, owner: "A definir", due: values.due, status: "Aguardando produção", priority: "Normal" }, ...current]); setOpen(false); toast.success("Ordem de produção salva"); }} />}</div>;
}

function ManagementView() {
  const [users, setUsers] = useStoredList("toldo:users", [{ id: "user-1", name: "Rafael Silva", role: "Administrador", last: "Agora", active: true }, { id: "user-2", name: "João Martins", role: "Produção", last: "há 18 min", active: true }, { id: "user-3", name: "Carolina Alves", role: "Vendas", last: "há 1h", active: true }]);
  const [open, setOpen] = useState(false);
  return <div><PageHeading eyebrow="Administração" title="Empresa, equipe e permissões" description="Mantenha o acesso de cada pessoa alinhado ao seu papel na empresa." action="Convidar usuário" onAction={() => setOpen(true)} /><div className="grid grid-cols-1 gap-5 xl:grid-cols-[.9fr_1.1fr]"><div className="space-y-5"><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#172b4d] text-[16px] font-black text-white">TS</div><div><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Toldos Silva & Cia</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">CNPJ 12.345.678/0001-90 · São Paulo, SP</p></div></div><Button variant="ghost" className="mt-4 h-9 w-full rounded-xl text-[11px] font-bold text-[#1453a6] hover:bg-[#f3f7fd]" onClick={() => toast.info("Dados da empresa disponíveis para edição")}>Editar dados da empresa</Button></div><div className="rounded-[22px] bg-[#172b4d] p-5 text-white shadow-[0_10px_26px_rgba(23,43,77,0.16)]"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#8fe0bd]" /><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a5bbd3]">Segurança</span></div><h2 className="mt-4 font-display text-[18px] font-bold">Controle por perfil</h2><p className="mt-2 text-[11px] leading-5 text-[#afc0d3]">Cada usuário recebe apenas as permissões necessárias para sua função.</p></div></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="mb-5"><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Usuários e permissões</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Registros salvos neste dispositivo.</p></div><div className="space-y-2">{users.map((person) => <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-[#edf1f5] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf2ff] text-[10px] font-bold text-[#1453a6]">{person.name.split(" ").map((item) => item[0]).join("")}</div><div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-[#344861]">{person.name}</p><p className="mt-1 text-[10px] text-[#9aa6b6]">{person.role} · Último acesso {person.last}</p></div><span className={`h-2 w-2 rounded-full ${person.active ? "bg-[#1da675]" : "bg-[#cbd4df]"}`} /><button onClick={() => setUsers((current) => current.filter((item) => item.id !== person.id))} className="rounded-lg px-2 text-[#9aa6b6] hover:text-[#d9620d]" aria-label={`Excluir ${person.name}`}>×</button></div>)}</div></div></div>{open && <CreateDialog title="Convidar usuário" fields={[{ id: "name", label: "Nome completo", placeholder: "Ex.: Carlos Mendes" }, { id: "role", label: "Perfil", placeholder: "Ex.: Instalador" }]} onClose={() => setOpen(false)} onSave={(values) => { setUsers((current) => [{ id: `user-${Date.now()}`, name: values.name, role: values.role, last: "Convite enviado", active: true }, ...current]); setOpen(false); toast.success("Usuário salvo e convite preparado"); }} />}</div>;
}

function AgentView() {
  const [online, setOnline] = useState(true);
  const [command, setCommand] = useState("");
  const [queue, setQueue] = useStoredList("toldo:sync-queue", ["Foto da medição · Residência Ana", "Observação da instalação · Clínica Vitta"]);
  const [messages, setMessages] = useStoredList("toldo:agent-messages", [{ from: "ai", text: "Olá, Rafael! Estou conectado ao Toldo Pro e pronto para ajudar." }]);
  const send = (text = command) => { if (!text.trim()) return; setMessages((current) => [...current, { from: "user", text }, { from: "ai", text: online ? "Entendi. Vou consultar seus dados e preparar essa ação com segurança." : "Comando guardado na fila offline. Vou sincronizar quando a internet voltar." }]); setCommand(""); if (!online) setQueue((current) => [...current, text]); };
  return <div><PageHeading eyebrow="Extensão inteligente" title="Agente Toldo Pro IA" description="Converse, consulte a operação e registre atividades mesmo sem internet." action={online ? "Testar modo offline" : "Voltar ao online"} onAction={() => setOnline((current) => !current)} /><div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="overflow-hidden rounded-[22px] border border-[#e9edf3] bg-white shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="flex items-center justify-between border-b border-[#eef1f5] bg-[#172b4d] px-5 py-4 text-white"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f47b20]"><Bot size={18} /></div><div><p className="text-[12px] font-bold">Toldo Pro IA</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#b3c4d8]"><span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-[#65d7a5]" : "bg-[#f07c70]"}`} /> {online ? "Conectado ao Toldo Pro" : "Offline · trabalhando localmente"}</p></div></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${online ? "bg-[#1f795c] text-[#d5f7e8]" : "bg-[#884b49] text-[#ffe0db]"}`}>{online ? "ONLINE" : "OFFLINE"}</span></div><div className="min-h-[330px] space-y-3 bg-[#f8fafc] p-5">{messages.map((message, index) => <div key={`${message.text}-${index}`} className={`max-w-[78%] rounded-2xl p-3.5 text-[12px] leading-5 ${message.from === "user" ? "ml-auto rounded-tr-md bg-[#f47b20] text-white" : "rounded-tl-md bg-white text-[#52647d] shadow-sm"}`}>{message.text}</div>)}<div className="flex flex-wrap gap-2 pt-2"><button onClick={() => send("Quais instalações eu tenho amanhã?")} className="rounded-full border border-[#dfe6ef] bg-white px-3 py-2 text-[10px] font-bold text-[#52647d] hover:border-[#f3b07f] hover:text-[#d9620d]">Instalações de amanhã</button><button onClick={() => send("Crie uma lista de compras com os materiais abaixo do mínimo.")} className="rounded-full border border-[#dfe6ef] bg-white px-3 py-2 text-[10px] font-bold text-[#52647d] hover:border-[#f3b07f] hover:text-[#d9620d]">Lista de compras</button></div></div><div className="flex items-center gap-2 border-t border-[#eef1f5] p-4"><button onClick={() => toast.info("Comando de voz pronto para integração")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e1e7ef] text-[#1453a6]" aria-label="Falar com a IA"><Mic size={17} /></button><Input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder="Digite um comando para a IA..." className="h-10 rounded-xl text-[11px]" /><button onClick={() => send()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f47b20] text-white" aria-label="Enviar comando"><ArrowRight size={17} /></button></div></div><div className="space-y-5"><div className={`rounded-[22px] p-5 text-white shadow-[0_10px_26px_rgba(23,43,77,0.16)] ${online ? "bg-[#172b4d]" : "bg-[#6d3d3c]"}`}><div className="flex items-center gap-2">{online ? <Wifi size={16} /> : <CloudOff size={16} />}<span className="text-[11px] font-bold uppercase tracking-[0.12em]">Sincronização</span></div><h2 className="mt-4 font-display text-[20px] font-bold">{online ? "Tudo sincronizado" : `${queue.length} operações pendentes`}</h2><p className="mt-2 text-[11px] leading-5 text-white/70">{online ? "As ações autorizadas estão atualizadas com o sistema principal." : "Seus registros ficam protegidos no aparelho até a conexão voltar."}</p><div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4 text-[10px] font-bold"><span>{online ? "Última sincronização agora" : "Fila persistida localmente"}</span><button onClick={() => { setQueue([]); setOnline(true); toast.success("Fila sincronizada com sucesso"); }} className="flex items-center gap-1.5 text-[#f7a66c]"><RefreshCw size={13} /> Sincronizar</button></div></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,77,0.04)]"><div className="flex items-center justify-between"><div><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Fila de sincronização</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Operações registradas no celular.</p></div><span className="rounded-full bg-[#fff1e7] px-2 py-1 text-[10px] font-bold text-[#d9620d]">{queue.length}</span></div><div className="mt-4 space-y-2">{queue.length ? queue.map((item, index) => <div key={`${item}-${index}`} className="flex items-start gap-2 rounded-xl bg-[#f8fafc] p-3"><Clock3 size={14} className="mt-0.5 shrink-0 text-[#d9620d]" /><p className="text-[10px] leading-4 text-[#52647d]">{item}</p></div>) : <div className="flex items-center gap-2 rounded-xl bg-[#eaf8f2] p-3 text-[10px] font-bold text-[#14835b]"><Check size={14} /> Tudo sincronizado</div>}</div></div><div className="rounded-[22px] border border-[#f4d5be] bg-[#fff8f3] p-5"><div className="flex items-center gap-2 text-[#d9620d]"><Camera size={16} /><span className="text-[11px] font-bold uppercase tracking-[0.12em]">Campo offline</span></div><p className="mt-3 text-[12px] leading-5 text-[#9b6a4f]">Fotos, medidas, observações e conclusões de instalação podem ser registradas sem sinal.</p></div></div></div></div>;
}

export function ModuleView({ module, onModuleChange }: ModuleViewProps) {
  if (module === "vendas") return <WorkflowView module="clientes" onModuleChange={onModuleChange} />;
  if (module === "clientes" || module === "orcamentos" || module === "os" || module === "operacao" || module === "equipe" || module === "gestao") return <WorkflowView module={module} onModuleChange={onModuleChange} />;
  if (module === "agenda" || module === "notificacoes" || module === "financeiro" || module === "relatorios" || module === "configuracoes") return <OperationalView module={module} onModuleChange={onModuleChange} />;
  if (module === "estoque") return <InventoryView />;
  if (module === "instalacoes") return <WorkflowInstallationsView />;
  if (module === "agente") return <AgentView />;
  return null;
}
