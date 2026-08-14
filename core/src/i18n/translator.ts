export type Translations = Record<string, string>;
export type LocaleTable = Record<string, Translations>;

export type Translator = {
  t(key: string, params?: Record<string, string>): string;
  getName(cardId: string): string;
  getAvailableLocales(): string[];
};

export const DEFAULT_LOCALE = "en";

export const LOCALE_NATIVE_NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  jp: "日本語",
  cn: "中文",
  ru: "Русский",
};

export const getNativeName = (locale: string): string => LOCALE_NATIVE_NAMES[locale] || locale;

/**
 * Pure translation engine. The current locale is read through an injected
 * getter so the caller owns locale state (persistence, events).
 */
export function createTranslator(
  locales: LocaleTable,
  getCurrentLocale: () => string,
  defaultLocale: string = DEFAULT_LOCALE,
): Translator {
  const t = (key: string, params?: Record<string, string>): string => {
    const currentLocale = getCurrentLocale();
    const current = locales[currentLocale];
    let text = current ? current[key] : undefined;
    if (!text && currentLocale !== defaultLocale) {
      text = locales[defaultLocale]?.[key];
    }
    if (!text) text = key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${k}}`, "g"), v);
      }
    }
    return text;
  };
  return {
    t,
    getName: (cardId: string): string => t(`card.${cardId}.name`),
    getAvailableLocales: () => Object.keys(locales),
  };
}
