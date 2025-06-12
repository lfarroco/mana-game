/**
 * @file Defines the types and structures for unit-specific events and their callbacks.
 * This module is kept separate to avoid circular dependencies that can arise when
 * `Unit.ts` and `Traits.ts` both need to refer to event types.
 */
import { TraitData } from "../TraitSystem/Traits";
import { Unit } from "./Entities/Unit";

/** Represents an I/O-bound operation, typically an animation or a sequence of game logic steps. */
export type IO = () => Promise<void>;

/**
 * Callback signature for unit events that primarily concern a single unit.
 * @param u The unit that is the subject of the event.
 * @param traitData Optional. The specific trait instance data if the event is being triggered by a trait effect.
 * @returns An `IO` function representing the action to take.
 */
type UnitEventCallback = (u: Unit, traitData?: TraitData) => IO;
/**
 * Callback signature for unit events that involve a target unit in addition to the subject unit.
 * @param u The unit that is the subject of the event.
 * @param target The target unit involved in the event.
 * @returns An `IO` function representing the action to take.
 */
type UnitEventWithTargetCallback = (u: Unit, target: Unit) => IO;
/**
 * Callback signature for attack-related events, providing full context of the attack.
 * @param u The unit performing the attack.
 * @param target The unit being attacked.
 * @param damage The amount of damage dealt.
 * @param isCritical Whether the attack was a critical hit.
 * @param evaded Whether the attack was evaded by the target.
 * @returns An `IO` function representing the action to take.
 */
type AttackEventCallback = (u: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => IO;

/** Represents a unit event with a corresponding callback function. */
export type UnitEvent = { fn: UnitEventCallback };
/** Represents a unit event involving a target, with a corresponding callback function. */
export type UnitEventWithTarget = { fn: UnitEventWithTargetCallback };
/** Represents an attack event with a corresponding callback function. */
export type AttackEvent = { fn: AttackEventCallback }

export const makeUnitEvent = (fn: UnitEventCallback): UnitEvent => ({ fn });
export const makeUnitEventWithTarget = (fn: UnitEventWithTargetCallback): UnitEventWithTarget => ({ fn });
export const makeAttackEvent = (fn: AttackEventCallback): AttackEvent => ({ fn });

/** A no-operation UnitEvent, useful as a default or placeholder. */
export const UNIT_EVENT_NO_OP: UnitEvent = { fn: () => async () => { } };

/** Defines the structure for storing arrays of different types of unit event callbacks. */
export type UnitEvents = {
	onTurnStart: UnitEvent[];
	onTurnEnd: UnitEvent[];
	onBattleStart: UnitEvent[];
	onBattleEnd: UnitEvent[];
	onAction: UnitEvent[];
	onHalfHP: UnitEvent[];
	onAttackByMe: AttackEvent[];
	onEvadeByMe: UnitEventWithTarget[];
	onAfterAttackByMe: AttackEvent[];
	onDefendByMe: UnitEventWithTarget[];
	onUnitKillByMe: UnitEventWithTarget[];
	onUnitKill: UnitEventWithTarget[];
	onAlliedKilled: UnitEventWithTarget[];
	onEnemyKilled: UnitEventWithTarget[];
	onAlliedAction: UnitEvent[];
	onDeath: UnitEvent[];
	onLeavePosition: UnitEvent[];
	onEnterPosition: UnitEvent[];
};
// TODO: add onDamageCalculation, onDodgeCalculation, onCriticalHitCalculation, onAttackCalculation
// This allows adding buffs/debuffs to damage, dodge, critical hit and attack

/**
 * An array of all valid unit event keys. Used for iterating or validating event types.
 * IMPORTANT: This array must be kept in sync manually with the keys of the `UnitEvents` type.
 */
export const UNIT_EVENTS: readonly (keyof UnitEvents)[] = [
	"onTurnStart",
	"onTurnEnd",
	"onBattleStart",
	"onBattleEnd",
	"onAction",
	"onHalfHP",
	"onEvadeByMe",
	"onAttackByMe",
	"onAfterAttackByMe",
	"onDefendByMe",
	"onUnitKillByMe",
	"onUnitKill",
	"onAlliedKilled",
	"onEnemyKilled",
	"onAlliedAction",
	"onDeath",
	"onEnterPosition",
	"onLeavePosition",
] as const;

/** Helper type to extract keys from `UnitEvents` that correspond to `UnitEvent[]`. */
export type UnitEventKeys = { [K in keyof UnitEvents]: UnitEvents[K] extends UnitEvent[] ? K : never }[keyof UnitEvents];
/** Helper type to extract keys from `UnitEvents` that correspond to `AttackEvent[]`. */
export type AttackEventKeys = { [K in keyof UnitEvents]: UnitEvents[K] extends AttackEvent[] ? K : never }[keyof UnitEvents];
/** Helper type to extract keys from `UnitEvents` that correspond to `UnitEventWithTarget[]`. */
export type UnitEventWithTargetKeys = { [K in keyof UnitEvents]: UnitEvents[K] extends UnitEventWithTarget[] ? K : never }[keyof UnitEvents];