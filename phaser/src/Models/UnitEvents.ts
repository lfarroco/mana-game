import { Unit } from "./Unit";

// This module is isolated because some loops are formed when UNIT_EVENTS is used
// in the UNits and Traits modules

export type IO = () => Promise<void>;
export type UnitEvent = ((u: Unit) => IO);
type UnitEventWithTarget = ((u: Unit, target: Unit) => IO);

export type UnitEvents = {
	onTurnStart: UnitEvent[];
	onTurnEnd: UnitEvent[];
	onBattleStart: UnitEvent[];
	onBattleEnd: UnitEvent[];
	onHalfHP: UnitEvent[];
	onAttackByMe: UnitEventWithTarget[];
	onAfterAttackByMe: UnitEventWithTarget[];
	onDefendByMe: UnitEventWithTarget[];
	onUnitKillByMe: UnitEventWithTarget[];
	onUnitKill: UnitEventWithTarget[];
	onAlliedKilled: UnitEventWithTarget[];
	onEnemyKilled: UnitEventWithTarget[];
	onSelfEliminated: UnitEventWithTarget[];
};

// todo: should contains all keys of UnitEvents
export const UNIT_EVENTS: Array<keyof UnitEvents> = [
	"onTurnStart",
	"onTurnEnd",
	"onBattleStart",
	"onBattleEnd",
	"onHalfHP",
	"onAttackByMe",
	"onAfterAttackByMe",
	"onDefendByMe",
	"onUnitKillByMe",
	"onUnitKill",
	"onAlliedKilled",
	"onEnemyKilled",
	"onSelfEliminated",
];
