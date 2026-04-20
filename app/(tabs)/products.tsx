import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ProductSelector } from "@/components/product-selector";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useToast } from "@/hooks/use-toast";
import {
    listActiveProductsPage,
    updateProduct,
    type ProductListCursor,
    type ProductRecord,
} from "@/services/products";
import { clearSalesProductCache } from "@/services/sales";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";

const PAGE_SIZE = 20;

type LoadMode = "initial" | "refresh" | "next";

type StockState = "default" | "warning" | "error";

function resolveStockState(product: ProductRecord): StockState {
  if (product.currentStock <= 0) {
    return "error";
  }

  if (product.currentStock <= product.stockThreshold) {
    return "warning";
  }

  return "default";
}

export default function ProductsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);

  const [selectorQuery, setSelectorQuery] = useState("");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<ProductListCursor | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [searchRefreshToken, setSearchRefreshToken] = useState(0);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [inactivatingProductIds, setInactivatingProductIds] = useState<Record<string, boolean>>({});

  const { showToast, toastElement } = useToast({ position: "top" });

  const background = useThemeColor({}, "background");
  const muted = useMemo(() => "#6D7782", []);
  const accentColor = useMemo(() => "#0a7ea4", []);
  const dangerColor = useMemo(() => "#C5283D", []);
  const warningColor = useMemo(() => "#B06A00", []);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);

  const activeOrganizationId = activeOrganization?.id ?? "";

  const loadProducts = useCallback(
    async (mode: LoadMode) => {
      if (!activeOrganizationId) {
        setProducts([]);
        setNextCursor(null);
        setScreenError(null);
        return;
      }

      if (mode === "initial") {
        setIsLoadingInitial(true);
      }
      if (mode === "refresh") {
        setIsRefreshing(true);
      }
      if (mode === "next") {
        setIsLoadingNext(true);
      }

      setScreenError(null);

      try {
        const response = await listActiveProductsPage({
          orgId: activeOrganizationId,
          pageSize: PAGE_SIZE,
          cursor: mode === "next" ? nextCursor : null,
          sort: "updated_at_desc",
        });

        setProducts((current) =>
          mode === "next" ? [...current, ...response.items] : response.items,
        );
        setNextCursor(response.nextCursor);
      } catch (error) {
        setScreenError(error instanceof Error ? error.message : "Unable to load products.");
      } finally {
        if (mode === "initial") {
          setIsLoadingInitial(false);
        }
        if (mode === "refresh") {
          setIsRefreshing(false);
        }
        if (mode === "next") {
          setIsLoadingNext(false);
        }
      }
    },
    [activeOrganizationId, nextCursor],
  );

  useEffect(() => {
    void loadProducts("initial");
  }, [activeOrganizationId, loadProducts]);

  useFocusEffect(
    useCallback(() => {
      clearSalesProductCache();
      setSearchRefreshToken((current) => current + 1);
      void loadProducts("refresh");
    }, [loadProducts]),
  );

  const handleOpenProduct = (productId: string) => {
    router.push({
      pathname: "/(tabs)/products/[productId]",
      params: { productId },
    });
  };

  const handleSelectorPick = (product: { id: string; name: string }) => {
    const existsInCurrentPage = products.some((item) => item.id === product.id);

    if (existsInCurrentPage) {
      setHighlightedProductId(product.id);
      showToast(`${product.name} is highlighted in the list below.`, "success");
      return;
    }

    handleOpenProduct(product.id);
  };

  const handleSoftDelete = (product: ProductRecord) => {
    if (!user || !activeOrganizationId || inactivatingProductIds[product.id]) {
      return;
    }

    Alert.alert(
      "Inactivate product",
      `This will hide ${product.name} from active catalog pages. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Inactivate",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setInactivatingProductIds((current) => ({ ...current, [product.id]: true }));

              try {
                await updateProduct(
                  {
                    productId: product.id,
                    isActive: false,
                    reason: "Soft delete from products catalog",
                  },
                  user,
                  activeOrganizationId,
                );

                setProducts((current) => current.filter((item) => item.id !== product.id));
                if (highlightedProductId === product.id) {
                  setHighlightedProductId(null);
                }
                showToast(`${product.name} was inactivated.`, "success");
              } catch (error) {
                showToast(
                  error instanceof Error
                    ? error.message
                    : "Unable to inactivate product right now.",
                  "error",
                );
              } finally {
                setInactivatingProductIds((current) => {
                  const next = { ...current };
                  delete next[product.id];
                  return next;
                });
              }
            })();
          },
        },
      ],
    );
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
            Products
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            Browse and maintain your active product catalog with cursor-based pagination.
          </ThemedText>
          <ThemedText selectable style={[styles.subtitle, { color: muted }]}>
            {activeOrganization
              ? `Active org: ${activeOrganization.name}`
              : "No active organization selected. Open Organizations from the drawer first."}
          </ThemedText>
        </View>

        {!activeOrganization ? (
          <View style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold">Organization required</ThemedText>
            <ThemedText selectable>Select an organization before browsing products.</ThemedText>
          </View>
        ) : (
          <>
            <ProductSelector
              organizationId={activeOrganizationId}
              query={selectorQuery}
              onQueryChange={setSelectorQuery}
              onSelectProduct={handleSelectorPick}
              refreshToken={searchRefreshToken}
              actionLabel="Open"
              emptyMessage="No active products match this search."
            />

            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Active Products</ThemedText>
              <Pressable
                onPress={() => void loadProducts("refresh")}
                disabled={isRefreshing || isLoadingInitial}
                style={({ pressed }) => [
                  styles.refreshButton,
                  {
                    borderColor,
                    backgroundColor: inputBackground,
                    opacity: pressed || isRefreshing || isLoadingInitial ? 0.72 : 1,
                  },
                ]}>
                {isRefreshing ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <ThemedText type="defaultSemiBold">Refresh</ThemedText>
                )}
              </Pressable>
            </View>

            {screenError ? (
              <ThemedText style={[styles.errorText, { color: dangerColor }]}>
                {screenError}
              </ThemedText>
            ) : null}

            {isLoadingInitial ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" />
              </View>
            ) : null}

            {!isLoadingInitial && products.length === 0 ? (
              <View style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
                <ThemedText selectable>No active products found yet.</ThemedText>
              </View>
            ) : null}

            <View style={styles.productsList}>
              {products.map((product) => {
                const isHighlighted = highlightedProductId === product.id;
                const isInactivating = Boolean(inactivatingProductIds[product.id]);
                const stockState = resolveStockState(product);
                const stockAccentColor =
                  stockState === "error"
                    ? dangerColor
                    : stockState === "warning"
                      ? warningColor
                      : borderColor;
                const stockStatusLabel =
                  stockState === "error"
                    ? "Out of stock"
                    : stockState === "warning"
                      ? "Low stock"
                      : "In stock";

                return (
                  <View
                    key={product.id}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: inputBackground,
                        borderColor: isHighlighted ? accentColor : stockAccentColor,
                      },
                    ]}>
                    <View style={styles.productMeta}>
                      <ThemedText type="defaultSemiBold" selectable>
                        {product.name}
                      </ThemedText>
                      <View style={styles.productStateRow}>
                        <View
                          style={[
                            styles.stockBadge,
                            {
                              borderColor: stockAccentColor,
                              backgroundColor: inputBackground,
                            },
                          ]}>
                          <ThemedText
                            type="defaultSemiBold"
                            style={{
                              color:
                                stockState === "default"
                                  ? muted
                                  : stockState === "warning"
                                    ? warningColor
                                    : dangerColor,
                            }}>
                            {stockStatusLabel}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText selectable style={{ color: muted }}>
                        SKU: {product.sku}
                        {product.barcode ? ` · Barcode: ${product.barcode}` : ""}
                      </ThemedText>
                      <ThemedText selectable style={{ color: muted }}>
                        Stock: {product.currentStock} · Threshold: {product.stockThreshold}
                      </ThemedText>
                      <ThemedText selectable style={{ color: muted }}>
                        Selling price: ${product.salePrice.toFixed(2)} · Unit:{" "}
                        {product.measurementUnit}
                      </ThemedText>
                    </View>

                    <View style={styles.actionsRow}>
                      <Pressable
                        onPress={() => handleOpenProduct(product.id)}
                        style={({ pressed }) => [
                          styles.actionButton,
                          {
                            borderColor,
                            backgroundColor: inputBackground,
                            opacity: pressed ? 0.82 : 1,
                          },
                        ]}>
                        <ThemedText type="defaultSemiBold">Edit</ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => handleSoftDelete(product)}
                        disabled={isInactivating}
                        style={({ pressed }) => [
                          styles.actionButton,
                          {
                            borderColor,
                            backgroundColor: inputBackground,
                            opacity: pressed || isInactivating ? 0.72 : 1,
                          },
                        ]}>
                        {isInactivating ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <ThemedText type="defaultSemiBold" style={{ color: dangerColor }}>
                            Inactivate
                          </ThemedText>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {nextCursor ? (
              <Pressable
                onPress={() => void loadProducts("next")}
                disabled={isLoadingNext}
                style={({ pressed }) => [
                  styles.loadMoreButton,
                  {
                    backgroundColor: accentColor,
                    opacity: pressed || isLoadingNext ? 0.82 : 1,
                  },
                ]}>
                {isLoadingNext ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.loadMoreText}>Load 20 more</ThemedText>
                )}
              </Pressable>
            ) : null}
          </>
        )}
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  refreshButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  productsList: {
    gap: 10,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  productMeta: {
    gap: 3,
  },
  productStateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 92,
    alignItems: "center",
  },
  loadMoreButton: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadMoreText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
  },
});
