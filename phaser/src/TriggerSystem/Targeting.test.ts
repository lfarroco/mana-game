
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { resolveTargets, Effect } from './TriggerSystem';
import { createMockState } from '../test-utils/serverCombatUtils';
import { Unit } from '../Models/Entities/Unit';
import { registerCollection } from '../Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '../Data/BaseCollection';
import { State } from '../Models/State';

// Mock i18n
jest.mock('../i18n/i18n', () => ({
	t: (key: string) => key,
	getName: (id: string) => id,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => 'en',
	getAvailableLocales: () => ['en'],
	getNativeName: () => 'English'
}));

beforeAll(() => {
	if (typeof global.structuredClone === 'undefined') {
		global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe('TriggerSystem Targeting', () => {
	let state: State;
	let sourceUnit: Unit;
	let allyRight: Unit;
	let allyTop: Unit;
	let allyRowFar: Unit;
	let enemy1: Unit;
	let enemy2: Unit;

	beforeEach(() => {
		state = createMockState();

		// Setup units:
		// Source at (1, 1)
		// AllyRight at (2, 1) - power 20
		// AllyTop at (1, 0) - power 5
		// AllyRowFar at (3, 1) - power 10
		// Enemy1 at (1, 2) - power 15
		// Enemy2 at (0, 1) - power 25

		const baseUnit = state.battleData.units[0]; // Player unit base
		const enemyBase = state.battleData.units[1]; // CPU unit base

		sourceUnit = { ...baseUnit, id: "source", position: { x: 1, y: 1 }, power: 10 };
		allyRight = { ...baseUnit, id: "allyRight", position: { x: 2, y: 1 }, power: 20 };
		allyTop = { ...baseUnit, id: "allyTop", position: { x: 1, y: 0 }, power: 5 };
		allyRowFar = { ...baseUnit, id: "allyFar", position: { x: 3, y: 1 }, power: 10 };

		enemy1 = { ...enemyBase, id: "enemy1", position: { x: 1, y: 2 }, power: 15 };
		enemy2 = { ...enemyBase, id: "enemy2", position: { x: 0, y: 1 }, power: 25 };

		state.battleData.units = [sourceUnit, allyRight, allyTop, allyRowFar, enemy1, enemy2];
	});

	const createEffect = (targetingId: string, extra?: any): Effect => ({
		id: "damage",
		targets: { id: targetingId, ...extra }
	} as any);

	it('should resolve self', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("self"));
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(sourceUnit.id);
	});

	it('should resolve right_ally', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("right_ally"));
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(allyRight.id);
	});

	it('should resolve left_ally (none)', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("left_ally"));
		expect(targets).toHaveLength(0);
	});

	it('should resolve top_ally', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("top_ally"));
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(allyTop.id);
	});

	it('should resolve row_allies (excluding self)', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("row_allies"));
		// Should include allyRight and allyRowFar. AllyTop is different y.
		expect(targets).toHaveLength(2);
		const ids = targets.map(u => u.id).sort();
		expect(ids).toEqual(["allyFar", "allyRight"]);
	});

	it('should resolve column_allies (excluding self)', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("column_allies"));
		// Should include allyTop (x=1). Self is x=1.
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(allyTop.id);
	});

	it('should resolve strongest_enemy', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("strongest_enemy"));
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(enemy2.id); // Power 25 vs 15
	});

	it('should resolve weakest_enemy', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("weakest_enemy"));
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(enemy1.id); // Power 15 vs 25
	});

	it('should resolve reference trigger target if provided', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("trigger"), enemy1);
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(enemy1.id);
	});

	it('should fallback to source if trigger unit not provided for trigger target', () => {
		const targets = resolveTargets(state, sourceUnit, createEffect("trigger"));
		expect(targets).toHaveLength(1);
		expect(targets[0].id).toBe(sourceUnit.id);
	});
});
