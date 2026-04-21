import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { usePreferencesStore } from "@/stores/preferences-store";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const themePreference = usePreferencesStore((state) => state.themePreference);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (themePreference !== "system") {
    return themePreference;
  }

  if (hasHydrated) {
    return colorScheme ?? "light";
  }

  return "light";
}
