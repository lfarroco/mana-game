
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '../../Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '../../Scenes/Battleground/RunCombatCore';
import { applyHasteLogicIO } from './applyHaste';
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

describe('Haste Effect Tests', () => {
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

		targetUnit.hasted = 0;
	});

	it('should increase haste duration on target', async () => {
		const duration = 5000;

		await applyHasteLogicIO(env, [targetUnit], sourceUnit, duration, () => { });

		expect(targetUnit.hasted).toBe(duration);

		const hasteLog = effects.logs.find((l: any) => l.type === 'haste');
		expect(hasteLog).toBeDefined();
		expect(hasteLog.effectDuration).toBe(duration);
	});
});
