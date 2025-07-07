import {
	createInitialStates,
	getModifiersForForce,
	setModifiersForForce,
	formatModifierValue,
	processModifierEvent,
	isValidForceId,
	createDisplayConfig,
	calculateTextPositions,
	type ModifierState,
	type ModifierStates,
	type ModifierEvent
} from './ModifiersDisplay.pure';
import * as c from '../../../constants/constants';

describe('ModifiersDisplay Pure Functions', () => {
	describe('createInitialStates', () => {
		it('should create initial states with all modifiers at 0', () => {
			const states = createInitialStates();

			expect(states.player).toEqual({ atk: 0, def: 0, heal: 0 });
			expect(states.cpu).toEqual({ atk: 0, def: 0, heal: 0 });
		});
	});

	describe('getModifiersForForce', () => {
		const states: ModifierStates = {
			player: { atk: 2, def: 1, heal: 3 },
			cpu: { atk: -1, def: 4, heal: 0 }
		};

		it('should return player modifiers for PLAYER force ID', () => {
			const result = getModifiersForForce(states, c.FORCE_ID_PLAYER);
			expect(result).toEqual({ atk: 2, def: 1, heal: 3 });
		});

		it('should return cpu modifiers for CPU force ID', () => {
			const result = getModifiersForForce(states, c.FORCE_ID_CPU);
			expect(result).toEqual({ atk: -1, def: 4, heal: 0 });
		});
	});

	describe('setModifiersForForce', () => {
		const initialStates: ModifierStates = {
			player: { atk: 0, def: 0, heal: 0 },
			cpu: { atk: 0, def: 0, heal: 0 }
		};

		it('should update player modifiers without affecting cpu', () => {
			const newModifiers: ModifierState = { atk: 5, def: 2, heal: 1 };
			const result = setModifiersForForce(initialStates, c.FORCE_ID_PLAYER, newModifiers);

			expect(result.player).toEqual({ atk: 5, def: 2, heal: 1 });
			expect(result.cpu).toEqual({ atk: 0, def: 0, heal: 0 });
		});

		it('should update cpu modifiers without affecting player', () => {
			const newModifiers: ModifierState = { atk: -2, def: 3, heal: -1 };
			const result = setModifiersForForce(initialStates, c.FORCE_ID_CPU, newModifiers);

			expect(result.player).toEqual({ atk: 0, def: 0, heal: 0 });
			expect(result.cpu).toEqual({ atk: -2, def: 3, heal: -1 });
		});

		it('should not mutate the original states', () => {
			const newModifiers: ModifierState = { atk: 10, def: 10, heal: 10 };
			const result = setModifiersForForce(initialStates, c.FORCE_ID_PLAYER, newModifiers);

			expect(initialStates.player).toEqual({ atk: 0, def: 0, heal: 0 });
			expect(result).not.toBe(initialStates);
			expect(result.player).not.toBe(initialStates.player);
		});
	});

	describe('formatModifierValue', () => {
		it('should format positive values with + prefix', () => {
			expect(formatModifierValue(5)).toBe('+5');
			expect(formatModifierValue(0)).toBe('+0');
		});

		it('should format negative values without additional prefix', () => {
			expect(formatModifierValue(-3)).toBe('-3');
			expect(formatModifierValue(-10)).toBe('-10');
		});

		it('should format decimal values to 1 decimal place', () => {
			expect(formatModifierValue(2.5)).toBe('+2.5');
			expect(formatModifierValue(-1.5)).toBe('-1.5');
			expect(formatModifierValue(0.1)).toBe('+0.1');
			expect(formatModifierValue(-0.9)).toBe('-0.9');
		});

		it('should round long decimals to 1 decimal place', () => {
			expect(formatModifierValue(0.222222)).toBe('+0.2');
			expect(formatModifierValue(1.666666)).toBe('+1.7');
			expect(formatModifierValue(-2.333333)).toBe('-2.3');
			expect(formatModifierValue(0.95)).toBe('+1');
		});

		it('should remove trailing zeros for whole numbers', () => {
			expect(formatModifierValue(3.0)).toBe('+3');
			expect(formatModifierValue(-4.0)).toBe('-4');
			expect(formatModifierValue(1.00000)).toBe('+1');
		});
	});

	describe('processModifierEvent', () => {
		let initialStates: ModifierStates;

		beforeEach(() => {
			initialStates = {
				player: { atk: 2, def: 1, heal: 0 },
				cpu: { atk: -1, def: 3, heal: 2 }
			};
		});

		describe('MODIFIERS_UPDATED event', () => {
			it('should set all modifiers for the specified force', () => {
				const event: ModifierEvent = {
					type: 'MODIFIERS_UPDATED',
					forceId: c.FORCE_ID_PLAYER,
					atkMod: 5,
					defMod: 3,
					healMod: 1
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.player).toEqual({ atk: 5, def: 3, heal: 1 });
				expect(result.newStates.cpu).toEqual({ atk: -1, def: 3, heal: 2 }); // unchanged
				expect(result.displayUpdate).toEqual({
					forceId: c.FORCE_ID_PLAYER,
					atkMod: 5,
					defMod: 3,
					healMod: 1,
					changedFields: { atk: true, def: true, heal: true }
				});
			});
		});

		describe('Individual modifier change events', () => {
			it('should handle MODIFIER_ATTACK_CHANGED', () => {
				const event: ModifierEvent = {
					type: 'MODIFIER_ATTACK_CHANGED',
					forceId: c.FORCE_ID_PLAYER,
					newValue: 10
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.player).toEqual({ atk: 10, def: 1, heal: 0 });
				expect(result.displayUpdate?.atkMod).toBe(10);
				expect(result.displayUpdate?.changedFields).toEqual({ atk: true, def: false, heal: false });
			});

			it('should handle MODIFIER_DEFENSE_CHANGED', () => {
				const event: ModifierEvent = {
					type: 'MODIFIER_DEFENSE_CHANGED',
					forceId: c.FORCE_ID_CPU,
					newValue: 7
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.cpu).toEqual({ atk: -1, def: 7, heal: 2 });
				expect(result.displayUpdate?.defMod).toBe(7);
				expect(result.displayUpdate?.changedFields).toEqual({ atk: false, def: true, heal: false });
			});

			it('should handle MODIFIER_HEAL_CHANGED', () => {
				const event: ModifierEvent = {
					type: 'MODIFIER_HEAL_CHANGED',
					forceId: c.FORCE_ID_PLAYER,
					newValue: -2
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.player).toEqual({ atk: 2, def: 1, heal: -2 });
				expect(result.displayUpdate?.healMod).toBe(-2);
				expect(result.displayUpdate?.changedFields).toEqual({ atk: false, def: false, heal: true });
			});
		});

		describe('Delta modifier change events', () => {
			it('should handle MODIFIER_DELTA_ATTACK', () => {
				const event: ModifierEvent = {
					type: 'MODIFIER_DELTA_ATTACK',
					forceId: c.FORCE_ID_PLAYER,
					delta: 3
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.player).toEqual({ atk: 5, def: 1, heal: 0 }); // 2 + 3
			});

			it('should handle MODIFIER_DELTA_DEFENSE with negative delta', () => {
				const event: ModifierEvent = {
					type: 'MODIFIER_DELTA_DEFENSE',
					forceId: c.FORCE_ID_CPU,
					delta: -2
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.cpu).toEqual({ atk: -1, def: 1, heal: 2 }); // 3 - 2
			});

			it('should handle MODIFIER_DELTA_HEAL', () => {
				const event: ModifierEvent = {
					type: 'MODIFIER_DELTA_HEAL',
					forceId: c.FORCE_ID_PLAYER,
					delta: 4
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.player).toEqual({ atk: 2, def: 1, heal: 4 }); // 0 + 4
			});
		});

		describe('MODIFIER_RESET_ALL event', () => {
			it('should reset all modifiers to 0', () => {
				const event: ModifierEvent = {
					type: 'MODIFIER_RESET_ALL',
					forceId: c.FORCE_ID_PLAYER
				};

				const result = processModifierEvent(initialStates, event);

				expect(result.newStates.player).toEqual({ atk: 0, def: 0, heal: 0 });
				expect(result.newStates.cpu).toEqual({ atk: -1, def: 3, heal: 2 }); // unchanged
				expect(result.displayUpdate?.changedFields).toEqual({ atk: true, def: true, heal: true });
			});
		});

		it('should not mutate the original states', () => {
			const event: ModifierEvent = {
				type: 'MODIFIER_ATTACK_CHANGED',
				forceId: c.FORCE_ID_PLAYER,
				newValue: 999
			};

			const originalPlayerState = { ...initialStates.player };
			processModifierEvent(initialStates, event);

			expect(initialStates.player).toEqual(originalPlayerState);
		});
	});

	describe('isValidForceId', () => {
		it('should return true for valid force IDs', () => {
			expect(isValidForceId(c.FORCE_ID_PLAYER)).toBe(true);
			expect(isValidForceId(c.FORCE_ID_CPU)).toBe(true);
		});

		it('should return false for invalid force IDs', () => {
			expect(isValidForceId('INVALID')).toBe(false);
			expect(isValidForceId('')).toBe(false);
			expect(isValidForceId('player')).toBe(false);
			expect(isValidForceId('cpu')).toBe(false);
		});
	});

	describe('createDisplayConfig', () => {
		it('should create correct config for player', () => {
			const config = createDisplayConfig(c.FORCE_ID_PLAYER);

			expect(config.forceId).toBe(c.FORCE_ID_PLAYER);
			expect(config.position).toEqual({ x: 20, y: c.SCREEN_HEIGHT - 260 });
			expect(config.colors.value).toBe('#00ff00');
			expect(config.dimensions.width).toBe(360);
		});

		it('should create correct config for CPU', () => {
			const config = createDisplayConfig(c.FORCE_ID_CPU);

			expect(config.forceId).toBe(c.FORCE_ID_CPU);
			expect(config.position).toEqual({ x: c.SCREEN_WIDTH - 380, y: 20 });
			expect(config.colors.value).toBe('#ff4444');
			expect(config.dimensions.width).toBe(360);
		});
	});

	describe('calculateTextPositions', () => {
		it('should calculate correct text positions based on config', () => {
			const config = createDisplayConfig(c.FORCE_ID_PLAYER);
			const positions = calculateTextPositions(config);

			expect(positions.atkLabel).toEqual({ x: 24, y: 24 });
			expect(positions.atkValue).toEqual({ x: 129, y: 24 }); // 24 + 105
			expect(positions.defLabel).toEqual({ x: 24, y: 78 }); // 24 + 54
			expect(positions.defValue).toEqual({ x: 129, y: 78 });
			expect(positions.healLabel).toEqual({ x: 24, y: 132 }); // 24 + 54 * 2
			expect(positions.healValue).toEqual({ x: 144, y: 132 }); // 24 + 120
		});
	});
});
