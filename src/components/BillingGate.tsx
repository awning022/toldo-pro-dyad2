import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck, RefreshCw, LogOut, Sparkles, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CompanyAccess } from "@/lib/CompanyAccessContext";

type SubscriptionState = {
  is_exempt?: boolean;
  status?: string;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  checkout_url?: string | null;
  plan_amount?: number;
  last_payment_status?: string | null;
};

function readableFunctionError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string };
    return e.message || "Não foi possível iniciar a assinatura. Tente novamente.";
  }
  return "Não foi possível iniciar a assinatura. Tente novamente.";
}

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BillingGate({ access, children }: { access: CompanyAccess; children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError("O serviço de assinatura não está configurado.");
      return;
    }
    setError("");
    const { data, error: queryError } = await supabase.rpc("ensure_company_trial");
    if (queryError) {
      setError("Não foi possível verificar o período de acesso. Atualize a página ou tente novamente.");
      setLoading(false);
      return;
    }
    setSubscription((data ?? null) as SubscriptionState | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startCheckout = async () => {
    if (!supabase) return;
    setStarting(true);
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke("create-subscription-checkout", { body: {} });
    if (invokeError || !data?.checkout_url) {
      const serverMessage = data?.error;
      const details = data?.details;
      setError([serverMessage, details].filter((part) => typeof part === "string" && part.trim()).join(" — ") || readableFunctionError(invokeError));
      setStarting(false);
      return;
    }
    window.location.assign(data.checkout_url);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-6 text-sm font-semibold text-[#52647d]">Preparando seu acesso ao Toldo Pro...</div>;
  if (error && !subscription) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-6"><div className="w-full max-w-md rounded-2xl border border-[#e4eaf1] bg-white p-6 text-center"><p className="text-sm text-[#52647d]">{error}</p><button onClick={() => { setLoading(true); void load(); }} className="mt-4 rounded-xl bg-[#17324d] px-4 py-2 text-sm font-bold text-white">Tentar novamente</button></div></div>;

  // Existing accounts are grandfathered: no billing screen and no trial timer.
  if (subscription?.is_exempt) return <>{children}</>;

  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialActive = subscription?.status === "trialing" && !!trialEnd && trialEnd.getTime() > Date.now();
  const paidOrAuthorized = ["authorized", "active"].includes(subscription?.status ?? "");
  if (trialActive || paidOrAuthorized) return <>{children}</>;

  const isAdmin = access.role === "Administrador";
  const isPending = subscription?.status === "pending" && !!subscription.checkout_url;
  const regularPrice = 599.99;
  const specialPrice = 199.99;

  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f6fa] px-4 py-10">
    <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#dbeafe] opacity-70 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#ffedd5] opacity-70 blur-3xl" />
    <main className="relative w-full max-w-[680px] overflow-hidden rounded-[30px] border border-[#e2e8f0] bg-white shadow-[0_28px_90px_rgba(23,43,77,0.13)]">
      <div className="bg-gradient-to-r from-[#102d49] via-[#173e60] to-[#1d5570] px-7 py-8 text-white sm:px-10 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#d9efff]"><Sparkles size={13} /> Desconto vitalício selecionado</div>
          <div className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:flex"><Building2 size={21} /></div>
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#b9d8ee]">Toldo Pro · Plano empresarial</p>
        <h1 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-[38px]">Sua empresa foi selecionada para uma oferta exclusiva.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#d7e6f1]">Seu período de 7 dias grátis terminou. Continue usando toda a estrutura do Toldo Pro com uma condição especial de assinatura.</p>
      </div>

      <div className="px-7 py-8 sm:px-10 sm:py-9">
        <div className="rounded-[24px] border border-[#e7edf4] bg-[#f8fafc] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#52647d]">Oferta de seleção</span>
            <span className="rounded-full bg-[#e7f5ef] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#14764f]">Desconto vitalício</span>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <p className="text-sm font-semibold text-[#8a98a9]">De <span className="line-through">{money(regularPrice)}</span></p>
              <p className="mt-1 text-4xl font-black tracking-tight text-[#153653] sm:text-5xl">{money(specialPrice)}<span className="ml-1 text-sm font-bold text-[#66788c]">/mês</span></p>
            </div>
            <span className="mb-1 rounded-xl bg-[#fff1e6] px-3 py-2 text-xs font-extrabold text-[#c65d12]">Economize {money(regularPrice - specialPrice)} por mês</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#718398]">Desconto vitalício especial concedido às empresas selecionadas. O valor de R$ 199,99 por mês é mantido enquanto a assinatura permanecer ativa. A cobrança começa somente após a contratação e confirmação pelo Mercado Pago.</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-[#e8edf3] p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-[#16845b]" size={18} /><div><p className="text-sm font-extrabold text-[#193650]">Gestão completa</p><p className="mt-1 text-xs leading-5 text-[#718398]">CRM, vendas, orçamentos, financeiro, estoque e produção.</p></div></div>
          <div className="flex gap-3 rounded-2xl border border-[#e8edf3] p-4"><Sparkles className="mt-0.5 shrink-0 text-[#d97706]" size={18} /><div><p className="text-sm font-extrabold text-[#193650]">IA Toldo Pro</p><p className="mt-1 text-xs leading-5 text-[#718398]">Assistência inteligente para apoiar a administração da empresa.</p></div></div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f1f7fc] p-4 text-xs leading-5 text-[#52647d]">
          <ShieldCheck className="mt-0.5 shrink-0 text-[#1c719d]" size={18} />
          <p>Pagamento processado com segurança pelo Mercado Pago. O Toldo Pro não armazena os dados do seu cartão. A assinatura é mensal e pode ser cancelada conforme as condições do serviço.</p>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        {isAdmin ? <button onClick={() => isPending ? window.location.assign(subscription!.checkout_url!) : void startCheckout()} disabled={starting} className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f47b20] px-5 py-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(244,123,32,0.24)] transition hover:bg-[#dc6a13] disabled:cursor-wait disabled:opacity-60">
          <CreditCard size={18} /> {starting ? "Preparando sua assinatura..." : isPending ? "Continuar contratação" : "Quero continuar com a oferta"} <ArrowRight size={17} />
        </button> : <p className="mt-7 rounded-2xl bg-[#f7f9fc] p-4 text-center text-xs leading-5 text-[#52647d]">Peça ao administrador da empresa para concluir a assinatura e reativar o acesso.</p>}
        <button onClick={() => { setLoading(true); void load(); }} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-[#718398] hover:bg-[#f7f9fc]"><RefreshCw size={14} /> Atualizar status da assinatura</button>
        <button onClick={() => void supabase?.auth.signOut()} className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-[#9aa6b6]"><LogOut size={14} /> Sair da conta</button>
        <p className="mt-4 text-center text-[10px] leading-4 text-[#9aa6b6]">Ao contratar, você autoriza a cobrança recorrente de {money(specialPrice)} por mês pelo Mercado Pago. Revise os termos exibidos antes de confirmar o pagamento.</p>
      </div>
    </main>
  </div>;
}
