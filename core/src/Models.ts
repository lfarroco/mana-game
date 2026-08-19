/**
 * Models.ts — backward-compatible re-export shim.
 *
 * All type definitions have been moved to the types/ directory, organized by domain:
 *   types/card.ts     — CardDefinition, CardCollection
 *   types/combat.ts   — CombatState, CombatEnvironment, CombatSystemStates, DeferredEvent, WaveOutcome
 *   types/effect.ts   — Effect, EffectReaction, EffectSourcePosition, EffectId
 *   types/targeting.ts— Targeting
 *   types/unit.ts     — Unit
 *   types/session.ts  — SessionData, SessionType, PhaseType, RunStats, ActionLogEntry, PhaseOptions
 *   types/action.ts   — Action, PhaseOption, ActionResponse
 *   types/player.ts   — PlayerProfile, RankedPlayer, RankedPlayersPage, MultiplayerQueueType
 *   types/server.ts   — GameServer
 *
 * Prefer importing from types/ directly for new code.
 * This file exists so existing imports (both core/ and phaser/) continue to work.
 */

export type * from "./types/index";
export { CARD_TAGS, CORE_THEMES } from "./types/index";
export { type Event, createEvent } from "./Event";

// Runtime constants (values, not types) that are still used via Models import
/**
 * Effect IDs that can trigger reactions on the unit that performed the effect.
 *
 * Normally, a unit cannot react to its own effects (processReactions excludes the
 * triggering unit from candidates). Global reactions bypass this restriction.
 *
 * IMPORTANT: When adding a new global reaction ID to the EffectId union type,
 * you MUST also add it here and wire its trigger site (e.g. on_crit is triggered
 * in dealDamage/restoreLife/addShield; threshold reactions are triggered in
 * CombatRunner via CombatStatsTracker.getCrossedThresholds).
 */
export const GLOBAL_REACTIONS = [
  "on_crit",
  "every_100_damage",
  "every_100_shield",
  "every_100_heal",
  "every_10_poison",
  "every_10_regen",
  "on_over_heal",
  "on_battle_start",
];

export const BASIC_ABILITIES = ["damage", "shield", "poison", "regen", "heal"];
