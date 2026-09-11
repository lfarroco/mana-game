/**
 * Locale changes must survive blocked storage.
 *
 * `setLocale` wrote the choice with a raw `localStorage.setItem` and only then
 * emitted `localeChanged` — so on a machine whose storage throws, the language
 * silently refused to switch (the emit never ran). Persisting the choice is now
 * best-effort.
 */

import { GameEvent } from "../Events";
import { getCurrentLocale, setLocale } from "./i18n";

describe("i18n.setLocale — blocked storage", () => {
	let setItem: jest.SpyInstance;
	let warn: jest.SpyInstance;

	beforeEach(() => {
		setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("SecurityError: storage denied");
		});
		warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		setItem.mockRestore();
		warn.mockRestore();
		// Restore a known locale for other assertions.
		setItem.mockRestore();
	});

	it("switches the language and notifies screens even when the write fails", () => {
		const changes: string[] = [];
		const dispose = GameEvent.localeChanged.listen(({ locale }) => {
			changes.push(locale);
		});

		expect(() => setLocale("es")).not.toThrow();

		expect(getCurrentLocale()).toBe("es");
		expect(changes).toEqual(["es"]);
		expect(warn).toHaveBeenCalled();

		dispose();
	});
});
