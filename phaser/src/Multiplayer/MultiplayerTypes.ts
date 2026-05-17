import { CombatLogEntry } from "@Core/Combat/ServerCombatEffects";
import { Unit } from "@Models/Entities/Unit";
import { PhaseOption } from "@Core/Types";

export type MultiplayerQueueType = "casual" | "ranked";
export type MultiplayerSessionType = `multiplayer_${MultiplayerQueueType}`;

export const toMultiplayerSessionType = (
	queueType: MultiplayerQueueType
): MultiplayerSessionType => `multiplayer_${queueType}`;

export const parseMultiplayerQueueType = (
	sessionType?: string | null
): MultiplayerQueueType | null => {
	if (sessionType === "multiplayer_casual") {
		return "casual";
	}

	if (sessionType === "multiplayer_ranked") {
		return "ranked";
	}

	return null;
};

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
