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
    where,
} from "firebase/firestore";

import { firebaseDb } from "@/config/firebase";
import { type ProductMeasurementUnit } from "@/services/products";

export type ItemType = "stock" | "compound" | "service";

export type CompoundRecipeIngredientInput = {
  productId: string;
  quantityPerOutput: number;
  measurementUnit: ProductMeasurementUnit;
};

export type UpsertCompoundRecipeInput = {
  orgId: string;
  compoundProductId: string;
  ingredients: CompoundRecipeIngredientInput[];
  isActive?: boolean;
};

export type CompoundRecipeIngredientRecord = {
  productId: string;
  quantityPerOutput: number;
  measurementUnit: ProductMeasurementUnit;
};

export type CompoundRecipeRecord = {
  id: string;
  orgId: string;
  compoundProductId: string;
  ingredients: CompoundRecipeIngredientRecord[];
  version: number;
  isActive: boolean;
  updatedBy: string;
};

type ProductReferenceDocument = {
  org_id: string;
};

type CompoundRecipeDocument = {
  org_id: string;
  compound_product_id: string;
  ingredients: {
    product_id: string;
    quantity_per_output: number;
    measurement_unit: ProductMeasurementUnit;
  }[];
  version?: number;
  is_active?: boolean;
  created_by?: string;
  updated_by: string;
};

function mapFirestoreError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  switch (error.code) {
    case "permission-denied":
      return "You do not have permission to manage compound recipes.";
    case "unavailable":
      return "Firestore is temporarily unavailable. Please try again.";
    default:
      return fallbackMessage;
  }
}

function normalizeOrgId(orgId: string) {
  return orgId.trim();
}

function normalizeProductId(productId: string) {
  return productId.trim();
}

function normalizeIngredients(ingredients: CompoundRecipeIngredientInput[]) {
  if (ingredients.length === 0) {
    throw new Error("Compound recipes require at least one ingredient.");
  }

  const seen = new Set<string>();

  return ingredients.map((ingredient) => {
    const productId = normalizeProductId(ingredient.productId);
    if (!productId) {
      throw new Error("Ingredient product is required.");
    }

    if (seen.has(productId)) {
      throw new Error("Ingredient product cannot be duplicated in the same recipe.");
    }
    seen.add(productId);

    if (!Number.isInteger(ingredient.quantityPerOutput) || ingredient.quantityPerOutput <= 0) {
      throw new Error("Ingredient quantity per output must be an integer greater than 0.");
    }

    return {
      product_id: productId,
      quantity_per_output: ingredient.quantityPerOutput,
      measurement_unit: ingredient.measurementUnit,
    };
  });
}

function mapRecipeRecord(recipeId: string, document: CompoundRecipeDocument): CompoundRecipeRecord {
  return {
    id: recipeId,
    orgId: document.org_id,
    compoundProductId: document.compound_product_id,
    ingredients: (document.ingredients ?? []).map((ingredient) => ({
      productId: ingredient.product_id,
      quantityPerOutput: ingredient.quantity_per_output,
      measurementUnit: ingredient.measurement_unit,
    })),
    version: document.version ?? 1,
    isActive: document.is_active ?? true,
    updatedBy: document.updated_by,
  };
}

export async function upsertCompoundRecipe(input: UpsertCompoundRecipeInput, user: User) {
  const orgId = normalizeOrgId(input.orgId);
  const compoundProductId = normalizeProductId(input.compoundProductId);
  const ingredients = normalizeIngredients(input.ingredients);

  if (!orgId) {
    throw new Error("Organization context is missing for this recipe.");
  }

  if (!compoundProductId) {
    throw new Error("Compound product id is required.");
  }

  if (ingredients.some((ingredient) => ingredient.product_id === compoundProductId)) {
    throw new Error("Compound product cannot include itself as an ingredient.");
  }

  try {
    const result = await runTransaction(firebaseDb, async (transaction) => {
      const recipeRef = doc(firebaseDb, "compound_product_recipes", compoundProductId);
      const recipeSnapshot = await transaction.get(recipeRef);
      const existingRecipe = recipeSnapshot.exists()
        ? (recipeSnapshot.data() as CompoundRecipeDocument)
        : null;

      if (existingRecipe && existingRecipe.org_id !== orgId) {
        throw new Error("Compound recipe belongs to a different organization.");
      }

      const parentProductRef = doc(firebaseDb, "products", compoundProductId);
      const parentProductSnapshot = await transaction.get(parentProductRef);
      if (!parentProductSnapshot.exists()) {
        throw new Error("Compound product does not exist.");
      }

      const parentProductData = parentProductSnapshot.data() as ProductReferenceDocument;
      if (parentProductData.org_id !== orgId) {
        throw new Error("Compound product belongs to a different organization.");
      }

      for (const ingredient of ingredients) {
        const ingredientRef = doc(firebaseDb, "products", ingredient.product_id);
        const ingredientSnapshot = await transaction.get(ingredientRef);

        if (!ingredientSnapshot.exists()) {
          throw new Error("One or more ingredient products do not exist.");
        }

        const ingredientData = ingredientSnapshot.data() as ProductReferenceDocument;
        if (ingredientData.org_id !== orgId) {
          throw new Error("One or more ingredient products belong to another organization.");
        }
      }

      const nextVersion = (existingRecipe?.version ?? 0) + 1;
      const nextIsActive = input.isActive ?? existingRecipe?.is_active ?? true;

      const payload: Record<string, unknown> = {
        org_id: orgId,
        compound_product_id: compoundProductId,
        ingredients,
        version: nextVersion,
        is_active: nextIsActive,
        created_by: existingRecipe?.created_by ?? user.uid,
        updated_by: user.uid,
        updated_at: serverTimestamp(),
      };

      if (!existingRecipe) {
        payload.created_at = serverTimestamp();
      }

      transaction.set(recipeRef, payload, { merge: true });

      return {
        recipeId: recipeRef.id,
        version: nextVersion,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(mapFirestoreError(error, "Unable to save compound recipe right now."));
  }
}

export async function getCompoundRecipe(orgId: string, compoundProductId: string) {
  const normalizedOrgId = normalizeOrgId(orgId);
  const normalizedProductId = normalizeProductId(compoundProductId);

  if (!normalizedOrgId || !normalizedProductId) {
    return null;
  }

  try {
    const recipeSnapshot = await getDoc(
      doc(firebaseDb, "compound_product_recipes", normalizedProductId),
    );
    if (!recipeSnapshot.exists()) {
      return null;
    }

    const recipeData = recipeSnapshot.data() as CompoundRecipeDocument;
    if (recipeData.org_id !== normalizedOrgId) {
      return null;
    }

    return mapRecipeRecord(recipeSnapshot.id, recipeData);
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to load compound recipe right now."));
  }
}

export async function listCompoundRecipes(orgId: string, options?: { isActive?: boolean }) {
  const normalizedOrgId = normalizeOrgId(orgId);
  if (!normalizedOrgId) {
    return [] as CompoundRecipeRecord[];
  }

  try {
    const constraints = [where("org_id", "==", normalizedOrgId), limit(100)];

    if (options?.isActive !== undefined) {
      constraints.push(where("is_active", "==", options.isActive));
    }

    const recipesQuery = query(collection(firebaseDb, "compound_product_recipes"), ...constraints);
    const snapshot = await getDocs(recipesQuery);

    return snapshot.docs
      .map((documentSnapshot) =>
        mapRecipeRecord(documentSnapshot.id, documentSnapshot.data() as CompoundRecipeDocument),
      )
      .sort((first, second) => second.version - first.version);
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to list compound recipes right now."));
  }
}
