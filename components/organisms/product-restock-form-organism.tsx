import { type User } from "firebase/auth";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { LabeledInputFieldMolecule } from "@/components/molecules/labeled-input-field-molecule";
import { parseInteger, parseNonNegativeNumber } from "@/components/organisms/product-form-helpers";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { addProductStock } from "@/services/products";

type ShowToast = (message: string, type?: "success" | "error") => void;

type ProductRestockFormOrganismProps = {
  productId: string;
  orgId: string;
  user: User;
  showToast: ShowToast;
  onRestocked: () => Promise<void> | void;
  disabled?: boolean;
};

type RestockFormState = {
  quantityAdded: string;
  purchaseUnitCost: string;
  purchaseQuantity: string;
  reason: string;
};

const EMPTY_RESTOCK_FORM: RestockFormState = {
  quantityAdded: "",
  purchaseUnitCost: "",
  purchaseQuantity: "",
  reason: "",
};

export function ProductRestockFormOrganism({
  productId,
  orgId,
  user,
  showToast,
  onRestocked,
  disabled,
}: ProductRestockFormOrganismProps) {
  const [formState, setFormState] = useState<RestockFormState>(EMPTY_RESTOCK_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const accentColor = useMemo(() => "#0a7ea4", []);

  const updateField = <K extends keyof RestockFormState>(field: K, value: RestockFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (disabled || isSubmitting) {
      return;
    }

    const quantityAdded = parseInteger(formState.quantityAdded);
    if (quantityAdded === null || quantityAdded <= 0) {
      showToast(t("productDetails.toasts.quantityAdded"), "error");
      return;
    }

    const parsedPurchaseUnitCost =
      formState.purchaseUnitCost.trim().length > 0
        ? parseNonNegativeNumber(formState.purchaseUnitCost)
        : undefined;
    if (formState.purchaseUnitCost.trim().length > 0 && parsedPurchaseUnitCost === null) {
      showToast(t("productDetails.toasts.purchaseUnitCost"), "error");
      return;
    }

    const parsedPurchaseQuantity =
      formState.purchaseQuantity.trim().length > 0
        ? parseNonNegativeNumber(formState.purchaseQuantity)
        : undefined;
    if (formState.purchaseQuantity.trim().length > 0 && parsedPurchaseQuantity === null) {
      showToast(t("productDetails.toasts.purchaseQuantity"), "error");
      return;
    }

    setIsSubmitting(true);

    try {
      await addProductStock(
        {
          productId,
          quantityAdded,
          purchaseUnitCost: parsedPurchaseUnitCost,
          purchaseQuantity: parsedPurchaseQuantity,
          reason: formState.reason,
        },
        user,
        orgId,
      );

      setFormState(EMPTY_RESTOCK_FORM);
      await onRestocked();
      showToast(t("productDetails.toasts.stockUpdated"), "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t("productDetails.toasts.addStockError"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {t("productDetails.restockSection")}
      </ThemedText>

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.quantityToAdd")}
        value={formState.quantityAdded}
        onChangeText={(value) => updateField("quantityAdded", value)}
        placeholder={t("productDetails.placeholders.zero")}
        keyboardType="number-pad"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.purchaseUnitCostOptional")}
        value={formState.purchaseUnitCost}
        onChangeText={(value) => updateField("purchaseUnitCost", value)}
        placeholder={t("productDetails.placeholders.zero")}
        keyboardType="decimal-pad"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.purchaseQuantityOptional")}
        value={formState.purchaseQuantity}
        onChangeText={(value) => updateField("purchaseQuantity", value)}
        placeholder={t("productDetails.placeholders.zero")}
        keyboardType="decimal-pad"
      />

      <LabeledInputFieldMolecule
        label={t("productDetails.fields.reasonOptional")}
        value={formState.reason}
        onChangeText={(value) => updateField("reason", value)}
        placeholder={t("productDetails.placeholders.reason")}
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
          <ThemedText style={styles.submitText}>{t("productDetails.addStock")}</ThemedText>
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
