import { BASE_COLLECTION_DATA } from "../Data/BaseCollection";
import { Effect } from "../TriggerSystem/TriggerSystem";

const DELAY_MODIFIER = 0.9;
const STD_UNIT_POWER = 100; // Updated from 20/40 to 100 based on new budget

function getTargetsCount(targeting: any): number {
	if (!targeting) return 1; // Default to single target if not specified
	if (targeting.count !== undefined) return Math.sqrt(targeting.count);
	const id = targeting.id;
	if (["self", "trigger", "strongest_enemy", "weakest_enemy", "strongest_ally", "weakest_ally", "top_ally", "bottom_ally", "left_ally", "right_ally"].includes(id)) return 1;
	if (["row_allies", "column_allies"].includes(id)) return 1.73; // sqrt(3) approx
	if (id === "all_allies") return 2.82; // sqrt(8) approx
	if (id === "all_enemies" || id === "enemies") return 3; // sqrt(9) approx
	if (id === "random_ally" || id === "random_enemy") return 1;
	return 1;
}

function isAllyTargeting(targeting: any): boolean {
	if (!targeting) return true; // Default to ally if not specified
	const id = targeting.id;
	// Enemy targeting
	if (["strongest_enemy", "weakest_enemy", "all_enemies", "enemies", "random_enemy"].includes(id)) return false;
	// Ally targeting (including self)
	return true;
}

function calculateHasteSlowCost(effect: Effect, _unitPower: number): number {
	// @ts-ignore
	const durationSec = (effect.duration || 0) / 1000;
	// @ts-ignore
	const targets = getTargetsCount(effect.targets);
	const id = effect.id;
	let s = 1;
	if (id === "haste") s = 2;
	if (id === "slow") s = 0.5;

	let extraProgress = 0;
	if (id === "charge") {
		extraProgress = durationSec;
	} else {
		extraProgress = (s - 1) * durationSec;
	}

	// Rule 12: Extra Actions = Extra Progress / C_target
	// We assume C_target = 5s (base cooldown)
	const extraActions = extraProgress / 5;

	// Rule 12: ΔAP = A_target * Extra Actions
	// A_target is the unit's action value. For a balanced unit, AP = 100.
	// So we value the target's output at 100.
	const value = STD_UNIT_POWER * extraActions;

	// Haste is positive value, Slow is negative value (but cost is effectively "negative cost" -> "positive impact on enemy" -> same magnitude of worth)
	// Actually, Slow on ENEMY is beneficial. Haste on ALLY is beneficial.
	// The function calculates "Cost" (Value of the effect).
	// Slowing an enemy by 50% for 5s means they lose 0.5 actions. Each action is worth ~100AP/Trigger? No, 100AP is per 5s.
	// A unit does 1 action per 5s (normalized).
	// So losing 0.5 actions = losing 50 AP.
	// So value is 50. My formula: 100 * (0.5 * 5 / 5) = 50. Correct.

	return Math.abs(value) * targets;
}

function calculateEffectCost(effect: Effect, unitPower: number): number {
	const id = effect.id;
	// @ts-ignore
	const targets = getTargetsCount(effect.targets);
	// @ts-ignore
	const isAlly = isAllyTargeting(effect.targets);
	let baseCost = 0;

	switch (id) {
		case "damage":
		case "heal":
			baseCost = 2 * unitPower;
			break;
		case "shield":
			baseCost = 1.6 * unitPower;
			break;
		case "poison":
		case "regen":
			baseCost = 2 * unitPower;
			break;
		case "increase_power":
			// @ts-ignore
			baseCost = (effect.permanent ? 10 : 4) * (effect.amount || 0);
			// If increasing power of enemies, it's a negative (team-harming)
			if (!isAlly) baseCost = -baseCost;
			return baseCost * targets;
		case "decrease_power":
			// @ts-ignore
			baseCost = (effect.permanent ? 10 : 4) * (effect.amount || 0);
			// If decreasing power of allies, it's a negative (team-harming)
			if (isAlly) baseCost = -baseCost;
			return baseCost * targets;
		case "increase_critical":
			// @ts-ignore
			baseCost = 4 * (effect.amount || 0); // Rule 9: 4 * %
			// If increasing crit of enemies, it's a negative (team-harming)
			if (!isAlly) baseCost = -baseCost;
			return baseCost * targets;
		case "haste":
		case "slow":
		case "charge":
			const hasteSlowCost = calculateHasteSlowCost(effect, unitPower);
			// Haste on allies is positive, haste on enemies is negative
			// Slow on allies is negative, slow on enemies is positive
			if (id === "haste" || id === "charge") {
				return isAlly ? hasteSlowCost : -hasteSlowCost;
			} else { // slow
				return isAlly ? -hasteSlowCost : hasteSlowCost;
			}
		case "distribute_power":
			// Distribute power redistributes power among targets
			// Value is roughly equivalent to a temporary power increase
			// Estimate: average redistribution of ~20 power per target
			return 4 * 20 * targets;
		case "absorb_power":
			// Absorb power takes from enemies and gives to self
			// This is a double swing: reduces enemy output AND increases own output
			// @ts-ignore
			const isPermanentAbsorb = effect.permanent || false;
			// Estimate: average absorption of ~15 power per target
			// Double value because it's a swing (enemy loses, you gain)
			return (isPermanentAbsorb ? 10 : 4) * 15 * 2 * targets;
		case "multiply_power":
			// @ts-ignore
			const multiplier = effect.multiplier;
			// Use actual unit power to calculate the gain
			// This ensures the cost scales appropriately with the unit's actual stats
			const gain = (multiplier - 1) * unitPower;
			// Multiply is a temporary power increase, so use 4x multiplier
			baseCost = 4 * gain;
			// If multiplying power of enemies, it's a negative (team-harming)
			if (!isAlly) baseCost = -baseCost;
			return baseCost * targets;
		default:
			return 0;
	}

	// @ts-ignore
	if (effect.targets && effect.targets.ofType && effect.targets.ofType !== "any") {
		baseCost *= 0.7;
	}

	return baseCost * targets;
}

function getTriggerFrequency(reaction: any): number {
	const pos = reaction.position;
	const effectId = reaction.effectId;
	let sources = 1;
	// Rule 10: "Number of valid sources"
	if (pos === "all") sources = 16;
	else if (pos === "allies") sources = 8;
	else if (pos === "enemies") sources = 9;
	else if (pos && (pos.includes("row") || pos.includes("column"))) sources = 3; // Approx 3 sources usually
	// else 1

	// Base frequency: how often does this effect type occur per source per 5s?
	let baseFreq = 1;

	// Damage is the most common effect (units attack frequently)
	if (effectId === "damage") baseFreq = 2;
	// Heal is less common than damage
	else if (effectId === "heal") baseFreq = 1;
	// Poison/regen: applied less frequently but ticks every second
	// Reactions typically trigger on application, not ticks
	else if (effectId === "poison" || effectId === "regen") baseFreq = 1;
	// Shield is moderately common
	else if (effectId === "shield") baseFreq = 1;
	// Haste/slow are less common support effects
	else if (effectId === "haste" || effectId === "slow") baseFreq = 0.5;
	// Critical hits are rare
	else if (effectId === "on_crit") baseFreq = 0.4;
	// "every_X" triggers are threshold-based, hard to estimate
	else if (effectId && effectId.startsWith("every_")) baseFreq = 1;
	// "all" catches all basic effects
	else if (effectId === "all") baseFreq = 1.5;

	// Use sqrt for diminishing returns on multiple sources
	// If you have 8 allies, you don't get 8x the triggers because:
	// 1. Not all allies act simultaneously
	// 2. Combat is chaotic and overlapping
	// 3. This prevents reaction spam from being too powerful
	return Math.sqrt(sources) * baseFreq;
}

function calculateActualPower(unit: any) {
	// @ts-ignore
	const rank = unit.rank || 1;
	// Rank 1 (Core/Bronze): 100 AP (150 if Core)
	// Rank 2 (Silver): 200 AP
	// Rank 3 (Gold): 300 AP
	let targetAP = rank * 100;
	if (unit.isCore) targetAP = 150;

	const C = unit.cooldown || 5000;
	const B = 5000;
	const Power = unit.power || 0;

	let A = 0;
	if (unit.effects) {
		unit.effects.forEach((e: Effect) => {
			A += calculateEffectCost(e, Power);
		});
	}
	const ActionPower = A * (B / C);

	let ReactionPower = 0;
	if (unit.reactions) {
		unit.reactions.forEach((r: any) => {
			if (!r.effects) return;
			const T = getTriggerFrequency(r);
			const D = DELAY_MODIFIER;
			let R = 0;
			r.effects.forEach((e: Effect) => {
				R += calculateEffectCost(e, Power);
			});
			ReactionPower += R * T * D;
		});
	}
	const AP = ActionPower + ReactionPower;
	return { name: unit.id, AP, ActionPower, ReactionPower, Cooldown: C, Rank: rank, TargetAP: targetAP };
}

export const BalanceAnalysis = {
	run: (filterNonOk: boolean = false) => {
		const cards = BASE_COLLECTION_DATA.cards;

		const results = cards.map((card: any) => {
			const stats = calculateActualPower(card);
			let status = "OK";
			const diff = stats.AP - stats.TargetAP;
			if (diff < -10) status = "WEAK";
			if (diff > 10) status = "OP";

			return {
				...stats,
				status
			};
		});

		const filteredResults = filterNonOk
			? results.filter(r => r.status !== "OK")
			: results;

		const header = "| Unit Name | AP | Act | React | Status |";
		const separator = "|---|---|---|---|---|";
		const rows = filteredResults.map(stats =>
			`| ${stats.name} | ${stats.AP.toFixed(1)} | ${stats.ActionPower.toFixed(1)} | ${stats.ReactionPower.toFixed(1)} | ${stats.status} |`
		).join("\n");

		console.log(`Balance Analysis Report:\n${header}\n${separator}\n${rows}`);

		return filteredResults;
	}
};
