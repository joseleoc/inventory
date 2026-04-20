import { useFocusEffect } from "@react-navigation/native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ProductSelector } from "@/components/product-selector";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useToast } from "@/hooks/use-toast";
import {
  checkoutCart,
  clearSalesProductCache,
  findProductByCode,
  type ProductLookupItem,
} from "@/services/sales";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useSalesCartStore } from "@/stores/sales-cart-store";

function FieldLabel({ label }: { label: string }) {
  return (
    <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
      {label}
    </ThemedText>
  );
}

export default function SalesScreen() {
  const user = useAuthStore((state) => state.user);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const activeMembership = useOrganizationStore((state) => state.activeMembership);

  const carts = useSalesCartStore((state) => state.carts);
  const archivedCarts = useSalesCartStore((state) => state.archivedCarts);
  const activeCartId = useSalesCartStore((state) => state.activeCartId);
  const createCart = useSalesCartStore((state) => state.createCart);
  const deleteCart = useSalesCartStore((state) => state.deleteCart);
  const switchActiveCart = useSalesCartStore((state) => state.switchActiveCart);
  const renameActiveCart = useSalesCartStore((state) => state.renameActiveCart);
  const addProductToActiveCart = useSalesCartStore((state) => state.addProductToActiveCart);
  const removeLineItem = useSalesCartStore((state) => state.removeLineItem);
  const incrementLineItem = useSalesCartStore((state) => state.incrementLineItem);
  const decrementLineItem = useSalesCartStore((state) => state.decrementLineItem);
  const setLineItemQuantity = useSalesCartStore((state) => state.setLineItemQuantity);
  const clearActiveCart = useSalesCartStore((state) => state.clearActiveCart);
  const archiveActiveCart = useSalesCartStore((state) => state.archiveActiveCart);

  const [searchTerm, setSearchTerm] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "undetermined">(
    "undetermined",
  );
  const [scanLocked, setScanLocked] = useState(false);
  const [searchRefreshToken, setSearchRefreshToken] = useState(0);
  const { showToast, toastElement } = useToast({ position: "top" });

  const background = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const muted = useMemo(() => "#6D7782", []);
  const accentColor = useMemo(() => "#0a7ea4", []);
  const dangerColor = useMemo(() => "#C5283D", []);
  const successColor = useMemo(() => "#1E8E3E", []);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);

  const activeCart = useMemo(
    () => carts.find((cart) => cart.id === activeCartId) ?? null,
    [activeCartId, carts],
  );

  const totalAmount = useMemo(
    () => activeCart?.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) ?? 0,
    [activeCart],
  );

  const totalItems = useMemo(
    () => activeCart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0,
    [activeCart],
  );

  const activeOrganizationId = activeOrganization?.id ?? "";

  useFocusEffect(
    useCallback(() => {
      clearSalesProductCache();
      setSearchRefreshToken((current) => current + 1);
    }, []),
  );

  const pushActionMessage = (message: string, isError = false) => {
    if (isError) {
      setScreenError(message);
      return;
    }

    setScreenError(null);
    setScreenMessage(message);
  };

  const handleAddProduct = (product: ProductLookupItem) => {
    const result = addProductToActiveCart(product, 1);

    if (!result.ok) {
      pushActionMessage(result.message ?? "Unable to add product to cart.", true);
      return;
    }

    pushActionMessage(`${product.name} added to ${activeCart?.clientLabel ?? "active cart"}.`);
  };

  const handleScannerOpen = async () => {
    if (process.env.EXPO_OS === "web") {
      pushActionMessage("Camera barcode scanner is only available on native mobile.", true);
      return;
    }

    if (cameraPermission !== "granted") {
      const permission = await BarCodeScanner.requestPermissionsAsync();
      const granted = permission.status === "granted";
      setCameraPermission(granted ? "granted" : "denied");

      if (!granted) {
        pushActionMessage("Camera permission denied. Use manual barcode input.", true);
        return;
      }
    }

    setIsScannerVisible(true);
    setScreenError(null);
  };

  const handleScannedCode = async (code: string) => {
    const normalized = code.trim();

    if (!normalized || scanLocked || !activeOrganizationId) {
      return;
    }

    setScanLocked(true);
    setIsScannerVisible(false);
    setSearchTerm(normalized);

    try {
      const product = await findProductByCode(activeOrganizationId, normalized);

      if (!product) {
        pushActionMessage("Scanned code not found in active organization catalog.", true);
        return;
      }

      const result = addProductToActiveCart(product, 1);
      if (!result.ok) {
        pushActionMessage(result.message ?? "Unable to add scanned product.", true);
        return;
      }

      pushActionMessage(`${product.name} added from scanner.`);
    } catch (error) {
      pushActionMessage(error instanceof Error ? error.message : "Unable to process scan.", true);
    } finally {
      setTimeout(() => {
        setScanLocked(false);
      }, 700);
    }
  };

  const handleCheckout = async () => {
    if (
      !user ||
      !activeOrganization ||
      !activeCart ||
      activeCart.lines.length === 0 ||
      isCheckingOut
    ) {
      return;
    }

    setIsCheckingOut(true);
    setScreenError(null);
    setScreenMessage(null);

    try {
      const result = await checkoutCart({
        orgId: activeOrganization.id,
        soldBy: user.uid,
        cartId: activeCart.id,
        cartLabel: activeCart.clientLabel,
        lines: activeCart.lines.map((line) => ({
          productId: line.productId,
          sku: line.sku,
          name: line.name,
          barcode: line.barcode,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      });

      archiveActiveCart({ saleId: result.saleId });
      clearSalesProductCache();
      showToast(
        `Checkout complete (${result.totalItems} items, $${result.totalAmount.toFixed(2)}).`,
        "success",
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to checkout cart.", "error");
    } finally {
      setIsCheckingOut(false);
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
            Sales
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            Fast search + scan with multiple active carts for supermarket-style checkout.
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
              Create or switch to an active organization before selling products.
            </ThemedText>
          </View>
        ) : null}

        {screenError ? (
          <ThemedText style={[styles.feedbackText, { color: dangerColor }]}>
            {screenError}
          </ThemedText>
        ) : null}
        {screenMessage ? (
          <ThemedText style={[styles.feedbackText, { color: successColor }]}>
            {screenMessage}
          </ThemedText>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Product Lookup
          </ThemedText>

          <ProductSelector
            organizationId={activeOrganizationId}
            query={searchTerm}
            onQueryChange={setSearchTerm}
            onSelectProduct={handleAddProduct}
            refreshToken={searchRefreshToken}
            actionLabel="Add"
            actionDisabled={!activeOrganization}
            inputAccessory={
              <Pressable
                onPress={() => void handleScannerOpen()}
                disabled={!activeOrganization}
                style={({ pressed }) => [
                  styles.scanButton,
                  {
                    borderColor,
                    backgroundColor: inputBackground,
                    opacity: pressed || !activeOrganization ? 0.82 : 1,
                  },
                ]}>
                <ThemedText type="defaultSemiBold">Scan</ThemedText>
              </Pressable>
            }
          />

          {isScannerVisible ? (
            <View style={[styles.scannerWrap, { borderColor }]}>
              <BarCodeScanner
                onBarCodeScanned={(result) => void handleScannedCode(result.data)}
                style={styles.scanner}
              />
              <Pressable
                onPress={() => setIsScannerVisible(false)}
                style={({ pressed }) => [
                  styles.closeScannerButton,
                  { backgroundColor: accentColor, opacity: pressed ? 0.82 : 1 },
                ]}>
                <ThemedText style={styles.buttonText}>Close scanner</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Carts
          </ThemedText>

          <View style={styles.row}>
            <Pressable
              onPress={() => {
                const cartNumber = carts.length + archivedCarts.length + 1;
                createCart(`Client ${cartNumber}`);
              }}
              style={({ pressed }) => [
                styles.newCartButton,
                {
                  borderColor,
                  backgroundColor: inputBackground,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}>
              <ThemedText type="defaultSemiBold">New cart</ThemedText>
            </Pressable>
            <Pressable
              onPress={clearActiveCart}
              disabled={!activeCart || activeCart.lines.length === 0}
              style={({ pressed }) => [
                styles.newCartButton,
                {
                  borderColor,
                  backgroundColor: inputBackground,
                  opacity: pressed || !activeCart || activeCart.lines.length === 0 ? 0.65 : 1,
                },
              ]}>
              <ThemedText type="defaultSemiBold">Clear cart</ThemedText>
            </Pressable>
          </View>

          <View style={styles.cartTabs}>
            {carts.map((cart) => {
              const selected = cart.id === activeCartId;
              return (
                <View key={cart.id} style={styles.cartChipRow}>
                  <Pressable
                    onPress={() => switchActiveCart(cart.id)}
                    style={[
                      styles.cartChip,
                      {
                        borderColor: selected ? accentColor : borderColor,
                        backgroundColor: selected ? accentColor : inputBackground,
                      },
                    ]}>
                    <ThemedText style={{ color: selected ? "#ffffff" : textColor }} selectable>
                      {cart.clientLabel} ({cart.lines.length})
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => deleteCart(cart.id)}
                    accessibilityLabel={`Delete ${cart.clientLabel}`}
                    style={({ pressed }) => [
                      styles.deleteCartButton,
                      {
                        borderColor,
                        backgroundColor: inputBackground,
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}>
                    <ThemedText type="defaultSemiBold" style={{ color: dangerColor }}>
                      Delete
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {activeCart ? (
            <>
              <FieldLabel label="Active cart label" />
              <TextInput
                value={activeCart.clientLabel}
                onChangeText={renameActiveCart}
                placeholder="Client name"
                placeholderTextColor={muted}
                style={[
                  styles.input,
                  { color: textColor, backgroundColor: inputBackground, borderColor },
                ]}
              />

              {activeCart.lines.length === 0 ? (
                <View
                  style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
                  <ThemedText selectable>
                    Cart is empty. Add products from search or scanner.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.linesWrap}>
                  {activeCart.lines.map((line) => {
                    const isLowStock = line.currentStockSnapshot <= line.stockThreshold;

                    return (
                      <View
                        key={line.productId}
                        style={[
                          styles.lineCard,
                          { backgroundColor: inputBackground, borderColor },
                        ]}>
                        <View style={styles.lineMeta}>
                          <ThemedText type="defaultSemiBold" selectable>
                            {line.name}
                          </ThemedText>
                          <ThemedText selectable style={{ color: muted }}>
                            SKU: {line.sku} · ${line.unitPrice.toFixed(2)} each
                          </ThemedText>
                          <ThemedText
                            selectable
                            style={{ color: isLowStock ? dangerColor : muted }}>
                            Stock snapshot: {line.currentStockSnapshot}
                            {isLowStock ? " · Low stock" : ""}
                          </ThemedText>
                        </View>

                        <View style={styles.lineActions}>
                          <Pressable
                            onPress={() => {
                              const result = decrementLineItem(line.productId);
                              if (!result.ok && result.message) {
                                pushActionMessage(result.message, true);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.quantityButton,
                              {
                                borderColor,
                                backgroundColor: inputBackground,
                                opacity: pressed ? 0.82 : 1,
                              },
                            ]}>
                            <ThemedText type="defaultSemiBold">-</ThemedText>
                          </Pressable>

                          <TextInput
                            value={String(line.quantity)}
                            onChangeText={(value) => {
                              const normalized = value.replace(/[^0-9]/g, "");
                              if (!normalized) {
                                return;
                              }

                              const nextQuantity = Number.parseInt(normalized, 10);
                              const result = setLineItemQuantity(line.productId, nextQuantity);
                              if (!result.ok && result.message) {
                                pushActionMessage(result.message, true);
                              }
                            }}
                            keyboardType="number-pad"
                            style={[
                              styles.quantityInput,
                              {
                                color: textColor,
                                backgroundColor: inputBackground,
                                borderColor,
                              },
                            ]}
                          />

                          <Pressable
                            onPress={() => {
                              const result = incrementLineItem(line.productId);
                              if (!result.ok && result.message) {
                                pushActionMessage(result.message, true);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.quantityButton,
                              {
                                borderColor,
                                backgroundColor: inputBackground,
                                opacity: pressed ? 0.82 : 1,
                              },
                            ]}>
                            <ThemedText type="defaultSemiBold">+</ThemedText>
                          </Pressable>

                          <Pressable
                            onPress={() => removeLineItem(line.productId)}
                            style={({ pressed }) => [
                              styles.removeButton,
                              {
                                borderColor,
                                backgroundColor: inputBackground,
                                opacity: pressed ? 0.82 : 1,
                              },
                            ]}>
                            <ThemedText type="defaultSemiBold">Remove</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}

          <View style={[styles.checkoutCard, { backgroundColor: inputBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold" selectable>
              Items: {totalItems} · Total: ${totalAmount.toFixed(2)}
            </ThemedText>

            <Pressable
              onPress={() => void handleCheckout()}
              disabled={
                !activeOrganization || !activeCart || activeCart.lines.length === 0 || isCheckingOut
              }
              style={({ pressed }) => [
                styles.checkoutButton,
                {
                  backgroundColor: accentColor,
                  opacity:
                    pressed ||
                    !activeOrganization ||
                    !activeCart ||
                    activeCart.lines.length === 0 ||
                    isCheckingOut
                      ? 0.72
                      : 1,
                },
              ]}>
              {isCheckingOut ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.buttonText}>Checkout active cart</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
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
  noticeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  feedbackText: {
    fontSize: 13,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
  },
  scanButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    gap: 8,
  },
  scanner: {
    width: "100%",
    height: 260,
  },
  closeScannerButton: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  lookupResults: {
    gap: 10,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultMeta: {
    flex: 1,
    gap: 3,
  },
  addButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: "center",
  },
  newCartButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cartTabs: {
    gap: 10,
  },
  cartChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
    flex: 1,
  },
  deleteCartButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linesWrap: {
    gap: 10,
  },
  lineCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  lineMeta: {
    gap: 3,
  },
  lineActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityButton: {
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 34,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 56,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
  },
  removeButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  checkoutCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  checkoutButton: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
