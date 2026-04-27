import { type User } from "firebase/auth";
import { useMemo, useState } from "react";
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
import { useUpsertCompoundRecipeMutation } from "@/hooks/use-compound-recipes";
import { createProduct } from "@/services/products";
import { clearSalesProductCache, type ProductLookupItem } from "@/services/sales";

type CompoundProductFormOrganismProps = {
  orgId: string;
  user: User;
  disabled?: boolean;
  onSuccess?: (productName: string) => void;
  onError?: (message: string) => void;
};

type CompoundFormState = {
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

const INITIAL_STATE: CompoundFormState = {
  sku: "",
  name: "",
  salePrice: "0",
  barcode: "",
  category: "",
  description: "",
  ingredientSearch: "",
};

export function CompoundProductFormOrganism({
  orgId,
  user,
  disabled,
  onSuccess,
  onError,
}: CompoundProductFormOrganismProps) {
  const [formState, setFormState] = useState<CompoundFormState>(INITIAL_STATE);
  const [ingredientDrafts, setIngredientDrafts] = useState<CompoundIngredientDraft[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recipeMutation = useUpsertCompoundRecipeMutation();
  const accentColor = useMemo(() => "#0a7ea4", []);

  const selectedIngredientIds = useMemo(
    () => ingredientDrafts.map((ingredient) => ingredient.productId),
    [ingredientDrafts],
  );

  const updateField = <K extends keyof CompoundFormState>(
    field: K,
    value: CompoundFormState[K],
  ) => {
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

  const addIngredient = (ingredient: CompoundIngredientDraft) => {
    setIngredientDrafts((current) => [...current, ingredient]);

    setErrors((current) => {
      if (!current.ingredients) {
        return current;
      }

      const next = { ...current };
      delete next.ingredients;
      return next;
    });
  };

  const handleSelectIngredient = (product: ProductLookupItem) => {
    if (product.itemType !== "stock") {
      setSubmitError(t("addProduct.compound.validation.nonStockOnly"));
      return;
    }

    if (selectedIngredientIds.includes(product.id)) {
      setSubmitError(t("addProduct.compound.validation.duplicateIngredient"));
      return;
    }

    setSubmitError(null);
    addIngredient({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      measurementUnit: product.measurementUnit,
      quantityPerOutput: "1",
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
    if (disabled || isSubmitting) {
      return;
    }

    const nextErrors: FieldErrors = {};
    const sku = formState.sku.trim();
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
      nextErrors.ingredients = t("addProduct.compound.validation.ingredientsRequired");
    }

    const parsedIngredients = ingredientDrafts.map((ingredient) => ({
      ...ingredient,
      parsedQuantity: parsePositiveInteger(ingredient.quantityPerOutput),
    }));

    if (parsedIngredients.some((ingredient) => ingredient.parsedQuantity === null)) {
      nextErrors.ingredients = t("addProduct.compound.validation.ingredientQuantity");
    }

    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0 || salePrice === null) {
      return;
    }

    setIsSubmitting(true);

    let createdProductId: string | null = null;

    try {
      createdProductId = await createProduct(
        {
          sku,
          barcode: formState.barcode,
          name,
          description: formState.description,
          category: formState.category,
          itemType: "compound",
          currentStock: 0,
          stockThreshold: 0,
          salePrice,
          purchaseUnitCost: 0,
          purchaseQuantity: 0,
          measurementUnit: "unit",
        },
        user,
        orgId,
      );

      await recipeMutation.mutateAsync({
        user,
        input: {
          orgId,
          compoundProductId: createdProductId,
          isActive: true,
          ingredients: parsedIngredients.map((ingredient) => ({
            productId: ingredient.productId,
            quantityPerOutput: ingredient.parsedQuantity ?? 1,
            measurementUnit: ingredient.measurementUnit,
          })),
        },
      });

      clearSalesProductCache();
      onSuccess?.(name);
      setFormState(INITIAL_STATE);
      setIngredientDrafts([]);
    } catch (error) {
      const message =
        createdProductId !== null
          ? t("addProduct.compound.partialRecipeSaveError", { name })
          : error instanceof Error
            ? error.message
            : t("addProduct.compound.errorUnable");

      if (createdProductId !== null) {
        clearSalesProductCache();
      }

      setSubmitError(message);
      onError?.(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("addProduct.compound.requiredDetails")}
        </ThemedText>

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.sku")}
          value={formState.sku}
          onChangeText={(value) => updateField("sku", value)}
          placeholder={t("addProduct.placeholders.sku")}
          autoCapitalize="characters"
          errorMessage={errors.sku}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.productName")}
          value={formState.name}
          onChangeText={(value) => updateField("name", value)}
          placeholder={t("addProduct.placeholders.productName")}
          errorMessage={errors.name}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.salePrice")}
          value={formState.salePrice}
          onChangeText={(value) => updateField("salePrice", value)}
          placeholder={t("addProduct.placeholders.salePrice")}
          keyboardType="decimal-pad"
          errorMessage={errors.salePrice}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("addProduct.optionalDetails")}
        </ThemedText>

        <BarcodeScannerInputMolecule
          label={t("addProduct.fields.barcode")}
          value={formState.barcode}
          onChangeText={(value) => updateField("barcode", value)}
          placeholder={t("addProduct.placeholders.barcode")}
          autoCapitalize="characters"
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.category")}
          value={formState.category}
          onChangeText={(value) => updateField("category", value)}
          placeholder={t("addProduct.placeholders.category")}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.description")}
          value={formState.description}
          onChangeText={(value) => updateField("description", value)}
          placeholder={t("addProduct.placeholders.description")}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputStyle={styles.multiline}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("addProduct.compound.ingredientsTitle")}
        </ThemedText>

        <ProductSelector
          organizationId={orgId}
          query={formState.ingredientSearch}
          onQueryChange={(value) => updateField("ingredientSearch", value)}
          onSelectProduct={handleSelectIngredient}
          filterResult={(product) => product.itemType === "stock"}
          excludedProductIds={selectedIngredientIds}
          actionLabel={t("addProduct.compound.addIngredient")}
          label={t("addProduct.compound.fields.ingredientSearch")}
          placeholder={t("addProduct.compound.placeholders.ingredientSearch")}
          emptyMessage={t("addProduct.compound.searchEmpty")}
        />

        {ingredientDrafts.length === 0 ? (
          <ThemedText style={styles.helperText}>
            {t("addProduct.compound.noIngredients")}
          </ThemedText>
        ) : (
          <View style={styles.ingredientList}>
            {ingredientDrafts.map((ingredient) => (
              <CompoundIngredientItemMolecule
                key={ingredient.productId}
                ingredient={ingredient}
                onChangeQuantity={updateIngredientQuantity}
                onRemove={removeIngredient}
              />
            ))}
          </View>
        )}

        <FormFieldErrorAtom message={errors.ingredients} />
      </View>

      <FormFieldErrorAtom message={submitError ?? undefined} />

      <Pressable
        onPress={handleSubmit}
        disabled={Boolean(disabled) || isSubmitting}
        style={({ pressed }) => [
          styles.submitButton,
          {
            backgroundColor: accentColor,
            opacity: pressed || isSubmitting || disabled ? 0.8 : 1,
          },
        ]}>
        {isSubmitting || recipeMutation.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText style={styles.submitText}>{t("addProduct.compound.submit")}</ThemedText>
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
    marginTop: 8,
  },
  submitText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  successText: {
    color: "#1E8E3E",
    fontSize: 13,
  },
});
