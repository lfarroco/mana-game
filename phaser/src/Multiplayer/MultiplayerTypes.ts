export type PhaseType = "encounter" | "shop" | "orb_shop" | "upgrade_core" | "add_reaction_core" | "combat" | "victory" | "game_over";

export interface PhaseOptions {
	phase: PhaseType;
	options: any[]; // Specific options depending on phase
	combatState?: {
		enemyTeam: any;
		logs: any[];
		seed: string;
		units: any[]; // Include units here for full sync if needed
	};
	team?: {
		units: any[];
	};
	wins?: number;
	losses?: number;
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
