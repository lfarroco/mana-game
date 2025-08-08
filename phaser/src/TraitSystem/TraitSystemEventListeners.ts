/**
 * @file Sets up event listeners for the Trait System.
 * This module connects various game events to the trait processing logic,
 * allowing traits to react to in-game occurrences.
 */

import { GameEvents } from "../constants/events";
import { getState } from "../Models/State";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import {
	processUnitTraitsForEvent,
} from "./Traits";
import { UnitEventKeys } from "../Models/UnitEvents";
import {
	UnitPayload,
	EmptyPayload,
} from "../Models/EventPayloads";


/**
 * Sets up all necessary event listeners for the trait system.
 * This function should be called once when the battle scene is created or initialized.
 * It listens for various `GameEvents` and triggers the appropriate trait processing functions.
 *
 * @param scene - The `BattlegroundScene` instance where the events will be emitted.
 */
export function setupTraitEventListeners(scene: BattlegroundScene): void {

	scene.events.on(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, async (_payload: EmptyPayload) => {
		// Process for units in parallel instead of sequentially
		getState().battleData.units
			.forEach(unit => processUnitTraitsForEvent(unit, "onBattleStart", scene, getState()));

	});

	scene.events.on(GameEvents.TRAIT_EVAL_BATTLE_END, async (_payload: EmptyPayload) => {
		// Process for units in parallel instead of sequentially
		// Note: Original onBattleEnd did not filter by unit.hp > 0, preserving that behavior.
		getState().battleData.units
			.forEach(unit => processUnitTraitsForEvent(unit, "onBattleEnd", scene, getState()));

	});

	const unitEventMappings: { gameEvent: string, traitKey: UnitEventKeys }[] = [
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_ACTION, traitKey: "onAction" },
	];

	unitEventMappings.forEach(mapping => {
		scene.events.on(mapping.gameEvent, (payload: UnitPayload) => {
			processUnitTraitsForEvent(payload.unit, mapping.traitKey, scene, getState());
		});
	});


}