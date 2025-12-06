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
		setLocale('en'); // Reset to default
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
});
