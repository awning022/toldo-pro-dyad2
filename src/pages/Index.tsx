import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Hammer,
  Home,
  Package,
  Send,
  RotateCcw,
  Truck,
} from "lucide-react";

type Props = {
  user: {
    name: string;
    role: string;
  };
  demo?: boolean;
};

type QuoteStatus = "Rascunho" | "Aprovado" | "Recusado";
type OSStatus = "Emitida" | "Enviada para produção";
type ProductionStatus =
  | "Aguardando produção"
  | "Em produção"
  | "Parado"
  | "Pronto para instalar";
type InstallationStatus = "Agendada" | "A caminho" | "Instalando" | "Concluída";

type Quote = {
  id: string;
  clientName: string;
  phone: string;
  address: string;
  model: string;
  width: string;
  projection: string;
  material: string;
  color: string;
  amount: number;
  status: QuoteStatus;
  linkedClientId?: string;
  linkedOSId?: string;
  history: string[];
};

type Client = {
  id: string;
  name: string;
  phone: string;
  address: string;
  originQuoteId: string;
  notes: string;
  history: string[];
};

type OS = {
  id: string;
  number: string;
  clientId: string;
  quoteId: string;
  createdAt: string;
  status: OSStatus;
  history: string[];
};

type Production = {
  id: string;
  osId: string;
  quoteId: string;
  clientId: string;
  clientName: string;
  model: string;
  width: string;
  projection: string;
  material: string;
  color: string;
  technicalNotes: string;
  status: ProductionStatus;
  history: string[];
};

type Installation = {
  id: string;
  productionId: string;
  osId: string;
  quoteId: string;
  clientId: string;
  clientName: string;
  address: string;
  model: string;
  width: string;
  projection: string;
  material: string;
  color: string;
  technicalNotes: string;
  status: InstallationStatus;
  history: string[];
};

type AppState = {
  quotes: Quote[];
  clients: Client[];
  osList: OS[];
  production: Production[];
  installations: Installation[];
};

const STORAGE_KEY = "toldo-pro-flow-v2";

const initialState: AppState = {
  quotes: [
    {
      id: "q-1001",
      clientName: "João Silva",
      phone: "(11) 99999-1111",
      address: "Rua das Flores, 10",
      model: "Toldo retrátil",
      width: "3,20m",
      projection: "2,00m",
      material: "Lona PVC 500g",
      color: "Bege",
      amount: 4850,
      status: "Aprovado",
      linkedClientId: undefined,
      linkedOSId: undefined,
      history: ["Orçamento criado", "Orçamento aprovado"],
    },
    {
      id: "q-1002",
      clientName: "Loja Central LTDA",
      phone: "(11) 98888-2222",
      address: "Av. Central, 120",
      model: "Cobertura fixa",
      width: "5,00m",
      projection: "3,00m",
      material: "Policarbonato",
      color: "Cinza",
      amount: 12600,
      status: "Rascunho",
      linkedClientId: undefined,
      linkedOSId: undefined,
      history: ["Orçamento criado"],
    },
  ],
  clients: [],
  osList: [],
  production: [],
  installations: [],
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadState(): AppState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppState) : initialState;
  } catch {
    return initialState;
  }
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cardClass(active?: boolean) {
  return `rounded-2xl border p-4 shadow-sm ${
    active ? "border-orange-500/40 bg-orange-50" : "border-slate-200 bg-white"
  }`;
}

function badgeClass(status: string) {
  if (status === "Aprovado" || status === "Pronto para instalar" || status === "Concluída") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Parado" || status === "Recusado") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "Em produção" || status === "A caminho" || status === "Instalando") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

export default function Index({ user, demo }: Props) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [confirmText, setConfirmText] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const stats = useMemo(() => {
    const approved = state.quotes.filter((q) => q.status === "Aprovado").length;
    const ready = state.production.filter((p) => p.status === "Pronto para instalar").length;
    const inProduction = state.production.filter((p) => p.status === "Em produção").length;
    const scheduled = state.installations.filter((i) => i.status === "Agendada").length;
    return { approved, ready, inProduction, scheduled };
  }, [state]);

  function askConfirm(message: string, action: () => void) {
    setConfirmText(message);
    setPendingAction(() => action);
  }

  function runPendingAction() {
    pendingAction?.();
    setPendingAction(null);
    setConfirmText(null);
  }

  function ensureClientFromQuote(prev: AppState, quote: Quote) {
    const existing = prev.clients.find((c) => c.originQuoteId === quote.id);
    if (existing) return { state: prev, client: existing };

    const newClient: Client = {
      id: uid("cl"),
      name: quote.clientName,
      phone: quote.phone,
      address: quote.address,
      originQuoteId: quote.id,
      notes: `Cliente convertido do orçamento ${quote.id}`,
      history: [`Criado a partir do orçamento ${quote.id}`],
    };

    const nextState: AppState = {
      ...prev,
      clients: [newClient, ...prev.clients],
      quotes: prev.quotes.map((q) =>
        q.id === quote.id
          ? {
              ...q,
              linkedClientId: newClient.id,
              history: [...q.history, `Convertido em cliente ${newClient.id}`],
            }
          : q
      ),
    };

    return { state: nextState, client: newClient };
  }

  function approveQuote(id: string) {
    setState((prev) => ({
      ...prev,
      quotes: prev.quotes.map((q) =>
        q.id === id
          ? { ...q, status: "Aprovado", history: [...q.history, "Orçamento aprovado"] }
          : q
      ),
    }));
  }

  function convertQuoteToClient(id: string) {
    setState((prev) => {
      const quote = prev.quotes.find((q) => q.id === id);
      if (!quote) return prev;
      const { state: next } = ensureClientFromQuote(prev, quote);
      return next;
    });
  }

  function emitOS(quoteId: string) {
    setState((prev) => {
      const quote = prev.quotes.find((q) => q.id === quoteId);
      if (!quote || quote.status !== "Aprovado") return prev;

      const { state: withClient, client } = ensureClientFromQuote(prev, quote);

      const alreadyOS = withClient.osList.find((o) => o.quoteId === quote.id);
      if (alreadyOS) return withClient;

      const newOS: OS = {
        id: uid("os"),
        number: `OS-${String(withClient.osList.length + 1).padStart(4, "0")}`,
        clientId: client.id,
        quoteId: quote.id,
        createdAt: new Date().toISOString(),
        status: "Emitida",
        history: [`OS emitida a partir do orçamento ${quote.id}`],
      };

      return {
        ...withClient,
        osList: [newOS, ...withClient.osList],
        quotes: withClient.quotes.map((q) =>
          q.id === quoteId
            ? { ...q, linkedOSId: newOS.id, history: [...q.history, `OS emitida: ${newOS.number}`] }
            : q
        ),
      };
    });
  }

  function sendToProduction(quoteId: string) {
    setState((prev) => {
      const quote = prev.quotes.find((q) => q.id === quoteId);
      if (!quote || quote.status !== "Aprovado") return prev;

      const { state: withClient, client } = ensureClientFromQuote(prev, quote);
      const os = withClient.osList.find((o) => o.quoteId === quote.id);

      const nextWithOS =
        os
          ? withClient
          : (() => {
              const newOS: OS = {
                id: uid("os"),
                number: `OS-${String(withClient.osList.length + 1).padStart(4, "0")}`,
                clientId: client.id,
                quoteId: quote.id,
                createdAt: new Date().toISOString(),
                status: "Emitida",
                history: [`OS emitida a partir do orçamento ${quote.id}`],
              };

              return {
                ...withClient,
                osList: [newOS, ...withClient.osList],
                quotes: withClient.quotes.map((q) =>
                  q.id === quote.id
                    ? { ...q, linkedOSId: newOS.id, history: [...q.history, `OS emitida: ${newOS.number}`] }
                    : q
                ),
              };
            })();

      const finalOS = nextWithOS.osList.find((o) => o.quoteId === quote.id);
      if (!finalOS) return nextWithOS;

      const alreadyProduction = nextWithOS.production.find((p) => p.quoteId === quote.id);
      if (alreadyProduction) return nextWithOS;

      const prod: Production = {
        id: uid("pr"),
        osId: finalOS.id,
        quoteId: quote.id,
        clientId: client.id,
        clientName: client.name,
        model: quote.model,
        width: quote.width,
        projection: quote.projection,
        material: quote.material,
        color: quote.color,
        technicalNotes: `Modelo: ${quote.model} | Medidas: ${quote.width} x ${quote.projection} | Observações técnicas do pedido`,
        status: "Aguardando produção",
        history: [`Enviado para produção a partir da OS ${finalOS.number}`],
      };

      return {
        ...nextWithOS,
        production: [prod, ...nextWithOS.production],
        osList: nextWithOS.osList.map((o) =>
          o.id === finalOS.id
            ? { ...o, status: "Enviada para produção", history: [...o.history, "Enviada para produção"] }
            : o
        ),
      };
    });
  }

  function createInstallationFromProduction(prev: AppState, prod: Production) {
    const existing = prev.installations.find((i) => i.productionId === prod.id);
    if (existing) return prev;

    const client = prev.clients.find((c) => c.id === prod.clientId);
    const os = prev.osList.find((o) => o.id === prod.osId);
    const quote = prev.quotes.find((q) => q.id === prod.quoteId);

    if (!client || !os || !quote) return prev;

    const item: Installation = {
      id: uid("ins"),
      productionId: prod.id,
      osId: os.id,
      quoteId: quote.id,
      clientId: client.id,
      clientName: client.name,
      address: client.address,
      model: prod.model,
      width: prod.width,
      projection: prod.projection,
      material: prod.material,
      color: prod.color,
      technicalNotes: prod.technicalNotes,
      status: "Agendada",
      history: [`Criada automaticamente a partir da produção ${prod.id}`],
    };

    return {
      ...prev,
      installations: [item, ...prev.installations],
      production: prev.production.map((p) =>
        p.id === prod.id
          ? { ...p, history: [...p.history, `Instalação criada: ${item.id}`] }
          : p
      ),
    };
  }

  function setProductionStatus(prodId: string, nextStatus: ProductionStatus) {
    setState((prev) => {
      let updated: AppState = {
        ...prev,
        production: prev.production.map((p) =>
          p.id === prodId
            ? {
                ...p,
                status: nextStatus,
                history: [...p.history, `Status alterado para ${nextStatus}`],
              }
            : p
        ),
      };

      if (nextStatus === "Pronto para instalar") {
        const prod = updated.production.find((p) => p.id === prodId);
        if (prod) {
          updated = createInstallationFromProduction(updated, prod);
        }
      }

      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Toldo Pro</p>
            <h1 className="text-2xl font-semibold">Painel operacional</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Olá, {user.name}</p>
            <p className="text-sm font-medium">{user.role}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className={cardClass()}>
            <p className="text-sm text-slate-500">Orçamentos aprovados</p>
            <p className="mt-2 text-3xl font-semibold">{stats.approved}</p>
          </div>
          <div className={cardClass()}>
            <p className="text-sm text-slate-500">Produção em andamento</p>
            <p className="mt-2 text-3xl font-semibold">{stats.inProduction}</p>
          </div>
          <div className={cardClass()}>
            <p className="text-sm text-slate-500">Pronto para instalar</p>
            <p className="mt-2 text-3xl font-semibold">{stats.ready}</p>
          </div>
          <div className={cardClass()}>
            <p className="text-sm text-slate-500">Instalações agendadas</p>
            <p className="mt-2 text-3xl font-semibold">{stats.scheduled}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-semibold">Orçamentos</h2>
            </div>

            <div className="space-y-4">
              {state.quotes.map((q) => (
                <div key={q.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{q.clientName}</p>
                      <p className="text-sm text-slate-500">
                        {q.model} • {q.width} • {q.projection} • {q.material} • {q.color}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Status:{" "}
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(q.status)}`}>
                          {q.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">R$ {q.amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        askConfirm("Confirmar aprovação do orçamento?", () => approveQuote(q.id))
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar
                    </button>

                    <button
                      onClick={() =>
                        askConfirm("Converter orçamento em cliente?", () => convertQuoteToClient(q.id))
                      }
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                    >
                      <Home className="h-4 w-4" />
                      Converter em cliente
                    </button>

                    <button
                      onClick={() => askConfirm("Emitir OS para este orçamento?", () => emitOS(q.id))}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Emitir OS
                    </button>

                    <button
                      onClick={() => askConfirm("Enviar para produção?", () => sendToProduction(q.id))}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                    >
                      <Package className="h-4 w-4" />
                      Enviar para produção
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-medium">Histórico</p>
                    <ul className="mt-2 space-y-1">
                      {q.history.map((h, i) => (
                        <li key={i}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-semibold">Produção</h2>
            </div>

            <div className="space-y-4">
              {state.production.map((p) => (
                <div key={p.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{p.clientName}</p>
                      <p className="text-sm text-slate-500">
                        {p.model} • {p.width} • {p.projection} • {p.material} • {p.color}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Status:{" "}
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(p.status)}`}>
                          {p.status}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Dados técnicos: {p.technicalNotes}</p>
                      <p className="mt-1 text-sm text-rose-500">Valor financeiro oculto</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setProductionStatus(p.id, "Em produção")}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Em produção
                    </button>

                    <button
                      onClick={() => setProductionStatus(p.id, "Parado")}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                    >
                      Parado
                    </button>

                    <button
                      onClick={() =>
                        askConfirm("Marcar como pronto para instalar e criar instalação automaticamente?", () =>
                          setProductionStatus(p.id, "Pronto para instalar")
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white"
                    >
                      <Send className="h-4 w-4" />
                      Pronto para instalar
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-medium">Histórico</p>
                    <ul className="mt-2 space-y-1">
                      {p.history.map((h, i) => (
                        <li key={i}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Hammer className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Instalações</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {state.installations.map((ins) => (
              <div key={ins.id} className="rounded-2xl border p-4">
                <p className="text-lg font-semibold">{ins.clientName}</p>
                <p className="text-sm text-slate-500">{ins.address}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {ins.model} • {ins.width} • {ins.projection} • {ins.material} • {ins.color}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Status:{" "}
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(ins.status)}`}>
                    {ins.status}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-600">Descrição: {ins.technicalNotes}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-xl border px-3 py-2 text-sm font-medium">Agendada</button>
                  <button className="rounded-xl border px-3 py-2 text-sm font-medium">A caminho</button>
                  <button className="rounded-xl border px-3 py-2 text-sm font-medium">Instalando</button>
                  <button className="rounded-xl border px-3 py-2 text-sm font-medium">Concluída</button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-medium">Histórico</p>
                  <ul className="mt-2 space-y-1">
                    {ins.history.map((h, i) => (
                      <li key={i}>• {h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Clientes gerados do orçamento</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {state.clients.map((client) => (
              <div key={client.id} className="rounded-2xl border p-4">
                <p className="text-lg font-semibold">{client.name}</p>
                <p className="text-sm text-slate-500">{client.phone}</p>
                <p className="mt-1 text-sm text-slate-500">{client.address}</p>
                <p className="mt-2 text-sm text-slate-600">Origem: orçamento {client.originQuoteId}</p>
                <p className="mt-2 text-sm text-slate-600">{client.notes}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Ordens de serviço</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {state.osList.map((os) => (
              <div key={os.id} className="rounded-2xl border p-4">
                <p className="text-lg font-semibold">{os.number}</p>
                <p className="text-sm text-slate-500">Cliente: {os.clientId}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Status:{" "}
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(os.status)}`}>
                    {os.status}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Data: {new Date(os.createdAt).toLocaleString("pt-BR")}
                </p>
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-medium">Histórico</p>
                  <ul className="mt-2 space-y-1">
                    {os.history.map((h, i) => (
                      <li key={i}>• {h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {confirmText && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-semibold">Confirmação</h3>
              <p className="mt-2 text-sm text-slate-600">{confirmText}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setPendingAction(null);
                    setConfirmText(null);
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={runPendingAction}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {demo && (
        <div className="fixed bottom-4 right-4 rounded-full bg-slate-900 px-4 py-2 text-xs text-white shadow-lg">
          Modo demo
        </div>
      )}
    </div>
  );
}