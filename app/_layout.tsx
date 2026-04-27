import "@/config/firebase";
import { FontAwesome } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { setAppLanguage, t } from "@/config/i18n";
import { queryClient } from "@/config/query-client";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { usePreferencesStore } from "@/stores/preferences-store";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep the splash screen visible while shared assets are still loading.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...FontAwesome.font,
  });
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
  const pendingInvitations = useOrganizationStore((state) => state.pendingInvitations);
  const language = usePreferencesStore((state) => state.language);
  const isPreferencesHydrated = usePreferencesStore((state) => state.isHydrated);
  const hydratePreferences = usePreferencesStore((state) => state.hydratePreferences);
  const hasPendingInvitations = pendingInvitations.length > 0;
  const isAppBootstrapping =
    !fontsLoaded ||
    !isPreferencesHydrated ||
    isInitializing ||
    (user && isOrganizationInitializing);

  useEffect(() => {
    if (!fontError) {
      return;
    }

    throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

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
    if (isAppBootstrapping) {
      return;
    }

    const inAuthGroup = topSegment === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (user && inAuthGroup) {
      router.replace(
        hasPendingInvitations || !activeOrganization ? "/(tabs)/organizations" : "/(tabs)",
      );
      return;
    }

    if (
      user &&
      !inAuthGroup &&
      (hasPendingInvitations || !activeOrganization) &&
      secondSegment !== "organizations"
    ) {
      router.replace("/(tabs)/organizations");
    }
  }, [
    activeOrganization,
    hasPendingInvitations,
    isAppBootstrapping,
    isInitializing,
    isPreferencesHydrated,
    isOrganizationInitializing,
    router,
    secondSegment,
    topSegment,
    user,
  ]);

  if (isAppBootstrapping) {
    return (
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <ThemedView style={styles.centered}>
              <ActivityIndicator size="large" />
            </ThemedView>
            <StatusBar style="auto" />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack key={language}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: t("modal.title") }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
