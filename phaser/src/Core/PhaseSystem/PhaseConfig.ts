import { PhaseType } from "@Core/Types";

export const ROUND_PHASES: Record<number, PhaseType[]> = {
	1: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	2: ["encounter", "encounter", "encounter", "combat", "add_reaction_core"],
	3: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	4: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	5: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	6: ["encounter", "encounter", "encounter", "combat", "add_reaction_core"],
	7: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	8: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	9: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	10: ["encounter", "encounter", "encounter", "combat", "add_reaction_core"],
	11: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	12: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	13: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	14: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
	15: ["encounter", "encounter", "encounter", "combat", "upgrade_core"],
};

export const DEFAULT_ROUND_PHASES: PhaseType[] = [
	"encounter",
	"encounter",
	"encounter",
	"combat",
	"upgrade_core",
];

export function getPhaseForTurn(round: number, step: number): PhaseType {
	const stepIndex = step - 1;
	const roundPhases = ROUND_PHASES[round] || DEFAULT_ROUND_PHASES;
	return roundPhases[stepIndex];
}
