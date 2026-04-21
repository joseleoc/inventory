import { type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { FormFieldErrorAtom } from "@/components/atoms/form-field-error-atom";
import { BarcodeScannerInputMolecule } from "@/components/molecules/barcode-scanner-input-molecule";
import {
    CompoundIngredientItemMolecule,
    type CompoundIngredientDraft,
} from "@/components/molecules/compound-ingredient-item-molecule";
import { LabeledInputFieldMolecule } from "@/components/molecules/labeled-input-field-molecule";
import {
    parseNonNegativeNumber,
    parsePositiveInteger,
} from "@/components/organisms/product-form-helpers";
import { ProductSelector } from "@/components/product-selector";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { useCompoundRecipe, useUpsertCompoundRecipeMutation } from "@/hooks/use-compound-recipes";
import { getProductById, updateProduct, type ProductRecord } from "@/services/products";
import { type ProductLookupItem } from "@/services/sales";

type ShowToast = (message: string, type?: "success" | "error") => void;

type CompoundProductDetailsFormOrganismProps = {
  product: ProductRecord;
  orgId: string;
  user: User;
  showToast: ShowToast;
  onSaved: () => Promise<void> | void;
  disabled?: boolean;
};

type FormState = {
  sku: string;
  name: string;
  salePrice: string;
  barcode: string;
  category: string;
  description: string;
  ingredientSearch: string;
};

type FieldErrors = {
  sku?: string;
  name?: string;
  salePrice?: string;
  ingredients?: string;
};

function toFormState(product: ProductRecord): FormState {
  return {
    sku: product.sku,
    name: product.name,
    salePrice: String(product.salePrice),
    barcode: product.barcode ?? "",
    category: product.category ?? "",
    description: product.description ?? "",
    ingredientSearch: "",
  };
}

export function CompoundProductDetailsFormOrganism({
  product,
  orgId,
  user,
  showToast,
  onSaved,
  disabled,
}: CompoundProductDetailsFormOrganismProps) {
  const [formState, setFormState] = useState<FormState>(() => toFormState(product));
  const [ingredientDrafts, setIngredientDrafts] = useState<CompoundIngredientDraft[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isHydratingIngredients, setIsHydratingIngredients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seededRecipeVersion, setSeededRecipeVersion] = useState<number | null>(null);

  const recipeQuery = useCompoundRecipe(orgId, product.id);
  const recipeMutation = useUpsertCompoundRecipeMutation();
  const accentColor = useMemo(() => "#0a7ea4", []);

  const selectedIngredientIds = useMemo(
    () => ingredientDrafts.map((ingredient) => ingredient.productId),
    [ingredientDrafts],
  );

  useEffect(() => {
    setFormState(toFormState(product));
    setIngredientDrafts([]);
    setErrors({});
    setSubmitError(null);
    setSeededRecipeVersion(null);
  }, [product]);

  useEffect(() => {
    let isActive = true;

    const hydrateIngredients = async () => {
      if (!recipeQuery.data) {
        if (seededRecipeVersion === null) {
          setIngredientDrafts([]);
        }
        return;
      }

      if (seededRecipeVersion === recipeQuery.data.version) {
        return;
      }

      setIsHydratingIngredients(true);

      try {
        const hydratedIngredients = await Promise.all(
          recipeQuery.data.ingredients.map(async (ingredient) => {
            const ingredientRecord = await getProductById(ingredient.productId, orgId);

            return {
              productId: ingredient.productId,
              sku: ingredientRecord?.sku ?? ingredient.productId,
              name: ingredientRecord?.name ?? ingredient.productId,
              measurementUnit: ingredient.measurementUnit,
              quantityPerOutput: String(ingredient.quantityPerOutput),
            } as CompoundIngredientDraft;
          }),
        );

        if (!isActive) {
          return;
        }

        setIngredientDrafts(hydratedIngredients);
        setSeededRecipeVersion(recipeQuery.data.version);
      } catch {
        if (!isActive) {
          return;
        }

        showToast(t("productDetails.toasts.loadRecipeError"), "error");
      } finally {
        if (isActive) {
          setIsHydratingIngredients(false);
        }
      }
    };

    void hydrateIngredients();

    return () => {
      isActive = false;
    };
  }, [orgId, recipeQuery.data, seededRecipeVersion, showToast]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));

    if (field === "sku" || field === "name" || field === "salePrice") {
      setErrors((current) => {
        const next = { ...current };

        if (field === "sku") {
          delete next.sku;
        }

        if (field === "name") {
          delete next.name;
        }

        if (field === "salePrice") {
          delete next.salePrice;
        }

        return next;
      });
    }
  };

  const handleSelectIngredient = (lookupProduct: ProductLookupItem) => {
    if (lookupProduct.itemType !== "stock") {
      showToast(t("productDetails.toasts.nonStockOnly"), "error");
      return;
    }

    if (selectedIngredientIds.includes(lookupProduct.id)) {
      showToast(t("productDetails.toasts.duplicateIngredient"), "error");
      return;
    }

    setSubmitError(null);
    setIngredientDrafts((current) => [
      ...current,
      {
        productId: lookupProduct.id,
        sku: lookupProduct.sku,
        name: lookupProduct.name,
        measurementUnit: lookupProduct.measurementUnit,
        quantityPerOutput: "1",
      },
    ]);

    setErrors((current) => {
      const next = { ...current };
      delete next.ingredients;
      return next;
    });
  };

  const removeIngredient = (productId: string) => {
    setIngredientDrafts((current) =>
      current.filter((ingredient) => ingredient.productId !== productId),
    );
  };

  const updateIngredientQuantity = (productId: string, value: string) => {
    setIngredientDrafts((current) =>
      current.map((ingredient) =>
        ingredient.productId === productId
          ? {
              ...ingredient,
              quantityPerOutput: value,
            }
          : ingredient,
      ),
    );
  };

  const handleSubmit = async () => {
    if (disabled || isSubmitting || recipeMutation.isPending) {
      return;
    }

    const nextErrors: FieldErrors = {};
    const sku = formState.sku.trim().toUpperCase();
    const name = formState.name.trim();
    const salePrice = parseNonNegativeNumber(formState.salePrice);

    if (!sku) {
      nextErrors.sku = t("addProduct.validation.skuRequired");
    }

    if (!name) {
      nextErrors.name = t("addProduct.validation.nameRequired");
    }

    if (salePrice === null) {
      nextErrors.salePrice = t("addProduct.validation.salePrice");
    }

    if (ingredientDrafts.length === 0) {
      nextErrors.ingredients = t("productDetails.toasts.ingredientsRequired");
    }

    const parsedIngredients = ingredientDrafts.map((ingredient) => ({
      ...ingredient,
      parsedQuantity: parsePositiveInteger(ingredient.quantityPerOutput),
    }));

    if (parsedIngredients.some((ingredient) => ingredient.parsedQuantity === null)) {
      nextErrors.ingredients = t("productDetails.toasts.ingredientQuantity");
    }

    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0 || salePrice === null) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProduct(
        {
          productId: product.id,
          sku,
          name,
          barcode: formState.barcode,
          category: formState.category,
          description: formState.description,
          salePrice,
          reason: t("productDetails.saveReason"),
        },
        user,
        orgId,
      );

      await recipeMutation.mutateAsync({
        user,
        input: {
          orgId,
          compoundProductId: product.id,
          isActive: true,
          ingredients: parsedIngredients.map((ingredient) => ({
            productId: ingredient.productId,
            quantityPerOutput: ingredient.parsedQuantity ?? 1,
            measurementUnit: ingredient.measurementUnit,
          })),
        },
      });

      await onSaved();
      showToast(t("productDetails.toasts.compoundSaved"), "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("productDetails.toasts.compoundSaveError");
      setSubmitError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("productDetails.compoundDetailsSection")}
        </ThemedText>

        <LabeledInputFieldMolecule
          label={t("productDetails.fields.sku")}
          value={formState.sku}
          onChangeText={(value) => updateField("sku", value)}
          placeholder={t("productDetails.placeholders.sku")}
          autoCapitalize="characters"
          errorMessage={errors.sku}
        />

        <LabeledInputFieldMolecule
          label={t("productDetails.fields.name")}
          value={formState.name}
          onChangeText={(value) => updateField("name", value)}
          placeholder={t("productDetails.placeholders.productName")}
          errorMessage={errors.name}
        />

        <LabeledInputFieldMolecule
          label={t("productDetails.fields.salePrice")}
          value={formState.salePrice}
          onChangeText={(value) => updateField("salePrice", value)}
          placeholder={t("productDetails.placeholders.zero")}
          keyboardType="decimal-pad"
          errorMessage={errors.salePrice}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("productDetails.detailsSection")}
        </ThemedText>

        <BarcodeScannerInputMolecule
          label={t("productDetails.fields.barcode")}
          value={formState.barcode}
          onChangeText={(value) => updateField("barcode", value)}
          placeholder={t("productDetails.placeholders.barcode")}
          autoCapitalize="characters"
        />

        <LabeledInputFieldMolecule
          label={t("productDetails.fields.category")}
          value={formState.category}
          onChangeText={(value) => updateField("category", value)}
          placeholder={t("productDetails.placeholders.category")}
        />

        <LabeledInputFieldMolecule
          label={t("productDetails.fields.description")}
          value={formState.description}
          onChangeText={(value) => updateField("description", value)}
          placeholder={t("productDetails.placeholders.description")}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputStyle={styles.multiline}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("productDetails.compoundRecipeSection")}
        </ThemedText>

        <ProductSelector
          organizationId={orgId}
          query={formState.ingredientSearch}
          onQueryChange={(value) => updateField("ingredientSearch", value)}
          onSelectProduct={handleSelectIngredient}
          filterResult={(lookupProduct) => lookupProduct.itemType === "stock"}
          excludedProductIds={selectedIngredientIds}
          actionLabel={t("productDetails.addIngredient")}
          label={t("productDetails.fields.ingredientSearch")}
          placeholder={t("productDetails.placeholders.ingredientSearch")}
          emptyMessage={t("productDetails.searchIngredientEmpty")}
        />

        {recipeQuery.isLoading || isHydratingIngredients ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
            <ThemedText>{t("productDetails.recipeLoading")}</ThemedText>
          </View>
        ) : null}

        {!recipeQuery.isLoading && !isHydratingIngredients && ingredientDrafts.length === 0 ? (
          <ThemedText style={styles.helperText}>{t("productDetails.noIngredients")}</ThemedText>
        ) : null}

        {ingredientDrafts.length > 0 ? (
          <View style={styles.ingredientList}>
            {ingredientDrafts.map((ingredient) => (
              <CompoundIngredientItemMolecule
                key={ingredient.productId}
                ingredient={ingredient}
                onChangeQuantity={updateIngredientQuantity}
                onRemove={removeIngredient}
                metaText={t("productDetails.ingredientMeta", {
                  sku: ingredient.sku,
                  unit: ingredient.measurementUnit,
                })}
                quantityLabel={t("productDetails.fields.quantityPerOutput")}
                quantityPlaceholder={t("productDetails.placeholders.quantityPerOutput")}
                removeLabel={t("productDetails.removeIngredient")}
              />
            ))}
          </View>
        ) : null}

        <FormFieldErrorAtom message={errors.ingredients} />
      </View>

      <FormFieldErrorAtom message={submitError ?? undefined} />

      <Pressable
        onPress={() => void handleSubmit()}
        disabled={Boolean(disabled) || isSubmitting || recipeMutation.isPending}
        style={({ pressed }) => [
          styles.submitButton,
          {
            backgroundColor: accentColor,
            opacity: pressed || isSubmitting || recipeMutation.isPending || disabled ? 0.8 : 1,
          },
        ]}>
        {isSubmitting || recipeMutation.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText style={styles.submitText}>{t("productDetails.saveChanges")}</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
  },
  multiline: {
    minHeight: 96,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helperText: {
    fontSize: 13,
    color: "#7A7A7A",
  },
  ingredientList: {
    gap: 10,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  submitText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
