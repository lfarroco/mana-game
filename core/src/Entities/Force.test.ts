/// <reference types="jest" />

import * as Force from "../Entities/Force";
import * as Models from "../Models";

function makeCore(force: string, life: number, shield = 0): Models.Unit {
	return {
		id: `core-${force}`,
		cardId: "test-core",
		pic: "test",
		force,
		position: [1, 1],
		power: 10,
		cooldown: 1000,
		evade: 0,
		rank: 1,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore: true,
		life,
		maxLife: life,
		critical: 0,
		shield,
		bonusPower: 0,
	};
}

function makeCombatState(units: Models.Unit[]): Models.CombatState {
	const unitById = new Map(units.map((u) => [u.id, u]));
	const playerCore = units.find((u) => u.force === "PLAYER" && u.isCore)!;
	const cpuCore = units.find((u) => u.force === "CPU" && u.isCore)!;
	return {
		units,
		logs: [],
		enemyPlayerName: "CPU",
		wonCombat: false,
		finalPlayerUnits: [],
		initialUnits: [],
		unitById,
		playerCore,
		cpuCore,
		playerUnits: units.filter((u) => u.force === "PLAYER"),
		cpuUnits: units.filter((u) => u.force === "CPU"),
	};
}

describe("Force", () => {
	describe("makeForce", () => {
		it("creates a force with given id and default values", () => {
			const f = Force.makeForce("PLAYER");
			expect(f.id).toBe("PLAYER");
			expect(f.units).toEqual([]);
			expect(f.lives).toBe(4);
			expect(f.wins).toBe(0);
			expect(f.losses).toBe(0);
		});
	});

	describe("manipulateCoreLife", () => {
		it("increases core life", () => {
			const core = makeCore("PLAYER", 100, 0);
			core.life = 80;
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreLife(state, "PLAYER", 20);
			expect(core.life).toBe(100);
			expect(change).toBe(20);
		});

		it("caps life at maxLife on heal", () => {
			const core = makeCore("PLAYER", 100, 0);
			core.life = 95;
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreLife(state, "PLAYER", 50);
			expect(core.life).toBe(100);
			expect(change).toBe(5);
		});

		it("decreases core life", () => {
			const core = makeCore("PLAYER", 100, 0);
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreLife(state, "PLAYER", -30);
			expect(core.life).toBe(70);
			expect(change).toBe(-30);
		});

		it("clamps life at 0 when damage exceeds life", () => {
			const core = makeCore("PLAYER", 50, 0);
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreLife(state, "PLAYER", -100);
			expect(core.life).toBe(0);
			expect(change).toBe(-50);
		});

		it("returns 0 when core is already dead", () => {
			const core = makeCore("PLAYER", 0, 0);
			core.life = 0;
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreLife(state, "PLAYER", -10);
			expect(change).toBe(0);
		});

		});

	describe("manipulateCoreShield", () => {
		it("increases core shield", () => {
			const core = makeCore("PLAYER", 100, 0);
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreShield(state, "PLAYER", 30, false);
			expect(core.shield).toBe(30);
			expect(change).toBe(30);
		});

		it("decreases core shield", () => {
			const core = makeCore("PLAYER", 100, 50);
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreShield(state, "PLAYER", -20, false);
			expect(core.shield).toBe(30);
			expect(change).toBe(-20);
		});

		it("clamps shield at 0", () => {
			const core = makeCore("PLAYER", 100, 10);
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreShield(state, "PLAYER", -50, false);
			expect(core.shield).toBe(0);
			expect(change).toBe(-10);
		});

		it("cannot grant shield to dead core", () => {
			const core = makeCore("PLAYER", 0, 0);
			core.life = 0;
			const state = makeCombatState([core]);
			const change = Force.manipulateCoreShield(state, "PLAYER", 30, false);
			expect(change).toBe(0);
		});
	});

	describe("applyDamageToForce", () => {
		it("returns 0 for zero or negative damage", () => {
			const playerCore = makeCore("PLAYER", 100, 0);
			const cpuCore = makeCore("CPU", 100, 0);
			const state = makeCombatState([playerCore, cpuCore]);
			expect(Force.applyDamageToForce(state, "PLAYER", 0)).toBe(0);
			expect(Force.applyDamageToForce(state, "PLAYER", -5)).toBe(0);
		});

		it("returns 0 when core is already dead", () => {
			const playerCore = makeCore("PLAYER", 0, 0);
			playerCore.life = 0;
			const state = makeCombatState([playerCore]);
			expect(Force.applyDamageToForce(state, "PLAYER", 50)).toBe(0);
		});

		it("poison damage bypasses shield entirely", () => {
			const playerCore = makeCore("PLAYER", 100, 30);
			const state = makeCombatState([playerCore]);
			const damageDone = Force.applyDamageToForce(state, "PLAYER", 20, 0, "poison");
			expect(damageDone).toBe(20);
			expect(playerCore.life).toBe(80);
			expect(playerCore.shield).toBe(30);
		});

		it("normal damage absorbs shield first then life", () => {
			const playerCore = makeCore("PLAYER", 100, 30);
			const state = makeCombatState([playerCore]);
			const damageDone = Force.applyDamageToForce(state, "PLAYER", 50, 0, "normal");
			expect(playerCore.shield).toBe(0);
			expect(playerCore.life).toBe(80);
			expect(damageDone).toBe(20);
		});

		it("damage only to shield when shield >= damage", () => {
			const playerCore = makeCore("PLAYER", 100, 50);
			const state = makeCombatState([playerCore]);
			const damageDone = Force.applyDamageToForce(state, "PLAYER", 10, 0, "normal");
			expect(playerCore.shield).toBe(40);
			expect(playerCore.life).toBe(100);
			expect(damageDone).toBe(0);
		});

		it("shield piercing lets some damage through", () => {
			const playerCore = makeCore("PLAYER", 100, 100);
			const state = makeCombatState([playerCore]);
			// 50% pierce on 100 shield: piercedShield=50, effectiveShield=50
			// 100 damage minus 50 effective shield = 50 to life
			const damageDone = Force.applyDamageToForce(state, "PLAYER", 100, 50, "normal");
			expect(playerCore.life).toBeLessThan(100);
			expect(damageDone).toBeGreaterThan(0);
		});
	});

	describe("getUnitForce", () => {
		it("returns force id of unit", () => {
			const u = makeCore("PLAYER", 100);
			const state = makeCombatState([u]);
			expect(Force.getUnitForce(state, u.id)).toBe("PLAYER");
		});
	});

	describe("getEnemyForce", () => {
		it("returns opposing force id", () => {
			const pc = makeCore("PLAYER", 100);
			const cc = makeCore("CPU", 100);
			const state = makeCombatState([pc, cc]);
			expect(Force.getEnemyForce(state, pc.id)).toBe("CPU");
			expect(Force.getEnemyForce(state, cc.id)).toBe("PLAYER");
		});
	});

});

