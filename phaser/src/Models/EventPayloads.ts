import { Unit } from "./Unit";

/**
 * Payload for events that primarily concern a single unit.
 * Used by:
 * - TRAIT_EVAL_UNIT_ACTION
 * - TRAIT_EVAL_UNIT_ENTER_POSITION
 * - TRAIT_EVAL_UNIT_LEAVE_POSITION
 * - TRAIT_EVAL_UNIT_HALF_HP
 * - TRAIT_EVAL_UNIT_DEATH
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
 * Payload for events where a unit is defending or evading an attack.
 * Used by:
 * - TRAIT_EVAL_DEFEND_BY_ME
 * - TRAIT_EVAL_EVADE_BY_ME
 */
export type DefenderAttackerPayload = {
	unit: Unit; // The unit defending or evading
	attacker: Unit; // The unit that initiated the attack
};

/**
 * Payload for events related to a unit killing another unit.
 * - TRAIT_EVAL_UNIT_KILL_BY_ME: `unit` is the killer, `killedUnit` is the one killed.
 * - TRAIT_EVAL_UNIT_KILL: `unit` is the one killed, `killer` is the killer.
 * - TRAIT_EVAL_ALLIED_KILLED: `unit` is the one killed, `killer` (optional) is the killer.
 * - TRAIT_EVAL_ENEMY_KILLED: `unit` is the one killed, `killer` (optional) is the killer.
 */
export type UnitKillPayload = { // Generic base, specific events clarify roles
	unit: Unit;
	killedUnit?: Unit; // For TRAIT_EVAL_UNIT_KILL_BY_ME
	killer?: Unit;     // For TRAIT_EVAL_UNIT_KILL, TRAIT_EVAL_ALLIED_KILLED, TRAIT_EVAL_ENEMY_KILLED
};