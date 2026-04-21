import { type ProductMeasurementUnit } from "@/services/products";

export const PRODUCT_MEASUREMENT_UNITS: ProductMeasurementUnit[] = ["unit", "mass", "volume"];

export function parseInteger(value: string) {
  if (!/^-?\d+$/.test(value.trim())) {
    return null;
  }

  return Number.parseInt(value, 10);
}

export function parseNonNegativeNumber(value: string) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function parsePositiveInteger(value: string) {
  const parsed = parseInteger(value);
  if (parsed === null || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function isValidMeasurementUnit(value: string): value is ProductMeasurementUnit {
  return PRODUCT_MEASUREMENT_UNITS.includes(value as ProductMeasurementUnit);
}
