export type PhaseType = "encounter" | "shop" | "upgrade_core" | "add_reaction_core" | "combat";

export interface PhaseOptions {
	phase: PhaseType;
	options: any[]; // Specific options depending on phase
}

// For Encounter Phase
export interface EncounterOption {
	id: string;
	// Potentially other server-sent data like custom description override
}

// For Shop Phase
export interface ShopOption {
	id: string; // "card:archer" etc
	cost: number;
}
