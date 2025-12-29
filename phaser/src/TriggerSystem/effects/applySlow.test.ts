
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '../../Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '../../Scenes/Battleground/RunCombatCore';
import { applySlowLogicIO } from './applySlow';
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

describe('Slow Effect Tests', () => {
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
		targetUnit = state.battleData.units[1];

		targetUnit.slowed = 0;
	});

	it('should increase slow duration on target', async () => {
		const duration = 3000;

		await applySlowLogicIO(env, sourceUnit, [targetUnit], duration, () => { });

		expect(targetUnit.slowed).toBe(duration);

		const slowLog = effects.logs.find((l: any) => l.type === 'slow');
		expect(slowLog).toBeDefined();
		expect(slowLog.effectDuration).toBe(duration);
	});
});
