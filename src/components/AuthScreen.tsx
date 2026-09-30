import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import "@/styles/auth.css";

type AuthMode = "login" | "signup";

function callbackUrl(flow: string, next: string) {
  const url = new URL("/auth/confirm", window.location.origin);
  url.searchParams.set("flow", flow);
  url.searchParams.set("next", next);
  return url.toString();
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    if (!supabase || !isSupabaseConfigured) {
      setError("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY neste ambiente antes de acessar o Toldo Pro.");
      setLoading(false);
      return;
    }
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: name.trim(), phone: phone.trim(), company_name: companyName.trim() },
            emailRedirectTo: callbackUrl("signup", "/"),
          },
        });
      if (result.error) setError(result.error.message);
      else setMessage(mode === "signup"
        ? result.data.session ? "Cadastro concluído. Você já pode acessar o painel da empresa." : "Conta criada. Verifique seu e-mail para ativar a empresa e continuar."
        : "Acesso realizado com sucesso.");
    } catch {
      setError("Não foi possível concluir a solicitação. Confira sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="auth-shell"><div className="auth-brand-panel"><div className="auth-brand-mark"><span /><span /><span /></div><p className="auth-kicker">TOLDO PRO · GESTÃO INTELIGENTE</p><h1>Uma operação mais simples para cada toldo.</h1><p className="auth-brand-copy">Centralize clientes, vendas, produção e instalações em uma única visão feita para o seu negócio.</p><div className="auth-benefits"><span><Check size={15} /> Dados isolados por empresa</span><span><Check size={15} /> Acesso por cargo e permissão</span><span><Check size={15} /> Sessão protegida pelo Supabase</span></div><div className="auth-pattern" /></div><div className="auth-form-panel"><div className="auth-form-wrap"><div className="auth-mobile-logo"><div className="auth-brand-mark"><span /><span /><span /></div><b>toldo<span>pro</span></b></div><div className="auth-heading"><div className="auth-heading-icon"><Sparkles size={18} /></div><p className="auth-kicker">ACESSO SEGURO</p><h2>{mode === "login" ? "Entre na sua operação" : "Crie a empresa"}</h2><p>{mode === "login" ? "Acesse o painel da sua empresa de toldos." : "O cadastro cria a empresa e concede o perfil de administrador."}</p></div><form onSubmit={submit} className="auth-form">{mode === "signup" && <><label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Rafael Silva" autoComplete="name" required /></label><label>Nome da empresa<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ex.: Toldos Silva" autoComplete="organization" required /></label><label>Telefone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" autoComplete="tel" required /></label></>}<label><span className="auth-label-icon"><Mail size={14} /> E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" autoComplete="email" required /></label><label><span className="auth-label-icon"><LockKeyhole size={14} /> Senha</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}<button className="auth-submit" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar no Toldo Pro" : "Criar conta e empresa"}<ArrowRight size={16} /></button></form><div className="auth-links">{mode === "login" && <><Link to="/auth/forgot-password">Esqueci minha senha</Link><span>·</span><button onClick={() => setMode("signup")}>Criar conta empresarial</button></>}{mode === "signup" && <button onClick={() => setMode("login")}>Voltar para o login</button>}</div></div></div></div>;
}
