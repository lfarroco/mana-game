/**
 * Integration test example showing how the refactored ModifiersDisplay works
 * This demonstrates the separation between pure logic and side effects
 */

import {
	createInitialStates,
	processModifierEvent,
	formatModifierValue,
	type ModifierEvent
} from './ModifiersDisplay.pure';
import * as c from '../../../constants/constants';

describe('ModifiersDisplay Integration Example', () => {
	it('should demonstrate a complete modifier update flow', () => {
		// 1. Start with initial state
		let state = createInitialStates();
		expect(state.player).toEqual({ atk: 0, def: 0, heal: 0 });

		// 2. Player gains some bonuses
		const gainBonusEvent: ModifierEvent = {
			type: 'MODIFIERS_UPDATED',
			forceId: c.FORCE_ID_PLAYER,
			atkMod: 3,
			defMod: 1,
			healMod: 2
		};

		let result = processModifierEvent(state, gainBonusEvent);
		state = result.newStates;

		expect(state.player).toEqual({ atk: 3, def: 1, heal: 2 });
		expect(result.displayUpdate).toEqual({
			forceId: c.FORCE_ID_PLAYER,
			atkMod: 3,
			defMod: 1,
			healMod: 2
		});

		// 3. Player's attack gets a boost
		const attackBoostEvent: ModifierEvent = {
			type: 'MODIFIER_DELTA_ATTACK',
			forceId: c.FORCE_ID_PLAYER,
			delta: 2
		};

		result = processModifierEvent(state, attackBoostEvent);
		state = result.newStates;

		expect(state.player).toEqual({ atk: 5, def: 1, heal: 2 }); // 3 + 2 = 5

		// 4. Enemy gets some defensive bonuses
		const enemyDefenseEvent: ModifierEvent = {
			type: 'MODIFIER_DEFENSE_CHANGED',
			forceId: c.FORCE_ID_CPU,
			newValue: 4
		};

		result = processModifierEvent(state, enemyDefenseEvent);
		state = result.newStates;

		expect(state.player).toEqual({ atk: 5, def: 1, heal: 2 }); // unchanged
		expect(state.cpu).toEqual({ atk: 0, def: 4, heal: 0 });

		// 5. Format values for display
		expect(formatModifierValue(state.player.atk)).toBe('+5');
		expect(formatModifierValue(state.player.def)).toBe('+1');
		expect(formatModifierValue(state.cpu.def)).toBe('+4');
		expect(formatModifierValue(-3)).toBe('-3');

		// 6. Reset player modifiers
		const resetEvent: ModifierEvent = {
			type: 'MODIFIER_RESET_ALL',
			forceId: c.FORCE_ID_PLAYER
		};

		result = processModifierEvent(state, resetEvent);
		state = result.newStates;

		expect(state.player).toEqual({ atk: 0, def: 0, heal: 0 });
		expect(state.cpu).toEqual({ atk: 0, def: 4, heal: 0 }); // unchanged
	});

	it('should demonstrate complex modifier chains', () => {
		let state = createInitialStates();

		// Chain multiple events
		const events: ModifierEvent[] = [
			{ type: 'MODIFIER_ATTACK_CHANGED', forceId: c.FORCE_ID_PLAYER, newValue: 10 },
			{ type: 'MODIFIER_DELTA_ATTACK', forceId: c.FORCE_ID_PLAYER, delta: -3 },
			{ type: 'MODIFIER_DEFENSE_CHANGED', forceId: c.FORCE_ID_PLAYER, newValue: 5 },
			{ type: 'MODIFIER_DELTA_DEFENSE', forceId: c.FORCE_ID_PLAYER, delta: 2 },
			{ type: 'MODIFIER_HEAL_CHANGED', forceId: c.FORCE_ID_PLAYER, newValue: -1 }
		];

		// Process all events
		for (const event of events) {
			const result = processModifierEvent(state, event);
			state = result.newStates;
		}

		// Final state should be: atk: 7 (10-3), def: 7 (5+2), heal: -1
		expect(state.player).toEqual({ atk: 7, def: 7, heal: -1 });
	});

	it('should handle edge cases', () => {
		let state = createInitialStates();

		// Large positive and negative values
		const extremeEvent: ModifierEvent = {
			type: 'MODIFIERS_UPDATED',
			forceId: c.FORCE_ID_CPU,
			atkMod: 999,
			defMod: -999,
			healMod: 0
		};

		const result = processModifierEvent(state, extremeEvent);
		state = result.newStates;

		expect(state.cpu).toEqual({ atk: 999, def: -999, heal: 0 });
		expect(formatModifierValue(999)).toBe('+999');
		expect(formatModifierValue(-999)).toBe('-999');
		expect(formatModifierValue(0)).toBe('+0');
	});
});
