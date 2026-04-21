import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { firebaseDb } from "@/config/firebase";

type ProductLookupDocument = {
  org_id: string;
  sku: string;
  name: string;
  barcode?: string;
  item_type?: "stock" | "compound" | "service";
  measurement_unit?: "unit" | "mass" | "volume";
  current_stock: number;
  stock_threshold: number;
  sale_price?: number;
  unit_price?: number;
  is_active: boolean;
  updated_at?: unknown;
};

export type ProductLookupItem = {
  id: string;
  orgId: string;
  sku: string;
  barcode?: string;
  name: string;
  itemType: "stock" | "compound" | "service";
  measurementUnit: "unit" | "mass" | "volume";
  currentStock: number;
  stockThreshold: number;
  unitPrice: number;
  isActive: boolean;
};

export type CheckoutCartLineInput = {
  productId: string;
  sku: string;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
};

type ItemType = "stock" | "compound" | "service";
type MeasurementUnit = "unit" | "mass" | "volume";

type CompoundRecipeDocument = {
  org_id: string;
  compound_product_id: string;
  ingredients: {
    product_id: string;
    quantity_per_output: number;
    measurement_unit: MeasurementUnit;
  }[];
  version?: number;
  is_active?: boolean;
};

export type CheckoutInput = {
  orgId: string;
  soldBy: string;
  cartId: string;
  cartLabel?: string;
  lines: CheckoutCartLineInput[];
};

type ProductPoolCache = {
  orgId: string;
  timestamp: number;
  items: ProductLookupItem[];
};

let productPoolCache: ProductPoolCache | null = null;

const PRODUCT_POOL_TTL_MS = 4_000;
const PRODUCT_POOL_LIMIT = 300;
const MEASUREMENT_UNITS: MeasurementUnit[] = ["unit", "mass", "volume"];
const ITEM_TYPES: ItemType[] = ["stock", "compound", "service"];

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function mapFirestoreError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  switch (error.code) {
    case "permission-denied":
      return "You do not have permission to perform this sales action.";
    case "unavailable":
      return "Firestore is temporarily unavailable. Please try again.";
    default:
      return fallbackMessage;
  }
}

function resolveItemType(value?: ItemType): ItemType {
  return value && ITEM_TYPES.includes(value) ? value : "stock";
}

function resolveMeasurementUnit(value?: MeasurementUnit): MeasurementUnit {
  return value && MEASUREMENT_UNITS.includes(value) ? value : "unit";
}

function mapProduct(documentId: string, data: ProductLookupDocument): ProductLookupItem {
  const sellingPrice = data.sale_price ?? data.unit_price ?? 0;

  return {
    id: documentId,
    orgId: data.org_id,
    sku: data.sku,
    barcode: data.barcode,
    name: data.name,
    itemType: resolveItemType(data.item_type),
    measurementUnit: resolveMeasurementUnit(data.measurement_unit),
    currentStock: data.current_stock,
    stockThreshold: data.stock_threshold,
    unitPrice: sellingPrice,
    isActive: data.is_active ?? true,
  };
}

async function loadProductPool(orgId: string) {
  const now = Date.now();
  if (
    productPoolCache &&
    productPoolCache.orgId === orgId &&
    now - productPoolCache.timestamp < PRODUCT_POOL_TTL_MS
  ) {
    return productPoolCache.items;
  }

  const productsQuery = query(
    collection(firebaseDb, "products"),
    where("org_id", "==", orgId),
    limit(PRODUCT_POOL_LIMIT),
  );

  const snapshot = await getDocs(productsQuery);
  const items = snapshot.docs
    .map((documentSnapshot) =>
      mapProduct(documentSnapshot.id, documentSnapshot.data() as ProductLookupDocument),
    )
    .filter((item) => item.isActive)
    .sort((first, second) => first.name.localeCompare(second.name));

  productPoolCache = {
    orgId,
    timestamp: now,
    items,
  };

  return items;
}

function scoreProduct(item: ProductLookupItem, term: string) {
  const sku = item.sku.toLowerCase();
  const name = item.name.toLowerCase();
  const barcode = item.barcode?.toLowerCase();

  if (barcode && barcode === term) {
    return 0;
  }

  if (sku === term) {
    return 1;
  }

  if (name.startsWith(term)) {
    return 2;
  }

  if (name.includes(term)) {
    return 3;
  }

  if (sku.includes(term)) {
    return 4;
  }

  if (barcode?.includes(term)) {
    return 5;
  }

  return 99;
}

export async function searchProducts(orgId: string, rawSearch: string) {
  const normalizedOrgId = orgId.trim();
  if (!normalizedOrgId) {
    return [];
  }

  try {
    const productPool = await loadProductPool(normalizedOrgId);
    const term = normalizeSearchTerm(rawSearch);

    if (!term) {
      return productPool.slice(0, 30);
    }

    return productPool
      .filter((item) => scoreProduct(item, term) < 99)
      .sort((first, second) => scoreProduct(first, term) - scoreProduct(second, term))
      .slice(0, 30);
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to search products right now."));
  }
}

export async function findProductByCode(orgId: string, code: string) {
  const term = normalizeSearchTerm(code);
  if (!term) {
    return null;
  }

  const products = await searchProducts(orgId, term);
  return (
    products.find(
      (item) => item.barcode?.toLowerCase() === term || item.sku.toLowerCase() === term,
    ) ?? null
  );
}

export async function checkoutCart(input: CheckoutInput) {
  const orgId = input.orgId.trim();

  if (!orgId) {
    throw new Error("Organization context is required for checkout.");
  }

  if (!input.soldBy.trim()) {
    throw new Error("Signed-in user is required for checkout.");
  }

  if (input.lines.length === 0) {
    throw new Error("Cart is empty.");
  }

  const invalidLine = input.lines.find(
    (line) => !Number.isInteger(line.quantity) || line.quantity <= 0 || line.unitPrice < 0,
  );
  if (invalidLine) {
    throw new Error("One or more cart lines have invalid quantity or price.");
  }

  const saleId = makeId("sale");
  const createdAtClient = new Date();
  const totalItems = input.lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  try {
    await runTransaction(firebaseDb, async (transaction) => {
      const productSnapshotsById = new Map<string, ProductLookupDocument>();
      const compoundRecipesByProductId = new Map<string, CompoundRecipeDocument>();
      const ingredientProductIds = new Set<string>();
      const stockDeductionByProductId = new Map<string, number>();
      const runningStockByProductId = new Map<string, number>();

      const addStockDeduction = (productId: string, deduction: number) => {
        const current = stockDeductionByProductId.get(productId) ?? 0;
        stockDeductionByProductId.set(productId, current + deduction);
      };

      // Firestore transactions require all reads to happen before any writes.
      for (const line of input.lines) {
        const productRef = doc(firebaseDb, "products", line.productId);
        const productSnapshot = await transaction.get(productRef);

        if (!productSnapshot.exists()) {
          throw new Error(`Product ${line.name} is no longer available.`);
        }

        const productData = productSnapshot.data() as ProductLookupDocument;

        if (productData.org_id !== orgId) {
          throw new Error(`Product ${line.name} belongs to a different organization.`);
        }

        if (!productData.is_active) {
          throw new Error(`Product ${line.name} is inactive.`);
        }

        productSnapshotsById.set(line.productId, productData);
      }

      for (const line of input.lines) {
        const productData = productSnapshotsById.get(line.productId);

        if (!productData) {
          throw new Error(`Product ${line.name} is no longer available.`);
        }

        if (resolveItemType(productData.item_type) !== "compound") {
          continue;
        }

        const recipeRef = doc(firebaseDb, "compound_product_recipes", line.productId);
        const recipeSnapshot = await transaction.get(recipeRef);

        if (!recipeSnapshot.exists()) {
          throw new Error(`Compound product ${line.name} does not have an active recipe.`);
        }

        const recipeData = recipeSnapshot.data() as CompoundRecipeDocument;

        if (recipeData.org_id !== orgId) {
          throw new Error(`Compound recipe for ${line.name} belongs to another organization.`);
        }

        if (recipeData.is_active === false) {
          throw new Error(`Compound recipe for ${line.name} is inactive.`);
        }

        if (!Array.isArray(recipeData.ingredients) || recipeData.ingredients.length === 0) {
          throw new Error(`Compound recipe for ${line.name} has no ingredients.`);
        }

        for (const ingredient of recipeData.ingredients) {
          if (!ingredient.product_id.trim()) {
            throw new Error(`Compound recipe for ${line.name} has an invalid ingredient.`);
          }

          if (
            !Number.isInteger(ingredient.quantity_per_output) ||
            ingredient.quantity_per_output <= 0
          ) {
            throw new Error(`Compound recipe for ${line.name} has invalid ingredient quantities.`);
          }

          ingredientProductIds.add(ingredient.product_id);
        }

        compoundRecipesByProductId.set(line.productId, recipeData);
      }

      for (const ingredientProductId of ingredientProductIds) {
        if (productSnapshotsById.has(ingredientProductId)) {
          continue;
        }

        const ingredientRef = doc(firebaseDb, "products", ingredientProductId);
        const ingredientSnapshot = await transaction.get(ingredientRef);

        if (!ingredientSnapshot.exists()) {
          throw new Error("One or more compound ingredients are no longer available.");
        }

        const ingredientData = ingredientSnapshot.data() as ProductLookupDocument;

        if (ingredientData.org_id !== orgId) {
          throw new Error("One or more compound ingredients belong to a different organization.");
        }

        productSnapshotsById.set(ingredientProductId, ingredientData);
      }

      for (const line of input.lines) {
        const productData = productSnapshotsById.get(line.productId);
        if (!productData) {
          throw new Error(`Product ${line.name} is no longer available.`);
        }

        const itemType = resolveItemType(productData.item_type);

        if (itemType === "stock") {
          addStockDeduction(line.productId, line.quantity);
          continue;
        }

        if (itemType !== "compound") {
          continue;
        }

        const recipe = compoundRecipesByProductId.get(line.productId);
        if (!recipe) {
          throw new Error(`Compound recipe for ${line.name} was not found.`);
        }

        for (const ingredient of recipe.ingredients) {
          const ingredientProduct = productSnapshotsById.get(ingredient.product_id);
          if (!ingredientProduct) {
            throw new Error("One or more compound ingredients are no longer available.");
          }

          if (resolveItemType(ingredientProduct.item_type) !== "stock") {
            throw new Error(`Compound ingredient ${ingredientProduct.name} must be a stock item.`);
          }

          addStockDeduction(ingredient.product_id, line.quantity * ingredient.quantity_per_output);
        }
      }

      for (const [productId, productData] of productSnapshotsById.entries()) {
        runningStockByProductId.set(productId, productData.current_stock);
      }

      for (const [productId, stockDeduction] of stockDeductionByProductId.entries()) {
        if (stockDeduction <= 0) {
          continue;
        }

        const productData = productSnapshotsById.get(productId);

        if (!productData) {
          throw new Error("Unable to update stock for one or more products.");
        }

        const productRef = doc(firebaseDb, "products", productId);
        transaction.update(productRef, {
          current_stock: productData.current_stock - stockDeduction,
          updated_by: input.soldBy,
          updated_at: serverTimestamp(),
        });
      }

      for (let index = 0; index < input.lines.length; index += 1) {
        const line = input.lines[index];
        const productData = productSnapshotsById.get(line.productId);

        if (!productData) {
          throw new Error(`Product ${line.name} is no longer available.`);
        }

        const itemType = resolveItemType(productData.item_type);
        const measurementUnit = resolveMeasurementUnit(productData.measurement_unit);
        const saleLineId = `${saleId}_${line.productId}_${index}`;
        const movementGroupId = makeId("mvgrp");

        const saleRef = doc(firebaseDb, "sales", saleLineId);

        transaction.set(saleRef, {
          org_id: orgId,
          sale_id: saleId,
          client_txn_id: saleLineId,
          product_id: line.productId,
          sku: productData.sku,
          item_type: itemType,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          total_amount: line.quantity * line.unitPrice,
          sold_by: input.soldBy,
          sold_at: serverTimestamp(),
          created_at_client: createdAtClient,
          device_id: process.env.EXPO_OS ?? "unknown",
          cart_id: input.cartId,
          cart_label: input.cartLabel ?? null,
        });

        const parentMovementType = itemType === "service" ? "service_sale" : "sale_parent";
        const parentStockDelta = itemType === "stock" ? -line.quantity : 0;

        const parentStockBefore =
          parentStockDelta !== 0
            ? (runningStockByProductId.get(line.productId) ?? productData.current_stock)
            : null;
        const parentStockAfter =
          parentStockBefore !== null ? parentStockBefore + parentStockDelta : null;

        if (parentStockAfter !== null) {
          runningStockByProductId.set(line.productId, parentStockAfter);
        }

        const parentMovementRef = doc(firebaseDb, "sale_inventory_movements", makeId("move"));
        transaction.set(parentMovementRef, {
          org_id: orgId,
          sale_id: saleId,
          sale_line_id: saleLineId,
          movement_group_id: movementGroupId,
          movement_type: parentMovementType,
          product_id: line.productId,
          product_name_snapshot: productData.name,
          product_sku_snapshot: productData.sku,
          parent_product_id: null,
          parent_item_type: itemType,
          quantity_sold: line.quantity,
          quantity_delta_stock: parentStockDelta,
          measurement_unit: measurementUnit,
          ...(parentStockBefore !== null
            ? {
                stock_before: parentStockBefore,
                stock_after: parentStockAfter,
              }
            : {}),
          moved_by: input.soldBy,
          moved_at: serverTimestamp(),
        });

        if (itemType !== "compound") {
          continue;
        }

        const recipe = compoundRecipesByProductId.get(line.productId);

        if (!recipe) {
          throw new Error(`Compound recipe for ${line.name} was not found.`);
        }

        for (const ingredient of recipe.ingredients) {
          const ingredientData = productSnapshotsById.get(ingredient.product_id);

          if (!ingredientData) {
            throw new Error("One or more compound ingredients are no longer available.");
          }

          const ingredientStockBefore =
            runningStockByProductId.get(ingredient.product_id) ?? ingredientData.current_stock;
          const ingredientDelta = -(line.quantity * ingredient.quantity_per_output);
          const ingredientStockAfter = ingredientStockBefore + ingredientDelta;

          runningStockByProductId.set(ingredient.product_id, ingredientStockAfter);

          const ingredientMovementRef = doc(firebaseDb, "sale_inventory_movements", makeId("move"));

          transaction.set(ingredientMovementRef, {
            org_id: orgId,
            sale_id: saleId,
            sale_line_id: saleLineId,
            movement_group_id: movementGroupId,
            movement_type: "compound_consumption",
            product_id: ingredient.product_id,
            product_name_snapshot: ingredientData.name,
            product_sku_snapshot: ingredientData.sku,
            parent_product_id: line.productId,
            parent_item_type: "compound",
            quantity_sold: line.quantity,
            quantity_delta_stock: ingredientDelta,
            measurement_unit: ingredient.measurement_unit,
            recipe_version_snapshot: recipe.version ?? 1,
            stock_before: ingredientStockBefore,
            stock_after: ingredientStockAfter,
            moved_by: input.soldBy,
            moved_at: serverTimestamp(),
          });
        }
      }
    });

    return {
      saleId,
      totalItems,
      totalAmount,
    };
  } catch (error) {
    if (error instanceof Error && !(error instanceof FirebaseError)) {
      throw error;
    }

    throw new Error(mapFirestoreError(error, "Unable to checkout this cart right now."));
  }
}

export function clearSalesProductCache() {
  productPoolCache = null;
}
