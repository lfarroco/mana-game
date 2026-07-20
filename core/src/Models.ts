import * as CombatLogger from "./Combat/CombatLogger";
import type * as CombatSystemStates from "./Combat/CombatSystemStates";
import type * as ScheduledEffects from "./Combat/ScheduledEffects";

export type WaveOutcome = "player_won" | "player_lost" | "both_won";

/**
 * The pure-data combat environment passed through trigger effects and systems.
 * Contains only state, combat system states, logger, scheduled effects, and reaction processing.
 * Visual effects are NOT part of this env — they are handled separately by
 * CombatPlaybackController during client-side playback.
 */
export type CombatEnvironment = {
	seed: string; // mutable seed, advanced during combat for deterministic RNG
	combatState: CombatState;
	combatStates: CombatSystemStates.CombatSystemStates;
	logger: CombatLogger.CombatLogger;
	scheduledEffects: ScheduledEffects.ScheduledEffectsState;
};

export type CardCollection = {
	id: string;
	name: string;
	cards: CardDefinition[];
};
/**
 * Defines the "blueprint" or "specification" for a game entity (often a character or creature).
 * It holds all the static, inherent properties of a type of unit, such as its name,
 * visual appearance (pic), base stats (attack, defense, cooldown).
 * A `CardDefinition` is used to create `Unit` instances.
 */

export type CardDefinition = {
	id: string;
	pic: string;
	power?: number;
	cooldown: number;
	effects: Effect[];
	reactions: EffectReaction[];
	isCore?: boolean;
	locked?: boolean;
	rank?: number;
	life?: number;
	critical?: number;
}; export type EffectReaction = {
	position: EffectSourcePosition;
	effectId: EffectId | "all";
	effects: Effect[];
};
export type Effect = {
	id: "damage";
} |
{
	id: "heal";
} |
{
	id: "shield";
} |
{
	id: "poison";
} |
{
	id: "regen";
} |
{
	id: "haste";
	duration: number;
	targets: Targeting;
} |
{
	id: "slow";
	duration: number;
	targets: Targeting;
} |
{
	id: "charge";
	duration: number;
	targets: Targeting;
} |
{
	id: "increase_power";
	amount: number;
	permanent?: boolean;
	targets: Targeting;
} |
{
	id: "decrease_power";
	amount: number;
	permanent?: boolean;
	targets: Targeting;
} |
{
	id: "multiply_power";
	multiplier: number;
	baseMultiplier: number;
	targets: Targeting;
} |
{
	id: "increase_critical";
	amount: number;
	permanent?: boolean;
	targets: Targeting;
} |
{
	id: "distribute_power";
	targets: Targeting;
	permanent?: boolean;
} |
{
	id: "absorb_power";
	targets: Targeting;
	permanent?: boolean;
} |
{
	id: "sacrifice_effect";
	targets: Targeting;
} |
{
	id: "re_hasted";
} |
{
	id: "re_slow";
} |
{
	id: "on_crit";
} |
{
	id: "every_100_damage";
} |
{
	id: "every_100_shield";
} |
{
	id: "every_100_heal";
} |
{
	id: "every_10_poison";
} |
{
	id: "every_10_regen";
} |
{
	id: "on_over_heal";
} |
{
	id: "on_battle_start";
};
export type EffectSourcePosition = "all" |
	"allies" |
	"enemies" |
	"row_allies" |
	"column_allies" |
	"top_ally" |
	"bottom_ally" |
	"left_ally" |
	"right_ally" |
	"self";
export type Targeting = {
	id: "self";
} |
{
	id: "random_ally";
	count: number;
} |
{
	id: "random_enemy";
	count: number;
} |
{
	id: "row_allies";
} |
{
	id: "column_allies";
} |
{
	id: "all_allies";
	ofType: "any" | "damage" | "heal" | "shield" | "poison" | "regen";
} |
{
	id: "all_enemies";
} |
{
	id: "strongest_enemy";
} |
{
	id: "weakest_enemy";
} |
{
	id: "strongest_ally";
} |
{
	id: "weakest_ally";
} |
{
	id: "top_ally";
} |
{
	id: "bottom_ally";
} |
{
	id: "left_ally";
} |
{
	id: "right_ally";
} |
{
	id: "trigger";
};
export type EffectId = "damage" |
	"heal" |
	"shield" |
	"poison" |
	"regen" |
	"haste" |
	"slow" |
	"slow" |
	"charge" |
	"increase_power" |
	"decrease_power" |
	"multiply_power" |
	"increase_critical" |
	"distribute_power" |
	"absorb_power" |
	"sacrifice_effect" |
	"re_hasted" |
	"re_slow" |
	"on_crit" |
	"every_100_damage" |
	"every_100_shield" |
	"every_100_heal" |
	"every_10_poison" |
	"every_10_regen" |
	"on_over_heal" |
	"on_battle_start";
export const GLOBAL_REACTIONS = [
	"on_crit",
	"every_100_damage",
	"every_100_shield",
	"every_100_heal",
	"every_10_poison",
	"every_10_regen",
	"on_over_heal",
	"on_battle_start",
];
export const BASIC_ABILITIES = ["damage", "shield", "poison", "regen", "heal"];
export type Unit = {
	id: string;
	cardId: string;
	pic: string;
	force: string;
	position: [number, number]; // TODO: migrate to Vec2

	rank: number;

	power: number;
	bonusPower: number;

	critical?: number;
	bonusCritical?: number;

	// Core attributes
	life: number;
	maxLife: number;
	shield: number;
	cooldown: number;
	evade: number;

	effects: Effect[];
	reactions: EffectReaction[];

	charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
	refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

	hasted: number;
	slowed: number;

	isCore: boolean;
};
// Option types for different phases



export type PhaseOption =
	// TODO: this is too flexible
	{ id: string; cost?: number; label?: string; recruitRank?: number; } // Generic option with optional cost, label, and shop recruit metadata
	|
	{ id: "start_combat"; };
// Action log entry for tracking player actions



export type ActionLogEntry = {
	round: number;
	phase: PhaseType;
	step: number;
	action: Action;
};
// Payload types for different actions



export type Action = { type: "skip"; } |
{ type: "apply_orb"; orbId: string; targetUnitId: string; } |
{ type: "increase_core_max_life"; } |
{ type: "upgrade_core_power"; } |
{ type: "decrease_core_cooldown"; } |
{ type: "discard_unit"; unitId: string; } |
{ type: "recruit_unit"; unitId: string; targetSlot: [number, number] | null; } |
{ type: "update_team"; team: { units: Unit[]; }; } |
{ type: "start_combat"; } |
{ type: "end_combat"; } |
{ type: "select_encounter"; encounterId: string; } |
{ type: "victory"; };
// Don't confuse this with actions. This represents the current stage that the
// player is on



export type PhaseType = "encounter" //skipabble
	|
	"shop" //skipabble
	|
	"orb_shop" //skipabble
	|
	"upgrade_core" //skipabble
	|
	"add_reaction_core" //skipabble
	|
	"pre_combat" // advances with "start_combat"
	|
	"combat" // advances with "end_combat"
	|
	"victory" |
	"game_over";

export type CombatState = {
	// Hot, mutable units for simulation
	units: Unit[];
	logs: CombatLogger.CombatLogEntry[];
	enemyPlayerName: string;
	wonCombat: boolean;
	// Permanent buffs should be applied here
	finalPlayerUnits: Unit[];
	// Used to reset board for replays
	initialUnits: Unit[];
	// Derived indexes (built once in createCombatState, valid for entire combat)
	unitById: Map<string, Unit>;
	playerCore: Unit;
	cpuCore: Unit;
	playerUnits: Unit[];
	cpuUnits: Unit[];
};
export type Event<T> = {
	listen: (callback: (payload: T) => void) => void;
	emit: (payload: T) => void;
};
export type PhaseOptions = {
	phase: PhaseType;
	round: number;
	options: PhaseOption[];
	combatState?: CombatState;
	team?: { units: Unit[]; };
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
	mostPowerfulUnit: { cardId: string; power: number; } | null;
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
	team: { units: Unit[]; };
	wins: number;
	losses: number;
	action_log: ActionLogEntry[];
	encounter_history?: string[]; // Track all shown encounters (for non-repetition logic)
	runStats?: RunStats;
	updated_at?: Date;
};

/**
 * Result of an action dispatch.
 * Carries updated session and optional phase-specific data (e.g., combat results).
 */
export type ActionResponse = {
	session: SessionData;
	combatState?: CombatState;
};
export type MultiplayerQueueType = "casual" | "ranked";
export type SessionType =
	{ type: "singleplayer"; } |
	{ type: "multiplayer"; queueType: MultiplayerQueueType; };



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
