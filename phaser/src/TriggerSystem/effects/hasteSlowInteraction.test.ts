
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '../../Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '../../Scenes/Battleground/RunCombatCore';
import { applyHasteLogicIO } from './applyHaste';
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

describe('Haste & Slow Interaction Tests', () => {
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
		targetUnit.slowed = 0;
		targetUnit.charge = 0;
		targetUnit.cooldown = 100000;
	});

	it('should have normal charge rate when both active', async () => {
		const duration = 5000;
		const delta = 10;

		// Apply both effects
		await applyHasteLogicIO(env, [targetUnit], sourceUnit, duration, () => { });
		await applySlowLogicIO(env, sourceUnit, [targetUnit], duration, () => { });

		expect(targetUnit.hasted).toBe(duration);
		expect(targetUnit.slowed).toBe(duration);

		// Advance 1 frame (10ms)
		// Normal rate = 1x. Haste (2x) + Slow (0.5x) => (1 / (0.5 * 2))??? 
		// Let's check the logic in RunCombatCore.ts:
		// const cooldownMultiplier = unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
		// Wait, the logic I read earlier in RunCombatCore.ts line 184 was:
		// const cooldownMultiplier = unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;

		// This implies priority! 
		// If hasted > 0, mult is 0.5. Slow is ignored?
		// Let me re-read RunCombatCore.ts to be sure about the interaction logic.
		// If the code is: unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1
		// Then Haste overrides Slow completely?
		// The user EXPECTS "cooldown rate is 1".
		// If the current implementation prioritizes Haste, then the test will fail if I expect 1x (charge +10).
		// It would behave as Haste (charge +20).

		// Let's write the test expecting 1x (neutralized) as requested, 
		// and if it fails, I might need to adjust the implementation (or report it).
		// BUT the user said: "slow makes the cooldown reduce at 1/2 speed... do the same type of assertions... If a unit has both statuses, then its cooldown rate is 1"
		// This implies the User BELIEVES getting 1 is the desired behavior.

		combatRunner.updateFrame(state, 0, delta);

		// Normal charge increase for 10ms delta is 10.
		expect(targetUnit.charge).toBeCloseTo(10);
	});
});
