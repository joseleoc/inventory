import { Drawer } from "expo-router/drawer";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { t } from "@/config/i18n";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const signOutCurrentUser = useAuthStore((state) => state.signOutCurrentUser);

  const handleLogout = async () => {
    try {
      await signOutCurrentUser();
    } catch {
      // Root auth handling manages redirect and error state.
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Drawer.Screen
        options={{
          title: t("settings.title"),
        }}
      />

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="title" selectable>
          {t("settings.title")}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.icon }]} selectable>
          {t("settings.subtitle")}
        </ThemedText>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.icon,
            backgroundColor: colors.background,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.logOutA11y")}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              borderColor: colors.icon,
              backgroundColor: colors.background,
              opacity: pressed ? 0.82 : 1,
            },
          ]}>
          <IconSymbol size={20} name="rectangle.portrait.and.arrow.right" color={colors.text} />
          <ThemedText type="defaultSemiBold" style={styles.logoutLabel} selectable>
            {t("settings.logOut")}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
  },
  subtitle: {
    lineHeight: 24,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 10,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  logoutLabel: {
    lineHeight: 22,
  },
});
