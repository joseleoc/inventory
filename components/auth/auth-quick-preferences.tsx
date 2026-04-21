import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { usePreferencesStore, type ThemePreference } from "@/stores/preferences-store";

type AuthQuickPreferencesProps = {
  disabled?: boolean;
};

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const THEME_ICONS: Record<ThemePreference, keyof typeof MaterialIcons.glyphMap> = {
  system: "brightness-auto",
  light: "light-mode",
  dark: "dark-mode",
};

export function AuthQuickPreferences({ disabled = false }: AuthQuickPreferencesProps) {
  const language = usePreferencesStore((state) => state.language);
  const themePreference = usePreferencesStore((state) => state.themePreference);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setThemePreference = usePreferencesStore((state) => state.setThemePreference);

  const chipBackground = useThemeColor({ light: "#eef3f7", dark: "#232a30" }, "background");
  const chipBorder = useThemeColor({ light: "#c8d4df", dark: "#3a434c" }, "text");
  const chipText = useThemeColor({ light: "#1f2a33", dark: "#e6edf2" }, "text");

  const nextLanguage = language === "en" ? "es" : "en";
  const nextTheme = NEXT_THEME[themePreference];
  const currentThemeIcon = THEME_ICONS[themePreference];

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("settings.language.title")}: ${t(`settings.language.options.${nextLanguage}`)}`}
        accessibilityHint={t("settings.language.subtitle")}
        disabled={disabled}
        onPress={() => {
          void setLanguage(nextLanguage);
        }}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: chipBackground,
            borderColor: chipBorder,
            opacity: pressed || disabled ? 0.82 : 1,
          },
        ]}>
        <MaterialIcons name="language" size={18} color={chipText} />
        <ThemedText style={[styles.chipText, { color: chipText }]}>
          {language.toUpperCase()}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("settings.theme.title")}: ${t(`settings.theme.options.${nextTheme}`)}`}
        accessibilityHint={t("settings.theme.subtitle")}
        disabled={disabled}
        onPress={() => {
          void setThemePreference(nextTheme);
        }}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: chipBackground,
            borderColor: chipBorder,
            opacity: pressed || disabled ? 0.82 : 1,
          },
        ]}>
        <MaterialIcons name={currentThemeIcon} size={18} color={chipText} />
        <ThemedText style={[styles.chipText, { color: chipText }]}>
          {t(`settings.theme.options.${themePreference}`)}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
});
