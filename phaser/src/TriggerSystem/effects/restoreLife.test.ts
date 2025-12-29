
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '../../Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '../../Scenes/Battleground/RunCombatCore';
import { restoreLife } from './restoreLife';
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

describe('Heal Effect Tests', () => {
	let state: any;
	let effects: any;
	let env: any;
	let sourceUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];

		sourceUnit.power = 10;
		sourceUnit.maxLife = 100;
		sourceUnit.life = 50;
	});

	it('should restore life to ally', async () => {
		sourceUnit.life = 50;
		sourceUnit.maxLife = 100;
		sourceUnit.power = 30;

		await restoreLife(env, sourceUnit);

		const healLog = effects.logs.find((l: any) => l.type === 'heal');
		expect(healLog).toBeDefined();
		expect(healLog.amount).toBe(30);
		expect(sourceUnit.life).toBe(80);
	});

	it('should not exceed max life', async () => {
		sourceUnit.life = 90;
		sourceUnit.maxLife = 100;
		sourceUnit.power = 20;

		await restoreLife(env, sourceUnit);

		expect(sourceUnit.life).toBe(100);
	});
});
