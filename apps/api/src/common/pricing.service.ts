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

export function derivePurchaseUnitPrice(
  productPrice: ProductPriceInfo,
  purchaseUnit: UnitInfo,
): number {
  return (
    (productPrice.purchasePrice * purchaseUnit.conversionValue) /
    productPrice.baseUnitConversionValue
  );
}
