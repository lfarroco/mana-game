import { BoardVec, boardVec } from '../../Models/Misc';
import { SQUAD_STATUS } from '../../Models/Squad';
import { makeUnit } from '../../Models/Unit';
import { State, initialState } from '../../Models/State';
import * as Combat from './Combat';
import { Operation } from '../../Models/Signals';

const alliedSquad1 = initialState().squads[0];

const enemySquad1 = {
	id: "enemy1",
	name: "test squad",
	force: "ENEMY",
	stamina: 100,
	morale: 100,
	position: boardVec(3, 1),
	status: SQUAD_STATUS.IDLE,
	path: [],
	leader: "enemy_unit1",
	members: ["enemy_unit1"]
}

const testState: State = {
	...initialState(),
	forces: [
		...initialState().forces,
		{
			id: "ENEMY",
			name: "test force",
			squads: ["enemy1", "enemy2"],
			color: "0x000000"
		}
	],
	squads: [
		...initialState().squads,
		enemySquad1,
	],
	units: [
		...initialState().units,
		{
			...makeUnit(),
			id: "enemy_unit1",
			name: "test unit",
			force: "ENEMY",
			squad: "enemy1",
		},
		{
			...makeUnit(),
			id: "enemy_unit2",
			name: "test unit",
			force: "ENEMY",
			squad: "enemy2",
		}
	],
	engagements: [
		{
			id: "1",
			startTick: 0,
			endTick: Infinity,
			sprite: (null as any),
			attacker: "s1",
			defender: "enemy1",
			log: [],
			finished: false
		}
	]
};


describe('Combat', () => {
	describe('process damage', () => {
		it('no squad is destroyed', () => {
			const ops = Combat.processCombat(testState)

			expect(ops).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { stamina: expect.any(Number) }])
			expect(ops).not.toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { stamina: 0 }])
			expect(ops).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { morale: expect.any(Number) }]);

			expect(ops).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { stamina: expect.any(Number) }])
			expect(ops).not.toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { stamina: 0 }])
			expect(ops).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { morale: expect.any(Number) }]);

		});

		it('attacker is destroyed (no stamina)', () => {
			const ops = Combat.processCombat({
				...testState,
				squads: [
					{
						...testState.squads[0],
						stamina: 1
					},
					enemySquad1
				]
			})

			expect(ops).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { stamina: 0 }])
			expect(ops).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('attacker is routed (no morale)', () => {
			const ops = Combat.processCombat({
				...testState,
				squads: [
					{
						...alliedSquad1,
						morale: 1
					},
					enemySquad1
				]
			})

			expect(ops).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { morale: 0 }])
			expect(ops).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { path: [] }])
			expect(ops).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('defender is destroyed (no stamina)', () => {
			const ops = Combat.processCombat({
				...testState,
				squads: [
					{
						...alliedSquad1,
						stamina: 1
					},
					enemySquad1,
				]
			})

			expect(ops).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { stamina: 0 }])
			expect(ops).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('defender is routed (no morale)', () => {
			const ops: Operation[] = Combat.processCombat({
				...testState,
				squads: [
					alliedSquad1,
					{
						...enemySquad1,
						morale: 1
					}
				]
			})

			expect(ops).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { morale: 0 }])
			expect(ops).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { status: "RETREATING" }])
			expect(ops).toContainEqual(["FINISH_ENGAGEMENT", "1"])
			expect(ops).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { path: expect.any(Array) }])

		});

		it('both are destroyed (no stamina)', () => {
			const ops = Combat.processCombat({
				...testState,
				squads: [
					{
						...alliedSquad1,
						stamina: 1
					},
					{
						...enemySquad1,
						stamina: 1
					}
				]
			})

			expect(ops).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { stamina: 0 }])
			expect(ops).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { stamina: 0 }])
			expect(ops).toContainEqual(["FINISH_ENGAGEMENT", "1"])
		});

		it('both are routed (no morale)', () => {
			const ps = Combat.processCombat({
				...testState,
				squads: [
					{
						...alliedSquad1,
						morale: 1
					},
					{
						...enemySquad1,
						morale: 1
					}
				]
			})

			expect(ps).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { morale: 0 }])
			expect(ps).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { status: "IDLE" }])
			expect(ps).toContainEqual(["UPDATE_SQUAD", alliedSquad1.id, { path: [] }])
			expect(ps).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { morale: 0 }])
			// NOTE: this is a feature identified in this test.
			// The defender should not retreat if the attacker is routed as well
			expect(ps).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { status: "IDLE" }])
			expect(ps).toContainEqual(["UPDATE_SQUAD", enemySquad1.id, { path: [] }])
			expect(ps).toContainEqual(["FINISH_ENGAGEMENT", "1"])
		});



	});

	describe("retreating", () => {
		it.todo("should destroy a routed squad if surrounded by enemies");
		it.todo("should retreat a routed squad if an empty cell is available");
		it.todo("should retreat a routed squad into a friendly cell if available");
		it.todo("moving into a cell with an retreating enemy unit triggers no combat");
	})

	describe("engagement start", () => {
		it.todo("if two enemies are in a target cell, start with the one with the most morale");
	})
});