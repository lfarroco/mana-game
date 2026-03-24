import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { createLlmPlayerService } from "@Core/LlmPlayerService";
import { registerCollection } from "@Models/Entities/Card";

if (typeof global.structuredClone === "undefined") {
	global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
}

jest.mock("../i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (key: string) => key,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

describe("createLlmPlayerService", () => {
	it("exposes initial board, choices, and replay metadata for a new run", () => {
		const service = createLlmPlayerService({
			playerId: "llm-player-1",
			selectedCrystalId: "crystal_core",
			initialSeed: "llm-seed-1",
			runId: "llm-run-1",
		});

		const board = service.viewBoard();
		const choices = service.viewChoices();
		const manifest = service.buildRunManifest();

		expect(board.width).toBe(3);
		expect(board.height).toBe(3);
		expect(board.units).toHaveLength(1);
		expect(board.units[0].isCore).toBe(true);
		expect(board.units[0].position).toEqual({ x: 1, y: 1 });
		expect(choices.phase).toBe("encounter");
		expect(choices.options.length).toBeGreaterThan(0);
		expect(manifest.actions).toEqual([]);
		expect(manifest.initialSeed).toBe("llm-seed-1");
	});

	it("updates the board without recording a replay action and snapshots the moved board on choice", () => {
		const service = createLlmPlayerService({
			playerId: "llm-player-2",
			selectedCrystalId: "crystal_core",
			initialSeed: "llm-seed-2",
			runId: "llm-run-2",
		});

		const core = service.viewBoard().units[0];
		service.arrangeBoard([{ unitId: core.unitId, x: 0, y: 2 }]);

		expect(service.viewBoard().units[0].position).toEqual({ x: 0, y: 2 });
		expect(service.buildRunManifest().actions).toHaveLength(0);

		const result = service.makeChoice(1);
		expect(result.manifest.actions).toHaveLength(1);
		expect(result.manifest.actions[0].teamSnapshot?.units[0].position).toEqual({ x: 0, y: 2 });
	});

	it("returns card details for shop choices after a non-special encounter", () => {
		const service = createLlmPlayerService({
			playerId: "llm-player-3",
			selectedCrystalId: "crystal_core",
			initialSeed: "llm-seed-3",
			runId: "llm-run-3",
		});

		const nonSpecialEncounter = service
			.viewChoices()
			.options.find(
				(option) =>
					!["upgrade_unit", "power_distributor", "power_absorber"].includes(option.id)
			);

		if (!nonSpecialEncounter) {
			throw new Error("Expected at least one non-special encounter option");
		}

		service.makeChoice(nonSpecialEncounter.id);

		const shopChoices = service.viewChoices();
		const shopOption = shopChoices.options[0];
		const cardDetails = service.viewCardDetails(shopOption.id);

		expect(shopChoices.phase).toBe("shop");
		expect(cardDetails.id).toBe(shopOption.id);
		expect(cardDetails.isCore).toBe(false);
		expect(cardDetails.cooldown).toBeGreaterThan(0);
	});

	it("rejects invalid board coordinates", () => {
		const service = createLlmPlayerService({
			playerId: "llm-player-4",
			selectedCrystalId: "crystal_core",
			initialSeed: "llm-seed-4",
			runId: "llm-run-4",
		});

		const core = service.viewBoard().units[0];

		expect(() => service.arrangeBoard([{ unitId: core.unitId, x: 3, y: 0 }])).toThrow(
			"outside the 3x3 board"
		);
	});

	it("rejects overlapping board arrangements once multiple units exist", () => {
		const service = createLlmPlayerService({
			playerId: "llm-player-5",
			selectedCrystalId: "crystal_core",
			initialSeed: "llm-seed-5",
			runId: "llm-run-5",
		});

		const nonSpecialEncounter = service
			.viewChoices()
			.options.find(
				(option) =>
					!["upgrade_unit", "power_distributor", "power_absorber"].includes(option.id)
			);

		if (!nonSpecialEncounter) {
			throw new Error("Expected at least one non-special encounter option");
		}

		service.makeChoice(nonSpecialEncounter.id);
		service.makeChoice(1);

		const units = service.viewBoard().units;
		expect(units).toHaveLength(2);

		expect(() =>
			service.arrangeBoard([
				{ unitId: units[0].unitId, x: 0, y: 0 },
				{ unitId: units[1].unitId, x: 0, y: 0 },
			])
		).toThrow("occupied by multiple units");
	});
});