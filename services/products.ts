import { FirebaseError } from "firebase/app";
import { type User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { firebaseDb } from "@/config/firebase";

export type ProductCreateInput = {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  currentStock: number;
  stockThreshold: number;
  unitPrice: number;
};

export type ProductCreatePayload = {
  org_id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  current_stock: number;
  stock_threshold: number;
  unit_price: number;
  is_active: boolean;
  created_by: string;
  updated_by: string;
  created_at: ReturnType<typeof serverTimestamp>;
  updated_at: ReturnType<typeof serverTimestamp>;
};

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toPayload(input: ProductCreateInput, user: User, orgId: string): ProductCreatePayload {
  const sku = input.sku.trim().toUpperCase();
  const barcode = normalizeOptionalText(input.barcode);

  return {
    org_id: orgId,
    sku,
    barcode,
    name: input.name.trim(),
    description: normalizeOptionalText(input.description),
    category: normalizeOptionalText(input.category),
    current_stock: input.currentStock,
    stock_threshold: input.stockThreshold,
    unit_price: input.unitPrice,
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
      return "Unable to add product right now. Please try again.";
  }
}

export async function createProduct(input: ProductCreateInput, user: User) {
  const tokenResult = await user.getIdTokenResult();
  const orgId = tokenResult.claims.orgId;

  if (typeof orgId !== "string" || orgId.length === 0) {
    throw new Error("Organization context is missing for this account.");
  }

  const payload = toPayload(input, user, orgId);

  try {
    const docRef = await addDoc(collection(firebaseDb, "products"), payload);
    return docRef.id;
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}
