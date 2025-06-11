/**
 * @file Sets up event listeners for the Trait System.
 * This module connects various game events to the trait processing logic,
 * allowing traits to react to in-game occurrences.
 */

import { GameEvents } from "../constants/events";
import { getState, State } from "./State";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import {
	runUnitEventTraits,
	runAttackEventTraits,
	runUnitEventWithTargetTraits,
	processTraitEvent,
	RelicStateObject // Import the new type for relic sources
} from "./Traits";
import { UnitEventKeys, AttackEventKeys, UnitEventWithTargetKeys } from "./UnitEvents";
import {
	UnitPayload,
	EmptyPayload,
	AttackContextPayload,
	DefenderAttackerPayload,
	UnitKillPayload,
} from "./EventPayloads";

/**
 * Helper to register a trait event listener for events using `runUnitEventTraits`.
 * @param scene The BattlegroundScene instance.
 * @param gameEvent The GameEvent constant from `GameEvents`.
 * @param traitEventKey The specific trait event key (e.g., "onAction").
 */
function registerUnitEventTraitListener(
	scene: BattlegroundScene,
	gameEvent: string,
	traitEventKey: UnitEventKeys
) {
	scene.events.on(gameEvent, async (payload: UnitPayload) => {
		await runUnitEventTraits(traitEventKey, scene, getState(), payload);
	});
}

/**
 * Helper to register a trait event listener for events using `runAttackEventTraits`.
 * @param scene The BattlegroundScene instance.
 * @param gameEvent The GameEvent constant from `GameEvents`.
 * @param traitEventKey The specific trait event key (e.g., "onAttackByMe").
 */
function registerAttackEventTraitListener(
	scene: BattlegroundScene,
	gameEvent: string,
	traitEventKey: AttackEventKeys
) {
	scene.events.on(gameEvent, async (payload: AttackContextPayload) => {
		await runAttackEventTraits(traitEventKey, scene, getState(), payload);
	});
}

function registerUnitEventWithTargetTraitListener(
	scene: BattlegroundScene,
	gameEvent: string,
	traitEventKey: UnitEventWithTargetKeys
) {
	scene.events.on(gameEvent, async (payload: DefenderAttackerPayload | UnitKillPayload) => {
		await runUnitEventWithTargetTraits(traitEventKey, scene, getState(), payload);
	});
}

/**
 * Helper to process traits for all player relics for a given global event.
 * @param scene The BattlegroundScene instance.
 * @param currentState The current game state.
 * @param eventKey The specific trait event key (e.g., "onBattleStart", "onBattleEnd").
 */
async function processGlobalEventRelicTraits(
	scene: BattlegroundScene,
	currentState: State,
	eventKey: string
) {
	// This loop assumes `relic` objects in `currentState.gameData.player.relics`
	// (typed as `Relic[]` via `Force.ts` from `../Scenes/Battleground/Systems/Relic.ts`)
	// include `id: string`, `forceId: string`, and `traits: TraitData[]`.
	// `RelicDefinition` (from Card.ts) provides `traits: TraitData[]`.
	// `forceId` should be assigned when the relic instance is created for a player.
	for (const relic of currentState.gameData.player.relics) {
		// Robust check for necessary properties on the relic object.
		if (relic && relic.id && relic.forceId && relic.traits && Array.isArray(relic.traits)) {
			for (const traitData of relic.traits) { // Assuming relic.traits is TraitData[]
				const relicSource: RelicStateObject = {
					id: relic.id,
					forceId: relic.forceId,
				};
				await processTraitEvent({
					source: relicSource,
					traitInstanceData: traitData,
					eventKey,
					scene,
					state: currentState,
					eventDetails: undefined // Global events typically don't have specific details
				});
			}
		} else if (process.env.NODE_ENV === 'development') {
			console.warn(`Relic (ID: ${relic?.id || 'unknown'}) is missing expected properties (id, forceId, or traits array), skipping for event ${eventKey}. Relic data:`, relic);
		}
	}
}
/**
 * Sets up all necessary event listeners for the trait system.
 * This function should be called once when the battle scene is created or initialized.
 * It listens for various `GameEvents` and triggers the appropriate trait processing functions.
 *
 * @param scene - The `BattlegroundScene` instance where the events will be emitted.
 */
export function setupTraitEventListeners(scene: BattlegroundScene): void {

	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_UNIT_ACTION, "onAction");

	scene.events.on(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, async (_payload: EmptyPayload) => {
		const currentState = getState();
		// Process for units
		for (const unit of currentState.battleData.units) {
			if (unit.hp > 0) {
				await runUnitEventTraits("onBattleStart" as UnitEventKeys, scene, currentState, { unit });
			}
		}
		// Process for player relics
		await processGlobalEventRelicTraits(scene, currentState, "onBattleStart");
	});

	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, "onEnterPosition");
	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_UNIT_LEAVE_POSITION, "onLeavePosition");
	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_UNIT_HALF_HP, "onHalfHP");
	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_UNIT_DEATH, "onDeath");

	registerAttackEventTraitListener(scene, GameEvents.TRAIT_EVAL_ATTACK_BY_ME, "onAttackByMe");

	registerUnitEventWithTargetTraitListener(scene, GameEvents.TRAIT_EVAL_DEFEND_BY_ME, "onDefendByMe");
	registerUnitEventWithTargetTraitListener(scene, GameEvents.TRAIT_EVAL_EVADE_BY_ME, "onEvadeByMe");

	registerAttackEventTraitListener(scene, GameEvents.TRAIT_EVAL_AFTER_ATTACK_BY_ME, "onAfterAttackByMe");

	registerUnitEventWithTargetTraitListener(scene, GameEvents.TRAIT_EVAL_UNIT_KILL_BY_ME, "onUnitKillByMe");
	registerUnitEventWithTargetTraitListener(scene, GameEvents.TRAIT_EVAL_UNIT_KILL, "onUnitKill");
	registerUnitEventWithTargetTraitListener(scene, GameEvents.TRAIT_EVAL_ALLIED_KILLED, "onAlliedKilled");
	registerUnitEventWithTargetTraitListener(scene, GameEvents.TRAIT_EVAL_ENEMY_KILLED, "onEnemyKilled");

	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_ALLIED_ACTION, "onAlliedAction");
	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_TURN_START, "onTurnStart");
	registerUnitEventTraitListener(scene, GameEvents.TRAIT_EVAL_TURN_END, "onTurnEnd");

	scene.events.on(GameEvents.TRAIT_EVAL_BATTLE_END, async (_payload: EmptyPayload) => {
		const currentState = getState();
		// Process for units
		for (const unit of currentState.battleData.units) {
			// Note: Original onBattleEnd did not filter by unit.hp > 0, preserving that behavior.
			await runUnitEventTraits("onBattleEnd" as UnitEventKeys, scene, currentState, { unit });
		}
		// Process for player relics (added for consistency with onBattleStart)
		await processGlobalEventRelicTraits(scene, currentState, "onBattleEnd");
	});
}