import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import {
  getDeviceLanguage,
  setAppLanguage,
  type AppLanguage,
} from "@/config/i18n";

export type ThemePreference = "system" | "light" | "dark";

type PreferencesState = {
  themePreference: ThemePreference;
  language: AppLanguage;
  isHydrated: boolean;
  hydratePreferences: () => Promise<void>;
  setThemePreference: (themePreference: ThemePreference) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

type PersistedPreferences = {
  themePreference?: ThemePreference;
  language?: AppLanguage;
};

const STORAGE_KEY = "@inventory/preferences/v1";
const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
const DEFAULT_LANGUAGE = getDeviceLanguage();

setAppLanguage(DEFAULT_LANGUAGE);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "es";
}

function parsePersistedPreferences(raw: string | null): PersistedPreferences {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as PersistedPreferences;

    return {
      themePreference: isThemePreference(parsed.themePreference)
        ? parsed.themePreference
        : undefined,
      language: isAppLanguage(parsed.language) ? parsed.language : undefined,
    };
  } catch {
    return {};
  }
}

async function savePreferences(themePreference: ThemePreference, language: AppLanguage) {
  const payload: PersistedPreferences = { themePreference, language };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  themePreference: DEFAULT_THEME_PREFERENCE,
  language: DEFAULT_LANGUAGE,
  isHydrated: false,
  hydratePreferences: async () => {
    if (get().isHydrated) {
      return;
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const persisted = parsePersistedPreferences(raw);

      const themePreference = persisted.themePreference ?? DEFAULT_THEME_PREFERENCE;
      const language = persisted.language ?? DEFAULT_LANGUAGE;

      setAppLanguage(language);
      set({ themePreference, language, isHydrated: true });
    } catch {
      setAppLanguage(DEFAULT_LANGUAGE);
      set({
        themePreference: DEFAULT_THEME_PREFERENCE,
        language: DEFAULT_LANGUAGE,
        isHydrated: true,
      });
    }
  },
  setThemePreference: async (themePreference) => {
    set({ themePreference });
    const { language } = get();
    try {
      await savePreferences(themePreference, language);
    } catch {
      // Ignore persistence failures and keep in-memory preference.
    }
  },
  setLanguage: async (language) => {
    setAppLanguage(language);
    set({ language });
    const { themePreference } = get();
    try {
      await savePreferences(themePreference, language);
    } catch {
      // Ignore persistence failures and keep in-memory preference.
    }
  },
}));
