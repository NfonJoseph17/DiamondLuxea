/**
 * Derived pricing logic for sales and purchases.
 * - unit conversionValue = 1 -> retail price
 * - unit conversionValue > 1 -> wholesale price
 * - Convert price when selected unit differs from product base unit
 */
export interface UnitInfo {
  id: string;
  name: string;
  conversionValue: number;
}

export interface ProductPriceInfo {
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  baseUnitConversionValue: number;
}

export function deriveSaleUnitPrice(
  productPrice: ProductPriceInfo,
  saleUnit: UnitInfo,
): number {
  const pricePerBaseUnit =
    saleUnit.conversionValue === 1
      ? productPrice.retailPrice
      : productPrice.wholesalePrice;
  return (
    (pricePerBaseUnit * saleUnit.conversionValue) /
    productPrice.baseUnitConversionValue
  );
}

export interface ProductUnitPrice {
  unitId: string;
  sellingPrice: number;
}

/** Parse the JSON `unitPrices` column into a clean list. */
export function parseUnitPrices(raw: unknown): ProductUnitPrice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) =>
      r && typeof r === 'object'
        ? {
            unitId: String((r as { unitId?: unknown }).unitId ?? ''),
            sellingPrice: Number((r as { sellingPrice?: unknown }).sellingPrice),
          }
        : { unitId: '', sellingPrice: NaN },
    )
    .filter((r) => r.unitId && Number.isFinite(r.sellingPrice) && r.sellingPrice >= 0);
}

/**
 * Selling price for a unit: an explicit per-unit price set on the product wins;
 * otherwise fall back to the derived retail/wholesale calculation.
 */
export function resolveSaleUnitPrice(
  productPrice: ProductPriceInfo,
  saleUnit: UnitInfo,
  unitPrices: unknown,
): number {
  const explicit = parseUnitPrices(unitPrices).find((u) => u.unitId === saleUnit.id);
  if (explicit) return explicit.sellingPrice;
  return deriveSaleUnitPrice(productPrice, saleUnit);
}

export function derivePurchaseUnitPrice(
  productPrice: ProductPriceInfo,
  purchaseUnit: UnitInfo,
): number {
  return (
    (productPrice.purchasePrice * purchaseUnit.conversionValue) /
    productPrice.baseUnitConversionValue
  );
}
