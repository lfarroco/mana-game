import type * as CombatSystemStates from "./CombatSystemStates";
import type * as CombatLogger from "./CombatLogger";
import type * as ScheduledEffects from "./ScheduledEffects";
import { SessionData } from "./Models";
import { CombatState } from "./Models";

export type WaveOutcome = "player_won" | "player_lost" | "both_won";

/**
 * The pure-data combat environment passed through trigger effects and systems.
 * Contains only state, combat system states, logger, scheduled effects, and reaction processing.
 * Visual effects are NOT part of this env — they are handled separately by
 * CombatPlaybackController during client-side playback.
 */
export type CombatEnvironment = {
	session: SessionData, // needed for current seed
	combatState: CombatState;
	combatStates: CombatSystemStates.CombatSystemStates;
	logger: CombatLogger.CombatLogger;
	scheduledEffects: ScheduledEffects.ScheduledEffectsState;
};