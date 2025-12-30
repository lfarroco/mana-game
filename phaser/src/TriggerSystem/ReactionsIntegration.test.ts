
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '../Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '../Scenes/Battleground/RunCombatCore';
import { dealDamageLogicIO, applyPoisonLogicIO } from './effects';
import { applyHasteLogicIO } from './effects/applyHaste';
import { applySlowLogicIO } from './effects/applySlow';
import { restoreLife } from './effects/restoreLife';
import { registerCollection } from '../Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '../Data/BaseCollection';
import { Unit } from '../Models/Entities/Unit';
import * as StateModule from '../Models/State';
import { getBattleCore } from '../Models/Entities/Card';
import { FORCE_ID_PLAYER } from '../Scenes/Battleground/ServerConstants';
import { processReactions } from './TriggerSystem';

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

// Mock State module
jest.mock('../Models/State', () => ({
	...jest.requireActual('../Models/State') as any,
	getState: jest.fn()
}));

beforeAll(() => {
	if (typeof global.structuredClone === 'undefined') {
		global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe('Reaction System Tests', () => {
	let state: any;
	let effects: any;
	let env: any;
	let sourceUnit: Unit;
	let reactorUnit: Unit;
	let combatRunner: any;

	beforeEach(() => {
		state = createMockState();

		// Boost core life so they don't die during tests
		state.battleData.units.forEach((u: Unit) => {
			if (u.isCore) {
				u.life = 10000;
				u.maxLife = 10000;
			}
		});

		// Configure getState mock
		(StateModule.getState as jest.Mock).mockReturnValue(state);

		// Create source unit (the one acting)
		sourceUnit = {
			id: 'source_unit',
			cardId: 'test_card_1',
			force: FORCE_ID_PLAYER,
			power: 50,
			bonusPower: 0,
			life: 500,
			maxLife: 500,
			shield: 0,
			cooldown: 1000,
			evade: 0,
			charge: 0,
			hasted: 0,
			slowed: 0,
			effects: [],
			reactions: [],
			position: { x: 0, y: 0 },
			isCore: false,
			refresh: 0,
			rank: 1,
			pic: ''
		} as Unit;

		// Create reactor unit (the one watching for events)
		reactorUnit = {
			id: 'reactor_unit',
			cardId: 'test_card_2',
			force: FORCE_ID_PLAYER, // Same force
			power: 10,
			bonusPower: 0,
			life: 500,
			maxLife: 500,
			shield: 0,
			cooldown: 1000,
			evade: 0,
			charge: 0,
			hasted: 0,
			slowed: 0,
			effects: [],
			reactions: [],
			position: { x: 1, y: 0 },
			isCore: false,
			refresh: 0,
			rank: 1,
			pic: ''
		} as Unit;

		state.battleData.units.push(sourceUnit, reactorUnit);

		effects = createServerCombatEffects(state);
		combatRunner = runCombat(state, effects);
		env = combatRunner.getEnv();
	});

	it('should trigger every_100_damage reaction when cumulative damage reaches 100', async () => {
		reactorUnit.reactions = [{
			position: 'allies',
			effectId: 'every_100_damage',
			effects: [{
				id: 'increase_power',
				amount: 50,
				targets: { id: 'self' },
				permanent: true
			}]
		}];

		sourceUnit.power = 50;
		dealDamageLogicIO(env, sourceUnit);
		effects.setFrame(50);
		expect(reactorUnit.bonusPower).toBe(0);

		dealDamageLogicIO(env, sourceUnit); // Total 100
		effects.setFrame(100);
		effects.setFrame(150);

		expect(reactorUnit.bonusPower).toBe(50);

		sourceUnit.power = 100;
		dealDamageLogicIO(env, sourceUnit); // Total 200
		effects.setFrame(200);
		effects.setFrame(250);

		expect(reactorUnit.bonusPower).toBe(100);
	});

	it('should trigger every_10_poison when cumulative poison reaches 10', async () => {
		reactorUnit.reactions = [{
			position: 'allies',
			effectId: 'every_10_poison',
			effects: [{
				id: 'increase_power',
				amount: 20,
				targets: { id: 'self' },
				permanent: true
			}]
		}];

		sourceUnit.power = 50;

		// Apply 5 poison -> Total 5. No trigger.
		await applyPoisonLogicIO(env, sourceUnit);
		effects.setFrame(50);
		expect(reactorUnit.bonusPower).toBe(0);

		// Apply 5 poison -> Total 10. Trigger!
		await applyPoisonLogicIO(env, sourceUnit);
		effects.setFrame(100);
		effects.setFrame(150);

		expect(reactorUnit.bonusPower).toBe(20);
	});

	it('should allow multiple units to react to the same threshold event', async () => {
		const reactorUnit2 = JSON.parse(JSON.stringify(reactorUnit));
		reactorUnit2.id = 'reactor_unit_2';
		reactorUnit2.bonusPower = 0;
		state.battleData.units.push(reactorUnit2);

		const reaction = {
			position: 'allies',
			effectId: 'every_100_damage',
			effects: [{
				id: 'increase_power',
				amount: 10,
				targets: { id: 'self' },
				permanent: true
			}]
		} as any;

		reactorUnit.reactions = [reaction];
		reactorUnit2.reactions = [reaction];

		sourceUnit.power = 100;
		dealDamageLogicIO(env, sourceUnit); // Total 100
		effects.setFrame(100);
		effects.setFrame(150);

		expect(reactorUnit.bonusPower).toBe(10);
		expect(reactorUnit2.bonusPower).toBe(10);
	});

	it('should trigger on_crit when a critical hit occurs', async () => {
		// Setup source unit to always crit
		sourceUnit.critical = 200;
		// Ensure dealDamage finds core
		const core = state.battleData.units.find((u: Unit) => u.isCore && u.force !== sourceUnit.force);
		if (!core) throw new Error("Enemy core not found");

		// Reactor: sourceUnit responds to its own crit
		sourceUnit.reactions = [{
			position: 'self',
			effectId: 'on_crit',
			effects: [{
				id: 'increase_power',
				amount: 50,
				targets: { id: 'self' },
				permanent: true
			}]
		}];

		dealDamageLogicIO(env, sourceUnit);
		// Increase frame delay to be safe
		effects.setFrame(300);
		effects.setFrame(350);

		expect(sourceUnit.bonusPower).toBe(50);
	});

	it('should trigger re_hasted when haste is applied', async () => {
		// Setup reaction on reactorUnit
		// Must use 'allies' position as 're_hasted' event doesn't carry target info to match 'self'
		reactorUnit.reactions = [{
			position: 'allies',
			effectId: 're_hasted',
			effects: [{
				id: 'increase_power',
				amount: 20,
				targets: { id: 'self' },
				permanent: true
			}]
		}];
		reactorUnit.hasted = 100;

		const duration = 500;
		// Cast on reactorUnit
		await applyHasteLogicIO(env, [reactorUnit], sourceUnit, duration, (_target: Unit) =>
			processReactions(env, sourceUnit, { id: "re_hasted" } as any, 1) // Triggering unit is sourceUnit
		);
		effects.setFrame(300);
		effects.setFrame(350);

		expect(reactorUnit.bonusPower).toBe(20);
	});

	it('should trigger re_slow when slow is applied', async () => {
		// Setup reaction on reactorUnit
		reactorUnit.reactions = [{
			position: 'allies',
			effectId: 're_slow',
			effects: [{
				id: 'increase_power',
				amount: 30,
				targets: { id: 'self' },
				permanent: true
			}]
		}];
		reactorUnit.slowed = 100;

		const duration = 500;
		// Cast on reactorUnit
		await applySlowLogicIO(env, sourceUnit, [reactorUnit], duration, (_target: Unit) =>
			processReactions(env, sourceUnit, { id: "re_slow" } as any, 1)
		);
		effects.setFrame(300);
		effects.setFrame(350);

		expect(reactorUnit.bonusPower).toBe(30);
	});

	it('should trigger on_over_heal when healing triggers over heal condition', async () => {
		const playerCore = getBattleCore(state)(FORCE_ID_PLAYER);
		if (!playerCore) throw new Error('Core not found');
		playerCore.maxLife = 1000;
		playerCore.life = 990;

		sourceUnit.reactions = [{
			position: 'self',
			effectId: 'on_over_heal',
			effects: [{
				id: 'increase_power',
				amount: 100,
				targets: { id: 'self' },
				permanent: true
			}]
		}];

		await restoreLife(env, sourceUnit);
		effects.setFrame(300);
		effects.setFrame(350);

		expect(sourceUnit.bonusPower).toBe(100);
	});

	it('should trigger on_battle_start at the beginning of combat', () => {
		const freshState = createMockState();
		(StateModule.getState as jest.Mock).mockReturnValue(freshState);

		const unitWithStartReaction = {
			...sourceUnit,
			id: 'start_reactor',
			reactions: [{
				position: 'self',
				effectId: 'on_battle_start',
				effects: [{
					id: 'increase_power',
					amount: 77,
					targets: { id: 'self' },
					permanent: true
				}]
			}]
		} as Unit;

		freshState.battleData.units.push(unitWithStartReaction);

		const freshEffects = createServerCombatEffects(freshState);
		runCombat(freshState, freshEffects);
		freshEffects.setFrame(250);

		expect(unitWithStartReaction.bonusPower).toBe(77);
	});
});
