import { CombatLogEntry } from "@Core/Combat/ServerCombatEffects";
import { Unit } from "@Models/Entities/Unit";
import { PhaseOption } from "@Core/Types";

// TODO: candidate for deletion

// TODO: those types are not multiplayer specific... check for duplicated logic in server
export type MultiplayerQueueType = "casual" | "ranked";

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
		enemyPlayerName?: string;
	};
	team?: {
		units: Unit[];
	};
	wins?: number;
	losses?: number;
}


export type PlayerProfile = {
	id: string;
	username: string;
	rating: number;
	matches_played: number;
};

export type RankedPlayer = Pick<PlayerProfile, "id" | "username" | "rating" | "matches_played">;

export type RankedPlayersPage = {
	players: RankedPlayer[];
	page: number;
	hasNextPage: boolean;
};
