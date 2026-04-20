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
  unitPrice: string;
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
  unitPrice: "0",
};

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
    errors.sku = "SKU is required.";
  }

  const name = state.name.trim();
  if (!name) {
    errors.name = "Product name is required.";
  }

  const currentStock = parseInteger(state.currentStock);
  if (currentStock === null || currentStock < 0) {
    errors.currentStock = "Current stock must be an integer greater than or equal to 0.";
  }

  const stockThreshold = parseInteger(state.stockThreshold);
  if (stockThreshold === null || stockThreshold < 0) {
    errors.stockThreshold = "Stock threshold must be an integer greater than or equal to 0.";
  }

  const unitPrice = parseNonNegativeNumber(state.unitPrice);
  if (unitPrice === null) {
    errors.unitPrice = "Unit price must be a number greater than or equal to 0.";
  }

  const hasErrors = Object.keys(errors).length > 0;
  if (hasErrors || currentStock === null || stockThreshold === null || unitPrice === null) {
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
    unitPrice,
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
          unitPrice: parsed.unitPrice,
        },
        user,
        activeOrganization.id,
      );

      clearSalesProductCache();

      setSubmitSuccess("Product added successfully.");
      setFormState((current) => ({
        ...INITIAL_STATE,
        stockThreshold: current.stockThreshold,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add product right now.";
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
            Add Product
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            Create a product in your organization inventory catalog.
          </ThemedText>
          <ThemedText selectable style={[styles.subtitle, { color: muted }]}>
            {activeOrganization
              ? `Active org: ${activeOrganization.name} · ${activeMembership?.role ?? "member"}`
              : "No active organization selected. Open Organizations from the drawer first."}
          </ThemedText>
        </View>

        {!activeOrganization ? (
          <View style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold">Organization required</ThemedText>
            <ThemedText selectable>
              Create or switch to an active organization before adding products.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Required Details
          </ThemedText>

          <FieldLabel label="SKU" />
          <TextInput
            value={formState.sku}
            onChangeText={(value) => updateField("sku", value)}
            placeholder="SKU"
            placeholderTextColor={muted}
            autoCapitalize="characters"
            accessibilityLabel="SKU"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.sku} />

          <FieldLabel label="Product Name" />
          <TextInput
            value={formState.name}
            onChangeText={(value) => updateField("name", value)}
            placeholder="Product name"
            placeholderTextColor={muted}
            accessibilityLabel="Product name"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.name} />

          <FieldLabel label="Current Stock" />
          <TextInput
            value={formState.currentStock}
            onChangeText={(value) => updateField("currentStock", value)}
            placeholder="Current stock"
            placeholderTextColor={muted}
            keyboardType="number-pad"
            accessibilityLabel="Current stock"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.currentStock} />

          <FieldLabel label="Stock Threshold" />
          <TextInput
            value={formState.stockThreshold}
            onChangeText={(value) => updateField("stockThreshold", value)}
            placeholder="Stock threshold"
            placeholderTextColor={muted}
            keyboardType="number-pad"
            accessibilityLabel="Stock threshold"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.stockThreshold} />

          <FieldLabel label="Unit Price" />
          <TextInput
            value={formState.unitPrice}
            onChangeText={(value) => updateField("unitPrice", value)}
            placeholder="Unit price"
            placeholderTextColor={muted}
            keyboardType="decimal-pad"
            accessibilityLabel="Unit price"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={errors.unitPrice} />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Optional Details
          </ThemedText>

          <FieldLabel label="Barcode" />
          <TextInput
            value={formState.barcode}
            onChangeText={(value) => updateField("barcode", value)}
            placeholder="Barcode"
            placeholderTextColor={muted}
            autoCapitalize="characters"
            accessibilityLabel="Barcode"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />

          <FieldLabel label="Category" />
          <TextInput
            value={formState.category}
            onChangeText={(value) => updateField("category", value)}
            placeholder="Category"
            placeholderTextColor={muted}
            accessibilityLabel="Category"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />

          <FieldLabel label="Description" />
          <TextInput
            value={formState.description}
            onChangeText={(value) => updateField("description", value)}
            placeholder="Description"
            placeholderTextColor={muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Description"
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
            <ThemedText style={styles.submitText}>Save Product</ThemedText>
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
