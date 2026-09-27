import { useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
  CircleHelp,
  Command,
  FileBarChart,
  FileText,
  Hammer,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
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
import { AgentMobile } from "@/components/AgentMobile";
import { ModuleView, type ModuleKey } from "@/components/ModuleViews";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const navGroups = [
  { label: "Visão geral", items: [{ label: "Painel", module: "painel" as ModuleKey, icon: LayoutDashboard }, { label: "Agenda", module: "instalacoes" as ModuleKey, count: 8, icon: CalendarDays }, { label: "Notificações", module: "painel" as ModuleKey, count: 4, icon: Bell }] },
  { label: "Operação", items: [{ label: "Clientes e CRM", module: "clientes" as ModuleKey, icon: Users }, { label: "Contatos e vendas", module: "vendas" as ModuleKey, count: 12, icon: BarChart3 }, { label: "Orçamentos", module: "orcamentos" as ModuleKey, icon: FileText }, { label: "Produção", module: "operacao" as ModuleKey, icon: Hammer }, { label: "Instalações", module: "instalacoes" as ModuleKey, icon: Wrench }, { label: "Estoque", module: "estoque" as ModuleKey, icon: Boxes }] },
  { label: "Gestão", items: [{ label: "Financeiro", module: "gestao" as ModuleKey, icon: Wallet }, { label: "Relatórios", module: "gestao" as ModuleKey, icon: FileBarChart }, { label: "Equipe e permissões", module: "gestao" as ModuleKey, icon: UserRound }, { label: "Agente Toldo Pro IA", module: "agente" as ModuleKey, icon: Sparkles }] },
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

function DashboardView({ onModuleChange }: { onModuleChange: (module: ModuleKey) => void }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visibleNotifications = [
    { title: "Orçamento aprovado", description: "Marina Lopes aprovou o orçamento #1542.", time: "há 12 min", icon: CircleCheck, color: "bg-[#eaf8f2] text-[#14835b]" },
    { title: "Estoque baixo", description: "Lona bege 3,00m está abaixo do mínimo.", time: "há 34 min", icon: AlertTriangle, color: "bg-[#fff1e7] text-[#d9620d]" },
    { title: "Novo contato recebido", description: "Instagram · Residencial Jardins", time: "há 1h", icon: Sparkles, color: "bg-[#eaf2ff] text-[#1453a6]" },
  ].filter((item) => !dismissed.includes(item.title));
  return <div><div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f47b20]" /><span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8d9aaa]">Quarta-feira, 18 de setembro de 2024</span></div><h1 className="font-display text-[28px] font-bold tracking-[-0.045em] text-[#172b4d] sm:text-[32px]">Bom dia, <span className="text-[#f47b20]">Rafael.</span></h1><p className="mt-2 text-[13px] text-[#708096]">Aqui está o resumo da sua operação hoje.</p></div><div className="flex flex-wrap items-center gap-2"><select className="h-10 rounded-xl border border-[#e1e7ef] bg-white px-3 text-[11px] font-bold text-[#52647d] shadow-sm outline-none"><option>Este mês</option><option>Últimos 30 dias</option><option>Este trimestre</option></select><Button onClick={() => onModuleChange("orcamentos")} className="h-10 rounded-xl bg-[#f47b20] px-4 text-[11px] font-bold text-white shadow-[0_6px_14px_rgba(244,123,32,0.2)] hover:bg-[#db6812]"><Plus size={16} /> Novo orçamento</Button></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-[20px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="mb-5 flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${metric.tone}`}><Icon size={19} /></div><button aria-label={`Mais opções de ${metric.label}`} className="text-[#9aa6b6]"><MoreHorizontal size={20} /></button></div><p className="text-[13px] font-medium text-[#708096]">{metric.label}</p><div className="mt-1 flex items-end gap-2"><p className="font-display text-[26px] font-bold tracking-[-0.04em] text-[#172b4d]">{metric.value}</p><span className="mb-1 flex items-center gap-0.5 text-[11px] font-bold text-[#15916a]"><ArrowUpRight size={13} />{metric.trend}</span></div><p className="mt-1 text-[12px] text-[#9aa6b6]">{metric.helper}</p></div> })}</div><div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_.9fr]"><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Evolução de vendas</h2><span className="rounded-full bg-[#eaf8f2] px-2 py-1 text-[10px] font-bold text-[#15916a]">+18,6%</span></div><p className="mt-1 text-[12px] text-[#8d9aaa]">Faturamento acumulado no ano</p></div><div className="flex items-center gap-4 text-[11px] font-semibold text-[#718096]"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#f47b20]" />Faturado</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#cfd8e5]" />Meta</span></div></div><div className="mt-7 flex h-[200px] items-end gap-2 overflow-hidden sm:gap-3">{[35,48,43,61,57,74,68,82,90,84,95,100].map((height, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="relative h-full rounded-t-lg bg-[#f6f8fb]"><div className="absolute bottom-0 w-full rounded-t-lg bg-[#f47b20]" style={{ height: `${height}%` }} /></div><span className="text-center text-[9px] font-medium text-[#96a2b2]">{["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][index]}</span></div>)}</div></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Funil comercial</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Oportunidades por etapa</p></div><button onClick={() => onModuleChange("vendas")} className="text-[#9aa6b6]"><MoreHorizontal size={20} /></button></div><div className="mt-6 space-y-5">{pipeline.map((item) => <div key={item.label}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-[12px] font-semibold text-[#52647d]">{item.label}</span><span className="text-[12px] font-bold text-[#172b4d]">{item.amount}</span></div><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full" style={{ width: item.width, backgroundColor: item.color }} /></div><span className="w-6 text-right text-[11px] font-bold text-[#8d9aaa]">{item.count}</span></div></div>)}</div><Button variant="ghost" onClick={() => onModuleChange("vendas")} className="mt-6 h-9 w-full justify-between rounded-xl px-3 text-[12px] font-bold text-[#1453a6] hover:bg-[#f3f7fd]">Ver funil completo <ChevronRight size={15} /></Button></div></div><div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_.95fr]"><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Agenda de hoje</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Quarta-feira, 18 de setembro</p></div><button onClick={() => onModuleChange("instalacoes")} className="flex items-center gap-1 text-[11px] font-bold text-[#1453a6]">Ver agenda <ChevronRight size={15} /></button></div><div className="mt-6 space-y-1">{agenda.map((item) => { const Icon = item.icon; return <button key={item.time} onClick={() => onModuleChange("instalacoes")} className="group flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition hover:bg-[#f8fafc]"><span className="w-10 shrink-0 text-[11px] font-bold text-[#8d9aaa]">{item.time}</span><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12px] font-bold text-[#344861]">{item.title}</p><span className="hidden rounded-full bg-[#f3f5f8] px-2 py-0.5 text-[9px] font-bold text-[#7d8ca1] sm:inline">{item.type}</span></div><p className="mt-0.5 truncate text-[11px] text-[#9aa6b6]">{item.subtitle}</p></div><ChevronRight size={15} className="text-[#c5ceda]" /></button> })}</div></div><div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6"><div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Atividade recente</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Acompanhe o que está acontecendo</p></div><button className="text-[#9aa6b6]"><MoreHorizontal size={20} /></button></div><div className="mt-6 space-y-4">{visibleNotifications.map((item) => { const Icon = item.icon; return <div key={item.title} className="flex gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[12px] font-bold text-[#344861]">{item.title}</p><button onClick={() => setDismissed((current) => [...current, item.title])} className="text-[#c1cbd7]" aria-label={`Dispensar ${item.title}`}><X size={14} /></button></div><p className="mt-1 text-[11px] leading-4 text-[#8d9aaa]">{item.description}</p><p className="mt-1.5 text-[10px] font-semibold text-[#b0bac6]">{item.time}</p></div></div> })}</div><Button variant="ghost" onClick={() => setDismissed(visibleNotifications.map((item) => item.title))} className="mt-6 h-9 w-full rounded-xl text-[12px] font-bold text-[#1453a6] hover:bg-[#f3f7fd]">Marcar tudo como lido</Button></div></div></div>;
}

function Sidebar({ active, onNavigate, open, onClose }: { active: ModuleKey; onNavigate: (module: ModuleKey) => void; open: boolean; onClose: () => void }) {
  return <><div onClick={onClose} className={`fixed inset-0 z-30 bg-[#172b4d]/30 transition lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} /><aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-[#172b4d] text-white transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-[84px] items-center justify-between border-b border-[#2d4567] px-6"><div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-end justify-center overflow-hidden rounded-[13px] bg-[#f47b20]"><span className="absolute bottom-2 h-[9px] w-[27px] rounded-t-full border-[3px] border-white border-b-0" /><span className="absolute bottom-[7px] h-[3px] w-[25px] bg-white" /><span className="absolute bottom-[5px] h-[3px] w-[3px] rounded-full bg-white" /><span className="absolute bottom-[5px] right-[6px] h-[3px] w-[3px] rounded-full bg-white" /></div><div><p className="font-display text-[17px] font-bold tracking-[-0.03em]">toldo<span className="text-[#f47b20]">pro</span></p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#94abc4]">gestão inteligente</p></div></div><button className="lg:hidden" onClick={onClose} aria-label="Fechar menu"><X size={18} /></button></div><div className="flex-1 overflow-y-auto px-3 py-5">{navGroups.map((group) => <div key={group.label} className="mb-6"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7891ad]">{group.label}</p><div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const isActive = active === item.module || (item.module === "gestao" && active === "gestao"); return <button key={item.label} onClick={() => { onNavigate(item.module); onClose(); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isActive ? "bg-[#f47b20] text-white shadow-[0_7px_16px_rgba(244,123,32,0.18)]" : "text-[#b4c4d5] hover:bg-[#263f61] hover:text-white"}`}><Icon size={17} /><span className="flex-1 text-[12px] font-semibold">{item.label}</span>{item.count && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-[#2b4567] text-[#a9bdd2]"}`}>{item.count}</span>}</button> })}</div></div>)}</div><div className="border-t border-[#2d4567] p-4"><div className="mb-3 flex items-center gap-3 rounded-xl bg-[#213b5d] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4b89c] text-[11px] font-bold text-[#6d3e2a]">RS</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-white">Rafael Silva</p><p className="truncate text-[10px] text-[#9eb2c9]">Administrador</p></div><ChevronDown size={14} className="text-[#9eb2c9]" /></div><button onClick={() => onNavigate("gestao")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[#9eb2c9] hover:bg-[#263f61] hover:text-white"><Settings2 size={16} /><span className="text-[11px] font-semibold">Configurações</span></button></div></aside></>;
}

export default function Index({ user, demo }: { user: User | null; demo: boolean }) {
  const [active, setActive] = useState<ModuleKey>("agente");
  const [menuOpen, setMenuOpen] = useState(false);
  const userName = useMemo(() => user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Rafael", [user]);
  const signOut = async () => { if (supabase && !demo) await supabase.auth.signOut(); else window.location.reload(); };
  const navigate = (module: ModuleKey) => { setActive(module); if (module !== "agente") toast.info("Módulo aberto", { description: "Você está visualizando os dados da operação." }); };

  if (active === "agente") return <AgentMobile userName={userName} demo={demo} onNavigate={navigate} onSignOut={signOut} />;

  return <div className="min-h-screen bg-[#f5f7fa] text-[#172b4d]"><div className="flex min-h-screen"><Sidebar active={active} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} /><main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e9edf3] bg-[#f5f7fa]/95 px-4 backdrop-blur-md sm:px-6 lg:px-9"><div className="flex items-center gap-3"><button onClick={() => setMenuOpen(true)} className="rounded-xl border border-[#e1e7ef] bg-white p-2 text-[#52647d] shadow-sm lg:hidden" aria-label="Abrir menu"><Menu size={19} /></button><div className="flex items-center gap-2 text-[11px] font-semibold text-[#90a0b2]"><Building2 size={15} className="text-[#f47b20]" /> Toldo Pro <ChevronRight size={13} /><span className="text-[#52647d]">Operação</span></div></div><div className="flex items-center gap-2"><button onClick={() => navigate("agente")} className="flex items-center gap-2 rounded-xl bg-[#fff1e7] px-3 py-2 text-[10px] font-bold text-[#d9620d]"><Sparkles size={14} /> Abrir agente</button><button onClick={() => navigate("painel")} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ef] bg-white text-[#708096] shadow-sm" aria-label="Notificações"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#f47b20] ring-2 ring-white" /></button><button onClick={signOut} className="flex h-9 items-center gap-2 rounded-xl border border-[#e1e7ef] bg-white px-2 shadow-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e4b89c] text-[9px] font-bold text-[#6d3e2a]">{userName.slice(0, 2).toUpperCase()}</span><span className="hidden max-w-[90px] truncate text-[10px] font-bold text-[#52647d] sm:inline">{userName}</span></button></div></header><div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-9 lg:py-9">{active === "painel" ? <DashboardView onModuleChange={navigate} /> : <ModuleView module={active} onModuleChange={navigate} />}<footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#e5eaf0] pt-5 text-[10px] font-medium text-[#9aa6b6] sm:flex-row"><span>© 2024 Toldo Pro · Gestão inteligente para toldos{demo ? " · Modo demonstração" : ""}</span><span className="flex items-center gap-1.5"><CircleHelp size={12} /> Central de ajuda <span className="mx-1">·</span> Termos e privacidade</span></footer></div></main></div></div>;
}
