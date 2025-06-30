/**
 * @file Test file for slowAllEnemies implementation
 */

import { slowAllEnemiesLogic } from './slowAllEnemies';

describe('slowAllEnemiesLogic', () => {
	it('should return the correct slow effect configuration', () => {
		const mockTargets = [
			{ id: 'enemy1', name: 'Enemy 1' },
			{ id: 'enemy2', name: 'Enemy 2' }
		];
		const duration = 3000;

		const result = slowAllEnemiesLogic(mockTargets, duration);

		expect(result).toEqual({
			targets: mockTargets,
			duration: 3000,
			modifier: 1.5,
			message: "Slowed!"
		});
	});

	it('should handle empty targets array', () => {
		const result = slowAllEnemiesLogic([], 2500);

		expect(result).toEqual({
			targets: [],
			duration: 2500,
			modifier: 1.5,
			message: "Slowed!"
		});
	});

	it('should use provided duration', () => {
		const mockTargets = [{ id: 'enemy1' }];
		const duration = 5000;

		const result = slowAllEnemiesLogic(mockTargets, duration);

		expect(result.duration).toBe(5000);
	});

	it('should always use 1.5x multiplier for slowing', () => {
		const mockTargets = [{ id: 'enemy1' }];
		const duration = 2500;

		const result = slowAllEnemiesLogic(mockTargets, duration);

		expect(result.modifier).toBe(1.5);
	});
});
