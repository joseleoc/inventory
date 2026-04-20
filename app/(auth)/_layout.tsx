import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";

export default function AuthLayout() {
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const isOrganizationInitializing = useOrganizationStore((state) => state.isInitializing);

  if (isInitializing || (user && isOrganizationInitializing)) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (user) {
    return <Redirect href={activeOrganization ? "/(tabs)" : "/(tabs)/organizations"} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
