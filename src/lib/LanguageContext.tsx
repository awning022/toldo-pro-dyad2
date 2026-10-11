import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "auto" | "pt-BR" | "en-US" | "es-ES" | "ar";
type ResolvedLanguage = Exclude<AppLanguage, "auto">;
type LanguageContextValue = { language: AppLanguage; resolvedLanguage: ResolvedLanguage; setLanguage: (language: AppLanguage) => void; t: (key: string) => string };
const STORAGE_KEY = "toldo-pro:language";
const LanguageContext = createContext<LanguageContextValue | null>(null);

const dictionaries: Record<ResolvedLanguage, Record<string, string>> = {
  "pt-BR": {
    "nav.overview":"Visão geral","nav.operation":"Operação","nav.management":"Gestão","nav.technology":"Tecnologia",
    "nav.dashboard":"Painel","nav.calendar":"Agenda","nav.notifications":"Notificações","nav.crm":"CRM","nav.customers":"Clientes",
    "nav.sales":"Contatos e vendas","nav.quotes":"Orçamentos","nav.workOrders":"Emitir OS","nav.production":"Produção",
    "nav.installations":"Instalações","nav.stock":"Estoque","nav.finance":"Financeiro","nav.reports":"Relatórios","nav.settings":"Configurações",
    "language":"Idioma","language.auto":"Automático","language.pt":"Português (Brasil)","language.en":"English","language.es":"Español","language.ar":"العربية",
    "assistant.greeting":"Olá","assistant.subtitle":"Converse com a IA sobre as informações que seu cargo pode acessar.",
    "assistant.prompt":"O que você precisa resolver agora?","assistant.description":"Converse em linguagem natural e consulte os dados da empresa liberados para seu cargo.",
    "assistant.calendar":"Resumo da agenda","assistant.openCalendar":"Abrir agenda completa","assistant.install":"Instalar app","assistant.sync":"Sincronizar",
  },
  "en-US": {
    "nav.overview":"Overview","nav.operation":"Operations","nav.management":"Management","nav.technology":"Technology",
    "nav.dashboard":"Dashboard","nav.calendar":"Calendar","nav.notifications":"Notifications","nav.crm":"CRM","nav.customers":"Customers",
    "nav.sales":"Sales & contacts","nav.quotes":"Quotes","nav.workOrders":"Work orders","nav.production":"Production",
    "nav.installations":"Installations","nav.stock":"Inventory","nav.finance":"Finance","nav.reports":"Reports","nav.settings":"Settings",
    "language":"Language","language.auto":"Automatic","language.pt":"Portuguese (Brazil)","language.en":"English","language.es":"Spanish","language.ar":"Arabic",
    "assistant.greeting":"Hello","assistant.subtitle":"Ask the AI about information your role is allowed to access.",
    "assistant.prompt":"What do you need to solve right now?","assistant.description":"Chat naturally and consult company data available to your role.",
    "assistant.calendar":"Schedule summary","assistant.openCalendar":"Open full calendar","assistant.install":"Install app","assistant.sync":"Sync",
  },
  "es-ES": {
    "nav.overview":"Resumen","nav.operation":"Operaciones","nav.management":"Gestión","nav.technology":"Tecnología",
    "nav.dashboard":"Panel","nav.calendar":"Agenda","nav.notifications":"Notificaciones","nav.crm":"CRM","nav.customers":"Clientes",
    "nav.sales":"Ventas y contactos","nav.quotes":"Presupuestos","nav.workOrders":"Órdenes de trabajo","nav.production":"Producción",
    "nav.installations":"Instalaciones","nav.stock":"Inventario","nav.finance":"Finanzas","nav.reports":"Informes","nav.settings":"Configuración",
    "language":"Idioma","language.auto":"Automático","language.pt":"Portugués (Brasil)","language.en":"Inglés","language.es":"Español","language.ar":"Árabe",
    "assistant.greeting":"Hola","assistant.subtitle":"Consulta a la IA sobre la información a la que tu rol tiene acceso.",
    "assistant.prompt":"¿Qué necesitas resolver ahora?","assistant.description":"Habla con naturalidad y consulta los datos de la empresa disponibles para tu rol.",
    "assistant.calendar":"Resumen de agenda","assistant.openCalendar":"Abrir agenda completa","assistant.install":"Instalar app","assistant.sync":"Sincronizar",
  },
  ar: {
    "nav.overview":"نظرة عامة","nav.operation":"العمليات","nav.management":"الإدارة","nav.technology":"التقنية",
    "nav.dashboard":"لوحة التحكم","nav.calendar":"الجدول","nav.notifications":"الإشعارات","nav.crm":"إدارة العملاء","nav.customers":"العملاء",
    "nav.sales":"المبيعات وجهات الاتصال","nav.quotes":"عروض الأسعار","nav.workOrders":"أوامر العمل","nav.production":"الإنتاج",
    "nav.installations":"التركيبات","nav.stock":"المخزون","nav.finance":"المالية","nav.reports":"التقارير","nav.settings":"الإعدادات",
    "language":"اللغة","language.auto":"تلقائي","language.pt":"البرتغالية (البرازيل)","language.en":"الإنجليزية","language.es":"الإسبانية","language.ar":"العربية",
    "assistant.greeting":"مرحباً","assistant.subtitle":"تحدث مع الذكاء الاصطناعي حول المعلومات التي يسمح دورك بالوصول إليها.",
    "assistant.prompt":"ما الذي تريد إنجازه الآن؟","assistant.description":"تحدث بشكل طبيعي واطلع على بيانات الشركة المتاحة لدورك.",
    "assistant.calendar":"ملخص الجدول","assistant.openCalendar":"فتح الجدول الكامل","assistant.install":"تثبيت التطبيق","assistant.sync":"مزامنة",
  },
};

function detectLanguage(): ResolvedLanguage {
  if (typeof navigator === "undefined") return "pt-BR";
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const value of languages) {
    const lang = value.toLowerCase();
    if (lang.startsWith("pt")) return "pt-BR";
    if (lang.startsWith("es")) return "es-ES";
    if (lang.startsWith("ar")) return "ar";
    if (lang.startsWith("en")) return "en-US";
  }
  return "en-US";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved === "pt-BR" || saved === "en-US" || saved === "es-ES" || saved === "ar" || saved === "auto" ? saved : "auto";
    } catch { return "auto"; }
  });
  const resolvedLanguage = language === "auto" ? detectLanguage() : language;
  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage can be disabled */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = resolvedLanguage;
    document.documentElement.dir = resolvedLanguage === "ar" ? "rtl" : "ltr";
  }, [resolvedLanguage]);
  const value = useMemo<LanguageContextValue>(() => ({
    language, resolvedLanguage, setLanguage,
    t: (key: string) => dictionaries[resolvedLanguage][key] || dictionaries["pt-BR"][key] || key,
  }), [language, resolvedLanguage, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useAppLanguage must be used inside LanguageProvider");
  return value;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useAppLanguage();
  return <label className={compact ? "inline-flex items-center gap-1.5 text-[10px] font-semibold" : "inline-flex items-center gap-2 rounded-xl border border-[#dce4ed] bg-white px-2.5 py-2 text-xs font-semibold text-[#52677d] shadow-sm"}>
    <span>{t("language")}</span>
    <select aria-label={t("language")} value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)} className="max-w-[150px] rounded-lg border border-[#dce4ed] bg-white px-2 py-1.5 text-[11px] text-[#29445d]">
      <option value="auto">{t("language.auto")}</option>
      <option value="pt-BR">{t("language.pt")}</option>
      <option value="en-US">{t("language.en")}</option>
      <option value="es-ES">{t("language.es")}</option>
      <option value="ar">{t("language.ar")}</option>
    </select>
  </label>;
}
