import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useSalesCartStore } from "@/stores/sales-cart-store";

export function NewCartFab() {
  const router = useRouter();
  const createCart = useSalesCartStore((state) => state.createCart);
  const carts = useSalesCartStore((state) => state.carts);
  const archivedCarts = useSalesCartStore((state) => state.archivedCarts);

  const buttonColor = useThemeColor({}, "tint");

  const handleCreateCart = () => {
    const cartNumber = carts.length + archivedCarts.length + 1;
    createCart(`Client ${cartNumber}`);
    router.push("/(tabs)/sales");
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create new cart"
      onPress={handleCreateCart}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: buttonColor, opacity: pressed ? 0.82 : 1 },
      ]}>
      <IconSymbol size={18} name="cart.fill" color="#000000" />
      <ThemedText style={styles.label}>New Cart</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 100,
  },
  label: {
    color: "#000000",
    fontWeight: "700",
    lineHeight: 20,
  },
});
