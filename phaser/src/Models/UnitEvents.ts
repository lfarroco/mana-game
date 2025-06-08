import { TraitData } from "./Traits";
import { Unit } from "./Unit";

// This module is isolated because some loops are formed when UNIT_EVENTS is used
// in the UNits and Traits modules

export type IO = () => Promise<void>;

type UnitEventCallback = ((u: Unit, traitData?: TraitData) => IO)
type UnitEventWithTargetCallback = ((u: Unit, target: Unit) => IO)
type AttackEventCallback = ((u: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => IO)

export type UnitEvent = { fn: UnitEventCallback };
export type UnitEventWithTarget = { fn: UnitEventWithTargetCallback };
export type AttackEvent = { fn: AttackEventCallback }

export const makeUnitEvent = (fn: UnitEventCallback): UnitEvent => ({ fn });
export const makeUnitEventWithTarget = (fn: UnitEventWithTargetCallback): UnitEventWithTarget => ({ fn });
export const makeAttackEvent = (fn: AttackEventCallback): AttackEvent => ({ fn });

export const UNIT_EVENT_NO_OP: UnitEvent = { fn: () => async () => { } };

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
	onDeath: UnitEvent[];
	onLeavePosition: UnitEvent[];
	onEnterPosition: UnitEvent[];
};
// TODO: add onDamageCalculation, onDodgeCalculation, onCriticalHitCalculation, onAttackCalculation
// This allows adding buffs/debuffs to damage, dodge, critical hit and attack

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
	"onDeath",
	"onEnterPosition",
	"onLeavePosition",
] as const;

// Helper types for more specific event keys
export type UnitEventKeys = { [K in keyof UnitEvents]: UnitEvents[K] extends UnitEvent[] ? K : never }[keyof UnitEvents];
export type AttackEventKeys = { [K in keyof UnitEvents]: UnitEvents[K] extends AttackEvent[] ? K : never }[keyof UnitEvents];
export type UnitEventWithTargetKeys = { [K in keyof UnitEvents]: UnitEvents[K] extends UnitEventWithTarget[] ? K : never }[keyof UnitEvents];