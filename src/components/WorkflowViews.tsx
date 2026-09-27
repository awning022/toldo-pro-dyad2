import { useState } from "react";
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
  readWorkflowList,
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
import { toast } from "sonner";

type WorkflowViewProps = { onModuleChange: (module: ModuleKey) => void };
type QuoteDraft = Partial<WorkflowQuote>;
type Confirmation = { title: string; description: string; detail: string; confirmLabel: string; onConfirm: () => void; danger?: boolean };

const shell = "rounded-[22px] border border-[#e5ebf2] bg-white shadow-[0_9px_26px_rgba(24,43,73,0.045)]";
const quoteKey = "toldo:quotes";
const clientKey = "toldo:customers";
const osKey = "toldo:work-orders";
const productionKey = "toldo:production";

function useWorkflowList<T>(key: string, fallback: T[], normalize: (value: T, index: number) => T) {
  const [items, setItems] = useState<T[]>(() => readWorkflowList(key, fallback).map(normalize));
  const update = (next: T[] | ((current: T[]) => T[])) => {
    setItems((current) => {
      const value = typeof next === "function" ? next(current) : next;
      writeWorkflowList(key, value);
      return value;
    });
  };
  return [items, update] as const;
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

function WorkflowClientsView({ onModuleChange }: WorkflowViewProps) {
  const role = getCurrentWorkflowRole();
  const [clients] = useWorkflowList<WorkflowClient>(clientKey, defaultWorkflowClients, (value, index) => normalizeClient(value, index));
  const [quotes] = useWorkflowList<WorkflowQuote>(quoteKey, defaultWorkflowQuotes, (value, index) => normalizeQuote(value, index));
  const [orders] = useWorkflowList<WorkflowOS>(osKey, defaultWorkflowOS, (value, index) => normalizeOS(value, index));
  const [selectedId, setSelectedId] = useState<string | null>(clients[0]?.id || null);
  const client = clients.find((item) => item.id === selectedId) || clients[0];
  const quote = client && quotes.find((item) => item.id === client.quoteId || item.id === client.sourceQuoteId);
  const order = client && orders.find((item) => item.id === client.osId || item.clientId === client.id);
  const openQuote = () => { if (!quote) return toast.info("Este cadastro não possui orçamento vinculado."); window.localStorage.setItem("toldo:workflow-selected-quote", quote.id); onModuleChange("orcamentos"); };
  return <div><PageHeader eyebrow="Relacionamento" title="Clientes convertidos" description="Cada cadastro nasce de um orçamento aprovado e mantém o vínculo técnico e operacional." role={role} /><div className="grid gap-4 xl:grid-cols-[.75fr_1.25fr]"> <div className={`${shell} overflow-hidden`}><div className="border-b border-[#eef1f5] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#8192a4]">Origem controlada</p><p className="mt-1 text-[11px] text-[#8d9aaa]">Não é possível criar cliente fora do fluxo de orçamento.</p></div><div className="divide-y divide-[#eef1f5]">{clients.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex w-full items-center gap-3 p-4 text-left ${item.id === client?.id ? "bg-[#f3f7fd]" : "hover:bg-[#fbfcfd]"}`}><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4b89c] text-[11px] font-extrabold text-[#6d3e2a]">{item.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-extrabold text-[#344861]">{item.name}</p><p className="mt-1 truncate text-[10px] text-[#9aa6b6]">{item.product} · {item.quoteId || "sem orçamento"}</p></div><ChevronRight size={15} className="text-[#c4cfdb]" /></button>)}</div></div>{client ? <div className="space-y-4"><div className={`${shell} p-5`}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-[22px] font-extrabold tracking-[-0.04em] text-[#17324d]">{client.name}</h2><StatusBadge tone="green">{client.source}</StatusBadge></div><p className="mt-2 text-[11px] text-[#8d9aaa]">Cadastro {client.id} · Origem {client.sourceQuoteId || "não informada"}</p></div><div className="flex flex-wrap gap-2"><button onClick={openQuote} className="rounded-xl bg-[#f3f7fd] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]">Ver orçamento original</button><button onClick={() => onModuleChange("financeiro")} className="rounded-xl bg-[#fff1e7] px-3 py-2 text-[10px] font-extrabold text-[#d9620d]">Abrir financeiro</button></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="text-[10px] font-bold text-[#9aa8b7]">Contato</p><p className="mt-2 text-[11px] font-extrabold text-[#52647d]">{client.phone}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{client.email}</p></div><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="text-[10px] font-bold text-[#9aa8b7]">Endereço</p><p className="mt-2 text-[11px] font-extrabold text-[#52647d]">{client.address}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{client.city} · {client.taxId || "CPF/CNPJ não informado"}</p></div><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="text-[10px] font-bold text-[#9aa8b7]">Serviço vinculado</p><p className="mt-2 text-[11px] font-extrabold text-[#52647d]">{client.product}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">Orçamento {client.quoteId || "pendente"}</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-3"><button onClick={openQuote} className="flex items-center justify-center gap-2 rounded-xl bg-[#eaf2ff] py-3 text-[10px] font-extrabold text-[#2859a6]"><FileText size={14} /> Ver orçamento</button><button onClick={() => { if (!quote) return toast.error("Não há orçamento vinculado."); window.localStorage.setItem("toldo:workflow-selected-quote", quote.id); onModuleChange("orcamentos"); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#fff1e7] py-3 text-[10px] font-extrabold text-[#d9620d]"><ClipboardList size={14} /> {order ? "Ver OS" : "Emitir OS"}</button><button onClick={() => order ? onModuleChange("operacao") : toast.info("A produção será liberada após a emissão da OS.")} className="flex items-center justify-center gap-2 rounded-xl bg-[#f2edff] py-3 text-[10px] font-extrabold text-[#7852d6]"><PackageCheck size={14} /> Abrir produção</button></div></div><div className={`${shell} p-5`}><div className="mb-4 flex items-center gap-2"><History size={16} className="text-[#f47b20]" /><h2 className="font-display text-[16px] font-extrabold text-[#17324d]">Histórico do relacionamento</h2></div><HistoryList history={[...(quote?.history || []), ...client.history, ...(order?.history || [])]} /></div></div> : <div className={`${shell} p-10 text-center text-[12px] text-[#8d9aaa]`}>Nenhum cliente convertido ainda. Aprove um orçamento para iniciar.</div>}</div></div>;
}

function WorkflowOSView({ onModuleChange }: WorkflowViewProps) {
  const role = getCurrentWorkflowRole();
  const [orders, setOrders] = useWorkflowList<WorkflowOS>(osKey, defaultWorkflowOS, (value, index) => normalizeOS(value, index));
  const [quotes] = useWorkflowList<WorkflowQuote>(quoteKey, defaultWorkflowQuotes, (value, index) => normalizeQuote(value, index));
  const [clients] = useWorkflowList<WorkflowClient>(clientKey, defaultWorkflowClients, (value, index) => normalizeClient(value, index));
  const [productions] = useWorkflowList<WorkflowProduction>(productionKey, defaultWorkflowProduction, (value, index) => normalizeProduction(value, index));
  const [selectedId, setSelectedId] = useState<string | null>(() => window.localStorage.getItem("toldo:workflow-selected-os"));
  const [chooseQuote, setChooseQuote] = useState(false);
  const { setConfirmation, modal } = useConfirm();
  const eligible = quotes.filter((quote) => quote.status === "Aprovado" && !quote.osId && clients.some((client) => client.id === quote.clientId || client.sourceQuoteId === quote.id || client.quoteId === quote.id || (client.name === quote.customerName && !client.sourceQuoteId && !client.quoteId)));
  const selected = orders.find((order) => order.id === selectedId) || orders[0];
  const issueFromQuote = (quote: WorkflowQuote) => {
    if (!canWorkflow(role, "issueOS")) return toast.error("Seu perfil não pode emitir OS.");
    const client = clients.find((item) => item.id === quote.clientId || item.sourceQuoteId === quote.id || item.quoteId === quote.id || (item.name === quote.customerName && !item.sourceQuoteId && !item.quoteId));
    if (!client) return toast.error("A OS exige um cliente convertido do orçamento.");
    setChooseQuote(false);
    setConfirmation({ title: "Confirmar emissão da OS", description: `${quote.id} · ${client.name}`, detail: `Serviço: ${quote.productModel}\nMedidas: ${quote.measurements}\nMateriais: ${quote.materials}\nPrazo: ${quote.validUntil}\nA produção ainda não terá acesso aos valores financeiros.`, confirmLabel: "Emitir OS", onConfirm: () => {
      const order = { id: nextId("OS", orders), clientId: client.id, clientName: client.name, quoteId: quote.id, service: quote.productModel, measurements: quote.measurements, materials: quote.materials, quantity: quote.quantity, color: quote.color, finish: quote.finish, deadline: quote.validUntil, notes: quote.notes, responsible: "A definir", priority: "Normal" as const, status: "Emitida" as const, history: [makeHistory("OS emitida", "Tela de OS", undefined, "Emitida")] };
      setOrders((current) => [order, ...current]);
      writeWorkflowList(quoteKey, quotes.map((item) => item.id === quote.id ? { ...item, osId: order.id, history: [...item.history, makeHistory("OS emitida", "Tela de OS", item.status, "OS emitida")] } : item));
      writeWorkflowList(clientKey, clients.map((item) => item.id === client.id ? { ...item, osId: order.id, history: [...item.history, makeHistory("OS vinculada", "Tela de OS", undefined, order.id)] } : item));
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
    setConfirmation({ title: "Enviar OS para produção", description: `${order.id} · ${order.clientName}`, detail: `Modelo: ${order.service}\nMedidas: ${order.measurements}\nMateriais: ${order.materials}\nQuantidade: ${order.quantity}\nPrazo: ${order.deadline}\nValores, margem e custo não serão enviados à produção.`, confirmLabel: "Enviar para produção", onConfirm: () => {
      const production: WorkflowProduction = { id: nextId("OP", productions), osId: order.id, quoteId: order.quoteId, clientId: order.clientId, clientName: order.clientName, model: order.service, measurements: order.measurements, materials: order.materials, color: order.color, finish: order.finish, quantity: order.quantity, deadline: order.deadline, responsible: order.responsible, notes: order.notes, status: "Aguardando produção", history: [makeHistory("Serviço enviado para produção", "Tela de OS", "OS emitida", "Aguardando produção")] };
      writeWorkflowList(productionKey, [...productions, production]);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, productionId: production.id, status: "Enviada para produção", history: [...item.history, makeHistory("OS enviada para produção", "Tela de OS", item.status, "Enviada para produção")] } : item));
      toast.success(`${production.id} criada sem dados financeiros`);
      onModuleChange("operacao");
    } });
  };
  return <div><PageHeader eyebrow="Operação" title="Ordens de serviço" description="A OS é o documento intermediário obrigatório entre orçamento aprovado, cliente e produção." action="Emitir OS" onAction={() => setChooseQuote(true)} role={role} /><div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="OS emitidas" value={String(orders.length)} helper="vinculadas a clientes" icon={ClipboardList} tone="bg-[#eaf2ff] text-[#2859a6]" /><SummaryCard label="Aguardando produção" value={String(orders.filter((item) => item.status === "Emitida").length)} helper="validação operacional" icon={Clock3} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Enviadas" value={String(orders.filter((item) => item.productionId).length)} helper="com registro na produção" icon={PackageCheck} tone="bg-[#f2edff] text-[#7852d6]" /><SummaryCard label="Prontas" value={String(orders.filter((item) => item.status === "Concluída").length)} helper="ciclo encerrado" icon={BadgeCheck} tone="bg-[#eaf8f2] text-[#14835b]" /></div>{!orders.length ? <div className={`${shell} p-10 text-center`}><ClipboardList size={32} className="mx-auto text-[#b7c5d3]" /><p className="mt-3 text-[13px] font-extrabold text-[#52647d]">Nenhuma OS emitida</p><p className="mt-1 text-[11px] text-[#9aa8b7]">Aprove e converta um orçamento antes de emitir a primeira OS.</p><button onClick={() => onModuleChange("orcamentos")} className="mt-4 rounded-xl bg-[#f3f7fd] px-4 py-2 text-[10px] font-extrabold text-[#2859a6]">Abrir orçamentos</button></div> : <div className="space-y-3">{orders.map((order) => <div key={order.id} className={`${shell} overflow-hidden`}><button onClick={() => { setSelectedId(selected?.id === order.id ? null : order.id); window.localStorage.setItem("toldo:workflow-selected-os", order.id); }} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2859a6]"><ClipboardList size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-extrabold text-[#344861]">{order.id} · {order.clientName}</p><StatusBadge tone={order.status === "Enviada para produção" ? "blue" : "orange"}>{order.status}</StatusBadge></div><p className="mt-1 text-[11px] text-[#718398]">{order.service} · Orçamento {order.quoteId}</p></div><div className="text-left sm:text-right"><p className="text-[10px] font-bold text-[#52647d]">Prazo {order.deadline}</p><p className="mt-1 text-[10px] text-[#9aa8b7]">{order.responsible}</p></div><ChevronRight size={16} className="text-[#c4cfdb]" /></button>{selected?.id === order.id && <div className="border-t border-[#eef1f5] p-4 sm:p-5"><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Dados operacionais herdados</p><div className="grid gap-2 text-[11px] text-[#718398]"><p>Serviço: <b className="text-[#52647d]">{order.service}</b></p><p>Medidas: <b className="text-[#52647d]">{order.measurements}</b></p><p>Materiais: <b className="text-[#52647d]">{order.materials}</b></p><p>Cor/acabamento: <b className="text-[#52647d]">{order.color} · {order.finish}</b></p><p>Quantidade: <b className="text-[#52647d]">{order.quantity}</b> · Observações: <b className="text-[#52647d]">{order.notes || "Sem observações"}</b></p></div></div><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Histórico da OS</p><HistoryList history={order.history} /></div></div><div className="mt-4 flex flex-wrap gap-2">{!order.productionId && <button onClick={() => sendProduction(order)} className="flex items-center gap-1.5 rounded-xl bg-[#f2edff] px-3 py-2 text-[10px] font-extrabold text-[#7852d6]"><PackageCheck size={13} /> Enviar para produção</button>}{order.productionId && <button onClick={() => onModuleChange("operacao")} className="flex items-center gap-1.5 rounded-xl bg-[#eaf8f2] px-3 py-2 text-[10px] font-extrabold text-[#14835b]"><Wrench size={13} /> Abrir produção</button>}<button onClick={() => onModuleChange("instalacoes")} className="flex items-center gap-1.5 rounded-xl bg-[#eaf2ff] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]"><ArrowRight size={13} /> Abrir instalação</button></div></div>}</div>)}</div>}{chooseQuote && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#102438]/40 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[560px] rounded-[26px] bg-white p-5 shadow-[0_24px_70px_rgba(16,36,56,0.28)]"><div className="flex items-start justify-between"><div><p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#f47b20]">Etapa anterior obrigatória</p><h2 className="font-display text-[21px] font-extrabold text-[#17324d]">Escolha o orçamento aprovado</h2><p className="mt-2 text-[11px] text-[#8d9aaa]">Somente orçamentos aprovados e convertidos em cliente podem gerar OS.</p></div><button onClick={() => setChooseQuote(false)} className="rounded-xl p-2 text-[#93a6b7]" aria-label="Fechar seleção"><X size={18} /></button></div><div className="mt-5 max-h-[320px] space-y-2 overflow-y-auto">{eligible.length ? eligible.map((quote) => <button key={quote.id} onClick={() => issueFromQuote(quote)} className="flex w-full items-center gap-3 rounded-2xl border border-[#e8eef4] p-3 text-left hover:border-[#f3b07f]"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf8f2] text-[#14835b]"><FileCheck2 size={16} /></div><div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold text-[#52647d]">{quote.id} · {quote.customerName}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{quote.productModel} · cliente convertido</p></div><ChevronRight size={15} className="text-[#c4cfdb]" /></button>) : <div className="rounded-2xl bg-[#fff8f3] p-4 text-center text-[11px] font-bold text-[#9b6a4f]">Nenhum orçamento está pronto. Aprove e converta um orçamento primeiro.</div>}</div></div></div>}{modal}</div>;
}

const productionStatusTone: Record<ProductionStatus, "neutral" | "blue" | "orange" | "green"> = { "Aguardando produção": "neutral", "Em andamento": "blue", Parado: "orange", "Pronto para instalar": "green" };

function WorkflowProductionView({ onModuleChange }: WorkflowViewProps) {
  const role = getCurrentWorkflowRole();
  const [productions, setProductions] = useWorkflowList<WorkflowProduction>(productionKey, defaultWorkflowProduction, (value, index) => normalizeProduction(value, index));
  const [expanded, setExpanded] = useState<string | null>(null);
  const { setConfirmation, modal } = useConfirm();
  const changeStatus = (item: WorkflowProduction, status: ProductionStatus) => {
    if (!canWorkflow(role, "changeProductionStatus")) return toast.error("Seu perfil não pode alterar o status da produção.");
    if (item.status === status) return;
    setConfirmation({ title: "Alterar status da produção", description: `${item.id} · ${item.clientName}`, detail: `Status atual: ${item.status}\nNovo status: ${status}\nA alteração ficará registrada com usuário, data e origem.`, confirmLabel: "Confirmar alteração", onConfirm: () => { setProductions((current) => current.map((entry) => entry.id === item.id ? { ...entry, status, history: [...entry.history, makeHistory("Status da produção alterado", "Tela de Produção", item.status, status)] } : entry)); toast.success("Status de produção atualizado"); } });
  };
  return <div><PageHeader eyebrow="Chão de fábrica" title="Produção" description="A fabricação trabalha somente com dados técnicos e operacionais da OS. Valores financeiros ficam bloqueados nesta área." role={role} /><div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#cfe5d9] bg-[#f1fbf5] p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1da675] text-white"><LockKeyhole size={16} /></div><div><p className="text-[11px] font-extrabold text-[#176b4e]">Visão protegida para produção</p><p className="mt-1 text-[10px] text-[#4e896f]">Custo, margem, desconto e preço final não são carregados nem exibidos nesta tela.</p></div></div><div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Aguardando" value={String(productions.filter((item) => item.status === "Aguardando produção").length)} helper="na fila de fabricação" icon={Clock3} tone="bg-[#f2f5f8] text-[#687b8f]" /><SummaryCard label="Em andamento" value={String(productions.filter((item) => item.status === "Em andamento").length)} helper="em fabricação" icon={Wrench} tone="bg-[#eaf2ff] text-[#2859a6]" /><SummaryCard label="Parado" value={String(productions.filter((item) => item.status === "Parado").length)} helper="precisa de atenção" icon={CircleAlert} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Pronto instalar" value={String(productions.filter((item) => item.status === "Pronto para instalar").length)} helper="liberado para campo" icon={PackageCheck} tone="bg-[#eaf8f2] text-[#14835b]" /></div>{!productions.length ? <div className={`${shell} p-10 text-center`}><PackageCheck size={32} className="mx-auto text-[#b7c5d3]" /><p className="mt-3 text-[13px] font-extrabold text-[#52647d]">Nenhum serviço enviado para produção</p><p className="mt-1 text-[11px] text-[#9aa8b7]">Emita a OS e confirme o envio para liberar a fabricação.</p><button onClick={() => onModuleChange("os")} className="mt-4 rounded-xl bg-[#f3f7fd] px-4 py-2 text-[10px] font-extrabold text-[#2859a6]">Abrir OS</button></div> : <div className="space-y-3">{productions.map((item) => { const isExpanded = expanded === item.id; return <div key={item.id} className={`${shell} overflow-hidden`}><button onClick={() => setExpanded(isExpanded ? null : item.id)} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2859a6]"><Wrench size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-extrabold text-[#344861]">{item.id} · {item.clientName}</p><StatusBadge tone={productionStatusTone[item.status]}>{item.status}</StatusBadge></div><p className="mt-1 text-[11px] text-[#718398]">OS {item.osId} · {item.model} · {item.quantity} un.</p></div><div className="text-left sm:text-right"><p className="text-[10px] font-bold text-[#52647d]">Prazo {item.deadline}</p><p className="mt-1 text-[10px] text-[#9aa8b7]">{item.responsible}</p></div><ChevronRight size={16} className="text-[#c4cfdb]" /></button>{isExpanded && <div className="border-t border-[#eef1f5] p-4 sm:p-5"><div className="grid gap-4 md:grid-cols-[1fr_.8fr]"><div className="grid gap-2 rounded-2xl bg-[#f8fafc] p-4 text-[11px] text-[#718398]"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Ficha técnica</p><p>Modelo: <b className="text-[#52647d]">{item.model}</b></p><p>Medidas: <b className="text-[#52647d]">{item.measurements}</b></p><p>Materiais: <b className="text-[#52647d]">{item.materials}</b></p><p>Cor/acabamento: <b className="text-[#52647d]">{item.color} · {item.finish}</b></p><p>Quantidade: <b className="text-[#52647d]">{item.quantity}</b></p><p>Observações: <b className="text-[#52647d]">{item.notes || "Sem observações"}</b></p><p className="mt-2 flex items-center gap-1 border-t border-[#e5ebf2] pt-3 text-[9px] font-extrabold text-[#1a8a63]"><LockKeyhole size={12} /> Campos financeiros indisponíveis nesta área</p></div><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Atualizar produção</p><div className="grid gap-2">{(["Aguardando produção", "Em andamento", "Parado", "Pronto para instalar"] as ProductionStatus[]).map((status) => <button key={status} onClick={() => changeStatus(item, status)} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[10px] font-extrabold ${item.status === status ? "border-[#f47b20] bg-[#fff8f3] text-[#d9620d]" : "border-[#e5ebf2] text-[#718398] hover:border-[#b7cfe8]"}`}>{status}<span className={`h-2 w-2 rounded-full ${item.status === status ? "bg-[#f47b20]" : "bg-[#d6e0e9]"}`} /></button>)}</div></div></div><div className="mt-4 grid gap-4 md:grid-cols-[1fr_.8fr]"><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Histórico da produção</p><HistoryList history={item.history} /></div><div className="flex items-end justify-end gap-2"><button onClick={() => onModuleChange("instalacoes")} className="flex items-center gap-1.5 rounded-xl bg-[#eaf2ff] px-3 py-2 text-[10px] font-extrabold text-[#2859a6]"><ArrowRight size={13} /> Abrir instalação</button></div></div></div>}</div>; })}</div>}{modal}</div>;
}

function WorkflowPermissionsView() {
  const [role, setRole] = useState<WorkflowRole>(() => getCurrentWorkflowRole());
  const roles: WorkflowRole[] = ["Administrador", "Vendas", "Produção", "Instalador", "Financeiro"];
  const permissions = Object.keys(permissionLabels) as WorkflowPermission[];
  const changeRole = (value: WorkflowRole) => { setRole(value); window.localStorage.setItem("toldo:current-role", value); toast.success(`Perfil da sessão alterado para ${value}`); };
  return <div><PageHeader eyebrow="Administração" title="Permissões e rastreabilidade" description="As etapas do fluxo respeitam o perfil atual. Usuários não podem ampliar a própria permissão." role={role} /><div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]"><div className={`${shell} p-5`}><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#f47b20]" /><h2 className="font-display text-[17px] font-extrabold text-[#17324d]">Perfil da sessão</h2></div><p className="mt-2 text-[11px] leading-5 text-[#8d9aaa]">Este seletor representa o perfil autenticado no ambiente de demonstração. Em produção, o valor deve vir das permissões da sessão principal.</p><select value={role} onChange={(event) => changeRole(event.target.value as WorkflowRole)} className="mt-5 h-11 w-full rounded-xl border border-[#e1e7ef] bg-white px-3 text-[11px] font-extrabold text-[#52647d] outline-none"><option>{roles[0]}</option>{roles.slice(1).map((item) => <option key={item}>{item}</option>)}</select><div className="mt-5 rounded-2xl bg-[#f8fafc] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Regra de produção</p><p className="mt-2 text-[11px] leading-5 text-[#52647d]">Produção recebe OS, medidas e materiais. Valores, custo, margem, desconto e preço final ficam fora do modelo entregue.</p></div></div><div className={`${shell} overflow-hidden`}><div className="border-b border-[#eef1f5] p-5"><h2 className="font-display text-[17px] font-extrabold text-[#17324d]">Matriz por perfil</h2><p className="mt-1 text-[11px] text-[#8d9aaa]">Permissões de negócio aplicadas aos botões e às transições.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-[#eef1f5] text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#9aa8b7]"><th className="p-4">Permissão</th>{roles.map((item) => <th key={item} className="p-4 text-center">{item}</th>)}</tr></thead><tbody>{permissions.map((permission) => <tr key={permission} className="border-b border-[#f1f4f7] text-[10px]"><td className="p-4 font-bold text-[#52647d]">{permissionLabels[permission]}</td>{roles.map((item) => <td key={item} className="p-4 text-center">{canWorkflow(item, permission) ? <Check size={15} className="mx-auto text-[#14835b]" /> : <span className="text-[#c3ced9">—</span>}</td>)}</tr>)}</tbody></table></div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className={`${shell} p-4`}><LockKeyhole size={17} className="text-[#2859a6]" /><p className="mt-3 text-[11px] font-extrabold text-[#52647d]">Confirmação antes de agir</p><p className="mt-1 text-[10px] leading-4 text-[#9aa8b7]">Aprovação, conversão, OS, produção, status crítico e exclusão pedem confirmação.</p></div><div className={`${shell} p-4`}><History size={17} className="text-[#f47b20]" /><p className="mt-3 text-[11px] font-extrabold text-[#52647d]">Histórico completo</p><p className="mt-1 text-[10px] leading-4 text-[#9aa8b7]">Cada mudança grava ator, data, origem e status anterior/novo.</p></div><div className={`${shell} p-4`}><CircleAlert size={17} className="text-[#d9620d]" /><p className="mt-3 text-[11px] font-extrabold text-[#52647d]">Etapas não puláveis</p><p className="mt-1 text-[10px] leading-4 text-[#9aa8b7]">Sem aprovação não há cliente; sem cliente não há OS; sem OS não há produção.</p></div></div></div>;
}

export function WorkflowView({ module, onModuleChange }: { module: ModuleKey; onModuleChange: (module: ModuleKey) => void }) {
  if (module === "orcamentos") return <WorkflowQuotesView onModuleChange={onModuleChange} />;
  if (module === "clientes") return <WorkflowClientsView onModuleChange={onModuleChange} />;
  if (module === "os") return <WorkflowOSView onModuleChange={onModuleChange} />;
  if (module === "operacao") return <WorkflowProductionView onModuleChange={onModuleChange} />;
  return <WorkflowPermissionsView />;
}
