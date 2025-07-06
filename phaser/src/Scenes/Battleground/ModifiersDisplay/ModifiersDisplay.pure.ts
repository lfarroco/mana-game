/**
 * Pure functions for ModifiersDisplay logic
 * These functions contain no side effects and can be easily tested
 */

import * as c from '../../../constants/constants';

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
 * Formats a modifier value with appropriate prefix
 */
export function formatModifierValue(value: number): string {
	return value >= 0 ? `+${value}` : `${value}`;
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

	switch (event.type) {
		case 'MODIFIERS_UPDATED':
			newModifiers = {
				atk: event.atkMod,
				def: event.defMod,
				heal: event.healMod
			};
			break;

		case 'MODIFIER_ATTACK_CHANGED':
			newModifiers = {
				...currentModifiers,
				atk: event.newValue
			};
			break;

		case 'MODIFIER_DEFENSE_CHANGED':
			newModifiers = {
				...currentModifiers,
				def: event.newValue
			};
			break;

		case 'MODIFIER_HEAL_CHANGED':
			newModifiers = {
				...currentModifiers,
				heal: event.newValue
			};
			break;

		case 'MODIFIER_DELTA_ATTACK':
			newModifiers = {
				...currentModifiers,
				atk: currentModifiers.atk + event.delta
			};
			break;

		case 'MODIFIER_DELTA_DEFENSE':
			newModifiers = {
				...currentModifiers,
				def: currentModifiers.def + event.delta
			};
			break;

		case 'MODIFIER_DELTA_HEAL':
			newModifiers = {
				...currentModifiers,
				heal: currentModifiers.heal + event.delta
			};
			break;

		case 'MODIFIER_RESET_ALL':
			newModifiers = { atk: 0, def: 0, heal: 0 };
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
		healMod: newModifiers.heal
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
			? { x: 20, y: c.SCREEN_HEIGHT - 260 }
			: { x: c.SCREEN_WIDTH - 380, y: 20 },
		colors: {
			value: isPlayer ? '#00ff00' : '#ff4444',
			label: '#ffffff',
			background: 0x000000,
			border: 0xffffff
		},
		dimensions: {
			width: 360,
			height: 240,
			padding: 24,
			lineHeight: 54
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
		atkValue: { x: padding + 105, y: padding },
		defLabel: { x: padding, y: padding + lineHeight },
		defValue: { x: padding + 105, y: padding + lineHeight },
		healLabel: { x: padding, y: padding + lineHeight * 2 },
		healValue: { x: padding + 120, y: padding + lineHeight * 2 }
	};
}
