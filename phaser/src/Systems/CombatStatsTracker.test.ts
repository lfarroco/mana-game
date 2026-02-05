
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { trackDamage } from './CombatStatsTracker';
import { createMockState } from '@test-utils/serverCombatUtils';
import { createServerCombatEffects } from '@Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '@Scenes/Battleground/RunCombatCore';
import { State } from '@Models/State';
import { registerCollection } from '@Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '@Data/BaseCollection';
import { Unit } from '@Models/Entities/Unit';

jest.mock('../../../i18n/i18n', () => ({
	t: (key: string) => key,
	getName: (id: string) => id,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => 'en',
	getAvailableLocales: () => ['en'],
	getNativeName: () => 'English'
}));

beforeAll(() => {
	if (typeof global.structuredClone === 'undefined') {
		global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe('CombatStatsTracker', () => {
	let state: State;
	let env: any;
	let trackerState: any;
	let sourceUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		const effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();
		trackerState = env.combatStates.combatStatsTrackerState;
		sourceUnit = state.battleData.units[0];

		// Spy on processReactions
		env.processReactions = jest.fn();
	});

	it('should track damage and update stats', () => {
		trackDamage(trackerState, env, sourceUnit.id, 50);

		const unitStats = trackerState.unitStats.get(sourceUnit.id);
		expect(unitStats.damageDealt).toBe(50);

		const forceStats = trackerState.currentCombatStats.get(sourceUnit.force);
		expect(forceStats.damageDealt).toBe(50);
	});

	it('should trigger reaction on threshold', () => {
		// Threshold for damage is 100
		trackDamage(trackerState, env, sourceUnit.id, 100);

		expect(env.processReactions).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: sourceUnit.id }),
			{ id: "every_100_damage" },
			1 // diff
		);
	});

	it('should trigger multiple times if threshold crossed multiple times', () => {
		// 250 damage -> 2 thresholds (100, 200)
		trackDamage(trackerState, env, sourceUnit.id, 250);

		expect(env.processReactions).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			{ id: "every_100_damage" },
			2
		);
	});

	it('should aggregate stats from multiple units for force threshold', () => {
		// Initial: 50. No trigger.
		trackDamage(trackerState, env, sourceUnit.id, 50);
		expect(env.processReactions).not.toHaveBeenCalled();

		// Add 50 more (Total 100). Trigger.
		trackDamage(trackerState, env, sourceUnit.id, 50);

		expect(env.processReactions).toHaveBeenCalledTimes(1);
	});
});
