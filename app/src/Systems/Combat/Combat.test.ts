import { boardVec } from '../../Models/Misc';
import { SQUAD_STATUS } from '../../Models/Squad';
import { makeUnit } from '../../Models/Unit';
import { State, initialState } from '../../Models/State';
import * as Combat from './Combat';

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

const enemySquad2 = {
	id: "enemy2",
	name: "test squad",
	force: "ENEMY",
	stamina: 100,
	morale: 100,
	position: boardVec(3, 2),
	status: SQUAD_STATUS.IDLE,
	path: [],
	leader: "enemy_unit2",
	members: ["enemy_unit2"]
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
		enemySquad2,
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
			const response = Combat.processCombat(testState)

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", alliedSquad1.id, expect.any(Number)]);
			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", alliedSquad1.id, expect.any(Number)]);
			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", enemySquad1.id, expect.any(Number)]);
			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", enemySquad1.id, expect.any(Number)]);

			response.forEach(([_event, _squadId, value]) => {
				expect(value).toBeGreaterThan(0);
				expect(value).toBeLessThan(100);
			});

		});

		it('attacker is destroyed (no stamina)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					{
						...testState.squads[0],
						stamina: 1
					},
					enemySquad1
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", alliedSquad1.id, 0])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('attacker is routed (no morale)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					{
						...alliedSquad1,
						morale: 1
					},
					enemySquad1
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", alliedSquad1.id, 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_PATH", alliedSquad1.id, []])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('defender is destroyed (no stamina)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					{
						...alliedSquad1,
						stamina: 1
					},
					enemySquad1,
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", alliedSquad1.id, 0])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('defender is routed (no morale)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					alliedSquad1,
					{
						...enemySquad1,
						morale: 1
					}
				]
			})

			console.log(response)

			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", enemySquad1.id, 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_STATUS", enemySquad1.id, "RETREATING"])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])

			const path = response.find(([event, squadId]) =>
				event === "UPDATE_SQUAD_PATH" && squadId === enemySquad1.id)

			expect(path![2]).toEqual(expect.any(Array));
			expect(path![2]).toHaveLength(1);

		});

		it('both are destroyed (no stamina)', () => {
			const response = Combat.processCombat({
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

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", alliedSquad1.id, 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", enemySquad1.id, 0])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])
		});

		it('both are routed (no morale)', () => {
			const response = Combat.processCombat({
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

			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", alliedSquad1.id, 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_PATH", alliedSquad1.id, []])
			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", enemySquad1.id, 0])
			// NOTE: this is a feature identified in this test.
			// The defender should not retreat if the attacker is routed as well
			expect(response).toContainEqual(["UPDATE_SQUAD_PATH", enemySquad1.id, []])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])
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