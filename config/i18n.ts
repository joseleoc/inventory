import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

import en from "@/locales/en";
import es from "@/locales/es";

export type AppLanguage = "es" | "en";

const i18n = new I18n({
  es,
  en,
});

i18n.enableFallback = true;
i18n.defaultLocale = "es";
i18n.locale = getDeviceLanguage();

export function getDeviceLanguage(): AppLanguage {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  if (code === "en") {
    return "en";
  }

  return "es";
}

export function setAppLanguage(language: AppLanguage) {
  i18n.locale = language;
}

export function t(scope: string, options?: Record<string, unknown>) {
  return i18n.t(scope, options);
}

export function getCurrentLanguage(): AppLanguage {
  return i18n.locale.startsWith("en") ? "en" : "es";
}

export default i18n;
