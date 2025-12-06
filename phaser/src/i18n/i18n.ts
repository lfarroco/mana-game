import en from './en.json';
import es from './es.json';

type Translations = Record<string, string>;

const locales: Record<string, Translations> = {
	en,
	es
};

let currentLocale = 'en';
let translations: Translations = locales[currentLocale];

export function setLocale(locale: string) {
	if (locales[locale]) {
		currentLocale = locale;
		translations = locales[locale];
	} else {
		console.warn(`Locale ${locale} not found, falling back to ${currentLocale}`);
	}
}

export function t(key: string, params?: Record<string, string>): string {
	let text = translations[key] || key;
	if (params) {
		Object.entries(params).forEach(([k, v]) => {
			text = text.replace(`{${k}}`, v);
		});
	}
	return text;
}

export function getCurrentLocale(): string {
	return currentLocale;
}

export function getAvailableLocales(): string[] {
	return Object.keys(locales);
}

const localeNames: Record<string, string> = {
	en: "English",
	es: "Español"
};

export function getNativeName(locale: string): string {
	return localeNames[locale] || locale;
}
