import type { CombatLogEntry } from "./CombatLogger";

/**
 * B4 (purify.md): the combat-log → playback-handler dispatch decision, as pure
 * data.
 *
 * Each log type is classified into a handler family. The Phaser playback layer
 * keeps a registry of FX handlers keyed by log type (handlers injected at the
 * table) and treats the `none` group as "no FX handler" — so new log types that
 * carry game state become compile-time errors in the client instead of
 * silently falling through a switch `default`.
 *
 * Groups map 1:1 to the Phaser handler modules:
 *   projectile_cast / projectile_hit — projectileHandlers (damage/heal/shield/
 *     poison/timeout casts & hits)
 *   status_cast / status_hit — arcaneMissileHandlers (regen/haste/slow/charge/
 *     silence/dispel casts & hits)
 *   status_end — statusHandlers (haste/slow/silence ends + silence_skip)
 *   tick — projectileHandlers (poison/regen periodic ticks)
 *   power — powerHandlers
 *   reaction — reactionHandlers
 *   stats — combatStatsHandlers
 *   none — no FX handler (increase_critical, storm_start, outcome, runaway_combat)
 */
export type LogHandlerGroup =
  | "projectile_cast"
  | "projectile_hit"
  | "status_cast"
  | "status_hit"
  | "status_end"
  | "tick"
  | "power"
  | "reaction"
  | "stats"
  | "none";

export const LOG_HANDLER_GROUPS = {
  // projectile casts / hits
  damage_cast: "projectile_cast",
  damage_hit: "projectile_hit",
  heal_cast: "projectile_cast",
  heal_hit: "projectile_hit",
  shield_cast: "projectile_cast",
  shield_hit: "projectile_hit",
  poison_cast: "projectile_cast",
  poison_hit: "projectile_hit",
  timeout_damage_cast: "projectile_cast",
  timeout_damage_hit: "projectile_hit",
  // status casts / hits (arcane missiles)
  regen_cast: "status_cast",
  regen_hit: "status_hit",
  haste_cast: "status_cast",
  haste_hit: "status_hit",
  slow_cast: "status_cast",
  slow_hit: "status_hit",
  charge_cast: "status_cast",
  charge_hit: "status_hit",
  silence_cast: "status_cast",
  silence_hit: "status_hit",
  dispel_cast: "status_cast",
  dispel_hit: "status_hit",
  // status ends
  haste_end: "status_end",
  slow_end: "status_end",
  silence_end: "status_end",
  silence_skip: "status_end",
  // periodic ticks
  poison_tick: "tick",
  regen_tick: "tick",
  // immediate effects
  increase_power: "power",
  decrease_power: "power",
  // reactions / stats
  reaction: "reaction",
  combat_stats: "stats",
  // meta / no FX
  increase_critical: "none",
  storm_start: "none",
  outcome: "none",
  runaway_combat: "none",
} satisfies Record<CombatLogEntry["type"], LogHandlerGroup>;

/** The playback-handler family a log entry routes to. */
export const getLogHandlerGroup = (log: CombatLogEntry): LogHandlerGroup =>
  LOG_HANDLER_GROUPS[log.type];

/** Exactly the log types classified as `none` (deriveable from the mapping). */
export type NoneFxLogType = {
  [T in CombatLogEntry["type"]]: (typeof LOG_HANDLER_GROUPS)[T] extends "none"
    ? T
    : never;
}[CombatLogEntry["type"]];

/** Log types that need no FX playback handler (the `none` group). */
export const NO_FX_LOG_TYPES: readonly NoneFxLogType[] = (
  Object.entries(LOG_HANDLER_GROUPS) as [
    CombatLogEntry["type"],
    LogHandlerGroup,
  ][]
)
  .filter((entry): entry is [NoneFxLogType, "none"] => entry[1] === "none")
  .map(([type]) => type);
