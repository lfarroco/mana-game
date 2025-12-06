import en from './en.json';
import es from './es.json';

type Translations = Record<string, string>;

const locales: Record<string, Translations> = {
	en,
	es
};

const STORAGE_KEY = 'selected_locale';

let currentLocale = 'en';

// Try to load saved locale
try {
	const savedLocale = localStorage.getItem(STORAGE_KEY);
	if (savedLocale && locales[savedLocale]) {
		currentLocale = savedLocale;
	}
} catch (e) {
	console.warn('Failed to load locale from localStorage:', e);
}

let translations: Translations = locales[currentLocale];

export function setLocale(locale: string) {
	if (locales[locale]) {
		currentLocale = locale;
		translations = locales[locale];
		try {
			localStorage.setItem(STORAGE_KEY, locale);
		} catch (e) {
			console.warn('Failed to save locale to localStorage:', e);
		}
	} else {
		console.warn(`Locale ${locale} not found, falling back to ${currentLocale}`);
	}
}

export function t(key: string, params?: Record<string, string>): string {
	let text = translations[key];

	if (!text && currentLocale !== 'en') {
		text = locales['en'][key];
	}

	if (!text) {
		text = key;
	}

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
