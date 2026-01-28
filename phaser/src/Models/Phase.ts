
export const loopPhases: string[] = [
	"encounter",
	"encounter",
	"encounter",
	"combat",
	"upgrade_core"
];

// This will repeat the loop logic for the first 15 turns for now,
// but can be customized with specific phases.
export const predefinedPhases: string[] = [
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "add_reaction_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "add_reaction_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "add_reaction_core",
];


export const hourAction = loopPhases; // Alias for backward compatibility if needed temporarily

export function getPhaseForHour(hour: number): string {
	if (hour < predefinedPhases.length) {
		return predefinedPhases[hour];
	}

	// For hours beyond the predefined list, use the loop
	// We subtract the predefined length so the loop starts from index 0
	const loopIndex = (hour - predefinedPhases.length) % loopPhases.length;
	return loopPhases[loopIndex];
}