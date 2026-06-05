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
