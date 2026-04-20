import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
    addProductStock,
    getProductById,
    updateProduct,
    type ProductMeasurementUnit,
    type ProductRecord,
} from "@/services/products";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";

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

type RestockFormState = {
  quantityAdded: string;
  purchaseUnitCost: string;
  purchaseQuantity: string;
  reason: string;
};

const MEASUREMENT_UNITS: ProductMeasurementUnit[] = ["unit", "mass", "volume"];

const EMPTY_EDIT_FORM: EditFormState = {
  sku: "",
  name: "",
  barcode: "",
  category: "",
  description: "",
  stockThreshold: "0",
  salePrice: "0",
  purchaseUnitCost: "0",
  purchaseQuantity: "0",
  measurementUnit: "unit",
};

const EMPTY_RESTOCK_FORM: RestockFormState = {
  quantityAdded: "",
  purchaseUnitCost: "",
  purchaseQuantity: "",
  reason: "",
};

function FieldLabel({ label }: { label: string }) {
  return (
    <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
      {label}
    </ThemedText>
  );
}

function parseInteger(value: string) {
  if (!/^-?\d+$/.test(value.trim())) {
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

export default function ProductDetailsScreen() {
  const user = useAuthStore((state) => state.user);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const { productId } = useLocalSearchParams<{ productId?: string }>();

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [restockForm, setRestockForm] = useState<RestockFormState>(EMPTY_RESTOCK_FORM);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestocking, setIsRestocking] = useState(false);

  const { showToast, toastElement } = useToast({ position: "top" });

  const background = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const muted = useMemo(() => "#6D7782", []);
  const accentColor = useMemo(() => "#0a7ea4", []);
  const dangerColor = useMemo(() => "#C5283D", []);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);

  const activeOrganizationId = activeOrganization?.id ?? "";
  const normalizedProductId = typeof productId === "string" ? productId : "";

  const loadProduct = useCallback(async () => {
    if (!activeOrganizationId || !normalizedProductId) {
      setProduct(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setScreenError(null);

    try {
      const loaded = await getProductById(normalizedProductId, activeOrganizationId);
      if (!loaded) {
        setProduct(null);
        setScreenError("Product not found in the active organization.");
        return;
      }

      setProduct(loaded);
      setEditForm(toEditFormState(loaded));
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Unable to load product.");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, normalizedProductId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const handleRestock = async () => {
    if (!user || !activeOrganizationId || !product || isRestocking) {
      return;
    }

    const quantityAdded = parseInteger(restockForm.quantityAdded);
    if (quantityAdded === null || quantityAdded <= 0) {
      showToast("Quantity added must be an integer greater than 0.", "error");
      return;
    }

    const parsedPurchaseUnitCost =
      restockForm.purchaseUnitCost.trim().length > 0
        ? parseNonNegativeNumber(restockForm.purchaseUnitCost)
        : undefined;
    if (restockForm.purchaseUnitCost.trim().length > 0 && parsedPurchaseUnitCost === null) {
      showToast("Purchase unit cost must be a non-negative number.", "error");
      return;
    }
    const purchaseUnitCost = parsedPurchaseUnitCost ?? undefined;

    const parsedPurchaseQuantity =
      restockForm.purchaseQuantity.trim().length > 0
        ? parseNonNegativeNumber(restockForm.purchaseQuantity)
        : undefined;
    if (restockForm.purchaseQuantity.trim().length > 0 && parsedPurchaseQuantity === null) {
      showToast("Purchase quantity must be a non-negative number.", "error");
      return;
    }
    const purchaseQuantity = parsedPurchaseQuantity ?? undefined;

    setIsRestocking(true);
    setScreenError(null);

    try {
      await addProductStock(
        {
          productId: product.id,
          quantityAdded,
          purchaseUnitCost,
          purchaseQuantity,
          reason: restockForm.reason,
        },
        user,
        activeOrganizationId,
      );

      setRestockForm(EMPTY_RESTOCK_FORM);
      await loadProduct();
      showToast("Stock updated successfully.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to add stock right now.", "error");
    } finally {
      setIsRestocking(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!user || !activeOrganizationId || !product || isSaving) {
      return;
    }

    const sku = editForm.sku.trim().toUpperCase();
    const name = editForm.name.trim();
    if (!sku || !name) {
      showToast("SKU and name are required.", "error");
      return;
    }

    const stockThreshold = parseInteger(editForm.stockThreshold);
    if (stockThreshold === null || stockThreshold < 0) {
      showToast("Stock threshold must be an integer greater than or equal to 0.", "error");
      return;
    }

    const salePrice = parseNonNegativeNumber(editForm.salePrice);
    if (salePrice === null) {
      showToast("Selling price must be a non-negative number.", "error");
      return;
    }

    const purchaseUnitCost = parseNonNegativeNumber(editForm.purchaseUnitCost);
    if (purchaseUnitCost === null) {
      showToast("Purchase unit cost must be a non-negative number.", "error");
      return;
    }

    const purchaseQuantity = parseNonNegativeNumber(editForm.purchaseQuantity);
    if (purchaseQuantity === null) {
      showToast("Purchase quantity must be a non-negative number.", "error");
      return;
    }

    const measurementUnit = editForm.measurementUnit.trim().toLowerCase();
    if (!MEASUREMENT_UNITS.includes(measurementUnit as ProductMeasurementUnit)) {
      showToast("Measurement unit must be one of: unit, mass, volume.", "error");
      return;
    }

    setIsSaving(true);
    setScreenError(null);

    try {
      await updateProduct(
        {
          productId: product.id,
          sku,
          name,
          barcode: editForm.barcode,
          category: editForm.category,
          description: editForm.description,
          stockThreshold,
          salePrice,
          purchaseUnitCost,
          purchaseQuantity,
          measurementUnit: measurementUnit as ProductMeasurementUnit,
          reason: "Product details updated from product editor",
        },
        user,
        activeOrganizationId,
      );

      await loadProduct();
      showToast("Product details saved.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to save product changes.",
        "error",
      );
    } finally {
      setIsSaving(false);
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
            Edit Product
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            Restock first, then adjust catalog details.
          </ThemedText>
          <ThemedText selectable style={[styles.subtitle, { color: muted }]}>
            Product ID: {normalizedProductId || "unknown"}
          </ThemedText>
        </View>

        {!activeOrganization ? (
          <View style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold">Organization required</ThemedText>
            <ThemedText selectable>Select an organization before editing products.</ThemedText>
          </View>
        ) : null}

        {screenError ? (
          <ThemedText style={[styles.errorText, { color: dangerColor }]}>{screenError}</ThemedText>
        ) : null}

        {isLoading ? (
          <View style={styles.centeredSection}>
            <ActivityIndicator size="large" />
          </View>
        ) : null}

        {!isLoading && product ? (
          <>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Restock
              </ThemedText>

              <FieldLabel label="Quantity to add" />
              <TextInput
                value={restockForm.quantityAdded}
                onChangeText={(value) =>
                  setRestockForm((current) => ({ ...current, quantityAdded: value }))
                }
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Purchase unit cost (optional)" />
              <TextInput
                value={restockForm.purchaseUnitCost}
                onChangeText={(value) =>
                  setRestockForm((current) => ({ ...current, purchaseUnitCost: value }))
                }
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Purchase quantity (optional)" />
              <TextInput
                value={restockForm.purchaseQuantity}
                onChangeText={(value) =>
                  setRestockForm((current) => ({ ...current, purchaseQuantity: value }))
                }
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Reason (optional)" />
              <TextInput
                value={restockForm.reason}
                onChangeText={(value) =>
                  setRestockForm((current) => ({ ...current, reason: value }))
                }
                placeholder="Restock reason"
                placeholderTextColor={muted}
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <Pressable
                onPress={() => void handleRestock()}
                disabled={isRestocking}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: accentColor,
                    opacity: pressed || isRestocking ? 0.8 : 1,
                  },
                ]}>
                {isRestocking ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>Add Stock</ThemedText>
                )}
              </Pressable>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Product Details
              </ThemedText>

              <FieldLabel label="SKU" />
              <TextInput
                value={editForm.sku}
                onChangeText={(value) => setEditForm((current) => ({ ...current, sku: value }))}
                placeholder="SKU"
                placeholderTextColor={muted}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Name" />
              <TextInput
                value={editForm.name}
                onChangeText={(value) => setEditForm((current) => ({ ...current, name: value }))}
                placeholder="Product name"
                placeholderTextColor={muted}
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Barcode" />
              <TextInput
                value={editForm.barcode}
                onChangeText={(value) => setEditForm((current) => ({ ...current, barcode: value }))}
                placeholder="Barcode"
                placeholderTextColor={muted}
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Category" />
              <TextInput
                value={editForm.category}
                onChangeText={(value) =>
                  setEditForm((current) => ({ ...current, category: value }))
                }
                placeholder="Category"
                placeholderTextColor={muted}
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Description" />
              <TextInput
                value={editForm.description}
                onChangeText={(value) =>
                  setEditForm((current) => ({ ...current, description: value }))
                }
                placeholder="Description"
                placeholderTextColor={muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.multiline,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Stock threshold" />
              <TextInput
                value={editForm.stockThreshold}
                onChangeText={(value) =>
                  setEditForm((current) => ({ ...current, stockThreshold: value }))
                }
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Selling price" />
              <TextInput
                value={editForm.salePrice}
                onChangeText={(value) =>
                  setEditForm((current) => ({ ...current, salePrice: value }))
                }
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Purchase unit cost" />
              <TextInput
                value={editForm.purchaseUnitCost}
                onChangeText={(value) =>
                  setEditForm((current) => ({ ...current, purchaseUnitCost: value }))
                }
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Last purchase quantity" />
              <TextInput
                value={editForm.purchaseQuantity}
                onChangeText={(value) =>
                  setEditForm((current) => ({ ...current, purchaseQuantity: value }))
                }
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <FieldLabel label="Measurement unit (unit, mass, volume)" />
              <TextInput
                value={editForm.measurementUnit}
                onChangeText={(value) =>
                  setEditForm((current) => ({ ...current, measurementUnit: value.toLowerCase() }))
                }
                placeholder="unit"
                placeholderTextColor={muted}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              <Pressable
                onPress={() => void handleSaveDetails()}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: accentColor,
                    opacity: pressed || isSaving ? 0.8 : 1,
                  },
                ]}>
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>Save Changes</ThemedText>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      {toastElement}
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
  centeredSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  content: {
    padding: 20,
    gap: 16,
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
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
  },
  primaryButton: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
  },
});
