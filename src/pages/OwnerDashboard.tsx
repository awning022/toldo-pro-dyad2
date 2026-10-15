import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Download, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

const OWNER_EMAIL = "awningbrasil@gmail.com";
type EventRow = { id: number; user_id: string; company_id: string | null; event_type: string; route: string | null; duration_ms: number | null; created_at: string };

function csvCell(value: unknown) {
  const s = String(value ?? "");
  return '"' + s.replace(/"/g, '""') + '"';
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("7");

  const load = useCallback(async () => {
    if (!supabase) { setError("Supabase não está configurado."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const currentEmail = authData.user?.email?.toLowerCase() || "";
    setEmail(currentEmail);
    if (authError || !authData.user || currentEmail !== OWNER_EMAIL) {
      setEvents([]); setError("Acesso restrito ao proprietário."); setLoading(false); return;
    }
    const since = new Date(Date.now() - Number(period) * 86400000).toISOString();
    const { data, error: queryError } = await supabase.from("owner_telemetry").select("id,user_id,company_id,event_type,route,duration_ms,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(2000);
    if (queryError) setError("Não foi possível ler os registros. Confira se a migração owner_telemetry foi aplicada no Supabase.");
    else setEvents((data || []) as EventRow[]);
    setLoading(false);
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const uniqueUsers = new Set(events.map((e) => e.user_id)).size;
  const sessionStarts = events.filter((e) => e.event_type === "session_start").length;
  const errors = events.filter((e) => e.event_type === "client_error").length;
  const activeCutoff = Date.now() - 3 * 60 * 1000;
  const activeUsers = new Set(events.filter((e) => (e.event_type === "heartbeat" || e.event_type === "session_start") && new Date(e.created_at).getTime() > activeCutoff).map((e) => e.user_id)).size;

  const exportCsv = () => {
    const header = ["data_hora","user_id","company_id","evento","rota","duracao_ms"];
    const rows = events.map((e) => [e.created_at,e.user_id,e.company_id,e.event_type,e.route,e.duration_ms].map(csvCell).join(","));
    const blob = new Blob(["\uFEFF" + [header.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "toldo-pro-telemetria.csv"; link.click(); URL.revokeObjectURL(url);
  };

  if (email && email !== OWNER_EMAIL) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl rounded-2xl border bg-white p-8"><ShieldCheck className="mb-3 h-8 w-8 text-red-600"/><h1 className="text-xl font-bold">Acesso restrito</h1><p className="mt-2 text-slate-600">Este painel é exclusivo do proprietário do Toldo Pro.</p><button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-white" onClick={() => navigate("/")}>Voltar ao aplicativo</button></div></main>;

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Toldo Pro · Controle privado</p><h1 className="mt-1 text-3xl font-black">Painel do proprietário</h1><p className="mt-1 text-sm text-slate-500">Acesso exclusivo: {OWNER_EMAIL}</p></div>
        <div className="flex gap-2"><button onClick={() => navigate("/")} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold"><ArrowLeft size={16}/> Aplicativo</button><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw size={16}/> Atualizar</button></div>
      </header>
      {error && <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Dados de telemetria registrados; não representa necessariamente todos os usuários cadastrados no Supabase.</p><select aria-label="Período" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="1">Últimas 24 horas</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{label:"Usuários observados",value:uniqueUsers,icon:Users},{label:"Inícios de sessão",value:sessionStarts,icon:Activity},{label:"Atividade recente*",value:activeUsers,icon:ShieldCheck},{label:"Erros registrados",value:errors,icon:Activity}].map((item) => <article key={item.label} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-sm text-slate-500"><span>{item.label}</span><item.icon size={18}/></div><p className="mt-3 text-3xl font-black">{loading ? "—" : item.value}</p></article>)}
      </section>
      <p className="my-3 text-xs text-slate-500">* Usuários com evento de sessão ou heartbeat nos últimos 3 minutos. A precisão depende da telemetria instalada e do navegador permanecer ativo.</p>
      <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-bold">Registro de atividade</h2><p className="mt-1 text-xs text-slate-500">Até 2.000 eventos recentes no período selecionado</p></div><button disabled={!events.length} onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Download size={16}/> Exportar CSV</button></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Data/hora</th><th className="p-3">Usuário (ID)</th><th className="p-3">Evento</th><th className="p-3">Rota</th><th className="p-3">Duração</th></tr></thead><tbody>{events.map((e) => <tr key={e.id} className="border-t"><td className="whitespace-nowrap p-3">{new Date(e.created_at).toLocaleString("pt-BR")}</td><td className="max-w-56 truncate p-3 font-mono text-xs" title={e.user_id}>{e.user_id}</td><td className="p-3">{e.event_type}</td><td className="p-3">{e.route || "—"}</td><td className="p-3">{e.duration_ms == null ? "—" : (e.duration_ms / 1000).toFixed(1) + " s"}</td></tr>)}{!loading && events.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum evento registrado neste período.</td></tr>}</tbody></table></div>
      </section>
      <p className="mt-5 text-xs text-slate-500">Privacidade: o painel registra identificadores de conta, horário, tipo de evento e rota acessada; não registra conteúdo digitado pelo usuário.</p>
    </div>
  </main>;
}
