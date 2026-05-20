import { describe, expect, it } from "@jest/globals";
import { distributePower } from "@TriggerSystem/effects/distributePower";
import { absorbPower } from "@TriggerSystem/effects/absorbPower";
import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { FORCE_ID_PLAYER } from "@Constants/constants";

const makeUnit = (overrides: Partial<Unit>): Unit => ({
	id: "unit-id",
	cardId: "missing-card",
	pic: "pic",
	force: FORCE_ID_PLAYER,
	position: { x: 0, y: 0 },
	rank: 1,
	power: 10,
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
	...overrides,
});

const createEnv = (sessionUnits: Unit[], battleUnits: Unit[]): CombatEnvironment => ({
	state: ({
		session: {
			team: { units: sessionUnits },
		},
		battleData: {
			units: battleUnits,
			forces: [],
			grid: [],
		},
		savedGames: [],
	} as unknown) as CombatEnvironment["state"],
	combatStates: {
		poisonSystemState: {},
		regenSystemState: {},
		combatStatsTrackerState: {},
		forceStatsState: {},
	} as CombatEnvironment["combatStates"],
	effects: {
		onUnitPop: () => {},
		onChargeBarUpdate: () => {},
		onCombatEnd: async () => {},
		getTimeScale: () => 1,
		getScene: () => null,
		updateLifeDisplay: () => {},
		updateShieldDisplay: () => {},
		updateRegenDisplay: () => {},
		updatePoisonDisplay: () => {},
		onIncreasePower: (_sourceId, _targetId, _amount, _permanent, onHit) => onHit(),
		onDecreasePower: (_sourceId, _targetId, _amount, _permanent, onHit) => onHit(),
		onPowerUpdate: () => {},
	},
	processReactions: () => {},
});

describe("combat-only power transfer effects", () => {
	it("distribute power keeps temporary combat loss out of session state", () => {
		const sessionSource = makeUnit({
			id: "source",
			power: 100,
			bonusPower: 20,
		});
		const battleSource = makeUnit({
			id: "source",
			power: 100,
			bonusPower: 20,
		});
		const battleTarget = makeUnit({
			id: "target",
			power: 40,
			bonusPower: 0,
			position: { x: 1, y: 0 },
		});

		const env = createEnv([sessionSource], [battleSource, battleTarget]);

		distributePower(env, battleSource, [battleTarget], false);

		expect(battleSource.power).toBe(50);
		expect(battleSource.bonusPower).toBe(20);
		expect(battleTarget.power).toBe(90);
		expect(battleTarget.bonusPower).toBe(0);
		expect(sessionSource.power).toBe(100);
		expect(sessionSource.bonusPower).toBe(20);
	});

	it("absorb power keeps temporary combat drain out of session state", () => {
		const sessionTarget = makeUnit({
			id: "target",
			power: 80,
			bonusPower: 10,
		});
		const battleSource = makeUnit({
			id: "source",
			power: 30,
			bonusPower: 0,
		});
		const battleTarget = makeUnit({
			id: "target",
			power: 80,
			bonusPower: 10,
			position: { x: 1, y: 0 },
		});

		const env = createEnv([sessionTarget], [battleSource, battleTarget]);

		absorbPower(env, battleSource, [battleTarget], false);

		expect(battleSource.power).toBe(50);
		expect(battleSource.bonusPower).toBe(0);
		expect(battleTarget.power).toBe(60);
		expect(battleTarget.bonusPower).toBe(10);
		expect(sessionTarget.power).toBe(80);
		expect(sessionTarget.bonusPower).toBe(10);
	});

	it("distribute power still syncs permanent transfers to session state", () => {
		const sessionSource = makeUnit({
			id: "source",
			power: 100,
			bonusPower: 20,
		});
		const battleSource = makeUnit({
			id: "source",
			power: 100,
			bonusPower: 20,
		});
		const battleTarget = makeUnit({
			id: "target",
			power: 40,
			bonusPower: 0,
			position: { x: 1, y: 0 },
		});

		const env = createEnv([sessionSource], [battleSource, battleTarget]);

		distributePower(env, battleSource, [battleTarget], true);

		expect(sessionSource.power).toBe(50);
		expect(sessionSource.bonusPower).toBe(-30);
	});
});
