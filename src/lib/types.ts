export const COLLECTION_KEYS = [
  "companies",
  "users",
  "roles",
  "employees",
  "timecards",
  "clients",
  "leads",
  "funnel",
  "catalog",
  "materials",
  "measurements",
  "inspections",
  "quotes",
  "pricingRules",
  "projects",
  "production",
  "bom",
  "stock",
  "purchases",
  "deliveries",
  "installations",
  "maintenance",
  "calendar",
  "whatsapp",
  "finance",
  "notifications",
  "reports",
  "syncQueue"
] as const;

export type CollectionKey = (typeof COLLECTION_KEYS)[number];

export type Entity = {
  id: string;
  [key: string]: unknown;
};

export type Profile = {
  company: string;
  user: string;
  role: string;
  online: boolean;
};

export type AIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
};

export type QueueItem = {
  id: string;
  action: string;
  target: CollectionKey | "system";
  payload: Record<string, unknown>;
  status: "Pendente" | "Sincronizando" | "Sincronizado" | "Falhou";
  createdAt: string;
  error?: string;
};

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "email"
  | "phone"
  | "currency"
  | "boolean";

export type Field = {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type ModuleConfig = {
  key: CollectionKey;
  title: string;
  subtitle: string;
  primaryField: string;
  badgeField?: string;
  badgeTone?: string;
  fields: Field[];
};

export type AppState = {
  profile: Profile;
  collections: Record<CollectionKey, Entity[]>;
  aiLog: AIMessage[];
  syncQueue: QueueItem[];
  settings: {
    theme: "dark" | "light";
    pwa: boolean;
    camera: boolean;
    gps: boolean;
    autoSync: boolean;
  };
};
