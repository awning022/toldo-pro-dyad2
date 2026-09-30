import { useState } from "react";
import { CalendarDays, Check, ClipboardList, MapPin, PackageCheck, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialUseDialog, SupplyRequestDialog } from "@/components/InventoryActions";
import {
  makeHistory,
  type WorkflowInstallation,
  type WorkflowOS,
} from "@/lib/workflowData";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function InstallationsView() {
  const { records: installations, setRecords: setInstallations, reload: reloadInstallations } = useCompanyRecords<WorkflowInstallation>("installations");
  const { reload: reloadWorkOrders } = useCompanyRecords<WorkflowOS>("work_orders");
  const access = useCompanyAccess();
  const [useFor, setUseFor] = useState<WorkflowInstallation | null>(null);
  const [requestFor, setRequestFor] = useState<WorkflowInstallation | null>(null);
  const persist = (next: WorkflowInstallation[]) => setInstallations(next);
  const advance = (installation: WorkflowInstallation) => {
    const statuses: WorkflowInstallation["status"][] = ["Agendada", "A caminho", "Instalando", "Concluída"];
    const nextStatus = statuses[Math.min(statuses.indexOf(installation.status) + 1, statuses.length - 1)];
    if (installation.status === "Concluída") return;
    if (nextStatus === "Concluída") return finish(installation);
    persist(installations.map((item) => item.id === installation.id
      ? { ...item, status: nextStatus, history: [...item.history, makeHistory("Status da instalação atualizado", "Tela de Instalações", installation.status, nextStatus)] }
      : item));
  };
  const finish = async (installation: WorkflowInstallation) => {
    const { error } = await supabase.rpc("complete_installation", { p_installation_id: installation.id });
    if (error) return toast.error("Não foi possível finalizar a instalação.", { description: error.message });
    await Promise.all([reloadInstallations(), reloadWorkOrders()]);
    toast.success(installation.osId
      ? `Instalação finalizada; OS ${installation.osId} movida para concluídas.`
      : `Instalação de ${installation.customer} finalizada.`);
  };

  const active = installations.filter((item) => item.status !== "Concluída");
  const completed = installations.filter((item) => item.status === "Concluída");
  return <div>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#f47b20]">Campo</p><h1 className="font-display text-[28px] font-extrabold tracking-[-0.055em] text-[#17324d]">Instalações</h1><p className="mt-2 text-[13px] text-[#718398]">Acompanhe a equipe, registre materiais usados e finalize a OS correspondente.</p></div>{access.can("requestMaterials") && <Button onClick={() => setRequestFor({ id: "", time: "", customer: "", address: "", team: "", status: "Agendada", history: [] })} className="h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#db6812]">Solicitar material</Button>}</div>
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-[20px] border border-[#e9edf3] bg-white p-5"><CalendarDays size={19} className="text-[#1453a6]" /><p className="mt-3 text-[12px] text-[#708096]">Em andamento</p><p className="mt-1 font-display text-[25px] font-bold text-[#172b4d]">{active.length}</p></div><div className="rounded-[20px] border border-[#e9edf3] bg-white p-5"><Truck size={19} className="text-[#d9620d]" /><p className="mt-3 text-[12px] text-[#708096]">A caminho</p><p className="mt-1 font-display text-[25px] font-bold text-[#172b4d]">{installations.filter((item) => item.status === "A caminho").length}</p></div><div className="rounded-[20px] border border-[#e9edf3] bg-white p-5"><Check size={19} className="text-[#14835b]" /><p className="mt-3 text-[12px] text-[#708096]">Concluídas</p><p className="mt-1 font-display text-[25px] font-bold text-[#172b4d]">{completed.length}</p></div></div>
    <section className="rounded-[22px] border border-[#e9edf3] bg-white p-5"><h2 className="mb-4 font-display text-[16px] font-bold text-[#172b4d]">Agenda de instalações</h2>{active.length ? <div className="space-y-3">{active.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-[#edf1f5] p-4 sm:flex-row sm:items-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf8f2] text-[#14835b]"><Wrench size={17} /></div><div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-[#344861]">{item.customer}{item.osId ? ` · ${item.osId}` : ""}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-[#9aa6b6]"><MapPin size={12} /> {item.address || "Endereço pendente"}</p><p className="mt-1 text-[10px] font-semibold text-[#718096]">{item.time} · {item.team}</p></div><span className="rounded-full bg-[#f3f5f8] px-2.5 py-1 text-[10px] font-bold text-[#52647d]">{item.status}</span><div className="flex flex-wrap gap-2">{access.can("manageStock") && <button onClick={() => setUseFor(item)} className="rounded-xl bg-[#eaf2ff] px-3 py-2 text-[10px] font-bold text-[#2859a6]">Registrar material usado</button>}{access.can("requestMaterials") && <button onClick={() => setRequestFor(item)} className="rounded-xl bg-[#fff1e7] px-3 py-2 text-[10px] font-bold text-[#d9620d]">Solicitar material</button>}{access.can("manageInstallations") && <button onClick={() => advance(item)} className="rounded-xl bg-[#172b4d] px-3 py-2 text-[10px] font-bold text-white">{item.status === "Instalando" ? "Concluir e enviar OS" : "Avançar status"}</button>}</div></article>)}</div> : <p className="text-[11px] text-[#9aa6b6]">Nenhuma instalação em andamento.</p>}</section>
    {completed.length > 0 && <section className="mt-5 rounded-[22px] border border-[#e9edf3] bg-white p-5"><div className="mb-4 flex items-center gap-2"><PackageCheck size={17} className="text-[#14835b]" /><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Instalações concluídas</h2></div><div className="space-y-2">{completed.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f8fafc] p-3"><span className="min-w-0 flex-1 text-[11px] font-bold text-[#52647d]">{item.customer} · {item.osId || "Sem OS vinculada"}</span><span className="text-[10px] text-[#14835b]">Concluída</span></div>)}</div></section>}
    {useFor && <MaterialUseDialog orderId={useFor.osId || useFor.productionId || useFor.id} area="instalação" onClose={() => setUseFor(null)} onUsed={(material, amount, unit) => {
      persist(installations.map((item) => item.id === useFor.id ? { ...item, materials: [...(item.materials || []), `${amount} ${unit} · ${material}`], history: [...item.history, makeHistory(`Material utilizado: ${amount} ${unit} · ${material}`, "Tela de Instalações")] } : item));
    }} />}
    {requestFor && <SupplyRequestDialog orderId={requestFor.id ? requestFor.osId || requestFor.id : undefined} onClose={() => setRequestFor(null)} />}
  </div>;
}
