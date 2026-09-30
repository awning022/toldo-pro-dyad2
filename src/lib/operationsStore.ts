export type StockMaterial = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minimum: number;
  unit: string;
  cost: string;
};

export type StockMovement = {
  id: string;
  materialId: string;
  materialName: string;
  type: "Entrada" | "Saída";
  quantity: number;
  orderId: string;
  at: string;
  notes: string;
};

export type SupplyRequest = {
  id: string;
  requester: string;
  role: string;
  material: string;
  quantity: number;
  orderId: string;
  notes: string;
  createdAt: string;
  status: "Pendente" | "Atendida";
};

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  type: string;
  read?: boolean;
};

export const defaultStock: StockMaterial[] = [
  { id: "material-1", name: "Lona bege 3,00m", sku: "LON-BEG-300", quantity: 18, minimum: 25, unit: "m", cost: "R$ 48,90/m" },
  { id: "material-2", name: "Braço articulado 2,50m", sku: "BRA-ART-250", quantity: 42, minimum: 20, unit: "un.", cost: "R$ 386,00" },
  { id: "material-3", name: "Motor tubular 45Nm", sku: "MOT-TUB-045", quantity: 7, minimum: 10, unit: "un.", cost: "R$ 812,00" },
];

export function readStoredList<T>(key: string, fallback: T[]): T[] {
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    const value: unknown = JSON.parse(saved);
    return Array.isArray(value) ? value as T[] : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredList<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function appendNotification(notification: Omit<AppNotification, "id" | "createdAt">) {
  const notifications = readStoredList<AppNotification>("toldo:notifications", []);
  writeStoredList("toldo:notifications", [
    { ...notification, id: `notification-${Date.now()}`, createdAt: new Date().toISOString() },
    ...notifications,
  ]);
}

export function updateStock(
  materials: StockMaterial[],
  movements: StockMovement[],
  materialId: string,
  quantity: number,
  type: StockMovement["type"],
  orderId: string,
  notes: string,
) {
  const material = materials.find((item) => item.id === materialId);
  if (!material || !Number.isFinite(quantity) || quantity <= 0) return null;
  if (type === "Saída" && material.quantity < quantity) return null;
  const adjusted = materials.map((item) => item.id === materialId
    ? { ...item, quantity: item.quantity + (type === "Entrada" ? quantity : -quantity) }
    : item);
  const movement: StockMovement = {
    id: `movement-${Date.now()}`,
    materialId,
    materialName: material.name,
    type,
    quantity,
    orderId,
    at: new Date().toISOString(),
    notes,
  };
  return { materials: adjusted, movements: [movement, ...movements] };
}
