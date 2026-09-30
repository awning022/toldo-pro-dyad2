import { useMemo, useState } from "react";
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
import { MaterialUseDialog, SupplyRequestDialog } from "@/components/InventoryActions";
import {
  canWorkflow,
  getCurrentWorkflowRole,
  makeHistory,
  nextId,
  normalizeProduction,
  type InstallationStatus,
  type ProductionStatus,
  type WorkflowInstallation,
  type WorkflowHistory,
  type WorkflowProduction,
  type WorkflowRole,
} from "@/lib/workflowData";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type WorkflowViewProps = { onModuleChange: (module: ModuleKey) => void };
type Confirmation = { title: string; description: string; detail: string; confirmLabel: string; onConfirm: () => void; danger?: boolean };

const shell = "rounded-[22px] border border-[#e5ebf2] bg-white shadow-[0_9px_26px_rgba(24,43,73,0.045)]";
const quoteKey = "toldo:quotes";
const clientKey = "toldo:customers";
const osKey = "toldo:work-orders";
const productionKey = "toldo:production";

function useWorkflowList<T extends { id: string }>(key: string, normalize: (value: T, index: number) => T) {
  const entityByKey: Record<string, string> = {
    "toldo:production": "production",
    "toldo:workflow-installations": "installations",
  };
  const entity = entityByKey[key];
  if (!entity) throw new Error(`Unknown company record collection: ${key}`);
  const { records, setRecords, reload } = useCompanyRecords<T & { id: string }>(entity);
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

const productionStatusTone: Record<ProductionStatus, "neutral" | "blue" | "orange" | "green"> = { "Aguardando produção": "neutral", "Em andamento": "blue", Parado: "orange", "Pronto para instalar": "green", "Concluída": "green" };

export function WorkflowProductionView({ onModuleChange }: WorkflowViewProps) {
  const role = getCurrentWorkflowRole();
  const [productions, setProductions, reloadProductions] = useWorkflowList<WorkflowProduction>(productionKey, (value) => normalizeProduction(value, 0));
  const [installations, , reloadInstallations] = useWorkflowList<WorkflowInstallation>("toldo:workflow-installations", (value, index) => ({ ...value, id: value.id || `INST-${String(index + 1).padStart(3, "0")}`, time: value.time || new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }), status: (["Agendada", "A caminho", "Instalando", "Concluída"] as InstallationStatus[]).includes(value.status as InstallationStatus) ? value.status as InstallationStatus : "Agendada", observations: value.observations || "", photos: value.photos || [], productionId: value.productionId || "", osId: value.osId || "", quoteId: value.quoteId || "", clientId: value.clientId || "", history: Array.isArray(value.history) ? value.history : [] }));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [useFor, setUseFor] = useState<WorkflowProduction | null>(null);
  const [requestFor, setRequestFor] = useState<string | null>(null);
  const { setConfirmation, modal } = useConfirm();
  const changeStatus = (item: WorkflowProduction, status: ProductionStatus) => {
    if (!canWorkflow(role, "changeProductionStatus")) return toast.error("Seu perfil não pode alterar o status da produção.");
    if (item.status === status) return;
    setConfirmation({ title: "Alterar status da produção", description: `${item.id} · ${item.clientName}`, detail: `Status atual: ${item.status}\nNovo status: ${status}\nA alteração ficará registrada com usuário, data e origem.`, confirmLabel: "Confirmar alteração", onConfirm: () => { setProductions((current) => current.map((entry) => entry.id === item.id ? { ...entry, status, history: [...entry.history, makeHistory("Status da produção alterado", "Tela de Produção", item.status, status)] } : entry)); toast.success("Status de produção atualizado"); } });
  };
  const sendToInstallation = async (item: WorkflowProduction) => {
    if (!canWorkflow(role, "changeProductionStatus")) return toast.error("Seu perfil não pode enviar para instalação.");
    if (item.status !== "Pronto para instalar") return toast.error("A produção precisa estar 'Pronto para instalar' antes de enviar para instalação.");
    const installationId = nextId("INST", installations);
    const { data, error } = await supabase.rpc("send_production_to_installation", {
      p_production_id: item.id,
      p_installation_id: installationId,
    });
    if (error) return toast.error("Não foi possível enviar a produção para instalação.", { description: error.message });
    await Promise.all([reloadProductions(), reloadInstallations()]);
    toast.success(`Instalação ${data.id} criada e produção encerrada`);
    onModuleChange("instalacoes");
  };
  const markReady = (item: WorkflowProduction) => {
    if (!canWorkflow(role, "changeProductionStatus")) return toast.error("Seu perfil não pode alterar o status da produção.");
    if (item.status === "Pronto para instalar") return toast.info("Já está pronto para instalar.");
    changeStatus(item, "Pronto para instalar");
  };
  return <div><PageHeader eyebrow="Chão de fábrica" title="Produção" description="A fabricação trabalha somente com dados técnicos e operacionais da OS. Valores financeiros ficam bloqueados nesta área." role={role} /><div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#cfe5d9] bg-[#f1fbf5] p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1da675] text-white"><LockKeyhole size={16} /></div><div><p className="text-[11px] font-extrabold text-[#176b4e]">Visão protegida para produção</p><p className="mt-1 text-[10px] text-[#4e896f]">Custo, margem, desconto e preço final não são carregados nem exibidos nesta tela.</p></div></div><div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Aguardando" value={String(productions.filter((item) => item.status === "Aguardando produção").length)} helper="na fila de fabricação" icon={Clock3} tone="bg-[#f2f5f8] text-[#687b8f]" /><SummaryCard label="Em andamento" value={String(productions.filter((item) => item.status === "Em andamento").length)} helper="em fabricação" icon={Wrench} tone="bg-[#eaf2ff] text-[#2859a6]" /><SummaryCard label="Parado" value={String(productions.filter((item) => item.status === "Parado").length)} helper="precisa de atenção" icon={CircleAlert} tone="bg-[#fff1e7] text-[#d9620d]" /><SummaryCard label="Pronto instalar" value={String(productions.filter((item) => item.status === "Pronto para instalar").length)} helper="liberado para campo" icon={PackageCheck} tone="bg-[#eaf8f2] text-[#14835b]" /></div>{!productions.length ? <div className={`${shell} p-10 text-center`}><PackageCheck size={32} className="mx-auto text-[#b7c5d3]" /><p className="mt-3 text-[13px] font-extrabold text-[#52647d]">Nenhum serviço enviado para produção</p><p className="mt-1 text-[11px] text-[#9aa8b7]">Emita a OS e confirme o envio para liberar a fabricação.</p><button onClick={() => onModuleChange("os")} className="mt-4 rounded-xl bg-[#f3f7fd] px-4 py-2 text-[10px] font-extrabold text-[#2859a6]">Abrir OS</button></div> : <div className="space-y-3">{productions.map((item) => { const isExpanded = expanded === item.id; return <div key={item.id} className={`${shell} overflow-hidden`}><button onClick={() => setExpanded(isExpanded ? null : item.id)} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2859a6]"><Wrench size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-extrabold text-[#344861]">{item.id} · {item.clientName}</p><StatusBadge tone={productionStatusTone[item.status]}>{item.status}</StatusBadge></div><p className="mt-1 text-[11px] text-[#718398]">OS {item.osId} · {item.model} · {item.quantity} un.</p></div><div className="text-left sm:text-right"><p className="text-[10px] font-bold text-[#52647d]">Prazo {item.deadline}</p><p className="mt-1 text-[10px] text-[#9aa8b7]">{item.responsible}</p></div><ChevronRight size={16} className="text-[#c4cfdb]" /></button>{isExpanded && <div className="border-t border-[#eef1f5] p-4 sm:p-5"><div className="grid gap-4 md:grid-cols-[1fr_.8fr]"><div className="grid gap-2 rounded-2xl bg-[#f8fafc] p-4 text-[11px] text-[#718398]"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Ficha técnica</p><p>Modelo: <b className="text-[#52647d]">{item.model}</b></p><p>Medidas: <b className="text-[#52647d]">{item.measurements}</b></p><p>Materiais: <b className="text-[#52647d]">{item.materials}</b></p><p>Cor/acabamento: <b className="text-[#52647d]">{item.color} · {item.finish}</b></p><p>Quantidade: <b className="text-[#52647d]">{item.quantity}</b></p><p>Observações: <b className="text-[#52647d]">{item.notes || "Sem observações"}</b></p><p className="mt-2 flex items-center gap-1 border-t border-[#e5ebf2] pt-3 text-[9px] font-extrabold text-[#1a8a63]"><LockKeyhole size={12} /> Campos financeiros indisponíveis nesta área</p></div><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Atualizar produção</p><div className="grid gap-2">{(["Aguardando produção", "Em andamento", "Parado", "Pronto para instalar"] as ProductionStatus[]).map((status) => <button key={status} onClick={() => changeStatus(item, status)} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[10px] font-extrabold ${item.status === status ? "border-[#f47b20] bg-[#fff8f3] text-[#d9620d]" : "border-[#e5ebf2] text-[#718398] hover:border-[#b7cfe8]"}`}>{status}<span className={`h-2 w-2 rounded-full ${item.status === status ? "bg-[#f47b20]" : "bg-[#d6e0e9]"}`} /></button>)}</div></div></div><div className="mt-4 grid gap-4 md:grid-cols-[1fr_.8fr]"><div className="rounded-2xl bg-[#f8fafc] p-4"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8192a4]">Histórico da produção</p><HistoryList history={item.history} /></div><div className="flex flex-wrap items-end gap-2"><button onClick={() => setUseFor(item)} className="flex items-center gap-1.5 rounded-xl bg-[#eaf8f2] px-3 py-2 text-[10px] font-extrabold text-[#14835b]">Registrar material usado</button><button onClick={() => setRequestFor(item.osId || item.id)} className="flex items-center gap-1.5 rounded-xl bg-[#fff1e7] px-3 py-2 text-[10px] font-extrabold text-[#d9620d]">Solicitar material</button><button onClick={() => markReady(item)} className="flex items-center gap-1.5 rounded-xl bg-[#eaf8f2] px-3 py-2 text-[10px] font-extrabold text-[#14835b]"><PackageCheck size={13} /> Pronto para instalar</button><button onClick={() => sendToInstallation(item)} disabled={item.status !== "Pronto para instalar"} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-extrabold ${item.status === "Pronto para instalar" ? "bg-[#eaf2ff] text-[#2859a6] hover:bg-[#dbe7f1]" : "bg-[#f2f5f8] text-[#9aa8b7] cursor-not-allowed"}`}><ArrowRight size={13} /> Enviar para instalação</button><button onClick={() => onModuleChange("instalacoes")} className="flex items-center gap-1.5 rounded-xl bg-[#f2edff] px-3 py-2 text-[10px] font-extrabold text-[#7852d6]"><Wrench size={13} /> Sair da produção</button></div></div></div>}</div>; })}</div>}{useFor && <MaterialUseDialog orderId={useFor.osId || useFor.id} area={"produ\u00e7\u00e3o"} onClose={() => setUseFor(null)} onUsed={(material, amount, unit) => setProductions((current) => current.map((entry) => entry.id === useFor.id ? { ...entry, materials: `${entry.materials}; ${amount} ${unit} de ${material} utilizados`, history: [...entry.history, makeHistory(`Material utilizado: ${amount} ${unit} - ${material}`, "Tela de Produ??o")] } : entry))} />}{requestFor !== null && <SupplyRequestDialog orderId={requestFor || undefined} onClose={() => setRequestFor(null)} />}{modal}</div>;
}