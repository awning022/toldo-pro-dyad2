import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Compass, FileText, Package, Users, X } from "lucide-react";
import type { ModuleKey } from "@/components/ModuleViews";

type Props = { userKey: string; onNavigate: (module: ModuleKey) => void };

const lessons = [
  {
    eyebrow: "Boas-vindas · 1 de 3",
    title: "Seu negócio em um só lugar",
    description: "Este é o painel do Toldo Pro. Ele reúne os principais números e atalhos para você acompanhar a empresa sem se perder.",
    steps: [
      { icon: Compass, title: "Painel", text: "Volte aqui para ter uma visão geral da operação.", module: "painel" as ModuleKey, action: "Ver painel" },
      { icon: Users, title: "Clientes e CRM", text: "Organize seus contatos e acompanhe oportunidades de venda.", module: "clientes" as ModuleKey, action: "Conhecer clientes" },
      { icon: FileText, title: "Orçamentos", text: "Monte propostas para seus clientes e acompanhe a aprovação.", module: "orcamentos" as ModuleKey, action: "Ver orçamentos" },
    ],
  },
  {
    eyebrow: "Passo a passo · 2 de 3",
    title: "Do contato ao orçamento",
    description: "Vamos conhecer o fluxo comercial: comece registrando o cliente e depois prepare uma proposta clara.",
    steps: [
      { icon: Users, title: "1. Cadastre o cliente", text: "Guarde nome, telefone e informações úteis para o atendimento.", module: "clientes" as ModuleKey, action: "Abrir clientes" },
      { icon: FileText, title: "2. Prepare o orçamento", text: "Descreva o serviço e os materiais, confira os valores e salve a proposta.", module: "orcamentos" as ModuleKey, action: "Abrir orçamentos" },
      { icon: CheckCircle2, title: "3. Acompanhe a negociação", text: "Atualize a situação conforme o cliente analisa e responde à proposta.", module: "vendas" as ModuleKey, action: "Abrir CRM" },
    ],
  },
  {
    eyebrow: "Rotina da empresa · 3 de 3",
    title: "Organize a entrega do serviço",
    description: "Depois da aprovação, acompanhe a ordem de serviço, a produção, a instalação e os materiais.",
    steps: [
      { icon: FileText, title: "Ordem de serviço", text: "Registre o que foi combinado para orientar a execução.", module: "os" as ModuleKey, action: "Abrir ordens de serviço" },
      { icon: Package, title: "Produção e estoque", text: "Acompanhe as etapas e confira a disponibilidade dos materiais.", module: "estoque" as ModuleKey, action: "Abrir estoque" },
      { icon: CheckCircle2, title: "Instalação", text: "Consulte os serviços pendentes e mantenha a agenda organizada.", module: "instalacoes" as ModuleKey, action: "Abrir instalações" },
    ],
  },
];

export function OnboardingGuide({ userKey, onNavigate }: Props) {
  const [lessonIndex, setLessonIndex] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!userKey || typeof window === "undefined") return;
    const safeKey = userKey.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
    const countKey = `toldo-pro:onboarding-count:${safeKey}`;
    const sessionKey = `toldo-pro:onboarding-session:${safeKey}`;
    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, "1");
      const previous = Number(window.localStorage.getItem(countKey) || "0");
      const current = Math.min(previous + 1, 3);
      window.localStorage.setItem(countKey, String(current));
      if (current <= 3) {
        setLessonIndex(current - 1);
        setStepIndex(0);
      }
    } catch {
      // If browser storage is unavailable, do not block access to the app.
    }
  }, [userKey]);

  useEffect(() => {
    const reopen = () => { setLessonIndex(0); setStepIndex(0); };
    window.addEventListener("toldo-pro:open-guide", reopen);
    return () => window.removeEventListener("toldo-pro:open-guide", reopen);
  }, []);

  if (lessonIndex === null) return null;
  const lesson = lessons[lessonIndex];
  const step = lesson.steps[stepIndex];
  const StepIcon = step.icon;
  const close = () => setLessonIndex(null);
  const goToStep = (index: number) => setStepIndex(Math.max(0, Math.min(index, lesson.steps.length - 1)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101f35]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(10,24,44,0.3)]">
        <div className="h-1.5 bg-[#edf1f6]"><div className="h-full rounded-r-full bg-[#f47b20] transition-all duration-300" style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }} /></div>
        <button onClick={close} aria-label="Fechar tutorial" className="absolute right-5 top-5 rounded-xl p-2 text-[#8190a3] transition hover:bg-[#f2f5f9] hover:text-[#172b4d]"><X size={18} /></button>
        <div className="p-6 sm:p-9">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#fff2e8] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#c65b0b]"><span className="h-1.5 w-1.5 rounded-full bg-[#f47b20]" />{lesson.eyebrow}</div>
          <h2 id="onboarding-title" className="max-w-md font-display text-2xl font-extrabold tracking-[-0.04em] text-[#172b4d] sm:text-[30px]">{lesson.title}</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[#687b92]">{lesson.description}</p>
          <div className="mt-7 rounded-2xl border border-[#e8edf4] bg-[#f8fafc] p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e4] text-[#e36c16]"><StepIcon size={22} /></div>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9aa7b7]">Etapa {stepIndex + 1} de {lesson.steps.length}</p><h3 className="mt-1 font-display text-base font-bold text-[#172b4d]">{step.title}</h3><p className="mt-1.5 text-sm leading-5 text-[#687b92]">{step.text}</p>
                <button onClick={() => { onNavigate(step.module); close(); }} className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-[#d9620d] transition hover:text-[#a94a08]">{step.action}<ArrowRight size={14} /></button>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button onClick={close} className="text-xs font-semibold text-[#7b8ba0] transition hover:text-[#172b4d]">Pular tutorial</button>
            <div className="flex items-center gap-2">
              <button onClick={() => goToStep(stepIndex - 1)} disabled={stepIndex === 0} aria-label="Etapa anterior" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#52647d] transition hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={17} /></button>
              {stepIndex < lesson.steps.length - 1 ? <button onClick={() => goToStep(stepIndex + 1)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#172b4d] px-4 text-xs font-bold text-white transition hover:bg-[#25436d]">Próximo <ChevronRight size={15} /></button> : <button onClick={close} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#f47b20] px-4 text-xs font-bold text-white transition hover:bg-[#db6812]">Entendi <CheckCircle2 size={15} /></button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
