
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { createMockState } from '../test-utils/serverCombatUtils';
import { createServerCombatEffects } from '../Scenes/Battleground/ServerCombatEffects';
import { runCombat } from '../Scenes/Battleground/RunCombatCore';
import { dealDamageLogicIO, applyPoisonLogicIO } from './effects';
import { registerCollection } from '../Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '../Data/BaseCollection';
import { Unit } from '../Models/Entities/Unit';
import * as StateModule from '../Models/State';

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

describe('Every X Reactions System Tests', () => {
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
			force: 'player',
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

		// Create reactor unit (the one watching for every_x events)
		reactorUnit = {
			id: 'reactor_unit',
			cardId: 'test_card_2',
			force: 'player', // Same force
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
		// Setup reaction on reactorUnit
		// When "every_100_damage" happens (globally for allies), increase self power by 50
		reactorUnit.reactions = [{
			position: 'allies', // Watch allies (and self if Global)
			effectId: 'every_100_damage',
			effects: [{
				id: 'increase_power',
				amount: 50,
				targets: { id: 'self' },
				permanent: true
			}]
		}];

		// sourceUnit deals 50 damage -> Total 50. No trigger.
		sourceUnit.power = 50;
		dealDamageLogicIO(env, sourceUnit);
		effects.setFrame(50); // Trigger damage (frame 24). Reaction? No.

		expect(reactorUnit.bonusPower).toBe(0);

		// sourceUnit deals 50 damage -> Total 100. Trigger!
		dealDamageLogicIO(env, sourceUnit); // call at 50.
		effects.setFrame(100);
		effects.setFrame(150);

		expect(reactorUnit.bonusPower).toBe(50);

		// sourceUnit deals 100 damage -> Total 200. Trigger again!
		sourceUnit.power = 100;
		dealDamageLogicIO(env, sourceUnit); // call at 150. Schedule for 174.
		effects.setFrame(200); // Trigger damage at 174. Current frame 200. Reaction scheduled for 200 + 24 = 224.
		effects.setFrame(250); // Trigger reaction at 224.

		expect(reactorUnit.bonusPower).toBe(100);
	});

	it('should trigger every_10_poison when cumulative poison reaches 10', async () => {
		// Setup reaction on reactorUnit
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

		// Apply 5 poison -> Total 5. No trigger. (Threshold 10)
		await applyPoisonLogicIO(env, sourceUnit);
		effects.setFrame(50);

		expect(reactorUnit.bonusPower).toBe(0);

		// Apply 5 poison -> Total 10. Trigger!
		await applyPoisonLogicIO(env, sourceUnit);
		effects.setFrame(100);
		effects.setFrame(150);

		expect(reactorUnit.bonusPower).toBe(20);

		// Apply 20 poison -> Total 30. (Thresholds: 10, 20, 30 passed).
		// Power 200 -> base 20 poison.
		sourceUnit.power = 200;
		await applyPoisonLogicIO(env, sourceUnit);
		effects.setFrame(200);
		effects.setFrame(250);

		// Previous bonus: 20. New triggers: 2 * 20 = 40. Total = 60.
		expect(reactorUnit.bonusPower).toBe(60);
	});

	it('should allow multiple units to react to the same threshold event', async () => {
		// Add another reactor
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

		// Deal 100 damage
		sourceUnit.power = 100;
		dealDamageLogicIO(env, sourceUnit);
		effects.setFrame(100);
		effects.setFrame(150);

		expect(reactorUnit.bonusPower).toBe(10);
		expect(reactorUnit2.bonusPower).toBe(10);
	});
});
