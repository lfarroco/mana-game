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
import { vec2 } from './Geometry';
import { Unit } from './Unit';

const mockUnits: Unit[] = [
	{ id: 'u1', hp: 10, force: 'f1', position: vec2(0, 0), statuses: {} } as Unit,
	{ id: 'u2', hp: 0, force: 'f2', position: vec2(1, 1), statuses: {} } as Unit,
	{ id: 'u3', hp: 5, force: 'f2', position: vec2(2, 2), statuses: {} } as Unit,
];

const mockState: any = {
	battleData: {
		units: mockUnits,
	},
	gameData: {
		player: {
			units: [
				{ id: 'g1', position: vec2(3, 3), statuses: {} } as Unit,
				{ id: 'g2', position: vec2(4, 4), statuses: {} } as Unit,
			],
		},
	},
};

describe('State selectors', () => {
	test('getBattleUnit returns correct unit by id', () => {
		expect(getBattleUnit(mockState)('u1')).toEqual(mockUnits[0]);
		expect(getBattleUnit(mockState)('u3')).toEqual(mockUnits[2]);
	});

	test('getActiveUnits returns only units with hp > 0', () => {
		const result = getActiveUnits(mockState);
		expect(result).toHaveLength(2);
		expect(result).toEqual([mockUnits[0], mockUnits[2]]);
	});

	test('getAllActiveFoes returns active units not matching forceId', () => {
		const foes = getAllActiveFoes(mockState)('f1');
		expect(foes).toEqual([mockUnits[2]]);
	});

	test('getBattleUnitAt returns unit at given position', () => {
		expect(getBattleUnitAt(mockState)(vec2(0, 0))).toEqual(mockUnits[0]);
		expect(getBattleUnitAt(mockState)(vec2(2, 2))).toEqual(mockUnits[2]);
		expect(getBattleUnitAt(mockState)(vec2(1, 1))).toBeUndefined(); // hp = 0
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
			{ id: 'a', position: vec2(1, 2) } as Unit,
			{ id: 'b', position: vec2(2, 3) } as Unit,
		];
		expect(getUnitAt(arr)(vec2(1, 2))).toEqual(arr[0]);
		expect(getUnitAt(arr)(vec2(2, 3))).toEqual(arr[1]);
		expect(getUnitAt(arr)(vec2(0, 0))).toBeUndefined();
	});
});
