import { State, initialState } from '../../Models/State';
import * as Combat from './Combat';

const testState: State = {
	...initialState(),
	engagements: [
		{
			id: "1",
			startTick: 0,
			endTick: Infinity,
			sprite: (null as any),
			attacker: "s1",
			defender: "s2",
			log: [],
			finished: false
		}
	]
};


describe('Combat', () => {
	describe('process damage', () => {
		it('no squad is destroyed', () => {
			const response = Combat.processCombat(testState)

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", "s1", expect.any(Number)]);
			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", "s1", expect.any(Number)]);
			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", "s2", expect.any(Number)]);
			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", "s2", expect.any(Number)]);
			expect(response.length).toBe(4)

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
					testState.squads[1]
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", "s1", 0])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('attacker is routed (no morale)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					{
						...testState.squads[0],
						morale: 1
					},
					testState.squads[1]
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", "s1", 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_PATH", "s1", []])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('defender is destroyed (no stamina)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					testState.squads[0],
					{
						...testState.squads[1],
						stamina: 1
					}
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", "s2", 0])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])

		});

		it('defender is routed (no morale)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					testState.squads[0],
					{
						...testState.squads[1],
						morale: 1
					}
				]
			})

			console.log(response)

			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", "s2", 0])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])
			expect(response).toContainEqual(["UPDATE_SQUAD_STATUS", "s2", "RETREATING"])

			const path = response.find(([event, squadId]) => event === "UPDATE_SQUAD_PATH" && squadId === "s2")

			expect(path![2]).toEqual(expect.any(Array));
			expect(path![2]).toHaveLength(1);

		});

		it('both are destroyed (no stamina)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					{
						...testState.squads[0],
						stamina: 1
					},
					{
						...testState.squads[1],
						stamina: 1
					}
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", "s1", 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_STAMINA", "s2", 0])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])
		});

		it('both are routed (no morale)', () => {
			const response = Combat.processCombat({
				...testState,
				squads: [
					{
						...testState.squads[0],
						morale: 1
					},
					{
						...testState.squads[1],
						morale: 1
					}
				]
			})

			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", "s1", 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_MORALE", "s2", 0])
			expect(response).toContainEqual(["UPDATE_SQUAD_PATH", "s1", []])
			// NOTE: this is a feature identified in this test.
			// The defender should not retreat if the attacker is routed as well
			expect(response).toContainEqual(["UPDATE_SQUAD_PATH", "s2", []])
			expect(response).toContainEqual(["FINISH_ENGAGEMENT", "1"])
		});



	});

	describe("retreating", () => {
		it.todo("should destroy a routed squad if surrounded by enemies");
		it.todo("should retreat a routed squad if an empty cell is available");
		it.todo("should retreat a routed squad into a friendly cell if available");
		it.todo("moving into a cell with an retreating enemy unit triggers no combat");
	})
});