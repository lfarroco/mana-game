/**
 * @file Sets up event listeners for the Trait System.
 * This module connects various game events to the trait processing logic,
 * allowing traits to react to in-game occurrences.
 */

import { GameEvents } from "../constants/events";
import { getState, State } from "../Models/State";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import {
	runUnitEventTraits,
	runAttackEventTraits,
} from "./Traits";
import { UnitEventKeys, AttackEventKeys } from "../Models/UnitEvents";
import {
	UnitPayload,
	EmptyPayload,
	AttackContextPayload,
} from "../Models/EventPayloads";


/**
 * Generic type for the functions that run trait evaluations (e.g., runUnitEventTraits).
 * @template K - The type of the event key (e.g., UnitEventKeys, AttackEventKeys).
 * @template P - The type of the payload associated with the event.
 * @param eventKey - The specific trait event key.
 * @param scene - The BattlegroundScene instance.
 * @param state - The current game state.
 * @param payload - The event payload.
 */
type TraitRunFunction<K, P> = (
	eventKey: K,
	scene: BattlegroundScene,
	state: State,
	payload: P
) => Promise<void>;

/**
 * Generic helper to register a trait event listener.
 * It connects a game event to a specific trait processing function.
 *
 * @param scene The BattlegroundScene instance.
 * @param gameEvent The GameEvent constant from `GameEvents`.
 * @param traitEventKey The specific trait event key (e.g., "onAction", "onAttackByMe").
 * @param runTraitsFn The `TraitRunFunction` to call to process the traits for this event.
 */
function registerTraitListener<K, P>(
	scene: BattlegroundScene,
	gameEvent: string,
	traitEventKey: K,
	runTraitsFn: TraitRunFunction<K, P>
) {
	scene.events.on(gameEvent, async (payload: P) => {
		await runTraitsFn(traitEventKey, scene, getState(), payload);
	});
}

/**
 * Sets up all necessary event listeners for the trait system.
 * This function should be called once when the battle scene is created or initialized.
 * It listens for various `GameEvents` and triggers the appropriate trait processing functions.
 *
 * @param scene - The `BattlegroundScene` instance where the events will be emitted.
 */
export function setupTraitEventListeners(scene: BattlegroundScene): void {

	scene.events.on(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, async (_payload: EmptyPayload) => {
		const currentState = getState();
		// Process for units in parallel instead of sequentially
		const traitPromises = currentState.battleData.units
			.filter(unit => unit.hp > 0)
			.map(unit => runUnitEventTraits("onBattleStart" as UnitEventKeys, scene, currentState, { unit }));

		await Promise.all(traitPromises);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_BATTLE_END, async (_payload: EmptyPayload) => {
		const currentState = getState();
		// Process for units in parallel instead of sequentially
		// Note: Original onBattleEnd did not filter by unit.hp > 0, preserving that behavior.
		const traitPromises = currentState.battleData.units
			.map(unit => runUnitEventTraits("onBattleEnd" as UnitEventKeys, scene, currentState, { unit }));

		await Promise.all(traitPromises);
	});

	const unitEventMappings: { gameEvent: string, traitKey: UnitEventKeys }[] = [
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_ACTION, traitKey: "onAction" },
		{ gameEvent: GameEvents.TRAIT_EVAL_ALLIED_ACTION, traitKey: "onAlliedAction" },
		{ gameEvent: GameEvents.TRAIT_EVAL_TURN_START, traitKey: "onTurnStart" },
		{ gameEvent: GameEvents.TRAIT_EVAL_TURN_END, traitKey: "onTurnEnd" },
	];
	unitEventMappings.forEach(mapping => {
		registerTraitListener<UnitEventKeys, UnitPayload>(
			scene, mapping.gameEvent, mapping.traitKey, runUnitEventTraits
		);
	});

	const attackEventMappings: { gameEvent: string, traitKey: AttackEventKeys }[] = [
		{ gameEvent: GameEvents.TRAIT_EVAL_ATTACK_BY_ME, traitKey: "onAttackByMe" },
	];
	attackEventMappings.forEach(mapping => {
		registerTraitListener<AttackEventKeys, AttackContextPayload>(
			scene, mapping.gameEvent, mapping.traitKey, runAttackEventTraits
		);
	});


}