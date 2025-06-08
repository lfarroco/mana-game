import { TraitData } from "./Traits";
import { Unit } from "./Unit";

// This module is isolated because some loops are formed when UNIT_EVENTS is used
// in the UNits and Traits modules

export type IO = () => Promise<void>;

type UnitEventCallback = ((u: Unit, traitData?: TraitData) => IO)
type UnitEventWithTargetCallback = ((u: Unit, target: Unit) => IO)
type AttackEventCallback = ((u: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => IO)

export type UnitEvent = { type: "unitEvent", fn: UnitEventCallback };
export type UnitEventWithTarget = { type: "unitEventWithTarget", fn: UnitEventWithTargetCallback };
export type AttackEvent = { type: "attackEvent", fn: AttackEventCallback }

export const makeUnitEvent = (fn: UnitEventCallback): UnitEvent => ({ type: "unitEvent", fn });
export const makeUnitEventWithTarget = (fn: UnitEventWithTargetCallback): UnitEventWithTarget => ({ type: "unitEventWithTarget", fn });
export const makeAttackEvent = (fn: AttackEventCallback): AttackEvent => ({ type: "attackEvent", fn });

export const UNIT_EVENT_NO_OP: UnitEvent = { type: "unitEvent", fn: () => async () => { } };

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
	"onLeavePosition"
] as const;