export const defaultLocale = "es" as const;
export const supportedLocales = ["es", "en"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}
