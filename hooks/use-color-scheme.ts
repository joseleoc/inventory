import { useColorScheme as useRNColorScheme } from "react-native";

import { usePreferencesStore } from "@/stores/preferences-store";

export function useColorScheme() {
  const themePreference = usePreferencesStore((state) => state.themePreference);
  const systemColorScheme = useRNColorScheme();

  if (themePreference === "system") {
    return systemColorScheme ?? "light";
  }

  return themePreference;
}
