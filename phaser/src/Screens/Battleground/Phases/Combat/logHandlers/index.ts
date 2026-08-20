import type { CombatLogEntry } from "@game/Combat/CombatLogger";
import { getLogHandlerGroup, NO_FX_LOG_TYPES } from "@game/Combat/logDispatch";
import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import {
	handleDamageCast,
	handleHealCast,
	handleShieldCast,
	handlePoisonCast,
	handleDamageHit,
	handleHealHit,
	handleShieldHit,
	handlePoisonHit,
	handlePoisonTick,
	handleRegenTick,
	handleTimeoutDamageCast,
	handleTimeoutDamageHit,
} from "./projectileHandlers";
import {
	handleRegenCast,
	handleHasteCast,
	handleSlowCast,
	handleChargeCast,
	handleSilenceCast,
	handleDispelCast,
	handleRegenHit,
	handleHasteHit,
	handleSlowHit,
	handleChargeHit,
	handleSilenceHit,
	handleDispelHit,
} from "./arcaneMissileHandlers";
import { handleIncreasePower, handleDecreasePower } from "./powerHandlers";
import { handleReaction } from "./reactionHandlers";
import {
	handleHasteEnd,
	handleSlowEnd,
	handleSilenceEnd,
	handleSilenceSkip,
} from "./statusHandlers";
import { handleCombatStats } from "./combatStatsHandlers";

export { setCombatState } from "./combatStateStore";

type LogHandler = (log: CombatLogEntry, playbackState: PlaybackState) => void;

/** Log types that need a real FX handler (everything but the `none` group). */
type HandledType = Exclude<CombatLogEntry["type"], (typeof NO_FX_LOG_TYPES)[number]>;

/**
 * Playback FX handlers, injected per log type (B4 — purify.md).
 *
 * The dispatch decision — which handler family each log type belongs to —
 * lives in core (`@game/Combat/logDispatch`). This table registers the Phaser
 * FX handlers; the `Record<HandledType, …>` annotation makes a missing entry
 * for any new non-`none` log type a compile-time error, instead of silently
 * falling through a switch `default` (the D1/D2 silence/dispel gap).
 */
const HANDLERS = {
	// projectile casts / hits (damage/heal/shield/poison + timeout)
	damage_cast: handleDamageCast,
	heal_cast: handleHealCast,
	shield_cast: handleShieldCast,
	poison_cast: handlePoisonCast,
	timeout_damage_cast: handleTimeoutDamageCast,
	damage_hit: handleDamageHit,
	heal_hit: handleHealHit,
	shield_hit: handleShieldHit,
	poison_hit: handlePoisonHit,
	timeout_damage_hit: handleTimeoutDamageHit,
	// status casts / hits (arcane missiles)
	regen_cast: handleRegenCast,
	haste_cast: handleHasteCast,
	slow_cast: handleSlowCast,
	charge_cast: handleChargeCast,
	silence_cast: handleSilenceCast,
	dispel_cast: handleDispelCast,
	regen_hit: handleRegenHit,
	haste_hit: handleHasteHit,
	slow_hit: handleSlowHit,
	charge_hit: handleChargeHit,
	silence_hit: handleSilenceHit,
	dispel_hit: handleDispelHit,
	// status ends
	haste_end: handleHasteEnd,
	slow_end: handleSlowEnd,
	silence_end: handleSilenceEnd,
	silence_skip: handleSilenceSkip,
	// periodic ticks
	poison_tick: handlePoisonTick,
	regen_tick: handleRegenTick,
	// immediate effects
	increase_power: handleIncreasePower,
	decrease_power: handleDecreasePower,
	// reactions / stats
	reaction: handleReaction,
	combat_stats: handleCombatStats,
} satisfies Record<HandledType, (log: never, playbackState: PlaybackState) => void>;

const dispatch = HANDLERS as Record<HandledType, LogHandler>;

export const executeLogHandler = (
	log: CombatLogger.CombatLogEntry,
	playbackState: PlaybackState
): void => {
	// Core-owned classification: `none`-group entries (increase_critical,
	// storm_start, outcome) have no FX handler — skip them.
	if (getLogHandlerGroup(log) === "none") return;

	dispatch[log.type as HandledType](log, playbackState);
};

export type { PlaybackState } from "./types";
