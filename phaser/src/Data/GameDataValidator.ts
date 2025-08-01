import { getEffectParams } from '../TraitSystem/TraitSystem.pure';

// Types for game data structure
export interface CardData {
	id: string;
	name: string;
	pic?: string;
	power: number;
	cooldown: number;
	tags?: string[];
	traits: TraitReference[];
	description?: string;
}

export interface TraitReference {
	id: string;
	[key: string]: any; // Additional parameters
}

export interface TraitDefinition {
	id: string;
	name: string;
	description: string;
	categories: string[];
	effects: EffectDefinition[];
}

export interface EffectDefinition {
	effectId: string;
	eventTrigger: string;
	targetSelector?: string;
	conditions?: ConditionDefinition[];
	[key: string]: any; // Additional parameters
}

export interface ConditionDefinition {
	type: string;
	[key: string]: any; // Additional parameters
}

export interface GameData {
	id: string;
	name: string;
	cards: CardData[];
	traits: TraitDefinition[];
}

export interface ValidationError {
	type: 'error' | 'warning';
	category: string;
	message: string;
	context?: any;
}

export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

// Pure validation functions
export function validateCardData(card: CardData, availableTraits: Set<string>): ValidationError[] {
	const errors: ValidationError[] = [];

	// Basic field validation
	if (!card.id || typeof card.id !== 'string') {
		errors.push({
			type: 'error',
			category: 'card_structure',
			message: `Card missing or invalid id`,
			context: { card }
		});
	}

	if (!card.name || typeof card.name !== 'string') {
		errors.push({
			type: 'error',
			category: 'card_structure',
			message: `Card "${card.id}" missing or invalid name`,
			context: { card }
		});
	}

	// HP validation removed since cards no longer have HP

	if (typeof card.power !== 'number' || card.power < 0) {
		errors.push({
			type: 'error',
			category: 'card_stats',
			message: `Card "${card.id}" has invalid power: ${card.power}`,
			context: { card }
		});
	}

	if (typeof card.cooldown !== 'number' || card.cooldown < 0) {
		errors.push({
			type: 'error',
			category: 'card_stats',
			message: `Card "${card.id}" has invalid cooldown: ${card.cooldown}`,
			context: { card }
		});
	}

	// Trait reference validation
	if (!Array.isArray(card.traits)) {
		errors.push({
			type: 'error',
			category: 'card_structure',
			message: `Card "${card.id}" traits must be an array`,
			context: { card }
		});
	} else {
		card.traits.forEach((traitRef, index) => {
			if (!traitRef.id || typeof traitRef.id !== 'string') {
				errors.push({
					type: 'error',
					category: 'trait_reference',
					message: `Card "${card.id}" trait[${index}] missing or invalid id`,
					context: { card, traitRef }
				});
			} else if (!availableTraits.has(traitRef.id)) {
				errors.push({
					type: 'error',
					category: 'trait_reference',
					message: `Card "${card.id}" references unknown trait: ${traitRef.id}`,
					context: { card, traitRef }
				});
			}
		});
	}

	// Tags validation (warnings for consistency)
	if (card.tags && !Array.isArray(card.tags)) {
		errors.push({
			type: 'warning',
			category: 'card_structure',
			message: `Card "${card.id}" tags should be an array`,
			context: { card }
		});
	}

	return errors;
}

export function validateTraitDefinition(trait: TraitDefinition): ValidationError[] {
	const errors: ValidationError[] = [];

	// Basic structure validation
	if (!trait.id || typeof trait.id !== 'string') {
		errors.push({
			type: 'error',
			category: 'trait_structure',
			message: `Trait missing or invalid id`,
			context: { trait }
		});
	}

	if (!trait.name || typeof trait.name !== 'string') {
		errors.push({
			type: 'error',
			category: 'trait_structure',
			message: `Trait "${trait.id}" missing or invalid name`,
			context: { trait }
		});
	}

	if (!trait.description || typeof trait.description !== 'string') {
		errors.push({
			type: 'warning',
			category: 'trait_structure',
			message: `Trait "${trait.id}" missing or invalid description`,
			context: { trait }
		});
	}

	if (!Array.isArray(trait.categories)) {
		errors.push({
			type: 'error',
			category: 'trait_structure',
			message: `Trait "${trait.id}" categories must be an array`,
			context: { trait }
		});
	}

	if (!Array.isArray(trait.effects)) {
		errors.push({
			type: 'error',
			category: 'trait_structure',
			message: `Trait "${trait.id}" effects must be an array`,
			context: { trait }
		});
	} else {
		// Validate each effect
		trait.effects.forEach((effect, index) => {
			const effectErrors = validateEffectDefinition(effect, trait.id, index);
			errors.push(...effectErrors);
		});
	}

	return errors;
}

export function validateEffectDefinition(effect: EffectDefinition, traitId: string, effectIndex: number): ValidationError[] {
	const errors: ValidationError[] = [];

	if (!effect.effectId || typeof effect.effectId !== 'string') {
		errors.push({
			type: 'error',
			category: 'effect_structure',
			message: `Trait "${traitId}" effect[${effectIndex}] missing or invalid effectId`,
			context: { effect, traitId, effectIndex }
		});
	}

	if (!effect.eventTrigger || typeof effect.eventTrigger !== 'string') {
		errors.push({
			type: 'error',
			category: 'effect_structure',
			message: `Trait "${traitId}" effect[${effectIndex}] missing or invalid eventTrigger`,
			context: { effect, traitId, effectIndex }
		});
	}

	// Validate known event triggers
	const validEventTriggers = [
		'onAction', 'onBattleStart', 'onAttackByMe', 'onTakeDamage',
		'onLowMorale', 'onDeath', 'onSpawn', 'onAlliedAction', 'onEnemyAction', 'onBattleReaction'
	];
	if (effect.eventTrigger && !validEventTriggers.includes(effect.eventTrigger)) {
		errors.push({
			type: 'warning',
			category: 'effect_structure',
			message: `Trait "${traitId}" effect[${effectIndex}] has unknown eventTrigger: ${effect.eventTrigger}`,
			context: { effect, traitId, effectIndex, validEventTriggers }
		});
	}

	// Validate target selectors if present
	if (effect.targetSelector) {
		const validTargetSelectors = [
			'self', 'all_allies', 'all_enemies', 'ally_left', 'ally_right',
			'ally_top', 'allies_adjacent', 'all_allies_in_row', 'all_allies_in_column',
			'same_row_allies', 'same_column_allies', 'random_ally', 'random_enemy'
		];
		if (!validTargetSelectors.includes(effect.targetSelector)) {
			errors.push({
				type: 'warning',
				category: 'effect_structure',
				message: `Trait "${traitId}" effect[${effectIndex}] has unknown targetSelector: ${effect.targetSelector}`,
				context: { effect, traitId, effectIndex, validTargetSelectors }
			});
		}
	}

	// Validate conditions if present
	if (effect.conditions && Array.isArray(effect.conditions)) {
		effect.conditions.forEach((condition, condIndex) => {
			if (!condition.type || typeof condition.type !== 'string') {
				errors.push({
					type: 'error',
					category: 'condition_structure',
					message: `Trait "${traitId}" effect[${effectIndex}] condition[${condIndex}] missing or invalid type`,
					context: { condition, traitId, effectIndex, condIndex }
				});
			}
		});
	}

	return errors;
}

export function validateTraitParameters(card: CardData, traitDefinitions: Map<string, TraitDefinition>): ValidationError[] {
	const errors: ValidationError[] = [];

	card.traits.forEach((traitRef) => {
		const traitDef = traitDefinitions.get(traitRef.id);
		if (!traitDef) return; // Already caught by other validation

		// Check for duration vs cooldown issues first
		if ('duration' in traitRef && typeof traitRef.duration === 'number') {
			if (traitRef.duration > card.cooldown) {
				errors.push({
					type: 'error',
					category: 'duration_balance',
					message: `Card "${card.id}" trait "${traitRef.id}" has duration (${traitRef.duration}ms) longer than cooldown (${card.cooldown}ms), creating infinite effect`,
					context: { card, traitRef, duration: traitRef.duration, cooldown: card.cooldown }
				});
			}
		}

		// First, check for parameters mentioned in the trait description
		const requiredParams: string[] = [];
		if (traitDef.description.includes('{') && traitDef.description.includes('}')) {
			const paramMatches = traitDef.description.match(/\{(\w+)\}/g);
			if (paramMatches) {
				paramMatches.forEach(match => {
					const paramName = match.slice(1, -1); // Remove { }
					requiredParams.push(paramName);
				});
			}
		}

		// Collect all available parameters from all effects of this trait
		const resolvedParams: Record<string, unknown> = {};

		// Common parameters to check (in addition to description parameters)
		const commonParams = ['amount', 'duration', 'reduction', 'reduction_percent', 'damage_per_time',
			'cooldown_penalty', 'armor_bonus', 'morale', 'dodge_chance', 'damage_per_tick',
			'tick_interval', 'attribute', 'cardIdToSummon', 'time_threshold', 'damage_bonus'];

		// Combine required and common parameters
		const allParamsToCheck = [...new Set([...requiredParams, ...commonParams])];

		// Check all effects to gather available parameters
		traitDef.effects.forEach((effect) => {
			allParamsToCheck.forEach(paramName => {
				try {
					const value = getEffectParams(traitRef, effect, paramName, undefined);
					if (value !== undefined) {
						resolvedParams[paramName] = value;
					}
				} catch (error: any) {
					errors.push({
						type: 'error',
						category: 'parameter_resolution',
						message: `Card "${card.id}" trait "${traitRef.id}" parameter resolution error for "${paramName}": ${error?.message || 'Unknown error'}`,
						context: { card, traitRef, traitDef, paramName, error }
					});
				}
			});
		});

		// Check for missing required parameters based on effect description
		requiredParams.forEach(paramName => {
			if (!(paramName in resolvedParams)) {
				errors.push({
					type: 'warning',
					category: 'parameter_missing',
					message: `Card "${card.id}" trait "${traitRef.id}" missing parameter: ${paramName}`,
					context: { card, traitRef, traitDef, paramName }
				});
			}
		});

		// Validate parameter types for common parameters
		if ('amount' in resolvedParams && typeof resolvedParams.amount !== 'number') {
			errors.push({
				type: 'error',
				category: 'parameter_type',
				message: `Card "${card.id}" trait "${traitRef.id}" parameter 'amount' must be a number`,
				context: { card, traitRef, resolvedParams }
			});
		}

		if ('duration' in resolvedParams && typeof resolvedParams.duration !== 'number') {
			errors.push({
				type: 'error',
				category: 'parameter_type',
				message: `Card "${card.id}" trait "${traitRef.id}" parameter 'duration' must be a number`,
				context: { card, traitRef, resolvedParams }
			});
		}
	});

	return errors;
}

export function validateGameDataConsistency(gameData: GameData): ValidationError[] {
	const errors: ValidationError[] = [];

	// Check for duplicate card IDs
	const cardIds = new Set<string>();
	gameData.cards.forEach((card, index) => {
		if (cardIds.has(card.id)) {
			errors.push({
				type: 'error',
				category: 'data_consistency',
				message: `Duplicate card ID: ${card.id}`,
				context: { card, index }
			});
		}
		cardIds.add(card.id);
	});

	// Check for duplicate trait IDs
	const traitIds = new Set<string>();
	gameData.traits.forEach((trait, index) => {
		if (traitIds.has(trait.id)) {
			errors.push({
				type: 'error',
				category: 'data_consistency',
				message: `Duplicate trait ID: ${trait.id}`,
				context: { trait, index }
			});
		}
		traitIds.add(trait.id);
	});

	// Check for unreferenced traits
	const referencedTraits = new Set<string>();
	gameData.cards.forEach(card => {
		card.traits.forEach(traitRef => {
			referencedTraits.add(traitRef.id);
		});
	});

	gameData.traits.forEach(trait => {
		if (!referencedTraits.has(trait.id)) {
			errors.push({
				type: 'warning',
				category: 'data_consistency',
				message: `Trait "${trait.id}" is defined but never used`,
				context: { trait }
			});
		}
	});

	return errors;
}

export function validateCompleteGameData(gameData: GameData): ValidationResult {
	const allErrors: ValidationError[] = [];

	// Validate overall structure
	if (!gameData.id || !gameData.name) {
		allErrors.push({
			type: 'error',
			category: 'data_structure',
			message: 'Game data missing id or name',
			context: { gameData }
		});
	}

	if (!Array.isArray(gameData.cards)) {
		allErrors.push({
			type: 'error',
			category: 'data_structure',
			message: 'Game data cards must be an array',
			context: { gameData }
		});
		return { isValid: false, errors: allErrors, warnings: [] };
	}

	if (!Array.isArray(gameData.traits)) {
		allErrors.push({
			type: 'error',
			category: 'data_structure',
			message: 'Game data traits must be an array',
			context: { gameData }
		});
		return { isValid: false, errors: allErrors, warnings: [] };
	}

	// Create lookup structures
	const availableTraits = new Set(gameData.traits.map(t => t.id));
	const traitDefinitions = new Map(gameData.traits.map(t => [t.id, t]));

	// Validate each trait definition
	gameData.traits.forEach(trait => {
		const traitErrors = validateTraitDefinition(trait);
		allErrors.push(...traitErrors);
	});

	// Validate each card
	gameData.cards.forEach(card => {
		const cardErrors = validateCardData(card, availableTraits);
		allErrors.push(...cardErrors);

		const paramErrors = validateTraitParameters(card, traitDefinitions);
		allErrors.push(...paramErrors);
	});

	// Validate overall consistency
	const consistencyErrors = validateGameDataConsistency(gameData);
	allErrors.push(...consistencyErrors);

	// Separate errors and warnings
	const errors = allErrors.filter(e => e.type === 'error');
	const warnings = allErrors.filter(e => e.type === 'warning');

	return {
		isValid: errors.length === 0,
		errors,
		warnings
	};
}
