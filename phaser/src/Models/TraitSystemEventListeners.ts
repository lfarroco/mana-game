/**
 * @file Sets up event listeners for the Trait System.
 * This module connects various game events to the trait processing logic,
 * allowing traits to react to in-game occurrences.
 */

import { GameEvents } from "../constants/events";
import { getState } from "./State";
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

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ACTION, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onAction" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, async (_payload: {}) => {
		// Iterate over all units for traits that trigger on this global event
		const currentState = getState();
		for (const unit of currentState.battleData.units) {
			if (unit.hp > 0) { // Process only for active units
				await runUnitEventTraits("onBattleStart" as UnitEventKeys, scene, currentState, unit);
			}
		}
		// Iterate over player relics
		// Ensure that the `Relic` type from `state.gameData.player.relics`
		// is compatible with `RelicStateObject` (i.e., has an `id` field)
		// and also contains a `traits: TraitData[]` field for iteration.
		for (const relic of currentState.gameData.player.relics) {
			// Assuming `relic` object has `id: string` and `traits: TraitData[]`
			if (relic.traits && Array.isArray(relic.traits)) {
				for (const traitData of relic.traits as TraitData[]) {
					const relicSource: RelicStateObject = {
						id: relic.id,
						forceId: relic.forceId,
					};
					await processTraitEvent({
						source: relicSource,
						traitInstanceData: traitData,
						eventKey: "onBattleStart" as UnitEventKeys,
						scene: scene,
						state: currentState,
						eventDetails: undefined
					});
				}
			}
		}
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onEnterPosition" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_LEAVE_POSITION, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onLeavePosition" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_HALF_HP, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onHalfHP" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_DEATH, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onDeath" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_ATTACK_BY_ME, async (payload: { unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean }) => {
		await runAttackEventTraits("onAttackByMe" as AttackEventKeys, scene, getState(), payload.unit, payload.target, payload.damage, payload.isCritical, payload.evaded);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_DEFEND_BY_ME, async (payload: { unit: Unit, attacker: Unit }) => {
		// 'unit' is the defender, 'attacker' is the source of the attack.
		// "onDefendByMe" implies traits on the defender (payload.unit) are triggered.
		// The attacker (payload.attacker) is the target of this event context.
		await runUnitEventWithTargetTraits("onDefendByMe" as UnitEventWithTargetKeys, scene, getState(), payload.unit, payload.attacker);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_EVADE_BY_ME, async (payload: { unit: Unit, attacker: Unit }) => {
		// 'unit' is the evader, 'attacker' is the source of the attack.
		// "onEvadeByMe" implies traits on the evader (payload.unit) are triggered.
		// The attacker (payload.attacker) is the target of this event context.
		await runUnitEventWithTargetTraits("onEvadeByMe" as UnitEventWithTargetKeys, scene, getState(), payload.unit, payload.attacker);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_AFTER_ATTACK_BY_ME, async (payload: { unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean }) => {
		await runAttackEventTraits("onAfterAttackByMe" as AttackEventKeys, scene, getState(), payload.unit, payload.target, payload.damage, payload.isCritical, payload.evaded);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_KILL_BY_ME, async (payload: { unit: Unit, killedUnit: Unit }) => {
		await runUnitEventWithTargetTraits("onUnitKillByMe" as UnitEventWithTargetKeys, scene, getState(), payload.unit, payload.killedUnit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_KILL, async (payload: { unit: Unit, killer: Unit }) => {
		await runUnitEventWithTargetTraits("onUnitKill" as UnitEventWithTargetKeys, scene, getState(), payload.unit, payload.killer);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_ALLIED_KILLED, async (payload: { unit: Unit, killer?: Unit }) => {
		await runUnitEventWithTargetTraits("onAlliedKilled" as UnitEventWithTargetKeys, scene, getState(), payload.unit, payload.killer as Unit); // killer can be undefined, handle in trait
	});

	scene.events.on(GameEvents.TRAIT_EVAL_ENEMY_KILLED, async (payload: { unit: Unit, killer?: Unit }) => {
		await runUnitEventWithTargetTraits("onEnemyKilled" as UnitEventWithTargetKeys, scene, getState(), payload.unit, payload.killer as Unit); // killer can be undefined, handle in trait
	});

	scene.events.on(GameEvents.TRAIT_EVAL_ALLIED_ACTION, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onAlliedAction" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_TURN_START, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onTurnStart" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_TURN_END, async (payload: { unit: Unit }) => {
		await runUnitEventTraits("onTurnEnd" as UnitEventKeys, scene, getState(), payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_BATTLE_END, async (_payload: {}) => {
		const currentState = getState();
		for (const unit of currentState.battleData.units) {
			await runUnitEventTraits("onBattleEnd" as UnitEventKeys, scene, currentState, unit);
		}
	});
}