// Mock the JSON files
jest.mock('./en.json', () => ({
	__esModule: true,
	default: {
		"common_key": "Value EN",
		"only_en": "Only EN",
		"replace_key": "Value {val} EN"
	}
}));

jest.mock('./es.json', () => ({
	__esModule: true,
	default: {
		"common_key": "Value ES"
	}
}));

import { t, setLocale, initialize, getCurrentLocale } from './i18n';

describe('i18n', () => {
	beforeEach(() => {
		// Clear local storage and mocks
		localStorage.clear();
		jest.clearAllMocks();

		// Default mock implementation
		jest.spyOn(Storage.prototype, 'setItem');
		jest.spyOn(Storage.prototype, 'getItem');

		// Reset to 'en' for standard tests, but we might want to check this per test
		// Since we modify global state (module state), we should reset it.
		// However, we can't easily "unload" the module without resetModules everywhere.
		// For simple tests, we just use setLocale.
		setLocale('en');
	});

	test('t() returns translation for current locale', () => {
		setLocale('es');
		expect(t('common_key')).toBe('Value ES');
	});

	test('t() falls back to English if key missing in current locale', () => {
		setLocale('es');
		expect(t('only_en')).toBe('only_en');
	});

	test('t() returns key if missing in both current and English', () => {
		setLocale('es'); // or 'en'
		expect(t('missing_key')).toBe('missing_key');
	});

	test('t() works with params', () => {
		setLocale('en');
		expect(t('replace_key', { val: 'Test' })).toBe('replace_key');
	});

	test('t() falls back to English with params', () => {
		setLocale('es'); // key only in EN
		expect(t('replace_key', { val: 'Fallback' })).toBe('replace_key');
	});

	test('setLocale saves to localStorage', () => {
		setLocale('es');
		expect(localStorage.setItem).toHaveBeenCalledWith('selected_locale', 'es');
	});

	test('initialization loads from localStorage', () => {
		// Prepare local storage
		localStorage.setItem('selected_locale', 'es');

		// Call initialize
		initialize();

		expect(getCurrentLocale()).toBe('es');
	});

	test('initialization uses system locale if localStorage empty', () => {
		// Redefine window.navigator to ensure we can control the language
		Object.defineProperty(window, 'navigator', {
			value: { language: 'es-ES' },
			configurable: true,
			writable: true
		});

		// Clear any previous state
		setLocale('en');
		localStorage.clear();

		// Run initialization
		initialize();

		expect(getCurrentLocale()).toBe('es');
	});

	test('initialization prefers localStorage over system locale', () => {
		localStorage.setItem('selected_locale', 'en');
		Object.defineProperty(window, 'navigator', {
			value: { language: 'es-ES' },
			configurable: true,
			writable: true
		});

		initialize();
		expect(getCurrentLocale()).toBe('en');
	});

	test('initialization defaults to en if system locale not supported', () => {
		Object.defineProperty(window, 'navigator', {
			value: { language: 'fr-FR' },
			configurable: true,
			writable: true
		});

		initialize();
		expect(getCurrentLocale()).toBe('en');
	});

	test('initialization defaults to en if localStorage invalid', () => {
		localStorage.setItem('selected_locale', 'invalid_lang');
		initialize();
		expect(getCurrentLocale()).toBe('en');
	});
});
