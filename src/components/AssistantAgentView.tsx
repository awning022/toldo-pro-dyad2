import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, ChevronDown, Clock3, FileText, LoaderCircle, MessageSquarePlus, Send, ShieldCheck, Sparkles, UserRound, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { toast } from "sonner";

type Conversation = { id: string; title: string; updated_at: string; created_at: string };
type AgentAction = { type: string; data: Record<string, unknown>; executed?: boolean; result?: Record<string, unknown> };
type ChatMessage = { id: string; role: "user" | "assistant" | "system"; content: string; action: AgentAction | null; created_at: string };

const examples = [
  { title: "Resumo da empresa", prompt: "Faça um resumo dos indicadores atuais da minha empresa: orçamentos, clientes, produção, instalações e estoque. Só use dados reais cadastrados." },
  { title: "Criar orçamento", prompt: "Quero fazer um orçamento de uma cobertura de 5 por 2 metros em policarbonato com estrutura de alumínio. Confira os modelos e preços que já cadastrei e me diga o que falta para calcular sem inventar valores." },
  { title: "Materiais críticos", prompt: "Quais materiais estão abaixo do estoque mínimo e quais são as quantidades cadastradas?" },
  { title: "Registrar cliente", prompt: "Quero cadastrar um novo cliente. Me pergunte os dados que estiverem faltando." },
];

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function actionLabel(action: AgentAction) {
  const labels: Record<string, string> = {
    create_quote: "Criar orçamento como rascunho",
    create_customer: "Cadastrar cliente",
    create_lead: "Cadastrar oportunidade",
    create_finance: "Lançar movimento financeiro",
  };
  return labels[action.type] || "Confirmar ação";
}

function ActionPreview({ action, busy, onConfirm }: { action: AgentAction; busy: boolean; onConfirm: () => void }) {
  const data = action.data || {};
  const fields = Object.entries(data).filter(([key, value]) => value !== undefined && value !== null && value !== "" && !["modelId"].includes(key));
  return <div className="mt-3 rounded-2xl border border-[#f3c49f] bg-[#fff9f4] p-4">
    <div className="flex items-center gap-2 text-[#b95412]"><ShieldCheck size={16} /><p className="text-[12px] font-extrabold">Ação aguardando sua confirmação</p></div>
    <p className="mt-1 text-[11px] text-[#8b6b54]">A IA só grava alterações depois que você confirmar. Confira os dados antes de prosseguir.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{fields.slice(0, 10).map(([key, value]) => <div key={key} className="rounded-xl bg-white/80 p-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-[#a58a77]">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 break-words text-[11px] font-semibold text-[#513c2e]">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p></div>)}</div>
    <Button onClick={onConfirm} disabled={busy} className="mt-4 h-10 w-full rounded-xl bg-[#f47b20] text-[11px] font-bold text-white hover:bg-[#d96512]"><Check size={15} /> {busy ? "Executando com segurança..." : actionLabel(action)}</Button>
  </div>;
}

export function AssistantAgentView() {
  const access = useCompanyAccess();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const canUse = access.can("accessAssistant");

  const loadConversations = useCallback(async () => {
    if (!supabase || !canUse) { setLoadingHistory(false); return; }
    const { data, error } = await supabase.from("assistant_conversations")
      .select("id,title,updated_at,created_at").eq("company_id", access.companyId)
      .order("updated_at", { ascending: false }).limit(40);
    if (error) {
      toast.error("Não foi possível carregar o histórico da IA. Confira se a migração do agente foi aplicada.");
      setLoadingHistory(false);
      return;
    }
    const list = (data || []) as Conversation[];
    setConversations(list);
    setLoadingHistory(false);
    if (!activeConversation && list.length) setActiveConversation(list[0].id);
  }, [access.companyId, activeConversation, canUse]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("assistant_messages")
      .select("id,role,content,action,created_at").eq("company_id", access.companyId)
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
    if (error) { toast.error("Não foi possível abrir essa conversa."); return; }
    setMessages((data || []) as ChatMessage[]);
  }, [access.companyId]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => {
    if (activeConversation) void loadMessages(activeConversation);
    else setMessages([]);
  }, [activeConversation, loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  const sendMessage = async (value = draft) => {
    const text = value.trim();
    if (!text || loading || !supabase) return;
    setLoading(true);
    setDraft("");
    try {
      const { data, error } = await supabase.functions.invoke("assistente-ia", {
        body: { companyId: access.companyId, conversationId: activeConversation, message: text },
      });
      if (error) throw new Error(data?.error || error.message || "Não foi possível falar com a IA.");
      if (data?.error) throw new Error(data.error);
      if (data?.conversationId) setActiveConversation(data.conversationId);
      if (data?.conversationId) await loadMessages(data.conversationId);
      await loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao conversar com a IA.");
      setDraft(text);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async (action: AgentAction) => {
    if (!supabase || !activeConversation || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistente-ia", {
        body: { companyId: access.companyId, conversationId: activeConversation, confirmAction: { type: action.type, data: action.data } },
      });
      if (error) throw new Error(data?.error || error.message || "Não foi possível executar a ação.");
      if (data?.error) throw new Error(data.error);
      toast.success("Ação registrada no sistema.");
      await loadMessages(activeConversation);
      await loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível executar a ação.");
    } finally {
      setLoading(false);
    }
  };

  const activeTitle = useMemo(() => conversations.find((item) => item.id === activeConversation)?.title || "Nova conversa", [conversations, activeConversation]);

  if (!canUse) return <div className="rounded-3xl border border-[#e5ebf2] bg-white p-8 text-center"><ShieldCheck size={28} className="mx-auto text-[#c35c42]" /><h2 className="mt-3 text-lg font-extrabold text-[#17324d]">Acesso não autorizado</h2><p className="mt-2 text-sm text-[#718398]">O administrador da empresa precisa habilitar a permissão de uso da IA para o seu perfil.</p></div>;

  return <div className="grid min-h-[min(760px,calc(100vh-190px))] grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="flex flex-col rounded-[24px] border border-[#e5ebf2] bg-white p-3 shadow-sm">
      <div className="rounded-2xl bg-[#172b4d] p-4 text-white"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f47b20]"><Sparkles size={18} /></span><div><p className="text-sm font-extrabold">IA Toldo Pro</p><p className="mt-0.5 text-[10px] text-[#b6c8dc]">Agente da sua empresa</p></div></div><p className="mt-3 text-[11px] leading-5 text-[#d2ddeb]">Consulta dados, prepara operações e ajuda a gerir o negócio com base nos seus registros.</p></div>
      <Button onClick={() => { setActiveConversation(null); setMessages([]); setDraft(""); }} className="mt-3 h-10 rounded-xl bg-[#f47b20] text-[11px] font-bold text-white"><MessageSquarePlus size={15} /> Nova conversa</Button>
      <div className="mt-4 flex items-center justify-between px-2"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8d9aaa]">Histórico</p><Clock3 size={14} className="text-[#9aa6b6]" /></div>
      <div className="mt-2 max-h-[280px] flex-1 space-y-1 overflow-y-auto xl:max-h-none">
        {loadingHistory ? <p className="p-3 text-[11px] text-[#9aa6b6]">Carregando conversas...</p> : conversations.length ? conversations.map((conversation) => <button key={conversation.id} onClick={() => setActiveConversation(conversation.id)} className={`w-full rounded-xl p-3 text-left transition ${activeConversation === conversation.id ? "bg-[#fff1e7] text-[#a74c0b]" : "text-[#52647d] hover:bg-[#f5f7fa]"}`}><p className="truncate text-[11px] font-bold">{conversation.title || "Conversa"}</p><p className="mt-1 text-[9px] opacity-70">{formatTime(conversation.updated_at)}</p></button>) : <p className="p-3 text-[11px] leading-5 text-[#9aa6b6]">Suas conversas e decisões ficarão guardadas aqui.</p>}
      </div>
      <div className="mt-3 rounded-xl bg-[#f5f8fb] p-3"><div className="flex items-center gap-2 text-[#14835b]"><ShieldCheck size={15} /><span className="text-[10px] font-extrabold">Ambiente isolado</span></div><p className="mt-1 text-[10px] leading-4 text-[#8291a3]">O agente recebe apenas os dados permitidos da empresa autenticada.</p></div>
    </aside>

    <section className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#e5ebf2] bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-[#edf1f5] px-4 py-4 sm:px-6"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2859a6]"><Bot size={20} /></span><div className="min-w-0 flex-1"><h1 className="truncate font-display text-[17px] font-extrabold text-[#17324d]">{activeTitle}</h1><p className="mt-1 text-[10px] text-[#8d9aaa]">{access.companyName} · Gemini · agente operacional</p></div><span className="hidden items-center gap-1.5 rounded-full bg-[#eaf8f2] px-3 py-1.5 text-[9px] font-extrabold text-[#14835b] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#1da675]" /> Sessão protegida</span></header>

      <div className="flex-1 space-y-5 overflow-y-auto bg-[#fbfcfe] p-4 sm:p-6">
        {!messages.length && <div className="mx-auto max-w-[650px] py-7"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#172b4d] text-white shadow-lg"><WandSparkles size={25} /></div><h2 className="mt-5 text-center font-display text-[24px] font-extrabold tracking-tight text-[#17324d]">Como posso ajudar sua empresa?</h2><p className="mx-auto mt-2 max-w-md text-center text-[12px] leading-6 text-[#7f8fa3]">Pergunte sobre seus dados reais, peça análises ou prepare lançamentos. Antes de gravar qualquer alteração, você verá uma confirmação.</p><div className="mt-6 grid gap-2 sm:grid-cols-2">{examples.map((example) => <button key={example.title} onClick={() => void sendMessage(example.prompt)} disabled={loading} className="rounded-2xl border border-[#e5ebf2] bg-white p-4 text-left transition hover:border-[#f4b17e] hover:shadow-sm disabled:opacity-50"><p className="text-[11px] font-extrabold text-[#344861]">{example.title}</p><p className="mt-1.5 text-[10px] leading-5 text-[#8d9aaa]">{example.prompt}</p></button>)}</div></div>}
        {messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${message.role === "user" ? "bg-[#f3dfd0] text-[#8b4c2a]" : "bg-[#172b4d] text-white"}`}>{message.role === "user" ? <UserRound size={15} /> : <Bot size={16} />}</span><div className={`min-w-0 max-w-[min(780px,90%)] rounded-2xl p-4 ${message.role === "user" ? "bg-[#172b4d] text-white" : "border border-[#e8edf3] bg-white text-[#344861] shadow-sm"}`}><p className="whitespace-pre-wrap break-words text-[12px] leading-6">{message.content}</p>{message.action && !message.action.executed && <ActionPreview action={message.action} busy={loading} onConfirm={() => void confirmAction(message.action!)} />}{message.action?.executed && <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#eaf8f2] p-3 text-[10px] font-bold text-[#14835b]"><Check size={14} /> Ação executada e registrada</div>}<p className={`mt-2 text-[9px] ${message.role === "user" ? "text-[#b6c8dc]" : "text-[#a1adba"}`}>{formatTime(message.created_at)}</p></div></div>)}
        {loading && <div className="flex gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#172b4d] text-white"><Bot size={16} /></span><div className="flex items-center gap-2 rounded-2xl border border-[#e8edf3] bg-white px-4 py-3 text-[11px] text-[#8291a3]"><LoaderCircle size={15} className="animate-spin" /> Analisando os dados autorizados da sua empresa...</div></div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="border-t border-[#edf1f5] bg-white p-3 sm:p-4"><div className="mx-auto flex max-w-[1000px] items-end gap-2 rounded-2xl border border-[#dfe7f0] bg-[#fbfcfe] p-2 focus-within:border-[#f4b17e] focus-within:ring-2 focus-within:ring-[#f47b20]/10"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Pergunte sobre a empresa ou peça para preparar uma operação..." rows={2} className="max-h-36 min-h-[50px] resize-y border-0 bg-transparent text-[12px] shadow-none focus-visible:ring-0" disabled={loading} /><Button type="submit" disabled={loading || !draft.trim()} className="h-10 w-10 shrink-0 rounded-xl bg-[#f47b20] p-0 text-white hover:bg-[#d96512]" aria-label="Enviar mensagem">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}</Button></div><p className="mx-auto mt-2 max-w-[1000px] text-[9px] text-[#a1adba]">A IA usa registros da empresa e pode errar. Confira medidas, custos e condições técnicas antes de enviar propostas ao cliente.</p></form>
    </section>
  </div>;
}
