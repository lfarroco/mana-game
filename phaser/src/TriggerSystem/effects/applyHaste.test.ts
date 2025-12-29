
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
	let combatRunner: any;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		combatRunner = runCombat(state, effects);
		env = combatRunner.getEnv();

		sourceUnit = state.battleData.units[0];
		targetUnit = state.battleData.units[1];

		targetUnit.hasted = 0;
		targetUnit.charge = 0;
		// set cooldown to something large so it doesn't fire naturally during test
		targetUnit.cooldown = 100000;
	});

	it('should increase haste duration on target', async () => {
		const duration = 5000;

		await applyHasteLogicIO(env, [targetUnit], sourceUnit, duration, () => { });

		expect(targetUnit.hasted).toBe(duration);

		const hasteLog = effects.logs.find((l: any) => l.type === 'haste');
		expect(hasteLog).toBeDefined();
		expect(hasteLog.effectDuration).toBe(duration);
	});

	it('should double charge rate and expire after duration', async () => {
		const duration = 100; // 100ms duration
		const delta = 10; // 10ms per frame

		await applyHasteLogicIO(env, [targetUnit], sourceUnit, duration, () => { });

		// Advance 1 frame (10ms)
		// With haste, charge rate is 2x. So charge should increase by 20.
		combatRunner.updateFrame(state, 0, delta);

		expect(targetUnit.charge).toBeCloseTo(20);
		expect(targetUnit.hasted).toBe(duration - delta);

		// Advance 9 more frames (total 10 frames = 100ms)
		for (let i = 0; i < 9; i++) {
			combatRunner.updateFrame(state, 0, delta);
		}

		// Duraion expired
		expect(targetUnit.hasted).toBe(0);

		// Total charge: 10 frames * 20 = 200
		expect(targetUnit.charge).toBeCloseTo(200);

		// Next frame, haste is gone. Normal rate (1x).
		// Charge should increase by 10.
		combatRunner.updateFrame(state, 0, delta);
		expect(targetUnit.charge).toBeCloseTo(210);
	});
});
