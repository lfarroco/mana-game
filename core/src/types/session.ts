/**
 * Session and run-related types.
 */

import type { CombatState } from "./combat";
import type { Unit } from "./unit";

/**
 * Every phase a session can be in, as a runtime list.
 *
 * `PhaseType` is derived from it so the union and the runtime list can never
 * drift. The list is the single source of truth for two checks:
 *   - `session/sessionStore` rejects a persisted save whose phase is not here
 *     (an unrenderable phase used to load and then freeze the run);
 *   - the client asserts it declares a renderer for every entry (a phase the
 *     client does not know silently no-ops in `PhaseController.go`).
 *
 * Client-only view states (combat_victory / combat_defeat) are deliberately
 * absent: they are never written to a session.
 */
export const PHASE_TYPES = [
  "encounter",
  "shop",
  "orb_shop",
  "upgrade_core",
  "add_reaction_core",
  "awaken",
  "pre_combat",
  "combat",
  "victory",
  "game_over",
] as const;

export type PhaseType = (typeof PHASE_TYPES)[number];

export type RunStats = {
  damageDealt: number;
  poisonDealt: number;
  shieldDealt: number;
  regenDealt: number;
  healDealt: number;
  mostPowerfulUnit: { cardId: string; power: number } | null;
  totalUnitsRecruited: number;
  unitUsage: Record<string, number>;
};

export type MultiplayerQueueType = "casual" | "ranked";

export type SessionType =
  | { type: "singleplayer" }
  | { type: "multiplayer"; queueType: MultiplayerQueueType };

export type ActionLogEntry = {
  action: string;
  payload?: Record<string, unknown>;
  timestamp: number;
};

export type SessionData = {
  id: string;
  player_id: string;
  session_type: SessionType;
  phase: PhaseType;
  round: number;
  step: number;
  seed: string;
  initial_seed: string;
  options: PhaseOption[];
  team: { units: Unit[] };
  wins: number;
  losses: number;
  action_log: ActionLogEntry[];
  encounter_history?: string[];
  runStats?: RunStats;
  updated_at?: Date;
  combatState?: CombatState;
  /** The unit currently being awakened (phase "awaken") — cleared once the
   *  player picks a power. Set by SessionTransitions when a bronze-origin
   *  unit is promoted to gold. */
  awakenUnitId?: string;
};

// Re-exported below to avoid circular: PhaseOption needs SessionData for combatState
import type { PhaseOption } from "./action";

export type PhaseOptions = {
  phase: PhaseType;
  round: number;
  options: PhaseOption[];
  combatState?: CombatState;
  team?: { units: Unit[] };
  wins?: number;
  losses?: number;
  runStats?: RunStats;
};
