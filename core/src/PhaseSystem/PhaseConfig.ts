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
