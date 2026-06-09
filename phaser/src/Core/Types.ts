import * as Unit from "@Models/Entities/Unit";
import * as ServerCombatEffects from "@Core/Combat/ServerCombatEffects";

// Option types for different phases
export type PhaseOption =
	| { id: string; cost?: number; label?: string; recruitRank?: number } // Generic option with optional cost, label, and shop recruit metadata
	| { id: "combat_encounter" }
	| { id: "end_combat" } // the combat result is in the sesion's combat state
	;

export type CombatContinuation = Omit<SessionData, "combatState">;

// Action log entry for tracking player actions
export type ActionLogEntry = {
	round: number;
	phase: PhaseType;
	step: number;
	action: Action;
};

// Payload types for different actions
export type Action =
	| { type: "skip" }
	| { type: "apply_orb"; orbId: string; targetUnitId: string }
	| { type: "increase_core_max_life" }
	| { type: "upgrade_core_power" }
	| { type: "decrease_core_cooldown" }
	| { type: "discard_unit"; unitId: string }
	| { type: "recruit_unit"; unitId: string; targetSlot: Vec2 | null }
	| { type: "update_team"; team: { units: Unit.Unit[] } }
	| { type: "combat_encounter" } // can use "select_encounter" with a single option
	| { type: "start_combat" }
	| { type: "end_combat" }
	| { type: "select_encounter"; encounterId: string; }
	| { type: "victory" }
	;

export type PhaseType =
	| "encounter"
	| "shop"
	| "orb_shop"
	| "upgrade_core"
	| "add_reaction_core"
	| "combat"
	| "combat_encounter"
	| "victory"
	| "game_over";

export type CombatState = {
	enemyTeam: Unit.Unit[];
	units: Unit.Unit[];
	logs: ServerCombatEffects.CombatLogEntry[];
	seed: string;
	enemyPlayerName: string;
	wonCombat: boolean;
	finalPlayerUnits: Unit.Unit[];
	initialUnits: Unit.Unit[];
};

export type PhaseOptions = {
	phase: PhaseType;
	round: number;
	options: PhaseOption[];
	combatState?: CombatState;
	team?: { units: Unit.Unit[] };
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
	session_type: SessionType;
	phase: PhaseType;
	round: number;
	step: number;
	seed: string;
	initial_seed: string;
	options: PhaseOption[]; // IDEA: use to list allowed actions (including 'update_team')
	team: { units: Unit.Unit[] };
	wins: number;
	losses: number;
	action_log: ActionLogEntry[];
	encounter_history?: string[]; // Track all shown encounters (for non-repetition logic)
	combatState?: CombatState;
	runStats?: RunStats;
	updated_at?: Date;
};

// ---------------------------------------------------------------------------
// Deferred run-submission types (deterministic server replay)
// ---------------------------------------------------------------------------

/**
 * A single recorded player action with its sequence position.
 * `sequence` is a monotonically increasing integer starting at 1, assigned by
 * the client action queue so the server can detect gaps or duplicates.
 *
 * `teamSnapshot` captures the board arrangement at the moment the decision was
 * made.  It is applied by the server before replaying the action so that unit
 * positioning (which doesn't advance the RNG seed and is never stored as a
 * separate action) is correctly reflected during replay.
 */
export type ActionEnvelope = {
	sequence: number;
	action: Action;
	/** Board state at the moment this decision was taken. */
	teamSnapshot?: { units: Unit.Unit[] };
};

/**
 * A full run manifest that can be submitted to the server for deterministic
 * replay.  The server reconstructs a fresh session from `initialSeed` and
 * `selectedCrystalId`, then replays every action in `actions` in order.
 */
export type RunManifest = {
	/** Stable identifier for this run; used for idempotency. */
	runId: string;
	playerId: string;
	selectedCrystalId: string;
	/** The exact seed that `createInitialSession` must use for replay. */
	initialSeed: string;
	/** Semver string of the client build; the server can reject unknown versions. */
	clientVersion: string;
	actions: ActionEnvelope[];
};

/**
 * Normalized snapshot of the final session state after a replay.
 * Used as the canonical comparison contract between client and server.
 */
export type ReplaySnapshot = {
	phase: PhaseType;
	round: number;
	step: number;
	wins: number;
	losses: number;
	seed: string;
	teamUnitIds: string[]; // sorted cardId list — order-independent identity
};

export type SessionType =
	{ type: "singleplayer" } |
	{ type: "multiplayer", queueType: MultiplayerQueueType };

type MultiplayerQueueType = "casual" | "ranked";