import { Unit } from "../Models/Entities/Unit";

export type PhaseType =
	| "encounter"
	| "shop"
	| "orb_shop"
	| "upgrade_core"
	| "add_reaction_core"
	| "combat"
	| "victory"
	| "game_over";

export type CombatState = {
	enemyTeam: Unit[];
	units: Unit[];
	logs: any[];
	seed: string;
	wonCombat?: boolean;
	finalPlayerUnits?: Unit[];
	initialUnits?: Unit[];
};

export type PhaseOptions = {
	phase: PhaseType;
	round: number;
	options: any[];
	combatState?: CombatState;
	team?: { units: Unit[] };
	wins?: number;
	losses?: number;
};

// Session state (exists in both SP and MP)
export type SessionData = {
	id: string;
	player_id: string;
	phase: PhaseType;
	round: number;
	step: number;
	seed: string;
	initial_seed: string;
	current_options: any;
	team: { units: Unit[] };
	wins: number;
	losses: number;
	action_log: any[];
	updated_at?: Date;
};
