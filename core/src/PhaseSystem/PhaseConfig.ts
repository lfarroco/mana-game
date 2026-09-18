import * as Models from "../Models";
import { INFINITE_MODE_THRESHOLD } from "../math/Constants";

/** Core phase rotation: encounters → combat → upgrade core. Used for rounds 1-15. */
const DEFAULT: Models.PhaseType[] = [
  "encounter",
  "encounter",
  "encounter",
  "pre_combat",
  "combat",
  "upgrade_core",
];

const ADD_REACTION_PHASES: Models.PhaseType[] = [
  "encounter",
  "encounter",
  "encounter",
  "pre_combat",
  "combat",
  "add_reaction_core",
];

/** Infinite mode (round > 10): no more upgrade or add-reaction phases. */
const INFINITE_MODE_PHASES: Models.PhaseType[] = [
  "encounter",
  "encounter",
  "encounter",
  "pre_combat",
  "combat",
];

export const ROUND_PHASES: Record<number, Models.PhaseType[]> = {
  1: DEFAULT,
  2: ADD_REACTION_PHASES,
  3: DEFAULT,
  4: DEFAULT,
  5: DEFAULT,
  6: ADD_REACTION_PHASES,
  7: DEFAULT,
  8: DEFAULT,
  9: DEFAULT,
  10: ADD_REACTION_PHASES,
  11: DEFAULT,
  12: DEFAULT,
  13: DEFAULT,
  14: DEFAULT,
  15: DEFAULT,
};

export function advanceToNextPhase(session: Models.SessionData) {
  const nextPhase = getPhaseForTurn(session.round, session.step + 1);
  if (!nextPhase) {
    session.step = 0;
    session.round += 1;
  } else {
    session.step += 1;
  }
  const phase = nextPhase
    ? nextPhase
    : getPhaseForTurn(session.round, session.step);

  session.phase = phase;
  session.options = [];
}

export function getPhaseForTurn(round: number, step: number): Models.PhaseType {
  const roundPhases =
    ROUND_PHASES[round] ||
    (round > INFINITE_MODE_THRESHOLD ? INFINITE_MODE_PHASES : DEFAULT);
  return roundPhases[step];
}

/**
 * The phases that offer a core upgrade (the themed three-orb choice for the
 * player's crystal). `add_reaction_core` is the reaction-flavoured window but
 * presents the same themed pool — see `generateCoreUpgradeOptions`.
 */
export const CORE_UPGRADE_PHASES: readonly Models.PhaseType[] = [
  "upgrade_core",
  "add_reaction_core",
];

export const isCoreUpgradePhase = (phase: Models.PhaseType): boolean =>
  CORE_UPGRADE_PHASES.includes(phase);

/** Last round with an authored phase rotation — round 16+ is pure Infinite mode. */
export const LAST_AUTHORED_ROUND = Math.max(
  ...Object.keys(ROUND_PHASES).map(Number),
);

/** Total core-upgrade windows in an authored run (rounds 1–`LAST_AUTHORED_ROUND`). */
export const TOTAL_CORE_UPGRADE_WINDOWS = Object.values(ROUND_PHASES).reduce(
  (total, phases) => total + phases.filter(isCoreUpgradePhase).length,
  0,
);

/**
 * How many core-upgrade windows remain from `(round, step)`, counting the
 * window the session is currently parked on (so a player standing in their
 * first shop sees the full total, and standing in their last sees 1).
 *
 * Zero from round 16 on: Infinite mode drops the `upgrade_core` /
 * `add_reaction_core` phases, which players perceived as the shop "randomly
 * stopping" — the HUD now shows the countdown so the end is visible.
 */
export function remainingCoreUpgradeWindows(
  round: number,
  step: number,
): number {
  if (round > LAST_AUTHORED_ROUND) return 0;

  let remaining = 0;
  for (let r = Math.max(1, round); r <= LAST_AUTHORED_ROUND; r++) {
    const phases = ROUND_PHASES[r] ?? DEFAULT;
    const fromStep = r === round ? Math.max(0, step) : 0;
    for (let s = fromStep; s < phases.length; s++) {
      if (isCoreUpgradePhase(phases[s])) remaining += 1;
    }
  }
  return remaining;
}
