import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appUrl = (Deno.env.get("APP_URL") ?? "https://toldo-pro-dyad2.vercel.app").replace(/\/$/, "");
const corsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = origin === appUrl || origin === "https://toldo-pro-dyad2.vercel.app" || /^https:\/\/toldo-pro-dyad2(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin);
  return { ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}), "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json" };
};
const reply = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
const providerError = (p: any) => {
  const parts: string[] = [];
  if (typeof p?.message === "string") parts.push(p.message);
  if (typeof p?.error === "string") parts.push(p.error);
  if (Array.isArray(p?.cause)) for (const c of p.cause.slice(0, 3)) parts.push(String(c?.description ?? c?.code ?? ""));
  return parts.filter(Boolean).join(" — ").slice(0, 600) || "Resposta sem detalhes do Mercado Pago.";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "Método não permitido." });
  const supabaseUrl = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), mpToken = Deno.env.get("MP_ACCESS_TOKEN");
  if (!supabaseUrl || !anonKey || !serviceKey || !mpToken) return reply(req, 500, { error: "Configuração de cobrança incompleta no servidor." });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply(req, 401, { error: "Faça login para continuar." });
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData.user;
  if (authError || !user) return reply(req, 401, { error: "Sessão inválida. Entre novamente." });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership, error: memberError } = await admin.from("company_members").select("company_id, role, active").eq("user_id", user.id).eq("active", true).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (memberError || !membership?.company_id) return reply(req, 403, { error: "Não encontrei uma empresa vinculada a esta conta. Conclua o cadastro da empresa primeiro." });
  if (membership.role !== "Administrador") return reply(req, 403, { error: "Somente o administrador da empresa pode contratar o plano." });
  const { data: existing } = await admin.from("company_subscriptions").select("*").eq("company_id", membership.company_id).maybeSingle();
  const trialStillActive = existing?.status === "trialing" && !!existing.trial_ends_at && new Date(existing.trial_ends_at).getTime() > Date.now();
  if (existing && (["authorized", "active"].includes(existing.status) || trialStillActive)) return reply(req, 409, { error: "Esta empresa já possui acesso liberado." });
  if (existing?.checkout_url && existing.status === "pending") return reply(req, 200, { checkout_url: existing.checkout_url, reused: true });

  const { data: company } = await admin.from("companies").select("trade_name, name").eq("id", membership.company_id).maybeSingle();
  const reason = `Toldo Pro - ${company?.trade_name || company?.name || "Plano empresarial"}`;
  // Each company gets its own plan so the provider notification can be mapped back safely.
  const planResponse = await fetch("https://api.mercadopago.com/preapproval_plan", {
    method: "POST", headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason,
      external_reference: membership.company_id,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 199.99, currency_id: "BRL" },
      back_url: `${appUrl}/?billing=return`,
    }),
  });
  const plan = await planResponse.json().catch(() => ({}));
  if (!planResponse.ok || !plan.id || !plan.init_point) {
    console.error("Mercado Pago plan creation failure", JSON.stringify({ http_status: planResponse.status, provider_error: providerError(plan) }));
    return reply(req, 502, { error: "O Mercado Pago não conseguiu preparar a página segura de assinatura.", details: providerError(plan), provider_status: planResponse.status });
  }
  const row = {
    company_id: membership.company_id, owner_user_id: user.id, provider: "mercadopago",
    provider_subscription_id: null, external_reference: membership.company_id, status: "pending",
    plan_amount: 199.99, currency: "BRL", checkout_url: plan.init_point,
    provider_payload: { plan_id: String(plan.id), plan_status: plan.status ?? null }, updated_at: new Date().toISOString(),
  };
  const { error: saveError } = await admin.from("company_subscriptions").upsert(row, { onConflict: "company_id" });
  if (saveError) {
    console.error("Could not save pending checkout", saveError.message);
    return reply(req, 500, { error: "O checkout foi preparado, mas não foi possível salvar a assinatura pendente. Tente novamente." });
  }
  return reply(req, 200, { checkout_url: plan.init_point });
});