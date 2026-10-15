import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AuthScreen } from "@/components/AuthScreen";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import OwnerDashboard from "@/pages/OwnerDashboard";

const OWNER_EMAIL = "awningbrasil@gmail.com";

export default function OwnerRoute() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setUser(error ? null : data.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Verificando acesso seguro...</main>;
  }

  if (!supabase || !isSupabaseConfigured || !user) return <AuthScreen />;

  if (user.email?.trim().toLowerCase() !== OWNER_EMAIL) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm">
        <ShieldCheck className="mb-3 h-9 w-9 text-red-600" />
        <h1 className="text-xl font-bold text-slate-900">Acesso restrito</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Este painel é exclusivo da conta autorizada do proprietário do Toldo Pro.</p>
        <Link className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" to="/">Voltar ao aplicativo</Link>
      </section>
    </main>;
  }

  return <OwnerDashboard />;
}
