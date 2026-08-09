/**
 * Session and run-related types.
 */

import type { CombatState } from "./combat";
import type { Unit } from "./unit";

export type PhaseType =
  | "encounter"
  | "shop"
  | "orb_shop"
  | "upgrade_core"
  | "add_reaction_core"
  | "pre_combat"
  | "combat"
  | "victory"
  | "game_over";

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
