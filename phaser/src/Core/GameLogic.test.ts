import * as GameLogic from "@Core/GameLogic";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import type { Unit } from "@Models/Entities/Unit";

// Polyfill structuredClone for Jest environment
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

describe("createInitialSession", () => {
	it("generates a random seed when none provided", () => {
		const s1 = GameLogic.createInitialSession("p1", "crystal_core");
		// seed is always defined and equals initial_seed
		expect(s1.seed).toBeDefined();
		expect(s1.seed).toBe(s1.initial_seed);
	});

	it("uses the provided explicit seed verbatim", () => {
		const explicitSeed = "test_seed_42";
		const session = GameLogic.createInitialSession("p1", "crystal_core", explicitSeed);
		expect(session.seed).toBe(explicitSeed);
		expect(session.initial_seed).toBe(explicitSeed);
	});

	it("two sessions with the same explicit seed produce identical initial state", () => {
		const seed = "deterministic_seed";
		const s1 = GameLogic.createInitialSession("p1", "crystal_core", seed);
		const s2 = GameLogic.createInitialSession("p1", "crystal_core", seed);

		// Encounter options are derived from the seed, so they must be identical
		expect(s1.current_options).toEqual(s2.current_options);
		expect(s1.seed).toBe(s2.seed);
		expect(s1.initial_seed).toBe(s2.initial_seed);
	});
});

describe("transitionToNextState - combat enemy selection", () => {
	it("uses provided combatEnemyTeam when supplied", () => {
		const session = GameLogic.createInitialSession("p1", "crystal_core", "seed-match-1");
		const generated = GameLogic.generateEnemyTeamForRound(1, 0);
		const customEnemyTeam: Unit[] = generated.map((unit, index) => ({
			...unit,
			id: `custom-enemy-${index}`,
			force: "CPU",
		}));

		const { session: next } = GameLogic.transitionToNextState(
			{
				...session,
				phase: "encounter",
				current_options: { options: [{ id: "combat_encounter" }] },
			},
			"combat_encounter",
			undefined,
			{ combatEnemyTeam: customEnemyTeam }
		);

		expect(next.phase).toBe("combat");
		const combatState = (next.current_options as { combatState?: { enemyTeam?: Unit[] } })
			?.combatState;
		expect(combatState?.enemyTeam?.[0]?.id).toBe("custom-enemy-0");
		expect(combatState?.enemyTeam).toHaveLength(customEnemyTeam.length);
	});

	it("generates a PvE enemy team when no override is provided", () => {
		const session = GameLogic.createInitialSession("p1", "crystal_core", "seed-match-2");

		const { session: next } = GameLogic.transitionToNextState(
			{
				...session,
				phase: "encounter",
				current_options: { options: [{ id: "combat_encounter" }] },
			},
			"combat_encounter"
		);

		expect(next.phase).toBe("combat");
		const combatState = (next.current_options as { combatState?: { enemyTeam?: Unit[] } })
			?.combatState;
		expect(Array.isArray(combatState?.enemyTeam)).toBe(true);
		expect((combatState?.enemyTeam?.length ?? 0) > 0).toBe(true);
	});
});

describe("pure session helpers", () => {
	it("pickOption supports pipeline-style state transitions without mutating the source session", () => {
		const initialState = GameLogic.createInitialSession("p1", "crystal_core", "pipeline-seed-1");
		const initialOptions = GameLogic.getCurrentOptions(initialState);

		const firstStep = GameLogic.pickOption(initialState, 1);
		const secondStep = GameLogic.pickOption(firstStep, 1);

		expect(initialOptions.length).toBeGreaterThan(0);
		expect(initialState.action_log).toHaveLength(0);
		expect(firstStep.action_log).toHaveLength(1);
		expect(firstStep.action_log[0].actionId).toBe(initialOptions[0].id);
		expect(secondStep.action_log).toHaveLength(2);
	});

	it("pickRandomOptionsUntilGameOver is deterministic for the same initial seed", () => {
		const seed = "pipeline-seed-random-1";
		const initialStateA = GameLogic.createInitialSession("p1", "crystal_core", seed);
		const initialStateB = GameLogic.createInitialSession("p1", "crystal_core", seed);

		const finalStateA = GameLogic.pickRandomOptionsUntilGameOver(initialStateA, { maxActions: 12 });
		const finalStateB = GameLogic.pickRandomOptionsUntilGameOver(initialStateB, { maxActions: 12 });

		expect(GameLogic.buildReplaySnapshot(finalStateA)).toEqual(
			GameLogic.buildReplaySnapshot(finalStateB)
		);
		expect(initialStateA.action_log).toHaveLength(0);
		expect(finalStateA.action_log.length).toBeGreaterThan(0);
	});
});
