import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type HomeCta = {
  title: string;
  description: string;
  href: "/(tabs)/products" | "/(tabs)/add-product" | "/(tabs)/sales" | "/(tabs)/organizations";
  buttonLabel: string;
};

const CTA_ITEMS: HomeCta[] = [
  {
    title: "Products Catalog",
    description: "Browse products, inspect stock state, and open product edit/restock details.",
    href: "/(tabs)/products",
    buttonLabel: "Open Products",
  },
  {
    title: "Add Product",
    description: "Create a new product with buying, selling, unit, and stock information.",
    href: "/(tabs)/add-product",
    buttonLabel: "Create Product",
  },
  {
    title: "Sales",
    description: "Create supermarket-style carts and complete checkout with scanner support.",
    href: "/(tabs)/sales",
    buttonLabel: "Go to Sales",
  },
  {
    title: "Organizations",
    description:
      "Switch organization context and manage users with organization-level permissions.",
    href: "/(tabs)/organizations",
    buttonLabel: "Manage Organizations",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");

  const panelBackground = background === "#fff" ? "#F4F7FA" : "#1D2227";
  const borderColor = background === "#fff" ? "#D8E0E8" : "#2C333A";

  return (
    <ThemedView style={styles.page}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: panelBackground, borderColor }]}>
          <ThemedText type="title" style={styles.title}>
            Inventory Dashboard
          </ThemedText>
          <ThemedText style={styles.subtitle} selectable>
            Quick actions to jump into catalog management, stock intake, sales checkout, and
            organization administration.
          </ThemedText>
        </View>

        <View style={styles.cardsWrap}>
          {CTA_ITEMS.map((item) => (
            <View
              key={item.href}
              style={[styles.card, { backgroundColor: panelBackground, borderColor }]}>
              <View style={styles.cardTextBlock}>
                <ThemedText type="subtitle">{item.title}</ThemedText>
                <ThemedText style={{ color: text }} selectable>
                  {item.description}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [
                  styles.cardButton,
                  {
                    backgroundColor: tint,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}>
                <ThemedText style={styles.cardButtonText}>{item.buttonLabel}</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  title: {
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardsWrap: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  cardTextBlock: {
    gap: 4,
  },
  cardButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  cardButtonText: {
    color: "#000000",
    fontWeight: "700",
  },
});
