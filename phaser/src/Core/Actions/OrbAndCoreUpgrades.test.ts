import { describe, expect, it } from "@jest/globals";
import { applyOrb } from "@Core/Actions/OrbAndCoreUpgrades";
import { resetUnitStats, Unit } from "@Models/Entities/Unit";

const makeUnit = (overrides: Partial<Unit>): Unit => ({
	id: "unit-id",
	cardId: "missing-card",
	pic: "pic",
	force: "PLAYER",
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

describe("OrbAndCoreUpgrades power transfer orbs", () => {
	it("keeps permanent distribute power losses in sync with bonusPower", () => {
		const sourceUnit = makeUnit({
			id: "source-unit",
			position: { x: 1, y: 0 },
			rank: 2,
			power: 30,
			bonusPower: 10,
		});
		const allyUnit = makeUnit({
			id: "ally-unit",
			position: { x: 0, y: 0 },
			power: 15,
			bonusPower: 5,
		});

		applyOrb([sourceUnit, allyUnit], sourceUnit.id, "distribute_power_orb");

		expect(sourceUnit.power).toBe(15);
		expect(sourceUnit.bonusPower).toBe(-5);
		expect(allyUnit.power).toBe(30);
		expect(allyUnit.bonusPower).toBe(20);

		resetUnitStats(sourceUnit);
		resetUnitStats(allyUnit);

		expect(sourceUnit.power).toBe(15);
		expect(allyUnit.power).toBe(30);
	});

	it("keeps permanent absorb power drains in sync with bonusPower", () => {
		const sourceUnit = makeUnit({
			id: "source-unit",
			position: { x: 1, y: 0 },
			power: 40,
			bonusPower: 30,
		});
		const allyUnit = makeUnit({
			id: "ally-unit",
			position: { x: 0, y: 0 },
			rank: 4,
			power: 50,
			bonusPower: 10,
		});

		applyOrb([sourceUnit, allyUnit], sourceUnit.id, "absorb_power_orb");

		expect(sourceUnit.power).toBe(52);
		expect(sourceUnit.bonusPower).toBe(42);
		expect(allyUnit.power).toBe(38);
		expect(allyUnit.bonusPower).toBe(-2);

		resetUnitStats(sourceUnit);
		resetUnitStats(allyUnit);

		expect(sourceUnit.power).toBe(52);
		expect(allyUnit.power).toBe(38);
	});
});
