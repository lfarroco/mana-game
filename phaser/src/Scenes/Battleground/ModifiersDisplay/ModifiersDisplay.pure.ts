/**
 * Pure functions for ModifiersDisplay logic
 * These functions contain no side effects and can be easily tested
 */

import * as c from '../../../constants/constants';
import { MODIFIERS_DISPLAY } from './ModifiersDisplay.constants';

// Types for the pure functions
export type ModifierState = {
	atk: number;
	def: number;
	heal: number;
};

export type ModifierEvent =
	| { type: 'MODIFIERS_UPDATED'; forceId: string; atkMod: number; defMod: number; healMod: number }
	| { type: 'MODIFIER_ATTACK_CHANGED'; forceId: string; newValue: number }
	| { type: 'MODIFIER_DEFENSE_CHANGED'; forceId: string; newValue: number }
	| { type: 'MODIFIER_HEAL_CHANGED'; forceId: string; newValue: number }
	| { type: 'MODIFIER_DELTA_ATTACK'; forceId: string; delta: number }
	| { type: 'MODIFIER_DELTA_DEFENSE'; forceId: string; delta: number }
	| { type: 'MODIFIER_DELTA_HEAL'; forceId: string; delta: number }
	| { type: 'MODIFIER_RESET_ALL'; forceId: string };

export type ModifierStates = {
	player: ModifierState;
	cpu: ModifierState;
};

export type DisplayUpdate = {
	forceId: string;
	atkMod: number;
	defMod: number;
	healMod: number;
	changedFields: { atk: boolean, def: boolean, heal: boolean };
};

/**
 * Creates initial modifier states
 */
export function createInitialStates(): ModifierStates {
	return {
		player: { atk: 0, def: 0, heal: 0 },
		cpu: { atk: 0, def: 0, heal: 0 }
	};
}

/**
 * Gets the current modifiers for a specific force
 */
export function getModifiersForForce(states: ModifierStates, forceId: string): ModifierState {
	return forceId === c.FORCE_ID_PLAYER ? states.player : states.cpu;
}

/**
 * Sets modifiers for a specific force, returning new states
 */
export function setModifiersForForce(
	states: ModifierStates,
	forceId: string,
	newModifiers: ModifierState
): ModifierStates {
	if (forceId === c.FORCE_ID_PLAYER) {
		return {
			...states,
			player: { ...newModifiers }
		};
	} else {
		return {
			...states,
			cpu: { ...newModifiers }
		};
	}
}

/**
 * Formats a modifier value with appropriate prefix and up to 1 decimal place
 */
export function formatModifierValue(value: number): string {
	// Round to 1 decimal place and remove trailing zeros
	const rounded = Math.round(value * 10) / 10;
	const formatted = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
	return rounded >= 0 ? `+${formatted}` : formatted;
}

/**
 * Processes a modifier event and returns the new state and any display updates needed
 */
export function processModifierEvent(
	currentStates: ModifierStates,
	event: ModifierEvent
): { newStates: ModifierStates; displayUpdate?: DisplayUpdate } {
	const currentModifiers = getModifiersForForce(currentStates, event.forceId);
	let newModifiers: ModifierState;
	let changedFields = { atk: false, def: false, heal: false };

	switch (event.type) {
		case 'MODIFIERS_UPDATED':
			newModifiers = {
				atk: event.atkMod,
				def: event.defMod,
				heal: event.healMod
			};
			// For full updates, mark all fields as changed
			changedFields = { atk: true, def: true, heal: true };
			break;

		case 'MODIFIER_ATTACK_CHANGED':
			newModifiers = {
				...currentModifiers,
				atk: event.newValue
			};
			changedFields.atk = true;
			break;

		case 'MODIFIER_DEFENSE_CHANGED':
			newModifiers = {
				...currentModifiers,
				def: event.newValue
			};
			changedFields.def = true;
			break;

		case 'MODIFIER_HEAL_CHANGED':
			newModifiers = {
				...currentModifiers,
				heal: event.newValue
			};
			changedFields.heal = true;
			break;

		case 'MODIFIER_DELTA_ATTACK':
			newModifiers = {
				...currentModifiers,
				atk: currentModifiers.atk + event.delta
			};
			changedFields.atk = true;
			break;

		case 'MODIFIER_DELTA_DEFENSE':
			newModifiers = {
				...currentModifiers,
				def: currentModifiers.def + event.delta
			};
			changedFields.def = true;
			break;

		case 'MODIFIER_DELTA_HEAL':
			newModifiers = {
				...currentModifiers,
				heal: currentModifiers.heal + event.delta
			};
			changedFields.heal = true;
			break;

		case 'MODIFIER_RESET_ALL':
			newModifiers = { atk: 0, def: 0, heal: 0 };
			// For reset, mark all fields as changed
			changedFields = { atk: true, def: true, heal: true };
			break;

		default:
			// TypeScript exhaustiveness check
			const _exhaustive: never = event;
			throw new Error(`Unhandled event type: ${JSON.stringify(_exhaustive)}`);
	}

	const newStates = setModifiersForForce(currentStates, event.forceId, newModifiers);

	const displayUpdate: DisplayUpdate = {
		forceId: event.forceId,
		atkMod: newModifiers.atk,
		defMod: newModifiers.def,
		healMod: newModifiers.heal,
		changedFields
	};

	return { newStates, displayUpdate };
}

/**
 * Validates that a force ID is valid
 */
export function isValidForceId(forceId: string): boolean {
	return forceId === c.FORCE_ID_PLAYER || forceId === c.FORCE_ID_CPU;
}

/**
 * Creates display configuration for a given force
 */
export function createDisplayConfig(forceId: string) {
	const isPlayer = forceId === c.FORCE_ID_PLAYER;

	return {
		forceId,
		position: isPlayer
			? { x: MODIFIERS_DISPLAY.PLAYER_OFFSET_X, y: c.SCREEN_HEIGHT - MODIFIERS_DISPLAY.PLAYER_OFFSET_Y }
			: { x: c.SCREEN_WIDTH - MODIFIERS_DISPLAY.CPU_OFFSET_X, y: MODIFIERS_DISPLAY.CPU_OFFSET_Y },
		colors: {
			value: isPlayer ? MODIFIERS_DISPLAY.PLAYER_VALUE_COLOR : MODIFIERS_DISPLAY.CPU_VALUE_COLOR,
			label: MODIFIERS_DISPLAY.LABEL_COLOR,
			background: MODIFIERS_DISPLAY.BACKGROUND_COLOR,
			border: MODIFIERS_DISPLAY.BORDER_COLOR
		},
		dimensions: {
			width: MODIFIERS_DISPLAY.WIDTH,
			height: MODIFIERS_DISPLAY.HEIGHT,
			padding: MODIFIERS_DISPLAY.PADDING,
			lineHeight: MODIFIERS_DISPLAY.LINE_HEIGHT
		}
	};
}

/**
 * Calculates text positions for display elements
 */
export function calculateTextPositions(config: ReturnType<typeof createDisplayConfig>) {
	const { padding, lineHeight } = config.dimensions;

	return {
		atkLabel: { x: padding, y: padding },
		atkValue: { x: padding + MODIFIERS_DISPLAY.ATK_VALUE_OFFSET, y: padding },
		defLabel: { x: padding, y: padding + lineHeight },
		defValue: { x: padding + MODIFIERS_DISPLAY.DEF_VALUE_OFFSET, y: padding + lineHeight },
		healLabel: { x: padding, y: padding + lineHeight * 2 },
		healValue: { x: padding + MODIFIERS_DISPLAY.HEAL_VALUE_OFFSET, y: padding + lineHeight * 2 }
	};
}
