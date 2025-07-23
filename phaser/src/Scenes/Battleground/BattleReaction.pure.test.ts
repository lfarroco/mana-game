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

	it("triggers battle_reaction trait on other units when action matches", async () => {
		const actionUnit = makeUnit("u1", "player", [{ id: "damage" }]);
		const reactorUnit = makeUnit("u2", "cpu", [
			{ id: "battle_reaction", actionId: "damage", source_selector: "all_enemies" }
		]);
		const triggerSpy = jest.fn();
		const deps: BattleReactionDeps = {
			getActionIdsFromTrait: () => ["damage"],
			shouldTriggerBattleReaction: () => true,
			triggerBattleReaction: triggerSpy,
			getActiveUnits: () => [actionUnit, reactorUnit],
		};
		await processBattleReactionsPure(actionUnit, state, deps);
		expect(triggerSpy).toHaveBeenCalledWith(
			reactorUnit,
			reactorUnit.traits[0],
			actionUnit,
			"damage"
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
