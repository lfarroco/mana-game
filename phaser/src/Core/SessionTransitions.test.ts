import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { registerCollection } from "@Models/Entities/Card";
import { createInitialSession } from "@Core/SessionManagement";
import { transitionToNextState } from "@Core/SessionTransitions";
import type { SessionData } from "@Core/Types";

const mockSimulateCombat = jest.fn();
const mockDetermineCombatOutcome = jest.fn();

jest.mock("@Core/Combat/CombatSimulation", () => ({
	simulateCombat: (...args: unknown[]) => mockSimulateCombat(...args),
	determineCombatOutcome: (...args: unknown[]) => mockDetermineCombatOutcome(...args),
}));

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

beforeEach(() => {
	jest.clearAllMocks();

	mockSimulateCombat.mockImplementation((sessionArg: SessionData, enemyTeam: SessionData["team"]["units"]) => ({
		initialUnits: JSON.parse(JSON.stringify(sessionArg.team.units)),
		logs: [],
		finalState: {
			session: {
				...sessionArg,
				runStats: {
					...(sessionArg.runStats ?? {
						damageDealt: 0,
						poisonDealt: 0,
						shieldDealt: 0,
						regenDealt: 0,
						healDealt: 0,
						mostPowerfulUnit: null,
						totalUnitsRecruited: 0,
						unitUsage: {},
					}),
				},
				team: {
					units: JSON.parse(JSON.stringify(sessionArg.team.units)),
				},
			},
			battleData: {
				units: [
					...JSON.parse(JSON.stringify(sessionArg.team.units)),
					...JSON.parse(JSON.stringify(enemyTeam)),
				],
			},
		},
	}));
});

describe("transitionToNextState", () => {
	it("advances encounter and shop with the generic skip action", () => {
		const encounterSession = createInitialSession("p1", "crystal_core", "test-generic-skip");

		const shopSession = transitionToNextState(encounterSession, "skip").session;
		const shopSkipAction = shopSession.action_log[shopSession.action_log.length - 1];

		expect(shopSession.phase).toBe("shop");
		expect(shopSession.current_options.length).toBeGreaterThan(0);
		expect(shopSkipAction?.actionId).toBe("skip");

		const nextEncounterSession = transitionToNextState(shopSession, "skip").session;
		const nextSkipAction = nextEncounterSession.action_log[nextEncounterSession.action_log.length - 1];

		expect(nextEncounterSession.phase).toBe("encounter");
		expect(nextEncounterSession.step).toBe(shopSession.step + 1);
		expect(nextSkipAction?.actionId).toBe("skip");
	});

	it("defers combat losses until the continuation session", () => {
		mockDetermineCombatOutcome.mockReturnValue({ won: false });

		const session = createInitialSession("p1", "crystal_core", "test-combat-loss");
		session.phase = "encounter";
		session.step = 4;
		session.current_options = [{ id: "combat_encounter" }];

		const enemyTeam = [
			{
				id: "enemy-core",
				cardId: "critical_crystal",
				pic: "red-stone",
				force: "CPU",
				position: { x: 1, y: 1 },
				rank: 1,
				power: 10,
				bonusPower: 0,
				life: 100,
				maxLife: 100,
				shield: 0,
				cooldown: 5200,
				evade: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: true,
			},
		];

		const result = transitionToNextState(session, "combat_encounter", undefined, {
			combatEnemyTeam: enemyTeam,
		});

		expect(result.session.phase).toBe("combat");
		expect(result.session.wins).toBe(0);
		expect(result.session.losses).toBe(0);
		expect(result.session.combatState?.nextSession?.phase).toBe("upgrade_core");
		expect(result.session.combatState?.nextSession?.wins).toBe(0);
		expect(result.session.combatState?.nextSession?.losses).toBe(1);
	});

	it("routes the 10th win through the post-combat victory phase", () => {
		mockDetermineCombatOutcome.mockReturnValue({ won: true });

		const session = createInitialSession("p1", "crystal_core", "test-combat-victory-threshold");
		session.phase = "encounter";
		session.step = 4;
		session.wins = 9;
		session.current_options = [{ id: "combat_encounter" }];

		const result = transitionToNextState(session, "combat_encounter", undefined, {
			combatEnemyTeam: [],
		});

		expect(result.session.phase).toBe("combat");
		expect(result.session.wins).toBe(9);
		expect(result.session.combatState?.nextSession?.phase).toBe("victory");
		expect(result.session.combatState?.nextSession?.wins).toBe(10);
		expect(result.session.combatState?.nextSession?.losses).toBe(0);
	});

	it("routes the 4th loss through the post-combat game-over phase", () => {
		mockDetermineCombatOutcome.mockReturnValue({ won: false });

		const session = createInitialSession("p1", "crystal_core", "test-combat-game-over-threshold");
		session.phase = "encounter";
		session.step = 4;
		session.losses = 3;
		session.current_options = [{ id: "combat_encounter" }];

		const result = transitionToNextState(session, "combat_encounter", undefined, {
			combatEnemyTeam: [],
		});

		expect(result.session.phase).toBe("combat");
		expect(result.session.losses).toBe(3);
		expect(result.session.combatState?.nextSession?.phase).toBe("game_over");
		expect(result.session.combatState?.nextSession?.wins).toBe(0);
		expect(result.session.combatState?.nextSession?.losses).toBe(4);
	});
});