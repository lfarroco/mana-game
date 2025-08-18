/**
 * @jest-environment jsdom
 */
import { getUnitAt } from './State';
import { Unit, createTestUnit } from './Entities/Unit';
import { vec2 } from './Geometry.pure';

describe('State selectors', () => {

	test('getUnitAt returns unit at position from given array', () => {
		const arr = [
			createTestUnit('a', 'test', vec2(1, 2)) as Unit,
			createTestUnit('b', 'test', vec2(2, 3)) as Unit,
		];
		expect(getUnitAt(arr)(vec2(1, 2))).toEqual(arr[0]);
		expect(getUnitAt(arr)(vec2(2, 3))).toEqual(arr[1]);
		expect(getUnitAt(arr)(vec2(0, 0))).toBeUndefined();
	});
});
