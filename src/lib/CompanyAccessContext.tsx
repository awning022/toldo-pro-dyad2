import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { WorkflowPermission, WorkflowRole } from "@/lib/workflowData";

export type CompanyPermission =
  | WorkflowPermission
  | "manageCustomers"
  | "manageQuotes"
  | "manageProduction"
  | "manageStock"
  | "requestMaterials"
  | "manageInstallations"
  | "manageFinance"
  | "manageAgenda"
  | "accessAssistant"
  | "readNotifications";

export type CompanyAccess = {
  user: User;
  companyId: string;
  companyName: string;
  membershipId: string;
  role: WorkflowRole;
  fullName: string;
  phone: string;
  email: string;
  permissions: Record<string, boolean>;
  can: (permission: CompanyPermission) => boolean;
  reloadMemberships: () => Promise<void>;
};

const CompanyAccessContext = createContext<CompanyAccess | null>(null);

export const CompanyAccessProvider = CompanyAccessContext.Provider;

export function useCompanyAccess() {
  const access = useContext(CompanyAccessContext);
  if (!access) throw new Error("Company access is only available to authenticated company members");
  return access;
}
