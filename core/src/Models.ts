
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

