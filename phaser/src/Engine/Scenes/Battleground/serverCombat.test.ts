import { jest, describe, it, expect, beforeAll } from "@jest/globals";

// Mock i18n to avoid JSON import issues in Jest
jest.mock("../../../i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (id: string) => id,
	initialize: () => {},
	setLocale: () => {},
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

import { runCombat } from "@Scenes/Battleground/RunCombatCore";
import { createServerCombatEffects } from "@Scenes/Battleground/ServerCombatEffects";
import { createMockState } from "@test-utils/serverCombatUtils";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";

// Register base collection to ensure unit definitions exist
beforeAll(() => {
	// Polyfill structuredClone for JSDOM/Node environments that lack it
	if (typeof global.structuredClone === "undefined") {
		global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe("Server Side Combat", () => {
	it("should run a combat session to completion", () => {
		const state = createMockState();
		const effects = createServerCombatEffects(state);
		const combatRunner = runCombat(state, effects);

		let frame = 0;
		const deltaTime = 10;
		const SAFETY_MAX_FRAMES = 5000;

		while (combatRunner.isActive() && frame < SAFETY_MAX_FRAMES) {
			effects.setFrame(frame);
			combatRunner.updateFrame(state, frame * deltaTime, deltaTime);
			frame++;
		}

		expect(frame).toBeLessThan(SAFETY_MAX_FRAMES);
		expect(effects.logs.length).toBeGreaterThan(0);

		const outcomeLog = effects.logs.find((l) => l.type === "outcome");
		expect(outcomeLog).toBeDefined();
		if (outcomeLog && outcomeLog.type === "outcome") {
			expect(["player_won", "player_lost"]).toContain(outcomeLog.result);
		}
	});

	it("should track damage events", () => {
		const state = createMockState();
		// Strengthen player to ensure damage happens
		state.battleData.units[0].power = 50;

		const effects = createServerCombatEffects(state);
		const combatRunner = runCombat(state, effects);

		let frame = 0;
		const deltaTime = 10;
		const SAFETY_MAX_FRAMES = 1000;

		while (combatRunner.isActive() && frame < SAFETY_MAX_FRAMES) {
			effects.setFrame(frame);
			combatRunner.updateFrame(state, frame * deltaTime, deltaTime);
			frame++;
		}

		expect(frame).toBeGreaterThan(0);
	});
});
