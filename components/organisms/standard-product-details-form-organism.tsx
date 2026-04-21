import { type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { BarcodeScannerInputMolecule } from "@/components/molecules/barcode-scanner-input-molecule";
import { LabeledInputFieldMolecule } from "@/components/molecules/labeled-input-field-molecule";
import {
  isValidMeasurementUnit,
  parseInteger,
  parseNonNegativeNumber,
} from "@/components/organisms/product-form-helpers";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { updateProduct, type ProductRecord } from "@/services/products";

type ShowToast = (message: string, type?: "success" | "error") => void;

type StandardProductDetailsFormOrganismProps = {
  product: ProductRecord;
  orgId: string;
  user: User;
  showToast: ShowToast;
  onSaved: () => Promise<void> | void;
  disabled?: boolean;
};

type EditFormState = {
  sku: string;
  name: string;
  barcode: string;
  category: string;
  description: string;
  stockThreshold: string;
  salePrice: string;
  purchaseUnitCost: string;
  purchaseQuantity: string;
  measurementUnit: string;
};

function toEditFormState(product: ProductRecord): EditFormState {
  return {
    sku: product.sku,
    name: product.name,
    barcode: product.barcode ?? "",
    category: product.category ?? "",
    description: product.description ?? "",
    stockThreshold: String(product.stockThreshold),
    salePrice: String(product.salePrice),
    purchaseUnitCost: String(product.purchaseUnitCost),
    purchaseQuantity: String(product.purchaseQuantity),
    measurementUnit: product.measurementUnit,
  };
}

export function StandardProductDetailsFormOrganism({
  product,
  orgId,
  user,
  showToast,
  onSaved,
  disabled,
}: StandardProductDetailsFormOrganismProps) {
  const [formState, setFormState] = useState<EditFormState>(() => toEditFormState(product));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const accentColor = useMemo(() => "#0a7ea4", []);

  useEffect(() => {
    setFormState(toEditFormState(product));
  }, [product]);

  const updateField = <K extends keyof EditFormState>(field: K, value: EditFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (disabled || isSubmitting) {
      return;
    }

    const sku = formState.sku.trim().toUpperCase();
    const name = formState.name.trim();
    if (!sku || !name) {
      showToast(t("productDetails.toasts.skuAndNameRequired"), "error");
      return;
    }

    const stockThreshold = parseInteger(formState.stockThreshold);
    if (stockThreshold === null || stockThreshold < 0) {
      showToast(t("productDetails.toasts.stockThreshold"), "error");
      return;
    }

    const salePrice = parseNonNegativeNumber(formState.salePrice);
    if (salePrice === null) {
      showToast(t("productDetails.toasts.salePrice"), "error");
      return;
    }

    const purchaseUnitCost = parseNonNegativeNumber(formState.purchaseUnitCost);
    if (purchaseUnitCost === null) {
      showToast(t("productDetails.toasts.purchaseUnitCost"), "error");
      return;
    }

    const purchaseQuantity = parseNonNegativeNumber(formState.purchaseQuantity);
    if (purchaseQuantity === null) {
      showToast(t("productDetails.toasts.purchaseQuantity"), "error");
      return;
    }

    const measurementUnit = formState.measurementUnit.trim().toLowerCase();
    if (!isValidMeasurementUnit(measurementUnit)) {
      showToast(t("productDetails.toasts.measurementUnit"), "error");
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
          stockThreshold,
          salePrice,
          purchaseUnitCost,
          purchaseQuantity,
          measurementUnit,
          reason: t("productDetails.saveReason"),
        },
        user,
        orgId,
      );

      await onSaved();
      showToast(t("productDetails.toasts.detailsSaved"), "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t("productDetails.toasts.saveError"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {t("productDetails.detailsSection")}
      </ThemedText>

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.sku")}
        value={formState.sku}
        onChangeText={(value) => updateField("sku", value)}
        placeholder={t("productDetails.placeholders.sku")}
        autoCapitalize="characters"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.name")}
        value={formState.name}
        onChangeText={(value) => updateField("name", value)}
        placeholder={t("productDetails.placeholders.productName")}
      />

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

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.stockThreshold")}
        value={formState.stockThreshold}
        onChangeText={(value) => updateField("stockThreshold", value)}
        placeholder={t("productDetails.placeholders.zero")}
        keyboardType="number-pad"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.salePrice")}
        value={formState.salePrice}
        onChangeText={(value) => updateField("salePrice", value)}
        placeholder={t("productDetails.placeholders.zero")}
        keyboardType="decimal-pad"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.purchaseUnitCost")}
        value={formState.purchaseUnitCost}
        onChangeText={(value) => updateField("purchaseUnitCost", value)}
        placeholder={t("productDetails.placeholders.zero")}
        keyboardType="decimal-pad"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.purchaseQuantity")}
        value={formState.purchaseQuantity}
        onChangeText={(value) => updateField("purchaseQuantity", value)}
        placeholder={t("productDetails.placeholders.zero")}
        keyboardType="decimal-pad"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.measurementUnit")}
        value={formState.measurementUnit}
        onChangeText={(value) => updateField("measurementUnit", value.toLowerCase())}
        placeholder={t("productDetails.placeholders.unit")}
        autoCapitalize="none"
      />

      <Pressable
        onPress={() => void handleSubmit()}
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
          <ThemedText style={styles.submitText}>{t("productDetails.saveChanges")}</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
    marginTop: 6,
  },
  submitText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
