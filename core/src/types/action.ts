/**
 * Action types — player actions, phase options, and action responses.
 */

import type { CombatState } from "./combat";
import type { SessionData } from "./session";
import type { Unit } from "./unit";

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
  | "gold_shop";

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
  | "absorb_power_orb";

/**
 * A player choice presented during a phase.
 *
 * Encounter options carry an encounter id; shop options carry a card id
 * (dynamic, so `string`); static options carry a fixed `StaticOptionId`.
 */
export type PhaseOption =
  | { id: EncounterId; cost?: number; label?: string; recruitRank?: number }
  | { id: string; cost: number; recruitRank: number }
  | { id: StaticOptionId };

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
