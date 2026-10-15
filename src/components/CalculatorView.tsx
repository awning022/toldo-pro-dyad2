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
  allowRotation?: boolean;
};
type CalculatorModel = {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultWidth: number;
  defaultDepth: number;
  crossbarSpacing?: number;
  laborCost?: number;
  extraCost?: number;
  marginPercent?: number;
  taxPercent?: number;
  materials: MaterialRule[];
  createdAt: string;
  updatedAt: string;
};
type CalculatorProject = {
  id: string;
  heightDrop?: number;
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
type CalculationResult = { materials: MaterialResult[]; purchaseCost: number; scrapValue: number; consumedCost: number; laborCost: number; extraCost: number; totalCost: number; marginPercent: number; taxPercent: number; suggestedPrice: number; estimatedProfit: number; warnings: string[]; blocked?: boolean };

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
    description: "Calcula peças inteiras, agrupa traseiro, frontal e travessas no mesmo perfil comercial, reaproveita sobras e mantém os pés separados.",
    defaultWidth: 5, defaultDepth: 3, crossbarSpacing: 0.7, laborCost: 0, extraCost: 0, marginPercent: 30, taxPercent: 0, createdAt: "", updatedAt: "",
    materials: [
      { ...newMaterial("Policarbonato alveolar 6 mm fumê"), id: "fix-chapa", type: "sheet", stockLength: 6, stockWidth: 2.1, formulaA: "width", formulaB: "depth", count: 1, kerf: 0.003, allowRotation: false },
      { ...newMaterial("Perfil principal de alumínio (traseiro, frontal e travessas)"), id: "fix-perfil-principal", type: "linear", stockLength: 6, formulaA: "width", count: 1, kerf: 0 },
      { ...newMaterial("Pés de alumínio (perfil separado)"), id: "fix-pes", type: "linear", stockLength: 6, formulaA: "fixed", fixedA: 2.5, count: 2, kerf: 0.003 },
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
  let blocked = false;
  const groups = new Map<string, { rule: MaterialRule; linearPieces: number[]; rectangles: { width: number; length: number }[]; units: number }>();
  const safeQuantity = Math.max(1, Math.floor(quantity));
  model.materials.forEach((rule) => {
    const key = [rule.type, rule.name.trim().toLowerCase(), number(rule.stockLength), number(rule.stockWidth), number(rule.stockPrice), number(rule.kerf), rule.allowRotation !== false].join("|");
    const existing = groups.get(key) || { rule, linearPieces: [], rectangles: [], units: 0 };
    const spacing = Math.max(0.01, number(model.crossbarSpacing ?? 0.7));
    const count = rule.spacingBased
      ? Math.max(2, Math.ceil(width / spacing) + 1) * safeQuantity
      : Math.max(0, Math.floor(number(rule.count) * safeQuantity));
    if (rule.type === "linear") {
      if (rule.id === "fix-perfil-principal") {
        const crossbarCount = Math.max(2, Math.ceil(width / spacing) + 1) * safeQuantity;
        for (let i = 0; i < 2 * safeQuantity; i += 1) if (width > 0) existing.linearPieces.push(width);
        for (let i = 0; i < crossbarCount; i += 1) if (depth > 0) existing.linearPieces.push(depth);
      } else {
        const length = resolveDimension(rule.formulaA, width, depth, rule.fixedA);
        for (let i = 0; i < count; i += 1) if (length > 0) existing.linearPieces.push(length);
      }
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
          if (pieceLength > maxAlong + 0.000001) {
            blocked = true;
            warnings.push(rule.name + ": o avanço da peça (" + meters(pieceLength) + ") excede o comprimento comercial (" + meters(maxAlong) + "). Não foi criada emenda; o preço final foi bloqueado. Ajuste a chapa comercial ou as medidas.");
            continue;
          }
          const widthCuts = Math.ceil(pieceWidth / maxAcross);
          if (widthCuts > 1) {
            warnings.push(rule.name + ": a largura precisa de painéis lado a lado; o avanço de cada painel permanece inteiro, sem emenda no sentido do avanço.");
          }
          for (let wi = 0; wi < widthCuts; wi += 1) {
            const panelWidth = Math.min(maxAcross, pieceWidth - wi * maxAcross);
            existing.rectangles.push({ width: panelWidth, length: pieceLength });
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
        blocked = true;
        warnings.push("Informe o comprimento comercial do material " + rule.name + ".");
        return;
      }
      const bars: { remaining: number; pieces: number }[] = [];
      linearPieces.sort((a, b) => b - a).forEach((piece) => {
        if (piece > rule.stockLength + 0.000001) {
          blocked = true;
          warnings.push(rule.name + ": corte de " + meters(piece) + " maior que a barra comercial de " + meters(rule.stockLength) + ". Não é permitido emendar a peça; ajuste a medida ou o perfil comercial.");
          notes.push("Uma ou mais peças não cabem em uma barra comercial; o preço final foi bloqueado.");
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
      if (rule.id === "fix-perfil-principal") {
        const crossbarCount = Math.max(2, Math.ceil(width / Math.max(0.01, number(model.crossbarSpacing ?? 0.7))) + 1) * safeQuantity;
        notes.push("Plano de corte sem emendas: 2 perfil(is) de largura (traseiro e frontal) de " + meters(width) + " + " + crossbarCount + " travessa(s) de " + meters(depth) + ".");
      } else if (rule.id === "fix-pes") {
        notes.push("Pés calculados separadamente: " + linearPieces.length + " corte(s) inteiro(s), sem emendas.");
      }
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
        blocked = true;
        warnings.push("Informe as dimensões comerciais da chapa/rolo " + rule.name + ".");
        return;
      }
      const stocks: { free: { width: number; length: number }[]; usedArea: number }[] = [];
      rectangles.sort((a, b) => (b.width * b.length) - (a.width * a.length));
      rectangles.forEach((rect) => {
        let best: { stockIndex: number; freeIndex: number; rotated: boolean; score: number } | null = null;
        stocks.forEach((stock, stockIndex) => stock.free.forEach((free, freeIndex) => {
          const fits = rect.width <= free.width + 0.000001 && rect.length <= free.length + 0.000001;
          const rotates = rule.allowRotation !== false && rect.length <= free.width + 0.000001 && rect.width <= free.length + 0.000001;
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
  if (denominator <= 0) { blocked = true; warnings.push("A soma da margem e dos impostos precisa ser menor que 100% para calcular o preço sugerido."); }
  if (!model.materials.length) warnings.push("Cadastre os materiais e as regras de consumo deste modelo.");
  if (model.materials.some((item) => number(item.stockPrice) <= 0)) warnings.push("Há materiais com preço cheio zerado. Preencha os preços comerciais na ficha técnica para que o orçamento e o valor das sobras sejam confiáveis.");
  return { materials: materialResults, purchaseCost, scrapValue, consumedCost, laborCost: number(laborCost), extraCost: number(extraCost), totalCost, marginPercent: number(marginPercent), taxPercent: number(taxPercent), suggestedPrice, estimatedProfit, warnings, blocked };
}

function ThreeDPreview({ model, width, depth, heightDrop, quantity }: { model: CalculatorModel; width: number; depth: number; heightDrop: number; quantity: number }) {
  const angle = Math.atan2(Math.max(0, heightDrop), Math.max(0.01, depth)) * 180 / Math.PI;
  const spacing = Math.max(0.1, number(model.crossbarSpacing ?? 0.7));
  const crossbars = Math.max(1, Math.ceil(width / spacing) + 1);
  const roof = model.name.toLowerCase().includes("vertical") || model.name.toLowerCase().includes("cortina");
  const leftRear = { x: 132, y: 70 };
  const rightRear = { x: 490, y: 70 };
  const frontY = 190 + Math.min(45, heightDrop * 12);
  const leftFront = { x: 178, y: frontY };
  const rightFront = { x: 536, y: frontY };
  const groundY = Math.min(320, frontY + 78);
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const point = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  const ribs = Array.from({ length: Math.max(0, Math.min(8, crossbars - 2)) }, (_, index) => {
    const t = (index + 1) / (Math.min(8, crossbars - 2) + 1);
    const back = { x: leftRear.x + (rightRear.x - leftRear.x) * t, y: leftRear.y };
    const front = { x: leftFront.x + (rightFront.x - leftFront.x) * t, y: leftFront.y };
    return { back, front };
  });
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
      <div><p className="text-xs font-bold uppercase tracking-wide text-orange-600">Visualização técnica 3D</p><h3 className="mt-1 text-base font-bold text-slate-900">{model.name}</h3><p className="mt-1 text-xs text-slate-500">Esquema visual proporcional às medidas informadas</p></div>
      <div className="rounded-xl bg-orange-50 px-3 py-2 text-right"><p className="text-[10px] font-semibold text-orange-700">Inclinação calculada</p><p className="text-xl font-extrabold text-orange-700">{fmt(angle)}°</p></div>
    </div>
    <div className="bg-gradient-to-b from-slate-50 to-white p-2 sm:p-4">
      <svg viewBox="0 0 640 355" role="img" aria-label={`Desenho 3D ilustrativo de ${model.name}, largura ${width} metros, avanço ${depth} metros e inclinação ${fmt(angle)} graus`} className="h-auto w-full">
        <defs><linearGradient id="roofShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#c9e6f6" /><stop offset="100%" stopColor="#7bb7d9" /></linearGradient><linearGradient id="metalShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#64748b" /><stop offset="50%" stopColor="#cbd5e1" /><stop offset="100%" stopColor="#475569" /></linearGradient></defs>
        <path d="M35 300 L590 300" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="5 5" />
        <polygon points={`${point(leftRear)} ${point(rightRear)} ${rightFront.x},${rightFront.y - Math.min(30, heightDrop * 8)} ${leftFront.x},${leftFront.y - Math.min(30, heightDrop * 8)}`} fill="#dbeafe" opacity="0.45" />
        <polygon points={`${point(leftRear)} ${point(rightRear)} ${point(rightFront)} ${point(leftFront)}`} fill="url(#roofShade)" stroke="#477c9f" strokeWidth="2" />
        {ribs.map((rib, index) => <line key={index} x1={rib.back.x} y1={rib.back.y} x2={rib.front.x} y2={rib.front.y} stroke="#477c9f" strokeWidth="2" opacity="0.9" />)}
        <line x1={leftRear.x} y1={leftRear.y} x2={leftFront.x} y2={leftFront.y} stroke="url(#metalShade)" strokeWidth="8" strokeLinecap="round" />
        <line x1={rightRear.x} y1={rightRear.y} x2={rightFront.x} y2={rightFront.y} stroke="url(#metalShade)" strokeWidth="8" strokeLinecap="round" />
        <line x1={leftRear.x} y1={leftRear.y} x2={rightRear.x} y2={rightRear.y} stroke="url(#metalShade)" strokeWidth="9" strokeLinecap="round" />
        <line x1={leftFront.x} y1={leftFront.y} x2={rightFront.x} y2={rightFront.y} stroke="url(#metalShade)" strokeWidth="9" strokeLinecap="round" />
        {!roof && <>
          <line x1={leftFront.x} y1={leftFront.y} x2={leftFront.x} y2={groundY} stroke="url(#metalShade)" strokeWidth="12" strokeLinecap="round" />
          <line x1={rightFront.x} y1={rightFront.y} x2={rightFront.x} y2={groundY} stroke="url(#metalShade)" strokeWidth="12" strokeLinecap="round" />
          <path d={`M${leftFront.x - 17} ${groundY} h34 M${rightFront.x - 17} ${groundY} h34`} stroke="#475569" strokeWidth="5" strokeLinecap="round" />
          <circle cx={leftFront.x} cy={groundY} r="4" fill="#f97316" /><circle cx={rightFront.x} cy={groundY} r="4" fill="#f97316" />
        </>}
        <line x1={leftRear.x} y1={leftRear.y - 14} x2={rightRear.x} y2={rightRear.y - 14} stroke="#f97316" strokeWidth="1.5" />
        <line x1={leftRear.x} y1={leftRear.y - 21} x2={leftRear.x} y2={leftRear.y - 7} stroke="#f97316" strokeWidth="1.5" />
        <line x1={rightRear.x} y1={rightRear.y - 21} x2={rightRear.x} y2={rightRear.y - 7} stroke="#f97316" strokeWidth="1.5" />
        <text x="310" y="48" fill="#c2410c" fontSize="13" fontWeight="700" textAnchor="middle">Largura: {fmt(width)} m</text>
        <line x1={rightFront.x + 17} y1={rightFront.y} x2={rightRear.x + 17} y2={rightRear.y} stroke="#0f766e" strokeWidth="1.5" />
        <text x="570" y={(rightFront.y + rightRear.y) / 2} fill="#0f766e" fontSize="12" fontWeight="700" transform={`rotate(-${Math.max(0, Math.min(35, angle + 20))} 570 ${(rightFront.y + rightRear.y) / 2})`}>Avanço {fmt(depth)} m</text>
        <text x="320" y="337" fill="#64748b" fontSize="11" textAnchor="middle">{roof ? "Guias / tubo / perfil inferior — esquema vertical" : "Estrutura, travessas, pés e chapas de base — esquema ilustrativo"}</text>
        <text x="45" y="22" fill="#64748b" fontSize="10">VISTA ISOMÉTRICA • NÃO EXECUTIVA</text>
      </svg>
    </div>
    <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Dimensão</p><p className="mt-1 text-sm font-bold text-slate-800">{fmt(width)} × {fmt(depth)} m</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Desnível informado</p><p className="mt-1 text-sm font-bold text-slate-800">{fmt(heightDrop)} m</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Quantidade</p><p className="mt-1 text-sm font-bold text-slate-800">{quantity} unidade(s) · {crossbars} travessas estimadas</p></div>
    </div>
    <p className="px-4 pb-4 text-[11px] leading-5 text-amber-800">Importante: desenho esquemático, não é projeto estrutural nem gabarito de fabricação. A inclinação é calculada pelo desnível informado; dimensionamento de perfis, ancoragens, pés, vento e cargas deve ser confirmado por responsável técnico antes do corte e da instalação.</p>
  </section>;
}

function Metric({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: typeof Calculator }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon size={16} />{label}</div><div className="mt-2 text-xl font-bold text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-500">{helper}</div></div>;
}

export function CalculatorView() {
  const access = useCompanyAccess();
  const canEditModels = access.can("editRules");
  const { records: models, setRecords: setModels, ready: modelsReady } = useCompanyRecords<CalculatorModel>("calculator_models", { enabled: canEditModels || access.can("manageQuotes") });
  const { records: projects, setRecords: setProjects, ready: projectsReady } = useCompanyRecords<CalculatorProject>("calculator_projects", { enabled: access.can("manageQuotes") || canEditModels });
  const [width, setWidth] = useState("5");
  const [depth, setDepth] = useState("3");
  const [projectName, setProjectName] = useState("Cobertura fixa");
  const [activeTab, setActiveTab] = useState<"calculate" | "settings" | "history">("calculate");
  const [modelDraft, setModelDraft] = useState<CalculatorModel | null>(null);

  const fixedTemplate = defaultModels.find((model) => model.id === "preset-fixo-policarbonato")!;
  useEffect(() => {
    if (!modelsReady || !canEditModels) return;
    const existing = models.find((model) => model.id === fixedTemplate.id);
    const now = new Date().toISOString();
    if (!existing) {
      setModels([...models, { ...fixedTemplate, createdAt: now, updatedAt: now, materials: fixedTemplate.materials.map((material) => ({ ...material })) }]);
      return;
    }
    // Atualiza a ficha técnica padrão sem apagar preços e dimensões comerciais que a empresa já configurou.
    const existingById = new Map(existing.materials.map((material) => [material.id, material]));
    const legacyProfileOptions = [existingById.get("fix-frontal"), existingById.get("fix-travessas"), existingById.get("fix-traseiro")].filter(Boolean) as MaterialRule[];
    const legacyProfile = legacyProfileOptions.find((item) => number(item.stockPrice) > 0) || legacyProfileOptions[0];
    const migratedMaterials = fixedTemplate.materials.map((templateMaterial) => {
      let saved = existingById.get(templateMaterial.id);
      if (templateMaterial.id === "fix-perfil-principal") saved = legacyProfile || saved;
      if (!saved) return { ...templateMaterial };
      existingById.delete(templateMaterial.id);
      return {
        ...templateMaterial,
        stockPrice: saved.stockPrice,
        stockLength: saved.stockLength || templateMaterial.stockLength,
        stockWidth: saved.stockWidth || templateMaterial.stockWidth,
      };
    });
    // Remove linhas antigas separadas (agora o perfil principal é único), mas preserva materiais personalizados.
    ["fix-traseiro", "fix-frontal", "fix-travessas", "fix-lateral", "fix-calha"].forEach((id) => existingById.delete(id));
    migratedMaterials.push(...existingById.values());
    const needsMigration = JSON.stringify(existing.materials) !== JSON.stringify(migratedMaterials)
      || existing.crossbarSpacing == null || existing.laborCost == null || existing.extraCost == null
      || existing.marginPercent == null || existing.taxPercent == null;
    if (needsMigration) {
      setModels(models.map((model) => model.id === fixedTemplate.id
        ? { ...model, name: fixedTemplate.name, crossbarSpacing: model.crossbarSpacing ?? fixedTemplate.crossbarSpacing,
            laborCost: model.laborCost ?? fixedTemplate.laborCost, extraCost: model.extraCost ?? fixedTemplate.extraCost,
            marginPercent: model.marginPercent ?? fixedTemplate.marginPercent, taxPercent: model.taxPercent ?? fixedTemplate.taxPercent,
            materials: migratedMaterials, updatedAt: now }
        : model));
    }
  }, [modelsReady, canEditModels, models, setModels]);

  const selectedModel = models.find((model) => model.id === fixedTemplate.id) || fixedTemplate;
  const parsedWidth = number(width);
  const parsedDepth = number(depth);
  const parsedMargin = Math.min(99, number(selectedModel.marginPercent ?? 30));
  const configuredLabor = number(selectedModel.laborCost);
  const configuredExtras = number(selectedModel.extraCost);
  const configuredTax = number(selectedModel.taxPercent);
  const result = useMemo(
    () => calculateProject(selectedModel, parsedWidth, parsedDepth, 1, configuredLabor, configuredExtras, parsedMargin, configuredTax),
    [selectedModel, parsedWidth, parsedDepth, configuredLabor, configuredExtras, parsedMargin, configuredTax],
  );
  const priceConfigured = selectedModel.materials.length > 0 && selectedModel.materials.every((material) => number(material.stockPrice) > 0);
  const fieldClass = "h-10 rounded-xl border-slate-200 bg-white text-sm";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

  const updateDraftMaterial = (materialId: string, patch: Partial<MaterialRule>) => {
    if (!modelDraft) return;
    setModelDraft({ ...modelDraft, materials: modelDraft.materials.map((material) => material.id === materialId ? { ...material, ...patch } : material) });
  };
  const saveSettings = () => {
    if (!modelDraft) return;
    if (!modelDraft.materials.length) { toast.error("Cadastre pelo menos um material."); return; }
    if (modelDraft.materials.some((material) => !material.name.trim())) { toast.error("Todos os materiais precisam ter um nome."); return; }
    const clean = { ...modelDraft, name: "Cobertura fixa de alumínio e policarbonato", updatedAt: new Date().toISOString(), materials: modelDraft.materials.map((material) => ({ ...material, name: material.name.trim() })) };
    setModels(models.some((model) => model.id === clean.id) ? models.map((model) => model.id === clean.id ? clean : model) : [...models, clean]);
    setModelDraft(null);
    toast.success("Configuração de materiais salva para esta empresa.");
  };
  const saveProject = () => {
    if (parsedWidth <= 0 || parsedDepth <= 0) { toast.error("Informe a largura e o avanço em metros."); return; }
    if (result.blocked) { toast.error("O cálculo está bloqueado porque há material que não cabe sem emenda ou uma regra de preço inválida. Corrija os avisos antes de salvar."); return; }
    if (!priceConfigured) { toast.error("Preencha o preço comercial de todos os materiais na aba Configuração antes de salvar o orçamento."); setActiveTab("settings"); return; }
    const project: CalculatorProject = {
      id: uid(), name: projectName.trim() || "Cobertura fixa", modelId: selectedModel.id, modelName: selectedModel.name,
      width: parsedWidth, depth: parsedDepth, heightDrop: 0, quantity: 1, laborCost: configuredLabor, extraCost: configuredExtras,
      marginPercent: parsedMargin, taxPercent: configuredTax, result, createdAt: new Date().toISOString(),
    };
    setProjects([project, ...projects]);
    toast.success("Cálculo salvo no histórico.");
    setActiveTab("history");
  };

  if (!modelsReady || !projectsReady) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Carregando calculadora…</div>;

  const formatDimension = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + " m";
  const materialUnitLabel = (material: MaterialRule) => material.type === "linear" ? "barra/perfil comercial" : material.type === "sheet" ? "chapa/placa comercial" : "unidade";
  const materialFormulaLabel = (formula: DimensionFormula) => formula === "width" ? "largura" : formula === "depth" ? "avanço" : "medida fixa";

  return <div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">Cálculo rápido</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Cobertura fixa</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Informe largura e avanço. A calculadora estima os materiais cadastrados, cortes sem emendas, sobras e preço sugerido com base na configuração da sua empresa.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setActiveTab("history")}><Layers3 size={16} className="mr-2" /> Histórico ({projects.length})</Button>
        {canEditModels && <Button variant={activeTab === "settings" ? "default" : "outline"} onClick={() => { setModelDraft({ ...selectedModel, materials: selectedModel.materials.map((material) => ({ ...material })) }); setActiveTab("settings"); }}><Pencil size={16} className="mr-2" /> Configurar materiais</Button>}
      </div>
    </header>

    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      <button onClick={() => setActiveTab("calculate")} className={"rounded-xl px-4 py-2 text-sm font-semibold " + (activeTab === "calculate" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100")}>Calcular</button>
      {canEditModels && <button onClick={() => { if (!modelDraft) setModelDraft({ ...selectedModel, materials: selectedModel.materials.map((material) => ({ ...material })) }); setActiveTab("settings"); }} className={"rounded-xl px-4 py-2 text-sm font-semibold " + (activeTab === "settings" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100")}>Configuração</button>}
      <button onClick={() => setActiveTab("history")} className={"rounded-xl px-4 py-2 text-sm font-semibold " + (activeTab === "history" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100")}>Histórico</button>
    </nav>

    {activeTab === "calculate" && <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-3 text-orange-700"><Ruler size={22} /></div>
          <div><h2 className="text-lg font-bold text-slate-900">1. Medidas da cobertura</h2><p className="text-xs text-slate-500">Todas as medidas em metros</p></div>
        </div>
        <label className="block text-xs font-semibold text-slate-600">Nome do projeto (opcional)<Input className={fieldClass + " mt-1.5"} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Garagem da frente" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">Largura (m)<Input className="mt-1.5 h-14 rounded-xl border-slate-200 text-xl font-bold" type="number" min="0.01" step="0.01" value={width} onChange={(event) => setWidth(event.target.value)} placeholder="Ex.: 5" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Medida de um lado ao outro</span></label>
          <label className="block text-xs font-semibold text-slate-600">Avanço (m)<Input className="mt-1.5 h-14 rounded-xl border-slate-200 text-xl font-bold" type="number" min="0.01" step="0.01" value={depth} onChange={(event) => setDepth(event.target.value)} placeholder="Ex.: 3" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Da parede até a parte da frente</span></label>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-xs font-semibold text-orange-800">Área estimada</p>
          <p className="mt-1 text-3xl font-extrabold text-orange-900">{(parsedWidth * parsedDepth).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</p>
          <p className="mt-1 text-xs text-orange-800">Cálculo para 1 cobertura fixa de alumínio com policarbonato.</p>
        </div>
        {!priceConfigured && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold">Falta configurar os preços</p><p className="mt-1 text-xs leading-5">O cálculo de cortes aparece, mas o preço final só fica confiável depois de cadastrar o preço de compra de cada material.</p>{canEditModels && <Button className="mt-3 bg-orange-600 text-white hover:bg-orange-700" onClick={() => { setModelDraft({ ...selectedModel, materials: selectedModel.materials.map((material) => ({ ...material })) }); setActiveTab("settings"); }}>Configurar agora</Button>}</div>}
        <Button disabled={parsedWidth <= 0 || parsedDepth <= 0} className="w-full bg-orange-600 py-6 text-base font-bold text-white hover:bg-orange-700" onClick={saveProject}><Save size={18} className="mr-2" /> Salvar cálculo no histórico</Button>
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Material para comprar" value={money(result.purchaseCost)} helper="Custo total dos itens comerciais" icon={Package} />
          <Metric label="Sobras estimadas" value={money(result.scrapValue)} helper="Valor proporcional de retalhos aproveitáveis" icon={Scissors} />
          <Metric label="Custo estimado usado" value={money(result.totalCost)} helper="Material consumido + custos opcionais" icon={CircleDollarSign} />
          <Metric label="Preço sugerido" value={result.blocked ? "Corrija os avisos" : priceConfigured ? money(result.suggestedPrice) : "Configure os preços"} helper={priceConfigured ? "Margem configurada: " + parsedMargin + "%" : "Não é exibido como valor confiável"} icon={Calculator} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">2. Lista de materiais</h2><p className="mt-1 text-xs text-slate-500">Estimativa gerada pelas regras cadastradas na configuração.</p></div><Package className="text-orange-600" size={21} /></div>
          <div className="mt-4 space-y-3">
            {result.materials.map((material, index) => <article key={material.name + index} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">{material.name}</h3><p className="mt-1 text-xs text-slate-500">Necessário: {material.needed}</p><p className="text-xs text-slate-500">Comprar: {material.purchased}</p></div><div className="text-right"><p className="text-sm font-bold text-slate-900">{money(material.purchasedCost)}</p><p className="text-xs text-emerald-700">Sobra: {money(material.scrapValue)}</p></div></div>
              {material.scraps.length > 0 && <div className="mt-3 rounded-lg bg-emerald-50 p-3"><p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-800"><Scissors size={14} /> Sobras aproveitáveis</p>{material.scraps.map((scrap, scrapIndex) => <div key={scrap.source + scrapIndex} className="flex flex-wrap justify-between gap-2 border-t border-emerald-100 py-2 text-xs"><span className="text-emerald-900">{scrap.source}: {scrap.measure}</span><span className="font-bold text-emerald-800">{money(scrap.value)}</span></div>)}</div>}
              {material.notes.map((note) => <p key={note} className="mt-2 text-xs text-amber-700">{note}</p>)}
            </article>)}
          </div>
          {result.warnings.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle size={16} /> Atenção</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        </div>
        <div className="rounded-2xl bg-slate-900 p-5 text-white"><p className="text-xs text-slate-300">Resumo</p><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><span>Compra dos materiais</span><span>{money(result.purchaseCost)}</span></div><div className="flex justify-between gap-3"><span>Valor estimado das sobras</span><span>- {money(result.scrapValue)}</span></div><div className="flex justify-between gap-3"><span>Mão de obra e extras</span><span>{money(configuredLabor + configuredExtras)}</span></div><div className="border-t border-slate-700 pt-3"><div className="flex justify-between gap-3 font-bold"><span>Preço sugerido</span><span>{result.blocked ? "Cálculo bloqueado" : priceConfigured ? money(result.suggestedPrice) : "Pendente de configuração"}</span></div><p className="mt-1 text-xs text-slate-400">Preço estimado com margem de {parsedMargin}% e impostos de {configuredTax}%.</p></div></div></div>
      </section>
    </div>}

    {activeTab === "settings" && canEditModels && <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">Configuração da empresa</p><h2 className="mt-1 text-xl font-bold text-slate-900">Materiais da cobertura fixa</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Cadastre os preços comerciais, mão de obra, extras, impostos e margem aqui. O perfil principal é calculado em conjunto (traseiro + frontal + travessas); os pés ficam separados. As configurações são salvas por empresa.</p></div><Button variant="outline" onClick={() => { setModelDraft({ ...selectedModel, materials: selectedModel.materials.map((material) => ({ ...material })) }); toast.info("Configuração recarregada. Alterações não salvas foram descartadas."); }}>Descartar alterações</Button></div>
      {modelDraft && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Espaçamento entre travessas (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0.1" step="0.05" value={String(modelDraft.crossbarSpacing ?? 0.7)} onChange={(event) => setModelDraft({ ...modelDraft, crossbarSpacing: number(event.target.value) || 0.7 })} /><span className="mt-1 block text-[11px] font-normal text-slate-500">Define quantas travessas são calculadas automaticamente.</span></label>
        <label className={labelClass}>Mão de obra total (R$)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={String(modelDraft.laborCost ?? 0)} onChange={(event) => setModelDraft({ ...modelDraft, laborCost: number(event.target.value) })} /></label>
        <label className={labelClass}>Outros custos (R$)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={String(modelDraft.extraCost ?? 0)} onChange={(event) => setModelDraft({ ...modelDraft, extraCost: number(event.target.value) })} /></label>
        <label className={labelClass}>Impostos (%)<Input className={fieldClass + " mt-1.5"} type="number" min="0" max="99" step="0.5" value={String(modelDraft.taxPercent ?? 0)} onChange={(event) => setModelDraft({ ...modelDraft, taxPercent: number(event.target.value) })} /></label>
        <label className={labelClass}>Margem de lucro (%)<Input className={fieldClass + " mt-1.5"} type="number" min="0" max="99" step="1" value={String(modelDraft.marginPercent ?? 30)} onChange={(event) => setModelDraft({ ...modelDraft, marginPercent: number(event.target.value) })} /></label>
      </div>}
      {!modelDraft && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Clique em “Editar configuração” para alterar os materiais.</div>}
      {modelDraft && <div className="space-y-4">{modelDraft.materials.map((material, index) => <article key={material.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">Material {index + 1}</p><h3 className="mt-1 text-base font-bold text-slate-900">{material.name}</h3><p className="mt-1 text-xs text-slate-500">Preço do item comercial completo: {money(number(material.stockPrice))}</p></div><Button variant="outline" size="sm" onClick={() => setModelDraft({ ...modelDraft, materials: modelDraft.materials.filter((item) => item.id !== material.id) })}><Trash2 size={14} className="mr-1" /> Remover</Button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>Nome do material<Input className={fieldClass + " mt-1.5"} value={material.name} onChange={(event) => updateDraftMaterial(material.id, { name: event.target.value })} placeholder="Ex.: Calha frontal" /></label>
          <label className={labelClass}>Tipo<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={material.type} onChange={(event) => updateDraftMaterial(material.id, { type: event.target.value as MaterialType })}><option value="linear">Perfil, barra ou calha</option><option value="sheet">Chapa de policarbonato</option><option value="unit">Acessório por unidade</option></select></label>
          {material.type !== "unit" && <label className={labelClass}>Comprimento comercial (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={String(material.stockLength)} onChange={(event) => updateDraftMaterial(material.id, { stockLength: number(event.target.value) })} /></label>}
          {material.type === "sheet" && <label className={labelClass}>Largura comercial (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={String(material.stockWidth)} onChange={(event) => updateDraftMaterial(material.id, { stockWidth: number(event.target.value) })} /></label>}
          {material.type === "sheet" && <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={material.allowRotation !== false} onChange={(event) => updateDraftMaterial(material.id, { allowRotation: event.target.checked })} /> Permitir girar a peça em 90°</label>}
          <label className={labelClass}>Preço de compra (R$)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={String(material.stockPrice)} onChange={(event) => updateDraftMaterial(material.id, { stockPrice: number(event.target.value) })} /><span className="mt-1 block text-[11px] font-normal text-slate-500">{material.type === "linear" ? "Preço de uma barra/perfil completo" : material.type === "sheet" ? "Preço de uma chapa completa" : "Preço de uma unidade"}</span></label>
        </div>
        <details className="mt-4 rounded-xl bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-700">Regra de consumo (alterar somente se necessário)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>Consumo calculado por<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={material.formulaA} onChange={(event) => updateDraftMaterial(material.id, { formulaA: event.target.value as DimensionFormula })}><option value="width">Largura</option><option value="depth">Avanço</option><option value="fixed">Medida fixa</option></select></label>
            {material.type === "sheet" && <label className={labelClass}>Segunda medida da chapa<select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={material.formulaB} onChange={(event) => updateDraftMaterial(material.id, { formulaB: event.target.value as DimensionFormula })}><option value="width">Largura</option><option value="depth">Avanço</option><option value="fixed">Medida fixa</option></select></label>}
            {material.formulaA === "fixed" && <label className={labelClass}>Medida fixa (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={String(material.fixedA)} onChange={(event) => updateDraftMaterial(material.id, { fixedA: number(event.target.value) })} /></label>}
            {material.type === "sheet" && material.formulaB === "fixed" && <label className={labelClass}>Segunda medida fixa (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.01" value={String(material.fixedB)} onChange={(event) => updateDraftMaterial(material.id, { fixedB: number(event.target.value) })} /></label>}
            {material.type !== "unit" && !material.spacingBased && material.id !== "fix-perfil-principal" && <label className={labelClass}>Quantidade de cortes por cobertura<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="1" value={String(material.count)} onChange={(event) => updateDraftMaterial(material.id, { count: Math.floor(number(event.target.value)) })} /></label>}
            {material.type === "unit" && <label className={labelClass}>Quantidade de unidades por cobertura<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="1" value={String(material.count)} onChange={(event) => updateDraftMaterial(material.id, { count: Math.floor(number(event.target.value)) })} /></label>}
            {material.type === "linear" && <label className={labelClass}>Perda do corte / serra (m)<Input className={fieldClass + " mt-1.5"} type="number" min="0" step="0.001" value={String(material.kerf)} onChange={(event) => updateDraftMaterial(material.id, { kerf: number(event.target.value) })} /></label>}
            {material.spacingBased && <p className="self-center text-xs text-orange-800">A quantidade é calculada automaticamente pelo espaçamento entre travessas acima.</p>}
          </div>
        </details>
      </article>)}</div>}
      {modelDraft && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setModelDraft({ ...selectedModel, materials: selectedModel.materials.map((material) => ({ ...material })) })}>Cancelar</Button><Button variant="outline" onClick={() => setModelDraft({ ...modelDraft, materials: [...modelDraft.materials, newMaterial("Novo perfil ou acessório")] })}><Plus size={16} className="mr-2" /> Adicionar material</Button><Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={saveSettings}><Save size={16} className="mr-2" /> Salvar configuração</Button></div>}
      <p className="text-xs leading-5 text-slate-500">O perfil principal usa uma única lista de cortes para traseiro, frontal e travessas, aproveitando sobras sem emendar peças. Os pés são calculados separadamente. Configure o comprimento dos pés na regra de consumo do material “Pés de alumínio”. Confirme as medidas de fabricação e folgas antes de cortar.</p>
    </section>}

    {activeTab === "history" && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Histórico de cálculos</h2><p className="mt-1 text-sm text-slate-500">Cálculos salvos por esta empresa.</p></div><Button variant="outline" onClick={() => setActiveTab("calculate")}><Calculator size={16} className="mr-2" /> Novo cálculo</Button></div>
      {projects.length === 0 ? <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center"><Layers3 className="mx-auto text-slate-400" size={28} /><p className="mt-3 text-sm font-semibold text-slate-700">Nenhum cálculo salvo ainda</p><p className="mt-1 text-xs text-slate-500">Informe duas medidas e salve o primeiro cálculo.</p></div> : <div className="mt-5 space-y-3">{projects.map((project) => <article key={project.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{project.name}</h3><p className="mt-1 text-xs text-slate-500">{project.modelName} · {formatDimension(project.width)} × {formatDimension(project.depth)} · {new Date(project.createdAt).toLocaleString("pt-BR")}</p></div><div className="text-right"><p className="text-lg font-extrabold text-slate-900">{money(project.result.suggestedPrice)}</p><p className="text-xs text-slate-500">Preço sugerido</p></div></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Compra</p><p className="font-bold text-slate-800">{money(project.result.purchaseCost)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Sobras</p><p className="font-bold text-slate-800">{money(project.result.scrapValue)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Custo usado</p><p className="font-bold text-slate-800">{money(project.result.totalCost)}</p></div></div></article>)}</div>}
    </section>}
  </div>;
}
