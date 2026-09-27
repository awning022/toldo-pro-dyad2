export type PricingInput = {
  materialsCost: number;
  laborCost: number;
  installationCost: number;
  displacementCost: number;
  otherExpenses: number;
  marginPercent: number;
  markupPercent?: number;
  minimumPrice?: number;
  discountPercent?: number;
};

export type PricingResult = {
  subtotal: number;
  suggestedPrice: number;
  minimumPrice: number;
  discountValue: number;
  finalPrice: number;
};

export function calculatePricing(input: PricingInput): PricingResult {
  const subtotal =
    Number(input.materialsCost || 0) +
    Number(input.laborCost || 0) +
    Number(input.installationCost || 0) +
    Number(input.displacementCost || 0) +
    Number(input.otherExpenses || 0);

  const margin = Math.max(0, Number(input.marginPercent || 0)) / 100;
  const markup = Math.max(0, Number(input.markupPercent ?? input.marginPercent ?? 0)) / 100;
  const suggestedPrice = subtotal * (1 + markup);
  const minimumPrice = Number(input.minimumPrice || subtotal * (1 + margin));
  const discountValue = Math.max(0, suggestedPrice * (Number(input.discountPercent || 0) / 100));
  const finalPrice = Math.max(minimumPrice, suggestedPrice - discountValue);

  return {
    subtotal,
    suggestedPrice,
    minimumPrice,
    discountValue,
    finalPrice
  };
}
