import { FirebaseError } from "firebase/app";
import { collection, getDocs, limit, query, type QueryConstraint, where } from "firebase/firestore";

import { firebaseDb } from "@/config/firebase";
import { type ItemType } from "@/services/compound-recipes";
import { type ProductMeasurementUnit } from "@/services/products";

export type SaleInventoryMovementType = "sale_parent" | "compound_consumption" | "service_sale";

export type SaleInventoryMovementRecord = {
  id: string;
  orgId: string;
  saleId: string;
  saleLineId: string;
  movementGroupId: string;
  movementType: SaleInventoryMovementType;
  productId: string;
  productNameSnapshot?: string;
  productSkuSnapshot?: string;
  parentProductId?: string;
  parentItemType: ItemType;
  quantitySold?: number;
  quantityDeltaStock: number;
  measurementUnit?: ProductMeasurementUnit;
  recipeVersionSnapshot?: number;
  stockBefore?: number;
  stockAfter?: number;
  movedBy: string;
  movedAtMs: number;
};

export type ListSaleInventoryMovementsInput = {
  orgId: string;
  saleId?: string;
  saleLineId?: string;
  productId?: string;
  parentProductId?: string;
  movementType?: SaleInventoryMovementType;
  pageSize?: number;
};

type SaleInventoryMovementDocument = {
  org_id: string;
  sale_id: string;
  sale_line_id: string;
  movement_group_id: string;
  movement_type: SaleInventoryMovementType;
  product_id: string;
  product_name_snapshot?: string | null;
  product_sku_snapshot?: string | null;
  parent_product_id?: string | null;
  parent_item_type: ItemType;
  quantity_sold?: number;
  quantity_delta_stock: number;
  measurement_unit?: ProductMeasurementUnit;
  recipe_version_snapshot?: number;
  stock_before?: number;
  stock_after?: number;
  moved_by: string;
  moved_at?: unknown;
};

function mapFirestoreError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  switch (error.code) {
    case "permission-denied":
      return "You do not have permission to read inventory movement logs.";
    case "unavailable":
      return "Firestore is temporarily unavailable. Please try again.";
    default:
      return fallbackMessage;
  }
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toTimestampMs(value: unknown) {
  if (!value || typeof value !== "object") {
    return 0;
  }

  if ("toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }

  if ("toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }

  return 0;
}

function mapMovementRecord(
  movementId: string,
  document: SaleInventoryMovementDocument,
): SaleInventoryMovementRecord {
  return {
    id: movementId,
    orgId: document.org_id,
    saleId: document.sale_id,
    saleLineId: document.sale_line_id,
    movementGroupId: document.movement_group_id,
    movementType: document.movement_type,
    productId: document.product_id,
    productNameSnapshot: document.product_name_snapshot ?? undefined,
    productSkuSnapshot: document.product_sku_snapshot ?? undefined,
    parentProductId: document.parent_product_id ?? undefined,
    parentItemType: document.parent_item_type,
    quantitySold: document.quantity_sold,
    quantityDeltaStock: document.quantity_delta_stock,
    measurementUnit: document.measurement_unit,
    recipeVersionSnapshot: document.recipe_version_snapshot,
    stockBefore: document.stock_before,
    stockAfter: document.stock_after,
    movedBy: document.moved_by,
    movedAtMs: toTimestampMs(document.moved_at),
  };
}

export async function listSaleInventoryMovements(input: ListSaleInventoryMovementsInput) {
  const orgId = input.orgId.trim();
  if (!orgId) {
    return [] as SaleInventoryMovementRecord[];
  }

  try {
    const constraints: QueryConstraint[] = [where("org_id", "==", orgId)];
    const saleId = normalizeOptionalText(input.saleId);
    const saleLineId = normalizeOptionalText(input.saleLineId);
    const productId = normalizeOptionalText(input.productId);
    const parentProductId = normalizeOptionalText(input.parentProductId);

    if (saleId) {
      constraints.push(where("sale_id", "==", saleId));
    }

    if (saleLineId) {
      constraints.push(where("sale_line_id", "==", saleLineId));
    }

    if (productId) {
      constraints.push(where("product_id", "==", productId));
    }

    if (parentProductId) {
      constraints.push(where("parent_product_id", "==", parentProductId));
    }

    if (input.movementType) {
      constraints.push(where("movement_type", "==", input.movementType));
    }

    constraints.push(limit(Math.max(1, Math.min(input.pageSize ?? 100, 500))));

    const movementQuery = query(collection(firebaseDb, "sale_inventory_movements"), ...constraints);
    const snapshot = await getDocs(movementQuery);

    return snapshot.docs
      .map((documentSnapshot) =>
        mapMovementRecord(
          documentSnapshot.id,
          documentSnapshot.data() as SaleInventoryMovementDocument,
        ),
      )
      .sort((first, second) => second.movedAtMs - first.movedAtMs);
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to load inventory movement logs right now."));
  }
}
