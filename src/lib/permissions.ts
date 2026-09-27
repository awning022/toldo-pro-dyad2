export type Role =
  | "Administrador"
  | "Gerente"
  | "Vendedor"
  | "Orçamentista"
  | "Produção"
  | "Instalador"
  | "Financeiro"
  | "Estoque"
  | "Suporte"
  | "Custom";

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "cancel",
  "export",
  "print",
  "execute"
] as const;

export type Action = (typeof ACTIONS)[number];

const defaults: Record<Role, Action[] | "*"> = {
  Administrador: "*",
  Gerente: ["view", "create", "edit", "delete", "approve", "cancel", "export", "print", "execute"],
  Vendedor: ["view", "create", "edit", "export", "print"],
  Orçamentista: ["view", "create", "edit", "export", "print"],
  Produção: ["view", "create", "edit", "execute", "print"],
  Instalador: ["view", "create", "edit", "execute", "print"],
  Financeiro: ["view", "create", "edit", "approve", "cancel", "export", "print"],
  Estoque: ["view", "create", "edit", "execute", "print"],
  Suporte: ["view", "create", "edit", "print"],
  Custom: ["view"]
};

export function hasPermission(role: Role | string, action: Action) {
  const rule = defaults[(role as Role) || "Custom"] || defaults.Custom;
  return rule === "*" || rule.includes(action);
}

export function canAIExecute(role: Role | string, action: Action) {
  return hasPermission(role, action);
}
