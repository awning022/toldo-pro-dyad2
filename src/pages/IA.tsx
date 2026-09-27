import { useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { AgentMobile } from "@/components/AgentMobile";
import type { ModuleKey } from "@/components/ModuleViews";
import { supabase } from "@/lib/supabase";

type IAProps = { user: User | null; demo: boolean };

export default function IA({ user, demo }: IAProps) {
  const navigate = useNavigate();
  const userName = useMemo(() => user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Rafael", [user]);
  const leaveIA = (module: ModuleKey) => { if (module === "agente") navigate("/ia"); else window.location.assign("/"); };
  const signOut = async () => { if (supabase && !demo) await supabase.auth.signOut(); else window.location.reload(); };

  return <AgentMobile userName={userName} demo={demo} onNavigate={leaveIA} onSignOut={signOut} />;
}
