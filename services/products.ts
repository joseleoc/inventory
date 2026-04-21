import { FirebaseError } from "firebase/app";
import { type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { firebaseDb } from "@/config/firebase";

export type ProductMeasurementUnit = "unit" | "mass" | "volume";
export type ProductItemType = "stock" | "compound" | "service";

export type ProductCreateInput = {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  itemType?: ProductItemType;
  currentStock: number;
  stockThreshold: number;
  salePrice: number;
  purchaseUnitCost: number;
  purchaseQuantity: number;
  measurementUnit: ProductMeasurementUnit;
};

export type ProductCreatePayload = {
  org_id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  item_type: ProductItemType;
  current_stock: number;
  stock_threshold: number;
  sale_price: number;
  // Transitional compatibility for existing clients still reading unit_price.
  unit_price: number;
  purchase_unit_cost: number;
  last_purchase_quantity: number;
  measurement_unit: ProductMeasurementUnit;
  price_updated_at: ReturnType<typeof serverTimestamp>;
  last_purchase_at: ReturnType<typeof serverTimestamp>;
  is_active: boolean;
  created_by: string;
  updated_by: string;
  created_at: ReturnType<typeof serverTimestamp>;
  updated_at: ReturnType<typeof serverTimestamp>;
};

type ProductDocument = {
  org_id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  item_type?: ProductItemType;
  current_stock: number;
  stock_threshold: number;
  sale_price?: number;
  unit_price?: number;
  purchase_unit_cost?: number;
  last_purchase_quantity?: number;
  measurement_unit?: ProductMeasurementUnit;
  is_active?: boolean;
};

type ProductFinancialSnapshot = {
  sku: string;
  name: string;
  current_stock: number;
  stock_threshold: number;
  sale_price: number;
  purchase_unit_cost: number;
  last_purchase_quantity: number;
  measurement_unit: ProductMeasurementUnit;
};

type ProductChangeEvent = "created" | "updated" | "stock_added";

type ProductChangeLogPayload = {
  org_id: string;
  product_id: string;
  event_type: ProductChangeEvent;
  changed_by: string;
  change_reason?: string;
  stock_delta: number;
  sale_price_delta: number;
  purchase_unit_cost_delta: number;
  previous_snapshot: ProductFinancialSnapshot | null;
  next_snapshot: ProductFinancialSnapshot;
  created_at: ReturnType<typeof serverTimestamp>;
  created_at_client: Date;
};

export type ProductUpdateInput = {
  productId: string;
  sku?: string;
  barcode?: string;
  name?: string;
  description?: string;
  category?: string;
  itemType?: ProductItemType;
  stockThreshold?: number;
  salePrice?: number;
  purchaseUnitCost?: number;
  purchaseQuantity?: number;
  measurementUnit?: ProductMeasurementUnit;
  isActive?: boolean;
  reason?: string;
};

export type AddProductStockInput = {
  productId: string;
  quantityAdded: number;
  purchaseUnitCost?: number;
  purchaseQuantity?: number;
  reason?: string;
};

export type ProductRecord = {
  id: string;
  orgId: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  itemType: ProductItemType;
  currentStock: number;
  stockThreshold: number;
  salePrice: number;
  purchaseUnitCost: number;
  purchaseQuantity: number;
  measurementUnit: ProductMeasurementUnit;
  isActive: boolean;
};

export type ProductListSort = "updated_at_desc" | "name_asc";

export type ProductListCursor = QueryDocumentSnapshot<DocumentData>;

export type ListActiveProductsPageInput = {
  orgId: string;
  pageSize?: number;
  cursor?: ProductListCursor | null;
  sort?: ProductListSort;
};

export type ListActiveProductsPageResult = {
  items: ProductRecord[];
  nextCursor: ProductListCursor | null;
};

const MEASUREMENT_UNITS: ProductMeasurementUnit[] = ["unit", "mass", "volume"];
const ITEM_TYPES: ProductItemType[] = ["stock", "compound", "service"];
const DEFAULT_PRODUCTS_PAGE_SIZE = 20;
const PRODUCTS_FETCH_MULTIPLIER = 3;

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function resolveMeasurementUnit(value?: ProductMeasurementUnit): ProductMeasurementUnit {
  return value && MEASUREMENT_UNITS.includes(value) ? value : "unit";
}

function resolveItemType(value?: ProductItemType): ProductItemType {
  return value && ITEM_TYPES.includes(value) ? value : "stock";
}

function resolveSalePrice(document: ProductDocument) {
  return document.sale_price ?? document.unit_price ?? 0;
}

function getUpdatedAtMs(value: unknown) {
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

  return 0;
}

function mapProductRecord(productId: string, document: ProductDocument): ProductRecord {
  const barcode =
    typeof document.barcode === "string" && document.barcode.trim() ? document.barcode : undefined;
  const description =
    typeof document.description === "string" && document.description.trim()
      ? document.description
      : undefined;
  const category =
    typeof document.category === "string" && document.category.trim()
      ? document.category
      : undefined;

  return {
    id: productId,
    orgId: document.org_id,
    sku: document.sku,
    barcode,
    name: document.name,
    description,
    category,
    itemType: resolveItemType(document.item_type),
    currentStock: document.current_stock,
    stockThreshold: document.stock_threshold,
    salePrice: resolveSalePrice(document),
    purchaseUnitCost: document.purchase_unit_cost ?? 0,
    purchaseQuantity: document.last_purchase_quantity ?? 0,
    measurementUnit: resolveMeasurementUnit(document.measurement_unit),
    isActive: document.is_active ?? true,
  };
}

function createSnapshot(document: ProductDocument): ProductFinancialSnapshot {
  return {
    sku: document.sku,
    name: document.name,
    current_stock: document.current_stock,
    stock_threshold: document.stock_threshold,
    sale_price: resolveSalePrice(document),
    purchase_unit_cost: document.purchase_unit_cost ?? 0,
    last_purchase_quantity: document.last_purchase_quantity ?? 0,
    measurement_unit: resolveMeasurementUnit(document.measurement_unit),
  };
}

function buildChangeLogPayload(params: {
  orgId: string;
  productId: string;
  changedBy: string;
  eventType: ProductChangeEvent;
  previous: ProductFinancialSnapshot | null;
  next: ProductFinancialSnapshot;
  reason?: string;
}): ProductChangeLogPayload {
  const previous = params.previous;

  return {
    org_id: params.orgId,
    product_id: params.productId,
    event_type: params.eventType,
    changed_by: params.changedBy,
    ...(normalizeOptionalText(params.reason)
      ? { change_reason: normalizeOptionalText(params.reason) }
      : {}),
    stock_delta: params.next.current_stock - (previous?.current_stock ?? 0),
    sale_price_delta: params.next.sale_price - (previous?.sale_price ?? 0),
    purchase_unit_cost_delta: params.next.purchase_unit_cost - (previous?.purchase_unit_cost ?? 0),
    previous_snapshot: previous,
    next_snapshot: params.next,
    created_at: serverTimestamp(),
    created_at_client: new Date(),
  };
}

function validateNonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be an integer greater than or equal to 0.`);
  }
}

function validateNonNegativeNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a number greater than or equal to 0.`);
  }
}

function toPayload(input: ProductCreateInput, user: User, orgId: string): ProductCreatePayload {
  const sku = input.sku.trim().toUpperCase();
  const barcode = normalizeOptionalText(input.barcode);
  const description = normalizeOptionalText(input.description);
  const category = normalizeOptionalText(input.category);
  const measurementUnit = resolveMeasurementUnit(input.measurementUnit);

  return {
    org_id: orgId,
    sku,
    ...(barcode ? { barcode } : {}),
    name: input.name.trim(),
    ...(description ? { description } : {}),
    ...(category ? { category } : {}),
    item_type: resolveItemType(input.itemType),
    current_stock: input.currentStock,
    stock_threshold: input.stockThreshold,
    sale_price: input.salePrice,
    unit_price: input.salePrice,
    purchase_unit_cost: input.purchaseUnitCost,
    last_purchase_quantity: input.purchaseQuantity,
    measurement_unit: measurementUnit,
    price_updated_at: serverTimestamp(),
    last_purchase_at: serverTimestamp(),
    is_active: true,
    created_by: user.uid,
    updated_by: user.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

function mapFirestoreError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Unable to add product right now. Please try again.";
  }

  switch (error.code) {
    case "permission-denied":
      return "You do not have permission to add products for this organization.";
    case "unavailable":
      return "Firestore is temporarily unavailable. Please try again.";
    default:
      return "Unable to save product changes right now. Please try again.";
  }
}

export async function createProduct(input: ProductCreateInput, user: User, orgId: string) {
  if (!orgId.trim()) {
    throw new Error("Organization context is missing for this account.");
  }

  validateNonNegativeInteger(input.currentStock, "Current stock");
  validateNonNegativeInteger(input.stockThreshold, "Stock threshold");
  validateNonNegativeNumber(input.salePrice, "Selling price");
  validateNonNegativeNumber(input.purchaseUnitCost, "Purchase unit cost");
  validateNonNegativeNumber(input.purchaseQuantity, "Purchase quantity");

  const payload = toPayload(input, user, orgId);
  const productRef = doc(collection(firebaseDb, "products"));
  const productLogRef = doc(collection(firebaseDb, "product_change_logs"));

  try {
    const batch = writeBatch(firebaseDb);

    batch.set(productRef, payload);
    batch.set(
      productLogRef,
      buildChangeLogPayload({
        orgId,
        productId: productRef.id,
        changedBy: user.uid,
        eventType: "created",
        previous: null,
        next: createSnapshot(payload),
        reason: "Product created",
      }),
    );

    await batch.commit();
    return productRef.id;
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}

export async function updateProduct(input: ProductUpdateInput, user: User, orgId: string) {
  if (!orgId.trim()) {
    throw new Error("Organization context is missing for this account.");
  }

  const productId = input.productId.trim();
  if (!productId) {
    throw new Error("Product id is required.");
  }

  if (input.stockThreshold !== undefined) {
    validateNonNegativeInteger(input.stockThreshold, "Stock threshold");
  }
  if (input.salePrice !== undefined) {
    validateNonNegativeNumber(input.salePrice, "Selling price");
  }
  if (input.purchaseUnitCost !== undefined) {
    validateNonNegativeNumber(input.purchaseUnitCost, "Purchase unit cost");
  }
  if (input.purchaseQuantity !== undefined) {
    validateNonNegativeNumber(input.purchaseQuantity, "Purchase quantity");
  }

  try {
    await runTransaction(firebaseDb, async (transaction) => {
      const productRef = doc(firebaseDb, "products", productId);
      const productSnapshot = await transaction.get(productRef);

      if (!productSnapshot.exists()) {
        throw new Error("Product not found.");
      }

      const currentData = productSnapshot.data() as ProductDocument;
      if (currentData.org_id !== orgId) {
        throw new Error("Product belongs to a different organization.");
      }

      const previousSnapshot = createSnapshot(currentData);
      const updatePayload: Record<string, unknown> = {
        updated_by: user.uid,
        updated_at: serverTimestamp(),
      };

      if (input.sku !== undefined) {
        const normalized = input.sku.trim().toUpperCase();
        if (!normalized) {
          throw new Error("SKU is required.");
        }
        updatePayload.sku = normalized;
      }

      if (input.name !== undefined) {
        const normalized = input.name.trim();
        if (!normalized) {
          throw new Error("Product name is required.");
        }
        updatePayload.name = normalized;
      }

      if (input.barcode !== undefined) {
        updatePayload.barcode = normalizeOptionalText(input.barcode) ?? null;
      }

      if (input.description !== undefined) {
        updatePayload.description = normalizeOptionalText(input.description) ?? null;
      }

      if (input.category !== undefined) {
        updatePayload.category = normalizeOptionalText(input.category) ?? null;
      }

      if (input.itemType !== undefined) {
        updatePayload.item_type = resolveItemType(input.itemType);
      }

      if (input.stockThreshold !== undefined) {
        updatePayload.stock_threshold = input.stockThreshold;
      }

      if (input.salePrice !== undefined) {
        updatePayload.sale_price = input.salePrice;
        updatePayload.unit_price = input.salePrice;
        updatePayload.price_updated_at = serverTimestamp();
      }

      if (input.purchaseUnitCost !== undefined) {
        updatePayload.purchase_unit_cost = input.purchaseUnitCost;
        updatePayload.price_updated_at = serverTimestamp();
      }

      if (input.purchaseQuantity !== undefined) {
        updatePayload.last_purchase_quantity = input.purchaseQuantity;
        updatePayload.last_purchase_at = serverTimestamp();
      }

      if (input.measurementUnit !== undefined) {
        updatePayload.measurement_unit = resolveMeasurementUnit(input.measurementUnit);
      }

      if (input.isActive !== undefined) {
        updatePayload.is_active = input.isActive;
      }

      const nextData: ProductDocument = {
        ...currentData,
        ...(updatePayload.sku ? { sku: updatePayload.sku as string } : {}),
        ...(updatePayload.name ? { name: updatePayload.name as string } : {}),
        ...(updatePayload.stock_threshold !== undefined
          ? { stock_threshold: updatePayload.stock_threshold as number }
          : {}),
        ...(updatePayload.sale_price !== undefined
          ? {
              sale_price: updatePayload.sale_price as number,
              unit_price: updatePayload.unit_price as number,
            }
          : {}),
        ...(updatePayload.purchase_unit_cost !== undefined
          ? { purchase_unit_cost: updatePayload.purchase_unit_cost as number }
          : {}),
        ...(updatePayload.last_purchase_quantity !== undefined
          ? { last_purchase_quantity: updatePayload.last_purchase_quantity as number }
          : {}),
        ...(updatePayload.measurement_unit !== undefined
          ? { measurement_unit: updatePayload.measurement_unit as ProductMeasurementUnit }
          : {}),
      };

      const nextSnapshot = createSnapshot(nextData);

      transaction.update(productRef, updatePayload);
      transaction.set(
        doc(collection(firebaseDb, "product_change_logs")),
        buildChangeLogPayload({
          orgId,
          productId,
          changedBy: user.uid,
          eventType: "updated",
          previous: previousSnapshot,
          next: nextSnapshot,
          reason: input.reason ?? "Product details updated",
        }),
      );
    });
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}

export async function addProductStock(input: AddProductStockInput, user: User, orgId: string) {
  if (!orgId.trim()) {
    throw new Error("Organization context is missing for this account.");
  }

  if (!Number.isInteger(input.quantityAdded) || input.quantityAdded <= 0) {
    throw new Error("Quantity added must be an integer greater than 0.");
  }

  if (input.purchaseUnitCost !== undefined) {
    validateNonNegativeNumber(input.purchaseUnitCost, "Purchase unit cost");
  }

  if (input.purchaseQuantity !== undefined) {
    validateNonNegativeNumber(input.purchaseQuantity, "Purchase quantity");
  }

  try {
    await runTransaction(firebaseDb, async (transaction) => {
      const productRef = doc(firebaseDb, "products", input.productId);
      const productSnapshot = await transaction.get(productRef);

      if (!productSnapshot.exists()) {
        throw new Error("Product not found.");
      }

      const currentData = productSnapshot.data() as ProductDocument;
      if (currentData.org_id !== orgId) {
        throw new Error("Product belongs to a different organization.");
      }

      const previousSnapshot = createSnapshot(currentData);
      const nextStock = previousSnapshot.current_stock + input.quantityAdded;
      const updatePayload: Record<string, unknown> = {
        current_stock: nextStock,
        updated_by: user.uid,
        updated_at: serverTimestamp(),
      };

      if (input.purchaseUnitCost !== undefined) {
        updatePayload.purchase_unit_cost = input.purchaseUnitCost;
        updatePayload.price_updated_at = serverTimestamp();
      }

      if (input.purchaseQuantity !== undefined) {
        updatePayload.last_purchase_quantity = input.purchaseQuantity;
      } else {
        updatePayload.last_purchase_quantity = input.quantityAdded;
      }

      updatePayload.last_purchase_at = serverTimestamp();

      const nextData: ProductDocument = {
        ...currentData,
        current_stock: nextStock,
        ...(updatePayload.purchase_unit_cost !== undefined
          ? { purchase_unit_cost: updatePayload.purchase_unit_cost as number }
          : {}),
        ...(updatePayload.last_purchase_quantity !== undefined
          ? { last_purchase_quantity: updatePayload.last_purchase_quantity as number }
          : {}),
      };

      const nextSnapshot = createSnapshot(nextData);

      transaction.update(productRef, updatePayload);
      transaction.set(
        doc(collection(firebaseDb, "product_change_logs")),
        buildChangeLogPayload({
          orgId,
          productId: input.productId,
          changedBy: user.uid,
          eventType: "stock_added",
          previous: previousSnapshot,
          next: nextSnapshot,
          reason: input.reason ?? "Stock increment",
        }),
      );
    });
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}

export async function listActiveProductsPage(
  input: ListActiveProductsPageInput,
): Promise<ListActiveProductsPageResult> {
  const normalizedOrgId = input.orgId.trim();
  if (!normalizedOrgId) {
    return { items: [], nextCursor: null };
  }

  const pageSize = Math.max(1, Math.min(input.pageSize ?? DEFAULT_PRODUCTS_PAGE_SIZE, 100));
  const fetchSize = Math.max(pageSize, pageSize * PRODUCTS_FETCH_MULTIPLIER);
  const sort = input.sort ?? "updated_at_desc";

  try {
    const productsQuery = input.cursor
      ? query(
          collection(firebaseDb, "products"),
          where("org_id", "==", normalizedOrgId),
          startAfter(input.cursor),
          limit(fetchSize),
        )
      : query(
          collection(firebaseDb, "products"),
          where("org_id", "==", normalizedOrgId),
          limit(fetchSize),
        );

    const snapshot = await getDocs(productsQuery);
    const items = snapshot.docs
      .map((documentSnapshot) => {
        const documentData = documentSnapshot.data() as ProductDocument;

        return {
          product: mapProductRecord(documentSnapshot.id, documentData),
          updatedAtMs: getUpdatedAtMs((documentData as { updated_at?: unknown }).updated_at),
        };
      })
      .filter((entry) => entry.product.isActive)
      .sort((first, second) => {
        if (sort === "name_asc") {
          return first.product.name.localeCompare(second.product.name);
        }

        return second.updatedAtMs - first.updatedAtMs;
      })
      .slice(0, pageSize)
      .map((entry) => entry.product);

    const nextCursor =
      snapshot.docs.length === fetchSize ? snapshot.docs[snapshot.docs.length - 1] : null;

    return {
      items,
      nextCursor,
    };
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}

export async function getProductById(
  productId: string,
  orgId: string,
): Promise<ProductRecord | null> {
  const normalizedOrgId = orgId.trim();
  const normalizedProductId = productId.trim();

  if (!normalizedOrgId || !normalizedProductId) {
    return null;
  }

  try {
    const productSnapshot = await getDoc(doc(firebaseDb, "products", normalizedProductId));
    if (!productSnapshot.exists()) {
      return null;
    }

    const productData = productSnapshot.data() as ProductDocument;
    if (productData.org_id !== normalizedOrgId) {
      return null;
    }

    return mapProductRecord(productSnapshot.id, productData);
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}
