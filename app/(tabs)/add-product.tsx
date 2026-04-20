import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { createProduct, type ProductCreateInput } from "@/services/products";
import { clearSalesProductCache } from "@/services/sales";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";

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

type ValidatedForm = ProductCreateInput;

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

const MEASUREMENT_UNITS = ["unit", "mass", "volume"] as const;

function parseInteger(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  return Number.parseInt(value, 10);
}

function parseNonNegativeNumber(value: string) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

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
  if (
    !MEASUREMENT_UNITS.includes(normalizedMeasurementUnit as (typeof MEASUREMENT_UNITS)[number])
  ) {
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

  const parsed: ValidatedForm = {
    sku,
    barcode: state.barcode,
    name,
    description: state.description,
    category: state.category,
    currentStock,
    stockThreshold,
    salePrice,
    purchaseUnitCost,
    purchaseQuantity,
    measurementUnit: normalizedMeasurementUnit as (typeof MEASUREMENT_UNITS)[number],
  };

  return { errors, parsed };
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <ThemedText style={styles.errorText}>{message}</ThemedText>;
}

function FieldLabel({ label }: { label: string }) {
  return (
    <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
      {label}
    </ThemedText>
  );
}

export default function AddProductScreen() {
  const user = useAuthStore((state) => state.user);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const activeMembership = useOrganizationStore((state) => state.activeMembership);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const background = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const muted = useMemo(() => "#7A7A7A", []);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);
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
    if (!user || !activeOrganization || isSubmitting) {
      return;
    }

    const { errors: nextErrors, parsed } = validateForm(formState);
    setErrors(nextErrors);
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!parsed) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createProduct(
        {
          sku: parsed.sku,
          barcode: parsed.barcode,
          name: parsed.name,
          description: parsed.description,
          category: parsed.category,
          currentStock: parsed.currentStock,
          stockThreshold: parsed.stockThreshold,
          salePrice: parsed.salePrice,
          purchaseUnitCost: parsed.purchaseUnitCost,
          purchaseQuantity: parsed.purchaseQuantity,
          measurementUnit: parsed.measurementUnit,
        },
        user,
        activeOrganization.id,
      );

      clearSalesProductCache();

      setSubmitSuccess(t("addProduct.success"));
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

  if (!user) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.page}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: inputBackground, borderColor }]}>
          <ThemedText type="title" style={styles.title}>
            {t("addProduct.title")}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            {t("addProduct.subtitle")}
          </ThemedText>
          <ThemedText selectable style={[styles.subtitle, { color: muted }]}>
            {activeOrganization
              ? t("common.activeOrgWithRole", {
                  name: activeOrganization.name,
                  role: activeMembership?.role ?? t("common.member"),
                })
              : t("common.noActiveOrgSelected")}
          </ThemedText>
        </View>

        {!activeOrganization ? (
          <View style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold">{t("common.organizationRequiredTitle")}</ThemedText>
            <ThemedText selectable>{t("addProduct.noActiveOrganization")}</ThemedText>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t("addProduct.requiredDetails")}
          </ThemedText>

          <FieldLabel label={t("addProduct.fields.sku")} />
          <TextInput
            value={formState.sku}
            onChangeText={(value) => updateField("sku", value)}
            placeholder={t("addProduct.placeholders.sku")}
            placeholderTextColor={muted}
            autoCapitalize="characters"
            accessibilityLabel={t("addProduct.fields.sku")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.sku} />

          <FieldLabel label={t("addProduct.fields.productName")} />
          <TextInput
            value={formState.name}
            onChangeText={(value) => updateField("name", value)}
            placeholder={t("addProduct.placeholders.productName")}
            placeholderTextColor={muted}
            accessibilityLabel={t("addProduct.fields.productName")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.name} />

          <FieldLabel label={t("addProduct.fields.currentStock")} />
          <TextInput
            value={formState.currentStock}
            onChangeText={(value) => updateField("currentStock", value)}
            placeholder={t("addProduct.placeholders.currentStock")}
            placeholderTextColor={muted}
            keyboardType="number-pad"
            accessibilityLabel={t("addProduct.fields.currentStock")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.currentStock} />

          <FieldLabel label={t("addProduct.fields.stockThreshold")} />
          <TextInput
            value={formState.stockThreshold}
            onChangeText={(value) => updateField("stockThreshold", value)}
            placeholder={t("addProduct.placeholders.stockThreshold")}
            placeholderTextColor={muted}
            keyboardType="number-pad"
            accessibilityLabel={t("addProduct.fields.stockThreshold")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.stockThreshold} />

          <FieldLabel label={t("addProduct.fields.salePrice")} />
          <TextInput
            value={formState.salePrice}
            onChangeText={(value) => updateField("salePrice", value)}
            placeholder={t("addProduct.placeholders.salePrice")}
            placeholderTextColor={muted}
            keyboardType="decimal-pad"
            accessibilityLabel={t("addProduct.fields.salePrice")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.salePrice} />

          <FieldLabel label={t("addProduct.fields.purchaseUnitCost")} />
          <TextInput
            value={formState.purchaseUnitCost}
            onChangeText={(value) => updateField("purchaseUnitCost", value)}
            placeholder={t("addProduct.placeholders.purchaseUnitCost")}
            placeholderTextColor={muted}
            keyboardType="decimal-pad"
            accessibilityLabel={t("addProduct.fields.purchaseUnitCost")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.purchaseUnitCost} />

          <FieldLabel label={t("addProduct.fields.purchaseQuantity")} />
          <TextInput
            value={formState.purchaseQuantity}
            onChangeText={(value) => updateField("purchaseQuantity", value)}
            placeholder={t("addProduct.placeholders.purchaseQuantity")}
            placeholderTextColor={muted}
            keyboardType="decimal-pad"
            accessibilityLabel={t("addProduct.fields.purchaseQuantity")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.purchaseQuantity} />

          <FieldLabel label={t("addProduct.fields.measurementUnit")} />
          <TextInput
            value={formState.measurementUnit}
            onChangeText={(value) => updateField("measurementUnit", value)}
            placeholder={t("addProduct.placeholders.measurementUnit")}
            placeholderTextColor={muted}
            autoCapitalize="none"
            accessibilityLabel={t("addProduct.fields.measurementUnit")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.measurementUnit} />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t("addProduct.optionalDetails")}
          </ThemedText>

          <FieldLabel label={t("addProduct.fields.barcode")} />
          <TextInput
            value={formState.barcode}
            onChangeText={(value) => updateField("barcode", value)}
            placeholder={t("addProduct.placeholders.barcode")}
            placeholderTextColor={muted}
            autoCapitalize="characters"
            accessibilityLabel={t("addProduct.fields.barcode")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />

          <FieldLabel label={t("addProduct.fields.category")} />
          <TextInput
            value={formState.category}
            onChangeText={(value) => updateField("category", value)}
            placeholder={t("addProduct.placeholders.category")}
            placeholderTextColor={muted}
            accessibilityLabel={t("addProduct.fields.category")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />

          <FieldLabel label={t("addProduct.fields.description")} />
          <TextInput
            value={formState.description}
            onChangeText={(value) => updateField("description", value)}
            placeholder={t("addProduct.placeholders.description")}
            placeholderTextColor={muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel={t("addProduct.fields.description")}
            style={[
              styles.input,
              styles.multiline,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
        </View>

        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}
        {submitSuccess ? <ThemedText style={styles.successText}>{submitSuccess}</ThemedText> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting || !activeOrganization}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: accentColor,
              opacity: pressed || isSubmitting || !activeOrganization ? 0.8 : 1,
            },
          ]}>
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.submitText}>{t("addProduct.submit")}</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 18,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  title: {
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
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
  errorText: {
    color: "#C5283D",
    fontSize: 13,
  },
  successText: {
    color: "#1E8E3E",
    fontSize: 13,
  },
});
