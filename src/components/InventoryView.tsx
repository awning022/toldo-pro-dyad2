import { useState, type FormEvent } from "react";
import { Boxes, ClipboardList, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type StockMaterial,
  type StockMovement,
  type SupplyRequest,
} from "@/lib/operationsStore";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Dialog = "material" | "movement" | null;

export function InventoryView() {
  const { records: materials, setRecords: setMaterials, reload: reloadMaterials } = useCompanyRecords<StockMaterial>("materials");
  const { records: movements, reload: reloadMovements } = useCompanyRecords<StockMovement>("stock_movements");
  const { records: requests, setRecords: setRequests } = useCompanyRecords<SupplyRequest>("supply_requests");
  const access = useCompanyAccess();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState<StockMaterial | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minimum, setMinimum] = useState("");
  const [unit, setUnit] = useState("un.");
  const [materialId, setMaterialId] = useState("");
  const [movementType, setMovementType] = useState<"Entrada" | "Saída">("Entrada");
  const [orderId, setOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const saveMaterials = (next: StockMaterial[]) => setMaterials(next);
  const startEdit = (material: StockMaterial) => {
    setEditing(material);
    setName(material.name);
    setSku(material.sku);
    setQuantity(String(material.quantity));
    setMinimum(String(material.minimum));
    setUnit(material.unit);
    setDialog("material");
  };
  const resetDialog = () => {
    setDialog(null);
    setEditing(null);
    setName("");
    setSku("");
    setQuantity("");
    setMinimum("");
    setUnit("un.");
    setMaterialId(materials[0]?.id || "");
    setMovementType("Entrada");
    setOrderId("");
    setNotes("");
  };
  const saveMaterial = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = editing ? editing.quantity : 0;
    const min = Number(minimum);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(min) || min < 0) return toast.error("Informe quantidades válidas.");
    const next = editing
      ? materials.map((item) => item.id === editing.id ? { ...item, name: name.trim(), sku: sku.trim(), quantity: amount, minimum: min, unit, cost: item.cost } : item)
      : [{ id: `material-${Date.now()}`, name: name.trim(), sku: sku.trim(), quantity: amount, minimum: min, unit, cost: "A definir" }, ...materials];
    saveMaterials(next);
    toast.success(editing ? "Material atualizado" : "Material cadastrado");
    resetDialog();
  };
  const saveMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Confira o material e a quantidade.");
    const { error } = await supabase.rpc("record_stock_movement", {
      p_material_id: materialId,
      p_quantity: amount,
      p_type: movementType,
      p_order_id: orderId.trim(),
      p_notes: notes.trim(),
      p_area: "estoque",
    });
    if (error) return toast.error(movementType === "Saída" ? "Quantidade inválida ou saldo insuficiente." : "Não foi possível registrar a movimentação.", { description: error.message });
    await Promise.all([reloadMaterials(), reloadMovements()]);
    toast.success(`${movementType} de estoque registrada`);
    resetDialog();
  };
  const fulfillRequest = (request: SupplyRequest) => {
    const next = requests.map((item) => item.id === request.id ? { ...item, status: "Atendida" as const } : item);
    setRequests(next);
  };
  const removeMaterial = (material: StockMaterial) => {
    if (!window.confirm(`Excluir ${material.name} do cadastro? O histórico de movimentações será mantido.`)) return;
    saveMaterials(materials.filter((item) => item.id !== material.id));
  };

  return <div>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#f47b20]">Materiais</p><h1 className="font-display text-[28px] font-extrabold tracking-[-0.055em] text-[#17324d]">Estoque</h1><p className="mt-2 text-[13px] text-[#718398]">Edite materiais, registre entradas e saídas e acompanhe o consumo por pedido.</p></div><div className="flex flex-wrap gap-2">{access.can("manageStock") && <><Button onClick={() => { setEditing(null); setDialog("material"); }} className="h-10 rounded-xl bg-[#17324d] text-[11px] font-bold"><Plus size={15} /> Novo material</Button><Button onClick={() => { setMaterialId(materials[0]?.id || ""); setDialog("movement"); }} className="h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#db6812]"><PackageCheck size={15} /> Registrar movimentação</Button></>}</div></div>
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#f5d7bf] bg-[#fff8f3] p-4"><PackageCheck size={19} className="text-[#f47b20]" /><div><p className="text-[12px] font-bold text-[#6b341b]">{materials.filter((item) => item.quantity < item.minimum).length} materiais abaixo do estoque mínimo</p><p className="mt-1 text-[11px] text-[#9b6a4f]">Solicitações de produção e instalação aparecem abaixo para acompanhamento.</p></div></div>
    <section className="overflow-hidden rounded-[22px] border border-[#e9edf3] bg-white shadow-[0_8px_24px_rgba(24,43,73,0.04)]"><div className="border-b border-[#eef1f5] p-5"><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Materiais cadastrados</h2></div><div className="divide-y divide-[#eef1f5]">{materials.map((item) => <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#1453a6]"><Boxes size={18} /></div><div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-[#344861]">{item.name}</p><p className="mt-1 text-[10px] text-[#9aa6b6]">{item.sku || "Sem código"} · {item.cost}</p></div><div className="sm:w-36"><p className="text-[11px] font-bold text-[#52647d]">{item.quantity} {item.unit}</p><p className="mt-1 text-[10px] text-[#9aa6b6]">Mínimo: {item.minimum} {item.unit}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.quantity >= item.minimum ? "bg-[#eaf8f2] text-[#14835b]" : "bg-[#fff1e7] text-[#d9620d]"}`}>{item.quantity >= item.minimum ? "Disponível" : "Abaixo do mínimo"}</span>{access.can("manageStock") && <button onClick={() => startEdit(item)} className="rounded-lg p-2 text-[#2859a6]" aria-label={`Editar ${item.name}`}><Pencil size={15} /></button>}{access.can("deleteRecord") && <button onClick={() => removeMaterial(item)} className="rounded-lg p-2 text-[#c35c42]" aria-label={`Excluir ${item.name}`}><Trash2 size={15} /></button>}</div>)}</div></section>
    <section className="mt-5 rounded-[22px] border border-[#e9edf3] bg-white p-5"><div className="mb-4 flex items-center gap-2"><ClipboardList size={17} className="text-[#f47b20]" /><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Solicitações de materiais</h2><span className="rounded-full bg-[#fff1e7] px-2 py-1 text-[10px] font-bold text-[#d9620d]">{requests.filter((item) => item.status === "Pendente").length} pendentes</span></div>{requests.length ? <div className="space-y-2">{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#edf1f5] p-3"><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[#344861]">{request.material} · {request.quantity}</p><p className="mt-1 text-[10px] text-[#8d9aaa]">{request.requester} · {request.role}{request.orderId ? ` · ${request.orderId}` : ""} · {new Date(request.createdAt).toLocaleString("pt-BR")}</p></div><span className="text-[10px] font-bold text-[#d9620d]">{request.status}</span>{request.status === "Pendente" && access.can("manageStock") && <Button onClick={() => fulfillRequest(request)} variant="ghost" className="h-8 rounded-lg text-[10px] font-bold text-[#14835b]">Marcar atendida</Button>}</div>)}</div> : <p className="text-[11px] text-[#9aa6b6]">Nenhuma solicitação de material registrada.</p>}</section>
    <section className="mt-5 rounded-[22px] border border-[#e9edf3] bg-white p-5"><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Movimentações recentes</h2>{movements.length ? <div className="mt-3 divide-y divide-[#eef1f5]">{movements.slice(0, 12).map((movement) => <div key={movement.id} className="flex flex-wrap justify-between gap-2 py-3 text-[10px]"><span className="font-bold text-[#52647d]">{movement.type} · {movement.materialName} · {movement.quantity}</span><span className="text-[#8d9aaa]">{movement.orderId || "Sem pedido"}{movement.notes ? ` · ${movement.notes}` : ""} · {new Date(movement.at).toLocaleString("pt-BR")}</span></div>)}</div> : <p className="mt-3 text-[11px] text-[#9aa6b6]">Ainda não há movimentações.</p>}</section>
    {dialog && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#172b4d]/35 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[500px] rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(23,43,77,0.24)]"><h2 className="font-display text-[20px] font-bold text-[#172b4d]">{dialog === "material" ? editing ? "Editar material" : "Cadastrar material" : "Registrar movimentação"}</h2><form onSubmit={dialog === "material" ? saveMaterial : saveMovement} className="mt-5 grid gap-3">{dialog === "material" ? <><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Nome<Input required value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Código<Input value={sku} onChange={(event) => setSku(event.target.value)} className="h-10 rounded-xl" /></label><div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Mínimo<Input required type="number" min="0" step="0.001" value={minimum} onChange={(event) => setMinimum(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Unidade<Input required value={unit} onChange={(event) => setUnit(event.target.value)} className="h-10 rounded-xl" /></label></div><p className="rounded-xl bg-[#f8fafc] p-3 text-[10px] text-[#718398]">{editing ? `Saldo atual: ${editing.quantity} ${editing.unit}.` : "O material começa com saldo zero."} Registre entradas e saídas para alterar o saldo e manter o histórico.</p></> : <><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Material<select required value={materialId} onChange={(event) => setMaterialId(event.target.value)} className="h-10 rounded-xl border border-[#e1e7ef] bg-white px-3">{materials.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit}</option>)}</select></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Tipo<select value={movementType} onChange={(event) => setMovementType(event.target.value as "Entrada" | "Saída")} className="h-10 rounded-xl border border-[#e1e7ef] bg-white px-3"><option>Entrada</option><option>Saída</option></select></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Quantidade<Input required type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Pedido relacionado (opcional)<Input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Ex.: OS-0250" className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Observação<Input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-10 rounded-xl" /></label></>}<div className="mt-2 flex gap-2"><Button type="button" variant="ghost" onClick={resetDialog} className="h-10 flex-1 rounded-xl">Cancelar</Button><Button type="submit" className="h-10 flex-1 rounded-xl bg-[#f47b20] text-white hover:bg-[#db6812]">Salvar</Button></div></form></div></div>}
  </div>;
}
