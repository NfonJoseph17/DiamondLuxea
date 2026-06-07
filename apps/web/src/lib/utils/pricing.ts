/**
 * Derived pricing - mirrors backend logic.
 * unit conversionValue = 1 -> retail
 * unit conversionValue > 1 -> wholesale
 */
export function deriveSaleUnitPrice(
  retailPrice: number,
  wholesalePrice: number,
  baseUnitConversionValue: number,
  saleUnitConversionValue: number,
): number {
  const pricePerBaseUnit =
    saleUnitConversionValue === 1 ? retailPrice : wholesalePrice;
  return (
    (pricePerBaseUnit * saleUnitConversionValue) / baseUnitConversionValue
  );
}

export function derivePurchaseUnitPrice(
  purchasePrice: number,
  baseUnitConversionValue: number,
  purchaseUnitConversionValue: number,
): number {
  return (
    (purchasePrice * purchaseUnitConversionValue) / baseUnitConversionValue
  );
}

/**
 * Selling price for a unit, preferring an explicit per-unit price set on the
 * product; falls back to the derived retail/wholesale calculation.
 * Mirrors the backend's resolveSaleUnitPrice.
 */
export function resolveUnitSellingPrice(
  unitId: string,
  unitPrices: { unitId: string; sellingPrice: number }[] | null | undefined,
  derived: {
    retailPrice: number;
    wholesalePrice: number;
    baseUnitConversionValue: number;
    unitConversionValue: number;
  },
): number {
  const explicit = unitPrices?.find((u) => u.unitId === unitId);
  if (explicit && Number.isFinite(explicit.sellingPrice)) return explicit.sellingPrice;
  return deriveSaleUnitPrice(
    derived.retailPrice,
    derived.wholesalePrice,
    derived.baseUnitConversionValue,
    derived.unitConversionValue,
  );
}
