import * as Models from "../Models";

// TODO: after round 10, stop adding upgrades
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
	const phase = nextPhase ? nextPhase : getPhaseForTurn(session.round, session.step);

	session.phase = phase;
	session.options = [];
}

export function getPhaseForTurn(round: number, step: number): Models.PhaseType {
	const roundPhases = ROUND_PHASES[round] || DEFAULT;
	return roundPhases[step];
}
