/** Formation difficulty levels */
export enum FormationDifficulty {
	Easy = 'easy',
	Medium = 'medium',
	Hard = 'hard'
}

/** Metadata for a battle formation */
export interface FormationMetadata {
	/** Display name of the formation */
	name: string;
	/** Brief description of the formation strategy */
	description: string;
	/** Relative difficulty of the formation */
	difficulty: FormationDifficulty;
	/** Minimum round where this formation should appear */
	minRound?: number;
}

/** A complete formation template with its metadata */
export interface FormationTemplate {
	/** The actual formation layout */
	pattern: string[];
	/** Additional information about the formation */
	metadata: FormationMetadata;
}

/** Collection of formation templates by team size */
export interface FormationCollection {
	[teamSize: number]: FormationTemplate[];
}

/**
 * Pre-defined formation templates for different team sizes.
 * Each formation includes a pattern and metadata about its intended use.
 */
export const FORMATION_TEMPLATES: FormationCollection = {
	2: [
		{
			pattern: [
				".r.",
				"...",
				".m."
			],
			metadata: {
				name: "Basic Ranged-Melee",
				description: "A balanced formation with ranged support and melee frontline",
				difficulty: FormationDifficulty.Easy
			}
		},
		{
			pattern: [
				"...",
				"...",
				"m.m"
			],
			metadata: {
				name: "Dual Melee Flanks",
				description: "Two melee units attacking from the sides",
				difficulty: FormationDifficulty.Easy
			}
		},
		{
			pattern: [
				"r.r",
				"...",
				"..."
			],
			metadata: {
				name: "Double Ranged",
				description: "Two ranged units providing covering fire",
				difficulty: FormationDifficulty.Medium,
				minRound: 2
			}
		}
	],
	3: [
		{
			pattern: [
				"...",
				"...",
				"mmm"
			],
			metadata: {
				name: "Triple Melee Wall",
				description: "Three melee units forming a defensive line",
				difficulty: FormationDifficulty.Medium,
				minRound: 2
			}
		},
		{
			pattern: [
				"r.r",
				".r.",
				"..."
			],
			metadata: {
				name: "Triangle Ranged",
				description: "Three ranged units in triangle formation",
				difficulty: FormationDifficulty.Hard,
				minRound: 3
			}
		},
		{
			pattern: [
				"...",
				".t.",
				"m.m"
			],
			metadata: {
				name: "Protected Flanks",
				description: "Tank in center with melee support on sides",
				difficulty: FormationDifficulty.Medium
			}
		},
		{
			pattern: [
				"r.r",
				"...",
				".s."
			],
			metadata: {
				name: "Supported Rangers",
				description: "Two ranged units with support backup",
				difficulty: FormationDifficulty.Hard,
				minRound: 4
			}
		}
	],
	4: [
		{
			pattern: [
				"r.r",
				"...",
				"m.m"
			],
			metadata: {
				name: "Balanced Quad",
				description: "Two ranged and two melee units in balanced formation",
				difficulty: FormationDifficulty.Medium,
				minRound: 3
			}
		},
		{
			pattern: [
				"rrr",
				"...",
				".m."
			],
			metadata: {
				name: "Ranged Superiority",
				description: "Three ranged units supported by one melee",
				difficulty: FormationDifficulty.Hard,
				minRound: 5
			}
		}
	],
	5: [
		{
			pattern: [
				"r.m",
				"..m",
				"r.m"
			],
			metadata: {
				name: "Mixed Line",
				description: "Alternating ranged and melee units",
				difficulty: FormationDifficulty.Hard,
				minRound: 6
			}
		},
		{
			pattern: [
				"r.m",
				"r..",
				"r.m"
			],
			metadata: {
				name: "Ranged Wall",
				description: "Three ranged units with melee protection",
				difficulty: FormationDifficulty.Hard,
				minRound: 7
			}
		}
	]
};
