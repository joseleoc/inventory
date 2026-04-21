import "@/config/firebase";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import "react-native-reanimated";

import { ThemedView } from "@/components/themed-view";
import { setAppLanguage, t } from "@/config/i18n";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { usePreferencesStore } from "@/stores/preferences-store";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const topSegment = segments[0];
  const secondSegment = segments[1];
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const initializeOrganizationContext = useOrganizationStore(
    (state) => state.initializeOrganizationContext,
  );
  const clearOrganizationContext = useOrganizationStore((state) => state.clearOrganizationContext);
  const isOrganizationInitializing = useOrganizationStore((state) => state.isInitializing);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const language = usePreferencesStore((state) => state.language);
  const isPreferencesHydrated = usePreferencesStore((state) => state.isHydrated);
  const hydratePreferences = usePreferencesStore((state) => state.hydratePreferences);

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    setAppLanguage(language);
  }, [language]);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      unsubscribe();
    };
  }, [initializeAuth]);

  useEffect(() => {
    if (!user) {
      clearOrganizationContext();
      return;
    }

    void initializeOrganizationContext(user);
  }, [clearOrganizationContext, initializeOrganizationContext, user]);

  useEffect(() => {
    if (!isPreferencesHydrated || isInitializing || (user && isOrganizationInitializing)) {
      return;
    }

    const inAuthGroup = topSegment === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (user && inAuthGroup) {
      router.replace(activeOrganization ? "/(tabs)" : "/(tabs)/organizations");
      return;
    }

    if (user && !inAuthGroup && !activeOrganization && secondSegment !== "organizations") {
      router.replace("/(tabs)/organizations");
    }
  }, [
    activeOrganization,
    isInitializing,
    isPreferencesHydrated,
    isOrganizationInitializing,
    router,
    secondSegment,
    topSegment,
    user,
  ]);

  if (!isPreferencesHydrated || isInitializing || (user && isOrganizationInitializing)) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" />
        </ThemedView>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: t("modal.title") }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
