import type { SessionData } from "../types/session";

export type RunCompleteOptions = {
  wins?: number;
  losses?: number;
};

export function buildRunCompleteSession(
  current: SessionData,
  phase: "game_over" | "victory",
  opts: RunCompleteOptions,
): SessionData {
  const wins =
    opts.wins ??
    (current.wins > 0 ? current.wins : phase === "victory" ? 12 : 6);
  const losses =
    opts.losses ??
    (phase === "game_over" ? Math.max(current.losses, 4) : current.losses);

  return {
    ...current,
    id: current.id || "debug_session",
    phase,
    wins,
    losses,
    seed: current.seed || "debug-seed-0000-0000",
    initial_seed: current.initial_seed || "debug-seed-0000-0000",
    runStats: current.runStats || {
      damageDealt: 123456,
      poisonDealt: 2345,
      shieldDealt: 6789,
      regenDealt: 4567,
      healDealt: 9876,
      mostPowerfulUnit: { cardId: "mana_crystal", power: 999 },
      totalUnitsRecruited: 14,
      unitUsage: {},
    },
    combatState: undefined,
  };
}
