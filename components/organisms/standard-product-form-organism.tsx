import { type User } from "firebase/auth";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { FormFieldErrorAtom } from "@/components/atoms/form-field-error-atom";
import { BarcodeScannerInputMolecule } from "@/components/molecules/barcode-scanner-input-molecule";
import { LabeledInputFieldMolecule } from "@/components/molecules/labeled-input-field-molecule";
import {
  isValidMeasurementUnit,
  parseInteger,
  parseNonNegativeNumber,
} from "@/components/organisms/product-form-helpers";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { createProduct, type ProductCreateInput } from "@/services/products";
import { clearSalesProductCache } from "@/services/sales";

type StandardProductFormOrganismProps = {
  orgId: string;
  user: User;
  disabled?: boolean;
  onSuccess?: (productName: string) => void;
};

type FormState = {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  currentStock: string;
  stockThreshold: string;
  salePrice: string;
  purchaseUnitCost: string;
  purchaseQuantity: string;
  measurementUnit: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  category: "",
  currentStock: "0",
  stockThreshold: "10",
  salePrice: "0",
  purchaseUnitCost: "0",
  purchaseQuantity: "0",
  measurementUnit: "unit",
};

function validateForm(state: FormState) {
  const errors: FieldErrors = {};

  const sku = state.sku.trim();
  if (!sku) {
    errors.sku = t("addProduct.validation.skuRequired");
  }

  const name = state.name.trim();
  if (!name) {
    errors.name = t("addProduct.validation.nameRequired");
  }

  const currentStock = parseInteger(state.currentStock);
  if (currentStock === null || currentStock < 0) {
    errors.currentStock = t("addProduct.validation.currentStock");
  }

  const stockThreshold = parseInteger(state.stockThreshold);
  if (stockThreshold === null || stockThreshold < 0) {
    errors.stockThreshold = t("addProduct.validation.stockThreshold");
  }

  const salePrice = parseNonNegativeNumber(state.salePrice);
  if (salePrice === null) {
    errors.salePrice = t("addProduct.validation.salePrice");
  }

  const purchaseUnitCost = parseNonNegativeNumber(state.purchaseUnitCost);
  if (purchaseUnitCost === null) {
    errors.purchaseUnitCost = t("addProduct.validation.purchaseUnitCost");
  }

  const purchaseQuantity = parseNonNegativeNumber(state.purchaseQuantity);
  if (purchaseQuantity === null) {
    errors.purchaseQuantity = t("addProduct.validation.purchaseQuantity");
  }

  const normalizedMeasurementUnit = state.measurementUnit.trim().toLowerCase();
  if (!isValidMeasurementUnit(normalizedMeasurementUnit)) {
    errors.measurementUnit = t("addProduct.validation.measurementUnit");
  }

  const hasErrors = Object.keys(errors).length > 0;
  if (
    hasErrors ||
    currentStock === null ||
    stockThreshold === null ||
    salePrice === null ||
    purchaseUnitCost === null ||
    purchaseQuantity === null
  ) {
    return { errors, parsed: null };
  }

  const parsed: ProductCreateInput = {
    sku,
    barcode: state.barcode,
    name,
    description: state.description,
    category: state.category,
    itemType: "stock",
    currentStock,
    stockThreshold,
    salePrice,
    purchaseUnitCost,
    purchaseQuantity,
    measurementUnit: normalizedMeasurementUnit,
  };

  return { errors, parsed };
}

export function StandardProductFormOrganism({
  orgId,
  user,
  disabled,
  onSuccess,
}: StandardProductFormOrganismProps) {
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const accentColor = useMemo(() => "#0a7ea4", []);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (disabled || isSubmitting) {
      return;
    }

    const { errors: nextErrors, parsed } = validateForm(formState);
    setErrors(nextErrors);
    setSubmitError(null);

    if (!parsed) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createProduct(parsed, user, orgId);
      clearSalesProductCache();

      onSuccess?.(parsed.name);
      setFormState((current) => ({
        ...INITIAL_STATE,
        stockThreshold: current.stockThreshold,
        measurementUnit: current.measurementUnit,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("addProduct.errorUnable");
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("addProduct.requiredDetails")}
        </ThemedText>

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.sku")}
          value={formState.sku}
          onChangeText={(value) => updateField("sku", value)}
          placeholder={t("addProduct.placeholders.sku")}
          autoCapitalize="characters"
          accessibilityLabel={t("addProduct.fields.sku")}
          errorMessage={errors.sku}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.productName")}
          value={formState.name}
          onChangeText={(value) => updateField("name", value)}
          placeholder={t("addProduct.placeholders.productName")}
          accessibilityLabel={t("addProduct.fields.productName")}
          errorMessage={errors.name}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.currentStock")}
          value={formState.currentStock}
          onChangeText={(value) => updateField("currentStock", value)}
          placeholder={t("addProduct.placeholders.currentStock")}
          keyboardType="number-pad"
          accessibilityLabel={t("addProduct.fields.currentStock")}
          errorMessage={errors.currentStock}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.stockThreshold")}
          value={formState.stockThreshold}
          onChangeText={(value) => updateField("stockThreshold", value)}
          placeholder={t("addProduct.placeholders.stockThreshold")}
          keyboardType="number-pad"
          accessibilityLabel={t("addProduct.fields.stockThreshold")}
          errorMessage={errors.stockThreshold}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.salePrice")}
          value={formState.salePrice}
          onChangeText={(value) => updateField("salePrice", value)}
          placeholder={t("addProduct.placeholders.salePrice")}
          keyboardType="decimal-pad"
          accessibilityLabel={t("addProduct.fields.salePrice")}
          errorMessage={errors.salePrice}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.purchaseUnitCost")}
          value={formState.purchaseUnitCost}
          onChangeText={(value) => updateField("purchaseUnitCost", value)}
          placeholder={t("addProduct.placeholders.purchaseUnitCost")}
          keyboardType="decimal-pad"
          accessibilityLabel={t("addProduct.fields.purchaseUnitCost")}
          errorMessage={errors.purchaseUnitCost}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.purchaseQuantity")}
          value={formState.purchaseQuantity}
          onChangeText={(value) => updateField("purchaseQuantity", value)}
          placeholder={t("addProduct.placeholders.purchaseQuantity")}
          keyboardType="decimal-pad"
          accessibilityLabel={t("addProduct.fields.purchaseQuantity")}
          errorMessage={errors.purchaseQuantity}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.measurementUnit")}
          value={formState.measurementUnit}
          onChangeText={(value) => updateField("measurementUnit", value)}
          placeholder={t("addProduct.placeholders.measurementUnit")}
          autoCapitalize="none"
          accessibilityLabel={t("addProduct.fields.measurementUnit")}
          errorMessage={errors.measurementUnit}
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
          accessibilityLabel={t("addProduct.fields.barcode")}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.category")}
          value={formState.category}
          onChangeText={(value) => updateField("category", value)}
          placeholder={t("addProduct.placeholders.category")}
          accessibilityLabel={t("addProduct.fields.category")}
        />

        <LabeledInputFieldMolecule
          label={t("addProduct.fields.description")}
          value={formState.description}
          onChangeText={(value) => updateField("description", value)}
          placeholder={t("addProduct.placeholders.description")}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel={t("addProduct.fields.description")}
          inputStyle={styles.multiline}
        />
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
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText style={styles.submitText}>{t("addProduct.submit")}</ThemedText>
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
