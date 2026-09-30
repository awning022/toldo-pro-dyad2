import { useNavigate } from "react-router-dom";
import { AgentMobile } from "@/components/AgentMobile";
import type { ModuleKey } from "@/components/ModuleViews";
import { supabase } from "@/lib/supabase";
import type { CompanyAccess } from "@/lib/CompanyAccessContext";

type IAProps = { access: CompanyAccess };

export default function IA({ access }: IAProps) {
  const navigate = useNavigate();
  const leaveIA = (module: ModuleKey) => { if (module === "agente") navigate("/ia"); else window.location.assign("/"); };
  const signOut = async () => { await supabase?.auth.signOut(); };

  return <AgentMobile access={access} onNavigate={leaveIA} onSignOut={signOut} />;
}
