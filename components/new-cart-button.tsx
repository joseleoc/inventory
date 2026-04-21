import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { t } from "@/config/i18n";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useSalesCartStore } from "@/stores/sales-cart-store";

export function NewCartHeaderButton() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const createCart = useSalesCartStore((state) => state.createCart);
  const carts = useSalesCartStore((state) => state.carts);
  const archivedCarts = useSalesCartStore((state) => state.archivedCarts);

  const buttonColor = useThemeColor({}, "tint");
  const contentColor = colorScheme === "dark" ? "#11181C" : "#FFFFFF";

  const handleCreateCart = () => {
    const cartNumber = carts.length + archivedCarts.length + 1;
    createCart(t("newCartFab.clientName", { number: cartNumber }));
    router.push("/(tabs)/sales");
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("newCartFab.a11y")}
      onPress={handleCreateCart}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: buttonColor, opacity: pressed ? 0.82 : 1 },
      ]}>
      <IconSymbol size={16} name="cart.fill" color={contentColor} />
      <ThemedText style={[styles.label, { color: contentColor }]}>{t("newCartFab.label")}</ThemedText>
    </Pressable>
  );
}

export const NewCartFab = NewCartHeaderButton;

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontWeight: "700",
    lineHeight: 18,
    fontSize: 13,
  },
});
