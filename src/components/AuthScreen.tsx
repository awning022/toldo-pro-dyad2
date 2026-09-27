import { FormEvent, useState } from "react";
import { ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "@/styles/auth.css";

type AuthMode = "login" | "signup" | "recovery";

export function AuthScreen({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    if (!supabase) {
      setError("A conexão com o Supabase ainda não foi configurada neste ambiente.");
      setLoading(false);
      return;
    }
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        : await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
    if (result.error) setError(result.error.message);
    else setMessage(mode === "recovery" ? "Enviamos um link de recuperação para o seu e-mail." : mode === "signup" ? "Conta criada. Verifique seu e-mail para continuar." : "Acesso realizado com sucesso.");
    setLoading(false);
  };

  return <div className="auth-shell"><div className="auth-brand-panel"><div className="auth-brand-mark"><span /><span /><span /></div><p className="auth-kicker">TOLDO PRO · GESTÃO INTELIGENTE</p><h1>Uma operação mais simples para cada toldo.</h1><p className="auth-brand-copy">Centralize clientes, vendas, produção e instalações em uma única visão feita para o seu negócio.</p><div className="auth-benefits"><span><Check size={15} /> Dados por empresa</span><span><Check size={15} /> Permissões por perfil</span><span><Check size={15} /> Agente IA com modo offline</span></div><div className="auth-pattern" /></div><div className="auth-form-panel"><div className="auth-form-wrap"><div className="auth-mobile-logo"><div className="auth-brand-mark"><span /><span /><span /></div><b>toldo<span>pro</span></b></div><div className="auth-heading"><div className="auth-heading-icon"><Sparkles size={18} /></div><p className="auth-kicker">BEM-VINDO DE VOLTA</p><h2>{mode === "login" ? "Entre na sua operação" : mode === "signup" ? "Crie sua conta" : "Recupere seu acesso"}</h2><p>{mode === "login" ? "Acesse o painel da sua empresa de toldos." : mode === "signup" ? "Comece a organizar sua empresa hoje." : "Informe seu e-mail para receber as instruções."}</p></div><form onSubmit={submit} className="auth-form">{mode === "signup" && <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Rafael Silva" required /></label>}<label><span className="auth-label-icon"><Mail size={14} /> E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" required /></label>{mode !== "recovery" && <label><span className="auth-label-icon"><LockKeyhole size={14} /> Senha</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" minLength={6} required /></label>}{error && <p className="auth-error">{error}</p>}{message && <p className="auth-success">{message}</p>}<button className="auth-submit" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar no Toldo Pro" : mode === "signup" ? "Criar conta" : "Enviar link de recuperação"}<ArrowRight size={16} /></button></form><div className="auth-links">{mode === "login" && <><button onClick={() => setMode("recovery")}>Esqueci minha senha</button><span>·</span><button onClick={() => setMode("signup")}>Criar conta</button></>}{mode !== "login" && <button onClick={() => setMode("login")}>Voltar para o login</button>}</div><button className="auth-demo" onClick={onDemo}><ShieldCheck size={15} /> Explorar demonstração sem login</button></div></div></div>;
}
