import { CombatLogEntry } from "@Scenes/Battleground/ServerCombatEffects";
import { Unit } from "@Models/Entities/Unit";
import { PhaseOption } from "@Core/Types";

export type PhaseType =
	| "encounter"
	| "shop"
	| "orb_shop"
	| "upgrade_core"
	| "add_reaction_core"
	| "combat"
	| "victory"
	| "game_over";

export interface PhaseOptions {
	phase: PhaseType;
	round?: number;
	options: PhaseOption[]; // Specific options depending on phase
	combatState?: {
		enemyTeam: Unit[];
		logs: CombatLogEntry[];
		seed: string;
		units: Unit[]; // Include units here for full sync if needed
	};
	team?: {
		units: Unit[];
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
