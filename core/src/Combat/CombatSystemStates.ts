import * as PoisonDamageSystem from "./PoisonDamageSystem";
import * as RegenSystem from "./RegenSystem";
import * as CombatStatsTracker from "./CombatStatsTracker";

export type CombatSystemStates = {
	poisonSystemState: PoisonDamageSystem.PoisonSystemState;
	regenSystemState: RegenSystem.RegenSystemState;
	combatStatsTrackerState: CombatStatsTracker.CombatStatsTrackerState;
};


