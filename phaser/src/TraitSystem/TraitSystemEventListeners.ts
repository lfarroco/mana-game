/**
 * @file Sets up event listeners for the Trait System.
 * This module connects various game events to the trait processing logic,
 * allowing traits to react to in-game occurrences.
 */

import { GameEvents } from "../constants/events";
import { getState } from "../Models/State";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import {
	EmptyPayload,
} from "../Models/EventPayloads";
import { processEffects } from "../TriggerSystem/TriggerSystem";


/**
 * Sets up all necessary event listeners for the trait system.
 * This function should be called once when the battle scene is created or initialized.
 * It listens for various `GameEvents` and triggers the appropriate trait processing functions.
 *
 * @param scene - The `BattlegroundScene` instance where the events will be emitted.
 */
export function setupTraitEventListeners(scene: BattlegroundScene): void {

	scene.events.on(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, async (_payload: EmptyPayload) => {

		const battleStartEffects = getState().battleData.units.flatMap(u => {
			return u.reactions.filter(e => e.effectId === "battle_start");
		}).flatMap(r => r.effects);

		processEffects(scene, battleStartEffects);

	});

}