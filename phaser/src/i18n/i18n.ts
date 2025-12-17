import en from './en.json';
import es from './es.json';
import pt from './pt.json';
import jp from './jp.json';
import cn from './cn.json';
import ru from './ru.json';

type Translations = Record<string, string>;

const locales: Record<string, Translations> = {
	en,
	es,
	pt,
	jp,
	cn,
	ru
};

const STORAGE_KEY = 'selected_locale';

let currentLocale = 'en';
let translations: Translations = locales[currentLocale];

export function initialize() {
	try {
		const savedLocale = localStorage.getItem(STORAGE_KEY);
		if (savedLocale && locales[savedLocale]) {
			currentLocale = savedLocale;
		} else {
			const systemLocale = window.navigator.language.split('-')[0];
			if (locales[systemLocale]) {
				currentLocale = systemLocale;
			}
		}
		translations = locales[currentLocale];
	} catch (e) {
		console.warn('Failed to load locale:', e);
	}
}

initialize();

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
			text = text.replace(new RegExp(`{${k}}`, 'g'), v);
		});
	}
	return text;
}

export function getName(cardId: string): string {
	return t(`card.${cardId}.name`);
}

export function getCurrentLocale(): string {
	return currentLocale;
}

export function getAvailableLocales(): string[] {
	return Object.keys(locales);
}

const localeNames: Record<string, string> = {
	en: "English",
	es: "Español",
	pt: "Português",
	jp: "日本語",
	cn: "中文",
	ru: "Русский",
};

export function getNativeName(locale: string): string {
	return localeNames[locale] || locale;
}
