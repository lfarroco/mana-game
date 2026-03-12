import { Unit } from "@Models/Entities/Unit";
import { CombatLogEntry } from "@Scenes/Battleground/ServerCombatEffects";

// Option types for different phases
export type PhaseOption =
	| { id: string; cost?: number; label?: string } // Generic option with optional cost and label
	| { id: "combat_encounter" } // Pre-combat warning option
	| { id: "combat_done"; label: string }; // Post-combat continue option

// Action log entry for tracking player actions
export type ActionLogEntry = {
	round: number;
	phase: PhaseType;
	step: number;
	actionId: string;
	payload?: ActionPayload;
};

// Payload types for different actions
export type ActionPayload =
	| { orbId: string; targetUnitId: string } // orb shop actions
	| { unitId: string } // discard unit action
	| { team: { units: Unit[] } } // team update
	| Record<string, unknown>; // other generic payloads

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
	logs: CombatLogEntry[];
	seed: string;
	wonCombat?: boolean;
	finalPlayerUnits?: Unit[];
	initialUnits?: Unit[];
};

export type PhaseOptions = {
	phase: PhaseType;
	round: number;
	options: PhaseOption[];
	combatState?: CombatState;
	team?: { units: Unit[] };
	wins?: number;
	losses?: number;
	runStats?: RunStats;
};

export type RunStats = {
	damageDealt: number;
	poisonDealt: number;
	shieldDealt: number;
	regenDealt: number;
	healDealt: number;
	mostPowerfulUnit: { cardId: string; power: number } | null;
	totalUnitsRecruited: number;
	unitUsage: Record<string, number>;
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
	current_options: PhaseOption[] | { options: PhaseOption[]; combatState?: CombatState } | null;
	team: { units: Unit[] };
	wins: number;
	losses: number;
	action_log: ActionLogEntry[];
	encounter_history?: string[]; // Track all shown encounters (for non-repetition logic)
	runStats?: RunStats;
	updated_at?: Date;
};
