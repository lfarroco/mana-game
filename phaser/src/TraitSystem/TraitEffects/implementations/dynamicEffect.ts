/**
 * @file Dynamic trait effect implementation
 * This effect can dispatch to different effect types based on trait parameters,
 * allowing for parametric traits that can have different behaviors.
 */

import { TraitEffectFn, getTraitEffectImplementation } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';

/**
 * Dynamic effect implementation that can dispatch to different effects based on parameters
 * This allows creating parametric traits that can trigger different effects
 */
export const dynamicEffectLogic: TraitEffectFn = async (context) => {
	// Get the effect type from trait instance parameters
	const effectType = getEffectParams(context.traitInstanceParams, context.effectInstance, 'effect_type', '');

	if (!effectType) {
		console.warn('Dynamic effect missing effect_type parameter', {
			traitId: context.traitInstanceParams.id,
			sourceUnit: context.sourceUnit.id
		});
		return;
	}

	// Map effect types to actual effect IDs
	const effectMapping: Record<string, string> = {
		'charge': 'apply_charge',
		'haste': 'apply_haste',
		'slow': 'apply_slow',
		'heal': 'restore_morale',
		'shield': 'add_shield',
		'damage': 'deal_damage',
		'power_boost': 'modify_stat_passive'
	};

	const actualEffectId = effectMapping[effectType];
	if (!actualEffectId) {
		console.warn(`Unknown effect_type: ${effectType}`, {
			traitId: context.traitInstanceParams.id,
			sourceUnit: context.sourceUnit.id,
			availableTypes: Object.keys(effectMapping)
		});
		return;
	}

	// Get the actual effect implementation
	const effectImplementation = getTraitEffectImplementation(actualEffectId);
	if (!effectImplementation) {
		console.warn(`No implementation found for effect: ${actualEffectId}`, {
			effectType,
			traitId: context.traitInstanceParams.id
		});
		return;
	}

	// Create a modified context with the actual effect ID and merged parameters
	const modifiedContext = {
		...context,
		effectInstance: {
			...context.effectInstance,
			effectId: actualEffectId,
			// Merge parameters from trait instance into effect instance
			// This allows the underlying effect to access amount, duration, etc.
			...context.traitInstanceParams
		}
	};

	// Execute the actual effect
	await effectImplementation(modifiedContext);
};
