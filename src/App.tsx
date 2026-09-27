import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bell,
  Camera,
  CalendarDays,
  CheckCircle2,
  FileDown,
  FileText,
  Gauge,
  HardHat,
  Home,
  Layers3,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Warehouse,
  Wrench,
  X
} from "lucide-react";
import { MODULES, getModuleConfig } from "./lib/config";
import { interpretAI } from "./lib/ai";
import { calculatePricing } from "./lib/pricing";
import { createSeedState } from "./lib/seed";
import { loadAppState, nowISO, saveAppState, uid, loadJson, saveJson } from "./lib/storage";
import type { AppState, CollectionKey, Entity, Field } from "./lib/types";
import { canAIExecute, hasPermission } from "./lib/permissions";

const AUTH_KEY = "toldo-pro-auth-v1";
const initial = createSeedState();

const TAB_ORDER: Array<{ key: string; label: string; icon: React.ElementType }> = [
  { key: "dashboard", label: "Dashboard", icon: Gauge },
  { key: "companies", label: "Empresas", icon: Home },
  { key: "users", label: "Usuários", icon: Users },
  { key: "roles", label: "Perfis", icon: ShieldCheck },
  { key: "employees", label: "Funcionários", icon: Users },
  { key: "timecards", label: "Ponto", icon: CalendarDays },
  { key: "clients", label: "CRM", icon: Users },
  { key: "leads", label: "Leads", icon: MessageSquare },
  { key: "funnel", label: "Funil", icon: Sparkles },
  { key: "catalog", label: "Catálogo", icon: Package },
  { key: "materials", label: "Materiais", icon: Warehouse },
  { key: "measurements", label: "Medições", icon: Camera },
  { key: "inspections", label: "Vistorias", icon: CheckCircle2 },
  { key: "quotes", label: "Orçamentos", icon: FileText },
  { key: "pricingRules", label: "Precificação", icon: ShoppingCart },
  { key: "projects", label: "Projetos", icon: Layers3 },
  { key: "production", label: "Produção", icon: HardHat },
  { key: "bom", label: "BOM", icon: BarChart3 },
  { key: "stock", label: "Estoque", icon: Warehouse },
  { key: "purchases", label: "Compras", icon: ShoppingCart },
  { key: "deliveries", label: "Entregas", icon: Truck },
  { key: "installations", label: "Instalações", icon: Wrench },
  { key: "maintenance", label: "Manutenção", icon: Settings2 },
  { key: "calendar", label: "Calendário", icon: CalendarDays },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { key: "finance", label: "Financeiro", icon: ShoppingCart },
  { key: "reports", label: "Relatórios", icon: FileDown },
  { key: "notifications", label: "Notificações", icon: Bell },
  { key: "syncQueue", label: "Sincronização", icon: RefreshCw },
  { key: "ai", label: "Agente IA", icon: Sparkles },
  { key: "security", label: "Segurança", icon: ShieldCheck }
];

function badgeClass(color = "slate") {
  const map: Record<string, string> = {
    slate: "bg-slate-800 text-slate-200",
    green: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    red: "bg-rose-500/15 text-rose-300",
    cyan: "bg-cyan-500/15 text-cyan-300",
    purple: "bg-violet-500/15 text-violet-300"
  };
  return map[color] || map.slate;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FieldInput({
  field,
  value,
  onChange
}: {
  field: Field;
  value: any;
  onChange: (value: any) => void;
}) {
  const base = "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500";

  if (field.type === "textarea") {
    return (
      <textarea
        className={base}
        placeholder={field.placeholder || field.label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select className={base} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  return (
    <input
      className={base}
      type={field.type === "number" || field.type === "currency" ? "number" : field.type || "text"}
      placeholder={field.placeholder || field.label}
      value={value ?? ""}
      onChange={(e) =>
        onChange(field.type === "number" || field.type === "currency" ? Number(e.target.value) : e.target.value)
      }
    />
  );
}

function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
            initial={{ y: 18, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.98, opacity: 0 }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        </div>
        <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function EntityCard({
  title,
  tag,
  lines,
  onEdit,
  onDelete
}: {
  title: string;
  tag?: string;
  lines: string[];
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            {lines.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </div>
        {tag ? <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass("cyan")}`}>{tag}</span> : null}
      </div>
      <div className="mt-4 flex gap-2">
        {onEdit && <button onClick={onEdit} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">Editar</button>}
        {onDelete && <button onClick={onDelete} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">Excluir</button>}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => boolean }) {
  const [email, setEmail] = useState("admin@toldopro.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = onLogin(email, password);
    if (!ok) setError("E-mail ou senha inválidos.");
    else setError("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl"
      >
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
            <Layers3 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">Toldo Pro</h1>
          <p className="text-sm text-slate-400">Acesso ao sistema principal</p>
        </div>

        <label className="mb-2 block text-sm text-slate-300">E-mail</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
          placeholder="admin@toldopro.com"
          autoComplete="email"
        />

        <label className="mb-2 block text-sm text-slate-300">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
          placeholder="123456"
          autoComplete="current-password"
        />

        {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          className="mt-2 w-full rounded-xl bg-cyan-500 py-3 font-medium text-slate-950"
        >
          Entrar
        </button>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-400">
          Acesso demo:
          <br />
          admin@toldopro.com
          <br />
          123456
        </div>
      </form>
    </div>
  );
}

function CollectionPage({
  state,
  setState,
  collectionKey,
  query
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  collectionKey: CollectionKey;
  query: string;
}) {
  const config = getModuleConfig(collectionKey);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const items = state.collections[collectionKey].filter((item) =>
    JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
  );

  function openNew() {
    setEditing(null);
    setForm({});
    setOpen(true);
  }

  function openEdit(item: Entity) {
    setEditing(item);
    setForm(item);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }

  function save() {
    const entity: Entity = {
      ...(editing || {}),
      id: editing?.id || uid(),
      ...form
    };

    setState((prev) => ({
      ...prev,
      collections: {
        ...prev.collections,
        [collectionKey]: editing
          ? prev.collections[collectionKey].map((item) => (item.id === editing.id ? entity : item))
          : [entity, ...prev.collections[collectionKey]]
      }
    }));
    close();
  }

  function remove(id: string) {
    setState((prev) => ({
      ...prev,
      collections: {
        ...prev.collections,
        [collectionKey]: prev.collections[collectionKey].filter((item) => item.id !== id)
      }
    }));
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={config.title}
        subtitle={config.subtitle}
        action={
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950">
            <Plus className="h-4 w-4" />
            Novo
          </button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <EntityCard
            key={item.id}
            title={String(item[config.primaryField] || "Registro")}
            tag={config.badgeField ? String(item[config.badgeField] ?? "") : undefined}
            lines={config.fields
              .filter((f) => f.name !== config.primaryField)
              .slice(0, 4)
              .map((f) => `${f.label}: ${String(item[f.name] ?? "—")}`)}
            onEdit={() => openEdit(item)}
            onDelete={() => remove(item.id)}
          />
        ))}
        {!items.length && <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">Nenhum registro encontrado.</div>}
      </div>

      <Modal open={open} title={editing ? `Editar ${config.title}` : `Novo ${config.title}`} onClose={close}>
        <div className="grid gap-3 md:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              {field.type !== "boolean" && <label className="mb-1 block text-xs text-slate-400">{field.label}</label>}
              <FieldInput
                field={field}
                value={form[field.name]}
                onChange={(value) => setForm((prev) => ({ ...prev, [field.name]: value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={close} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
            Cancelar
          </button>
          <button onClick={save} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950">
            Salvar
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<{ email: string; password: string; name: string; role: string } | null>(null);

  const [state, setState] = useState<AppState>(() => loadAppState(initial));
  const [tab, setTab] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [syncMessage, setSyncMessage] = useState("Sincronizado");

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  useEffect(() => {
    const saved = loadJson<typeof user>(AUTH_KEY, null);
    if (saved) {
      setUser(saved);
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => setState((prev) => ({ ...prev, profile: { ...prev.profile, online: navigator.onLine } }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
    };
  }, []);

  const metrics = useMemo(() => {
    const revenue = state.collections.finance.filter((f) => f.kind === "Receita").reduce((acc, f) => acc + Number(f.amount || 0), 0);
    const expenses = state.collections.finance.filter((f) => f.kind === "Despesa").reduce((acc, f) => acc + Number(f.amount || 0), 0);
    const lowStock = state.collections.stock.filter((s) => Number(s.qty || 0) <= Number(s.min || 0)).length;
    const activeProduction = state.collections.production.filter((p) => String(p.status) === "Em produção").length;
    const unreadNotifications = state.collections.notifications.filter((n) => !n.read).length;
    const pendingSync = state.syncQueue.filter((q) => q.status !== "Sincronizado").length;
    return { revenue, expenses, lowStock, activeProduction, unreadNotifications, pendingSync };
  }, [state]);

  const collectionKeys = Object.keys(state.collections) as CollectionKey[];

  function handleLogin(email: string, password: string) {
    const demo = {
      email: "admin@toldopro.com",
      password: "123456",
      name: "Administrador",
      role: "Administrador"
    };

    if (email === demo.email && password === demo.password) {
      setUser(demo);
      setLoggedIn(true);
      saveJson(AUTH_KEY, demo);
      return true;
    }

    return false;
  }

  function handleLogout() {
    setUser(null);
    setLoggedIn(false);
    localStorage.removeItem(AUTH_KEY);
  }

  function pushSync(action: string, target: CollectionKey | "system", payload: Record<string, unknown>) {
    const item = {
      id: uid(),
      action,
      target,
      payload,
      status: "Pendente" as const,
      createdAt: nowISO()
    };
    setState((prev) => ({
      ...prev,
      syncQueue: [item, ...prev.syncQueue]
    }));
    return item;
  }

  function executeAI() {
    if (!aiInput.trim()) return;
    const prompt = aiInput.trim();

    const ctxCounts = {
      installations: state.collections.installations.length,
      stock: state.collections.stock.length,
      finance: state.collections.finance.length,
      leads: state.collections.leads.length,
      quotes: state.collections.quotes.length
    };

    const result = interpretAI(prompt, { counts: ctxCounts, online: state.profile.online });

    setState((prev) => ({
      ...prev,
      aiLog: [...prev.aiLog, { id: uid(), role: "user", text: prompt, timestamp: nowISO() }]
    }));

    if (result.type === "reply") {
      setState((prev) => ({
        ...prev,
        aiLog: [...prev.aiLog, { id: uid(), role: "assistant", text: result.text, timestamp: nowISO() }]
      }));
      setAiInput("");
      return;
    }

    if (result.type === "sync") {
      runSync();
      setAiInput("");
      return;
    }

    if (result.type === "create") {
      const canExecute = canAIExecute(state.profile.role, "create");
      if (!canExecute) {
        setState((prev) => ({
          ...prev,
          aiLog: [...prev.aiLog, { id: uid(), role: "system", text: "A permissão atual não permite essa ação.", timestamp: nowISO() }]
        }));
        setAiInput("");
        return;
      }

      if (state.profile.online) {
        setState((prev) => ({
          ...prev,
          collections: {
            ...prev.collections,
            [result.collection]: [result.entity, ...prev.collections[result.collection]]
          },
          aiLog: [...prev.aiLog, { id: uid(), role: "assistant", text: result.text, timestamp: nowISO() }]
        }));
      } else {
        pushSync(`AI_CREATE_${result.collection}`, result.collection, result.entity);
        setState((prev) => ({
          ...prev,
          aiLog: [...prev.aiLog, { id: uid(), role: "assistant", text: `${result.text} Ficou na fila offline.`, timestamp: nowISO() }]
        }));
      }

      setAiInput("");
    }
  }

  function runSync() {
    if (!state.profile.online) {
      setSyncMessage("Falhou: offline");
      return;
    }

    setSyncMessage("Sincronizando...");
    setState((prev) => ({
      ...prev,
      syncQueue: prev.syncQueue.map((item) => ({ ...item, status: "Sincronizando" }))
    }));

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        syncQueue: prev.syncQueue.map((item) => ({ ...item, status: "Sincronizado" })),
        aiLog: [...prev.aiLog, { id: uid(), role: "system", text: "Tudo sincronizado.", timestamp: nowISO() }]
      }));
      setSyncMessage("Sincronizado");
    }, 650);
  }

  function exportCSV(collectionKey: CollectionKey) {
    const items = state.collections[collectionKey];
    const columns = items.length ? Object.keys(items[0]) : [];
    const rows = [
      columns.join(","),
      ...items.map((item) =>
        columns
          .map((col) => JSON.stringify(item[col] ?? ""))
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function computeQuote() {
    const quote = state.collections.quotes[0];
    if (!quote) return;
    const result = calculatePricing({
      materialsCost: Number(quote.cost || 0),
      laborCost: 500,
      installationCost: 180,
      displacementCost: 120,
      otherExpenses: 80,
      marginPercent: Number(quote.margin || 40),
      discountPercent: 0
    });
    setState((prev) => ({
      ...prev,
      collections: {
        ...prev.collections,
        quotes: prev.collections.quotes.map((q, index) =>
          index === 0
            ? {
                ...q,
                suggestedPrice: result.suggestedPrice,
                finalPrice: result.finalPrice
              }
            : q
        )
      }
    }));
  }

  function renderDashboard() {
    const lowStockItems = state.collections.stock.filter((s) => Number(s.qty || 0) <= Number(s.min || 0));
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Gauge} label="Faturamento" value={money(metrics.revenue)} hint="Receitas registradas" />
          <StatCard icon={ShoppingCart} label="Despesas" value={money(metrics.expenses)} hint="Saídas registradas" />
          <StatCard icon={Warehouse} label="Estoque crítico" value={String(metrics.lowStock)} hint="Itens abaixo do mínimo" />
          <StatCard icon={HardHat} label="Produção ativa" value={String(metrics.activeProduction)} hint="Ordens em produção" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 xl:col-span-2">
            <SectionHeader title="Resumo operacional" subtitle="Visão geral de vendas, produção, estoque e pendências" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="text-xs text-slate-400">Leads</div><div className="mt-2 text-2xl font-semibold">{state.collections.leads.length}</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="text-xs text-slate-400">Clientes</div><div className="mt-2 text-2xl font-semibold">{state.collections.clients.length}</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="text-xs text-slate-400">Orçamentos</div><div className="mt-2 text-2xl font-semibold">{state.collections.quotes.length}</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="text-xs text-slate-400">Agenda</div><div className="mt-2 text-2xl font-semibold">{state.collections.calendar.length}</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="text-xs text-slate-400">Pendências</div><div className="mt-2 text-2xl font-semibold">{metrics.unreadNotifications}</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="text-xs text-slate-400">Sync</div><div className="mt-2 text-2xl font-semibold">{metrics.pendingSync}</div></div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <SectionHeader title="Alertas" subtitle="Estoque baixo e notificações" />
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm">
                  Estoque baixo: {String(item.item)}
                </div>
              ))}
              {state.collections.notifications
                .filter((n) => !n.read)
                .slice(0, 4)
                .map((n) => (
                  <div key={n.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm">
                    {String(n.title)}
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <SectionHeader title="PWA / Offline" subtitle="Instalação no celular e uso offline" />
            <div className="space-y-2 text-sm text-slate-300">
              <div>• App instalável via manifest e service worker.</div>
              <div>• Entrada com câmera e GPS pode ser conectada depois ao backend móvel.</div>
              <div>• Fila offline ativa: {state.syncQueue.length} item(ns).</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <SectionHeader title="Ações rápidas" subtitle="Atalhos úteis" />
            <div className="grid gap-2">
              <button onClick={() => setTab("quotes")} className="rounded-xl border border-white/10 px-4 py-2 text-left text-sm hover:bg-white/5">Abrir orçamentos</button>
              <button onClick={() => setTab("production")} className="rounded-xl border border-white/10 px-4 py-2 text-left text-sm hover:bg-white/5">Abrir produção</button>
              <button onClick={() => setTab("finance")} className="rounded-xl border border-white/10 px-4 py-2 text-left text-sm hover:bg-white/5">Abrir financeiro</button>
              <button onClick={runSync} className="rounded-xl border border-white/10 px-4 py-2 text-left text-sm hover:bg-white/5">Sincronizar fila</button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <SectionHeader title="Conexão" subtitle="Status do sistema" />
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between"><span>Online</span><span>{state.profile.online ? "Sim" : "Não"}</span></div>
              <div className="flex justify-between"><span>Sync</span><span>{syncMessage}</span></div>
              <div className="flex justify-between"><span>IA</span><span>{state.aiLog.length} mensagens</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAI() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <SectionHeader title="Agente Toldo Pro IA" subtitle="Conversa, comandos e fila offline" />
          <div className="h-[420px] overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="space-y-3">
              {state.aiLog.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                    msg.role === "user"
                      ? "ml-auto bg-cyan-500 text-slate-950"
                      : msg.role === "assistant"
                        ? "bg-slate-800 text-slate-100"
                        : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeAI()}
              placeholder='Ex.: "criar lead", "quais instalações eu tenho amanhã?"'
              className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
            />
            <button onClick={executeAI} className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-medium text-slate-950">Enviar</button>
            <button onClick={runSync} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200">Sincronizar</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <SectionHeader title="Estado" subtitle="Offline-first e permissões" />
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex items-center justify-between"><span>Conexão</span><span className={`rounded-full px-3 py-1 text-xs ${state.profile.online ? badgeClass("green") : badgeClass("red")}`}>{state.profile.online ? "Online" : "Offline"}</span></div>
              <div className="flex items-center justify-between"><span>Sincronização</span><span className={`rounded-full px-3 py-1 text-xs ${syncMessage.includes("Falhou") ? badgeClass("red") : syncMessage.includes("Sincronizando") ? badgeClass("amber") : badgeClass("green")}`}>{syncMessage}</span></div>
              <div className="flex items-center justify-between"><span>Fila</span><span className="rounded-full px-3 py-1 text-xs bg-cyan-500/15 text-cyan-300">{state.syncQueue.length} operação(ões)</span></div>
            </div>
            <button
              onClick={() => setState((prev) => ({ ...prev, profile: { ...prev.profile, online: !prev.profile.online } }))}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" />
              Alternar online/offline
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <SectionHeader title="Fila de sincronização" subtitle="Operações pendentes no dispositivo" />
            <div className="space-y-3">
              {state.syncQueue.map((q) => (
                <div key={q.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{q.action}</span>
                    <span className="rounded-full px-3 py-1 text-xs bg-amber-500/15 text-amber-300">{q.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{q.createdAt}</div>
                </div>
              ))}
              {!state.syncQueue.length && <p className="text-sm text-slate-500">Nenhuma operação pendente.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSecurity() {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <SectionHeader title="Segurança e acesso" subtitle="Usuários, empresas, perfis e permissões" />
          <div className="space-y-3 text-sm text-slate-200">
            <div className="flex justify-between"><span>Empresa</span><span>{state.profile.company}</span></div>
            <div className="flex justify-between"><span>Usuário</span><span>{state.profile.user}</span></div>
            <div className="flex justify-between"><span>Perfil</span><span>{state.profile.role}</span></div>
            <div className="flex justify-between"><span>Sessão</span><span>{state.profile.online ? "Protegida" : "Offline"}</span></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-slate-300">
              A IA não pode elevar permissões. A mesma operação só ocorre se o perfil do usuário já permitir.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Visualizar: {String(hasPermission(state.profile.role, "view"))}</div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Criar: {String(hasPermission(state.profile.role, "create"))}</div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Editar: {String(hasPermission(state.profile.role, "edit"))}</div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Executar: {String(canAIExecute(state.profile.role, "execute"))}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <SectionHeader title="Configurações" subtitle="PWA, câmera, GPS e auto sync" />
          <div className="space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between"><span>PWA</span><span>{String(state.settings.pwa)}</span></div>
            <div className="flex items-center justify-between"><span>Câmera</span><span>{String(state.settings.camera)}</span></div>
            <div className="flex items-center justify-between"><span>GPS</span><span>{String(state.settings.gps)}</span></div>
            <div className="flex items-center justify-between"><span>Auto sync</span><span>{String(state.settings.autoSync)}</span></div>
            <div className="flex items-center justify-between"><span>Tema</span><span>{state.settings.theme}</span></div>
          </div>
        </div>
      </div>
    );
  }

  function renderReports() {
    const exportable = ["clients", "leads", "quotes", "production", "stock", "finance"] as CollectionKey[];
    return (
      <div className="space-y-4">
        <SectionHeader title="Relatórios" subtitle="Exportação PDF/CSV, filtros e indicadores" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exportable.map((key) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <h3 className="font-semibold text-white">{getModuleConfig(key).title}</h3>
              <p className="mt-2 text-sm text-slate-400">{state.collections[key].length} registro(s)</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => exportCSV(key)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">CSV</button>
                <button onClick={() => window.print()} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">PDF / Imprimir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderCurrentTab() {
    if (tab === "dashboard") return renderDashboard();
    if (tab === "ai") return renderAI();
    if (tab === "security") return renderSecurity();
    if (tab === "reports") return renderReports();
    if (collectionKeys.includes(tab as CollectionKey)) {
      return <CollectionPage state={state} setState={setState} collectionKey={tab as CollectionKey} query={query} />;
    }
    return renderDashboard();
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-[1680px] gap-4 p-4">
        <aside className="hidden w-80 shrink-0 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl lg:block">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
              <Layers3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Sistema</p>
              <h1 className="text-lg font-semibold">Toldo Pro</h1>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">{state.profile.company}</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
              {user?.name || state.profile.user} • {user?.role || state.profile.role}
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {TAB_ORDER.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                  tab === key ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              Sair
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Toldo Pro • Painel principal</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">
                  {TAB_ORDER.find((t) => t.key === tab)?.label || "Dashboard"}
                </h1>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pesquisar..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 md:w-72"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs ${state.profile.online ? badgeClass("green") : badgeClass("red")}`}>
                    {state.profile.online ? "Online" : "Offline"}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs ${state.syncQueue.length ? badgeClass("amber") : badgeClass("green")}`}>
                    {state.syncQueue.length ? `${state.syncQueue.length} pendentes` : "Sem pendências"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {TAB_ORDER.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    tab === key ? "bg-cyan-500 text-slate-950" : "border border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="rounded-3xl border border-white/10 bg-slate-900/40 p-4 shadow-2xl backdrop-blur"
          >
            {renderCurrentTab()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
