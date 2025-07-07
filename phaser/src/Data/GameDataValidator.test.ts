import { describe, it, expect } from '@jest/globals';
import {
	validateCardData,
	validateTraitDefinition,
	validateEffectDefinition,
	validateCompleteGameData,
	validateGameDataConsistency,
	validateTraitParameters,
	type GameData
} from './GameDataValidator';
import * as fs from 'fs';
import * as path from 'path';

// Load the actual game data
const gameDataPath = path.join(__dirname, '../../public/assets/data/collections/base/data.json');
const gameDataRaw = fs.readFileSync(gameDataPath, 'utf8');
const gameData: GameData = JSON.parse(gameDataRaw);

describe('Game Data Validation', () => {
	describe('Card Validation', () => {
		it('should validate all cards in the game data', () => {
			const cards = gameData.cards;
			const traits = gameData.traits;
			const traitIds = new Set(traits.map(trait => trait.id));

			expect(cards).toBeDefined();
			expect(Array.isArray(cards)).toBe(true);
			expect(cards.length).toBeGreaterThan(0);

			cards.forEach((card, index) => {
				const errors = validateCardData(card, traitIds);
				if (errors.length > 0) {
					console.error(`Card ${index} (${card.id || 'unknown'}) validation errors:`, errors);
				}
				expect(errors.length).toBe(0);
			});
		});

		it('should have unique card IDs', () => {
			const cards = gameData.cards;
			const cardIds = cards.map(card => card.id);
			const uniqueIds = [...new Set(cardIds)];
			expect(uniqueIds.length).toBe(cardIds.length);
		});

		it('should validate specific card structure requirements', () => {
			const cards = gameData.cards;

			cards.forEach(card => {
				// All cards should have required fields
				expect(card.id).toBeDefined();
				expect(typeof card.id).toBe('string');
				expect(card.id.length).toBeGreaterThan(0);

				expect(card.name).toBeDefined();
				expect(typeof card.name).toBe('string');
				expect(card.name.length).toBeGreaterThan(0);

				expect(card.hp).toBeDefined();
				expect(typeof card.hp).toBe('number');
				expect(card.hp).toBeGreaterThan(0);

				expect(card.power).toBeDefined();
				expect(typeof card.power).toBe('number');
				expect(card.power).toBeGreaterThan(0);

				expect(card.powerType).toBeDefined();
				expect(['damage', 'heal', 'armor']).toContain(card.powerType);

				expect(card.cooldown).toBeDefined();
				expect(typeof card.cooldown).toBe('number');
				expect(card.cooldown).toBeGreaterThan(0);

				// Traits should be an array
				expect(Array.isArray(card.traits)).toBe(true);
				card.traits.forEach(trait => {
					expect(trait.id).toBeDefined();
					expect(typeof trait.id).toBe('string');
					expect(trait.id.length).toBeGreaterThan(0);
				});

				// Tags should be an array if present
				if (card.tags) {
					expect(Array.isArray(card.tags)).toBe(true);
					card.tags.forEach(tag => {
						expect(typeof tag).toBe('string');
						expect(tag.length).toBeGreaterThan(0);
					});
				}
			});
		});
	});

	describe('Trait Validation', () => {
		it('should validate all traits in the game data', () => {
			const traits = gameData.traits;
			expect(traits).toBeDefined();
			expect(Array.isArray(traits)).toBe(true);
			expect(traits.length).toBeGreaterThan(0);

			traits.forEach((trait, index) => {
				const errors = validateTraitDefinition(trait);
				if (errors.length > 0) {
					console.error(`Trait ${index} (${trait.id || 'unknown'}) validation errors:`, errors);
				}
				expect(errors).toEqual([]);
			});
		});

		it('should have unique trait IDs', () => {
			const traits = gameData.traits;
			const traitIds = traits.map(trait => trait.id);
			const uniqueIds = [...new Set(traitIds)];
			expect(uniqueIds.length).toBe(traitIds.length);
		});

		it('should validate trait structure requirements', () => {
			const traits = gameData.traits;

			traits.forEach(trait => {
				// All traits should have required fields
				expect(trait.id).toBeDefined();
				expect(typeof trait.id).toBe('string');
				expect(trait.id.length).toBeGreaterThan(0);

				expect(trait.name).toBeDefined();
				expect(typeof trait.name).toBe('string');
				expect(trait.name.length).toBeGreaterThan(0);

				expect(trait.description).toBeDefined();
				expect(typeof trait.description).toBe('string');
				expect(trait.description.length).toBeGreaterThan(0);

				// Categories should be an array
				expect(Array.isArray(trait.categories)).toBe(true);
				trait.categories.forEach(category => {
					expect(typeof category).toBe('string');
					expect(category.length).toBeGreaterThan(0);
				});

				// Effects should be an array
				expect(Array.isArray(trait.effects)).toBe(true);
				trait.effects.forEach(effect => {
					expect(effect.effectId).toBeDefined();
					expect(typeof effect.effectId).toBe('string');
					expect(effect.effectId.length).toBeGreaterThan(0);

					expect(effect.eventTrigger).toBeDefined();
					expect(typeof effect.eventTrigger).toBe('string');
					expect(effect.eventTrigger.length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe('Effect Validation', () => {
		it('should validate all effects in traits', () => {
			const traits = gameData.traits;
			const allEffects: any[] = [];

			// Collect all effects from all traits
			traits.forEach(trait => {
				trait.effects.forEach((effect, effectIndex) => {
					const errors = validateEffectDefinition(effect, trait.id, effectIndex);
					if (errors.length > 0) {
						console.error(`Effect ${effectIndex} (${effect.effectId || 'unknown'}) in trait ${trait.id} validation errors:`, errors);
					}
					expect(errors.length).toBe(0);
					allEffects.push(effect);
				});
			});

			expect(allEffects.length).toBeGreaterThan(0);
		});

		it('should validate effect parameter consistency', () => {
			const traits = gameData.traits;
			const cards = gameData.cards;
			const traitDefinitions = new Map(traits.map(trait => [trait.id, trait]));

			cards.forEach(card => {
				const errors = validateTraitParameters(card, traitDefinitions);
				if (errors.length > 0) {
					console.error(`Trait parameter validation errors for card ${card.id}:`, errors);
				}
				expect(errors.length).toBe(0);
			});
		});
	});

	describe('Cross-Reference Validation', () => {
		it('should validate that all card trait references exist', () => {
			const cards = gameData.cards;
			const traits = gameData.traits;
			const traitIds = new Set(traits.map(trait => trait.id));

			cards.forEach(card => {
				card.traits.forEach(traitRef => {
					expect(traitIds.has(traitRef.id)).toBe(true);
				});
			});
		});

		it('should validate that trait references in cards are correct', () => {
			const cards = gameData.cards;
			const traits = gameData.traits;
			const traitIds = new Set(traits.map(trait => trait.id));

			cards.forEach(card => {
				card.traits.forEach(traitRef => {
					expect(traitIds.has(traitRef.id)).toBe(true);
				});
			});
		});
	});

	describe('Overall Game Data Validation', () => {
		it('should validate the entire game data structure', () => {
			const result = validateCompleteGameData(gameData);

			if (!result.isValid) {
				console.error('Game data validation errors:', result.errors);
				result.errors.forEach((error) => {
					console.error(`  - ${error.message}`);
				});
			}
			expect(result.isValid).toBe(true);
		});

		it('should validate game data consistency', () => {
			const errors = validateGameDataConsistency(gameData);

			if (errors.length > 0) {
				console.error('Game data consistency errors:', errors);
				errors.forEach((error) => {
					console.error(`  - ${error.message}`);
				});
			}
			expect(errors.length).toBe(0);
		});

		it('should have a valid collection structure', () => {
			expect(gameData.id).toBeDefined();
			expect(typeof gameData.id).toBe('string');
			expect(gameData.id.length).toBeGreaterThan(0);

			expect(gameData.name).toBeDefined();
			expect(typeof gameData.name).toBe('string');
			expect(gameData.name.length).toBeGreaterThan(0);

			expect(gameData.cards).toBeDefined();
			expect(Array.isArray(gameData.cards)).toBe(true);

			expect(gameData.traits).toBeDefined();
			expect(Array.isArray(gameData.traits)).toBe(true);
		});
	});

	describe('Specific Game Balance Validation', () => {
		it('should validate reasonable stat ranges for cards', () => {
			const cards = gameData.cards;

			cards.forEach(card => {
				// HP should be within reasonable bounds
				expect(card.hp).toBeGreaterThanOrEqual(10);
				expect(card.hp).toBeLessThanOrEqual(500);

				// Power should be within reasonable bounds
				expect(card.power).toBeGreaterThanOrEqual(1);
				expect(card.power).toBeLessThanOrEqual(100);

				// Cooldown should be within reasonable bounds (in milliseconds)
				expect(card.cooldown).toBeGreaterThanOrEqual(500);
				expect(card.cooldown).toBeLessThanOrEqual(10000);
			});
		});

		it('should validate trait category consistency', () => {
			const traits = gameData.traits;
			const validCategories = [
				'offensive', 'defensive', 'support', 'utility', 'aura', 'debuff',
				'buff', 'healing', 'morale', 'economy', 'personality', 'companion',
				'skill_activation', 'guild_wide', 'stat_modification', 'versatile',
				'scaling', 'risky', 'crowd_control', 'time_control', 'damage_over_time',
				'cleanse', 'evasion', 'conditional', 'reflect', 'elite', 'drawback',
				'gold_generation'
			];

			traits.forEach(trait => {
				trait.categories.forEach(category => {
					expect(validCategories).toContain(category);
				});
			});
		});

		it('should validate event trigger consistency', () => {
			const traits = gameData.traits;
			const validTriggers = [
				'onAction', 'onBattleStart', 'onAttackByMe', 'onTakeDamage',
				'onLowMorale', 'onDeath', 'onSummon', 'onHeal', 'onCrit'
			];

			traits.forEach(trait => {
				trait.effects.forEach(effect => {
					expect(validTriggers).toContain(effect.eventTrigger);
				});
			});
		});
	});

	describe('Data Integrity Checks', () => {
		it('should ensure no duplicate names within cards', () => {
			const cards = gameData.cards;
			const cardNames = cards.map(card => card.name);
			const uniqueNames = [...new Set(cardNames)];
			expect(uniqueNames.length).toBe(cardNames.length);
		});

		it('should ensure no duplicate names within traits', () => {
			const traits = gameData.traits;
			const traitNames = traits.map(trait => trait.name);
			const uniqueNames = [...new Set(traitNames)];
			expect(uniqueNames.length).toBe(traitNames.length);
		});

		it('should validate that cards with specific traits have appropriate stats', () => {
			const cards = gameData.cards;

			cards.forEach(card => {
				const traitIds = card.traits.map(t => t.id);

				// Cards with 'tank' tag should have higher HP
				if (card.tags && card.tags.includes('tank')) {
					expect(card.hp).toBeGreaterThanOrEqual(150);
				}

				// Cards with ranged trait should have ranged tag or appropriate power
				if (traitIds.includes('ranged')) {
					const hasRangedTag = card.tags && (
						card.tags.includes('ranged_dps') ||
						card.tags.includes('archer') ||
						card.tags.includes('caster')
					);
					// Either has ranged tag or reasonable power for ranged unit
					expect(hasRangedTag || card.power >= 15).toBe(true);
				}

				// Healing units should have heal power type or healing traits
				if (card.powerType === 'heal') {
					const hasHealingTraits = traitIds.some(id =>
						id.includes('heal') || id.includes('protector') || id.includes('morale')
					);
					expect(hasHealingTraits || card.tags?.includes('healer')).toBe(true);
				}
			});
		});
	});
});
