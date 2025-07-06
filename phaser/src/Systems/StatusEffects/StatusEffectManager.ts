/**
 * @file Centralized status effect management system
 * Handles application, processing, and cleanup of all status effects on units
 */

import { Unit, StatusEffect } from "../../Models/Entities/Unit";
import { getChara } from "../../Scenes/Battleground/Systems/CharaManager";

const DEBUG_STATUS_EFFECTS = process.env.NODE_ENV === 'development';

function logStatusEffect(message: string, unit: Unit, effect?: StatusEffect): void {
	if (DEBUG_STATUS_EFFECTS) {
		console.log(`[StatusEffect] ${message}`, {
			unitId: unit.id,
			unitName: unit.name,
			effect: effect ? {
				type: effect.type,
				duration: effect.remainingDuration,
				stackId: effect.stackId
			} : undefined
		});
	}
}

/**
 * Applies a status effect to a unit, handling stacking rules and conflicts
 */
export function applyStatusEffect(unit: Unit, effect: StatusEffect): void {
	if (!unit.statusEffects) {
		unit.statusEffects = [];
	}

	// Handle non-stacking effects (replace existing effect of same type/stackId)
	if (effect.stackId || isNonStackingEffect(effect.type)) {
		const stackId = effect.stackId || effect.type;
		const existingIndex = unit.statusEffects.findIndex(e =>
			(e.stackId === stackId) || (e.type === effect.type && isNonStackingEffect(e.type))
		);

		if (existingIndex !== -1) {
			// Revert the old effect before applying the new one
			revertStatusEffect(unit, unit.statusEffects[existingIndex]);
			unit.statusEffects.splice(existingIndex, 1);
		}
	}

	// Apply the new effect
	applyStatusEffectImmediate(unit, effect);
	unit.statusEffects.push(effect);

	logStatusEffect('Applied', unit, effect);
}

/**
 * Processes all status effects on a unit for a given time delta
 * Returns true if any effects were processed or expired
 */
export function processStatusEffects(unit: Unit, delta: number): boolean {
	if (!unit.statusEffects || unit.statusEffects.length === 0) {
		return false;
	}

	let hasChanges = false;

	unit.statusEffects = unit.statusEffects.filter(effect => {
		effect.remainingDuration -= delta;

		// Handle ticking effects (poison, etc.)
		if (effect.type === 'poison' && effect.damagePerTick && effect.tickInterval) {
			effect.timeSinceLastTick = (effect.timeSinceLastTick || 0) + delta;
			if (effect.timeSinceLastTick >= effect.tickInterval) {
				effect.timeSinceLastTick -= effect.tickInterval;
				handlePoisonTick(unit, effect);
				hasChanges = true;
			}
		}

		// Check if effect has expired
		if (effect.remainingDuration <= 0) {
			revertStatusEffect(unit, effect);
			hasChanges = true;
			logStatusEffect('Expired', unit, effect);
			return false; // Remove expired effect
		}

		return true; // Keep active effect
	});

	return hasChanges;
}

/**
 * Removes all status effects from a unit (typically called at battle start/end)
 */
export function clearAllStatusEffects(unit: Unit): void {
	if (!unit.statusEffects) return;

	// Revert all effects before clearing
	for (const effect of unit.statusEffects) {
		revertStatusEffect(unit, effect);
	}

	unit.statusEffects = [];
}

/**
 * Gets the effective cooldown multiplier for a unit based on active status effects
 */
export function getCooldownMultiplier(unit: Unit): number {
	if (!unit.statusEffects) return 1.0;

	let multiplier = 1.0;
	let hasFreeze = false;

	for (const effect of unit.statusEffects) {
		switch (effect.type) {
			case 'haste':
				multiplier *= effect.cooldownMultiplier || 0.5;
				break;
			case 'slow':
				multiplier *= effect.cooldownMultiplier || 1.5;
				break;
			case 'freeze':
			case 'stun':
				hasFreeze = true;
				break;
		}
	}

	// Freeze/stun overrides all other cooldown effects
	return hasFreeze ? Number.MAX_SAFE_INTEGER : multiplier;
}

/**
 * Checks if a unit has a specific status effect type
 */
export function hasStatusEffect(unit: Unit, effectType: StatusEffect['type']): boolean {
	return unit.statusEffects?.some(effect => effect.type === effectType) || false;
}

/**
 * Gets all status effects of a specific type on a unit
 */
export function getStatusEffects(unit: Unit, effectType: StatusEffect['type']): StatusEffect[] {
	return unit.statusEffects?.filter(effect => effect.type === effectType) || [];
}

/**
 * Gets a summary of all active status effects on a unit for display purposes
 */
export function getStatusEffectSummary(unit: Unit): { type: string; displayName: string; duration: number }[] {
	if (!unit.statusEffects || unit.statusEffects.length === 0) {
		return [];
	}

	return unit.statusEffects.map(effect => ({
		type: effect.type,
		displayName: effect.displayName || effect.type,
		duration: Math.max(0, effect.remainingDuration)
	}));
}

/**
 * Removes specific status effects of a given type from a unit
 */
export function removeStatusEffects(unit: Unit, effectType: StatusEffect['type']): void {
	if (!unit.statusEffects) return;

	const effectsToRemove = unit.statusEffects.filter(effect => effect.type === effectType);

	// Revert effects before removing them
	for (const effect of effectsToRemove) {
		revertStatusEffect(unit, effect);
	}

	// Remove the effects
	unit.statusEffects = unit.statusEffects.filter(effect => effect.type !== effectType);
}

// === PRIVATE HELPER FUNCTIONS ===

/**
 * Determines if an effect type should not stack with others of the same type
 */
function isNonStackingEffect(effectType: StatusEffect['type']): boolean {
	return ['haste', 'slow', 'freeze', 'stun', 'fury_scaling'].includes(effectType);
}

/**
 * Immediately applies the effects of a status effect to a unit
 */
function applyStatusEffectImmediate(unit: Unit, effect: StatusEffect): void {
	switch (effect.type) {
		case 'haste':
		case 'slow':
			// Cooldown effects are handled by getCooldownMultiplier(), no immediate application needed
			break;

		case 'freeze':
		case 'stun':
			if (effect.originalCooldown === undefined) {
				effect.originalCooldown = unit.cooldown;
			}
			unit.cooldown = Number.MAX_SAFE_INTEGER;
			break;

		case 'power_buff':
		case 'power_debuff':
		case 'fury_scaling':
			if (effect.attribute && effect.amount !== undefined) {
				(unit[effect.attribute] as number) += effect.amount;

				// Update UI if it's power
				if (effect.attribute === 'power') {
					const chara = getChara(unit.id);
					chara?.updatePowerDisplay();
				}
			}
			break;

		case 'cooldown_increase':
			if (effect.amount !== undefined) {
				unit.cooldown += effect.amount;
			}
			break;

		case 'poison':
			// Poison effects are handled in processStatusEffects via ticking
			break;
	}
}

/**
 * Reverts the effects of a status effect when it expires
 */
function revertStatusEffect(unit: Unit, effect: StatusEffect): void {
	switch (effect.type) {
		case 'haste':
		case 'slow':
			// Cooldown effects don't need reverting, they're handled by multiplier calculation
			break;

		case 'freeze':
		case 'stun':
			if (effect.originalCooldown !== undefined) {
				unit.cooldown = effect.originalCooldown;
			}
			break;

		case 'power_buff':
		case 'power_debuff':
		case 'fury_scaling':
			if (effect.attribute && effect.amount !== undefined) {
				(unit[effect.attribute] as number) -= effect.amount;

				// Update UI if it's power
				if (effect.attribute === 'power') {
					const chara = getChara(unit.id);
					chara?.updatePowerDisplay();
				}
			}
			break;

		case 'cooldown_increase':
			// Cooldown increases are permanent, no revert needed
			break;

		case 'poison':
			// Poison effects don't need reverting
			break;
	}
}

/**
 * Handles a poison tick effect
 */
function handlePoisonTick(unit: Unit, effect: StatusEffect): void {
	if (!effect.damagePerTick) return;

	const chara = getChara(unit.id);
	if (chara && chara.active) {
		chara.showPopText(`-${effect.damagePerTick} ${effect.displayName || 'Poison'}`, "damage");
		//chara.unitHit(effect.damagePerTick);
	}
}
