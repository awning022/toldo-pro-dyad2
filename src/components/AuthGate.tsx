import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthScreen } from "@/components/AuthScreen";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function AuthGate({ children }: { children: (user: User | null, demo: boolean) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [demo, setDemo] = useState(!isSupabaseConfigured);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-sm font-semibold text-[#52647d]">Carregando seu acesso...</div>;
  if (!user && !demo) return <AuthScreen onDemo={() => setDemo(true)} />;
  return <>{children(user, demo)}</>;
}
