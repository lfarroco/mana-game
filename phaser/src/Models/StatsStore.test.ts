/**
 * Storage failures must never break a screen.
 *
 * The player-reported "the victory screen is just gone" traced to a storage call
 * awaited at the top of the run-complete screen: on a machine whose storage is
 * blocked, read-only or over quota, `localStorage.*` throws, and the exception
 * propagated out of the screen handler before any UI existed.
 *
 * These tests pin the invariant at every raw `localStorage` site in the client:
 * a throwing backend degrades to "not persisted", never to a thrown error.
 */

import * as StatsStore from "./StatsStore";

describe("StatsStore — blocked storage", () => {
	let getItem: jest.SpyInstance;
	let setItem: jest.SpyInstance;
	let warn: jest.SpyInstance;

	beforeEach(() => {
		getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError: storage denied");
		});
		setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("QuotaExceededError");
		});
		warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		getItem.mockRestore();
		setItem.mockRestore();
		warn.mockRestore();
	});

	it("boots, records and saves without throwing (the run-complete screen reads stats)", () => {
		// `StatsStore.init()` runs in BootScene; the record* calls + save() run in
		// displayGameComplete BEFORE the results panel is built.
		expect(() => {
			StatsStore.init();
			StatsStore.incrementRunsPlayed();
			StatsStore.recordVictory("gold", "mana_crystal");
			StatsStore.recordRunStats({
				damageDealt: 1,
				poisonDealt: 0,
				shieldDealt: 0,
				regenDealt: 0,
				healDealt: 0,
				mostPowerfulUnit: null,
				totalUnitsRecruited: 0,
				unitUsage: {},
			});
			StatsStore.save();
		}).not.toThrow();

		// In-memory stats still advance, so the run-complete screen shows numbers.
		expect(StatsStore.getStats().totalRuns).toBeGreaterThan(0);
	});
});
