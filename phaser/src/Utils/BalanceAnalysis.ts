import { BASE_COLLECTION_DATA } from "../Data/BaseCollection";
import { Effect } from "../TriggerSystem/TriggerSystem";

const DELAY_MODIFIER = 0.9;
const STD_UNIT_POWER = 100; // Updated from 20/40 to 100 based on new budget

function getTargetsCount(targeting: any): number {
	if (!targeting) return 0;
	if (targeting.count !== undefined) return Math.sqrt(targeting.count);
	const id = targeting.id;
	if (["self", "trigger", "strongest_enemy", "weakest_enemy", "strongest_ally", "weakest_ally", "top_ally", "bottom_ally", "left_ally", "right_ally"].includes(id)) return 1;
	if (["row_allies", "column_allies"].includes(id)) return 1.73; // sqrt(3) approx
	if (id === "all_allies") return 2.82; // sqrt(8) approx
	if (id === "all_enemies" || id === "enemies") return 3; // sqrt(9) approx
	if (id === "random_ally" || id === "random_enemy") return 1;
	return 1;
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
			return baseCost * targets;
		case "increase_critical":
			// @ts-ignore
			baseCost = 4 * (effect.amount || 0); // Rule 9: 4 * %
			return baseCost * targets;
		case "haste":
		case "slow":
		case "charge":
			return calculateHasteSlowCost(effect, unitPower);
		case "distribute_power":
		case "absorb_power":
			return 40 * targets; // Arbitrary for now? Rule doesn't specify others.
		case "multiply_power":
			// @ts-ignore
			const gain = (effect.multiplier - 1) * 20; // Assuming base 20 power?
			// Actually let's assume standard unit power 20 for this calc as it relies on raw stats? 
			// Or maybe we shouldn't hardcode 20. But unit.power varies.
			// Let's stick to old logic for this one but update multiplier cost.
			// "Increase Power (temp)" is 4x. Multiply is basically temp increase.
			baseCost = 4 * gain;
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

	let freq = 1;
	// Rule 7 estimates
	if (effectId === "poison" || effectId === "regen") freq = 1; // once per sec? No, poison ticks.
	// Actually poison/regen ticks every second. 
	// But "Reaction: when poison..." triggers on APPLY or TICK? Usually apply.
	// If it's "on take damage", poison triggers it each tick.
	// Let's assume standard 1 trigger per 5s for "special" events, but "damage" happens often.

	if (effectId === "damage") freq = 2; // more common
	if (effectId === "heal") freq = 1;

	if (effectId === "haste" || effectId === "slow") freq = 0.5;
	if (effectId === "on_crit") freq = 0.4;
	if (effectId && effectId.startsWith("every_")) freq = 1; // Hard to estimate, assume 1

	return Math.sqrt(sources) * freq; // Diminishing returns on sources too? Or linear? 
	// Rule 7 says "Number of valid sources". Usually linear for triggers. 
	// If I have 8 allies taking damage, I react 8 times.
	// But let's be conservative. 
	return sources * freq;
}

function calculateActualPower(unit: any) {
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
	return { name: unit.id, AP, ActionPower, ReactionPower, Cooldown: C };
}

export const BalanceAnalysis = {
	run: () => {
		const cards = BASE_COLLECTION_DATA.cards;
		console.log("Running Balance Analysis...");
		console.log("Unit Name".padEnd(20) + " | " + "AP".padEnd(6) + " | " + "Act".padEnd(6) + " | " + "React".padEnd(6) + " | " + "Status");
		console.log("-".repeat(60));

		const results = cards.map((card: any) => {
			const stats = calculateActualPower(card);
			let status = "OK";
			if (stats.AP < 90) status = "WEAK";
			if (stats.AP > 110) status = "OP";

			return {
				...stats,
				status
			};
		});

		results.forEach(stats => {
			console.log(
				stats.name.substring(0, 19).padEnd(20) + " | " +
				stats.AP.toFixed(1).padEnd(6) + " | " +
				stats.ActionPower.toFixed(1).padEnd(6) + " | " +
				stats.ReactionPower.toFixed(1).padEnd(6) + " | " +
				stats.status
			);
		});

		return results;
	}
};
