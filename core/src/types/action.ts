/**
 * Action types — player actions, phase options, and action responses.
 */

import type { CombatState } from "./combat";
import type { SessionData } from "./session";
import type { Unit } from "./unit";
import type { CoreUpgradeOrbId } from "../content/coreUpgradeOrbs";

/**
 * Known encounter identifiers used as PhaseOption ids.
 * Card shop options use dynamic card IDs (string), so the union
 * intentionally allows arbitrary strings for that branch.
 */
export type EncounterId =
  | "upgrade_unit"
  | "armory"
  | "healing_tent"
  | "frontier_fort"
  | "forest_pools"
  | "toxic_chamber"
  | "trial_circuit"
  | "trappers_guild"
  | "thunder_spire"
  | "commanders_tent"
  | "assassins_hideout"
  | "power_distributor"
  | "power_absorber"
  | "silver_shop"
  | "gold_shop"
  // ── New encounter types (2026-08-18, P1 slice) ──────────────────────
  | "gamblers_shrine"
  | "dark_ritual"
  | "scrap_salvage"
  | "rest_inn"
  | "soul_trade"
  | "runesmith_damage"
  | "runesmith_shield"
  | "runesmith_heal"
  // ── Wacky content slice (2026-08-19, Tier A encounters) ─────────────
  // NOTE: `oracles_riddle` was pulled from the pool (2026-08-25) pending
  // rework; `chaos_altar` (random orb) was removed (2026-08-26) — it gave
  // the player no feedback, needs a roulette-style reveal to return.
  | "roulette_wheel"
  // ── Roulette wheel results (A11 redesign, 2026-08-21) ───────────────
  | "roulette_gold_shop"
  | "roulette_core_power"
  | "roulette_core_reaction"
  | "roulette_upgrade_orb";

/** Static phase-option ids not derived from encounters or cards. */
export type StaticOptionId =
  | "start_combat"
  | "end_combat"
  | "victory"
  | "increase_core_max_life"
  | "upgrade_core_power"
  | "decrease_core_cooldown"
  | "on_100_damage_effect"
  | "on_crit_effect"
  | "on_battle_start_effect"
  | "upgrade_orb"
  | "distribute_power_orb"
  | "absorb_power_orb"
  | "sacrifice_effect_orb"
  | "sacrifice_unit_orb"
  | "scrap_salvage_orb";

/**
 * A player choice presented during a phase.
 *
 * Encounter options carry an encounter id; shop options carry a card id
 * (dynamic, so `string`); static options carry a fixed `StaticOptionId`;
 * core-upgrade options (CUB-B1) carry a `CoreUpgradeOrbId`.
 */
export type PhaseOption =
  | { id: EncounterId; cost?: number; label?: string; recruitRank?: number }
  | { id: string; cost: number; recruitRank: number }
  | { id: StaticOptionId }
  | { id: CoreUpgradeOrbId };

export type Action =
  | { type: "skip" }
  | { type: "apply_orb"; orbId: string; targetUnitId: string }
  | { type: "increase_core_max_life" }
  | { type: "upgrade_core_power" }
  | { type: "decrease_core_cooldown" }
  | { type: "discard_unit"; unitId: string }
  | {
      type: "recruit_unit";
      unitId: string;
      targetSlot: [number, number] | null;
    }
  | { type: "update_team"; team: { units: Unit[] } }
  | { type: "start_combat" }
  | { type: "end_combat" }
  | { type: "select_encounter"; encounterId: string }
  | { type: "victory" };

/**
 * Result of an action dispatch.
 * Carries updated session and optional phase-specific data (e.g., combat results).
 */
export type ActionResponse = {
  session: SessionData;
  combatState?: CombatState;
};
