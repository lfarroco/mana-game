
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '../../Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '../../Scenes/Battleground/RunCombatCore';
import { dealDamageLogicIO } from './dealDamage';
import { registerCollection } from '../../Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '../../Data/BaseCollection';
import { Unit } from '../../Models/Entities/Unit';

// Mock i18n
jest.mock('../../i18n/i18n', () => ({
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

describe('Damage Effect Tests', () => {
	let state: any;
	let effects: any;
	let env: any;
	let sourceUnit: Unit;
	let targetUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];
		targetUnit = state.battleData.units[1]; // Enemy

		sourceUnit.power = 10;
		targetUnit.life = 100;
		targetUnit.maxLife = 100;
		targetUnit.shield = 0;
	});

	it('should deal correct damage to target', () => {
		const initialLife = targetUnit.life;
		sourceUnit.power = 20;

		dealDamageLogicIO(env, sourceUnit);

		const core = state.battleData.units.find((u: Unit) => u.force === targetUnit.force && u.isCore);
		const damageLog = effects.logs.find((l: any) => l.type === 'damage');

		expect(damageLog).toBeDefined();
		expect(damageLog.amount).toBe(20);
		expect(core.life).toBe(initialLife - 20);
	});

	it('should be absorbed by shield', () => {
		sourceUnit.power = 20;
		targetUnit.shield = 15;
		const initialLife = targetUnit.life;

		dealDamageLogicIO(env, sourceUnit);

		expect(targetUnit.shield).toBe(0);
		expect(targetUnit.life).toBe(initialLife - 5);
	});
});
