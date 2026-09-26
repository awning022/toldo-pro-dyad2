import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock3,
  Command,
  FileBarChart,
  FileText,
  Filter,
  Hammer,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Truck,
  UserRound,
  Users,
  Wallet,
  Wifi,
  X,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const navGroups = [
  {
    label: "Visão geral",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Agenda", icon: CalendarDays, count: 8 },
      { label: "Notificações", icon: Bell, count: 4 },
    ],
  },
  {
    label: "Operação",
    items: [
      { label: "Clientes & CRM", icon: Users },
      { label: "Leads e vendas", icon: BarChart3, count: 12 },
      { label: "Orçamentos", icon: FileText },
      { label: "Produção", icon: Hammer },
      { label: "Instalações", icon: Wrench },
      { label: "Estoque", icon: Boxes },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Financeiro", icon: Wallet },
      { label: "Relatórios", icon: FileBarChart },
      { label: "Equipe", icon: UserRound },
    ],
  },
];

const metrics = [
  { label: "Faturamento", value: "R$ 184.620", trend: "+12,8%", helper: "vs. mês anterior", icon: Wallet, tone: "orange" },
  { label: "Orçamentos abertos", value: "38", trend: "+6", helper: "nos últimos 7 dias", icon: FileText, tone: "blue" },
  { label: "Taxa de conversão", value: "32,4%", trend: "+4,2%", helper: "vs. mês anterior", icon: BarChart3, tone: "green" },
  { label: "Instalações no mês", value: "24", trend: "3 hoje", helper: "4 em atraso", icon: Hammer, tone: "purple" },
];

const salesData = [
  { month: "Jan", value: 38, target: 42 },
  { month: "Fev", value: 49, target: 44 },
  { month: "Mar", value: 44, target: 48 },
  { month: "Abr", value: 61, target: 53 },
  { month: "Mai", value: 57, target: 57 },
  { month: "Jun", value: 78, target: 62 },
  { month: "Jul", value: 72, target: 67 },
  { month: "Ago", value: 86, target: 72 },
  { month: "Set", value: 92, target: 78 },
  { month: "Out", value: 84, target: 82 },
  { month: "Nov", value: 96, target: 88 },
  { month: "Dez", value: 100, target: 94 },
];

const pipeline = [
  { label: "Novos leads", amount: "R$ 42.800", count: 18, color: "#f47b20", width: "84%" },
  { label: "Em negociação", amount: "R$ 68.400", count: 12, color: "#1453a6", width: "67%" },
  { label: "Aguardando aprovação", amount: "R$ 31.250", count: 7, color: "#9b6cff", width: "45%" },
  { label: "Fechados no mês", amount: "R$ 96.720", count: 15, color: "#1da675", width: "92%" },
];

const agenda = [
  { time: "08:30", type: "Medição", title: "Residência Ana Beatriz", subtitle: "Vila Madalena · Toldo retrátil", color: "orange", icon: Hammer },
  { time: "10:00", type: "Instalação", title: "Clínica Vitta", subtitle: "Pinheiros · Equipe João", color: "blue", icon: Wrench },
  { time: "14:00", type: "Visita comercial", title: "Café Amora", subtitle: "Moema · Novo lead", color: "purple", icon: Users },
  { time: "16:30", type: "Entrega", title: "Condomínio Horizonte", subtitle: "Itaim Bibi · Pedido #3281", color: "green", icon: Truck },
];

const notifications = [
  { title: "Orçamento aprovado", description: "Marina Lopes aprovou o orçamento #1542.", time: "há 12 min", icon: CircleCheck, color: "green" },
  { title: "Estoque baixo", description: "Lona bege 3,00m está abaixo do mínimo.", time: "há 34 min", icon: AlertTriangle, color: "orange" },
  { title: "Novo lead recebido", description: "Instagram · Residencial Jardins", time: "há 1h", icon: Sparkles, color: "blue" },
];

const chartPoints = (values: number[], width = 700, height = 210) => {
  const max = 110;
  const gap = width / (values.length - 1);
  return values.map((value, index) => `${Math.round(index * gap)},${height - (value / max) * height}`).join(" ");
};

const toneClasses: Record<string, string> = {
  orange: "bg-[#fff1e7] text-[#d9620d]",
  blue: "bg-[#eaf2ff] text-[#1453a6]",
  green: "bg-[#eaf8f2] text-[#14835b]",
  purple: "bg-[#f2edff] text-[#7852d6]",
};

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  const Icon = metric.icon;
  return (
    <div className="metric-card rounded-[20px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)]">
      <div className="mb-5 flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${toneClasses[metric.tone]}`}>
          <Icon size={19} strokeWidth={2.2} />
        </div>
        <button className="text-[#9aa6b6] transition hover:text-[#253a59]" aria-label={`Mais opções de ${metric.label}`}>
          <MoreHorizontal size={20} />
        </button>
      </div>
      <p className="text-[13px] font-medium text-[#708096]">{metric.label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="font-display text-[26px] font-bold tracking-[-0.04em] text-[#172b4d]">{metric.value}</p>
        <span className="mb-1 flex items-center gap-0.5 text-[11px] font-bold text-[#15916a]"><ArrowUpRight size={13} />{metric.trend}</span>
      </div>
      <p className="mt-1 text-[12px] text-[#9aa6b6]">{metric.helper}</p>
    </div>
  );
}

function SalesChart() {
  const actual = chartPoints(salesData.map((item) => item.value));
  const target = chartPoints(salesData.map((item) => item.target));
  return (
    <div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Evolução de vendas</h2><span className="rounded-full bg-[#eaf8f2] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#15916a]">+18,6%</span></div>
          <p className="mt-1 text-[12px] text-[#8d9aaa]">Faturamento acumulado no ano</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#718096]"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#f47b20]" />Faturado</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#cfd8e5]" />Meta</span></div>
      </div>
      <div className="mt-6 overflow-hidden">
        <div className="relative h-[220px] min-w-[560px]">
          <div className="absolute inset-x-0 top-0 flex justify-between border-b border-dashed border-[#edf0f4] pb-2 text-[10px] text-[#a0adbd]"><span>R$ 100k</span><span>R$ 75k</span><span>R$ 50k</span><span>R$ 25k</span><span>R$ 0</span></div>
          <svg className="absolute inset-x-0 bottom-5 h-[180px] w-full overflow-visible" viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label="Gráfico de evolução de vendas">
            <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f47b20" stopOpacity="0.2" /><stop offset="100%" stopColor="#f47b20" stopOpacity="0" /></linearGradient></defs>
            <polygon points={`${actual} 700,210 0,210`} fill="url(#salesFill)" />
            <polyline points={target} fill="none" stroke="#cfd8e5" strokeWidth="2" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
            <polyline points={actual} fill="none" stroke="#f47b20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {salesData.map((item, index) => <circle key={item.month} cx={index * (700 / (salesData.length - 1))} cy={210 - (item.value / 110) * 210} r="4" fill="white" stroke="#f47b20" strokeWidth="3" vectorEffect="non-scaling-stroke" />)}
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-medium text-[#96a2b2]">{salesData.map((item) => <span key={item.month}>{item.month}</span>)}</div>
        </div>
      </div>
    </div>
  );
}

function PipelineCard() {
  return (
    <div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6">
      <div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Funil comercial</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Oportunidades por etapa</p></div><button className="rounded-lg p-1.5 text-[#9aa6b6] transition hover:bg-[#f5f7fa] hover:text-[#253a59]" aria-label="Mais opções do funil"><MoreHorizontal size={20} /></button></div>
      <div className="mt-6 space-y-5">{pipeline.map((item) => <div key={item.label}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-[12px] font-semibold text-[#52647d]">{item.label}</span><span className="text-[12px] font-bold text-[#172b4d]">{item.amount}</span></div><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full" style={{ width: item.width, backgroundColor: item.color }} /></div><span className="w-6 text-right text-[11px] font-bold text-[#8d9aaa]">{item.count}</span></div></div>)}</div>
      <Button variant="ghost" className="mt-6 h-9 w-full justify-between rounded-xl px-3 text-[12px] font-bold text-[#1453a6] hover:bg-[#f3f7fd]" onClick={() => toast.info("Abrindo o funil comercial...")} >Ver funil completo <ChevronRight size={15} /></Button>
    </div>
  );
}

function AgendaCard() {
  return (
    <div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6">
      <div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Agenda de hoje</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Quarta-feira, 18 de setembro</p></div><button className="flex items-center gap-1 rounded-lg p-1.5 text-[11px] font-bold text-[#1453a6] transition hover:bg-[#f3f7fd]" onClick={() => toast.info("Abrindo calendário...")}>Ver agenda <ChevronRight size={15} /></button></div>
      <div className="mt-6 space-y-1">{agenda.map((item) => { const Icon = item.icon; return <div key={item.time} className="group flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-[#f8fafc]"><span className="w-10 shrink-0 text-[11px] font-bold text-[#8d9aaa]">{item.time}</span><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[item.color]}`}><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12px] font-bold text-[#344861]">{item.title}</p><span className="hidden rounded-full bg-[#f3f5f8] px-2 py-0.5 text-[9px] font-bold text-[#7d8ca1] sm:inline">{item.type}</span></div><p className="mt-0.5 truncate text-[11px] text-[#9aa6b6]">{item.subtitle}</p></div><ChevronRight size={15} className="text-[#c5ceda] transition group-hover:translate-x-0.5 group-hover:text-[#1453a6]" /></div>})}</div>
    </div>
  );
}

function NotificationsCard({ onDismiss }: { onDismiss: (title: string) => void }) {
  return (
    <div className="rounded-[22px] border border-[#e9edf3] bg-white p-5 shadow-[0_8px_24px_rgba(24,43,73,0.04)] lg:p-6">
      <div className="flex items-start justify-between"><div><h2 className="font-display text-[17px] font-bold text-[#172b4d]">Atividade recente</h2><p className="mt-1 text-[12px] text-[#8d9aaa]">Acompanhe o que está acontecendo</p></div><button className="rounded-lg p-1.5 text-[#9aa6b6] transition hover:bg-[#f5f7fa] hover:text-[#253a59]" aria-label="Mais opções de atividade"><MoreHorizontal size={20} /></button></div>
      <div className="mt-6 space-y-4">{notifications.map((item) => { const Icon = item.icon; return <div key={item.title} className="flex gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[item.color]}`}><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[12px] font-bold text-[#344861]">{item.title}</p><button onClick={() => onDismiss(item.title)} className="text-[#c1cbd7] transition hover:text-[#5e7189]" aria-label={`Dispensar ${item.title}`}><X size={14} /></button></div><p className="mt-1 text-[11px] leading-4 text-[#8d9aaa]">{item.description}</p><p className="mt-1.5 text-[10px] font-semibold text-[#b0bac6]">{item.time}</p></div></div>})}</div>
      <Button variant="ghost" className="mt-6 h-9 w-full rounded-xl text-[12px] font-bold text-[#1453a6] hover:bg-[#f3f7fd]" onClick={() => toast.success("Tudo certo por aqui!")}>Marcar tudo como lido</Button>
    </div>
  );
}

function SyncPanel({ pending, onSync }: { pending: number; onSync: () => void }) {
  return <div className="relative overflow-hidden rounded-[22px] bg-[#172b4d] p-5 text-white shadow-[0_10px_26px_rgba(23,43,77,0.16)] lg:p-6"><div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[18px] border-[#2d4568] opacity-50" /><div className="absolute -bottom-12 right-16 h-28 w-28 rounded-full border-[14px] border-[#213b5f] opacity-60" /><div className="relative flex items-start justify-between"><div><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#244367]"><Wifi size={14} className="text-[#8fe0bd]" /></span><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a5bbd3]">Agente Toldo Pro IA</span></div><h2 className="mt-4 font-display text-[19px] font-bold tracking-[-0.02em]">Tudo sincronizado</h2><p className="mt-1 max-w-[235px] text-[12px] leading-5 text-[#afc0d3]">Seu trabalho está seguro e atualizado com o Toldo Pro.</p></div><span className="relative rounded-full bg-[#1f795c] px-2.5 py-1 text-[10px] font-bold text-[#d5f7e8]">ONLINE</span></div><div className="relative mt-6 flex items-center justify-between border-t border-[#35506f] pt-4"><span className="text-[11px] text-[#a5bbd3]">{pending} operações pendentes</span><button onClick={onSync} className="flex items-center gap-1.5 text-[11px] font-bold text-[#f7a66c] transition hover:text-[#ffc291]"><RefreshCw size={13} /> Sincronizar</button></div></div>;
}

function AssistantCard({ onOpen }: { onOpen: () => void }) {
  return <button onClick={onOpen} className="group relative overflow-hidden rounded-[22px] border border-[#f4d5be] bg-[#fff8f3] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#f3b07f] hover:shadow-[0_10px_26px_rgba(244,123,32,0.11)] lg:p-6"><div className="absolute -right-5 -top-8 h-28 w-28 rounded-full border-[16px] border-[#fae7d6]" /><div className="relative flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#f47b20] text-white shadow-[0_6px_12px_rgba(244,123,32,0.2)]"><Sparkles size={19} /></div><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d9620d]">Seu assistente</p><h2 className="mt-1 font-display text-[17px] font-bold text-[#6b341b]">Converse com o Toldo Pro IA</h2><p className="mt-1.5 max-w-[300px] text-[12px] leading-5 text-[#9b6a4f]">Consulte a agenda, crie tarefas ou acompanhe sua operação por voz ou texto.</p></div></div><div className="relative mt-5 flex items-center justify-between border-t border-[#f3dfd0] pt-4 text-[11px] font-bold text-[#d9620d]"><span className="flex items-center gap-1.5"><MessageSquare size={13} /> Abrir conversa</span><ChevronRight size={15} className="transition group-hover:translate-x-1" /></div></button>;
}

function AssistantDialog({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#172b4d]/30 p-3 backdrop-blur-[2px] sm:items-center"><div className="w-full max-w-[470px] overflow-hidden rounded-[26px] border border-[#e9edf3] bg-white shadow-[0_24px_70px_rgba(23,43,77,0.24)]"><div className="flex items-center justify-between bg-[#172b4d] px-5 py-4 text-white"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f47b20]"><Sparkles size={17} /></div><div><p className="text-[13px] font-bold">Toldo Pro IA</p><p className="flex items-center gap-1 text-[10px] text-[#b3c4d8]"><span className="h-1.5 w-1.5 rounded-full bg-[#65d7a5]" /> Online e pronto para ajudar</p></div></div><button onClick={onClose} className="rounded-lg p-1.5 text-[#b3c4d8] hover:bg-[#2a4366] hover:text-white" aria-label="Fechar assistente"><X size={18} /></button></div><div className="space-y-4 bg-[#f8fafc] p-5"><div className="max-w-[310px] rounded-2xl rounded-tl-md bg-white p-3.5 shadow-sm"><p className="text-[12px] leading-5 text-[#52647d]">Olá, Rafael! Posso consultar sua agenda, acompanhar instalações ou criar uma tarefa para você.</p></div>{sent && <div className="ml-auto max-w-[310px] rounded-2xl rounded-tr-md bg-[#f47b20] p-3.5 text-white shadow-sm"><p className="text-[12px] leading-5">{message}</p></div>}<div className="flex flex-wrap gap-2"><button onClick={() => { setSent(true); setMessage("Quais instalações eu tenho amanhã?"); }} className="rounded-full border border-[#dfe6ef] bg-white px-3 py-2 text-[11px] font-semibold text-[#52647d] transition hover:border-[#f3b07f] hover:text-[#d9620d]">Instalações de amanhã</button><button onClick={() => { setSent(true); setMessage("Crie uma tarefa para revisar os orçamentos."); }} className="rounded-full border border-[#dfe6ef] bg-white px-3 py-2 text-[11px] font-semibold text-[#52647d] transition hover:border-[#f3b07f] hover:text-[#d9620d]">Criar uma tarefa</button></div></div><div className="flex items-center gap-2 border-t border-[#eef1f5] bg-white p-4"><Input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && message.trim()) setSent(true); }} placeholder="Digite um comando..." className="h-10 rounded-xl border-[#e0e7ef] bg-[#f8fafc] text-[12px] shadow-none focus-visible:ring-[#f47b20]" /><button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f47b20] text-white transition hover:bg-[#db6812]" onClick={() => { if (message.trim()) setSent(true); }} aria-label="Enviar comando"><ChevronRight size={17} /></button></div></div></div>;
}

function Sidebar({ active, onNavigate, open, onClose }: { active: string; onNavigate: (label: string) => void; open: boolean; onClose: () => void }) {
  return <><div onClick={onClose} className={`fixed inset-0 z-30 bg-[#172b4d]/30 transition lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} /><aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-[#172b4d] text-white transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-[84px] items-center justify-between border-b border-[#2d4567] px-6"><div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-end justify-center overflow-hidden rounded-[13px] bg-[#f47b20]"><span className="absolute bottom-2 h-[9px] w-[27px] rounded-t-full border-[3px] border-white border-b-0" /><span className="absolute bottom-[7px] h-[3px] w-[25px] bg-white" /><span className="absolute bottom-[5px] h-[3px] w-[3px] rounded-full bg-white" /><span className="absolute bottom-[5px] right-[6px] h-[3px] w-[3px] rounded-full bg-white" /></div><div><p className="font-display text-[17px] font-bold tracking-[-0.03em]">toldo<span className="text-[#f47b20]">pro</span></p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#94abc4]">gestão inteligente</p></div></div><button className="rounded-lg p-1.5 text-[#9eb2c9] hover:bg-[#274263] lg:hidden" onClick={onClose} aria-label="Fechar menu"><X size={18} /></button></div><div className="flex-1 overflow-y-auto px-3 py-5">{navGroups.map((group) => <div key={group.label} className="mb-6"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7891ad]">{group.label}</p><div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const isActive = active === item.label; return <button key={item.label} onClick={() => onNavigate(item.label)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isActive ? "bg-[#f47b20] text-white shadow-[0_7px_16px_rgba(244,123,32,0.18)]" : "text-[#b4c4d5] hover:bg-[#263f61] hover:text-white"}`}><Icon size={17} strokeWidth={isActive ? 2.5 : 2} /><span className="flex-1 text-[12px] font-semibold">{item.label}</span>{item.count && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-[#2b4567] text-[#a9bdd2]"}`}>{item.count}</span>}</button> })}</div></div>)}</div><div className="border-t border-[#2d4567] p-4"><div className="mb-3 flex items-center gap-3 rounded-xl bg-[#213b5d] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4b89c] text-[11px] font-bold text-[#6d3e2a]">RS</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-white">Rafael Silva</p><p className="truncate text-[10px] text-[#9eb2c9]">Administrador</p></div><ChevronDown size={14} className="text-[#9eb2c9]" /></div><button onClick={() => toast.info("Configurações em breve")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[#9eb2c9] transition hover:bg-[#263f61] hover:text-white"><Settings2 size={16} /><span className="text-[11px] font-semibold">Configurações</span></button></div></aside></>;
}

const Index = () => {
  const [active, setActive] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState("Este mês");
  const [notificationsVisible, setNotificationsVisible] = useState(notifications);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [search, setSearch] = useState("");
  const greeting = useMemo(() => "Bom dia, Rafael", []);

  const navigate = (label: string) => {
    setActive(label);
    setMenuOpen(false);
    if (label !== "Dashboard") toast.info(`${label} selecionado`, { description: "Módulo pronto para consulta." });
  };

  return <div className="min-h-screen bg-[#f5f7fa] text-[#172b4d]"><div className="flex min-h-screen"><Sidebar active={active} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} /><main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[84px] items-center justify-between border-b border-[#e9edf3] bg-[#f5f7fa]/95 px-4 backdrop-blur-md sm:px-6 lg:px-9"><div className="flex items-center gap-3"><button onClick={() => setMenuOpen(true)} className="rounded-xl border border-[#e1e7ef] bg-white p-2 text-[#52647d] shadow-sm lg:hidden" aria-label="Abrir menu"><Menu size={19} /></button><div className="hidden items-center gap-2 text-[11px] font-semibold text-[#90a0b2] sm:flex"><Building2 size={15} className="text-[#f47b20]" /> Toldo Pro <ChevronRight size={13} /><span className="text-[#52647d]">Visão geral</span></div><div className="sm:hidden"><p className="font-display text-[16px] font-bold text-[#172b4d]">toldo<span className="text-[#f47b20]">pro</span></p></div></div><div className="flex items-center gap-2 sm:gap-3"><div className="relative hidden md:block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6b6]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, orçamento..." className="h-9 w-[225px] rounded-xl border-[#e1e7ef] bg-white pl-9 text-[11px] shadow-none placeholder:text-[#a5b0bf] focus-visible:ring-[#f47b20]" /><span className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-[#e6ebf1] bg-[#f8fafc] px-1.5 py-0.5 text-[9px] font-bold text-[#9aa6b6] lg:flex"><Command size={10} /> K</span></div><button onClick={() => toast.info("Você está conectado e seus dados estão seguros.")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dce8e1] bg-[#f2fbf6] text-[#15916a]" aria-label="Status de conexão"><Wifi size={16} /></button><button onClick={() => toast.info("Você não tem novas notificações.")} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ef] bg-white text-[#708096] shadow-sm" aria-label="Notificações"><Bell size={17} />{notificationsVisible.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#f47b20] ring-2 ring-white" />}</button><button onClick={() => toast.info("Menu da conta")} className="hidden h-9 items-center gap-2 rounded-xl border border-[#e1e7ef] bg-white px-2 shadow-sm sm:flex"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e4b89c] text-[9px] font-bold text-[#6d3e2a]">RS</span><ChevronDown size={14} className="text-[#9aa6b6]" /></button></div></header><div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-9 lg:py-9"><div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f47b20]" /><span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8d9aaa]">Quarta-feira, 18 de setembro de 2024</span></div><h1 className="font-display text-[28px] font-bold tracking-[-0.045em] text-[#172b4d] sm:text-[32px]">{greeting}, <span className="text-[#f47b20]">Rafael.</span></h1><p className="mt-2 text-[13px] text-[#708096]">Aqui está o resumo da sua operação hoje.</p></div><div className="flex flex-wrap items-center gap-2"><div className="relative"><select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-10 appearance-none rounded-xl border border-[#e1e7ef] bg-white py-2 pl-3 pr-9 text-[11px] font-bold text-[#52647d] shadow-sm outline-none focus:border-[#f47b20]"><option>Este mês</option><option>Últimos 30 dias</option><option>Este trimestre</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8d9aaa]" /></div><Button onClick={() => toast.success("Novo orçamento iniciado")} className="h-10 rounded-xl bg-[#f47b20] px-4 text-[11px] font-bold text-white shadow-[0_6px_14px_rgba(244,123,32,0.2)] hover:bg-[#db6812]"><Plus size={16} /> Novo orçamento</Button></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div><div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.9fr]"><SalesChart /><PipelineCard /></div><div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]"><AgendaCard /><NotificationsCard onDismiss={(title) => { setNotificationsVisible((current) => current.filter((item) => item.title !== title)); toast.success("Notificação dispensada"); }} /></div><div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2"><SyncPanel pending={pending} onSync={() => { setPending(0); toast.success("Sincronização concluída"); }} /><AssistantCard onOpen={() => setAssistantOpen(true)} /></div><footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#e5eaf0] pt-5 text-[10px] font-medium text-[#9aa6b6] sm:flex-row"><span>© 2024 Toldo Pro · Gestão inteligente para toldos</span><span className="flex items-center gap-1.5"><CircleHelp size={12} /> Central de ajuda <span className="mx-1">·</span> Termos e privacidade</span></footer></div></main></div>{assistantOpen && <AssistantDialog onClose={() => setAssistantOpen(false)} />}</div>;
};

export default Index;
