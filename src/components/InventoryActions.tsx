import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type StockMaterial,
  type StockMovement,
} from "@/lib/operationsStore";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const overlay = "fixed inset-0 z-[80] flex items-end justify-center bg-[#172b4d]/40 p-3 backdrop-blur-sm sm:items-center";
const panel = "w-full max-w-[480px] rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(23,43,77,0.24)]";
const label = "grid gap-1.5 text-[11px] font-bold text-[#52647d]";
const inputClass = "h-10 rounded-xl text-[12px]";

export function MaterialUseDialog({ orderId, area, onClose, onUsed }: {
  orderId: string;
  area: "produção" | "instalação";
  onClose: () => void;
  onUsed: (materialName: string, quantity: number, unit: string) => void;
}) {
  const { records: materials, reload: reloadMaterials } = useCompanyRecords<StockMaterial>("materials");
  const { reload: reloadMovements } = useCompanyRecords<StockMovement>("stock_movements");
  const [materialId, setMaterialId] = useState(materials[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(quantity);
    const usedMaterial = materials.find((item) => item.id === materialId);
    if (!usedMaterial) return toast.error("Material não encontrado no estoque.");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Informe uma quantidade válida.");
    const { error } = await supabase.rpc("record_stock_movement", {
      p_material_id: materialId,
      p_quantity: amount,
      p_type: "Saída",
      p_order_id: orderId,
      p_notes: `${area}: ${notes || orderId}`,
      p_area: area,
    });
    if (error) return toast.error("Não foi possível registrar o consumo.", { description: error.message });
    await Promise.all([reloadMaterials(), reloadMovements()]);
    onUsed(usedMaterial.name, amount, usedMaterial.unit);
    toast.success(`${amount} ${usedMaterial.unit} de ${usedMaterial.name} baixados do estoque`);
    onClose();
  };
  return <div className={overlay}><div className={panel}>
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f47b20]">Baixa de estoque · {area}</p>
    <h2 className="mt-2 font-display text-[20px] font-bold text-[#172b4d]">Registrar material utilizado</h2>
    <p className="mt-1 text-[11px] text-[#8d9aaa]">A saída será registrada no pedido {orderId}.</p>
    <form onSubmit={save} className="mt-5 grid gap-4">
      <label className={label}>Material
        <select required value={materialId} onChange={(event) => setMaterialId(event.target.value)} className="h-10 rounded-xl border border-[#e1e7ef] bg-white px-3 text-[12px]">
          {materials.map((material) => <option key={material.id} value={material.id}>{material.name} · {material.quantity} {material.unit} disponíveis</option>)}
        </select>
      </label>
      <label className={label}>Quantidade utilizada
        <Input type="number" min="0.001" step="0.001" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputClass} />
      </label>
      <label className={label}>Observação
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" className={inputClass} />
      </label>
      <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose} className="h-10 flex-1 rounded-xl">Cancelar</Button><Button type="submit" className="h-10 flex-1 rounded-xl bg-[#f47b20] text-white hover:bg-[#db6812]">Dar baixa</Button></div>
    </form>
  </div></div>;
}

export function SupplyRequestDialog({ orderId, onClose }: { orderId?: string; onClose: () => void }) {
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!material.trim() || !Number.isFinite(amount) || amount <= 0) return toast.error("Informe o material e uma quantidade válida.");
    const { error } = await supabase.rpc("create_supply_request", {
      p_material: material.trim(),
      p_quantity: amount,
      p_order_id: orderId || "",
      p_notes: notes.trim(),
    });
    if (error) return toast.error("Não foi possível enviar a solicitação.", { description: error.message });
    toast.success("Solicitação enviada; uma notificação foi criada no painel.");
    onClose();
  };
  return <div className={overlay}><div className={panel}>
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f47b20]">Solicitação independente</p>
    <h2 className="mt-2 font-display text-[20px] font-bold text-[#172b4d]">Solicitar materiais</h2>
    <p className="mt-1 text-[11px] text-[#8d9aaa]">A empresa será notificada e poderá acompanhar o pedido.</p>
    <form onSubmit={save} className="mt-5 grid gap-4">
      {orderId && <p className="rounded-xl bg-[#f8fafc] p-3 text-[11px] text-[#52647d]">Pedido relacionado: <b>{orderId}</b></p>}
      <label className={label}>Material solicitado<Input required value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Ex.: Lona bege 3,00m" className={inputClass} /></label>
      <label className={label}>Quantidade<Input required type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputClass} /></label>
      <label className={label}>Observação<Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Justificativa ou prazo" className={inputClass} /></label>
      <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose} className="h-10 flex-1 rounded-xl">Cancelar</Button><Button type="submit" className="h-10 flex-1 rounded-xl bg-[#f47b20] text-white hover:bg-[#db6812]">Enviar solicitação</Button></div>
    </form>
  </div></div>;
}
