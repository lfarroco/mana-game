/**
 * Test to demonstrate the selective animation fix
 */

import {
	processModifierEvent,
	createInitialStates,
	type ModifierEvent
} from './ModifiersDisplay.pure';
import * as c from '../../../constants/constants';

describe('Selective Animation Fix', () => {
	it('should only mark the attack field as changed for MODIFIER_ATTACK_CHANGED', () => {
		const initialStates = createInitialStates();

		const event: ModifierEvent = {
			type: 'MODIFIER_ATTACK_CHANGED',
			forceId: c.FORCE_ID_PLAYER,
			newValue: 5
		};

		const result = processModifierEvent(initialStates, event);

		// Only attack should be marked as changed
		expect(result.displayUpdate?.changedFields).toEqual({
			atk: true,
			def: false,
			heal: false
		});

		// The attack value should be updated
		expect(result.displayUpdate?.atkMod).toBe(5);

		// Defense and heal should remain unchanged (0)
		expect(result.displayUpdate?.defMod).toBe(0);
		expect(result.displayUpdate?.healMod).toBe(0);
	});

	it('should only mark the defense field as changed for MODIFIER_DEFENSE_CHANGED', () => {
		const initialStates = createInitialStates();

		const event: ModifierEvent = {
			type: 'MODIFIER_DEFENSE_CHANGED',
			forceId: c.FORCE_ID_CPU,
			newValue: 3
		};

		const result = processModifierEvent(initialStates, event);

		// Only defense should be marked as changed
		expect(result.displayUpdate?.changedFields).toEqual({
			atk: false,
			def: true,
			heal: false
		});
	});

	it('should mark all fields as changed for MODIFIERS_UPDATED', () => {
		const initialStates = createInitialStates();

		const event: ModifierEvent = {
			type: 'MODIFIERS_UPDATED',
			forceId: c.FORCE_ID_PLAYER,
			atkMod: 1,
			defMod: 2,
			healMod: 3
		};

		const result = processModifierEvent(initialStates, event);

		// All fields should be marked as changed
		expect(result.displayUpdate?.changedFields).toEqual({
			atk: true,
			def: true,
			heal: true
		});
	});

	it('should mark all fields as changed for MODIFIER_RESET_ALL', () => {
		const initialStates = {
			player: { atk: 5, def: 3, heal: 2 },
			cpu: { atk: 1, def: 1, heal: 1 }
		};

		const event: ModifierEvent = {
			type: 'MODIFIER_RESET_ALL',
			forceId: c.FORCE_ID_PLAYER
		};

		const result = processModifierEvent(initialStates, event);

		// All fields should be marked as changed (since they're all being reset)
		expect(result.displayUpdate?.changedFields).toEqual({
			atk: true,
			def: true,
			heal: true
		});

		// All values should be 0
		expect(result.displayUpdate?.atkMod).toBe(0);
		expect(result.displayUpdate?.defMod).toBe(0);
		expect(result.displayUpdate?.healMod).toBe(0);
	});
});
