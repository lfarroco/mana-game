/**
 * Combat-related types — state, environment, systems, and outcomes.
 */

import type * as CombatLogger from "../Combat/CombatLogger";
import type * as PoisonDamageSystem from "../Combat/PoisonDamageSystem";
import type * as RegenSystem from "../Combat/RegenSystem";
import type * as CombatStatsTracker from "../Combat/CombatStatsTracker";
import type { Unit } from "./unit";

export type WaveOutcome = "player_won" | "player_lost" | "both_won";

export type CombatSystemStates = {
	poisonSystemState: PoisonDamageSystem.PoisonSystemState;
	regenSystemState: RegenSystem.RegenSystemState;
	combatStatsTrackerState: CombatStatsTracker.CombatStatsTrackerState;
};

/**
 * A deferred event scheduled to execute at a future simulation time.
 * The execute closure applies the effect to game state and logs the _hit entry.
 */
export type DeferredEvent = {
	timeMs: number;
	execute: (env: CombatEnvironment) => void;
};

/**
 * The pure-data combat environment passed through trigger effects and systems.
 * Contains only state, combat system states, logger, deferred events, and reaction processing.
 * Visual effects are NOT part of this env — they are handled separately by
 * CombatPlaybackController during client-side playback.
 */
export type CombatEnvironment = {
	seed: string; // mutable seed, advanced during combat for deterministic RNG
	combatState: CombatState;
	combatStates: CombatSystemStates;
	logger: CombatLogger.CombatLogger;
	deferredEvents: DeferredEvent[];
};

export type CombatState = {
	// Hot, mutable units for simulation
	units: Unit[];
	logs: CombatLogger.CombatLogEntry[];
	enemyPlayerName: string;
	wonCombat: boolean;
	// Permanent buffs should be applied here
	finalPlayerUnits: Unit[];
	// Pristine snapshot used to reset the board for replays. Read-only: never
	// mutate it. In-combat mutation happens on `units`; if `units` is replaced,
	// rebuild the derived indexes below via rebuildCombatStateIndexes().
	initialUnits: readonly Unit[];
	// Derived indexes over `units`. Rebuild via rebuildCombatStateIndexes()
	// whenever `units` is replaced so they never drift out of sync.
	unitById: Map<string, Unit>;
	playerCore: Unit;
	cpuCore: Unit;
	playerUnits: Unit[];
	cpuUnits: Unit[];
};