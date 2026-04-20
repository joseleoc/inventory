import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";

type HomeCta = {
  key: "products" | "addProduct" | "sales" | "organizations";
  href: "/(tabs)/products" | "/(tabs)/add-product" | "/(tabs)/sales" | "/(tabs)/organizations";
};

const CTA_ITEMS: HomeCta[] = [
  {
    key: "products",
    href: "/(tabs)/products",
  },
  {
    key: "addProduct",
    href: "/(tabs)/add-product",
  },
  {
    key: "sales",
    href: "/(tabs)/sales",
  },
  {
    key: "organizations",
    href: "/(tabs)/organizations",
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
            {t("home.title")}
          </ThemedText>
          <ThemedText style={styles.subtitle} selectable>
            {t("home.subtitle")}
          </ThemedText>
        </View>

        <View style={styles.cardsWrap}>
          {CTA_ITEMS.map((item) => (
            <View
              key={item.href}
              style={[styles.card, { backgroundColor: panelBackground, borderColor }]}>
              <View style={styles.cardTextBlock}>
                <ThemedText type="subtitle">{t(`home.ctas.${item.key}.title`)}</ThemedText>
                <ThemedText style={{ color: text }} selectable>
                  {t(`home.ctas.${item.key}.description`)}
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
                <ThemedText style={styles.cardButtonText}>
                  {t(`home.ctas.${item.key}.button`)}
                </ThemedText>
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
