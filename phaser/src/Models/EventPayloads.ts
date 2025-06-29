/**
 * @file Defines the data structures (payloads) for various game events,
 * particularly those relevant to the Trait System.
 */
import { Unit } from "./Entities/Unit";

/**
 * Payload for events that primarily concern a single unit.
 * Used by:
 * - TRAIT_EVAL_UNIT_ACTION
 * - TRAIT_EVAL_ALLIED_ACTION
 * - TRAIT_EVAL_TURN_START
 * - TRAIT_EVAL_TURN_END
 */
export type UnitPayload = {
	unit: Unit;
};

/**
 * Payload for events that carry no specific data.
 * Used by:
 * - TRAIT_EVAL_GLOBAL_BATTLE_START
 * - TRAIT_EVAL_BATTLE_END
 */
export type EmptyPayload = {};

/**
 * Payload for attack-related events providing full context of an attack.
 * Used by:
 * - TRAIT_EVAL_ATTACK_BY_ME
 * - TRAIT_EVAL_AFTER_ATTACK_BY_ME
 */
export type AttackContextPayload = {
	unit: Unit; // The attacker
	target: Unit;
	damage: number;
	isCritical: boolean;
	evaded: boolean;
};

/**
 * Defines the structure for payloads used when requesting the display of a user-facing message.
 * These messages can be errors, informational pop-ups, warnings, or success notifications.
 */
export type UserMessagePayload = {
	/** The content of the message to be displayed. */
	text: string;
	/** The type or category of the message, which can influence its presentation (e.g., color, icon) or associated sound. */
	type: 'error' | 'info' | 'warning' | 'success';
};

/**
 * Defines the structure for payloads used when requesting the display of a pop-up text at specific coordinates.
 */
export type PopTextPayload = {
	text: string;
	x: number;
	y: number;
	type?: "heal" | "damage"; // Corresponds to popText function's type parameter
};