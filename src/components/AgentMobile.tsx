import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Cloud,
  CloudOff,
  FileText,
  Headphones,
  Home,
  Inbox,
  ListChecks,
  Loader2,
  MessageCircle,
  Mic,
  Moon,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Settings2,
  Sparkles,
  Speaker,
  Sun,
  UserRound,
  Users,
  Wallet,
  Wifi,
  Wrench,
  X,
} from "lucide-react";
import type { ModuleKey } from "@/components/ModuleViews";
import { toast } from "sonner";

type AgentMobileProps = {
  userName: string;
  demo: boolean;
  onNavigate: (module: ModuleKey) => void;
  onSignOut: () => void;
};

type ChatMessage = { id: string; from: "ai" | "user"; text: string; time?: string };
type SyncStatus = "pending" | "syncing" | "synced" | "failed";
type SyncItem = { id: string; title: string; kind: "command" | "action"; status: SyncStatus; createdAt: string };
type PendingAction = { title: string; description: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};
type SpeechConstructor = new () => SpeechRecognitionLike;

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const quickActions: { label: string; helper: string; icon: typeof CalendarDays; tone: string; prompt: string }[] = [
  { label: "Agenda", helper: "Hoje e amanhã", icon: CalendarDays, tone: "bg-[#eaf1ff] text-[#2859a6]", prompt: "Quais instalações eu tenho hoje e amanhã?" },
  { label: "Clientes", helper: "Consultar CRM", icon: Users, tone: "bg-[#f2edff] text-[#7351c7]", prompt: "Mostre meus clientes recentes." },
  { label: "Estoque", helper: "2 itens críticos", icon: Package, tone: "bg-[#eaf8f3] text-[#15835e]", prompt: "Liste o estoque baixo." },
  { label: "Orçamentos", helper: "8 aguardando", icon: FileText, tone: "bg-[#fff5db] text-[#a97810]", prompt: "Mostre os orçamentos pendentes." },
  { label: "Criar lead", helper: "Novo contato", icon: UserRound, tone: "bg-[#fff2e8] text-[#d76a21]", prompt: "Crie um lead para o WhatsApp." },
  { label: "Criar visita", helper: "Agendar campo", icon: CalendarDays, tone: "bg-[#eaf1ff] text-[#2859a6]", prompt: "Crie uma visita para amanhã." },
  { label: "Medição", helper: "Registrar campo", icon: Ruler, tone: "bg-[#eaf8f3] text-[#15835e]", prompt: "Registre essa medição." },
  { label: "Sincronizar", helper: "Enviar pendências", icon: RefreshCw, tone: "bg-[#17324d] text-white", prompt: "Sincronize as pendências." },
];

const agendaItems = [
  { time: "08:30", title: "Medição · Ana Beatriz", meta: "Vila Madalena · Equipe Carlos", tone: "bg-[#fff0e3] text-[#d76a21]" },
  { time: "10:00", title: "Instalação · Clínica Vitta", meta: "Pinheiros · Equipe João", tone: "bg-[#eaf1ff] text-[#2859a6]" },
  { time: "Amanhã · 08:30", title: "Instalação · Marina Lopes", meta: "Vila Madalena · Equipe Carlos", tone: "bg-[#f2edff] text-[#7351c7]" },
];

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = window.localStorage.getItem(key);
    if (!saved) return initial;
    try {
      const parsed = JSON.parse(saved);
      if (key === "toldo:sync-queue" && Array.isArray(parsed)) {
        return parsed.map((item) => typeof item === "string" ? { id: `command:${item.toLocaleLowerCase("pt-BR")}`, title: item, kind: "command", status: "pending", createdAt: new Date().toISOString() } : item) as T;
      }
      if (key === "toldo:agent-messages" && Array.isArray(parsed)) {
        return parsed.map((item) => ({ ...item, id: item.id || makeId("message") })) as T;
      }
      return parsed as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => window.localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

function LogoMark() {
  return <div className="relative flex h-9 w-9 items-end justify-center overflow-hidden rounded-[12px] bg-[#f47b20] shadow-[0_5px_12px_rgba(244,123,32,0.25)]"><span className="absolute bottom-2 h-[9px] w-[24px] rounded-t-full border-[3px] border-white border-b-0" /><span className="absolute bottom-[6px] h-[3px] w-[23px] bg-white" /><span className="absolute bottom-[4px] h-[3px] w-[3px] rounded-full bg-white" /><span className="absolute bottom-[4px] right-[6px] h-[3px] w-[3px] rounded-full bg-white" /></div>;
}

function StatusPill({ online, pending }: { online: boolean; pending: number }) {
  return <div className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${online ? "border-[#c9eadb] bg-[#f0fbf6] text-[#16805a]" : "border-[#f1d2ca] bg-[#fff5f1] text-[#c35c42]"}`}><span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-[#27ae78] shadow-[0_0_0_3px_rgba(39,174,120,0.12)]" : "bg-[#dd715c]"}`} />{online ? "Online" : "Offline"}{pending > 0 && <span className="border-l border-current/20 pl-2">{pending} pend.</span>}</div>;
}

function SectionTitle({ eyebrow, title, action, onAction, dark = false }: { eyebrow?: string; title: string; action?: string; onAction?: () => void; dark?: boolean }) {
  return <div className="mb-3 flex items-end justify-between gap-3"><div>{eyebrow && <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#f47b20]">{eyebrow}</p>}<h2 className={dark ? "font-display text-[18px] font-extrabold tracking-[-0.04em] text-white" : "font-display text-[18px] font-extrabold tracking-[-0.04em] text-[#17324d]"}>{title}</h2></div>{action && <button onClick={onAction} className="flex items-center gap-1 text-[10px] font-bold text-[#3567ae]">{action}<ChevronRight size={13} /></button>}</div>;
}

export function AgentMobile({ userName, demo, onNavigate, onSignOut }: AgentMobileProps) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [dark, setDark] = useState(false);
  const [command, setCommand] = useState("");
  const [listening, setListening] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"idle" | "typing" | "thinking" | "responding">("idle");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [messages, setMessages] = useStored<ChatMessage[]>("toldo:agent-messages", [{ id: "welcome", from: "ai", text: `Olá, ${userName}! Sou seu assistente operacional. Posso consultar agenda, clientes, estoque e registrar atividades no Toldo Pro.`, time: "agora" }]);
  const [queue, setQueue] = useStored<SyncItem[]>("toldo:sync-queue", []);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const pendingCount = queue.filter((item) => item.status === "pending" || item.status === "syncing" || item.status === "failed").length;
  const initials = userName.slice(0, 2).toUpperCase();

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const handleInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  const syncPending = useCallback(() => {
    if (!online) return;
    const pending = queue.filter((item) => item.status === "pending" || item.status === "failed");
    if (!pending.length) return;
    const ids = pending.map((item) => item.id);
    setQueue((current) => current.map((item) => ids.includes(item.id) ? { ...item, status: "syncing" } : item));
    window.setTimeout(() => setQueue((current) => current.map((item) => ids.includes(item.id) ? { ...item, status: "synced" } : item)), 850);
  }, [online, queue, setQueue]);

  useEffect(() => { if (online) syncPending(); }, [online]);

  const addToQueue = useCallback((title: string, kind: SyncItem["kind"]) => {
    const id = `${kind}:${title.trim().toLocaleLowerCase("pt-BR")}`;
    setQueue((current) => {
      if (current.some((item) => item.id === id && item.status !== "failed")) return current;
      return [{ id, title, kind, status: online ? "syncing" : "pending", createdAt: new Date().toISOString() }, ...current];
    });
    if (online) window.setTimeout(() => setQueue((current) => current.map((item) => item.id === id ? { ...item, status: "synced" } : item)), 850);
  }, [online, setQueue]);

  const appendMessage = (from: ChatMessage["from"], text: string) => setMessages((current) => [...current, { id: makeId("message"), from, text, time: "agora" }]);

  const answerFor = (text: string) => {
    const normalized = text.toLocaleLowerCase("pt-BR");
    if (normalized.includes("instala") && normalized.includes("amanhã")) return "Amanhã: 08:30 com Marina Lopes, Rua Harmonia, 245. Equipe Carlos, 2 pessoas.";
    if (normalized.includes("cliente") || normalized.includes("crm")) return "Encontrei 4 clientes ativos. Marina Lopes e Clínica Vitta têm os próximos atendimentos na agenda.";
    if (normalized.includes("orçamento") || normalized.includes("orcamento")) return "3 orçamentos importantes: 1 aprovado, 1 em negociação e 1 enviado. O #1538 aguarda a Clínica Vitta.";
    if (normalized.includes("estoque") || normalized.includes("baixo")) return "2 itens críticos: lona bege 3,00m (18 m de 25 m) e motor tubular 45Nm (7 de 10 un.).";
    if (normalized.includes("financeiro") || normalized.includes("faturamento")) return "Faturamento do mês: R$ 184.620. Há 38 orçamentos abertos no funil comercial.";
    if (normalized.includes("pendên") || normalized.includes("penden")) return `Você tem ${pendingCount || 3} pendências locais. Posso listar, revisar ou sincronizar cada uma.`;
    if (normalized.includes("sincron")) return online ? "Sincronização iniciada. Nenhum registro será duplicado." : "Assim que a conexão voltar, sincronizo automaticamente as pendências.";
    if (normalized.includes("lead") || normalized.includes("whatsapp")) return "Posso criar um lead a partir desta conversa. Antes de criar ou enviar, preciso da sua confirmação.";
    return "Posso consultar dados ou preparar uma ação. Você quer consultar, criar ou registrar?";
  };

  const send = (rawText = command) => {
    const text = rawText.trim();
    if (!text) return;
    appendMessage("user", text);
    setCommand("");
    setAgentStatus("thinking");
    const normalized = text.toLocaleLowerCase("pt-BR");
    const needsConfirmation = /crie|criar|registre|registrar|exclua|excluir|altere|alterar|envie|enviar/.test(normalized);
    window.setTimeout(() => {
      if (needsConfirmation) {
        setPendingAction({ title: text, description: "Esta ação será registrada no Toldo Pro com as permissões do seu usuário." });
        respond("Posso preparar essa ação para você. Confirme abaixo para continuar — ações críticas nunca são executadas sem autorização.");
        return;
      }
      if (!online) addToQueue(text, "command");
      if (normalized.includes("sincron")) syncPending();
      respond(online ? answerFor(text) : "Comando registrado na fila offline. Vou processar quando a conexão com o Toldo Pro voltar.");
    }, 520);
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    addToQueue(pendingAction.title, "action");
    respond(online ? "Ação autorizada e enviada para a fila segura do Toldo Pro. Você verá o status aqui até concluir." : "Ação autorizada e guardada localmente. Ela será sincronizada automaticamente quando você voltar a ficar online.");
    setPendingAction(null);
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      toast.info("Seu navegador não oferece captura de voz", { description: "Você ainda pode digitar o comando no campo abaixo." });
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => { setCommand(event.results[0][0].transcript); setAgentStatus("idle"); };
        recognition.onend = () => { setListening(false); setAgentStatus("idle"); };
    recognitionRef.current = recognition;
    setListening(true);
    setAgentStatus("typing");
    recognition.start();
  };

  const installApp = async () => {
    if (!installPrompt) {
      toast.info("Para instalar", { description: "Abra o menu do navegador e escolha 'Adicionar à tela inicial'." });
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const shortcuts = useMemo(() => quickActions, []);
  const latestQueue = queue.filter((item) => item.status !== "synced").slice(0, 3);
  const scrollToConversation = () => chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const respond = (text: string) => { setAgentStatus("responding"); appendMessage("ai", text); window.setTimeout(() => setAgentStatus("idle"), 1300); };

  return <div className={dark ? "min-h-screen bg-[#0f2033] text-[#edf5fc]" : "min-h-screen bg-[#f4f7fb] text-[#17324d]"}>
    <div className="mx-auto min-h-screen max-w-[1180px]">
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${dark ? "border-white/10 bg-[#0f2033]/90" : "border-[#e4ebf3]/90 bg-[#f4f7fb]/90"}`}>
        <div className="flex h-[68px] items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-2.5"><LogoMark /><div><p className={`font-display text-[15px] font-extrabold tracking-[-0.04em] ${dark ? "text-white" : "text-[#17324d]"}`}>toldo<span className="text-[#f47b20]">pro</span></p><p className={`text-[8px] font-bold uppercase tracking-[0.18em] ${dark ? "text-[#91aac3]" : "text-[#8da0b4]"}`}>agente de campo</p></div></div>
          <div className="flex items-center gap-1.5"><StatusPill online={online} pending={pendingCount} /><button onClick={() => { setShowQueue(true); syncPending(); }} className={dark ? "flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-2.5 text-white" : "flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#dce8e1] bg-[#f0fbf6] px-2.5 text-[#16805a]"} aria-label="Sincronizar agora"><RefreshCw size={15} className={pendingCount > 0 ? "animate-spin" : ""} /><span className="hidden text-[10px] font-bold sm:inline">Sincronizar</span></button><button onClick={() => setDark((value) => !value)} className={dark ? "hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-[#f8bf7b] sm:flex" : "hidden h-9 w-9 items-center justify-center rounded-xl border border-[#e0e8f0] bg-white text-[#6d829a] sm:flex"} aria-label="Alternar modo escuro">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><button onClick={() => setShowProfile(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8b99d] text-[10px] font-extrabold text-[#75432f]" aria-label="Abrir perfil">{initials}</button></div>
        </div>
      </header>

      <main className="px-4 pb-[112px] pt-6 sm:px-7 sm:pt-8">
        <section className="mb-6 flex items-end justify-between gap-4"><div><p className={`mb-2 text-[11px] font-bold ${dark ? "text-[#a4bbcf]" : "text-[#8194a9]"}`}>Quarta-feira, 18 de setembro <span className="mx-1 text-[#f47b20]">·</span> Toldo Silva & Cia</p><h1 className={`font-display text-[28px] font-extrabold tracking-[-0.06em] sm:text-[34px] ${dark ? "text-white" : "text-[#17324d]"}`}>Bom dia, <span className="text-[#f47b20]">{userName}.</span></h1><p className={`mt-2 max-w-[420px] text-[13px] leading-5 ${dark ? "text-[#a4bbcf]" : "text-[#71859c]"}`}>Seu resumo operacional e o assistente que mantém o time em movimento.</p></div><button onClick={installApp} className="hidden items-center gap-2 rounded-xl bg-[#17324d] px-3 py-2 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(23,50,77,0.16)] sm:flex"><Plus size={14} /> Instalar app</button></section>

        <section className="mb-7 grid gap-3 md:grid-cols-[1.15fr_.85fr]"><div className="overflow-hidden rounded-[24px] bg-[#17324d] p-5 text-white shadow-[0_16px_36px_rgba(23,50,77,0.15)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a7bdd2]"><Sparkles size={14} className="text-[#f6a05b]" /> Assistente operacional</div><h2 className="max-w-[400px] font-display text-[22px] font-extrabold leading-tight tracking-[-0.05em] sm:text-[26px]">O que você precisa resolver agora?</h2><p className="mt-3 max-w-[390px] text-[12px] leading-5 text-[#b6c7d8]">Consulte dados reais, registre o campo e acompanhe pendências com segurança.</p></div><div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#f47b20] sm:flex"><Headphones size={21} /></div></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => send("Quais instalações eu tenho amanhã?")} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-white/15">Agenda de amanhã</button><button onClick={() => send("Liste o estoque baixo.")} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-white/15">Estoque baixo</button></div></div><div className={`rounded-[24px] border p-5 shadow-[0_10px_25px_rgba(35,67,101,0.05)] ${dark ? "border-white/10 bg-[#172d44]" : "border-[#e4ebf3] bg-white"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf8f3] text-[#15835e]"><CalendarDays size={17} /></div><div><p className={`text-[11px] font-bold ${dark ? "text-white" : "text-[#516980]"}`}>Resumo do dia</p><p className={`mt-0.5 text-[10px] ${dark ? "text-[#94abc1]" : "text-[#9aabba]"}`}>Sua próxima parada</p></div></div><span className="rounded-full bg-[#fff2e8] px-2 py-1 text-[9px] font-bold text-[#d76a21]">4 hoje · 1 amanhã</span></div><div className="mt-4 space-y-3">{agendaItems.map((item) => <button key={item.time} onClick={() => onNavigate("instalacoes")} className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left ${dark ? "hover:bg-white/5" : "hover:bg-[#f7f9fc]"}`}><span className="w-10 text-[11px] font-extrabold text-[#f47b20]">{item.time}</span><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.tone}`}><Wrench size={14} /></span><span className="min-w-0 flex-1"><span className={`block truncate text-[11px] font-bold ${dark ? "text-white" : "text-[#35506a]"}`}>{item.title}</span><span className={`mt-0.5 block truncate text-[10px] ${dark ? "text-[#94abc1]" : "text-[#95a6b6]"}`}>{item.meta}</span></span><ChevronRight size={14} className={dark ? "text-[#68839c]" : "text-[#c4d0dc]"} /></button>)}</div><button onClick={() => onNavigate("instalacoes")} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-[#f5f8fb] py-2.5 text-[10px] font-bold text-[#3567ae]">Abrir agenda completa <ChevronRight size={13} /></button></div></section>

        <section className="mb-5 grid grid-cols-3 gap-2.5 sm:grid-cols-3"><div className={dark ? "rounded-[18px] border border-white/10 bg-[#172d44] p-3" : "rounded-[18px] border border-[#e4ebf3] bg-white p-3 shadow-[0_7px_20px_rgba(35,67,101,0.04)]"}><div className="flex items-center gap-2 text-[#d76a21]"><ListChecks size={15} /><span className="text-[9px] font-extrabold uppercase tracking-[0.12em]">Pendências</span></div><p className={dark ? "mt-2 font-display text-[20px] font-extrabold text-white" : "mt-2 font-display text-[20px] font-extrabold text-[#17324d]"}>{pendingCount || 3}</p><p className={dark ? "text-[9px] text-[#9ab0c4]" : "text-[9px] text-[#91a2b2]"}>{latestQueue[0]?.title || "Para revisar hoje"}</p></div><div className={dark ? "rounded-[18px] border border-white/10 bg-[#172d44] p-3" : "rounded-[18px] border border-[#e4ebf3] bg-white p-3 shadow-[0_7px_20px_rgba(35,67,101,0.04)]"}><div className="flex items-center gap-2 text-[#15835e]"><Package size={15} /><span className="text-[9px] font-extrabold uppercase tracking-[0.12em]">Estoque baixo</span></div><p className={dark ? "mt-2 font-display text-[20px] font-extrabold text-white" : "mt-2 font-display text-[20px] font-extrabold text-[#17324d]"}>2</p><p className={dark ? "text-[9px] text-[#9ab0c4]" : "text-[9px] text-[#91a2b2]"}>itens críticos</p></div><div className={dark ? "rounded-[18px] border border-white/10 bg-[#172d44] p-3" : "rounded-[18px] border border-[#e4ebf3] bg-white p-3 shadow-[0_7px_20px_rgba(35,67,101,0.04)]"}><div className="flex items-center gap-2 text-[#7351c7]"><Wallet size={15} /><span className="text-[9px] font-extrabold uppercase tracking-[0.12em]">Financeiro</span></div><p className={dark ? "mt-2 font-display text-[20px] font-extrabold text-white" : "mt-2 font-display text-[20px] font-extrabold text-[#17324d]"}>R$ 184 mil</p><p className={dark ? "text-[9px] text-[#9ab0c4]" : "text-[9px] text-[#91a2b2]"}>faturamento no mês</p></div></section>

        <section className="mb-7"><SectionTitle title="Acesso rápido" action="Ver tudo" onAction={() => onNavigate("painel")} dark={dark} /><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">{shortcuts.map((item) => { const Icon = item.icon; return <button key={item.label} onClick={() => send(item.prompt)} className={dark ? "group rounded-[18px] border border-white/10 bg-[#172d44] p-3 text-left transition hover:-translate-y-0.5" : "group rounded-[18px] border border-[#e4ebf3] bg-white p-3 text-left shadow-[0_7px_20px_rgba(35,67,101,0.04)] transition hover:-translate-y-0.5"}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}><Icon size={16} /></span><span className={dark ? "mt-3 block text-[11px] font-extrabold text-white" : "mt-3 block text-[11px] font-extrabold text-[#35506a]"}>{item.label}</span><span className={dark ? "mt-1 block truncate text-[9px] text-[#92a9be]" : "mt-1 block truncate text-[9px] text-[#9aaaba]"}>{item.helper}</span></button>; })}</div></section>

        <section id="agent-conversation" className="scroll-mt-20 grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className={`rounded-[24px] border p-4 sm:p-5 ${dark ? "border-white/10 bg-[#172d44]" : "border-[#e4ebf3] bg-white shadow-[0_10px_28px_rgba(35,67,101,0.05)]"}`}><div className="mb-4 flex items-center justify-between"><SectionTitle eyebrow="Conversa" title="Fale com a IA" dark={dark} /><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${online ? "bg-[#eaf8f3] text-[#15835e]" : "bg-[#fff0ec] text-[#c35c42]"}`}>{online ? "dados atualizados" : "modo offline"}</span></div><div className={`max-h-[305px] min-h-[220px] space-y-3 overflow-y-auto rounded-[20px] p-3 ${dark ? "bg-[#102438]" : "bg-[#f7f9fc]"}`}>{agentStatus !== "idle" && <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-[#f47b20]"><span className="flex gap-0.5"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f47b20]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f47b20] [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f47b20] [animation-delay:240ms]" /></span>{agentStatus === "typing" ? "Digitando..." : agentStatus === "thinking" ? "Pensando..." : "Respondendo..."}</div>}{messages.slice(-6).map((message) => <div key={message.id} className={`group flex ${message.from === "user" ? "justify-end" : "justify-start"}`}><div className={`relative max-w-[88%] rounded-[18px] px-3.5 py-3 text-[12px] leading-5 ${message.from === "user" ? "rounded-br-md bg-[#f47b20] text-white" : dark ? "rounded-bl-md bg-[#1f3b55] text-[#dce9f4]" : "rounded-bl-md bg-white text-[#506981] shadow-sm"}`}>{message.text}{message.from === "ai" && <button onClick={() => speak(message.text)} className="ml-2 inline-flex translate-y-0.5 text-[#f47b20]" aria-label="Ouvir resposta"><Speaker size={13} /></button>}<span className={`mt-1 block text-[9px] ${message.from === "user" ? "text-white/65" : dark ? "text-[#89a2ba]" : "text-[#a2b0bd]"}`}>{message.time}</span></div></div>)}</div>{pendingAction && <div className={`mt-3 rounded-2xl border p-3 ${dark ? "border-[#f0a36d]/40 bg-[#3a2c26]" : "border-[#f5c9aa] bg-[#fff7f1]"}`}><div className="flex items-start gap-2"><CircleAlert size={16} className="mt-0.5 shrink-0 text-[#d76a21]" /><div className="min-w-0 flex-1"><p className={`text-[11px] font-extrabold ${dark ? "text-[#ffd3af]" : "text-[#8b4b28]"}`}>Confirma esta ação?</p><p className={`mt-1 text-[10px] leading-4 ${dark ? "text-[#e8baa0]" : "text-[#a16f50]"}`}>{pendingAction.description}</p><p className={`mt-1 truncate text-[10px] font-bold ${dark ? "text-white" : "text-[#526b82]"}`}>{pendingAction.title}</p><div className="mt-3 flex gap-2"><button onClick={confirmAction} className="rounded-xl bg-[#f47b20] px-3 py-2 text-[10px] font-bold text-white">Confirmar</button><button onClick={() => setPendingAction(null)} className={`rounded-xl px-3 py-2 text-[10px] font-bold ${dark ? "bg-white/10 text-white" : "bg-white text-[#71859a]"}`}>Cancelar</button></div></div></div></div>}
          <div className={`fixed bottom-[78px] left-3 right-3 z-30 flex items-center gap-2 rounded-[18px] border p-2 shadow-[0_10px_24px_rgba(23,50,77,0.12)] sm:left-1/2 sm:right-auto sm:w-[calc(100%-2rem)] sm:max-w-[560px] sm:-translate-x-1/2 lg:sticky lg:bottom-0 lg:left-auto lg:right-auto lg:mt-3 lg:w-auto lg:translate-x-0 ${dark ? "border-white/10 bg-[#1c374f]" : "border-[#e4ebf3] bg-white"}`}><button onClick={toggleVoice} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition ${listening ? "animate-pulse bg-[#d75b48] text-white" : "bg-[#eaf1ff] text-[#2859a6]"}`} aria-label={listening ? "Parar gravação" : "Falar com a IA"}>{listening ? <Loader2 size={18} className="animate-spin" /> : <Mic size={19} />}</button><input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder={listening ? "Ouvindo..." : "Digite um comando..."} className={`min-w-0 flex-1 bg-transparent px-1 text-[12px] outline-none ${dark ? "text-white placeholder:text-[#86a0b8]" : "text-[#35506a] placeholder:text-[#a3b0bd]"}`} /><button onClick={() => send()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f47b20] text-white shadow-[0_5px_12px_rgba(244,123,32,0.22)]" aria-label="Enviar comando"><ArrowUp size={18} /></button></div><div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-[#95a6b6]"><Sparkles size={11} className="text-[#f47b20]" /> A IA pergunta antes de agir e usa suas permissões do Toldo Pro</div></div>

          <div className="space-y-4"><div className={`rounded-[24px] p-5 text-white shadow-[0_12px_28px_rgba(23,50,77,0.14)] ${online ? "bg-[#1b5670]" : "bg-[#7a4038]"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]">{online ? <Cloud size={15} /> : <CloudOff size={15} />} Sincronização</div><span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold">{online ? "automática" : "fila local"}</span></div><div className="mt-6 flex items-end justify-between gap-3"><div><p className="font-display text-[28px] font-extrabold tracking-[-0.05em]">{pendingCount}</p><p className="mt-1 text-[11px] text-white/70">operações pendentes</p></div><button onClick={() => { setShowQueue(true); syncPending(); }} className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[10px] font-bold text-white"><RefreshCw size={13} /> Sincronizar</button></div><div className="mt-5 border-t border-white/15 pt-3 text-[10px] text-white/70">{online ? "Conectado ao sistema principal Toldo Pro" : "Sem conexão · nada será perdido"}</div></div><div className={`rounded-[24px] border p-5 ${dark ? "border-white/10 bg-[#172d44]" : "border-[#e4ebf3] bg-white shadow-[0_9px_24px_rgba(35,67,101,0.04)]"}`}><SectionTitle title="Operação em foco" action="Abrir instalações" onAction={() => onNavigate("instalacoes")} dark={dark} /><div className="space-y-3"><div className={`flex items-center gap-3 rounded-2xl p-3 ${dark ? "bg-[#102438]" : "bg-[#f7f9fc]"}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0e3] text-[#d76a21]"><CircleAlert size={16} /></span><div className="min-w-0 flex-1"><p className={`text-[11px] font-extrabold ${dark ? "text-white" : "text-[#35506a]"}`}>Estoque requer atenção</p><p className={`mt-1 text-[10px] ${dark ? "text-[#9ab0c4]" : "text-[#91a2b2]"}`}>2 materiais abaixo do mínimo</p></div><ChevronRight size={14} className="text-[#bdc9d4]" /></div><div className={`flex items-center gap-3 rounded-2xl p-3 ${dark ? "bg-[#102438]" : "bg-[#f7f9fc]"}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf1ff] text-[#2859a6]"><FileText size={16} /></span><div className="min-w-0 flex-1"><p className={`text-[11px] font-extrabold ${dark ? "text-white" : "text-[#35506a]"}`}>Orçamento importante</p><p className={`mt-1 text-[10px] ${dark ? "text-[#9ab0c4]" : "text-[#91a2b2]"}`}>#1538 aguarda retorno da Clínica Vitta</p></div><ChevronRight size={14} className="text-[#bdc9d4]" /></div></div></div></div></section>
      </main>

      <nav className={dark ? "fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#102438]/95 backdrop-blur-xl sm:left-1/2 sm:right-auto sm:w-[calc(100%-3.5rem)] sm:max-w-[1110px] sm:-translate-x-1/2 sm:rounded-t-[22px]" : "fixed bottom-0 left-0 right-0 z-40 border-t border-[#e4ebf3] bg-white/95 backdrop-blur-xl sm:left-1/2 sm:right-auto sm:w-[calc(100%-3.5rem)] sm:max-w-[1110px] sm:-translate-x-1/2 sm:rounded-t-[22px]"}><div className="mx-auto grid h-[70px] max-w-[560px] grid-cols-6 items-center px-2 sm:max-w-none sm:px-4"><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={dark ? "flex flex-col items-center gap-1 text-[9px] font-bold text-[#9ab0c4]" : "flex flex-col items-center gap-1 text-[9px] font-bold text-[#91a2b2]"}><Home size={18} />Home</button><button onClick={scrollToConversation} className="flex flex-col items-center gap-1 text-[9px] font-extrabold text-[#f47b20]"><MessageCircle size={18} />Conversa</button><button onClick={() => onNavigate("instalacoes")} className={dark ? "flex flex-col items-center gap-1 text-[9px] font-bold text-[#9ab0c4]" : "flex flex-col items-center gap-1 text-[9px] font-bold text-[#91a2b2]"}><CalendarDays size={18} />Agenda</button><button onClick={() => setShowQueue(true)} className={dark ? "flex flex-col items-center gap-1 text-[9px] font-bold text-[#9ab0c4]" : "flex flex-col items-center gap-1 text-[9px] font-bold text-[#91a2b2]"}><ListChecks size={18} />Pendências</button><button onClick={() => { setShowQueue(true); syncPending(); }} className={dark ? "flex flex-col items-center gap-1 text-[9px] font-bold text-[#9ab0c4]" : "flex flex-col items-center gap-1 text-[9px] font-bold text-[#91a2b2]"}><RefreshCw size={18} />Sync</button><button onClick={() => setShowProfile(true)} className={dark ? "flex flex-col items-center gap-1 text-[9px] font-bold text-[#9ab0c4]" : "flex flex-col items-center gap-1 text-[9px] font-bold text-[#91a2b2]"}><UserRound size={18} />Perfil</button></div></nav>

      {showProfile && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#102438]/35 p-3 backdrop-blur-sm sm:items-center"><div className={dark ? "w-full max-w-[420px] rounded-[26px] bg-[#172d44] p-5 text-white shadow-[0_24px_70px_rgba(16,36,56,0.25)]" : "w-full max-w-[420px] rounded-[26px] bg-white p-5 text-[#17324d] shadow-[0_24px_70px_rgba(16,36,56,0.25)]"}><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8b99d] text-sm font-extrabold text-[#75432f]">{initials}</div><div><p className="font-display text-[17px] font-extrabold">{userName}</p><p className={dark ? "mt-1 text-[10px] text-[#9ab0c4]" : "mt-1 text-[10px] text-[#8ea0b1]"}>{demo ? "Modo demonstração" : "Administrador · Toldo Silva & Cia"}</p></div></div><button onClick={() => setShowProfile(false)} className="rounded-xl p-2 text-[#93a6b7]" aria-label="Fechar perfil"><X size={18} /></button></div><div className="mt-5 space-y-2"><button onClick={() => { setShowProfile(false); onNavigate("gestao"); }} className={dark ? "flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-left text-[11px] font-bold text-white" : "flex w-full items-center gap-3 rounded-2xl bg-[#f7f9fc] p-3 text-left text-[11px] font-bold text-[#526b82]"}><Settings2 size={16} className="text-[#f47b20]" /> Empresa e permissões <ChevronRight size={14} className="ml-auto" /></button><button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-2xl bg-[#fff0ec] p-3 text-left text-[11px] font-bold text-[#c35c42]"><CloudOff size={16} /> Sair da sessão</button></div></div></div>}

      {showQueue && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#102438]/35 p-3 backdrop-blur-sm sm:items-center"><div className={`w-full max-w-[470px] rounded-[26px] p-5 shadow-[0_24px_70px_rgba(16,36,56,0.25)] ${dark ? "bg-[#172d44] text-white" : "bg-white text-[#17324d]"}`}><div className="flex items-start justify-between"><div><p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#f47b20]">Toldo Pro · sincronização</p><h2 className="font-display text-[21px] font-extrabold tracking-[-0.05em]">Fila de operações</h2></div><button onClick={() => setShowQueue(false)} className="rounded-xl p-2 text-[#93a6b7]" aria-label="Fechar fila"><X size={18} /></button></div><p className={`mt-2 text-[11px] leading-5 ${dark ? "text-[#a4bbcf]" : "text-[#7e91a5]"}`}>Registros do mesmo usuário e empresa, aguardando confirmação do sistema principal.</p><div className="mt-5 max-h-[300px] space-y-2 overflow-y-auto">{queue.length ? queue.slice(0, 8).map((item) => <div key={item.id} className={`flex items-center gap-3 rounded-2xl p-3 ${dark ? "bg-[#102438]" : "bg-[#f7f9fc]"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.status === "synced" ? "bg-[#eaf8f3] text-[#15835e]" : item.status === "syncing" ? "bg-[#eaf1ff] text-[#2859a6]" : item.status === "failed" ? "bg-[#fff0ec] text-[#c35c42]" : "bg-[#fff2e8] text-[#d76a21]"}`}>{item.status === "synced" ? <Check size={15} /> : item.status === "syncing" ? <Loader2 size={15} className="animate-spin" /> : <CloudOff size={15} />}</span><div className="min-w-0 flex-1"><p className={`truncate text-[11px] font-bold ${dark ? "text-white" : "text-[#526b82]"}`}>{item.title}</p><p className={`mt-1 text-[9px] ${dark ? "text-[#91a9bf]" : "text-[#9aaaba]"}`}>{item.status === "synced" ? "Sincronizado" : item.status === "syncing" ? "Sincronizando" : item.status === "failed" ? "Falhou · tentar novamente" : "Pendente"}</p></div><span className="text-[9px] font-bold uppercase text-[#a1afbd]">{item.kind === "action" ? "ação" : "comando"}</span></div>) : <div className="rounded-2xl bg-[#eaf8f3] p-4 text-center text-[11px] font-bold text-[#15835e]">Tudo sincronizado com o Toldo Pro</div>}</div><div className="mt-5 flex gap-2"><button onClick={() => { syncPending(); toast.success("Sincronização iniciada"); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white"><RefreshCw size={15} /> Sincronizar agora</button><button onClick={installApp} className={`flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-bold ${dark ? "bg-white/10 text-white" : "bg-[#f3f6f9] text-[#526b82]"}`}><Plus size={14} /> Instalar</button></div></div></div>}
    </div>
  </div>;
}
