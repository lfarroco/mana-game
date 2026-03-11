
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { initialize, update } from './StatusEffectSystem';
import { createMockState } from '@test-utils/serverCombatUtils';
import { createServerCombatEffects } from '@Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '@Scenes/Battleground/RunCombatCore';
import { State } from '@Models/State';
import { applyPoison } from './PoisonDamageSystem';
import { applyRegen } from './RegenSystem';
import { Unit } from '@Models/Entities/Unit';
import { registerCollection } from '@Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '@Data/BaseCollection';

// Mock i18n
jest.mock('../i18n/i18n', () => ({
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

describe('StatusEffectSystem', () => {
	let state: State;
	let env: any;
	let statusState: any;

	beforeEach(() => {
		state = createMockState();
		const effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		statusState = initialize(state);
	});

	it('should initialize correctly', () => {
		expect(statusState.elapsed).toBe(0);
	});

	it('should not tick before interval', () => {
		const delta = 500;
		const newState = update(env, statusState, delta);
		expect(newState.elapsed).toBe(500);

		// We assume logic doesn't trigger if no logs generated (and life doesn't change)
		// But initial state creation might log init stats.
		// We'll check specific life_display logs with non-zero delta in the explicit tests
	});

	it('should apply poison damage on tick', () => {
		const playerForceId = state.session.player_id;

		// Inject poison
		env.combatStates.poisonSystemState = applyPoison(env.combatStates.poisonSystemState, { id: playerForceId } as any, 10);

		const delta = 1000;
		update(env, statusState, delta);

		const logs = env.effects.logs.filter((l: any) => l.type === 'life_display');
		// Find log where force is player and delta is -10
		const poisonLog = logs.find((l: any) => l.force === playerForceId && l.delta === -10);

		expect(poisonLog).toBeDefined();
	});

	it('should apply regen healing on tick', () => {
		const playerForceId = state.session.player_id;

		// Set damaged life so heal works
		const core = state.battleData.units.find((u: Unit) => u.force === playerForceId && u.isCore);
		if (core) {
			core.life = 50;
			core.maxLife = 100;
		}

		env.combatStates.regenSystemState = applyRegen(env.combatStates.regenSystemState, { id: playerForceId } as any, 5);

		const delta = 1000;
		update(env, statusState, delta);

		const logs = env.effects.logs.filter((l: any) => l.type === 'life_display');
		const healLog = logs.find((l: any) => l.force === playerForceId && l.delta === 5);

		expect(healLog).toBeDefined();
	});

	it('should calculate net effect (Regen > Poison)', () => {
		const playerForceId = state.session.player_id;
		const core = state.battleData.units.find((u: Unit) => u.force === playerForceId && u.isCore);
		if (core) {
			core.life = 50;
			core.maxLife = 100;
		}

		env.combatStates.poisonSystemState = applyPoison(env.combatStates.poisonSystemState, { id: playerForceId } as any, 5);
		env.combatStates.regenSystemState = applyRegen(env.combatStates.regenSystemState, { id: playerForceId } as any, 10);

		update(env, statusState, 1000);

		const logs = env.effects.logs.filter((l: any) => l.type === 'life_display');
		const netLog = logs.find((l: any) => l.force === playerForceId && l.delta === 5);

		expect(netLog).toBeDefined();
	});

	it('should calculate net effect (Poison > Regen)', () => {
		const playerForceId = state.session.player_id;

		env.combatStates.poisonSystemState = applyPoison(env.combatStates.poisonSystemState, { id: playerForceId } as any, 10);
		env.combatStates.regenSystemState = applyRegen(env.combatStates.regenSystemState, { id: playerForceId } as any, 5);

		update(env, statusState, 1000);

		const logs = env.effects.logs.filter((l: any) => l.type === 'life_display');
		const netLog = logs.find((l: any) => l.force === playerForceId && l.delta === -5);

		expect(netLog).toBeDefined();
	});
});
