import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mic,
  Package,
  RefreshCw,
  Send,
  Sparkles,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";

type Props = {
  user: {
    name: string;
    role: string;
  };
  demo?: boolean;
};

type Message = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  time: string;
};

type FlowQuote = {
  id: string;
  clientName: string;
  status?: string;
};

type FlowClient = {
  id: string;
  name: string;
  originQuoteId?: string;
};

type FlowOS = {
  id: string;
  number: string;
  status?: string;
  quoteId?: string;
};

type FlowProduction = {
  id: string;
  status?: string;
  quoteId?: string;
};

type FlowInstallation = {
  id: string;
  status?: string;
  productionId?: string;
};

type FlowState = {
  quotes: FlowQuote[];
  clients: FlowClient[];
  osList: FlowOS[];
  production: FlowProduction[];
  installations: FlowInstallation[];
};

const CHAT_KEY = "toldo-pro-ia-chat-v2";
const FLOW_KEY = "toldo-pro-flow-v2";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function nowLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

function loadFlow(): FlowState {
  if (typeof window === "undefined") {
    return { quotes: [], clients: [], osList: [], production: [], installations: [] };
  }

  try {
    const raw = localStorage.getItem(FLOW_KEY);
    if (!raw) return { quotes: [], clients: [], osList: [], production: [], installations: [] };
    const parsed = JSON.parse(raw);

    return {
      quotes: parsed.quotes || [],
      clients: parsed.clients || [],
      osList: parsed.osList || [],
      production: parsed.production || [],
      installations: parsed.installations || [],
    };
  } catch {
    return { quotes: [], clients: [], osList: [], production: [], installations: [] };
  }
}

export default function IA({ user, demo }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [flow, setFlow] = useState<FlowState>(() => loadFlow());

  useEffect(() => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const handleOnline = () => setOnline(navigator.onLine);
    handleOnline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOnline);
    };
  }, []);

  useEffect(() => {
    const refresh = () => setFlow(loadFlow());
    refresh();
    const interval = window.setInterval(refresh, 2000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: uid(),
          role: "assistant",
          text: `Olá, ${user.name}. Sou seu assistente operacional. Posso consultar agenda, clientes, orçamento, OS, produção, instalações, estoque e pendências.`,
          time: nowLabel(),
        },
      ]);
    }
  }, [messages.length, user.name]);

  const stats = useMemo(() => {
    const approvedQuotes = flow.quotes.filter((q) => q.status === "Aprovado").length;
    const pendingQuotes = flow.quotes.filter((q) => q.status !== "Aprovado" && q.status !== "Recusado").length;
    const clients = flow.clients.length;
    const osIssued = flow.osList.length;
    const prodIn = flow.production.filter((p) => p.status === "Em produção").length;
    const prodReady = flow.production.filter((p) => p.status === "Pronto para instalar").length;
    const installs = flow.installations.length;
    const installsScheduled = flow.installations.filter((i) => i.status === "Agendada").length;

    return {
      approvedQuotes,
      pendingQuotes,
      clients,
      osIssued,
      prodIn,
      prodReady,
      installs,
      installsScheduled,
    };
  }, [flow]);

  const summaryCards = [
    { label: "Orçamentos", value: String(stats.pendingQuotes), icon: FileText },
    { label: "Clientes", value: String(stats.clients), icon: UserRound },
    { label: "OS", value: String(stats.osIssued), icon: CheckCircle2 },
    { label: "Prontos p/ instalar", value: String(stats.prodReady), icon: Truck },
  ];

  function buildSummary() {
    return [
      `Orçamentos pendentes: ${stats.pendingQuotes}.`,
      `Orçamentos aprovados: ${stats.approvedQuotes}.`,
      `OS emitidas: ${stats.osIssued}.`,
      `Produção em andamento: ${stats.prodIn}.`,
      `Produção pronta para instalar: ${stats.prodReady}.`,
      `Instalações agendadas: ${stats.installsScheduled}.`,
    ].join(" ");
  }

  function suggestion() {
    if (stats.pendingQuotes > 0) return "Próxima ação: aprovar orçamento ou converter em cliente.";
    if (stats.approvedQuotes > stats.osIssued) return "Próxima ação: emitir a OS dos orçamentos aprovados.";
    if (stats.prodReady > stats.installs) return "Próxima ação: criar a instalação a partir da produção pronta.";
    if (stats.prodIn > 0) return "Próxima ação: acompanhar a produção em andamento.";
    return "Próxima ação: revisar agenda, estoque e financeiro.";
  }

  function replyFor(text: string) {
    const t = text.toLowerCase();

    if (
      t.includes("resumo") ||
      t.includes("o que foi feito hoje") ||
      t.includes("oque foi feito hoje") ||
      t.includes("o que precisa resolver agora") ||
      t.includes("oque precisa resolver agora")
    ) {
      return `${buildSummary()} ${suggestion()}`;
    }

    if (t.includes("instala") && t.includes("aman")) {
      return `Você tem ${stats.installsScheduled} instalação(ões) agendada(s). Se a produção já estiver pronta, posso preparar a instalação com a descrição técnica completa.`;
    }

    if (t.includes("instala")) {
      return `Hoje o sistema tem ${stats.installs} instalação(ões) registradas e ${stats.installsScheduled} agendada(s).`;
    }

    if (t.includes("estoque")) {
      return "Posso consultar o estoque e apontar itens críticos, mas preciso que o módulo de estoque esteja carregando os dados reais do sistema.";
    }

    if (t.includes("orc") || t.includes("orç")) {
      return `Há ${stats.pendingQuotes} orçamento(s) pendente(s) e ${stats.approvedQuotes} aprovado(s).`;
    }

    if (t.includes("cliente")) {
      return `Existem ${stats.clients} cliente(s) vinculados ao fluxo atual.`;
    }

    if (t.includes("produ")) {
      return `Produção: ${stats.prodIn} em andamento e ${stats.prodReady} pronta(s) para instalar.`;
    }

    if (t.includes("os") || t.includes("ordem de serv")) {
      return `Existem ${stats.osIssued} OS emitida(s).`;
    }

    if (t.includes("sincron")) {
      return online
        ? "Sincronização possível agora. Quer que eu alinhe as pendências?"
        : "Sem internet. A ação entrou na fila e será sincronizada quando a conexão voltar.";
    }

    if (t.includes("converter") && t.includes("cliente")) {
      return "Posso converter o orçamento aprovado em cliente mantendo o vínculo com o orçamento original.";
    }

    if (t.includes("emitir")) {
      return "Posso emitir a OS com os dados do orçamento aprovado e liberar o fluxo para produção.";
    }

    if (t.includes("pronto para instalar")) {
      return "Quando a produção ficar pronta para instalar, eu posso criar a instalação automaticamente com toda a descrição técnica.";
    }

    return "Entendi. Posso consultar o resumo do dia, orçamentos, clientes, OS, produção, instalações ou criar uma ação operacional.";
  }

  async function sendMessage(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;

    const userMessage: Message = {
      id: uid(),
      role: "user",
      text: value,
      time: nowLabel(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);

    window.setTimeout(() => {
      const assistantMessage: Message = {
        id: uid(),
        role: "assistant",
        text: replyFor(value),
        time: nowLabel(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setThinking(false);
    }, 450);
  }

  function addQuickAction(label: string) {
    sendMessage(label);
  }

  function syncNow() {
    setSyncQueue((prev) => prev + 1);

    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "system",
        text: online
          ? "Sincronização iniciada. Vou atualizar as informações do sistema."
          : "Sem internet. A ação entrou na fila e será sincronizada depois.",
        time: nowLabel(),
      },
    ]);

    window.setTimeout(() => {
      if (online) setSyncQueue(0);
    }, 700);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-orange-500">Conversa</p>
              <h1 className="text-xl font-semibold">Agente Toldo Pro IA</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                online ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              {online ? "Online" : "Offline"}
            </span>
            <button
              onClick={syncNow}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <Icon className="h-5 w-5 text-orange-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-4 rounded-3xl bg-slate-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-orange-300">Assistente operacional</p>
              <h2 className="mt-2 text-3xl font-semibold">O que você precisa resolver agora?</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                Consulte dados reais, peça resumo do dia e registre ações com segurança.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => addQuickAction("Resumo do dia")}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                >
                  Resumo do dia
                </button>
                <button
                  onClick={() => addQuickAction("Orçamentos pendentes")}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                >
                  Orçamentos pendentes
                </button>
                <button
                  onClick={() => addQuickAction("OS emitidas")}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                >
                  OS
                </button>
                <button
                  onClick={() => addQuickAction("Produção pronta para instalar")}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                >
                  Pronto para instalar
                </button>
              </div>
            </div>

            <div className="h-[520px] overflow-auto rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        m.role === "user"
                          ? "bg-orange-500 text-white"
                          : m.role === "system"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      <p>{m.text}</p>
                      <p className="mt-2 text-[11px] opacity-70">{m.time}</p>
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      Pensando...
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <Mic className="h-5 w-5" />
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Digite um comando..."
                className="h-12 flex-1 bg-transparent px-2 text-sm outline-none"
              />

              <button
                onClick={() => sendMessage()}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-slate-400">
              A IA pergunta antes de agir e respeita as permissões do Toldo Pro.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Ações rápidas</h3>
              </div>

              <div className="space-y-2">
                {[
                  "Quais instalações tenho amanhã?",
                  "Mostre o estoque baixo",
                  "Quais orçamentos estão pendentes?",
                  "Resumo do dia",
                  "Criar lead",
                  "Emitir OS",
                ].map((label) => (
                  <button
                    key={label}
                    onClick={() => addQuickAction(label)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <span>{label}</span>
                    <Send className="h-4 w-4 text-orange-500" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <UserRound className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Acesso atual</h3>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p><strong>Usuário:</strong> {user.name}</p>
                <p><strong>Perfil:</strong> {user.role}</p>
                <p><strong>Modo:</strong> {demo ? "Demonstração" : "Operação"}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Fluxo operacional</h3>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Orçamento aprovado
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Cliente criado
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  OS emitida
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Produção pronta para instalar
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Instalação criada
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {demo && (
        <div className="fixed bottom-4 right-4 rounded-full bg-slate-900 px-4 py-2 text-xs text-white shadow-lg">
          Modo demo
        </div>
      )}
    </div>
  );
}