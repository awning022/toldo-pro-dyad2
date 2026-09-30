import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = new Set(["Vendas", "Produção", "Instalador", "Financeiro"]);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const authorization = request.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL");
  if (!url || !anonKey || !serviceRoleKey || !appUrl) return json(500, { error: "Supabase function secrets are not configured" });
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Invalid session" });

  const { data: permitted, error: permissionError } = await caller.rpc("has_company_permission", { permission_key: "editRules" });
  if (permissionError) return json(500, { error: "Unable to verify company permissions" });
  if (!permitted) return json(403, { error: "Only company administrators can invite employees" });

  const { data: membership, error: membershipError } = await caller
    .from("company_members")
    .select("company_id")
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (membershipError) return json(500, { error: "Unable to load company membership" });
  if (!membership) return json(403, { error: "Active company membership required" });

  let body: { email?: string; fullName?: string; phone?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim();
  const phone = body.phone?.trim();
  const role = body.role;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName || fullName.length > 120 || !phone || phone.length > 40 || !role || !allowedRoles.has(role)) {
    return json(400, { error: "A valid email, full name, phone, and employee role are required" });
  }

  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let redirectTo: string;
  try {
    const redirectUrl = new URL("/auth/confirm", appUrl);
    if (!["http:", "https:"].includes(redirectUrl.protocol) || redirectUrl.username || redirectUrl.password) {
      return json(500, { error: "APP_URL must be a valid HTTP(S) application URL" });
    }
    redirectUrl.searchParams.set("setup", "1");
    redirectTo = redirectUrl.toString();
  } catch {
    return json(500, { error: "APP_URL must be a valid HTTP(S) application URL" });
  }
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName, phone, company_id: membership.company_id },
  });
  if (inviteError) return json(409, { error: inviteError.message });

  const userId = inviteData.user?.id;
  if (!userId) return json(502, { error: "Supabase did not return the invited user" });
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    email,
    phone,
  });
  if (profileError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
    if (cleanupError) console.error("Unable to clean up invited account after profile failure", cleanupError.message);
    return json(500, { error: cleanupError
      ? "Invitation setup failed and the invited account could not be cleaned up; contact support"
      : "Invitation setup failed; the incomplete invited account was removed" });
  }

  const { error: membershipInsertError } = await admin.from("company_members").insert({
    company_id: membership.company_id,
    user_id: userId,
    role,
    permissions: {},
    active: true,
  });
  if (membershipInsertError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
    if (cleanupError) console.error("Unable to clean up invited account after membership failure", cleanupError.message);
    return json(500, { error: cleanupError
      ? "Invitation setup failed and the invited account could not be cleaned up; contact support"
      : "Invitation setup failed; the incomplete invited account was removed" });
  }

  return json(200, { invited: true, email });
});
