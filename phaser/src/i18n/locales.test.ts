import cn from "./cn.json";
import en from "./en.json";
import es from "./es.json";
import jp from "./jp.json";
import pt from "./pt.json";
import ru from "./ru.json";

const locales: Record<string, Record<string, string>> = {
	en,
	es,
	pt,
	jp,
	cn,
	ru,
};

describe("locale catalogs", () => {
	it("every locale has the same number of translation keys as en", () => {
		const expectedCount = Object.keys(en).length;
		const counts: Record<string, number> = {};
		for (const [locale, catalog] of Object.entries(locales)) {
			if (Object.keys(catalog).length !== expectedCount) {
				counts[locale] = Object.keys(catalog).length;
			}
		}
		expect(counts).toEqual({});
	});

	it("every locale has the same translation keys as en", () => {
		const englishKeys = new Set(Object.keys(en));
		const mismatches: Record<string, { missing: string[]; extra: string[] }> = {};
		for (const [locale, catalog] of Object.entries(locales)) {
			if (locale === "en") continue;
			const keys = new Set(Object.keys(catalog));
			const missing = [...englishKeys].filter((key) => !keys.has(key)).sort();
			const extra = [...keys].filter((key) => !englishKeys.has(key)).sort();
			if (missing.length > 0 || extra.length > 0) {
				mismatches[locale] = { missing, extra };
			}
		}
		expect(mismatches).toEqual({});
	});
});
