import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  History,
  LockKeyhole,
  PackageCheck,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { ModuleKey } from "@/components/ModuleViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canWorkflow,
  defaultWorkflowClients,
  defaultWorkflowOS,
  defaultWorkflowProduction,
  defaultWorkflowQuotes,
  getCurrentWorkflowRole,
  makeHistory,
  nextId,
  normalizeClient,
  normalizeOS,
  normalizeProduction,
  normalizeQuote,
  permissionLabels,
  workflowPermissions,
  type ProductionStatus,
  type WorkflowClient,
  type WorkflowHistory,
  type WorkflowOS,
  type WorkflowPermission,
  type WorkflowProduction,
  type WorkflowQuote,
  type WorkflowRole,
  type WorkflowQuoteStatus,
  writeWorkflowList,
} from "@/lib/workflowData";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { supabase } from "@/lib/supabase";
import { WorkflowProductionView as ProductionWorkflowView } from "@/components/WorkflowProductionView";
import { toast } from "sonner";

type WorkflowViewProps = { onModuleChange: (module: ModuleKey) => void };
type QuoteDraft = Partial<WorkflowQuote>;
type Confirmation = { title: string; description: string; detail: string; confirmLabel: string; onConfirm: () => void; danger?: boolean };

const shell = "rounded-[22px] border border-[#e5ebf2] bg-white shadow-[0_9px_26px_rgba(24,43,73,0.045)]";
const quoteKey = "toldo:quotes";
const clientKey = "toldo:customers";
const osKey = "toldo:work-orders";
const productionKey = "toldo:production";

function useWorkflowList<T extends { id: string }>(key: string, fallback: T[], normalize: (value: T, index: number) => T) {
  const entityByKey: Record<string, string> = {
    "toldo:quotes": "quotes",
    "toldo:customers": "customers",
    "toldo:work-orders": "work_orders",
    "toldo:production": "production",
    "toldo:workflow-installations": "installations",
  };
  const entity = entityByKey[key];
  if (!entity) throw new Error(`Unknown company record collection: ${key}`);
  const { records, setRecords, reload } = useCompanyRecords<T>(entity);
  const items = useMemo(() => records.map(normalize), [normalize, records]);
  const update = (next: T[] | ((current: T[]) => T[])) => {
    setRecords((current) => {
      const normalized = current.map(normalize);
      return typeof next === "function" ? next(normalized) : next;
    });
  };
  return [items, update, reload] as const;
}

function useConfirm() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const close = () => setConfirmation(null);
  const modal = confirmation && <ConfirmDialog confirmation={confirmation} onClose={close} />;
  return { setConfirmation, close, modal };
}

function PageHeader({ eyebrow, title, description, action, onAction, role }: { eyebrow: string; title: string; description: string; action?: string; onAction?: () => void; role?: WorkflowRole }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#f47b20]">{eyebrow}</p><div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-[28px] font-extrabold tracking-[-0.055em] text-[#17324d]">{title}</h1>{role && <span className="flex items-center gap-1 rounded-full bg-[#edf4fb] px-2.5 py-1 text-[9px] font-extrabold text-[#3567ae]"><ShieldCheck size={12} /> {role}</span>}</div><p className="mt-2 max-w-[720px] text-[13px] leading-5 text-[#718398]">{description}</p></div>{action && <Button onClick={onAction} className="h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white shadow-[0_6px_14px_rgba(244,123,32,0.2)] hover:bg-[#db6812]"><Plus size={16} /> {action}</Button>}</div>;
}

function StatusBadge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "orange" | "green" | "blue" | "red" }) {
  const tones = { neutral: "bg-[#f2f5f8] text-[#687b8f]", orange: "bg-[#fff1e7] text-[#d9620d]", green: "bg-[#eaf8f2] text-[#14835b]", blue: "bg-[#eaf2ff] text-[#2859a6]", red: "bg-[#fff0ec] text-[#c35c42]" };
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function SummaryCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: string }) {
  return <div className={`${shell} p-4`}><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></div><p className="text-[11px] font-semibold text-[#708096]">{label}</p><p className="mt-1 font-display text-[24px] font-extrabold tracking-[-0.05em] text-[#17324d]">{value}</p><p className="mt-1 text-[10px] text-[#9aa8b7]">{helper}</p></div>;
}

function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#102438]/40 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[500px] rounded-[26px] bg-white p-5 shadow-[0_24px_70px_rgba(16,36,56,0.28)]"><div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#f47b20]">Confirmação obrigatória</p><h2 className="font-display text-[21px] font-extrabold tracking-[-0.04em] text-[#17324d]">{confirmation.title}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-[#93a6b7]" aria-label="Fechar confirmação"><X size={18} /></button></div><div className="mt-5 rounded-2xl border border-[#e9eef4] bg-[#f8fafc] p-4"><p className="text-[12px] font-extrabold text-[#344861]">{confirmation.description}</p><p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-[#718398]">{confirmation.detail}</p></div><div className="mt-5 flex gap-2"><Button variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-xl text-[11px] font-bold">Cancelar</Button><Button onClick={() => { confirmation.onConfirm(); onClose(); }} className={`h-11 flex-1 rounded-xl text-[11px] font-bold text-white ${confirmation.danger ? "bg-[#c35c42] hover:bg-[#a94a36]" : "bg-[#f47b20] hover:bg-[#db6812]"}`}>{confirmation.confirmLabel} <Check size={15} /></Button></div></div></div>;
}

function HistoryList({ history }: { history: WorkflowHistory[] }) {
  if (!history.length) return <p className="text-[10px] text-[#9aa8b7]">Nenhuma ação registrada ainda.</p>;
  return <div className="space-y-2">{history.slice().reverse().map((item) => <div key={item.id} className="flex gap-3 rounded-xl bg-[#f8fafc] p-3"><div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#2859a6]"><History size={13} /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold text-[#52647d]">{item.action}</p><p className="mt-1 text-[9px] leading-4 text-[#94a3b2]">{item.actor} · {item.role} · {item.at} · {item.origin}</p>{(item.from || item.to) && <p className="mt-1 text-[9px] font-bold text-[#d9620d]">{item.from || "Início"} → {item.to || "Atualizado"}</p>}</div></div>)}</div>;
}

function WorkflowSteps({ quote }: { quote: WorkflowQuote }) {
  const steps = ["Orçamento", "Aprovação", "Cliente", "OS", "Produção", "Instalação"];
  const current = quote.osId ? 4 : quote.clientId ? 2 : quote.status === "Aprovado" ? 1 : 0;
  return <div className="flex min-w-[600px] items-center gap-1">{steps.map((step, index) => <div key={step} className="flex flex-1 items-center gap-1"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold ${index <= current ? "bg-[#f47b20] text-white" : "bg-[#edf2f6] text-[#9aa8b7]"}`}>{index < current ? <Check size={13} /> : index + 1}</div><span className={`text-[9px] font-extrabold ${index <= current ? "text-[#52647d]" : "text-[#a0adba]"}`}>{step}</span>{index < steps.length - 1 && <span className={`mx-1 h-px flex-1 ${index < current ? "bg-[#f47b20]" : "bg-[#e5ebf2]"}`} />}</div>)}</div>;
}

function QuoteFormDialog({ initial, onClose, onSave }: { initial?: WorkflowQuote; onClose: () => void; onSave: (draft: QuoteDraft) => void }) {
  const [values, setValues] = useState<QuoteDraft>(initial || { quantity: 1, margin: 40, status: "Rascunho" });
  const set = (key: keyof WorkflowQuote, value: string | number) => setValues((current) => ({ ...current, [key]: value }));
  const field = (key: keyof WorkflowQuote, label: string, placeholder: string, type = "text") => <label className="grid gap-1.5 text-[10px] font-extrabold text-[#52647d]">{label}<Input type={type} value={(values[key] as string | number | undefined) ?? ""} onChange={(event) => set(key, type === "number" ? Number(event.target.value) : event.target.value)} placeholder={placeholder} className="h-10 rounded-xl text-[11px]" /></label>;
  return <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-[#102438]/40 p-3 backdrop-blur-sm sm:items-center"><div className="my-4 w-full max-w-[720px] rounded-[26px] bg-white p-5 shadow-[0_24px_70px_rgba(16,36,56,0.28)] sm:p-6"><div className="flex items-start justify-between"><div><p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#f47b20]">Dados técnicos e comerciais</p><h2 className="font-display text-[21px] font-extrabold text-[#17324d]">{initial ? `Editar orçamento ${initial.id}` : "Novo orçamento"}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-[#93a6b7]" aria-label="Fechar formulário"><X size={18} /></button></div><form onSubmit={(event) => { event.preventDefault(); onSave(values); }} className="mt-5 grid gap-4"><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Cliente</p><div className="grid gap-3 sm:grid-cols-2">{field("customerName", "Nome ou razão social", "Ex.: Marina Lopes")}{field("phone", "Telefone", "(11) 99999-9999")}{field("email", "E-mail", "cliente@email.com")}{field("taxId", "CPF/CNPJ", "Opcional")}{field("address", "Endereço", "Rua, número e bairro")}{field("city", "Cidade", "São Paulo")}</div></div><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Especificação do toldo</p><div className="grid gap-3 sm:grid-cols-2">{field("productModel", "Produto/modelo", "Ex.: Toldo retrátil")}{field("measurements", "Medidas", "Ex.: 18 m² · projeção 2,50 m")}{field("materials", "Materiais", "Lona, braços, motor...")}{field("color", "Cor", "Ex.: Areia")}{field("finish", "Acabamento", "Ex.: Ilhós e sensor")}{field("quantity", "Quantidade", "1", "number")}</div></div><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Valores e validade</p><div className="grid gap-3 sm:grid-cols-4">{field("cost", "Custo", "R$ 0,00")}{field("margin", "Margem (%)", "40", "number")}{field("finalValue", "Valor final", "R$ 0,00")}{field("validUntil", "Validade", "30 set 2024")}</div></div><label className="grid gap-1.5 text-[10px] font-extrabold text-[#52647d]">Observações<textarea value={values.notes ?? ""} onChange={(event) => set("notes", event.target.value)} placeholder="Condições, prazo ou observações técnicas" className="min-h-[80px] rounded-xl border border-[#e1e7ef] px-3 py-2 text-[11px] outline-none focus:border-[#f47b20]" /></label><div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-xl text-[11px] font-bold">Cancelar</Button><Button type="submit" className="h-11 flex-1 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#db6812]">Salvar orçamento <Check size={15} /></Button></div></form></div></div>;
}

function quoteTone(status: WorkflowQuoteStatus) {
  if (status === "Aprovado") return "green" as const;
  if (status === "Cancelado") return "red" as const;
  if (status === "Enviado") return "blue" as const;
  return "neutral" as const;
}

function WorkflowQuotesView({ onModuleChange }: WorkflowViewProps) {
  const role = getCurrentWorkflowRole();
  const [quotes, setQuotes] = useWorkflowList<WorkflowQuote>(quoteKey, defaultWorkflowQuotes, (value, index) => normalizeQuote(value, index));
  const [clients, setClients] = useWorkflowList<WorkflowClient>(clientKey, defaultWorkflowClients, (value, index) => normalizeClient(value, index));
  const [orders, setOrders] = useWorkflowList<WorkflowOS>(osKey, defaultWorkflowOS, (value, index) => normalizeOS(value, index));
  const [productions] = useWorkflowList<WorkflowProduction>(productionKey, defaultWorkflowProduction, (value, index) => normalizeProduction(value, index));
  const [expanded, setExpanded] = useState<string | null>(() => window.localStorage.getItem("toldo:workflow-selected-quote"));
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const { setConfirmation, modal } = useConfirm();
  const selected = quotes.find((quote) => quote.id === expanded);
  const pending = quotes.filter((quote) => quote.status !== "Aprovado" && quote.status !== "Cancelado").length;
  const approved = quotes.filter((quote) => quote.status === "Aprovado").length;
  const convert = (quote: WorkflowQuote) => {
    if (!canWorkflow(role, "convertClient")) return toast.error("Seu perfil não pode converter orçamento em cliente.");
    if (quote.status !== "Aprovado") return toast.error("Aprove o orçamento antes de converter em cliente.");
    const existingClient = clients.find((client) => client.sourceQuoteId === quote.id || client.quoteId === quote.id || (client.name === quote.customerName && !client.sourceQuoteId && !client.quoteId));
    if (quote.clientId || existingClient) {
      if (!quote.clientId && existingClient) setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, clientId: existingClient.id, history: [...item.history, makeHistory("Vínculo de cliente recuperado", "Migração do cadastro", undefined, existingClient.id)] } : item));
      return toast.info("Este orçamento já foi convertido em cliente.");
    }
    setConfirmation({ title: "Converter orçamento em cliente", description: `${quote.customerName} será criado sem novo preenchimento.`, detail: `Origem: ${quote.id}\nProduto: ${quote.productModel}\nContato: ${quote.phone}\nEndereço: ${quote.address}, ${quote.city}\nOs dados comerciais permanecem vinculados ao orçamento original.`, confirmLabel: "Converter cliente", onConfirm: () => {
      const client = { id: nextId("CLI", clients), name: quote.customerName, phone: quote.phone, email: quote.email, address: quote.address, city: quote.city, taxId: quote.taxId, notes: quote.notes, source: "convertido de orçamento" as const, sourceQuoteId: quote.id, product: quote.productModel, quoteId: quote.id, history: [makeHistory("Cliente criado a partir do orçamento", "Tela de Orçamentos", undefined, "Cliente convertido")] };
      setClients((current) => [client, ...current]);
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, clientId: client.id, history: [...item.history, makeHistory("Orçamento convertido em cliente", "Tela de Orçamentos", item.status, "Cliente convertido")] } : item));
      toast.success("Cliente convertido com sucesso");
    } });
  };
  const issueOS = (quote: WorkflowQuote) => {
    if (!canWorkflow(role, "issueOS")) return toast.error("Seu perfil não pode emitir OS.");
    const client = clients.find((item) => item.id === quote.clientId || item.sourceQuoteId === quote.id || item.quoteId === quote.id || (item.name === quote.customerName && !item.sourceQuoteId && !item.quoteId));
    if (quote.status !== "Aprovado") return toast.error("A OS só pode ser emitida para um orçamento aprovado.");
    if (!client) return toast.error("Converta o orçamento em cliente antes de emitir a OS.");
    if (quote.osId || orders.some((order) => order.quoteId === quote.id)) return toast.info("Este orçamento já possui uma OS vinculada.");
    setConfirmation({ title: "Emitir ordem de serviço", description: `A OS será gerada para ${client.name}.`, detail: `Orçamento: ${quote.id}\nServiço: ${quote.productModel}\nMedidas: ${quote.measurements}\nMateriais: ${quote.materials}\nPrazo: ${quote.validUntil}\nA OS será validada antes do envio para produção.`, confirmLabel: "Emitir OS", onConfirm: () => {
      const order = { id: nextId("OS", orders), clientId: client.id, clientName: client.name, quoteId: quote.id, service: quote.productModel, measurements: quote.measurements, materials: quote.materials, quantity: quote.quantity, color: quote.color, finish: quote.finish, deadline: quote.validUntil, notes: quote.notes, responsible: "A definir", priority: "Normal" as const, status: "Emitida" as const, history: [makeHistory("OS emitida a partir do orçamento", "Tela de Orçamentos", undefined, "Emitida")] };
      setOrders((current) => [order, ...current]);
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, osId: order.id, history: [...item.history, makeHistory("OS emitida", "Tela de Orçamentos", item.status, "OS emitida")] } : item));
      setClients((current) => current.map((item) => item.id === client.id ? { ...item, osId: order.id, history: [...item.history, makeHistory("OS vinculada ao cadastro", "Tela de Orçamentos", undefined, order.id)] } : item));
      toast.success(`${order.id} emitida com sucesso`);
      onModuleChange("os");
    } });
  };
  const sendProduction = (quote: WorkflowQuote) => {
    const order = orders.find((item) => item.id === quote.osId || item.quoteId === quote.id);
    if (!order) return toast.error("Emita a OS antes de enviar para produção.");
    if (order.productionId) return toast.info("Esta OS já foi enviada para produção.");
    onModuleChange("os");
    window.localStorage.setItem("toldo:workflow-selected-os", order.id);
    toast.info("OS selecionada. Confirme o envio na tela de OS.");
  };
  const saveQuote = (draft: QuoteDraft) => {
    if (form === "edit" && selected) {
      setQuotes((current) => current.map((item) => item.id === selected.id ? { ...item, ...draft, history: [...item.history, makeHistory("Orçamento editado", "Tela de Orçamentos")] } : item));
      toast.success("Orçamento atualizado");
    } else {
      const quote: WorkflowQuote = { id: nextId("#", quotes), customerName: String(draft.customerName || "Cliente sem nome"), phone: String(draft.phone || "Não informado"), email: String(draft.email || "Não informado"), address: String(draft.address || "Endereço pendente"), city: String(draft.city || "São Paulo"), taxId: String(draft.taxId || ""), productModel: String(draft.productModel || "Toldo a definir"), measurements: String(draft.measurements || "Medidas pendentes"), materials: String(draft.materials || "Materiais a definir"), color: String(draft.color || "A definir"), finish: String(draft.finish || "A definir"), quantity: Number(draft.quantity || 1), cost: String(draft.cost || "R$ 0"), margin: Number(draft.margin || 0), finalValue: String(draft.finalValue || "R$ 0"), validUntil: String(draft.validUntil || "A definir"), status: "Rascunho", notes: String(draft.notes || ""), history: [makeHistory("Orçamento criado", "Tela de Orçamentos", undefined, "Rascunho")] };
      setQuotes((current) => [quote, ...current]);
      toast.success("Orçamento criado como rascunho");
    }
    setForm(null);
  };
  const approve = (quote: WorkflowQuote) => {
    if (!canWorkflow(role, "approveQuote")) return toast.error("Seu perfil não pode aprovar orçamentos.");
    if (quote.status === "Aprovado") return toast.info("Orçamento já aprovado.");
    if (quote.status === "Cancelado") return toast.error("Orçamento cancelado não pode ser aprovado.");
    setConfirmation({ title: "Aprovar orçamento", description: `${quote.id} · ${quote.customerName}`, detail: `Produto: ${quote.productModel}\nMedidas: ${quote.measurements}\nValor final: ${canWorkflow(role, "viewFinancial") ? quote.finalValue : "restrito ao seu perfil"}\nValidade: ${quote.validUntil}\nA aprovação libera a conversão em cliente.`, confirmLabel: "Aprovar orçamento", onConfirm: () => { setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: "Aprovado", history: [...item.history, makeHistory("Orçamento aprovado", "Tela de Orçamentos", item.status, "Aprovado")] } : item)); toast.success("Orçamento aprovado"); } });
  };
  const cancel = (quote: WorkflowQuote) => {
    if (!canWorkflow(role, "deleteRecord")) return toast.error("Seu perfil não pode cancelar registros.");
    if (quote.clientId || quote.osId) return toast.error("Orçamento vinculado não pode ser cancelado nesta etapa.");
    setConfirmation({ title: "Cancelar orçamento", description: `${quote.id} · ${quote.customerName}`, detail: "O registro permanecerá no histórico como cancelado e não poderá seguir para cliente, OS ou produção.", confirmLabel: "Cancelar orçamento", danger: true, onConfirm: () => { setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: "Cancelado", history: [...item.history, makeHistory("Orçamento cancelado", "Tela de Orçamentos", item.status, "Cancelado")] } : item)); toast.success("Orçamento cancelado"); } });
  };
  return <div><PageHeader eyebrow="Comercial" title="Orçamentos" description="Controle a proposta, a aprovação e a conversão do serviço de toldo sem pular etapas." action="Novo orçamento" onAction={() => setForm("new")} role={role} /><div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Total" value={String(quotes.length)} helper="propostas salvas" icon={FileText} tone="bg-[#eaf2ff] text-[#2859a6]" /><SummaryCard label="Aguardando ação" value={String(pending)} helper="rascunhos e enviados" icon={Clock3} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Aprovados" value={String(approved)} helper="prontos para conversão" icon={BadgeCheck} tone="bg-[#eaf8f2] text-[#14835b]" /><SummaryCard label="Com OS" value={String(quotes.filter((quote) => quote.osId).length)} helper="encaminhados" icon={ClipboardCheck} tone="bg-[#f2edff] text-[#7852d6]" /></div><div className="mb-4 overflow-x-auto rounded-2xl border border-[#dbe7f1] bg-[#f7fbff] p-4"><WorkflowSteps quote={selected || quotes[0] || normalizeQuote({}, 0)} /></div><div className="space-y-3">{quotes.map((quote) => { const financialVisible = canWorkflow(role, "viewFinancial"); const isExpanded = expanded === quote.id; return <div key={quote.id} className={`${shell} overflow-hidden`}><button onClick={() => { setExpanded(isExpanded ? null : quote.id); window.localStorage.setItem("toldo:workflow-selected-quote", quote.id); }} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2859a6]"><FileText size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-extrabold text-[#344861]">{quote.id} · {quote.customerName}</p><StatusBadge tone={quoteTone(quote.status)}>{quote.status}</StatusBadge></div><p className="mt-1 text-[11px] text-[#8192a4]">{quote.productModel} · {quote.measurements}</p></div><div className="flex items-center gap-3"><div className="text-right">{financialVisible ? <p className="text-[13px] font-extrabold text-[#17324d]">{quote.finalValue}</p> : <p className="text-[10px] font-bold text-[#9aa8b7]">Valor restrito</p>}<p className="mt-1 text-[10px] text-[#9aa8b7]">Validade: {quote.validUntil}</p></div>{isExpanded ? <ChevronDown size={17} className="text-[#9aa8b7]" /> : <ChevronRight size={17} className="text-[#c4cfdb]" />}</div></button>{isExpanded && <div className="border-t border-[#eef1f5] p-4 sm:p-5"><div className="grid gap-4 xl:grid-cols-[1fr_1fr_.75fr]"><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Dados herdáveis</p><div className="grid gap-2 text-[11px] text-[#718398]"><p><b className="text-[#52647d]">Contato:</b> {quote.phone} · {quote.email}</p><p><b className="text-[#52647d]">Endereço:</b> {quote.address}, {quote.city}</p><p><b className="text-[#52647d]">Materiais:</b> {quote.materials}</p><p><b className="text-[#52647d]">Cor/acabamento:</b> {quote.color} · {quote.finish}</p><p><b className="text-[#52647d]">Quantidade:</b> {quote.quantity} · <b className="text-[#52647d]">Observações:</b> {quote.notes || "Sem observações"}</p></div></div>{financialVisible ? <div className="rounded-2xl bg-[#fffaf5] p-4"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#d9620d]">Visão financeira</p><div className="grid gap-2 text-[11px] text-[#8d6c56]"><p>Custo: <b className="text-[#6b432a]">{quote.cost}</b></p><p>Margem: <b className="text-[#14835b]">{quote.margin}%</b></p><p>Valor final: <b className="text-[#6b432a]">{quote.finalValue}</b></p></div><p className="mt-4 flex items-center gap-1 text-[10px] font-bold text-[#9b6a4f]"><LockKeyhole size={12} /> Visível conforme permissão</p></div> : <div className="rounded-2xl bg-[#f4f6f8] p-4 text-[11px] font-bold text-[#8d9aaa]">Dados financeiros ocultos para este perfil.</div>}<div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Histórico</p><HistoryList history={quote.history} /></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => { if (quote.status === "Aprovado" || quote.status === "Cancelado") return toast.info("Este orçamento não pode mais ser editado."); setForm("edit"); }} className="flex items-center gap-1.5 rounded-xl bg-[#f3f7fd] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]"><Pencil size={13} /> Editar orçamento</button>{quote.status !== "Aprovado" && quote.status !== "Cancelado" && <button onClick={() => approve(quote)} className="flex items-center gap-1.5 rounded-xl bg-[#eaf8f2] px-3 py-2 text-[10px] font-extrabold text-[#14835b]"><BadgeCheck size={13} /> Aprovar orçamento</button>}{quote.status === "Aprovado" && !quote.clientId && <button onClick={() => convert(quote)} className="flex items-center gap-1.5 rounded-xl bg-[#fff1e7] px-3 py-2 text-[10px] font-extrabold text-[#d9620d]"><UserCheck size={13} /> Converter em cliente</button>}{quote.status === "Aprovado" && quote.clientId && !quote.osId && <button onClick={() => issueOS(quote)} className="flex items-center gap-1.5 rounded-xl bg-[#eaf2ff] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]"><ClipboardList size={13} /> Emitir OS</button>}{quote.osId && !orders.find((order) => order.id === quote.osId)?.productionId && <button onClick={() => sendProduction(quote)} className="flex items-center gap-1.5 rounded-xl bg-[#f2edff] px-3 py-2 text-[10px] font-extrabold text-[#7852d6]"><PackageCheck size={13} /> Enviar para produção</button>}{!quote.clientId && !quote.osId && <button onClick={() => cancel(quote)} className="flex items-center gap-1.5 rounded-xl bg-[#fff0ec] px-3 py-2 text-[10px] font-extrabold text-[#c35c42]"><Trash2 size={13} /> Cancelar orçamento</button>}</div></div>}</div>; })}</div>{form && <QuoteFormDialog initial={form === "edit" ? selected : undefined} onClose={() => setForm(null)} onSave={saveQuote} />}{modal}</div>;
}

function CustomerFormDialog({ initial, onClose, onSave }: { initial?: WorkflowClient; onClose: () => void; onSave: (draft: Partial<WorkflowClient>) => void }) {
  const [values, setValues] = useState<Partial<WorkflowClient>>(initial || {});
  const set = (key: keyof WorkflowClient, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const field = (key: keyof WorkflowClient, label: string, placeholder: string, required = false) => <label className="grid gap-1.5 text-[10px] font-extrabold text-[#52647d]">{label}<Input required={required} value={String(values[key] ?? "")} onChange={(event) => set(key, event.target.value)} placeholder={placeholder} className="h-10 rounded-xl text-[11px]" /></label>;
  return <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-[#102438]/40 p-3 backdrop-blur-sm sm:items-center"><div className="my-4 w-full max-w-[680px] rounded-[26px] bg-white p-5 shadow-[0_24px_70px_rgba(16,36,56,0.28)]"><div className="flex items-start justify-between"><div><p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#f47b20]">Cadastro de clientes</p><h2 className="font-display text-[21px] font-extrabold text-[#17324d]">{initial ? "Editar cliente" : "Adicionar cliente"}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-[#93a6b7]" aria-label="Fechar">×</button></div><form onSubmit={(event) => { event.preventDefault(); onSave(values); }} className="mt-5 grid gap-3 sm:grid-cols-2">{field("name", "Nome ou razão social", "Nome completo / empresa", true)}{field("taxId", "CPF/CNPJ", "Somente números ou com pontuação")}{field("phone", "Telefone / WhatsApp", "(22) 99999-9999", true)}{field("email", "E-mail", "cliente@email.com")}{field("address", "Endereço", "Rua, número e bairro")}{field("city", "Cidade", "Cidade/UF") }<label className="grid gap-1.5 text-[10px] font-extrabold text-[#52647d] sm:col-span-2">Observações<textarea value={String(values.notes ?? "")} onChange={(event) => set("notes", event.target.value)} className="min-h-[75px] rounded-xl border border-[#e1e7ef] px-3 py-2 text-[11px] outline-none focus:border-[#f47b20]" placeholder="Informações importantes sobre o cliente" /></label><div className="flex gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-xl text-[11px] font-bold">Cancelar</Button><Button type="submit" className="h-11 flex-1 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#db6812]">Salvar cliente <Check size={15} /></Button></div></form></div></div>;
}

function WorkflowClientsView({ onModuleChange }: WorkflowViewProps) {
  const role = getCurrentWorkflowRole();
  const [clients, setClients] = useWorkflowList<WorkflowClient>(clientKey, defaultWorkflowClients, (value, index) => normalizeClient(value, index));
  const [quotes] = useWorkflowList<WorkflowQuote>(quoteKey, defaultWorkflowQuotes, (value, index) => normalizeQuote(value, index));
  const [orders] = useWorkflowList<WorkflowOS>(osKey, defaultWorkflowOS, (value, index) => normalizeOS(value, index));
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowClient | undefined>();
  const filteredClients = clients.filter((item) => {
    const order = orders.find((entry) => entry.id === item.osId || entry.clientId === item.id);
    const quote = quotes.find((entry) => entry.id === item.quoteId || entry.id === item.sourceQuoteId);
    const searchText = `${item.name} ${item.phone} ${item.taxId} ${item.email} ${order?.id || ""} ${order?.quoteId || ""} ${quote?.id || ""}`.toLocaleLowerCase();
    const digits = query.replace(/\\D/g, "");
    return searchText.includes(query.toLocaleLowerCase()) || Boolean(digits && `${item.phone} ${item.taxId}`.replace(/\\D/g, "").includes(digits));
  });
  const [selectedId, setSelectedId] = useState<string | null>(clients[0]?.id || null);
  const client = filteredClients.find((item) => item.id === selectedId) || filteredClients[0];
  const quote = client && quotes.find((item) => item.id === client.quoteId || item.id === client.sourceQuoteId);
  const order = client && orders.find((item) => item.id === client.osId || item.clientId === client.id);
  const openQuote = () => { if (!quote) return toast.info("Este cadastro não possui orçamento vinculado."); window.localStorage.setItem("toldo:workflow-selected-quote", quote.id); onModuleChange("orcamentos"); };
  const saveClient = (draft: Partial<WorkflowClient>) => {
    const name = String(draft.name || "").trim();
    const phone = String(draft.phone || "").trim();
    if (!name || !phone) return toast.error("Informe o nome e o telefone do cliente.");
    const digits = String(draft.taxId || "").replace(/\\D/g, "");
    if (digits && digits.length !== 11 && digits.length !== 14) return toast.error("CPF deve ter 11 dígitos ou CNPJ 14 dígitos.");
    if (editing) {
      setClients((current) => current.map((item) => item.id === editing.id ? { ...item, ...draft, name, phone, history: [...item.history, makeHistory("Cadastro do cliente editado", "Tela de Clientes")] } : item));
      toast.success("Cliente atualizado.");
    } else {
      const newClient: WorkflowClient = { id: nextId("CLI", clients), name, phone, email: String(draft.email || ""), taxId: digits, address: String(draft.address || ""), city: String(draft.city || ""), notes: String(draft.notes || ""), source: "cadastro manual", sourceQuoteId: "", product: "A definir", quoteId: "", history: [makeHistory("Cliente cadastrado", "Tela de Clientes")] };
      setClients((current) => [newClient, ...current]);
      setSelectedId(newClient.id);
      toast.success("Cliente cadastrado.");
    }
    setFormOpen(false);
    setEditing(undefined);
  };
  const removeClient = (item: WorkflowClient) => {
    const linkedQuote = quotes.some((entry) => entry.clientId === item.id || entry.customerName.toLocaleLowerCase() === item.name.toLocaleLowerCase() && (entry.clientId || entry.osId));
    const linkedOrder = orders.some((entry) => entry.clientId === item.id);
    if (linkedQuote || linkedOrder || item.osId) return toast.error("Este cliente possui orçamento ou OS vinculada. Não pode ser removido para preservar o histórico.");
    if (!canWorkflow(role, "deleteRecord")) return toast.error("Seu perfil não pode remover clientes.");
    if (!window.confirm(`Deseja remover o cadastro de ${item.name}?`)) return;
    setClients((current) => current.filter((entry) => entry.id !== item.id));
    setSelectedId(null);
    toast.success("Cliente removido.");
  };
  return <div><PageHeader eyebrow="Relacionamento" title="Clientes" description="Cadastre, edite, remova e consulte clientes por CPF/CNPJ, telefone, nome ou número de pedido." action="Adicionar cliente" onAction={() => { setEditing(undefined); setFormOpen(true); }} role={role} /><div className="grid gap-4 xl:grid-cols-[.75fr_1.25fr]"><div className={`${shell} overflow-hidden`}><div className="border-b border-[#eef1f5] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#8192a4]">Clientes cadastrados · {clients.length}</p><p className="mt-1 text-[11px] text-[#8d9aaa]">Consulta por CPF/CNPJ, número de pedido, telefone ou nome.</p><div className="mt-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CPF/CNPJ, pedido, telefone ou nome" className="h-10 rounded-xl text-[11px]" /></div></div><div className="divide-y divide-[#eef1f5]">{filteredClients.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex w-full items-center gap-3 p-4 text-left ${item.id === client?.id ? "bg-[#f3f7fd]" : "hover:bg-[#fbfcfd]"}`}><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4b89c] text-[11px] font-extrabold text-[#6d3e2a]">{item.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-extrabold text-[#344861]">{item.name}</p><p className="mt-1 truncate text-[10px] text-[#9aa6b6]">{item.phone} · CPF/CNPJ {item.taxId || "não informado"} · {item.osId || item.quoteId || "sem pedido"}</p></div><ChevronRight size={15} className="text-[#c4cfdb]" /></button>)}</div>{query && filteredClients.length === 0 && <p className="p-4 text-[11px] text-[#9aa6b6]">Nenhum cliente encontrado.</p>}</div>{client ? <div className="space-y-4"><div className={`${shell} p-5`}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-[22px] font-extrabold tracking-[-0.04em] text-[#17324d]">{client.name}</h2><StatusBadge tone="green">{client.source}</StatusBadge></div><p className="mt-2 text-[11px] text-[#8d9aaa]">Cadastro {client.id} · Origem {client.sourceQuoteId || "cadastro manual"}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => { setEditing(client); setFormOpen(true); }} className="rounded-xl bg-[#f3f7fd] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]"><Pencil size={13} className="mr-1 inline" />Editar</button><button onClick={() => removeClient(client)} className="rounded-xl bg-[#fff0ec] px-3 py-2 text-[10px] font-extrabold text-[#c35c42]"><Trash2 size={13} className="mr-1 inline" />Remover</button><button onClick={openQuote} className="rounded-xl bg-[#eaf2ff] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]">Ver orçamento</button></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="text-[10px] font-bold text-[#9aa8b7]">Contato</p><p className="mt-2 text-[11px] font-extrabold text-[#52647d]">{client.phone}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{client.email || "E-mail não informado"}</p></div><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="text-[10px] font-bold text-[#9aa8b7]">Endereço</p><p className="mt-2 text-[11px] font-extrabold text-[#52647d]">{client.address || "Não informado"}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{client.city || "Cidade não informada"} · {client.taxId || "CPF/CNPJ não informado"}</p></div><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="text-[10px] font-bold text-[#9aa8b7]">Serviço vinculado</p><p className="mt-2 text-[11px] font-extrabold text-[#52647d]">{client.product}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">Orçamento {client.quoteId || "pendente"}</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-3"><button onClick={openQuote} className="flex items-center justify-center gap-2 rounded-xl bg-[#eaf2ff] py-3 text-[10px] font-extrabold text-[#2859a6]"><FileText size={14} />Ver orçamento</button><button onClick={() => { if (!quote) return toast.error("Não há orçamento vinculado."); window.localStorage.setItem("toldo:workflow-selected-quote", quote.id); onModuleChange("orcamentos"); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#fff1e7] py-3 text-[10px] font-extrabold text-[#d9620d]"><ClipboardList size={14} />{order ? "Ver OS" : "Abrir orçamento"}</button><button onClick={() => order ? onModuleChange("operacao") : toast.info("A produção será liberada após a emissão da OS.")} className="flex items-center justify-center gap-2 rounded-xl bg-[#f2edff] py-3 text-[10px] font-extrabold text-[#7852d6]"><PackageCheck size={14} />Abrir produção</button></div><p className="mt-3 text-[11px] text-[#718398]">{client.notes || "Sem observações cadastradas."}</p></div><div className={`${shell} p-5`}><div className="mb-4 flex items-center gap-2"><History size={16} className="text-[#f47b20]" /><h2 className="font-display text-[16px] font-extrabold text-[#17324d]">Histórico do relacionamento</h2></div><HistoryList history={[...(quote?.history || []), ...client.history, ...(order?.history || [])]} /></div></div> : <div className={`${shell} p-10 text-center text-[12px] text-[#8d9aaa]`}>{query ? "Nenhum cliente corresponde a essa busca." : "Selecione um cliente ou cadastre o primeiro."}</div>}</div>{formOpen && <CustomerFormDialog initial={editing} onClose={() => { setFormOpen(false); setEditing(undefined); }} onSave={saveClient} />}</div>;
}

function printWorkOrder(order: WorkflowOS) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) return toast.error("Permita a abertura de janelas para imprimir a OS.");
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ordem de Serviço ${escape(order.id)}</title><style>
    body{font:14px Arial,sans-serif;color:#172b4d;margin:40px}h1{margin:0 0 8px;color:#f47b20;font-size:24px}
    h2{font-size:15px;margin:28px 0 10px;border-bottom:1px solid #dbe3eb;padding-bottom:8px}
    .muted{color:#65758b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .field{padding:12px;background:#f5f7fa;border-radius:8px}.label{display:block;color:#7a899a;font-size:11px;margin-bottom:5px}
    .notes{min-height:70px;white-space:pre-wrap}.signature{display:flex;gap:60px;margin-top:70px}
    .signature div{flex:1;border-top:1px solid #718096;padding-top:8px;text-align:center}
    @media print{body{margin:18mm}}
  </style></head><body><h1>ORDEM DE SERVIÇO</h1><p class="muted">${escape(order.id)} · Status: ${escape(order.status)}</p>
    <h2>Cliente e atendimento</h2><div class="grid">
      <div class="field"><span class="label">Cliente</span>${escape(order.clientName)}</div>
      <div class="field"><span class="label">Responsável</span>${escape(order.responsible)}</div>
      <div class="field"><span class="label">Orçamento vinculado</span>${escape(order.quoteId || "—")}</div>
      <div class="field"><span class="label">Prazo</span>${escape(order.deadline)}</div>
    </div><h2>Especificação do serviço</h2><div class="grid">
      <div class="field"><span class="label">Serviço</span>${escape(order.service)}</div>
      <div class="field"><span class="label">Medidas</span>${escape(order.measurements)}</div>
      <div class="field"><span class="label">Materiais</span>${escape(order.materials)}</div>
      <div class="field"><span class="label">Quantidade · Cor · Acabamento</span>${order.quantity} · ${escape(order.color)} · ${escape(order.finish)}</div>
    </div><h2>Observações</h2><div class="field notes">${escape(order.notes || "—")}</div>
    <div class="signature"><div>Assinatura do cliente</div><div>Responsável pelo serviço</div></div>
    <script>window.addEventListener("load",()=>window.print());</script></body></html>`);
  popup.document.close();
}

function WorkflowOSView({ onModuleChange }: WorkflowViewProps) {
  const role = getCurrentWorkflowRole();
  const [orders, setOrders, reloadOrders] = useWorkflowList<WorkflowOS>(osKey, defaultWorkflowOS, (value, index) => normalizeOS(value, index));
  const [quotes, setQuotes] = useWorkflowList<WorkflowQuote>(quoteKey, defaultWorkflowQuotes, (value, index) => normalizeQuote(value, index));
  const [clients, setClients] = useWorkflowList<WorkflowClient>(clientKey, defaultWorkflowClients, (value, index) => normalizeClient(value, index));
  const [productions, setProductions, reloadProductions] = useWorkflowList<WorkflowProduction>(productionKey, defaultWorkflowProduction, (value, index) => normalizeProduction(value, index));
  const [selectedId, setSelectedId] = useState<string | null>(() => window.localStorage.getItem("toldo:workflow-selected-os"));
  const [chooseQuote, setChooseQuote] = useState(false);
  const { setConfirmation, modal } = useConfirm();
  const eligible = quotes.filter((quote) => quote.status === "Aprovado" && !quote.osId && clients.some((client) => client.id === quote.clientId || client.sourceQuoteId === quote.id || client.quoteId === quote.id || (client.name === quote.customerName && !client.sourceQuoteId && !client.quoteId)));
  const selected = orders.find((order) => order.id === selectedId) || orders[0];
  const activeOrders = orders.filter((order) => order.status !== "Concluída");
  const completedOrders = orders.filter((order) => order.status === "Concluída");
  const issueFromQuote = (quote: WorkflowQuote) => {
    if (!canWorkflow(role, "issueOS")) return toast.error("Seu perfil não pode emitir OS.");
    const client = clients.find((item) => item.id === quote.clientId || item.sourceQuoteId === quote.id || item.quoteId === quote.id || (item.name === quote.customerName && !item.sourceQuoteId && !item.quoteId));
    if (!client) return toast.error("A OS exige um cliente convertido do orçamento.");
    setChooseQuote(false);
    setConfirmation({ title: "Confirmar emissão da OS", description: `${quote.id} · ${client.name}`, detail: `Serviço: ${quote.productModel}\nMedidas: ${quote.measurements}\nMateriais: ${quote.materials}\nPrazo: ${quote.validUntil}\nA produção ainda não terá acesso aos valores financeiros.`, confirmLabel: "Emitir OS", onConfirm: () => {
      const order = { id: nextId("OS", orders), clientId: client.id, clientName: client.name, quoteId: quote.id, service: quote.productModel, measurements: quote.measurements, materials: quote.materials, quantity: quote.quantity, color: quote.color, finish: quote.finish, deadline: quote.validUntil, notes: quote.notes, responsible: "A definir", priority: "Normal" as const, status: "Emitida" as const, history: [makeHistory("OS emitida", "Tela de OS", undefined, "Emitida")] };
      setOrders((current) => [order, ...current]);
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, osId: order.id, history: [...item.history, makeHistory("OS emitida", "Tela de OS", item.status, "OS emitida")] } : item));
      setClients((current) => current.map((item) => item.id === client.id ? { ...item, osId: order.id, history: [...item.history, makeHistory("OS vinculada", "Tela de OS", undefined, order.id)] } : item));
      setSelectedId(order.id);
      window.localStorage.setItem("toldo:workflow-selected-os", order.id);
      toast.success(`${order.id} emitida com sucesso`);
    } });
  };
  const sendProduction = (order: WorkflowOS) => {
    if (!canWorkflow(role, "sendProduction")) return toast.error("Seu perfil não pode enviar serviços para produção.");
    if (order.productionId || productions.some((item) => item.osId === order.id)) return toast.info("Esta OS já está na produção.");
    const quote = quotes.find((item) => item.id === order.quoteId);
    if (!quote || !order.measurements || !order.materials) return toast.error("A OS não possui dados técnicos mínimos.");
    setConfirmation({ title: "Enviar OS para produção", description: `${order.id} · ${order.clientName}`, detail: `Modelo: ${order.service}\nMedidas: ${order.measurements}\nMateriais: ${order.materials}\nQuantidade: ${order.quantity}\nPrazo: ${order.deadline}\nValores, margem e custo não serão enviados à produção.`, confirmLabel: "Enviar para produção", onConfirm: async () => {
      const productionId = nextId("OP", productions);
      const { error } = await supabase.rpc("send_work_order_to_production", {
        p_work_order_id: order.id,
        p_production_id: productionId,
      });
      if (error) return toast.error("Não foi possível enviar a OS para produção.", { description: error.message });
      await Promise.all([reloadOrders(), reloadProductions()]);
      toast.success(`${productionId} criada sem dados financeiros`);
      onModuleChange("operacao");
    } });
  };
  return <div><PageHeader eyebrow="Operação" title="Ordens de serviço" description="Emita, imprima e acompanhe as OS até a conclusão da instalação." action="Emitir OS" onAction={() => setChooseQuote(true)} role={role} /><div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="OS emitidas" value={String(orders.length)} helper="vinculadas a clientes" icon={ClipboardList} tone="bg-[#eaf2ff] text-[#2859a6]" /><SummaryCard label="Aguardando produção" value={String(orders.filter((item) => item.status === "Emitida").length)} helper="validação operacional" icon={Clock3} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Enviadas" value={String(orders.filter((item) => item.productionId).length)} helper="com registro na produção" icon={PackageCheck} tone="bg-[#f2edff] text-[#7852d6]" /><SummaryCard label="Concluídas" value={String(completedOrders.length)} helper="ciclo encerrado" icon={BadgeCheck} tone="bg-[#eaf8f2] text-[#14835b]" /></div>{activeOrders.length ? <div className="space-y-3">{activeOrders.map((order) => <div key={order.id} className={`${shell} overflow-hidden`}><button onClick={() => { setSelectedId(selected?.id === order.id ? null : order.id); window.localStorage.setItem("toldo:workflow-selected-os", order.id); }} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2859a6]"><ClipboardList size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-extrabold text-[#344861]">{order.id} · {order.clientName}</p><StatusBadge tone={order.status === "Enviada para produção" ? "blue" : "orange"}>{order.status}</StatusBadge></div><p className="mt-1 text-[11px] text-[#718398]">{order.service} · Orçamento {order.quoteId}</p></div><div className="text-left sm:text-right"><p className="text-[10px] font-bold text-[#52647d]">Prazo {order.deadline}</p><p className="mt-1 text-[10px] text-[#9aa8b7]">{order.responsible}</p></div><ChevronRight size={16} className="text-[#c4cfdb]" /></button>{selected?.id === order.id && <div className="border-t border-[#eef1f5] p-4 sm:p-5"><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Dados operacionais herdados</p><div className="grid gap-2 text-[11px] text-[#718398]"><p>Serviço: <b className="text-[#52647d]">{order.service}</b></p><p>Medidas: <b className="text-[#52647d]">{order.measurements}</b></p><p>Materiais: <b className="text-[#52647d]">{order.materials}</b></p><p>Cor/acabamento: <b className="text-[#52647d]">{order.color} · {order.finish}</b></p><p>Quantidade: <b className="text-[#52647d]">{order.quantity}</b> · Observações: <b className="text-[#52647d]">{order.notes || "Sem observações"}</b></p></div></div><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Histórico da OS</p><HistoryList history={order.history} /></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => printWorkOrder(order)} className="flex items-center gap-1.5 rounded-xl bg-[#fff1e7] px-3 py-2 text-[10px] font-extrabold text-[#d9620d]"><FileText size={13} /> Imprimir / salvar PDF</button>{!order.productionId && <button onClick={() => sendProduction(order)} className="flex items-center gap-1.5 rounded-xl bg-[#f2edff] px-3 py-2 text-[10px] font-extrabold text-[#7852d6]"><PackageCheck size={13} /> Enviar para produção</button>}{order.productionId && <button onClick={() => onModuleChange("operacao")} className="flex items-center gap-1.5 rounded-xl bg-[#eaf8f2] px-3 py-2 text-[10px] font-extrabold text-[#14835b]"><Wrench size={13} /> Abrir produção</button>}<button onClick={() => onModuleChange("instalacoes")} className="flex items-center gap-1.5 rounded-xl bg-[#eaf2ff] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]"><ArrowRight size={13} /> Abrir instalação</button></div></div>}</div>)}</div> : <div className={`${shell} p-8 text-center text-[12px] text-[#8d9aaa]`}>Nenhuma OS em andamento.</div>}{completedOrders.length > 0 && <section className="mt-7"><h2 className="mb-3 font-display text-[18px] font-extrabold text-[#17324d]">OS concluídas</h2><div className="space-y-2">{completedOrders.map((order) => <div key={order.id} className={`${shell} flex flex-wrap items-center gap-3 p-4`}><BadgeCheck size={18} className="text-[#14835b]" /><div className="min-w-0 flex-1"><p className="text-[12px] font-extrabold text-[#344861]">{order.id} · {order.clientName}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{order.service} · Concluída em {order.deadline}</p></div><button onClick={() => printWorkOrder(order)} className="rounded-xl bg-[#eaf2ff] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]">Imprimir OS</button></div>)}</div></section>}{chooseQuote && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#102438]/40 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[560px] rounded-[26px] bg-white p-5 shadow-[0_24px_70px_rgba(16,36,56,0.28)]"><div className="flex items-start justify-between"><div><p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#f47b20]">Etapa anterior obrigatória</p><h2 className="font-display text-[21px] font-extrabold text-[#17324d]">Escolha o orçamento aprovado</h2><p className="mt-2 text-[11px] text-[#8d9aaa]">Somente orçamentos aprovados e convertidos em cliente podem gerar OS.</p></div><button onClick={() => setChooseQuote(false)} className="rounded-xl p-2 text-[#93a6b7]" aria-label="Fechar seleção"><X size={18} /></button></div><div className="mt-5 max-h-[320px] space-y-2 overflow-y-auto">{eligible.length ? eligible.map((quote) => <button key={quote.id} onClick={() => issueFromQuote(quote)} className="flex w-full items-center gap-3 rounded-2xl border border-[#e8eef4] p-3 text-left hover:border-[#f3b07f]"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf8f2] text-[#14835b]"><FileCheck2 size={16} /></div><div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold text-[#52647d]">{quote.id} · {quote.customerName}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{quote.productModel} · cliente convertido</p></div><ChevronRight size={15} className="text-[#c4cfdb]" /></button>) : <div className="rounded-2xl bg-[#fff8f3] p-4 text-center text-[11px] font-bold text-[#9b6a4f]">Nenhum orçamento está pronto. Aprove e converta um orçamento primeiro.</div>}</div></div></div>}{modal}</div>;
}

function WorkflowPermissionsView() {
  const access = useCompanyAccess();
  const roles: WorkflowRole[] = ["Administrador", "Vendas", "Produção", "Instalador", "Financeiro"];
  const permissions = Object.keys(permissionLabels) as WorkflowPermission[];
  const [employees, setEmployees] = useState<Array<{ id: string; user_id: string; full_name: string; email: string; phone: string; role: WorkflowRole; permissions: Partial<Record<WorkflowPermission, boolean>>; active: boolean }>>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeRole, setEmployeeRole] = useState<WorkflowRole>("Produção");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const loadEmployees = useCallback(async () => {
    const { data, error } = await supabase.from("company_employee_directory")
      .select("id,user_id,full_name,email,phone,role,permissions,active")
      .eq("company_id", access.companyId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Não foi possível carregar a equipe.");
      return;
    }
    const members = (data || []) as typeof employees;
    setEmployees(members);
    setSelectedEmployeeId((current) => members.some((member) => member.id === current) ? current : members[0]?.id || "");
  }, [access.companyId]);
  useEffect(() => { void loadEmployees(); }, [loadEmployees]);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const saveEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { error } = await supabase.functions.invoke("invite-employee", {
      body: { email: email.trim(), fullName: name.trim(), phone: phone.trim(), role: employeeRole },
    });
    if (error) {
      toast.error("Não foi possível convidar o funcionário.", { description: error.message });
      return;
    }
    setInviteOpen(false);
    setName(""); setEmail(""); setPhone("");
    toast.success("Convite enviado para " + email.trim());
    await loadEmployees();
  };
  const updateEmployee = async (employee: typeof employees[number], values: Partial<Pick<typeof employee, "role" | "permissions" | "active">>) => {
    const { error } = await supabase.rpc("update_company_member_access", {
      p_membership_id: employee.id,
      p_role: values.role ?? employee.role,
      p_permissions: values.permissions ?? employee.permissions,
      p_active: values.active ?? employee.active,
    });
    if (error) {
      toast.error("Não foi possível salvar as alterações de acesso.", { description: error.message });
      return;
    }
    await loadEmployees();
    toast.success("Acesso atualizado");
  };
  const togglePermission = (permission: WorkflowPermission, value: boolean) => {
    if (!selectedEmployee) return;
    void updateEmployee(selectedEmployee, { permissions: { ...selectedEmployee.permissions, [permission]: value } });
  };
  if (!access.can("editRules")) return <div className={shell + " p-8 text-center text-[12px] text-[#8d9aaa]"}>Seu cargo não pode administrar funcionários e permissões.</div>;
  return <div>
    <PageHeader eyebrow="Administração" title="Equipe e permissões" description="Convide funcionários por e-mail, atribua cargos e ajuste acessos da empresa." role={access.role} action="Criar acesso individual" onAction={() => setInviteOpen(true)} />
    <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
      <div className={shell + " p-5"}>
        <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#f47b20]" /><h2 className="font-display text-[17px] font-extrabold text-[#17324d]">Acessos da empresa</h2></div>
        <p className="mt-2 text-[11px] leading-5 text-[#8d9aaa]">O convite individual é enviado ao e-mail e o funcionário define a própria senha no Supabase.</p>
        <div className="mt-5 rounded-2xl bg-[#eaf8f2] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#14835b]">Sessão autenticada</p><p className="mt-2 text-[11px] leading-5 text-[#52647d]">{access.fullName} · {access.role}</p></div>
      </div>
      <div className={shell + " overflow-hidden"}>
        <div className="border-b border-[#eef1f5] p-5"><h2 className="font-display text-[17px] font-extrabold text-[#17324d]">Permissões individuais</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Selecione um funcionário para ajustar exceções às permissões padrão do cargo.</p></div>
        <div className="p-5"><select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className="h-10 w-full rounded-xl border border-[#e1e7ef] bg-white px-3 text-[11px] font-bold text-[#52647d]"><option value="">Selecione um funcionário</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.role}</option>)}</select>{selectedEmployee ? <div className="mt-3 max-h-[380px] overflow-y-auto">{permissions.map((permission) => <label key={permission} className="flex items-center justify-between border-b border-[#f1f4f7] py-2.5 text-[10px] font-bold text-[#52647d]"><span>{permissionLabels[permission]}</span><input type="checkbox" checked={typeof selectedEmployee.permissions[permission] === "boolean" ? selectedEmployee.permissions[permission] : workflowPermissions[selectedEmployee.role][permission]} onChange={(event) => togglePermission(permission, event.target.checked)} /></label>)}</div> : <p className="mt-4 text-[11px] text-[#9aa6b6]">Nenhum funcionário cadastrado ainda.</p>}</div>
      </div>
    </div>
    <section className={shell + " mt-5 p-5"}><h2 className="font-display text-[17px] font-extrabold text-[#17324d]">Funcionários</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Contas e permissões associados ao Supabase desta empresa.</p>{employees.length ? <div className="mt-4 space-y-2">{employees.map((employee) => <div key={employee.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#edf1f5] p-3"><div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold text-[#344861]">{employee.full_name}{employee.user_id === access.user.id ? " (você)" : ""}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{employee.email} · {employee.phone}</p></div><select disabled={employee.user_id === access.user.id} value={employee.role} onChange={(event) => void updateEmployee(employee, { role: event.target.value as WorkflowRole })} className="h-9 rounded-lg border border-[#e1e7ef] bg-white px-2 text-[10px] font-bold text-[#52647d]">{roles.map((item) => <option key={item}>{item}</option>)}</select><button disabled={employee.user_id === access.user.id} onClick={() => void updateEmployee(employee, { active: false })} className="rounded-lg px-2 py-2 text-[10px] font-bold text-[#c35c42] disabled:opacity-40">Revogar</button></div>)}</div> : <p className="mt-4 rounded-xl bg-[#f8fafc] p-4 text-[11px] text-[#9aa6b6]">Nenhum funcionário cadastrado ainda.</p>}</section>
    {inviteOpen && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#172b4d]/35 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[480px] rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(23,43,77,0.24)]"><h2 className="font-display text-[20px] font-bold text-[#172b4d]">Criar acesso individual</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">O convite chegará no e-mail e permitirá criar a senha de acesso.</p><form onSubmit={saveEmployee} className="mt-5 grid gap-3"><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Nome completo<Input required value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">E-mail<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Telefone<Input required value={phone} onChange={(event) => setPhone(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Cargo<select value={employeeRole} onChange={(event) => setEmployeeRole(event.target.value as WorkflowRole)} className="h-10 rounded-xl border border-[#e1e7ef] bg-white px-3">{roles.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><div className="mt-2 flex gap-2"><Button type="button" variant="ghost" onClick={() => setInviteOpen(false)} className="h-10 flex-1 rounded-xl">Cancelar</Button><Button type="submit" className="h-10 flex-1 rounded-xl bg-[#f47b20] text-white hover:bg-[#db6812]">Enviar convite por e-mail</Button></div></form></div></div>}
  </div>;
}

export function WorkflowView({ module, onModuleChange }: { module: ModuleKey; onModuleChange: (module: ModuleKey) => void }) {
  if (module === "orcamentos") return <WorkflowQuotesView onModuleChange={onModuleChange} />;
  if (module === "clientes") return <WorkflowClientsView onModuleChange={onModuleChange} />;
  if (module === "os") return <WorkflowOSView onModuleChange={onModuleChange} />;
  if (module === "operacao") return <ProductionWorkflowView onModuleChange={onModuleChange} />;
  return <WorkflowPermissionsView />;
}
