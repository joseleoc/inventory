import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";

export type AddProductFormTab = "stock" | "compound";

type AddProductFormTabsMoleculeProps = {
  value: AddProductFormTab;
  onChange: (next: AddProductFormTab) => void;
};

const TAB_OPTIONS: AddProductFormTab[] = ["stock", "compound"];

export function AddProductFormTabsMolecule({ value, onChange }: AddProductFormTabsMoleculeProps) {
  const textColor = useThemeColor({}, "text");
  const background = useThemeColor({}, "background");
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);
  const cardBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const accentColor = useMemo(() => "#0a7ea4", []);

  return (
    <View style={[styles.switchCard, { borderColor, backgroundColor: cardBackground }]}>
      {TAB_OPTIONS.map((option) => {
        const isActive = value === option;

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.tabButton,
              {
                backgroundColor: isActive ? accentColor : "transparent",
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <ThemedText style={[styles.tabText, { color: isActive ? "#ffffff" : textColor }]}>
              {t(`addProduct.formTabs.${option}`)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switchCard: {
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
