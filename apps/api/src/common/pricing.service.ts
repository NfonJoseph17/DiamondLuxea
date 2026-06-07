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
  label?: string;
}

/** Parse the JSON `unitPrices` column into a clean list (allows several per unit). */
export function parseUnitPrices(raw: unknown): ProductUnitPrice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
      const label = typeof o.label === 'string' ? o.label : undefined;
      return {
        unitId: String(o.unitId ?? ''),
        sellingPrice: Number(o.sellingPrice),
        label,
      };
    })
    .filter((r) => r.unitId && Number.isFinite(r.sellingPrice) && r.sellingPrice >= 0);
}

/**
 * Pick the selling price for a sale line. A unit may have multiple configured
 * prices (tiers); the client tells us which one via `requestedPrice`, which we
 * VALIDATE against the allowed set (configured prices for that unit + derived).
 * Falls back to the first configured price, then the derived price.
 */
export function pickSaleUnitPrice(
  productPrice: ProductPriceInfo,
  saleUnit: UnitInfo,
  unitPrices: unknown,
  requestedPrice?: number,
): number {
  const explicit = parseUnitPrices(unitPrices).filter((u) => u.unitId === saleUnit.id);
  const derived = deriveSaleUnitPrice(productPrice, saleUnit);
  const allowed = [...explicit.map((e) => e.sellingPrice), derived];

  if (requestedPrice != null && Number.isFinite(requestedPrice)) {
    const match = allowed.find((p) => Math.abs(p - requestedPrice) < 0.5);
    if (match != null) return match;
  }
  if (explicit.length > 0) return explicit[0].sellingPrice;
  return derived;
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
