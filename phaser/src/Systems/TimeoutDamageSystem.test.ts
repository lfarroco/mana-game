
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { initializeTimeoutDamageSystem, updateTimeoutDamageSystem } from './TimeoutDamageSystem';
import { createMockState } from '@test-utils/serverCombatUtils';
import { createServerCombatEffects } from '@Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '@Scenes/Battleground/RunCombatCore';
import { TIMEOUT_DAMAGE_START_TIME } from '@Constants/constants';
import { State } from '@Models/State';
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

describe('TimeoutDamageSystem', () => {
	let state: State;
	let env: any;
	let timeoutState: any;
	let playerForce: any;
	let cpuForce: any;

	beforeEach(() => {
		state = createMockState();
		const effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		timeoutState = initializeTimeoutDamageSystem();
		playerForce = { id: state.session.player_id } as any;
		cpuForce = state.battleData.forces.find((f: any) => f.id !== playerForce.id);
	});

	it('should initialize correctly', () => {
		expect(timeoutState.combatElapsedTime).toBe(0);
		expect(timeoutState.isActive).toBe(true);
	});

	it('should not apply damage before timeout start time', () => {
		const delta = 1000;
		const newState = updateTimeoutDamageSystem(env, timeoutState, state, playerForce, cpuForce, delta);

		expect(newState.combatElapsedTime).toBe(delta);
		const damageLog = env.effects.logs.find((l: any) => l.type === 'timeout_damage');
		expect(damageLog).toBeUndefined();
	});

	it('should apply damage after timeout start time', () => {
		// Fast forward to start time - 1000ms
		timeoutState.combatElapsedTime = TIMEOUT_DAMAGE_START_TIME;
		timeoutState.timeSinceLastTick = 1000;

		// const delta = 0; // Just trigger check, or better simulate a tick
		// update adds delta first.

		timeoutState.combatElapsedTime = TIMEOUT_DAMAGE_START_TIME;
		timeoutState.timeSinceLastTick = 0;

		const deltaTick = 1000;
		const newState = updateTimeoutDamageSystem(env, timeoutState, state, playerForce, cpuForce, deltaTick);

		expect(newState.timeSinceLastTick).toBe(0);

		const damageLogs = env.effects.logs.filter((l: any) => l.type === 'timeout_damage');
		expect(damageLogs.length).toBe(2); // One for each force
		expect(damageLogs[0].damage).toBe(6);
	});

	it('should scale damage exponentially', () => {
		// Simulate a later tick
		// timeSinceTimeoutStarted = 2000 (2 seconds past timeout)
		timeoutState.combatElapsedTime = TIMEOUT_DAMAGE_START_TIME + 2000;
		timeoutState.timeSinceLastTick = 1000; // Ready to tick

		// Tick count logic in system: floor(timeSince / 1000) + 1
		// If elapsed = start + 3000 (after delta adds 1000 to existing 2000? No wait)

		// Passed in state: elapsed = start+2000. Last tick was 0? No, let's say last tick was at 1000.
		// We want to trigger the calculation for tick #3?

		// const delta = 0; // Just trigger? No, update adds delta.

		// Let's restart.
		// We want to verify scaling.
		// timestamp 0 (at timeout): 5 * 1.2^0 = 5
		// timestamp 1000: 5 * 1.2^1 = 6
		// timestamp 2000: 5 * 1.2^2 = 7.2 -> 7

		timeoutState.combatElapsedTime = TIMEOUT_DAMAGE_START_TIME + 2000;
		timeoutState.timeSinceLastTick = 1000;

		// const newState = updateTimeoutDamageSystem(env, timeoutState, state, playerForce, cpuForce, 0.001); // minimal delta to trigger
		updateTimeoutDamageSystem(env, timeoutState, state, playerForce, cpuForce, 0.001); // minimal delta to trigger
		// Actually update adds delta to combatElapsedTime AND timeSinceLastTick.
		// so if we pass 0, it uses existing.

		// System logic: newTimeSinceLastTick = old + delta.
		// if newTimeSince >= 1000 -> tick.

		// So if old=1000, delta=0 -> tick.
		// timeSinceTimeout = newElapsed - START = (Start+2000 + 0) - Start = 2000.
		// tickCount = floor(2000/1000) + 1 = 2 + 1 = 3.
		// Damage = 5 * 1.2^(3-1) = 5 * 1.44 = 7.2 -> 7.

		updateTimeoutDamageSystem(env, timeoutState, state, playerForce, cpuForce, 0);

		const damageLogs = env.effects.logs.filter((l: any) => l.type === 'timeout_damage');
		expect(damageLogs[0].damage).toBe(7);
	});

	it('should inflict infinite damage after 60s', () => {
		timeoutState.combatElapsedTime = TIMEOUT_DAMAGE_START_TIME + 60000;
		timeoutState.timeSinceLastTick = 1000;

		updateTimeoutDamageSystem(env, timeoutState, state, playerForce, cpuForce, 0);

		const damageLogs = env.effects.logs.filter((l: any) => l.type === 'timeout_damage');
		expect(damageLogs[0].damage).toBe(Infinity);
	});
});
