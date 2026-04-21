import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { CompoundProductDetailsFormOrganism } from "@/components/organisms/compound-product-details-form-organism";
import { ProductRestockFormOrganism } from "@/components/organisms/product-restock-form-organism";
import { StandardProductDetailsFormOrganism } from "@/components/organisms/standard-product-details-form-organism";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useToast } from "@/hooks/use-toast";
import { getProductById, type ProductRecord } from "@/services/products";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";

export default function ProductDetailsScreen() {
  const user = useAuthStore((state) => state.user);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const { productId } = useLocalSearchParams<{ productId?: string }>();

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { showToast, toastElement } = useToast({ position: "top" });

  const background = useThemeColor({}, "background");
  const muted = useMemo(() => "#6D7782", []);
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
        setScreenError(t("productDetails.notFound"));
        return;
      }

      setProduct(loaded);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : t("productDetails.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, normalizedProductId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

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
            {t("productDetails.title")}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            {t("productDetails.subtitle")}
          </ThemedText>
          <ThemedText selectable style={[styles.subtitle, { color: muted }]}>
            {t("productDetails.productId", {
              id: normalizedProductId || t("common.unknown"),
            })}
          </ThemedText>
        </View>

        {!activeOrganization ? (
          <View style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold">{t("common.organizationRequiredTitle")}</ThemedText>
            <ThemedText selectable>{t("productDetails.noActiveOrganization")}</ThemedText>
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

        {!isLoading && product && activeOrganization ? (
          <View style={styles.formStack}>
            {product.itemType === "stock" ? (
              <ProductRestockFormOrganism
                productId={product.id}
                orgId={activeOrganization.id}
                user={user}
                showToast={showToast}
                onRestocked={loadProduct}
              />
            ) : null}

            {product.itemType === "compound" ? (
              <CompoundProductDetailsFormOrganism
                product={product}
                orgId={activeOrganization.id}
                user={user}
                showToast={showToast}
                onSaved={loadProduct}
              />
            ) : (
              <StandardProductDetailsFormOrganism
                product={product}
                orgId={activeOrganization.id}
                user={user}
                showToast={showToast}
                onSaved={loadProduct}
              />
            )}
          </View>
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
  noticeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  formStack: {
    gap: 16,
  },
  errorText: {
    fontSize: 13,
  },
});
