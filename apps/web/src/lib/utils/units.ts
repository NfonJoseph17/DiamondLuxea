/**
 * Unit display utilities for stock and product quantities.
 *
 * Stock is stored in the product's unit type (bottle, crate, etc.).
 * Products sold individually use base units (bottle, can, unit).
 *
 * Future crate-to-bottle conversion: add optional `unitsPerCrate` (or similar)
 * on Product and implement convertToBaseUnit() below. Purchases in crates would
 * then convert to bottles for storage/display.
 */

export const UNIT_TYPES = ['BOTTLE', 'CRATE', 'CARTON', 'CAN', 'UNIT'] as const;
export type UnitTypeValue = (typeof UNIT_TYPES)[number];

const UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
  BOTTLE: { singular: 'bottle', plural: 'bottles' },
  CRATE: { singular: 'crate', plural: 'crates' },
  CARTON: { singular: 'carton', plural: 'cartons' },
  CAN: { singular: 'can', plural: 'cans' },
  UNIT: { singular: 'unit', plural: 'units' },
  bottle: { singular: 'bottle', plural: 'bottles' },
  crate: { singular: 'crate', plural: 'crates' },
  carton: { singular: 'carton', plural: 'cartons' },
  can: { singular: 'can', plural: 'cans' },
  unit: { singular: 'unit', plural: 'units' },
  pallet: { singular: 'pallet', plural: 'pallets' },
  'can pallet': { singular: 'can pallet', plural: 'can pallets' },
};

/**
 * Returns a human-readable unit label (e.g., "bottle" or "bottles").
 */
export function formatUnitLabel(unitType: string, plural = false): string {
  const key = String(unitType);
  const labels = UNIT_LABELS[key] ?? UNIT_LABELS[key.toUpperCase()] ?? {
    singular: key.toLowerCase(),
    plural: key.toLowerCase().endsWith('s') ? key.toLowerCase() : `${key.toLowerCase()}s`,
  };
  return plural ? labels.plural : labels.singular;
}

/**
 * Formats quantity with unit for display (e.g., "48 bottles", "10 crates").
 * Quantity is always in the product's stored unit type.
 */
export function formatQuantityWithUnit(quantity: number, unitType: string): string {
  const unit = formatUnitLabel(unitType, Math.abs(quantity) !== 1);
  return `${quantity.toLocaleString()} ${unit}`;
}

/**
 * Maps base unit names to their smaller/remainder unit (conversionValue=1).
 * Used for mixed display like "4 crates 11 bottles".
 */
const SMALLER_UNIT_BY_BASE: Record<string, string> = {
  crate: 'bottle',
  crates: 'bottle',
  carton: 'bottle',
  cartons: 'bottle',
  pallet: 'bottle',
  pallets: 'bottle',
  'can pallet': 'can',
  'can pallets': 'can',
};

/**
 * Formats stock quantity in mixed units (e.g., "4 crates 11 bottles") instead of decimals.
 * - quantityInStorage: total in smallest units (bottles/cans)
 * - baseUnitName: product's base unit (crate, pallet, etc.)
 * - baseUnitConversionValue: e.g. 12 for crate = 12 bottles per crate
 */
export function formatStockQuantityMixed(
  quantityInStorage: number,
  baseUnitName: string,
  baseUnitConversionValue: number
): string {
  const baseKey = String(baseUnitName).toLowerCase();
  const baseLabel = formatUnitLabel(baseUnitName, true);

  if (baseUnitConversionValue <= 1) {
    return formatQuantityWithUnit(quantityInStorage, baseUnitName);
  }

  const whole = Math.floor(quantityInStorage / baseUnitConversionValue);
  const remainder = Math.round(quantityInStorage % baseUnitConversionValue);

  if (remainder === 0) {
    return `${whole.toLocaleString()} ${baseLabel}`;
  }

  const smallerName = SMALLER_UNIT_BY_BASE[baseKey] ?? 'unit';
  const smallerLabel = formatUnitLabel(smallerName, remainder !== 1);

  if (whole === 0) {
    return `${remainder.toLocaleString()} ${smallerLabel}`;
  }

  return `${whole.toLocaleString()} ${baseLabel} ${remainder.toLocaleString()} ${smallerLabel}`;
}

/**
 * Placeholder for future conversion (e.g., crates → bottles).
 * When Product has optional unitsPerCrate, use it to convert quantity to base unit.
 * For now returns quantity unchanged.
 */
export function toBaseUnitQuantity(
  quantity: number,
  unitType: string,
  _unitsPerParentUnit?: number
): number {
  // Future: if unitType === 'CRATE' && unitsPerParentUnit, return quantity * unitsPerParentUnit
  return quantity;
}
