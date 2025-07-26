// Property-based tests for source selectors and effects
describe("property-based battle reaction tests", () => {
	function makeUnit(id: string, force: string, traits: any[] = [], position = { x: 0, y: 0 }) {
		return {
			id,
			force,
			traits,
			position,
			charge: 0,
			cooldown: 1,
			refresh: 0,
			hasted: 0,
			slowed: 0,
		} as Unit;
	}

	let state: State;
	beforeEach(() => {
		state = {
			battleData: {
				forces: [
					{ id: "player", morale: 10 },
					{ id: "cpu", morale: 10 },
				],
			},
			gameData: { player: { id: "player" } },
		} as any;
	});

	const noTargetEffects = ["damage", "heal", "shield"];
	const selectors = [
		{ selector: "self", actionPos: { x: 1, y: 1 }, reactorPos: { x: 1, y: 1 }, shouldTrigger: false },
		{ selector: "ally_left", actionPos: { x: 1, y: 1 }, reactorPos: { x: 2, y: 1 }, shouldTrigger: true },
		{ selector: "ally_right", actionPos: { x: 2, y: 1 }, reactorPos: { x: 1, y: 1 }, shouldTrigger: true },
		{ selector: "all_allies", actionPos: { x: 1, y: 1 }, reactorPos: { x: 2, y: 1 }, shouldTrigger: true },
		{ selector: "all_enemies", actionPos: { x: 1, y: 1 }, reactorPos: { x: 2, y: 1 }, shouldTrigger: false }, // different force needed
		{ selector: "same_row_allies", actionPos: { x: 1, y: 2 }, reactorPos: { x: 2, y: 2 }, shouldTrigger: true },
		{ selector: "same_column_allies", actionPos: { x: 3, y: 1 }, reactorPos: { x: 3, y: 2 }, shouldTrigger: true },
	];

	it.each(noTargetEffects.flatMap(effect => selectors.map(sel => [effect, sel] as const)))
		("%s effect with selector %s triggers: %s", async (effect, sel) => {
			const { selector, actionPos, reactorPos, shouldTrigger } = sel;
			const actionUnit = makeUnit("u1", "player", [{ id: effect }], actionPos);
			const reactorUnit = makeUnit("u2", "player", [
				{ id: "battle_reaction", sourceActionId: effect, source_selector: selector }
			], reactorPos);
			const triggerSpy = jest.fn();
			const deps: BattleReactionDeps = {
				getsourceActionIdsFromTrait: () => [effect],
				shouldTriggerBattleReaction: (_trait, actionUnit, _sourceActionId, reactorUnit) => {
					switch (selector) {
						case "self":
							return (actionUnit as Unit).id === (reactorUnit as Unit).id;
						case "ally_left":
							return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x - 1;
						case "ally_right":
							return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x + 1;
						case "all_allies":
							return (actionUnit as Unit).force === (reactorUnit as Unit).force && (actionUnit as Unit).id !== (reactorUnit as Unit).id;
						case "all_enemies":
							return (actionUnit as Unit).force !== (reactorUnit as Unit).force;
						case "same_row_allies":
							return (actionUnit as Unit).force === (reactorUnit as Unit).force && (actionUnit as Unit).position.y === (reactorUnit as Unit).position.y && (actionUnit as Unit).id !== (reactorUnit as Unit).id;
						case "same_column_allies":
							return (actionUnit as Unit).force === (reactorUnit as Unit).force && (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x && (actionUnit as Unit).id !== (reactorUnit as Unit).id;
						default:
							return false;
					}
				},
				triggerBattleReaction: triggerSpy,
				getActiveUnits: () => [actionUnit, reactorUnit],
			};
			await processBattleReactionsPure(actionUnit, state, deps);
			if (shouldTrigger) {
				expect(triggerSpy).toHaveBeenCalledWith(
					reactorUnit,
					reactorUnit.traits[0],
					actionUnit,
					effect
				);
			} else {
				expect(triggerSpy).not.toHaveBeenCalled();
			}
		});

	// Targeted effects: haste, slow
	const targetingCases = [
		// For haste: actionUnit must be to the right of reactorUnit
		{ effect: "haste", selector: "ally_right", actionPos: { x: 2, y: 1 }, reactorPos: { x: 1, y: 1 }, shouldTrigger: true },
		{ effect: "haste", selector: "ally_right", actionPos: { x: 3, y: 1 }, reactorPos: { x: 1, y: 1 }, shouldTrigger: false },
		// For slow: actionUnit must be to the left of reactorUnit
		{ effect: "slow", selector: "ally_left", actionPos: { x: 1, y: 1 }, reactorPos: { x: 2, y: 1 }, shouldTrigger: true },
		{ effect: "slow", selector: "ally_left", actionPos: { x: 0, y: 1 }, reactorPos: { x: 2, y: 1 }, shouldTrigger: false },
	];

	it.each(targetingCases)
		("%s effect with selector %s triggers: %s", async ({ effect, selector, actionPos, reactorPos, shouldTrigger }) => {
			const actionUnit = makeUnit("u1", "player", [{ id: effect }], actionPos);
			const reactorUnit = makeUnit("u2", "player", [
				{ id: "battle_reaction", sourceActionId: effect, source_selector: selector }
			], reactorPos);
			const triggerSpy = jest.fn();
			const deps: BattleReactionDeps = {
				getsourceActionIdsFromTrait: () => [effect],
				shouldTriggerBattleReaction: (_trait, actionUnit, _sourceActionId, reactorUnit) => {
					if (effect === "haste" && selector === "ally_right") {
						return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x + 1;
					} else if (effect === "slow" && selector === "ally_left") {
						return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x - 1;
					}
					return false;
				},
				triggerBattleReaction: triggerSpy,
				getActiveUnits: () => [actionUnit, reactorUnit],
			};
			await processBattleReactionsPure(actionUnit, state, deps);
			if (shouldTrigger) {
				expect(triggerSpy).toHaveBeenCalledWith(
					reactorUnit,
					reactorUnit.traits[0],
					actionUnit,
					effect
				);
			} else {
				expect(triggerSpy).not.toHaveBeenCalled();
			}
		});
});
import { processBattleReactionsPure, BattleReactionDeps } from "./BattleReaction.pure";
import { Unit } from "../../Models/Entities/Unit";
import { State } from "../../Models/State";

describe("processBattleReactionsPure", () => {
	function makeUnit(id: string, force: string, traits: any[] = [], position = { x: 0, y: 0 }) {
		return {
			id,
			force,
			traits,
			position,
			charge: 0,
			cooldown: 1,
			refresh: 0,
			hasted: 0,
			slowed: 0,
		} as Unit;
	}

	let state: State;
	beforeEach(() => {
		state = {
			battleData: {
				forces: [
					{ id: "player", morale: 10 },
					{ id: "cpu", morale: 10 },
				],
			},
			gameData: { player: { id: "player" } },
		} as any;
	});


	it.each([
		["damage"],
		["heal"],
		["shield"]
	])("triggers battle_reaction for %s (party morale effect, no target)", async (effect) => {
		const actionUnit = makeUnit("u1", "player", [{ id: effect }]);
		const reactorUnit = makeUnit("u2", "cpu", [
			{ id: "battle_reaction", sourceActionId: effect, source_selector: "all_enemies" }
		]);
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getsourceActionIdsFromTrait: () => [effect],
			shouldTriggerBattleReaction: () => true,
			triggerBattleReaction: triggerSpy,
			getActiveUnits: () => [actionUnit, reactorUnit],
		};
		await processBattleReactionsPure(actionUnit, state, deps);
		expect(triggerSpy).toHaveBeenCalledWith(
			reactorUnit,
			reactorUnit.traits[0],
			actionUnit,
			effect
		);
	});

	it.each([
		["haste", { x: 1, y: 1 }, { x: 2, y: 1 }, "ally_right"],
		["slow", { x: 2, y: 1 }, { x: 1, y: 1 }, "ally_left"]
	])("triggers battle_reaction for %s with correct unit targeting (source_selector: %s)", async (effect, actionPos, reactorPos, selector) => {
		const actionUnit = makeUnit("u1", "player", [{ id: effect }], actionPos);
		const reactorUnit = makeUnit("u2", "player", [
			{ id: "battle_reaction", sourceActionId: effect, source_selector: selector }
		], reactorPos);
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getsourceActionIdsFromTrait: () => [effect],
			shouldTriggerBattleReaction: (_trait, actionUnit, _sourceActionId, reactorUnit) => {
				// For haste: actionUnit must be to the right of reactorUnit
				// For slow: actionUnit must be to the left of reactorUnit
				if (effect === "haste") {
					return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x - 1;
				} else if (effect === "slow") {
					return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x + 1;
				}
				return false;
			},
			triggerBattleReaction: triggerSpy,
			getActiveUnits: () => [actionUnit, reactorUnit],
		};
		await processBattleReactionsPure(actionUnit, state, deps);
		expect(triggerSpy).toHaveBeenCalledWith(
			reactorUnit,
			reactorUnit.traits[0],
			actionUnit,
			effect
		);
	});

	it("does not trigger battle_reaction if sourceActionId does not match", async () => {
		const actionUnit = makeUnit("u1", "player", [{ id: "heal" }]);
		const reactorUnit = makeUnit("u2", "cpu", [
			{ id: "battle_reaction", sourceActionId: "damage", source_selector: "all_enemies" }
		]);
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getsourceActionIdsFromTrait: () => ["heal"],
			shouldTriggerBattleReaction: () => false,
			triggerBattleReaction: triggerSpy,
			getActiveUnits: () => [actionUnit, reactorUnit],
		};
		await processBattleReactionsPure(actionUnit, state, deps);
		expect(triggerSpy).not.toHaveBeenCalled();
	});

	it("triggers only for correct source_selector", async () => {
		const actionUnit = makeUnit("u1", "player", [{ id: "damage" }], { x: 1, y: 1 });
		const reactorUnit = makeUnit("u2", "player", [
			{ id: "battle_reaction", sourceActionId: "damage", source_selector: "ally_left" }
		], { x: 2, y: 1 });
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getsourceActionIdsFromTrait: () => ["damage"],
			shouldTriggerBattleReaction: (_trait, actionUnit, _sourceActionId, reactorUnit) => {
				return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x - 1;
			},
			triggerBattleReaction: triggerSpy,
			getActiveUnits: () => [actionUnit, reactorUnit],
		};
		await processBattleReactionsPure(actionUnit, state, deps);
		expect(triggerSpy).toHaveBeenCalled();
	});
});
