import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  CircleHelp,
  Command,
  FileBarChart,
  FileText,
  Hammer,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Settings,
  Sparkles,
  Truck,
  UserRound,
  Users,
  Wallet,
  Wifi,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModuleView, type ModuleKey } from "@/components/ModuleViews";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { WorkflowRole } from "@/lib/workflowData";
import type { CompanyAccess } from "@/lib/CompanyAccessContext";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import type { WorkflowClient, WorkflowOS, WorkflowQuote, WorkflowProduction, WorkflowInstallation } from "@/lib/workflowData";
import type { StockMaterial, AppNotification } from "@/lib/operationsStore";
import type { FinanceEntry } from "@/components/FinanceView";

const navGroups = [
  { label: "Visão geral", items: [
    { label: "Painel", module: "painel" as ModuleKey, icon: LayoutDashboard },
    { label: "Agenda", module: "agenda" as ModuleKey, count: 8, icon: CalendarDays },
    { label: "Notificações", module: "notificacoes" as ModuleKey, count: 4, icon: Bell },
  ] },
  { label: "Operação", items: [
    { label: "CRM", module: "vendas" as ModuleKey, icon: Users },
    { label: "Clientes", module: "clientes" as ModuleKey, icon: UserRound },
    { label: "Contatos e vendas", module: "vendas" as ModuleKey, count: 12, icon: BarChart3 },
    { label: "Orçamentos", module: "orcamentos" as ModuleKey, icon: FileText },
    { label: "Emitir OS", module: "os" as ModuleKey, icon: ClipboardList },
    { label: "Produção", module: "operacao" as ModuleKey, icon: Hammer },
    { label: "Instalações", module: "instalacoes" as ModuleKey, icon: Wrench },
    { label: "Estoque", module: "estoque" as ModuleKey, icon: Boxes },
  ] },
  { label: "Gestão", items: [
    { label: "Financeiro", module: "financeiro" as ModuleKey, icon: Wallet },
    { label: "Relatórios", module: "relatorios" as ModuleKey, icon: FileBarChart },
    { label: "Equipe e permissões", module: "equipe" as ModuleKey, icon: UserRound },
  ] },
  { label: "Tecnologia", items: [
    { label: "Agente Toldo Pro IA", module: "agente" as ModuleKey, count: 3, icon: Sparkles },
    { label: "Configurações", module: "configuracoes" as ModuleKey, icon: Settings },
  ] },
];

const metrics = [
  { label: "Faturamento", value: "R$ 184.620", trend: "+12,8%", helper: "em relação ao mês anterior", icon: Wallet, tone: "bg-[#fff1e7] text-[#d9620d]" },
  { label: "Orçamentos abertos", value: "38", trend: "+6", helper: "nos últimos 7 dias", icon: FileText, tone: "bg-[#eaf2ff] text-[#1453a6]" },
  { label: "Taxa de conversão", value: "32,4%", trend: "+4,2%", helper: "em relação ao mês anterior", icon: BarChart3, tone: "bg-[#eaf8f2] text-[#14835b]" },
  { label: "Instalações no mês", value: "24", trend: "3 hoje", helper: "4 em atraso", icon: Hammer, tone: "bg-[#f2edff] text-[#7852d6]" },
];

const agenda = [
  { time: "08:30", type: "Medição", title: "Residência Ana Beatriz", subtitle: "Vila Madalena · Toldo retrátil", color: "bg-[#fff1e7] text-[#d9620d]", icon: Hammer },
  { time: "10:00", type: "Instalação", title: "Clínica Vitta", subtitle: "Pinheiros · Equipe João", color: "bg-[#eaf2ff] text-[#1453a6]", icon: Wrench },
  { time: "14:00", type: "Visita comercial", title: "Café Amora", subtitle: "Moema · Novo contato", color: "bg-[#f2edff] text-[#7852d6]", icon: Users },
  { time: "16:30", type: "Entrega", title: "Condomínio Horizonte", subtitle: "Itaim Bibi · Pedido #3281", color: "bg-[#eaf8f2] text-[#14835b]", icon: Truck },
];

const pipeline = [
  { label: "Novos contatos", amount: "R$ 42.800", count: 18, color: "#f47b20", width: "84%" },
  { label: "Em negociação", amount: "R$ 68.400", count: 12, color: "#1453a6", width: "67%" },
  { label: "Aguardando aprovação", amount: "R$ 31.250", count: 7, color: "#9b6cff", width: "45%" },
  { label: "Fechados no mês", amount: "R$ 96.720", count: 15, color: "#1da675", width: "92%" },
];

function DashboardView({ onModuleChange, access }: { onModuleChange: (module: ModuleKey) => void; access: CompanyAccess }) {
  const [, setDismissed] = useState<string[]>([]);
  const { records: companyNotifications, setRecords: setCompanyNotifications } = useCompanyRecords<AppNotification>("notifications", { enabled: access.can("readNotifications") });
  const { records: customers } = useCompanyRecords<WorkflowClient>("customers", { enabled: access.can("manageCustomers") });
  const { records: quotes } = useCompanyRecords<WorkflowQuote>("quotes", { enabled: access.can("manageQuotes") });
  const { records: orders } = useCompanyRecords<WorkflowOS>("work_orders", { enabled: access.can("issueOS") });
  const { records: productions } = useCompanyRecords<WorkflowProduction>("production", { enabled: access.can("manageProduction") });
  const { records: installations } = useCompanyRecords<WorkflowInstallation>("installations", { enabled: access.can("manageInstallations") });
  const { records: materials } = useCompanyRecords<StockMaterial>("materials", { enabled: access.can("manageStock") || access.can("manageProduction") || access.can("manageInstallations") });
  const { records: finances } = useCompanyRecords<FinanceEntry>("finance", { enabled: access.can("viewFinancial") });
  const openQuotes = quotes.filter((item) => !["Aprovado", "Cancelado"].includes(item.status));
  const openOrders = orders.filter((item) => !["Concluída", "Cancelada"].includes(item.status));
  const lowStock = materials.filter((item) => item.quantity < item.minimum);
  const openReceivables = finances.filter((entry) => entry.type === "A receber" && entry.status !== "Recebido")
    .reduce((sum, entry) => sum + Number(entry.value), 0);
  const visibleMetrics = [
    { label: access.can("viewFinancial") ? "A receber" : "Clientes", value: access.can("viewFinancial") ? `R$ ${openReceivables.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : String(customers.length), helper: access.can("viewFinancial") ? "contas em aberto" : "na base da empresa", icon: Wallet, tone: "bg-[#fff1e7] text-[#d9620d]" },
    { label: "Orçamentos abertos", value: String(openQuotes.length), helper: "aguardando próxima etapa", icon: FileText, tone: "bg-[#eaf2ff] text-[#1453a6]" },
    { label: "OS em andamento", value: String(openOrders.length), helper: "ordens não concluídas", icon: BarChart3, tone: "bg-[#eaf8f2] text-[#14835b]" },
    { label: "Instalações pendentes", value: String(installations.filter((item) => item.status !== "Concluída").length), helper: `${lowStock.length} materiais abaixo do mínimo`, icon: Hammer, tone: "bg-[#f2edff] text-[#7852d6]" },
  ];
  const visibleNotifications = [
    ...companyNotifications.filter((item) => !item.read).map((item) => ({ id: item.id, title: item.title, description: item.description, time: new Date(item.createdAt).toLocaleString("pt-BR"), icon: Bell, color: "bg-[#fff1e7] text-[#d9620d]" })),
  ];
  const dayAgenda = installations.filter((item) => item.status !== "Concluída").slice(0, 4).map((item) => ({ time: item.time, type: "Instalação", title: item.customer, subtitle: `${item.address || "Endereço pendente"} · ${item.team}`, color: "bg-[#eaf2ff] text-[#1453a6]", icon: Wrench }));
  const statusCounts = [
    { label: "Orçamentos em aberto", count: openQuotes.length, color: "#f47b20" },
    { label: "Produção ativa", count: productions.filter((item) => item.status !== "Concluída").length, color: "#1453a6" },
    { label: "Instalações ativas", count: installations.filter((item) => item.status !== "Concluída").length, color: "#9b6cff" },
    { label: "Materiais críticos", count: lowStock.length, color: "#1da675" },
  ];
  if (access.companyId) return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8d9aaa]">{new Date().toLocaleDateString("pt-BR", { dateStyle: "full" })}</p><h1 className="font-display text-[28px] font-bold text-[#172b4d]">Olá, <span className="text-[#f47b20]">{access.fullName.split(" ")[0]}.</span></h1><p className="mt-2 text-[13px] text-[#708096]">Resumo atualizado de {access.companyName}.</p></div>{access.can("manageQuotes") && <Button onClick={() => onModuleChange("orcamentos")} className="h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white"><Plus size={16} /> Novo orçamento</Button>}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{visibleMetrics.map(({ label, value, helper, icon: Icon, tone }) => <div key={label} className="rounded-[20px] border border-[#e9edf3] bg-white p-5 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></span><p className="mt-4 text-[12px] text-[#708096]">{label}</p><p className="mt-1 font-display text-[23px] font-extrabold text-[#172b4d]">{value}</p><p className="mt-1 text-[10px] text-[#9aa6b6]">{helper}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-[22px] border border-[#e9edf3] bg-white p-5"><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Situação operacional</h2><div className="mt-4 space-y-4">{statusCounts.map((item) => <div key={item.label}><div className="mb-1 flex justify-between text-[11px]"><span className="text-[#52647d]">{item.label}</span><b className="text-[#172b4d]">{item.count}</b></div><div className="h-2 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full" style={{ width: `${Math.min(item.count * 10, 100)}%`, backgroundColor: item.color }} /></div></div>)}</div></section>
      <section className="rounded-[22px] border border-[#e9edf3] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Próximas instalações</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Dados da empresa</p></div>{access.can("manageInstallations") && <button onClick={() => onModuleChange("instalacoes")} className="text-[10px] font-bold text-[#2859a6]">Abrir agenda</button>}</div><div className="mt-4 space-y-2">{dayAgenda.length ? dayAgenda.map((item) => <div key={item.time + item.title} className="flex items-center gap-3 rounded-xl bg-[#f8fafc] p-3"><span className="text-[10px] font-bold text-[#f47b20]">{item.time}</span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-[#344861]">{item.title}</b><small className="block truncate text-[10px] text-[#8d9aaa]">{item.subtitle}</small></span></div>) : <p className="rounded-xl bg-[#f8fafc] p-4 text-[11px] text-[#8d9aaa]">Nenhuma instalação cadastrada.</p>}</div></section></div>
    {access.can("readNotifications") && <section className="rounded-[22px] border border-[#e9edf3] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Notificações da empresa</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Atividade recente nesta conta</p></div><button onClick={() => onModuleChange("notificacoes")} className="text-[10px] font-bold text-[#2859a6]">Ver todas</button></div><div className="mt-4 space-y-3">{visibleNotifications.length ? visibleNotifications.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3 border-t border-[#eef1f5] pt-3"><Bell size={16} className="mt-0.5 text-[#f47b20]" /><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[#344861]">{item.title}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{item.description}</p><p className="mt-1 text-[9px] text-[#aab5c0]">{item.time}</p></div><button onClick={() => setCompanyNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, read: true } : notification))} className="text-[#c1cbd7]" aria-label={`Marcar como lida ${item.title}`}><X size={14} /></button></div>) : <p className="text-[11px] text-[#8d9aaa]">Nenhuma notificação recente.</p>}</div></section>}
  </div>;
  return <div><div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f47b20]" /><span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8d9aaa]">{new Date().toLocaleDateString("pt-BR", { dateStyle: "full" })}</span></div><h1 className="font-display text-[28px] font-bold tracking-[-0.045em] text-[#172b4d] sm:text-[32px]">Olá, <span className="text-[#f47b20]">{access.fullName.split(" ")[0]}.</span></h1><p className="mt-2 text-[13px] text-[#708096]">Resumo atualizado de {access.companyName}.</p></div><div className="flex flex-wrap items-center gap-2">{access.can("manageQuotes") && <Button onClick={() => onModuleChange("orcamentos")} className="h-10 rounded-xl bg-[#f47b20] px-4 text-[11px] font-bold text-white shadow-[0_6px_14px_rgba(244,123,32,0.2)] hover:bg-[#db6812]"><Plus size={16} /> Novo orçamento</Button>}</div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{visibleMetrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-[20px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[13px] ${metric.tone}"><Icon size={19} /></div><p className="text-[13px] font-medium text-[#708096]">{metric.label}</p><p className="mt-1 font-display text-[26px] font-bold tracking-[-0.04em] text-[#172b4d]">{metric.value}</p><p className="mt-1 text-[12px] text-[#9aa6b6]">{metric.helper}</p></div>; })}</div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><button onClick={() => onModuleChange("clientes")} className="flex items-center gap-3 rounded-2xl border border-[#e9edf3] bg-white p-4 text-left shadow-[0_8px_24px_rgba(24,43,73,0.04)] transition hover:-translate-y-0.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#1453a6]"><Users size={16} /></span><span><b className="block text-[11px] text-[#344861]">Novo cliente</b><small className="mt-1 block text-[10px] text-[#9aa6b6]">Cadastrar contato</small></span></button><button onClick={() => onModuleChange("orcamentos")} className="flex items-center gap-3 rounded-2xl border border-[#e9edf3] bg-white p-4 text-left shadow-[0_8px_24px_rgba(24,43,73,0.04)] transition hover:-translate-y-0.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff1e7] text-[#d9620d]"><FileText size={16} /></span><span><b className="block text-[11px] text-[#344861]">Novo orçamento</b><small className="mt-1 block text-[10px] text-[#9aa6b6]">Precificar toldo</small></span></button><button onClick={() => onModuleChange("os")} className="flex items-center gap-3 rounded-2xl border border-[#e9edf3] bg-white p-4 text-left shadow-[0_8px_24px_rgba(24,43,73,0.04)] transition hover:-translate-y-0.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2edff] text-[#7852d6]"><ClipboardList size={16} /></span><span><b className="block text-[11px] text-[#344861]">Emitir OS</b><small className="mt-1 block text-[10px] text-[#9aa6b6]">Abrir produção</small></span></button><button onClick={() => onModuleChange("agenda")} className="flex items-center gap-3 rounded-2xl border border-[#e9edf3] bg-white p-4 text-left shadow-[0_8px_24px_rgba(24,43,73,0.04)] transition hover:-translate-y-0.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf8f2] text-[#14835b]"><CalendarDays size={16} /></span><span><b className="block text-[11px] text-[#344861]">Novo evento</b><small className="mt-1 block text-[10px] text-[#9aa6b6]">Agendar campo</small></span></button></div><div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_.9fr]"><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Evolução de vendas</h2><span className="rounded-full bg-[#eaf8f2] px-2 py-1 text-[10px] font-bold text-[#15916a]">+18,6%</span></div><p className="mt-1 text-[12px] text-[#8d9aaa]">Faturamento acumulado no ano</p></div><div className="flex items-center gap-4 text-[11px] font-semibold text-[#718096]"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#f47b20]" />Faturado</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#cfd8e5]" />Meta</span></div></div><div className="mt-7 flex h-[200px] items-end gap-2 overflow-hidden sm:gap-3">{[35,48,43,61,57,74,68,82,90,84,95,100].map((height, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="relative h-full rounded-t-lg bg-[#f6f8fb]"><div className="absolute bottom-0 w-full rounded-t-lg bg-[#f47b20]" style={{ height: `${height}%` }} /></div><span className="text-center text-[9px] font-medium text-[#96a2b2]">{["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][index]}</span></div>)}</div></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Funil comercial</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Oportunidades por etapa</p></div><button onClick={() => onModuleChange("vendas")} className="text-[#9aa6b6]"><MoreHorizontal size={20} /></button></div><div className="mt-6 space-y-5">{pipeline.map((item) => <div key={item.label}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-[12px] font-semibold text-[#52647d]">{item.label}</span><span className="text-[12px] font-bold text-[#172b4d]">{item.amount}</span></div><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full" style={{ width: item.width, backgroundColor: item.color }} /></div><span className="w-6 text-right text-[11px] font-bold text-[#8d9aaa]">{item.count}</span></div></div>)}</div><Button variant="ghost" onClick={() => onModuleChange("vendas")} className="mt-6 h-9 w-full justify-between rounded-xl px-3 text-[12px] font-bold text-[#1453a6] hover:bg-[#f3f7fd]">Ver funil completo <ChevronRight size={15} /></Button></div></div><div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_.95fr]"><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Agenda de hoje</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Quarta-feira, 18 de setembro</p></div><button onClick={() => onModuleChange("instalacoes")} className="flex items-center gap-1 text-[11px] font-bold text-[#1453a6]">Ver agenda <ChevronRight size={15} /></button></div><div className="mt-6 space-y-1">{agenda.map((item) => { const Icon = item.icon; return <button key={item.time} onClick={() => onModuleChange("instalacoes")} className="group flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition hover:bg-[#f8fafc]"><span className="w-10 shrink-0 text-[11px] font-bold text-[#8d9aaa]">{item.time}</span><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12px] font-bold text-[#344861]">{item.title}</p><span className="hidden rounded-full bg-[#f3f5f8] px-2 py-0.5 text-[9px] font-bold text-[#7d8ca1] sm:inline">{item.type}</span></div><p className="mt-0.5 truncate text-[11px] text-[#9aa6b6]">{item.subtitle}</p></div><ChevronRight size={15} className="text-[#c5ceda]" /></button> })}</div></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Atividade recente</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Acompanhe o que está acontecendo</p></div><button className="text-[#9aa6b6]"><MoreHorizontal size={20} /></button></div><div className="mt-6 space-y-4">{visibleNotifications.map((item) => { const Icon = item.icon; return <div key={item.title} className="flex gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[12px] font-bold text-[#344861]">{item.title}</p><button onClick={() => setDismissed((current) => [...current, item.title])} className="text-[#c1cbd7]" aria-label={`Dispensar ${item.title}`}><X size={14} /></button></div><p className="mt-1 text-[11px] leading-4 text-[#8d9aaa]">{item.description}</p><p className="mt-1.5 text-[10px] font-semibold text-[#b0bac6]">{item.time}</p></div></div> })}</div><Button variant="ghost" onClick={() => setDismissed(visibleNotifications.map((item) => item.title))} className="mt-6 h-9 w-full rounded-xl text-[12px] font-bold text-[#1453a6] hover:bg-[#f3f7fd]">Marcar tudo como lido</Button></div></div></div>;
}

function accessibleModules(access: CompanyAccess): ModuleKey[] {
  const modules: ModuleKey[] = ["painel"];
  const allowed = [
    ["agenda", access.can("manageAgenda")],
    ["notificacoes", access.can("readNotifications")],
    ["clientes", access.can("manageCustomers")],
    ["vendas", access.can("manageCustomers")],
    ["orcamentos", access.can("manageQuotes")],
    ["os", access.can("issueOS")],
    ["operacao", access.can("manageProduction")],
    ["instalacoes", access.can("manageInstallations")],
    ["estoque", access.can("manageStock") || access.can("requestMaterials")],
    ["financeiro", access.can("viewFinancial")],
    ["relatorios", access.can("viewFinancial") || access.can("manageCustomers") || access.can("manageProduction")],
    ["equipe", access.can("editRules")],
    ["agente", access.can("accessAssistant")],
    ["configuracoes", access.can("editRules")],
  ] as const;
  allowed.forEach(([module, enabled]) => { if (enabled) modules.push(module); });
  return modules;
}

function Sidebar({ active, onNavigate, open, onClose, role, name, companyName, modules }: { active: ModuleKey; onNavigate: (module: ModuleKey) => void; open: boolean; onClose: () => void; role: WorkflowRole; name: string; companyName: string; modules: ModuleKey[] }) {
  const visibleGroups = navGroups.map((group) => ({ ...group, items: group.items.filter((item) => modules.includes(item.module)) })).filter((group) => group.items.length > 0);
  return <><div onClick={onClose} className={`fixed inset-0 z-30 bg-[#172b4d]/30 transition lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} /><aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-[#172b4d] text-white transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-[84px] items-center justify-between border-b border-[#2d4567] px-6"><div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-end justify-center overflow-hidden rounded-[13px] bg-[#f47b20]"><span className="absolute bottom-2 h-[9px] w-[27px] rounded-t-full border-[3px] border-white border-b-0" /><span className="absolute bottom-[7px] h-[3px] w-[25px] bg-white" /><span className="absolute bottom-[5px] h-[3px] w-[3px] rounded-full bg-white" /><span className="absolute bottom-[5px] right-[6px] h-[3px] w-[3px] rounded-full bg-white" /></div><div><p className="font-display text-[17px] font-bold tracking-[-0.03em]">toldo<span className="text-[#f47b20]">pro</span></p><p className="mt-0.5 max-w-[145px] truncate text-[9px] font-bold uppercase tracking-[0.16em] text-[#94abc4]">{companyName}</p></div></div><button className="lg:hidden" onClick={onClose} aria-label="Fechar menu"><X size={18} /></button></div><div className="flex-1 overflow-y-auto px-3 py-5">{visibleGroups.map((group) => <div key={group.label} className="mb-6"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7891ad]">{group.label}</p><div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const isActive = active === item.module || (item.module === "gestao" && active === "gestao"); return <button key={item.label} onClick={() => { onNavigate(item.module); onClose(); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isActive ? "bg-[#f47b20] text-white shadow-[0_7px_16px_rgba(244,123,32,0.18)]" : "text-[#b4c4d5] hover:bg-[#263f61] hover:text-white"}`}><Icon size={17} /><span className="flex-1 text-[12px] font-semibold">{item.label}</span></button> })}</div></div>)}</div><div className="border-t border-[#2d4567] p-4"><div className="mb-3 flex items-center gap-3 rounded-xl bg-[#213b5d] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4b89c] text-[11px] font-bold text-[#6d3e2a]">{name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-white">{name}</p><p className="truncate text-[10px] text-[#9eb2c9]">{role}</p></div><ChevronDown size={14} className="text-[#9eb2c9]" /></div></div></aside></>;
}

export default function Index({ access }: { access: CompanyAccess }) {
  const navigateTo = useNavigate();
  const modules = useMemo(() => accessibleModules(access), [access]);
  const [active, setActive] = useState<ModuleKey>("painel");
  const [menuOpen, setMenuOpen] = useState(false);
  const userName = access.fullName.split(" ")[0] || access.email;
  const signOut = async () => { await supabase?.auth.signOut(); };
  const navigate = (module: ModuleKey) => {
    if (module === "agente") { window.location.assign("/ia"); return; }
    if (!modules.includes(module)) return toast.error("Sua conta não tem permissão para acessar essa área.");
    setActive(module);
  };

  return <div className="min-h-screen bg-[#f5f7fa] text-[#172b4d]"><div className="flex min-h-screen"><Sidebar active={active} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} role={access.role} name={userName} companyName={access.companyName} modules={modules} /><main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e9edf3] bg-[#f5f7fa]/95 px-4 backdrop-blur-md sm:px-6 lg:px-9"><div className="flex items-center gap-3"><button onClick={() => setMenuOpen(true)} className="rounded-xl border border-[#e1e7ef] bg-white p-2 text-[#52647d] shadow-sm lg:hidden" aria-label="Abrir menu"><Menu size={19} /></button><div className="flex items-center gap-2 text-[11px] font-semibold text-[#90a0b2]"><Building2 size={15} className="text-[#f47b20]" /> {access.companyName} <ChevronRight size={13} /><span className="text-[#52647d]">{access.role}</span></div></div><div className="flex items-center gap-2">{access.can("accessAssistant") && <button onClick={() => navigate("agente")} className="flex items-center gap-2 rounded-xl bg-[#fff1e7] px-3 py-2 text-[10px] font-bold text-[#d9620d]"><Sparkles size={14} /> Abrir agente</button>}{modules.includes("notificacoes") && <button onClick={() => navigate("notificacoes")} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ef] bg-white text-[#708096] shadow-sm" aria-label="Notificações"><Bell size={17} /></button>}<button onClick={() => navigateTo("/auth/change-email")} title="Alterar e-mail" aria-label="Alterar e-mail" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ef] bg-white text-[#52647d] shadow-sm"><Mail size={16} /></button><button onClick={signOut} className="flex h-9 items-center gap-2 rounded-xl border border-[#e1e7ef] bg-white px-2 shadow-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e4b89c] text-[9px] font-bold text-[#6d3e2a]">{userName.slice(0, 2).toUpperCase()}</span><span className="hidden max-w-[90px] truncate text-[10px] font-bold text-[#52647d] sm:inline">{userName}</span></button></div></header><div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-9 lg:py-9">{active === "painel" ? <DashboardView onModuleChange={navigate} access={access} /> : <ModuleView module={active} onModuleChange={navigate} />}<footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#e5eaf0] pt-5 text-[10px] font-medium text-[#9aa6b6] sm:flex-row"><span>© 2026 Toldo Pro · Dados isolados por empresa</span><span className="flex items-center gap-1.5"><CircleHelp size={12} /> Central de ajuda <span className="mx-1">·</span> Termos e privacidade</span></footer></div></main></div></div>;
}
