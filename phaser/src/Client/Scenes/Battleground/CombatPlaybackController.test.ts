import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { CombatEffects } from "@Core/Combat/CombatTypes";
import type { CombatLogEntry } from "@Core/Combat/ServerCombatEffects";
import type { State } from "@Models/State";
import { createCombatPlaybackController } from "Client/Scenes/Battleground/CombatPlaybackController";

jest.mock("@Systems/CombatStatsTracker", () => ({
	initialize: jest.fn(() => ({})),
}));

jest.mock("@Systems/PoisonDamageSystem", () => ({
	initializePoisonSystem: jest.fn(() => ({})),
}));

jest.mock("@Systems/RegenSystem", () => ({
	initializeRegenSystem: jest.fn(() => ({})),
}));

jest.mock("@Systems/CombatSystemStates", () => ({
	setCombatSystemStates: jest.fn(),
}));

jest.mock("@Core/Combat/ForceStatsState", () => ({
	initializeForceStatsState: jest.fn(() => ({})),
}));

const createState = (): State =>
	({
		savedGames: [],
		session: {
			id: "session-1",
			player_id: "player-1",
			phase: "combat",
			round: 1,
			step: 4,
			seed: "seed-1",
			initial_seed: "seed-1",
			current_options: null,
			team: { units: [] },
			wins: 0,
			losses: 0,
			action_log: [],
		},
		battleData: {
			forces: [],
			grid: [],
			units: [
				{
					id: "drained-unit",
					cardId: "target",
					pic: "target.png",
					force: "PLAYER",
					position: { x: 0, y: 0 },
					rank: 1,
					power: 24,
					bonusPower: 0,
					life: 100,
					maxLife: 100,
					shield: 0,
					cooldown: 1000,
					evade: 0,
					effects: [],
					reactions: [],
					charge: 0,
					refresh: 0,
					hasted: 0,
					slowed: 0,
					isCore: false,
				},
				{
					id: "absorber-unit",
					cardId: "spectral_knight",
					pic: "absorber.png",
					force: "PLAYER",
					position: { x: 1, y: 0 },
					rank: 3,
					power: 18,
					bonusPower: 0,
					life: 100,
					maxLife: 100,
					shield: 0,
					cooldown: 1000,
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
	}) as State;

const createEffects = (): CombatEffects => ({
	onUnitPop: () => { },
	onChargeBarUpdate: () => { },
	onCombatEnd: async () => { },
	getTimeScale: () => 1,
	getScene: () => null,
	updateLifeDisplay: () => { },
	updateShieldDisplay: () => { },
	updateRegenDisplay: () => { },
	updatePoisonDisplay: () => { },
	onDecreasePower: (_sourceId, _targetId, _amount, _permanent, onHit) => {
		onHit();
	},
});

describe("CombatPlaybackController", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("applies absorb-power drain to the affected unit while keeping projectile destination unchanged", () => {
		const state = createState();
		const log: CombatLogEntry = {
			type: "decrease_power",
			frame: 0,
			duration: 0,
			sourceId: "drained-unit",
			targetId: "absorber-unit",
			affectedUnitId: "drained-unit",
			amount: 6,
			permanent: false,
		};

		const controller = createCombatPlaybackController(state, [log], createEffects());

		controller.updateFrame(state, 0, 16.67);

		expect(state.battleData.units.find((unit) => unit.id === "drained-unit")?.power).toBe(18);
		expect(state.battleData.units.find((unit) => unit.id === "absorber-unit")?.power).toBe(18);
	});
});
