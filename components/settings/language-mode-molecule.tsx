import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { usePreferencesStore } from "@/stores/preferences-store";

const LANGUAGE_OPTIONS = ["en", "es"] as const;

export function LanguageModeMolecule() {
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);

  const cardBackground = useThemeColor({ light: "#F7FAFC", dark: "#1A1F24" }, "background");
  const borderColor = useThemeColor({ light: "#D8E0E8", dark: "#2C333A" }, "text");
  const mutedColor = useThemeColor({ light: "#506071", dark: "#AAB7C2" }, "text");
  const selectedBackground = useThemeColor({ light: "#0A7EA4", dark: "#ECEDEE" }, "tint");
  const selectedText = useThemeColor({ light: "#FFFFFF", dark: "#11181C" }, "text");
  const optionBackground = useThemeColor({ light: "#FFFFFF", dark: "#151718" }, "background");

  return (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
      <ThemedText type="defaultSemiBold" selectable>
        {t("settings.language.title")}
      </ThemedText>
      <ThemedText style={[styles.description, { color: mutedColor }]} selectable>
        {t("settings.language.subtitle")}
      </ThemedText>

      <View style={styles.optionRow}>
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = language === option;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t(`settings.language.options.${option}`)}
              onPress={() => {
                void setLanguage(option);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: isSelected ? selectedBackground : optionBackground,
                  borderColor,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.optionLabel, { color: isSelected ? selectedText : mutedColor }]}
                selectable>
                {t(`settings.language.options.${option}`)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  description: {
    lineHeight: 22,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    textAlign: "center",
    lineHeight: 20,
  },
});
