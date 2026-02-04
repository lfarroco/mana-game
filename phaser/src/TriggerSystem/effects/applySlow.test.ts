
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '@Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '@Scenes/Battleground/RunCombatCore';
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
	let combatRunner: any;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		combatRunner = runCombat(state, effects);
		env = combatRunner.getEnv();

		sourceUnit = state.battleData.units[0];
		targetUnit = state.battleData.units[1];

		targetUnit.slowed = 0;
		targetUnit.charge = 0;
		// set cooldown to something large so it doesn't fire naturally during test
		targetUnit.cooldown = 100000;
	});

	it('should increase slow duration on target', async () => {
		const duration = 3000;

		await applySlowLogicIO(env, sourceUnit, [targetUnit], duration, () => { });

		effects.setFrame(30);

		expect(targetUnit.slowed).toBe(duration);

		const slowLog = effects.logs.find((l: any) => l.type === 'slow');
		expect(slowLog).toBeDefined();
		expect(slowLog.effectDuration).toBe(duration);
	});

	it('should halve charge rate and expire after duration', async () => {
		const duration = 100; // 100ms duration
		const delta = 10; // 10ms per frame

		await applySlowLogicIO(env, sourceUnit, [targetUnit], duration, () => { });

		effects.setFrame(30);

		// Advance 1 frame (10ms)
		// With slow, charge rate is 0.5x. So charge should increase by 5.
		combatRunner.updateFrame(state, 0, delta);

		expect(targetUnit.charge).toBeCloseTo(5);
		expect(targetUnit.slowed).toBe(duration - delta);

		// Advance 9 more frames (total 10 frames = 100ms)
		for (let i = 0; i < 9; i++) {
			combatRunner.updateFrame(state, 0, delta);
		}

		// Duration expired
		expect(targetUnit.slowed).toBe(0);

		// Total charge: 10 frames * 5 = 50
		expect(targetUnit.charge).toBeCloseTo(50);

		// Next frame, slow is gone. Normal rate (1x).
		// Charge should increase by 10.
		combatRunner.updateFrame(state, 0, delta);
		expect(targetUnit.charge).toBeCloseTo(60);

		// Check for slow_end log
		const slowEndLog = effects.logs.find((l: any) => l.type === 'slow_end');
		expect(slowEndLog).toBeDefined();
		expect(slowEndLog.unitId).toBe(targetUnit.id);
	});
});
