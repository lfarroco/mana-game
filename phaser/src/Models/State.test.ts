/**
 * @jest-environment jsdom
 */
import {
	getBattleUnit,
	getActiveUnits,
	getAllActiveFoes,
	getBattleUnitAt,
	getGuildUnitAt,
	getGuildUnit,
	getUnitAt
} from './State';
import { Unit, createTestUnit } from './Entities/Unit';
import { vec2 } from './Geometry.pure';

const mockUnits: Unit[] = [
	createTestUnit('u1', 'f1', vec2(0, 0)) as Unit,
	createTestUnit('u2', 'f2', vec2(1, 1)) as Unit,
	createTestUnit('u3', 'f2', vec2(2, 2)) as Unit,
];

const mockState: any = {
	battleData: {
		units: mockUnits,
	},
	gameData: {
		player: {
			units: [
				createTestUnit('g1', 'player', vec2(3, 3)) as Unit,
				createTestUnit('g2', 'player', vec2(4, 4)) as Unit,
			],
		},
	},
};

describe('State selectors', () => {
	test('getBattleUnit returns correct unit by id', () => {
		expect(getBattleUnit(mockState)('u1')).toEqual(mockUnits[0]);
		expect(getBattleUnit(mockState)('u3')).toEqual(mockUnits[2]);
	});

	test('getActiveUnits returns all units', () => {
		const result = getActiveUnits(mockState);
		expect(result).toHaveLength(3);
		expect(result).toEqual(mockUnits);
	});

	test('getAllActiveFoes returns active units not matching forceId', () => {
		const foes = getAllActiveFoes(mockState)('f1');
		expect(foes).toEqual([mockUnits[1], mockUnits[2]]);
	});

	test('getBattleUnitAt returns unit at given position', () => {
		expect(getBattleUnitAt(mockState)(vec2(0, 0))).toEqual(mockUnits[0]);
		expect(getBattleUnitAt(mockState)(vec2(1, 1))).toEqual(mockUnits[1]);
		expect(getBattleUnitAt(mockState)(vec2(2, 2))).toEqual(mockUnits[2]);
		expect(getBattleUnitAt(mockState)(vec2(5, 5))).toBeUndefined();
	});

	test('getGuildUnitAt returns player unit at position', () => {
		expect(getGuildUnitAt(mockState)(vec2(3, 3))).toEqual(mockState.gameData.player.units[0]);
		expect(getGuildUnitAt(mockState)(vec2(4, 4))).toEqual(mockState.gameData.player.units[1]);
		expect(getGuildUnitAt(mockState)(vec2(5, 5))).toBeUndefined();
	});

	test('getGuildUnit returns player unit by id', () => {
		expect(getGuildUnit(mockState)('g1')).toEqual(mockState.gameData.player.units[0]);
		expect(getGuildUnit(mockState)('g2')).toEqual(mockState.gameData.player.units[1]);
		expect(getGuildUnit(mockState)('g3')).toBeUndefined();
	});

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
