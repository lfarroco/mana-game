import { Unit } from "./Unit";

// This module is isolated because some loops are formed when UNIT_EVENTS is used
// in the UNits and Traits modules

export type IO = () => Promise<void>;
export type UnitEvent = ((u: Unit) => IO);
type UnitEventWithTarget = ((u: Unit, target: Unit) => IO);
type AttackEvent = ((u: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => IO);

export type UnitEvents = {
	onTurnStart: UnitEvent[];
	onTurnEnd: UnitEvent[];
	onBattleStart: UnitEvent[];
	onBattleEnd: UnitEvent[];
	onHalfHP: UnitEvent[];
	onAttackByMe: AttackEvent[];
	onEvadeByMe: UnitEventWithTarget[];
	onAfterAttackByMe: AttackEvent[];
	onDefendByMe: UnitEventWithTarget[];
	onUnitKillByMe: UnitEventWithTarget[];
	onUnitKill: UnitEventWithTarget[];
	onAlliedKilled: UnitEventWithTarget[];
	onEnemyKilled: UnitEventWithTarget[];
	onSelfEliminated: UnitEventWithTarget[];
	onLeavePosition: UnitEvent[];
	onEnterPosition: UnitEvent[];
};

export const UNIT_EVENTS: readonly (keyof UnitEvents)[] = [
	"onTurnStart",
	"onTurnEnd",
	"onBattleStart",
	"onBattleEnd",
	"onHalfHP",
	"onEvadeByMe",
	"onAttackByMe",
	"onAfterAttackByMe",
	"onDefendByMe",
	"onUnitKillByMe",
	"onUnitKill",
	"onAlliedKilled",
	"onEnemyKilled",
	"onSelfEliminated",
	"onEnterPosition",
	"onLeavePosition"
] as const;