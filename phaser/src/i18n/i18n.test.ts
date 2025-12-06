import { t, setLocale } from './i18n';

// Mock the JSON files
jest.mock('./en.json', () => ({
	__esModule: true,
	default: {
		"common_key": "Value EN",
		"only_en": "Only EN",
		"replace_key": "Value {val} EN"
	}
}), { virtual: true });

jest.mock('./es.json', () => ({
	__esModule: true,
	default: {
		"common_key": "Value ES"
	}
}), { virtual: true });

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
		expect(t('only_en')).toBe('Only EN');
	});

	test('t() returns key if missing in both current and English', () => {
		setLocale('es'); // or 'en'
		expect(t('missing_key')).toBe('missing_key');
	});

	test('t() works with params', () => {
		setLocale('en');
		expect(t('replace_key', { val: 'Test' })).toBe('Value Test EN');
	});

	test('t() falls back to English with params', () => {
		setLocale('es'); // key only in EN
		expect(t('replace_key', { val: 'Fallback' })).toBe('Value Fallback EN');
	});

	test('setLocale saves to localStorage', () => {
		setLocale('es');
		expect(localStorage.setItem).toHaveBeenCalledWith('selected_locale', 'es');
	});

	test('initialization loads from localStorage', () => {
		// Prepare local storage
		localStorage.setItem('selected_locale', 'es');

		// Reset modules to force re-execution of i18n.ts
		jest.resetModules();

		// Re-import
		const i18n = require('./i18n');

		expect(i18n.getCurrentLocale()).toBe('es');
	});

	test('initialization defaults to en if localStorage invalid', () => {
		localStorage.setItem('selected_locale', 'invalid_lang');
		jest.resetModules();
		const i18n = require('./i18n');
		expect(i18n.getCurrentLocale()).toBe('en');
	});
});
