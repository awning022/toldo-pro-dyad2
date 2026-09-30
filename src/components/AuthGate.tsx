import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthScreen } from "@/components/AuthScreen";
import { CompanyAccessProvider, type CompanyAccess } from "@/lib/CompanyAccessContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { setCurrentWorkflowActor } from "@/lib/workflowData";

type MembershipRow = {
  id: string;
  company_id: string;
  role: string;
  permissions: Record<string, boolean> | null;
  active: boolean;
};

type ProfileRow = { full_name: string | null; phone: string | null; email: string | null };
type CompanyRow = { trade_name: string };

function AccessLoading({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-5 text-center text-sm font-semibold text-[#52647d]">{children}</div>;
}

function SetPassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) setError("Não foi possível salvar a senha. Confira o link e tente novamente.");
      else onComplete();
    } catch {
      setError("Não foi possível salvar a senha. Confira sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-5"><form onSubmit={submit} className="w-full max-w-[420px] rounded-3xl border border-[#e5ebf2] bg-white p-6 shadow-sm"><h1 className="text-xl font-extrabold text-[#17324d]">Defina sua senha</h1><p className="mt-2 text-sm leading-6 text-[#718398]">Crie sua senha pessoal para acessar o painel da empresa.</p><label className="mt-5 grid gap-2 text-xs font-bold text-[#52647d]">Nova senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required className="h-11 rounded-xl border border-[#dbe3eb] px-3" /></label><label className="mt-4 grid gap-2 text-xs font-bold text-[#52647d]">Confirme a senha<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required className="h-11 rounded-xl border border-[#dbe3eb] px-3" /></label>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}<button disabled={loading} className="mt-5 h-11 w-full rounded-xl bg-[#f47b20] font-bold text-white disabled:opacity-50">{loading ? "Salvando..." : "Salvar senha e entrar"}</button></form></div>;
}

export function AuthGate({ children }: { children: (access: CompanyAccess) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<CompanyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [setupRequired, setSetupRequired] = useState(() => new URLSearchParams(window.location.search).get("setup") === "1");

  const loadAccess = useCallback(async (currentUser: User) => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    let { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("id, company_id, role, permissions, active")
      .eq("user_id", currentUser.id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<MembershipRow>();

    if (membershipError) {
      setError("Não foi possível carregar sua associação à empresa. Confira as migrações e as políticas do Supabase.");
      setLoading(false);
      return;
    }

    if (!membership) {
      const companyName = currentUser.user_metadata?.company_name;
      if (typeof companyName === "string" && companyName.trim()) {
        const { error: createError } = await supabase.rpc("create_company_for_current_user", { company_name: companyName.trim() });
        if (createError) {
          setError(createError.message);
          setLoading(false);
          return;
        }
        const result = await supabase
          .from("company_members")
          .select("id, company_id, role, permissions, active")
          .eq("user_id", currentUser.id)
          .eq("active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle<MembershipRow>();
        membership = result.data;
        membershipError = result.error;
      }
    }

    if (membershipError) {
      setError("Não foi possível confirmar as permissões da sua empresa.");
      setLoading(false);
      return;
    }
    if (!membership) {
      setAccess(null);
      setLoading(false);
      return;
    }

    const [{ data: profile, error: profileError }, { data: company, error: companyError }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, email").eq("id", currentUser.id).maybeSingle<ProfileRow>(),
      supabase.from("companies").select("trade_name").eq("id", membership.company_id).maybeSingle<CompanyRow>(),
    ]);
    if (profileError || companyError || !company) {
      setError("Não foi possível carregar o perfil ou os dados da empresa.");
      setLoading(false);
      return;
    }

    const permissions = membership.permissions || {};
    const role = membership.role as CompanyAccess["role"];
    const companyAccess: CompanyAccess = {
      user: currentUser,
      companyId: membership.company_id,
      companyName: company.trade_name,
      membershipId: membership.id,
      role,
      fullName: profile?.full_name || currentUser.user_metadata?.full_name || currentUser.email || "",
      phone: profile?.phone || "",
      email: profile?.email || currentUser.email || "",
      permissions,
      can: (permission) => {
        if (typeof permissions[permission] === "boolean") return permissions[permission];
        if (role === "Administrador") return true;
        const defaults: Record<string, string[]> = {
          Vendas: ["manageCustomers", "manageQuotes", "approveQuote", "convertClient", "issueOS", "viewFinancial", "manageAgenda", "accessAssistant", "readNotifications"],
          "Produção": ["manageProduction", "manageStock", "requestMaterials", "manageInstallations", "accessAssistant", "readNotifications"],
          Instalador: ["requestMaterials", "manageInstallations", "accessAssistant", "readNotifications"],
          Financeiro: ["viewFinancial", "manageFinance", "accessAssistant", "readNotifications"],
        };
        return (defaults[role] || []).includes(permission);
      },
      reloadMemberships: async () => loadAccess(currentUser),
    };
    setCurrentWorkflowActor(role, companyAccess.fullName, permissions);
    setAccess(companyAccess);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setSessionReady(true);
      return;
    }
    let active = true;
    const initialize = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) setError("Não foi possível restaurar sua sessão. Entre novamente.");
      const currentUser = data.session?.user || null;
      setUser(currentUser);
      if (currentUser) await loadAccess(currentUser);
      setSessionReady(true);
    };
    void initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (!currentUser) {
        setAccess(null);
        setLoading(false);
        setError("");
      } else {
        window.setTimeout(() => { if (active) void loadAccess(currentUser); }, 0);
      }
      setSessionReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAccess]);

  if (!sessionReady || (user && loading)) return <AccessLoading>Carregando sua sessão e permissões...</AccessLoading>;
  if (setupRequired && user) {
    return <SetPassword onComplete={() => {
      window.history.replaceState({}, "", window.location.pathname);
      setSetupRequired(false);
      void loadAccess(user);
    }} />;
  }
  if (!user) return <AuthScreen />;
  if (error) return <AccessLoading><div><p role="alert">{error}</p><button onClick={() => void loadAccess(user)} className="mt-4 rounded-xl bg-[#17324d] px-4 py-2 text-white">Tentar novamente</button></div></AccessLoading>;
  if (!access) {
    return <AccessLoading><div><p>Esta conta ainda não está vinculada a uma empresa.</p><p className="mt-2 text-xs font-normal">Peça ao administrador da empresa para enviar um convite para este e-mail.</p><button onClick={() => void supabase?.auth.signOut()} className="mt-4 rounded-xl bg-[#17324d] px-4 py-2 text-white">Sair</button></div></AccessLoading>;
  }

  return <CompanyAccessProvider value={access}>{children(access)}</CompanyAccessProvider>;
}
