/**
 * Orb and Core Upgrade Actions
 *
 * Handles special item effects (orbs) and core unit stat upgrades.
 * Pure functions that modify unit state based on orb type or core upgrade action.
 */

import { Unit } from "@Models/Entities/Unit";

const COOLDOWN_REDUCTION_FACTOR = 0.1;
const CORE_STAT_SCALING_FACTOR = 0.1;
const ORB_POWER_INCREASE_FACTOR = 0.1;
const MIN_COOLDOWN_MS = 1000;
const CORE_ROUND_SCALING = 10;

/**
 * Apply upgrade_orb: Rank up a unit (increase stats by 1.75x).
 * This aligns with the new bronze->silver->gold upgrade progression.
 */
function applyUpgradeOrb(unit: Unit): void {
	unit.rank = (unit.rank || 1) + 1;
	const rankMultiplier = 1.75;
	unit.maxLife = Math.floor(unit.maxLife * rankMultiplier);
	unit.life = unit.maxLife;
	unit.power = Math.floor(unit.power * rankMultiplier);
}

/**
 * Apply absorb_power_orb: Take 25% power from units in the same row.
 */
function applyAbsorbPowerOrb(targetUnit: Unit, allUnits: Unit[]): number {
	let totalAbsorbed = 0;
	allUnits.forEach((u: Unit) => {
		if (u.id !== targetUnit.id && u.position && u.position.y === targetUnit.position.y) {
			const absorbed = Math.floor(u.power * 0.25);
			if (absorbed > 0) {
				u.power = Math.max(0, u.power - absorbed);
				totalAbsorbed += absorbed;
			}
		}
	});

	if (totalAbsorbed > 0) {
		targetUnit.power = (targetUnit.power || 0) + totalAbsorbed;
		targetUnit.bonusPower = (targetUnit.bonusPower || 0) + totalAbsorbed;
	}

	return totalAbsorbed;
}

/**
 * Apply distribute_power_orb: Give 50% of unit's power to units in the same row.
 */
function applyDistributePowerOrb(targetUnit: Unit, allUnits: Unit[]): number {
	const powerToDistribute = Math.floor(targetUnit.power * 0.5);
	if (powerToDistribute <= 0) return 0;

	targetUnit.power = Math.max(0, targetUnit.power - powerToDistribute);
	const bonusToLose = Math.max(0, Math.min(targetUnit.bonusPower || 0, powerToDistribute));
	targetUnit.bonusPower = (targetUnit.bonusPower || 0) - bonusToLose;

	const targets = allUnits.filter(
		(u: Unit) => u.id !== targetUnit.id && u.position && u.position.y === targetUnit.position.y
	);

	if (targets.length > 0) {
		const powerPerTarget = Math.floor(powerToDistribute / targets.length);
		targets.forEach((u: Unit) => {
			u.power = (u.power || 0) + powerPerTarget;
			u.bonusPower = (u.bonusPower || 0) + powerPerTarget;
		});
	}

	return powerToDistribute;
}

/**
 * Apply increase_power_on_X orb: Boost power of units with a specific effect.
 */
function applyIncreasePowerOrb(targetUnit: Unit, effectType: string): number {
	if (!targetUnit.effects?.some((e: { id: string }) => e.id === effectType)) {
		return 0;
	}

	const pct = Math.floor(targetUnit.power * ORB_POWER_INCREASE_FACTOR);
	targetUnit.power += pct;
	return pct;
}

/**
 * Apply increase_critical_on_X orb: Add critical strike chance to units with a specific effect.
 */
function applyIncreaseCriticalOrb(targetUnit: Unit, effectType: string): boolean {
	if (!targetUnit.effects?.some((e: { id: string }) => e.id === effectType)) {
		return false;
	}

	targetUnit.effects = targetUnit.effects || [];
	targetUnit.effects.push({
		id: "increase_critical",
		amount: 10,
		targets: { id: "self" },
	});
	return true;
}

/**
 * Apply decrease_cooldown_on_X orb: Reduce cooldown for units with a specific effect.
 */
function applyDecreaseCooldownOrb(targetUnit: Unit, effectType: string): number {
	if (!targetUnit.effects?.some((e: { id: string }) => e.id === effectType)) {
		return 0;
	}

	const reduction = targetUnit.cooldown * COOLDOWN_REDUCTION_FACTOR;
	targetUnit.cooldown = Math.max(MIN_COOLDOWN_MS, targetUnit.cooldown - reduction);
	return Math.floor(reduction);
}

/**
 * Apply an orb to a target unit.
 * Returns the list of update messages describing what happened.
 */
export function applyOrb(
	allUnits: Unit[],
	targetUnitId: string,
	orbId: string
): string[] {
	const targetUnit = allUnits.find((u: Unit) => u.id === targetUnitId);
	if (!targetUnit) {
		return [`Target unit ${targetUnitId} not found`];
	}

	const updates: string[] = [];
	updates.push(`Applying orb ${orbId} to ${targetUnitId}`);

	if (orbId === "upgrade_orb") {
		applyUpgradeOrb(targetUnit);
	} else if (orbId === "absorb_power_orb") {
		const absorbed = applyAbsorbPowerOrb(targetUnit, allUnits);
		if (absorbed > 0) {
			updates.push(`Absorbed ${absorbed} power from row units`);
		}
	} else if (orbId === "distribute_power_orb") {
		const distributed = applyDistributePowerOrb(targetUnit, allUnits);
		if (distributed > 0) {
			updates.push(`Distributed ${distributed} power to row units`);
		}
	} else if (orbId.startsWith("increase_power_on_")) {
		const effectType = orbId.replace("increase_power_on_", "");
		const boost = applyIncreasePowerOrb(targetUnit, effectType);
		if (boost > 0) {
			updates.push(`Increased power by ${boost} (on ${effectType})`);
		}
	} else if (orbId.startsWith("increase_critical_on_")) {
		const effectType = orbId.replace("increase_critical_on_", "");
		if (applyIncreaseCriticalOrb(targetUnit, effectType)) {
			updates.push(`Increased critical (on ${effectType})`);
		}
	} else if (orbId.startsWith("decrease_cooldown_on_")) {
		const effectType = orbId.replace("decrease_cooldown_on_", "");
		const reduction = applyDecreaseCooldownOrb(targetUnit, effectType);
		if (reduction > 0) {
			updates.push(`Decreased cooldown by ${reduction}ms (on ${effectType})`);
		}
	}

	return updates;
}

/**
 * Upgrade core max life by (10% of current + 10 * round).
 */
export function upgradeCoreMaxLife(core: Unit, round: number): string {
	const lifeGain =
		Math.floor(core.maxLife * CORE_STAT_SCALING_FACTOR) + round * CORE_ROUND_SCALING;
	core.maxLife += lifeGain;
	core.life = core.maxLife; // Heal to full on upgrade
	return `Increased Core Max Life by ${lifeGain}`;
}

/**
 * Upgrade core power by (10% of current + 10 * round).
 */
export function upgradeCorepower(core: Unit, round: number): string {
	const powerGain =
		Math.floor(core.power * CORE_STAT_SCALING_FACTOR) + round * CORE_ROUND_SCALING;
	core.power += powerGain;
	core.bonusPower = (core.bonusPower || 0) + powerGain;
	return `Increased Core Power by ${powerGain}`;
}

/**
 * Reduce core cooldown by 10%.
 */
export function decreaseCoresCooldown(core: Unit): string {
	const reduction = core.cooldown * COOLDOWN_REDUCTION_FACTOR;
	core.cooldown = Math.max(MIN_COOLDOWN_MS, core.cooldown - reduction);
	return `Decreased Core Cooldown by ${Math.floor(reduction)}`;
}
