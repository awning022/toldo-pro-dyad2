import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import "@/styles/auth.css";

const recoveryKey = "toldo.auth.recovery.startedAt";
type OtpType = Parameters<NonNullable<typeof supabase>["auth"]["verifyOtp"]>[0]["type"];
const otpTypes: OtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function callbackUrl(flow: string, next: string) {
  const url = new URL("/auth/confirm", window.location.origin);
  url.searchParams.set("flow", flow);
  url.searchParams.set("next", next);
  return url.toString();
}

function safeInternalPath(candidate: string | null, fallback: string) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  try {
    const url = new URL(candidate, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="auth-shell"><div className="auth-brand-panel"><div className="auth-brand-mark"><span /><span /><span /></div><p className="auth-kicker">TOLDO PRO · ACESSO SEGURO</p><h1>Protegemos o acesso à sua operação.</h1><p className="auth-brand-copy">Confirme sua identidade para manter sua conta e os dados da empresa seguros.</p><div className="auth-benefits"><span><ShieldCheck size={15} /> Sessão protegida pelo Supabase</span><span><CheckCircle2 size={15} /> Dados isolados por empresa</span></div><div className="auth-pattern" /></div><main className="auth-form-panel"><div className="auth-form-wrap"><div className="auth-mobile-logo"><div className="auth-brand-mark"><span /><span /><span /></div><b>toldo<span>pro</span></b></div><div className="auth-heading"><p className="auth-kicker">CONTA TOLDO PRO</p><h2>{title}</h2><p>{description}</p></div>{children}</div></main></div>;
}

function AuthMessage({ error, success }: { error?: string; success?: string }) {
  return <>{error && <p className="auth-error" role="alert">{error}</p>}{success && <p className="auth-success" role="status">{success}</p>}</>;
}

export function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Validando o link de acesso...");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const complete = async () => {
      const params = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
      const flow = params.get("flow") || params.get("type") || hashParams.get("type") || "";
      const isSetup = params.get("setup") === "1" || flow === "invite";
      const errorCode = params.get("error_code") || hashParams.get("error_code");
      if (errorCode || params.has("error") || hashParams.has("error")) {
        if (active) setError("Este link expirou ou não é mais válido. Solicite um novo e tente novamente.");
        return;
      }
      if (!isSupabaseConfigured || !supabase) {
        if (active) setError("O acesso ao Supabase não está configurado neste ambiente.");
        return;
      }

      let session: Session | null = null;
      const tokenHash = params.get("token_hash");
      const otpType = otpTypes.find((candidate) => candidate === params.get("type"));
      if (tokenHash && !otpType) {
        if (active) setError("Este link está incompleto ou não é válido. Solicite um novo e tente novamente.");
        return;
      }
      if (tokenHash && otpType) {
        const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
        if (result.error) {
          if (active) setError("Este link expirou ou não é mais válido. Solicite um novo e tente novamente.");
          return;
        }
        session = result.data.session;
      } else {
        const result = await supabase.auth.getSession();
        if (result.error) {
          if (active) setError("Não foi possível validar sua sessão. Solicite um novo link e tente novamente.");
          return;
        }
        session = result.data.session;
      }

      if (!session) {
        if (active) setError("O link foi aberto, mas não criou uma sessão válida. Confira se o link ainda está ativo.");
        return;
      }

      const { error: userError } = await supabase.auth.getUser();
      if (userError) {
        if (active) setError("Não foi possível confirmar sua sessão. Solicite um novo link e tente novamente.");
        return;
      }

      if (flow === "recovery") sessionStorage.setItem(recoveryKey, String(Date.now()));
      const destination = isSetup
        ? "/?setup=1"
        : flow === "recovery"
          ? "/auth/reset-password"
          : flow === "email_change"
            ? "/auth/change-email?confirmed=1"
            : safeInternalPath(params.get("next"), "/");
      if (active) {
        setMessage("Link confirmado. Redirecionando...");
        navigate(destination, { replace: true });
      }
    };

    void complete().catch(() => {
      if (active) setError("Não foi possível validar este link. Solicite um novo e tente novamente.");
    });
    return () => { active = false; };
  }, [location.hash, location.search, navigate]);

  return <AuthLayout title={error ? "Não foi possível confirmar" : "Confirmando seu acesso"} description={error ? "Use uma nova solicitação para receber outro link." : message}>
    <AuthMessage error={error} />
    {error && <div className="auth-links"><Link to="/">Voltar para o login</Link></div>}
  </AuthLayout>;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !isSupabaseConfigured) {
      setError("O acesso ao Supabase não está configurado neste ambiente.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callbackUrl("recovery", "/auth/reset-password"),
      });
      if (requestError) setError("Não foi possível solicitar a recuperação agora. Confira a conexão e tente novamente.");
      else setSent(true);
    } catch {
      setError("Não foi possível solicitar a recuperação agora. Confira a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Recupere seu acesso" description="Informe seu e-mail para receber as instruções de redefinição.">
    <form onSubmit={submit} className="auth-form">
      <label><span className="auth-label-icon"><Mail size={14} /> E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <AuthMessage error={error} success={sent ? "Se houver uma conta associada a este e-mail, enviaremos um link para redefinir a senha." : undefined} />
      <button className="auth-submit" disabled={loading}>{loading ? "Enviando..." : "Enviar instruções"}<Mail size={16} /></button>
    </form>
    <div className="auth-links"><Link to="/"><ArrowLeft size={13} /> Voltar para o login</Link></div>
  </AuthLayout>;
}

export function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const verifyRecovery = async () => {
      const startedAt = Number(sessionStorage.getItem(recoveryKey));
      const recoveryIsRecent = Number.isFinite(startedAt) && Date.now() - startedAt < 30 * 60 * 1000;
      if (!supabase || !isSupabaseConfigured || !recoveryIsRecent) {
        if (active) {
          setError("O link de recuperação expirou ou não foi validado. Solicite outro na tela de login.");
          setReady(true);
        }
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (active) {
        if (sessionError || !data.session) setError("Sua sessão de recuperação expirou. Solicite outro link na tela de login.");
        setReady(true);
      }
    };
    void verifyRecovery().catch(() => {
      if (active) {
        setError("Não foi possível validar a sessão de recuperação.");
        setReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }
    if (!supabase) {
      setError("O acesso ao Supabase não está configurado neste ambiente.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
      else {
        sessionStorage.removeItem(recoveryKey);
        setSuccess(true);
      }
    } catch {
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title={success ? "Senha atualizada" : "Defina uma nova senha"} description={success ? "Sua senha foi alterada com segurança." : "Escolha uma senha nova para sua conta. Use pelo menos 8 caracteres."}>
    {!ready ? <p className="auth-success" role="status">Validando o link de recuperação...</p> : success
      ? <div className="auth-links"><Link to="/">Ir para o painel</Link></div>
      : error ? <><AuthMessage error={error} /><div className="auth-links"><Link to="/auth/forgot-password">Solicitar novo link</Link></div></>
        : <form onSubmit={submit} className="auth-form">
          <label><span className="auth-label-icon"><LockKeyhole size={14} /> Nova senha</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
          <label><span className="auth-label-icon"><LockKeyhole size={14} /> Confirme a nova senha</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
          <AuthMessage error={error} />
          <button className="auth-submit" disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}<LockKeyhole size={16} /></button>
        </form>}
  </AuthLayout>;
}

export function ChangeEmailPage() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const confirmed = new URLSearchParams(location.search).get("confirmed") === "1";

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      if (!supabase || !isSupabaseConfigured) {
        if (active) {
          setError("O acesso ao Supabase não está configurado neste ambiente.");
          setLoadingUser(false);
        }
        return;
      }
      const { data, error: userError } = await supabase.auth.getUser();
      if (active) {
        if (userError) setError("Entre na sua conta para alterar o e-mail.");
        else setEmail(data.user.email || "");
        setLoadingUser(false);
      }
    };
    void loadUser().catch(() => {
      if (active) {
        setError("Não foi possível carregar a conta.");
        setLoadingUser(false);
      }
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError("O acesso ao Supabase não está configurado neste ambiente.");
      return;
    }
    if (newEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
      setError("Informe um endereço diferente do e-mail atual.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() }, {
        emailRedirectTo: callbackUrl("email_change", "/auth/change-email?confirmed=1"),
      });
      if (updateError) setError("Não foi possível iniciar a alteração. Confira o endereço e tente novamente.");
      else setMessage("Solicitação aceita. Confirme a alteração pelo link enviado pelo Supabase Auth para concluir.");
    } catch {
      setError("Não foi possível iniciar a alteração. Confira a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Alterar e-mail" description="O endereço da conta só muda depois da confirmação enviada pelo Supabase Auth.">
    {loadingUser ? <p className="auth-success" role="status">Carregando sua conta...</p> : error && !email
      ? <><AuthMessage error={error} /><div className="auth-links"><Link to="/">Voltar para o login</Link></div></>
      : confirmed
        ? <><AuthMessage success="O link de confirmação foi processado. O e-mail atualizado será exibido na conta após a confirmação do Supabase." /><div className="auth-links"><Link to="/">Voltar para o painel</Link></div></>
        : <><p className="mt-5 text-sm text-slate-600">E-mail atual: <strong>{email}</strong></p><form onSubmit={submit} className="auth-form">
          <label><span className="auth-label-icon"><Mail size={14} /> Novo e-mail</span><input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoComplete="email" required /></label>
          <AuthMessage error={error} success={message} />
          <button className="auth-submit" disabled={loading}>{loading ? "Enviando..." : "Solicitar alteração"}<Mail size={16} /></button>
        </form><div className="auth-links"><Link to="/">Voltar para o painel</Link></div></>}
  </AuthLayout>;
}
