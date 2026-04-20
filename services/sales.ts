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
  barcode?: string;
  name: string;
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

function mapProduct(documentId: string, data: ProductLookupDocument): ProductLookupItem {
  const sellingPrice = data.sale_price ?? data.unit_price ?? 0;

  return {
    id: documentId,
    orgId: data.org_id,
    sku: data.sku,
    barcode: data.barcode,
    name: data.name,
    currentStock: data.current_stock,
    stockThreshold: data.stock_threshold,
    unitPrice: sellingPrice,
    isActive: data.is_active,
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

      for (let index = 0; index < input.lines.length; index += 1) {
        const line = input.lines[index];
        const productRef = doc(firebaseDb, "products", line.productId);
        const productData = productSnapshotsById.get(line.productId);

        if (!productData) {
          throw new Error(`Product ${line.name} is no longer available.`);
        }

        transaction.update(productRef, {
          current_stock: productData.current_stock - line.quantity,
          updated_by: input.soldBy,
          updated_at: serverTimestamp(),
        });

        const saleDocId = `${saleId}_${line.productId}_${index}`;
        const saleRef = doc(firebaseDb, "sales", saleDocId);

        transaction.set(saleRef, {
          org_id: orgId,
          sale_id: saleId,
          client_txn_id: saleDocId,
          product_id: line.productId,
          sku: line.sku,
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
      }
    });

    return {
      saleId,
      totalItems,
      totalAmount,
    };
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to checkout this cart right now."));
  }
}

export function clearSalesProductCache() {
  productPoolCache = null;
}
