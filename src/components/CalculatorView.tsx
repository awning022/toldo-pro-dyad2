import { useEffect, useMemo, useState } from "react";
import { Calculator, Plus, Trash2, Save, Pencil, Copy, Ruler, Package, Scissors, CircleDollarSign, Layers3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { useCompanyRecords } from "@/lib/useCompanyRecords";

type MaterialType = "linear" | "sheet" | "unit";
type DimensionFormula = "width" | "depth" | "fixed";
type MaterialRule = {
  id: string;
  name: string;
  type: MaterialType;
  stockLength: number;
  stockWidth: number;
  stockPrice: number;
  formulaA: DimensionFormula;
  formulaB: DimensionFormula;
  fixedA: number;
  fixedB: number;
  count: number;
  kerf: number;
  spacingBased?: boolean;
};
type CalculatorModel = {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultWidth: number;
  defaultDepth: number;
  crossbarSpacing?: number;
  materials: MaterialRule[];
  createdAt: string;
  updatedAt: string;
};
type CalculatorProject = {
  id: string;
  name: string;
  modelId: string;
  modelName: string;
  width: number;
  depth: number;
  quantity: number;
  laborCost: number;
  extraCost: number;
  marginPercent: number;
  taxPercent: number;
  result: CalculationResult;
  createdAt: string;
};
type Scrap = { material: string; type: MaterialType; measure: string; length: number; width: number; quantity: number; value: number; source: string };
type MaterialResult = { name: string; type: MaterialType; needed: string; purchased: string; purchasedCost: number; usedCost: number; scrapValue: number; scraps: Scrap[]; notes: string[] };
type CalculationResult = { materials: MaterialResult[]; purchaseCost: number; scrapValue: number; consumedCost: number; laborCost: number; extraCost: number; totalCost: number; marginPercent: number; taxPercent: number; suggestedPrice: number; estimatedProfit: number; warnings: string[] };

const dimensionOptions: { value: DimensionFormula; label: string }[] = [
  { value: "width", label: "Largura do projeto" },
  { value: "depth", label: "Avanço/altura do projeto" },
  { value: "fixed", label: "Medida fixa cadastrada" },
];

const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
const number = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const meters = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + " m";
const area = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + " m²";
const newMaterial = (name = "Material personalizado"): MaterialRule => ({
  id: uid(), name, type: "linear", stockLength: 6, stockWidth: 0, stockPrice: 0,
  formulaA: "width", formulaB: "depth", fixedA: 1, fixedB: 1, count: 1, kerf: 0.003,
});

const defaultModels: CalculatorModel[] = [
  {
    id: "preset-retratil-lona", name: "Toldo retrátil em lona", category: "Toldo retrátil",
    description: "Modelo inicial editável para toldos retráteis. Ajuste a ficha técnica conforme a estrutura e o método de fabricação da empresa.",
    defaultWidth: 5, defaultDepth: 3, createdAt: "", updatedAt: "",
    materials: [
      { ...newMaterial("Lona de cobertura"), id: "ret-lona", type: "sheet", stockLength: 50, stockWidth: 1.4, formulaA: "depth", formulaB: "width", count: 1, kerf: 0 },
      { ...newMaterial("Tubo de enrolamento"), id: "ret-tubo", type: "linear", stockLength: 6, formulaA: "width", count: 1 },
      { ...newMaterial("Perfil frontal"), id: "ret-frontal", type: "linear", stockLength: 6, formulaA: "width", count: 1 },
      { ...newMaterial("Braços articulados"), id: "ret-bracos", type: "unit", stockLength: 1, stockWidth: 0, formulaA: "fixed", fixedA: 1, count: 2, kerf: 0 },
      { ...newMaterial("Suportes e fixadores"), id: "ret-fix", type: "unit", stockLength: 1, stockWidth: 0, formulaA: "fixed", fixedA: 1, count: 8, kerf: 0 },
    ],
  },
  {
    id: "preset-fixo-policarbonato", name: "Toldo fixo em policarbonato", category: "Cobertura fixa",
    description: "Modelo inicial para cobertura fixa. A divisão em painéis é uma estimativa de corte; revise perfis, emendas e folgas técnicas.",
    defaultWidth: 5, defaultDepth: 3, crossbarSpacing: 0.7, createdAt: "", updatedAt: "",
    materials: [
      { ...newMaterial("Chapa de policarbonato"), id: "fix-chapa", type: "sheet", stockLength: 6, stockWidth: 2.1, formulaA: "depth", formulaB: "width", count: 1, kerf: 0.003 },
      { ...newMaterial("Perfil estrutural frontal"), id: "fix-frontal", type: "linear", stockLength: 6, formulaA: "width", count: 1 },
      { ...newMaterial("Perfis laterais"), id: "fix-lateral", type: "linear", stockLength: 6, formulaA: "depth", count: 2 },
      { ...newMaterial("Travessas de apoio (fixação até a frente)"), id: "fix-travessas", type: "linear", stockLength: 6, formulaA: "depth", count: 1, spacingBased: true },
      { ...newMaterial("Calha"), id: "fix-calha", type: "linear", stockLength: 6, formulaA: "width", count: 1 },
      { ...newMaterial("Parafusos e acessórios"), id: "fix-paraf", type: "unit", stockLength: 1, stockWidth: 0, formulaA: "fixed", fixedA: 1, count: 12, kerf: 0 },
    ],
  },
  {
    id: "preset-cortina-vertical", name: "Cortina ou toldo vertical", category: "Cortina vertical",
    description: "Modelo inicial para cortinas verticais. Configure tecido/lona, guias, tubo, acabamentos e quantidades de acordo com seu produto.",
    defaultWidth: 3, defaultDepth: 2.5, createdAt: "", updatedAt: "",
    materials: [
      { ...newMaterial("Lona ou tela"), id: "ver-lona", type: "sheet", stockLength: 50, stockWidth: 1.4, formulaA: "width", formulaB: "depth", count: 1, kerf: 0 },
      { ...newMaterial("Tubo superior"), id: "ver-tubo", type: "linear", stockLength: 6, formulaA: "width", count: 1 },
      { ...newMaterial("Guias laterais"), id: "ver-guias", type: "linear", stockLength: 6, formulaA: "depth", count: 2 },
      { ...newMaterial("Trilho ou perfil inferior"), id: "ver-trilho", type: "linear", stockLength: 6, formulaA: "width", count: 1 },
      { ...newMaterial("Mecanismo e fixadores"), id: "ver-fix", type: "unit", stockLength: 1, stockWidth: 0, formulaA: "fixed", fixedA: 1, count: 6, kerf: 0 },
    ],
  },
  {
    id: "preset-especial", name: "Projeto especial / cobertura sob medida", category: "Projeto especial",
    description: "Ficha aberta para projetos sob medida. Adicione todas as linhas de material, medidas e fórmulas específicas.",
    defaultWidth: 5, defaultDepth: 3, createdAt: "", updatedAt: "",
    materials: [
      { ...newMaterial("Perfil ou tubo personalizado"), id: "esp-perfil", type: "linear", stockLength: 6, formulaA: "width", count: 1 },
      { ...newMaterial("Chapa, lona ou painel personalizado"), id: "esp-painel", type: "sheet", stockLength: 6, stockWidth: 2, formulaA: "depth", formulaB: "width", count: 1, kerf: 0.003 },
      { ...newMaterial("Acessórios e fixadores"), id: "esp-fix", type: "unit", stockLength: 1, stockWidth: 0, formulaA: "fixed", fixedA: 1, count: 1, kerf: 0 },
    ],
  },
];

function resolveDimension(formula: DimensionFormula, width: number, depth: number, fixed: number) {
  if (formula === "width") return width;
  if (formula === "depth") return depth;
  return number(fixed);
}

function calculateProject(model: CalculatorModel, width: number, depth: number, quantity: number, laborCost: number, extraCost: number, marginPercent: number, taxPercent: number): CalculationResult {
  const warnings: string[] = [];
  const groups = new Map<string, { rule: MaterialRule; linearPieces: number[]; rectangles: { width: number; length: number }[]; units: number }>();
  const safeQuantity = Math.max(1, Math.floor(quantity));
  model.materials.forEach((rule) => {
    const key = [rule.type, rule.name.trim().toLowerCase(), number(rule.stockLength), number(rule.stockWidth), number(rule.stockPrice), number(rule.kerf)].join("|");
    const existing = groups.get(key) || { rule, linearPieces: [], rectangles: [], units: 0 };
    const spacing = Math.max(0.01, number(model.crossbarSpacing ?? 0.7));
    const count = rule.spacingBased
      ? Math.max(2, Math.ceil(width / spacing) + 1) * safeQuantity
      : Math.max(0, Math.floor(number(rule.count) * safeQuantity));
    if (rule.type === "linear") {
      const length = resolveDimension(rule.formulaA, width, depth, rule.fixedA);
      for (let i = 0; i < count; i += 1) if (length > 0) existing.linearPieces.push(length);
    } else if (rule.type === "sheet") {
      const pieceWidth = resolveDimension(rule.formulaA, width, depth, rule.fixedA);
      const pieceLength = resolveDimension(rule.formulaB, width, depth, rule.fixedB);
      if (pieceWidth > 0 && pieceLength > 0) {
        for (let i = 0; i < count; i += 1) {
          if (rule.stockWidth <= 0 || rule.stockLength <= 0) {
            warnings.push("Cadastre largura e comprimento comercial para " + rule.name + ".");
            continue;
          }
          const maxAcross = rule.stockWidth;
          const maxAlong = rule.stockLength;
          const widthCuts = Math.ceil(pieceWidth / maxAcross);
          const lengthCuts = Math.ceil(pieceLength / maxAlong);
          if (widthCuts > 1 || lengthCuts > 1) {
            warnings.push(rule.name + ": a peça foi dividida automaticamente em painéis para estimar o consumo. Confira emendas, sobreposições e folgas da ficha técnica.");
          }
          for (let wi = 0; wi < widthCuts; wi += 1) {
            const panelWidth = Math.min(maxAcross, pieceWidth - wi * maxAcross);
            for (let li = 0; li < lengthCuts; li += 1) {
              const panelLength = Math.min(maxAlong, pieceLength - li * maxAlong);
              existing.rectangles.push({ width: panelWidth, length: panelLength });
            }
          }
        }
      }
    } else {
      existing.units += count;
    }
    groups.set(key, existing);
  });

  const materialResults: MaterialResult[] = [];
  groups.forEach(({ rule, linearPieces, rectangles, units }) => {
    const scraps: Scrap[] = [];
    const notes: string[] = [];
    let stockCount = 0;
    let scrapValue = 0;
    let needed = "";
    let purchased = "";
    if (rule.type === "linear") {
      if (rule.stockLength <= 0) {
        warnings.push("Informe o comprimento comercial do material " + rule.name + ".");
        return;
      }
      const bars: { remaining: number; pieces: number }[] = [];
      linearPieces.sort((a, b) => b - a).forEach((piece) => {
        if (piece > rule.stockLength + 0.000001) {
          warnings.push(rule.name + ": corte de " + meters(piece) + " maior que a barra comercial de " + meters(rule.stockLength) + ".");
          notes.push("Uma ou mais peças não cabem em uma barra comercial.");
          return;
        }
        let target = bars.find((bar) => bar.remaining + 0.000001 >= piece + (bar.pieces > 0 ? number(rule.kerf) : 0));
        if (!target) {
          target = { remaining: rule.stockLength, pieces: 0 };
          bars.push(target);
        }
        const kerf = target.pieces > 0 ? number(rule.kerf) : 0;
        target.remaining = Math.max(0, target.remaining - piece - kerf);
        target.pieces += 1;
      });
      stockCount = bars.length;
      const totalLinear = linearPieces.reduce((sum, item) => sum + item, 0);
      needed = meters(totalLinear) + " em " + linearPieces.length + " corte(s)";
      purchased = stockCount + " barra(s) de " + meters(rule.stockLength);
      bars.forEach((bar, index) => {
        if (bar.remaining > 0.02) {
          const value = bar.remaining / rule.stockLength * number(rule.stockPrice);
          scraps.push({ material: rule.name, type: "linear", measure: meters(bar.remaining), length: bar.remaining, width: 0, quantity: 1, value, source: "Barra " + (index + 1) });
          scrapValue += value;
        } else if (bar.remaining > 0) {
          notes.push("Retalho de " + meters(bar.remaining) + " classificado como perda mínima; abaixo de 2 cm.");
        }
      });
    } else if (rule.type === "sheet") {
      if (rule.stockLength <= 0 || rule.stockWidth <= 0) {
        warnings.push("Informe as dimensões comerciais da chapa/rolo " + rule.name + ".");
        return;
      }
      const stocks: { free: { width: number; length: number }[]; usedArea: number }[] = [];
      rectangles.sort((a, b) => (b.width * b.length) - (a.width * a.length));
      rectangles.forEach((rect) => {
        let best: { stockIndex: number; freeIndex: number; rotated: boolean; score: number } | null = null;
        stocks.forEach((stock, stockIndex) => stock.free.forEach((free, freeIndex) => {
          const fits = rect.width <= free.width + 0.000001 && rect.length <= free.length + 0.000001;
          const rotates = rect.length <= free.width + 0.000001 && rect.width <= free.length + 0.000001;
          const currentBest = best as { stockIndex: number; freeIndex: number; rotated: boolean; score: number } | null;
          if (fits) {
            const score = free.width * free.length - rect.width * rect.length;
            if (!currentBest || score < currentBest.score) best = { stockIndex, freeIndex, rotated: false, score };
          }
          const latestBest = best as { stockIndex: number; freeIndex: number; rotated: boolean; score: number } | null;
          if (rotates) {
            const score = free.width * free.length - rect.width * rect.length + 0.0000001;
            if (!latestBest || score < latestBest.score) best = { stockIndex, freeIndex, rotated: true, score };
          }
        }));
        if (!best) {
          stocks.push({ free: [{ width: rule.stockWidth, length: rule.stockLength }], usedArea: 0 });
          const stockIndex = stocks.length - 1;
          best = { stockIndex, freeIndex: 0, rotated: false, score: rule.stockWidth * rule.stockLength };
        }
        const chosen = best as { stockIndex: number; freeIndex: number; rotated: boolean; score: number };
        const stock = stocks[chosen.stockIndex];
        const free = stock.free.splice(chosen.freeIndex, 1)[0];
        const placedWidth = chosen.rotated ? rect.length : rect.width;
        const placedLength = chosen.rotated ? rect.width : rect.length;
        stock.usedArea += placedWidth * placedLength;
        const kerf = number(rule.kerf);
        const rightWidth = Math.max(0, free.width - placedWidth - kerf);
        const bottomLength = Math.max(0, free.length - placedLength - kerf);
        if (rightWidth > 0.02 && placedLength > 0) stock.free.push({ width: rightWidth, length: placedLength });
        if (bottomLength > 0.02 && free.width > 0) stock.free.push({ width: free.width, length: bottomLength });
      });
      stockCount = stocks.length;
      const usedArea = rectangles.reduce((sum, rect) => sum + rect.width * rect.length, 0);
      needed = area(usedArea) + " em " + rectangles.length + " painel(is)";
      purchased = stockCount + " chapa(s)/rolo(s) de " + meters(rule.stockLength) + " × " + meters(rule.stockWidth);
      stocks.forEach((stock, index) => {
        stock.free.forEach((free) => {
          if (free.width > 0.02 && free.length > 0.02) {
            const value = (free.width * free.length) / (rule.stockWidth * rule.stockLength) * number(rule.stockPrice);
            scraps.push({ material: rule.name, type: "sheet", measure: meters(free.width) + " × " + meters(free.length) + " (" + area(free.width * free.length) + ")", length: free.length, width: free.width, quantity: 1, value, source: "Chapa/rolo " + (index + 1) });
            scrapValue += value;
          }
        });
      });
      if (stockCount > 0 && usedArea > stockCount * rule.stockWidth * rule.stockLength) warnings.push(rule.name + ": a área calculada excede o estoque comercial disponível; confira as medidas e a ficha técnica.");
    } else {
      stockCount = units;
      needed = units + " unidade(s)";
      purchased = units + " unidade(s)";
    }
    const purchasedCost = stockCount * number(rule.stockPrice);
    materialResults.push({
      name: rule.name, type: rule.type, needed, purchased, purchasedCost,
      usedCost: Math.max(0, purchasedCost - scrapValue), scrapValue, scraps, notes,
    });
  });

  const purchaseCost = materialResults.reduce((sum, item) => sum + item.purchasedCost, 0);
  const scrapValue = materialResults.reduce((sum, item) => sum + item.scrapValue, 0);
  const consumedCost = Math.max(0, purchaseCost - scrapValue);
  const totalCost = consumedCost + number(laborCost) + number(extraCost);
  const margin = Math.min(99, number(marginPercent)) / 100;
  const tax = Math.min(99, number(taxPercent)) / 100;
  const denominator = 1 - margin - tax;
  const suggestedPrice = denominator > 0 ? totalCost / denominator : totalCost;
  const estimatedProfit = suggestedPrice - totalCost - suggestedPrice * tax;
  if (denominator <= 0) warnings.push("A soma da margem e dos impostos precisa ser menor que 100% para calcular o preço sugerido.");
  if (!model.materials.length) warnings.push("Cadastre os materiais e as regras de consumo deste modelo.");
  if (model.materials.some((item) => number(item.stockPrice) <= 0)) warnings.push("Há materiais com preço cheio zerado. Preencha os preços comerciais na ficha técnica para que o orçamento e o valor das sobras sejam confiáveis.");
  return { materials: materialResults, purchaseCost, scrapValue, consumedCost, laborCost: number(laborCost), extraCost: number(extraCost), totalCost, marginPercent: number(marginPercent), taxPercent: number(taxPercent), suggestedPrice, estimatedProfit, warnings };
}

function Metric({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: typeof Calculator }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon size={16} />{label}</div><div className="mt-2 text-xl font-bold text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-500">{helper}</div></div>;
}

export function CalculatorView() {
  const access = useCompanyAccess();
  const canEditModels = access.can("editRules");
  const { records: models, setRecords: setModels, ready: modelsReady } = useCompanyRecords<CalculatorModel>("calculator_models", { enabled: canEditModels || access.can("manageQuotes") || access.can("manageProduction") });
  const { records: projects, setRecords: setProjects, ready: projectsReady } = useCompanyRecords<CalculatorProject>("calculator_projects", { enabled: access.can("manageQuotes") || access.can("manageProduction") || canEditModels });
  const [selectedModelId, setSelectedModelId] = useState("");
  const [editingModel, setEditingModel] = useState<CalculatorModel | null>(null);
  const [projectName, setProjectName] = useState("Novo projeto");
  const [width, setWidth] = useState("5");
  const [depth, setDepth] = useState("3");
  const [quantity, setQuantity] = useState("1");
  const [laborCost, setLaborCost] = useState("0");
  const [extraCost, setExtraCost] = useState("0");
  const [marginPercent, setMarginPercent] = useState("30");
  const [taxPercent, setTaxPercent] = useState("0");
  const [activeTab, setActiveTab] = useState<"project" | "models" | "history">("project");
  const [modelDraft, setModelDraft] = useState<CalculatorModel | null>(null);

  useEffect(() => {
    if (modelsReady && canEditModels && models.length === 0) {
      const now = new Date().toISOString();
      setModels(defaultModels.map((model) => ({ ...model, createdAt: now, updatedAt: now, materials: model.materials.map((material) => ({ ...material })) })));
    }
  }, [modelsReady, canEditModels, models.length, setModels]);

  useEffect(() => {
    if (!modelsReady || !canEditModels || models.length === 0) return;
    const fixedTemplate = defaultModels.find((model) => model.id === "preset-fixo-policarbonato");
    const defaultCrossbars = fixedTemplate?.materials.find((material) => material.id === "fix-travessas");
    if (!defaultCrossbars) return;
    let changed = false;
    const upgraded = models.map((model) => {
      if (model.id !== "preset-fixo-policarbonato") return model;
      const materials = model.materials.some((material) => material.id === "fix-travessas")
        ? model.materials
        : [...model.materials, { ...defaultCrossbars }];
      const crossbarSpacing = number(model.crossbarSpacing) > 0 ? model.crossbarSpacing : 0.7;
      if (materials === model.materials && crossbarSpacing === model.crossbarSpacing) return model;
      changed = true;
      return { ...model, crossbarSpacing, materials, updatedAt: new Date().toISOString() };
    });
    if (changed) setModels(upgraded);
  }, [modelsReady, canEditModels, models, setModels]);

  const availableModels = models.length ? models : (canEditModels ? defaultModels : []);
  const selectedModel = availableModels.find((model) => model.id === selectedModelId) || availableModels[0] || null;
  const parsedWidth = number(width);
  const parsedDepth = number(depth);
  const parsedQuantity = Math.max(1, Math.floor(number(quantity)));
  const result = useMemo(() => selectedModel ? calculateProject(selectedModel, parsedWidth, parsedDepth, parsedQuantity, number(laborCost), number(extraCost), number(marginPercent), number(taxPercent)) : null, [selectedModel, parsedWidth, parsedDepth, parsedQuantity, laborCost, extraCost, marginPercent, taxPercent]);

  const startNewModel = () => {
    setModelDraft({
      id: uid(), name: "Novo modelo", category: "Personalizado", description: "",
      defaultWidth: 5, defaultDepth: 3, materials: [newMaterial()], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  };
  const saveModel = () => {
    if (!modelDraft || !modelDraft.name.trim()) { toast.error("Informe o nome do modelo."); return; }
    if (!modelDraft.materials.length) { toast.error("Adicione pelo menos um material ao modelo."); return; }
    const now = new Date().toISOString();
    const clean: CalculatorModel = { ...modelDraft, name: modelDraft.name.trim(), updatedAt: now, materials: modelDraft.materials.map((item) => ({ ...item, name: item.name.trim() })) };
    const exists = models.some((model) => model.id === clean.id);
    setModels(exists ? models.map((model) => model.id === clean.id ? clean : model) : [clean, ...models]);
    setSelectedModelId(clean.id);
    setModelDraft(null);
    toast.success("Modelo salvo na empresa.");
  };
  const deleteModel = (model: CalculatorModel) => {
    if (model.id.startsWith("preset-")) {
      toast.info("Os modelos iniciais não podem ser removidos. Você pode editá-los ou criar uma cópia.");
      return;
    }
    if (!window.confirm("Excluir o modelo " + model.name + "? Os projetos já salvos serão mantidos.")) return;
    setModels(models.filter((item) => item.id !== model.id));
    if (selectedModelId === model.id) setSelectedModelId("");
    toast.success("Modelo removido.");
  };
  const saveProject = () => {
    if (!selectedModel || !result) { toast.error("Escolha um modelo de toldo."); return; }
    if (parsedWidth <= 0 || parsedDepth <= 0) { toast.error("Informe largura e avanço/altura maiores que zero."); return; }
    const project: CalculatorProject = {
      id: uid(), name: projectName.trim() || "Projeto sem nome", modelId: selectedModel.id, modelName: selectedModel.name,
      width: parsedWidth, depth: parsedDepth, quantity: parsedQuantity, laborCost: number(laborCost), extraCost: number(extraCost),
      marginPercent: number(marginPercent), taxPercent: number(taxPercent), result, createdAt: new Date().toISOString(),
    };
    setProjects([project, ...projects]);
    setActiveTab("history");
    toast.success("Projeto e relatório de sobras salvos.");
  };

  const updateMaterial = (materialId: string, patch: Partial<MaterialRule>) => {
    if (!modelDraft) return;
    setModelDraft({ ...modelDraft, materials: modelDraft.materials.map((item) => item.id === materialId ? { ...item, ...patch } : item) });
  };
  const fieldClass = "h-10 rounded-xl border-slate-200 bg-white text-sm";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

  if (!modelsReady || !projectsReady) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Carregando calculadora da empresa…</div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">Projetos e precificação</p><h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Calculadora de toldos</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Configure os modelos e materiais da empresa. Cada projeto calcula consumo, compra, sobras com medidas e valor proporcional.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setActiveTab("history")}><Layers3 size={16} className="mr-2" /> Projetos salvos ({projects.length})</Button>{canEditModels && <Button onClick={startNewModel} className="bg-orange-600 text-white hover:bg-orange-700"><Plus size={16} className="mr-2" /> Novo modelo</Button>}</div>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      <button onClick={() => setActiveTab("project")} className={"rounded-xl px-4 py-2 text-sm font-semibold " + (activeTab === "project" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100")}>Calcular projeto</button>
      {canEditModels && <button onClick={() => setActiveTab("models")} className={"rounded-xl px-4 py-2 text-sm font-semibold " + (activeTab === "models" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100")}>Modelos e materiais</button>}
      <button onClick={() => setActiveTab("history")} className={"rounded-xl px-4 py-2 text-sm font-semibold " + (activeTab === "history" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100")}>Histórico e sobras</button>
    </div>

    {activeTab === "project" && <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2"><Ruler size={18} className="text-orange-600" /><h2 className="font-bold text-slate-900">Medidas do projeto</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">Modelo de toldo<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={selectedModel?.id || ""} onChange={(event) => { setSelectedModelId(event.target.value); const model = availableModels.find((item) => item.id === event.target.value); if (model) { setWidth(String(model.defaultWidth)); setDepth(String(model.defaultDepth)); } }}><option value="">Selecione um modelo</option>{availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
          <label className="block text-xs font-semibold text-slate-600">Nome do projeto<Input className={fieldClass + " mt-1.5"} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Cobertura da garagem" /></label>
          <label className="block text-xs font-semibold text-slate-600">Largura (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0.01" step="0.01" value={width} onChange={(event) => setWidth(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-slate-600">Avanço / altura (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0.01" step="0.01" value={depth} onChange={(event) => setDepth(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-slate-600">Quantidade de toldos<Input className={fieldClass + " mt-1.5"} type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-slate-600">Mão de obra (R$)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={laborCost} onChange={(event) => setLaborCost(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-slate-600">Outros custos (R$)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={extraCost} onChange={(event) => setExtraCost(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-slate-600">Margem desejada (%)<Input className={fieldClass + " mt-1.5"} type="number" min="0" max="99" step="0.5" value={marginPercent} onChange={(event) => setMarginPercent(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-slate-600">Impostos sobre venda (%)<Input className={fieldClass + " mt-1.5"} type="number" min="0" max="99" step="0.1" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} /></label>
        </div>
        {!selectedModel && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Ainda não há modelos cadastrados. Peça ao administrador para carregar os modelos iniciais ou cadastrar um modelo.</div>}
        {selectedModel && <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{selectedModel.category}</p><p className="mt-1 text-xs leading-5 text-slate-500">{selectedModel.description || "Ficha técnica configurada pela empresa."}</p><p className="mt-2 text-xs text-slate-500">{selectedModel.materials.length} linha(s) de materiais cadastradas. Preços zerados precisam ser preenchidos pelo administrador.</p></div>}
        <div className="flex flex-wrap gap-2"><Button disabled={!result || !selectedModel} onClick={saveProject} className="bg-orange-600 text-white hover:bg-orange-700"><Save size={16} className="mr-2" /> Salvar projeto e sobras</Button><Button variant="outline" onClick={() => { setProjectName("Novo projeto"); setQuantity("1"); setLaborCost("0"); setExtraCost("0"); }}><Calculator size={16} className="mr-2" /> Limpar custos</Button></div>
      </section>
      <section className="space-y-4">
        {result && <>
          <div className="grid gap-3 sm:grid-cols-2"><Metric label="Compra de materiais" value={money(result.purchaseCost)} helper="Material comercial que precisa comprar" icon={Package} /><Metric label="Valor das sobras" value={money(result.scrapValue)} helper="Custo proporcional do material restante" icon={Scissors} /><Metric label="Custo de material consumido" value={money(result.consumedCost)} helper="Compra menos sobras aproveitáveis" icon={CircleDollarSign} /><Metric label="Preço sugerido" value={money(result.suggestedPrice)} helper={"Margem " + number(marginPercent) + "% · impostos " + number(taxPercent) + "%"} icon={Calculator} /></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Materiais deste projeto</h2><p className="mt-1 text-xs text-slate-500">As quantidades dependem da ficha técnica e das medidas comerciais configuradas.</p><div className="mt-4 space-y-4">{result.materials.map((item, index) => <div key={item.name + index} className="rounded-xl border border-slate-100 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="mt-1 text-xs text-slate-500">Necessário: {item.needed}</p><p className="text-xs text-slate-500">Compra calculada: {item.purchased}</p></div><div className="text-right"><p className="text-sm font-bold text-slate-800">{money(item.purchasedCost)}</p><p className="text-xs text-emerald-700">Sobra: {money(item.scrapValue)}</p></div></div>{item.scraps.length > 0 ? <div className="mt-3 rounded-lg bg-emerald-50 p-3"><p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-800"><Scissors size={14} /> Sobras medidas e valorizadas</p>{item.scraps.map((scrap, scrapIndex) => <div key={scrap.source + scrapIndex} className="flex flex-wrap justify-between gap-2 border-t border-emerald-100 py-2 text-xs"><span className="text-emerald-900">{scrap.source}: {scrap.measure}</span><span className="font-bold text-emerald-800">{money(scrap.value)}</span></div>)}</div> : <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Sem sobra aproveitável calculada para este material.</div>}{item.notes.map((note) => <p key={note} className="mt-2 text-xs text-amber-700">{note}</p>)}</div>)}</div></div>
          {result.warnings.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle size={16} /> Confira estas observações</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
          <div className="rounded-2xl bg-slate-900 p-5 text-white"><p className="text-xs text-slate-300">Resumo do orçamento</p><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><span>Material comprado</span><span>{money(result.purchaseCost)}</span></div><div className="flex justify-between gap-3"><span>Valor das sobras aproveitáveis</span><span>- {money(result.scrapValue)}</span></div><div className="flex justify-between gap-3"><span>Mão de obra e outros custos</span><span>{money(result.laborCost + result.extraCost)}</span></div><div className="border-t border-slate-700 pt-3"><div className="flex justify-between gap-3 font-bold"><span>Preço sugerido</span><span>{money(result.suggestedPrice)}</span></div><p className="mt-1 text-xs text-slate-400">Lucro estimado após custo e impostos: {money(result.estimatedProfit)}</p></div></div></div>
        </>}
      </section>
    </div>}

    {activeTab === "models" && canEditModels && <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-slate-900">Modelos e fichas técnicas</h2><p className="mt-1 text-sm text-slate-500">Os modelos iniciais são exemplos editáveis. Preencha preços reais e revise as regras de corte antes de usar um orçamento comercial.</p></div><Button onClick={startNewModel} className="bg-orange-600 text-white hover:bg-orange-700"><Plus size={16} className="mr-2" /> Criar modelo</Button></div>
      <div className="grid gap-3 md:grid-cols-2">{models.map((model) => <div key={model.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{model.name}</p><p className="mt-1 text-xs text-slate-500">{model.category} · {model.materials.length} materiais</p><p className="mt-1 text-xs text-slate-500">Medida de referência: {meters(model.defaultWidth)} × {meters(model.defaultDepth)}</p></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setModelDraft({ ...model, materials: model.materials.map((item) => ({ ...item })) })}><Pencil size={14} /></Button><Button size="sm" variant="outline" onClick={() => { const copy = { ...model, id: uid(), name: model.name + " (cópia)", materials: model.materials.map((item) => ({ ...item, id: uid() })), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; setModels([copy, ...models]); toast.success("Cópia do modelo criada."); }}><Copy size={14} /></Button><Button size="sm" variant="outline" onClick={() => deleteModel(model)}><Trash2 size={14} /></Button></div></div></div>)}</div>
    </section>}

    {activeTab === "history" && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-900">Projetos salvos e histórico de sobras</h2><p className="mt-1 text-sm text-slate-500">Cada registro preserva as medidas, os custos e o relatório calculado naquele momento.</p>{projects.length === 0 ? <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Nenhum projeto salvo ainda. Calcule um projeto e clique em “Salvar projeto e sobras”.</div> : <div className="mt-4 space-y-4">{projects.map((project) => <div key={project.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="font-bold text-slate-900">{project.name}</p><p className="mt-1 text-xs text-slate-500">{project.modelName} · {meters(project.width)} × {meters(project.depth)} · {project.quantity} unidade(s)</p><p className="mt-1 text-xs text-slate-500">{new Date(project.createdAt).toLocaleString("pt-BR")}</p></div><div className="text-left sm:text-right"><p className="text-lg font-bold text-slate-900">{money(project.result.suggestedPrice)}</p><p className="text-xs text-emerald-700">Sobras: {money(project.result.scrapValue)}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => { setProjectName(project.name); setSelectedModelId(project.modelId); setWidth(String(project.width)); setDepth(String(project.depth)); setQuantity(String(project.quantity)); setLaborCost(String(project.laborCost)); setExtraCost(String(project.extraCost)); setMarginPercent(String(project.marginPercent)); setTaxPercent(String(project.taxPercent)); setActiveTab("project"); }}>Reabrir medidas</Button></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{project.result.materials.map((material, index) => <div key={material.name + index} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-800">{material.name}</p><p className="mt-1 text-xs text-slate-600">Sobra valorizada: {money(material.scrapValue)}</p>{material.scraps.length > 0 ? material.scraps.map((scrap, scrapIndex) => <p key={scrap.source + scrapIndex} className="mt-1 text-xs text-emerald-700">{scrap.source}: {scrap.measure} · {money(scrap.value)}</p>) : <p className="mt-1 text-xs text-slate-500">Sem sobra aproveitável registrada.</p>}</div>)}</div></div>)}</div>}</section>}

    {modelDraft && canEditModels && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:p-6"><div className="mx-auto my-4 max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Configuração da ficha técnica</p><h2 className="mt-1 text-xl font-bold text-slate-900">{modelDraft.name}</h2><p className="mt-1 text-sm text-slate-500">Cadastre medidas comerciais, custo cheio de cada item e regra para calcular as peças do projeto.</p></div><Button variant="outline" onClick={() => setModelDraft(null)}>Fechar</Button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Nome do modelo<Input className={fieldClass + " mt-1.5"} value={modelDraft.name} onChange={(event) => setModelDraft({ ...modelDraft, name: event.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">Categoria<Input className={fieldClass + " mt-1.5"} value={modelDraft.category} onChange={(event) => setModelDraft({ ...modelDraft, category: event.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">Largura padrão (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0.01" step="0.01" value={modelDraft.defaultWidth} onChange={(event) => setModelDraft({ ...modelDraft, defaultWidth: number(event.target.value) })} /></label><label className="block text-xs font-semibold text-slate-600">Avanço/altura padrão (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0.01" step="0.01" value={modelDraft.defaultDepth} onChange={(event) => setModelDraft({ ...modelDraft, defaultDepth: number(event.target.value) })} /></label><label className="block text-xs font-semibold text-slate-600">Distância máxima entre travessas (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0.1" step="0.05" value={modelDraft.crossbarSpacing ?? 0.7} onChange={(event) => setModelDraft({ ...modelDraft, crossbarSpacing: Math.max(0.1, number(event.target.value)) })} /><span className="mt-1 block font-normal text-slate-500">Ex.: 0,70 m, 0,80 m ou 1,00 m. A quantidade é recalculada pela largura.</span></label><label className="block text-xs font-semibold text-slate-600 sm:col-span-2">Descrição e observações<Input className={fieldClass + " mt-1.5"} value={modelDraft.description} onChange={(event) => setModelDraft({ ...modelDraft, description: event.target.value })} /></label></div>
      <div className="mt-6 flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">Materiais e regras de consumo</h3><Button size="sm" variant="outline" onClick={() => setModelDraft({ ...modelDraft, materials: [...modelDraft.materials, newMaterial()] })}><Plus size={14} className="mr-1" /> Adicionar material</Button></div>
      <div className="mt-3 space-y-4">{modelDraft.materials.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-800">Material {index + 1}</p><Button size="sm" variant="ghost" onClick={() => setModelDraft({ ...modelDraft, materials: modelDraft.materials.filter((material) => material.id !== item.id) })}><Trash2 size={14} className="mr-1" /> Remover</Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="block text-xs font-semibold text-slate-600">Nome do material<Input className={fieldClass + " mt-1.5"} value={item.name} onChange={(event) => updateMaterial(item.id, { name: event.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">Tipo<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={item.type} onChange={(event) => updateMaterial(item.id, { type: event.target.value as MaterialType })}><option value="linear">Barra/perfil linear</option><option value="sheet">Chapa/lona/rolo</option><option value="unit">Unidade/acessório</option></select></label><label className="block text-xs font-semibold text-slate-600">Comprimento comercial (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={item.stockLength} onChange={(event) => updateMaterial(item.id, { stockLength: number(event.target.value) })} /></label><label className="block text-xs font-semibold text-slate-600">Largura comercial (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={item.stockWidth} onChange={(event) => updateMaterial(item.id, { stockWidth: number(event.target.value) })} /></label><label className="block text-xs font-semibold text-slate-600">Preço cheio por barra/chapa/unidade (R$)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={item.stockPrice} onChange={(event) => updateMaterial(item.id, { stockPrice: number(event.target.value) })} /></label><label className="block text-xs font-semibold text-slate-600">Quantidade de peças por toldo<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="1" value={item.count} onChange={(event) => updateMaterial(item.id, { count: number(event.target.value) })} /></label>{item.type === "linear" && <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(item.spacingBased)} onChange={(event) => updateMaterial(item.id, { spacingBased: event.target.checked })} /> Calcular quantidade pela distância entre travessas</label>}<label className="block text-xs font-semibold text-slate-600">Fórmula da medida A<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={item.formulaA} onChange={(event) => updateMaterial(item.id, { formulaA: event.target.value as DimensionFormula })}>{dimensionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{item.type === "sheet" && <label className="block text-xs font-semibold text-slate-600">Fórmula da medida B<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={item.formulaB} onChange={(event) => updateMaterial(item.id, { formulaB: event.target.value as DimensionFormula })}>{dimensionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}{item.formulaA === "fixed" && <label className="block text-xs font-semibold text-slate-600">Medida fixa A (m/un.)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={item.fixedA} onChange={(event) => updateMaterial(item.id, { fixedA: number(event.target.value) })} /></label>}{item.type === "sheet" && item.formulaB === "fixed" && <label className="block text-xs font-semibold text-slate-600">Medida fixa B (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={item.fixedB} onChange={(event) => updateMaterial(item.id, { fixedB: number(event.target.value) })} /></label>}{item.type === "linear" && <label className="block text-xs font-semibold text-slate-600">Perda da serra por corte (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.001" value={item.kerf} onChange={(event) => updateMaterial(item.id, { kerf: number(event.target.value) })} /></label>}</div><p className="mt-3 text-xs leading-5 text-slate-500">{item.type === "linear" ? "O sistema combina os cortes em barras comerciais e mostra o comprimento restante de cada barra. {item.spacingBased ? "A quantidade é calculada automaticamente pela largura do toldo e pela distância máxima configurada entre travessas." : "A quantidade usa o valor informado na ficha técnica."}" : item.type === "sheet" ? "O sistema monta painéis retangulares, divide automaticamente medidas maiores que a chapa/rolo e lista cada retalho retangular. Ajuste a ficha para considerar emendas e folgas reais." : "O sistema calcula o número de unidades e o custo conforme a quantidade cadastrada."}</p></div>)}</div>
      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row"><Button variant="outline" onClick={() => setModelDraft(null)}>Cancelar</Button><Button onClick={saveModel} className="bg-orange-600 text-white hover:bg-orange-700"><Save size={16} className="mr-2" /> Salvar ficha técnica</Button></div>
    </div></div>}
  </div>;
}
