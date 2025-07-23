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
			{ id: "battle_reaction", actionId: effect, source_selector: "all_enemies" }
		]);
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getActionIdsFromTrait: () => [effect],
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
			{ id: "battle_reaction", actionId: effect, source_selector: selector }
		], reactorPos);
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getActionIdsFromTrait: () => [effect],
			shouldTriggerBattleReaction: (_trait, actionUnit, _actionId, reactorUnit) => {
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

	it("does not trigger battle_reaction if actionId does not match", async () => {
		const actionUnit = makeUnit("u1", "player", [{ id: "heal" }]);
		const reactorUnit = makeUnit("u2", "cpu", [
			{ id: "battle_reaction", actionId: "damage", source_selector: "all_enemies" }
		]);
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getActionIdsFromTrait: () => ["heal"],
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
			{ id: "battle_reaction", actionId: "damage", source_selector: "ally_left" }
		], { x: 2, y: 1 });
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getActionIdsFromTrait: () => ["damage"],
			shouldTriggerBattleReaction: (_trait, actionUnit, _actionId, reactorUnit) => {
				return (actionUnit as Unit).position.x === (reactorUnit as Unit).position.x - 1;
			},
			triggerBattleReaction: triggerSpy,
			getActiveUnits: () => [actionUnit, reactorUnit],
		};
		await processBattleReactionsPure(actionUnit, state, deps);
		expect(triggerSpy).toHaveBeenCalled();
	});
});
