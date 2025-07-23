import {
	resolveTargetSelectorFromParams,
	resolveConditionsFromParams
} from './TraitEffectSystem';
import { TraitData } from './Traits';

describe('Parametric Trait System', () => {
	describe('resolveTargetSelectorFromParams', () => {
		it('should resolve target parameters to correct selectors', () => {
			const traitData: TraitData = { id: 'boost_power_on_battle_start' as any, targets: 'left' };
			const effectInstance = { effectId: 'modify_stat_passive', eventTrigger: 'onBattleStart' };

			const result = resolveTargetSelectorFromParams(traitData, effectInstance);
			expect(result).toBe('ally_left');
		});

		it('should handle right target', () => {
			const traitData: TraitData = { id: 'boost_power_on_battle_start' as any, targets: 'right' };
			const effectInstance = { effectId: 'modify_stat_passive', eventTrigger: 'onBattleStart' };

			const result = resolveTargetSelectorFromParams(traitData, effectInstance);
			expect(result).toBe('ally_right');
		});

		it('should handle adjacent targets', () => {
			const traitData: TraitData = { id: 'haste' as any, targets: 'adjacent' };
			const effectInstance = { effectId: 'apply_haste', eventTrigger: 'onAction' };

			const result = resolveTargetSelectorFromParams(traitData, effectInstance);
			expect(result).toBe('allies_adjacent');
		});

		it('should handle same_column_allies targets', () => {
			const traitData: TraitData = { id: 'haste' as any, targets: 'same_column_allies' };
			const effectInstance = { effectId: 'apply_haste', eventTrigger: 'onAction' };

			const result = resolveTargetSelectorFromParams(traitData, effectInstance);
			expect(result).toBe('all_allies_in_column');
		});

		it('should handle same_row_allies targets', () => {
			const traitData: TraitData = { id: 'haste' as any, targets: 'same_row_allies' };
			const effectInstance = { effectId: 'apply_haste', eventTrigger: 'onAction' };

			const result = resolveTargetSelectorFromParams(traitData, effectInstance);
			expect(result).toBe('all_allies_in_row');
		});

		it('should default to self when no targets specified', () => {
			const traitData: TraitData = { id: 'some_trait' as any };
			const effectInstance = { effectId: 'some_effect', eventTrigger: 'onBattleStart' };

			const result = resolveTargetSelectorFromParams(traitData, effectInstance);
			expect(result).toBe('self');
		});

		it('should use explicit targetSelector when provided (backward compatibility)', () => {
			const traitData: TraitData = { id: 'old_trait' as any, targets: 'left' };
			const effectInstance = {
				effectId: 'modify_stat_passive',
				eventTrigger: 'onBattleStart',
				targetSelector: 'ally_right' // Explicit selector should take precedence
			};

			const result = resolveTargetSelectorFromParams(traitData, effectInstance);
			expect(result).toBe('ally_right');
		});
	});

	describe('resolveConditionsFromParams', () => {
		it('should create row conditions from position parameter', () => {
			const traitData: TraitData = { id: 'positional_boost' as any, position: 'front' };
			const effectInstance = { effectId: 'modify_stat_passive', eventTrigger: 'onBattleStart' };

			const result = resolveConditionsFromParams(traitData, effectInstance);
			expect(result).toEqual([{
				type: 'is_in_row',
				row: 'front'
			}]);
		});

		it('should create column conditions from position parameter', () => {
			const traitData: TraitData = { id: 'positional_boost' as any, position: 'left' };
			const effectInstance = { effectId: 'modify_stat_passive', eventTrigger: 'onBattleStart' };

			const result = resolveConditionsFromParams(traitData, effectInstance);
			expect(result).toEqual([{
				type: 'is_in_column',
				column: 'left'
			}]);
		});

		it('should create corner conditions', () => {
			const traitData: TraitData = { id: 'positional_boost' as any, position: 'corner' };
			const effectInstance = { effectId: 'modify_stat_passive', eventTrigger: 'onBattleStart' };

			const result = resolveConditionsFromParams(traitData, effectInstance);
			expect(result).toEqual([{
				type: 'is_in_corner'
			}]);
		});

		it('should preserve existing conditions and add new ones', () => {
			const traitData: TraitData = { id: 'complex_trait' as any, position: 'center' };
			const effectInstance = {
				effectId: 'modify_stat_passive',
				eventTrigger: 'onBattleStart',
				conditions: [{ type: 'battle_time_elapsed', seconds: 5 }]
			};

			const result = resolveConditionsFromParams(traitData, effectInstance);
			expect(result).toEqual([
				{ type: 'battle_time_elapsed', seconds: 5 },
				{ type: 'is_in_center' }
			]);
		});

		it('should return empty array when no conditions needed', () => {
			const traitData: TraitData = { id: 'simple_trait' as any };
			const effectInstance = { effectId: 'modify_stat_passive', eventTrigger: 'onBattleStart' };

			const result = resolveConditionsFromParams(traitData, effectInstance);
			expect(result).toEqual([]);
		});
	});
});
