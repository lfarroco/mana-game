import type * as State from "@Models/ClientState";
import type * as CombatSystemStates from "@Systems/CombatSystemStates";
import type * as CombatLogger from "@Core/Combat/CombatLogger";
import type * as ScheduledEffects from "@Core/Combat/ScheduledEffects";
import { Effect, Unit } from "@game/Models";

export type WaveOutcome = "player_won" | "player_lost" | "both_won";

/**
 * The pure-data combat environment passed through trigger effects and systems.
 * Contains only state, combat system states, logger, scheduled effects, and reaction processing.
 * Visual effects are NOT part of this env — they are handled separately by
 * CombatPlaybackController during client-side playback.
 */
export type CombatEnvironment = {
	state: State.ClientState;
	combatStates: CombatSystemStates.CombatSystemStates;
	logger: CombatLogger.CombatLogger;
	scheduledEffects: ScheduledEffects.ScheduledEffectsState;
	processReactions: (
		env: CombatEnvironment,
		triggeringUnit: Unit,
		effect: Effect,
		scale?: number
	) => void;
};