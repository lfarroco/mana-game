import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { registerCollection } from "@Models/Entities/Card";
import { simulateCombat } from "@Core/Combat/CombatSimulation";
import type { SessionData } from "@Core/Types";
import type { State } from "@Models/State";

const mockRunCombat = jest.fn();
const mockCreateServerCombatEffects = jest.fn();

jest.mock("@Core/Combat/RunCombatCore", () => ({
	runCombat: (...args: unknown[]) => mockRunCombat(...args),
}));

jest.mock("@Core/Combat/ServerCombatEffects", () => ({
	createServerCombatEffects: (...args: unknown[]) => mockCreateServerCombatEffects(...args),
}));

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

beforeEach(() => {
	jest.clearAllMocks();

	mockCreateServerCombatEffects.mockReturnValue({
		logs: [],
		setFrame: jest.fn(),
	});

	mockRunCombat.mockImplementation((stateArg: unknown) => {
		const state = stateArg as State;
		let isActive = true;

		return {
			isActive: () => isActive,
			updateFrame: () => {
				const spectralKnight = state.battleData.units.find((unit) => unit.cardId === "spectral_knight");
				if (!spectralKnight) {
					throw new Error("Expected spectral_knight in battle data");
				}

				spectralKnight.power = 42;
				isActive = false;
			},
		};
	});
});

describe("simulateCombat", () => {
	it("keeps combat-only power changes out of the persisted team snapshot", () => {
		const session: SessionData = {
			id: "session-1",
			player_id: "player-1",
			phase: "combat",
			round: 1,
			step: 4,
			seed: "seed-1",
			initial_seed: "seed-1",
			current_options: {
				options: [],
				combatState: {
					enemyTeam: [],
					units: [],
					logs: [],
					seed: "seed-1",
				},
			},
			team: {
				units: [
					{
						id: "spectral-1",
						cardId: "spectral_knight",
						pic: "boss_gol",
						force: "PLAYER",
						position: { x: 0, y: 0 },
						rank: 3,
						power: 18,
						bonusPower: 0,
						life: 0,
						maxLife: 0,
						shield: 0,
						cooldown: 5600,
						evade: 0,
						effects: [],
						reactions: [],
						charge: 0,
						refresh: 0,
						hasted: 0,
						slowed: 0,
						isCore: false,
					},
				],
			},
			wins: 0,
			losses: 0,
			action_log: [],
		};

		const result = simulateCombat(session);
		const battleSpectralKnight = result.finalState.battleData.units.find(
			(unit) => unit.cardId === "spectral_knight"
		);
		const persistedSpectralKnight = result.finalState.session.team.units.find(
			(unit) => unit.cardId === "spectral_knight"
		);

		expect(battleSpectralKnight?.power).toBe(42);
		expect(persistedSpectralKnight?.power).toBe(18);
		expect(persistedSpectralKnight?.bonusPower).toBe(0);
	});
});
