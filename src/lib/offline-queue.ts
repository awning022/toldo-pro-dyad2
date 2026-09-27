export type OfflineOperation = {
  id: string;
  type: string;
  description: string;
  payload: Record<string, unknown>;
  status: "pendente" | "sincronizando" | "sincronizado" | "falhou";
  attempts: number;
  createdAt: string;
};

const STORAGE_KEY = "toldo-pro-offline-queue";

function getStorage(): OfflineOperation[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineOperation[];
  } catch {
    return [];
  }
}

export function loadOfflineQueue(): OfflineOperation[] {
  return getStorage();
}

export function addOfflineOperation(description: string, type = "comando", payload: Record<string, unknown> = {}) {
  const operation: OfflineOperation = {
    id: crypto.randomUUID(),
    type,
    description,
    payload,
    status: "pendente",
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...getStorage(), operation]));
  return operation;
}

export function markQueueSynchronized() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}
