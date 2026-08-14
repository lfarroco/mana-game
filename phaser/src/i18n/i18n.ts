import en from "./en.json";
import es from "./es.json";
import pt from "./pt.json";
import jp from "./jp.json";
import cn from "./cn.json";
import ru from "./ru.json";
import { GameEvent } from "../Events";
import { createTranslator, type Translations } from "@game/i18n/translator";

const locales: Record<string, Translations> = {
	en,
	es,
	pt,
	jp,
	cn,
	ru,
};

const STORAGE_KEY = "selected_locale";

let currentLocale = "en";

const translator = createTranslator(locales, () => currentLocale);

export function initialize() {
	try {
		const savedLocale =
			typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
		if (savedLocale && locales[savedLocale]) {
			currentLocale = savedLocale;
		} else if (typeof window !== "undefined" && window.navigator) {
			const systemLocale = window.navigator.language.split("-")[0];
			if (locales[systemLocale]) {
				currentLocale = systemLocale;
			}
		}
	} catch {
		// console.warn('Failed to load locale:', e);
	}
}

initialize();

export function setLocale(locale: string) {
	if (locales[locale]) {
		currentLocale = locale;
		localStorage.setItem(STORAGE_KEY, locale);

		GameEvent.localeChanged.emit({ locale });
	} else {
		console.warn(`Locale ${locale} not found, falling back to ${currentLocale}`);
	}
}

export const t = translator.t;
export const getName = translator.getName;
export const getAvailableLocales = translator.getAvailableLocales;

export function getCurrentLocale(): string {
	return currentLocale;
}

export { getNativeName } from "@game/i18n/translator";
