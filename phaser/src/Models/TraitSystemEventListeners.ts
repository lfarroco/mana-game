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
	processTraitEvent, // Imported for direct use with relics
	TraitData
} from "./Traits";
import { UnitEventKeys, AttackEventKeys, UnitEventWithTargetKeys } from "./UnitEvents";
import { Vec2 } from "./Geometry"; // Required for dummy source position

// Minimal representation of a Relic needed for creating a dummy source unit.
// Replace with the actual Relic type if available and suitable.
interface RelicLike {
	id: string;
	pic: string;
	traits: TraitData[];
	position?: Vec2;
}

function createRelicDummySourceUnit(relic: RelicLike, playerId: string): Unit {
	return {
		id: `relic_source_${relic.id}`,
		force: playerId,
		name: "Relic Source", // Descriptive name for the dummy unit
		pic: relic.pic,
		position: relic.position || { x: -1, y: -1, tag: "_vec2" }, // Default position
		hp: 1, maxHp: 1, attackPower: 0, attackType: "none", defense: 0, magicDefense: 0,
		cooldown: 0, crit: 0, evade: 0, xp: 0, statuses: {}, traits: [], log: [],
		charge: 0, refresh: 0, hasted: 0, slowed: 0, cardId: `relic_dummy_card_${relic.id}`
	} as Unit; // Cast to Unit, acknowledging it's a simplified representation
}

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
		for (const relic of payload.state.gameData.player.relics) {
			for (const traitData of relic.traits as TraitData[]) { // Cast to TraitData[]
				// The actual Relic type from player.relics should be compatible with RelicLike
				const dummySource = createRelicDummySourceUnit(relic as RelicLike, payload.state.gameData.player.id);
				await processTraitEvent(dummySource, traitData, "onBattleStart" as UnitEventKeys, payload.scene, payload.state, dummySource);
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