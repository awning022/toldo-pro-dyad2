import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CreditCard, ShieldCheck, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CompanyAccess } from "@/lib/CompanyAccessContext";

type Subscription = {
  status: string;
  trial_ends_at: string | null;
  checkout_url: string | null;
  plan_amount: number;
};

function readableFunctionError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string; context?: unknown };
    const context = e.context;
    if (context instanceof Response) {
      // The response body is read by the SDK in many cases; clone it before parsing.
      void context.clone().json().catch(() => null);
    }
    if (context && typeof context === "object" && "json" in context && typeof (context as { json?: unknown }).json === "function") {
      return e.message || "O servidor recusou a criação do checkout. Atualize o status e tente novamente.";
    }
    return e.message || "Não foi possível iniciar o checkout. Tente novamente.";
  }
  return "Não foi possível iniciar o checkout. Tente novamente.";
}

export function BillingGate({ access, children }: { access: CompanyAccess; children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError("Supabase não está configurado."); return; }
    setError("");
    const { data, error: queryError } = await supabase
      .from("company_subscriptions")
      .select("status, trial_ends_at, checkout_url, plan_amount")
      .eq("company_id", access.companyId)
      .maybeSingle<Subscription>();
    if (queryError) setError("Não foi possível consultar o status da assinatura. Atualize a página ou tente novamente.");
    else setSubscription(data);
    setLoading(false);
  }, [access.companyId]);

  const isBillingTestUser = access.email.trim().toLowerCase() === "cursotoldo@gmail.com";

  useEffect(() => {
    if (!isBillingTestUser) { setLoading(false); return; }
    void load();
    const timer = window.setInterval(() => { void load(); }, 15000);
    return () => window.clearInterval(timer);
  }, [isBillingTestUser, load]);

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

  // Temporary rollout: only the explicitly selected test account sees the subscription gate.
  // All other accounts, including the owner, continue into the app without billing enforcement.
  if (!isBillingTestUser) return <>{children}</>;
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-6 text-sm font-semibold text-[#52647d]">Verificando sua assinatura...</div>;

  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const isAllowed = !!subscription && ["trialing", "authorized", "active"].includes(subscription.status)
    && (subscription.status !== "trialing" || (!!trialEnd && trialEnd.getTime() > Date.now()));
  if (isAllowed) return <>{children}</>;

  const isAdmin = access.role === "Administrador";
  return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-10">
    <main className="w-full max-w-[520px] rounded-[28px] border border-[#e4eaf1] bg-white p-7 shadow-[0_20px_60px_rgba(23,43,77,0.10)] sm:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1e7] text-[#e66f17]"><CreditCard size={23} /></div>
      <div className="mt-1 flex items-center gap-3 rounded-2xl border border-[#dceaf8] bg-[#f5faff] px-4 py-3">
        <img
          src="https://cdn.simpleicons.org/mercadopago/009EE3"
          alt="Logo do Mercado Pago"
          className="h-8 w-8 shrink-0"
          loading="eager"
        />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-[#17324d]">Parceiro de cobrança: Mercado Pago</p>
          <p className="mt-0.5 text-xs text-[#718398]">Pagamento e cadastro do cartão em ambiente seguro do Mercado Pago.</p>
        </div>
      </div>
      <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#e66f17]">Toldo Pro · Assinatura</p>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[#17324d]">Comece seus 7 dias grátis</h1>
      <p className="mt-3 text-sm leading-6 text-[#718398]">Cadastre seu cartão no ambiente seguro do Mercado Pago. Você não será cobrado durante o teste; depois, a assinatura passa a custar R$ 199,99 por mês, até cancelar.</p>
      <div className="mt-5 space-y-3 rounded-2xl bg-[#f7f9fc] p-4 text-xs leading-5 text-[#52647d]">
        <p className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#14835b]" /> O cartão é cadastrado no Mercado Pago; o Toldo Pro não armazena os dados do cartão.</p>
        <p>• O teste só começa depois que o Mercado Pago confirmar a autorização da assinatura.</p>
        <p>• Ao fim dos 7 dias, a cobrança recorrente de R$ 199,99/mês começa automaticamente, conforme os termos do Mercado Pago.</p>
        {subscription?.status && <p>• Situação atual: <strong>{subscription.status}</strong>.</p>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {isAdmin ? <button onClick={() => subscription?.checkout_url && subscription.status === "pending" ? window.location.assign(subscription.checkout_url) : void startCheckout()} disabled={starting} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f47b20] px-4 text-sm font-bold text-white transition hover:bg-[#db6812] disabled:opacity-60">
        <CreditCard size={17} /> {starting ? "Preparando checkout..." : subscription?.checkout_url && subscription.status === "pending" ? "Continuar cadastro do cartão" : "Cadastrar cartão e iniciar teste grátis"}
      </button> : <p className="mt-6 rounded-xl bg-[#f7f9fc] p-3 text-xs text-[#52647d]">Peça ao administrador da empresa para ativar a assinatura.</p>}
      <button onClick={() => void load()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e1e7ef] text-xs font-bold text-[#52647d]"><RefreshCw size={14} /> Atualizar status</button>
      <button onClick={() => void supabase?.auth.signOut()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-[#718398]"><LogOut size={14} /> Sair da conta</button>
      <p className="mt-5 text-center text-[10px] leading-4 text-[#9aa6b6]">Ao continuar, você concorda com a assinatura recorrente e a cobrança após o período gratuito. O cancelamento deverá ser solicitado antes da próxima cobrança.</p>
    </main>
  </div>;
}