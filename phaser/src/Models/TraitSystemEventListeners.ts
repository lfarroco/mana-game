/**
 * @file Sets up event listeners for the Trait System.
 * This module connects various game events to the trait processing logic,
 * allowing traits to react to in-game occurrences.
 */

import { GameEvents } from "../constants/events";
import { State } from "./State";
import { Unit } from "./Unit";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import {
	runUnitEventTraits,
	runAttackEventTraits,
	runUnitEventWithTargetTraits,
	processTraitEvent,
	TraitData,
	RelicStateObject // Import the new type for relic sources
} from "./Traits";
import { UnitEventKeys, AttackEventKeys, UnitEventWithTargetKeys } from "./UnitEvents";

/**
 * Sets up all necessary event listeners for the trait system.
 * This function should be called once when the battle scene is created or initialized.
 * It listens for various `GameEvents` and triggers the appropriate trait processing functions.
 *
 * @param scene - The `BattlegroundScene` instance where the events will be emitted.
 */
export function setupTraitEventListeners(scene: BattlegroundScene): void {

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ACTION, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onAction" as UnitEventKeys, payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, async (payload: { scene: BattlegroundScene, state: State }) => {
		// Iterate over all units for traits that trigger on this global event
		for (const unit of payload.state.battleData.units) {
			if (unit.hp > 0) { // Process only for active units
				await runUnitEventTraits("onBattleStart" as UnitEventKeys, payload.scene, payload.state, unit);
			}
		}
		// Iterate over player relics
		// Ensure that the `Relic` type from `state.gameData.player.relics`
		// is compatible with `RelicStateObject` (i.e., has an `id` field)
		// and also contains a `traits: TraitData[]` field for iteration.
		for (const relic of payload.state.gameData.player.relics) {
			// Assuming `relic` object has `id: string` and `traits: TraitData[]`
			if (relic.traits && Array.isArray(relic.traits)) {
				for (const traitData of relic.traits as TraitData[]) {
					const relicSource = relic as RelicStateObject; // Cast the relic to the expected source type
					await processTraitEvent({
						source: relicSource,
						traitInstanceData: traitData,
						eventKey: "onBattleStart" as UnitEventKeys,
						scene: payload.scene,
						state: payload.state,
						actingPlayerId: payload.state.gameData.player.id,
						eventDetails: undefined
					});
				}
			}
		}
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onEnterPosition" as UnitEventKeys, payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_LEAVE_POSITION, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onLeavePosition" as UnitEventKeys, payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_HALF_HP, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onHalfHP" as UnitEventKeys, payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_DEATH, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onDeath" as UnitEventKeys, payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_ATTACK_BY_ME, async (payload: { unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean, scene: BattlegroundScene, state: State }) => {
		await runAttackEventTraits("onAttackByMe" as AttackEventKeys, payload.scene, payload.state, payload.unit, payload.target, payload.damage, payload.isCritical, payload.evaded);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_DEFEND_BY_ME, async (payload: { unit: Unit, attacker: Unit, scene: BattlegroundScene, state: State }) => {
		// 'unit' is the defender, 'attacker' is the source of the attack.
		// "onDefendByMe" implies traits on the defender (payload.unit) are triggered.
		// The attacker (payload.attacker) is the target of this event context.
		await runUnitEventWithTargetTraits("onDefendByMe" as UnitEventWithTargetKeys, payload.scene, payload.state, payload.unit, payload.attacker);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_EVADE_BY_ME, async (payload: { unit: Unit, attacker: Unit, scene: BattlegroundScene, state: State }) => {
		// 'unit' is the evader, 'attacker' is the source of the attack.
		// "onEvadeByMe" implies traits on the evader (payload.unit) are triggered.
		// The attacker (payload.attacker) is the target of this event context.
		await runUnitEventWithTargetTraits("onEvadeByMe" as UnitEventWithTargetKeys, payload.scene, payload.state, payload.unit, payload.attacker);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_AFTER_ATTACK_BY_ME, async (payload: { unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean, scene: BattlegroundScene, state: State }) => {
		await runAttackEventTraits("onAfterAttackByMe" as AttackEventKeys, payload.scene, payload.state, payload.unit, payload.target, payload.damage, payload.isCritical, payload.evaded);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_KILL_BY_ME, async (payload: { unit: Unit, killedUnit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventWithTargetTraits("onUnitKillByMe" as UnitEventWithTargetKeys, payload.scene, payload.state, payload.unit, payload.killedUnit);
	});

	// TODO: Add listeners for onUnitKill, onAlliedKilled, onEnemyKilled, onAlliedAction, onTurnStart, onTurnEnd, onBattleEnd.
	// These will require careful consideration of when their corresponding high-level game events are emitted.
	// For example, onTurnStart might be part of a turn management system emitting an event.
	// onAlliedKilled would need an event like GameEvents.ALLY_DIED with { killedUnit, killerUnit (optional), scene, state }
	// and the listener would iterate all other allied units to trigger their "onAlliedKilled" traits.
}