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
	processTraitEvent, // Relies on TraitEventContext from Traits.ts
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
 * Helper to process traits for all player relics for a given global event.
 * This iterates through the player's active relics and triggers their traits
  * based on the provided `eventKey`.
 *
 * @param scene The BattlegroundScene instance.
 * @param currentState The current game state.
 * @param eventKey The specific global trait event key (e.g., "onBattleStart", "onBattleEnd").
 */
async function processGlobalEventRelicTraits(
	scene: BattlegroundScene,
	currentState: State,
	eventKey: UnitEventKeys // Changed from string for better type safety
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
					eventDetails: { type: "none" } // Global events use NoEventPayloadDetails
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

	// --- Handlers for Global Battle Events (Start/End) ---
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

	// --- Mappings for runUnitEventTraits ---
	const unitEventMappings: { gameEvent: string, traitKey: UnitEventKeys }[] = [
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_ACTION, traitKey: "onAction" },
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, traitKey: "onEnterPosition" },
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_LEAVE_POSITION, traitKey: "onLeavePosition" },
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_HALF_HP, traitKey: "onHalfHP" },
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_DEATH, traitKey: "onDeath" },
		{ gameEvent: GameEvents.TRAIT_EVAL_ALLIED_ACTION, traitKey: "onAlliedAction" },
		{ gameEvent: GameEvents.TRAIT_EVAL_TURN_START, traitKey: "onTurnStart" },
		{ gameEvent: GameEvents.TRAIT_EVAL_TURN_END, traitKey: "onTurnEnd" },
	];
	unitEventMappings.forEach(mapping => {
		registerTraitListener<UnitEventKeys, UnitPayload>(
			scene, mapping.gameEvent, mapping.traitKey, runUnitEventTraits
		);
	});

	// --- Mappings for runAttackEventTraits ---
	const attackEventMappings: { gameEvent: string, traitKey: AttackEventKeys }[] = [
		{ gameEvent: GameEvents.TRAIT_EVAL_ATTACK_BY_ME, traitKey: "onAttackByMe" },
		{ gameEvent: GameEvents.TRAIT_EVAL_AFTER_ATTACK_BY_ME, traitKey: "onAfterAttackByMe" },
	];
	attackEventMappings.forEach(mapping => {
		registerTraitListener<AttackEventKeys, AttackContextPayload>(
			scene, mapping.gameEvent, mapping.traitKey, runAttackEventTraits
		);
	});

	// --- Mappings for runUnitEventWithTargetTraits ---
	const unitEventWithTargetMappings: { gameEvent: string, traitKey: UnitEventWithTargetKeys }[] = [
		{ gameEvent: GameEvents.TRAIT_EVAL_DEFEND_BY_ME, traitKey: "onDefendByMe" },
		{ gameEvent: GameEvents.TRAIT_EVAL_EVADE_BY_ME, traitKey: "onEvadeByMe" },
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_KILL_BY_ME, traitKey: "onUnitKillByMe" },
		{ gameEvent: GameEvents.TRAIT_EVAL_UNIT_KILL, traitKey: "onUnitKill" },
		{ gameEvent: GameEvents.TRAIT_EVAL_ALLIED_KILLED, traitKey: "onAlliedKilled" },
		{ gameEvent: GameEvents.TRAIT_EVAL_ENEMY_KILLED, traitKey: "onEnemyKilled" },
	];
	unitEventWithTargetMappings.forEach(mapping => {
		registerTraitListener<UnitEventWithTargetKeys, DefenderAttackerPayload | UnitKillPayload>(
			scene,
			mapping.gameEvent,
			mapping.traitKey,
			runUnitEventWithTargetTraits
		);
	});
}