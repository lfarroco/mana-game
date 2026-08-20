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
  /**
   * E1 (docs/new-encounter-types.md): favor tokens earned by skipping
   * encounters. At `FAVOR_TOKENS_FOR_SILVER_SHOP` the next encounter options
   * guarantee a `silver_shop` option; tokens are consumed when the player picks
   * it. Optional so existing saved sessions default to zero.
   */
  favorTokens?: number;
  /**
   * A12 (docs/wacky-content-plan.md): the player visited the Lucky Pig — the
   * next `skip` pays `LUCKY_PIG_FAVOR_GAIN` tokens instead of +1. Cleared on
   * the skip that spends it.
   */
  luckyPigRound?: boolean;
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
