import { useState, type FormEvent } from "react";
import { DollarSign, Pencil, Plus, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyRecords } from "@/lib/useCompanyRecords";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { toast } from "sonner";

export type FinanceEntry = {
  id: string;
  title: string;
  type: "A pagar" | "A receber";
  date: string;
  value: string;
  status: "Pendente" | "Agendado" | "Pago" | "Recebido";
};

const currency = (value: string) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function FinanceView() {
  const { records: entries, setRecords: setEntries } = useCompanyRecords<FinanceEntry>("finance");
  const access = useCompanyAccess();
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<FinanceEntry["type"]>("A pagar");
  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<FinanceEntry["status"]>("Pendente");
  const saveList = (next: FinanceEntry[]) => setEntries(next);
  const startEdit = (entry?: FinanceEntry) => {
    setEditing(entry || null);
    setTitle(entry?.title || "");
    setType(entry?.type || "A pagar");
    setDate(entry?.date || "");
    setValue(entry?.value || "");
    setStatus(entry?.status || "Pendente");
    setOpen(true);
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Informe um valor maior que zero.");
    const entry = { id: editing?.id || `fin-${Date.now()}`, title: title.trim(), type, date, value: String(amount), status };
    saveList(editing ? entries.map((item) => item.id === editing.id ? entry : item) : [entry, ...entries]);
    setOpen(false);
    toast.success(editing ? "Lançamento atualizado" : "Lançamento registrado");
  };
  const pendingPay = entries.filter((item) => item.type === "A pagar" && item.status !== "Pago").reduce((sum, item) => sum + Number(item.value), 0);
  const pendingReceive = entries.filter((item) => item.type === "A receber" && item.status !== "Recebido").reduce((sum, item) => sum + Number(item.value), 0);
  const received = entries.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + Number(item.value), 0);
  const paid = entries.filter((item) => item.status === "Pago").reduce((sum, item) => sum + Number(item.value), 0);
  const cards: Array<{ label: string; amount: string; icon: LucideIcon }> = [
    { label: "A receber", amount: currency(String(pendingReceive)), icon: Wallet },
    { label: "A pagar", amount: currency(String(pendingPay)), icon: DollarSign },
    { label: "Recebido", amount: currency(String(received)), icon: Wallet },
    { label: "Pago", amount: currency(String(paid)), icon: DollarSign },
  ];
  return <div>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#f47b20]">Gestão</p><h1 className="font-display text-[28px] font-extrabold tracking-[-0.055em] text-[#17324d]">Financeiro</h1><p className="mt-2 text-[13px] text-[#718398]">Cadastre e edite contas a pagar e a receber.</p></div>{access.can("manageFinance") && <Button onClick={() => startEdit()} className="h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white"><Plus size={15} /> Novo lançamento</Button>}</div>
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ label, amount, icon: Icon }) => <div key={label} className="rounded-[20px] border border-[#e9edf3] bg-white p-5"><Icon size={18} className="text-[#f47b20]" /><p className="mt-3 text-[11px] text-[#708096]">{label}</p><p className="mt-1 font-display text-[20px] font-bold text-[#172b4d]">{amount}</p></div>)}</div>
    <section className="overflow-hidden rounded-[22px] border border-[#e9edf3] bg-white"><div className="border-b border-[#eef1f5] p-5"><h2 className="font-display text-[16px] font-bold text-[#172b4d]">Contas e movimentações</h2></div><div className="divide-y divide-[#eef1f5]">{entries.map((entry) => <div key={entry.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${entry.type === "A receber" ? "bg-[#eaf8f2] text-[#14835b]" : "bg-[#fff1e7] text-[#d9620d]"}`}><DollarSign size={16} /></div><div className="min-w-0 flex-1"><p className="text-[12px] font-extrabold text-[#344861]">{entry.title}</p><p className="mt-1 text-[10px] text-[#9aa6b6]">{entry.type} · vencimento {new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR")}</p></div><span className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[9px] font-bold text-[#52647d]">{entry.status}</span><p className="text-[13px] font-extrabold text-[#17324d]">{currency(entry.value)}</p>{access.can("manageFinance") && <button onClick={() => startEdit(entry)} className="rounded-lg p-2 text-[#2859a6]" aria-label={`Editar ${entry.title}`}><Pencil size={15} /></button>}</div>)}</div></section>
    {open && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#172b4d]/35 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[480px] rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(23,43,77,0.24)]"><h2 className="font-display text-[20px] font-bold text-[#172b4d]">{editing ? "Editar lançamento" : "Novo lançamento financeiro"}</h2><form onSubmit={save} className="mt-5 grid gap-3"><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Descrição<Input required value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Tipo<select value={type} onChange={(event) => setType(event.target.value as FinanceEntry["type"])} className="h-10 rounded-xl border border-[#e1e7ef] bg-white px-3"><option>A pagar</option><option>A receber</option></select></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Vencimento<Input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-xl" /></label><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Valor (R$)<Input required type="number" min="0.01" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} className="h-10 rounded-xl" /></label></div><label className="grid gap-1 text-[11px] font-bold text-[#52647d]">Status<select value={status} onChange={(event) => setStatus(event.target.value as FinanceEntry["status"])} className="h-10 rounded-xl border border-[#e1e7ef] bg-white px-3">{["Pendente", "Agendado", "Pago", "Recebido"].map((item) => <option key={item}>{item}</option>)}</select></label><div className="mt-2 flex gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-10 flex-1 rounded-xl">Cancelar</Button><Button type="submit" className="h-10 flex-1 rounded-xl bg-[#f47b20] text-white hover:bg-[#db6812]">Salvar</Button></div></form></div></div>}
  </div>;
}
