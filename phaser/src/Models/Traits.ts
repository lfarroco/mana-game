// traits are a way to add special abilities or characteristics to cards
// feature like "taunt", "flying", "trample", etc.

import { GameEvents } from "../constants/events";
import { State } from "./State";
import { Unit } from "./Unit";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene"; // Ensure BattlegroundSceneType for type annotation
import * as UnitEvents_ from "./UnitEvents"; // Adjusted imports
import {
	TraitEffectContext,
	getTraitDefinition,
	getTraitEffectImplementation,
	resolveTargets,
	checkConditions,
	registerTraitDefinition as registerNewTraitDefinition, // Alias to avoid conflict if any
	TraitDefinition
} from "./TraitEffectSystem";

export type TraitId = string & { __traitId: never };
export type TraitCategory = string & { __traitCategory: never };

export type TraitData = { // This is an *instance* of a trait on a unit/relic
	id: TraitId;
	[key: string]: any;
};

async function processTraitEvent(
	sourceUnit: Unit,
	traitInstanceData: TraitData, // This is the { id, ...params } from unit.traits
	eventKey: string,
	scene: BattlegroundScene,
	state: State,
	// Optional context parameters
	primaryTarget?: Unit,
	attackDamage?: number,
	isCritical?: boolean,
	evaded?: boolean
) {
	const definition = getTraitDefinition(traitInstanceData.id);
	if (!definition) {
		// console.warn(`Trait definition not found for ID: ${traitInstanceData.id}`);
		return;
	}

	for (const effectInstance of definition.effects) {
		if (effectInstance.eventTrigger === eventKey) {
			const targets = resolveTargets(sourceUnit, effectInstance.targetSelector, state, scene, primaryTarget);

			const context: TraitEffectContext = {
				sourceUnit,
				targets,
				effectInstance, // from TraitDefinition
				traitInstanceParams: traitInstanceData, // from Unit.traits or Relic.traits
				scene,
				state,
				primaryTarget,
				attackDamage,
				isCritical,
				evaded,
			};

			if (!checkConditions(context, effectInstance.conditions)) {
				continue; // Conditions not met for this effect
			}

			const implementation = getTraitEffectImplementation(effectInstance.effectId);
			if (implementation) {
				try {
					await implementation(context);
				} catch (error) {
					console.error(`Error executing trait effect ${effectInstance.effectId} for trait ${definition.id}:`, error);
				}
			} else {
				console.warn(`Implementation not found for effectId: ${effectInstance.effectId} in trait ${definition.id}`);
			}
		}
	}
}

export const runUnitEventTraits = async (eventKey: UnitEvents_.UnitEventKeys, scene: BattlegroundScene, state: State, unit: Unit) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state);
	}
};

export const runAttackEventTraits = async (eventKey: UnitEvents_.AttackEventKeys, scene: BattlegroundScene, state: State, unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state, target, damage, isCritical, evaded);
	}
};

export const runUnitEventWithTargetTraits = async (eventKey: UnitEvents_.UnitEventWithTargetKeys, scene: BattlegroundScene, state: State, unit: Unit, target: Unit) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state, target);
	}
};

export function setupTraitEventListeners(scene: BattlegroundScene, _state: State): void {
	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ACTION, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onAction", payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, async (payload: { scene: BattlegroundScene, state: State }) => {
		// Iterate over all units for traits that trigger on this global event
		for (const unit of payload.state.battleData.units) { // Consider only active units if appropriate
			if (unit.hp > 0) { // Example: only for active units
				await runUnitEventTraits("onBattleStart", payload.scene, payload.state, unit);
			}
		}
		// Iterate over player relics
		for (const relic of payload.state.gameData.player.relics) {
			for (const traitData of relic.traits) {
				// For relic effects, sourceUnit might be a conceptual player or null.
				// Or, the effect implementation itself handles not needing a typical sourceUnit.
				// Here, we create a dummy source unit representing the player owning the relic.
				// TODO: Access relic definition name properly if available in state.gameData.cardData.relics
				// For now, using relic.id if name isn't easily accessible.
				// const relicDefinition = payload.state.cardData?.relics?.find(rDef => rDef.id === relic.id);
				// const relicName = relicDefinition ? relicDefinition.name : relic.id;
				const dummySource: Unit = { // Partial Unit, ensure effect implementations handle this
					id: `relic_source_${relic.id}`,
					force: payload.state.gameData.player.id,
					name: `Relic: ${relic.id}`, // Simplified name, ideally use relic's actual name
					pic: relic.pic, // from Relic instance
					position: relic.position, // from Relic instance
					hp: 1, maxHp: 1, attackPower: 0, attackType: "none", defense: 0, magicDefense: 0,
					cooldown: 0, crit: 0, evade: 0, xp: 0, statuses: {}, traits: [], log: [],
					charge: 0, refresh: 0, hasted: 0, slowed: 0, cardId: `relic_card_${relic.id}` // Placeholder cardId
				} as Unit;
				await processTraitEvent(dummySource, traitData, "onBattleStart", payload.scene, payload.state, dummySource);
			}
		}
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onEnterPosition", payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_LEAVE_POSITION, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onLeavePosition", payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_HALF_HP, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onHalfHP", payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_DEATH, async (payload: { unit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventTraits("onDeath", payload.scene, payload.state, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_ATTACK_BY_ME, async (payload: { unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean, scene: BattlegroundScene, state: State }) => {
		await runAttackEventTraits("onAttackByMe", payload.scene, payload.state, payload.unit, payload.target, payload.damage, payload.isCritical, payload.evaded);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_DEFEND_BY_ME, async (payload: { unit: Unit, attacker: Unit, scene: BattlegroundScene, state: State }) => {
		// In 'onDefendByMe', the 'unit' is the defender, 'attacker' is the source of the attack.
		// The original 'runUnitEventWithTargetTraits' expects (eventKey, scene, state, sourceUnit, targetUnit)
		// So, sourceUnit is payload.attacker, targetUnit is payload.unit
		await runUnitEventWithTargetTraits("onDefendByMe", payload.scene, payload.state, payload.attacker, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_EVADE_BY_ME, async (payload: { unit: Unit, attacker: Unit, scene: BattlegroundScene, state: State }) => {
		// Similar to onDefendByMe, unit is evader, attacker is the source.
		await runUnitEventWithTargetTraits("onEvadeByMe", payload.scene, payload.state, payload.attacker, payload.unit);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_AFTER_ATTACK_BY_ME, async (payload: { unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean, scene: BattlegroundScene, state: State }) => {
		await runAttackEventTraits("onAfterAttackByMe", payload.scene, payload.state, payload.unit, payload.target, payload.damage, payload.isCritical, payload.evaded);
	});

	scene.events.on(GameEvents.TRAIT_EVAL_UNIT_KILL_BY_ME, async (payload: { unit: Unit, killedUnit: Unit, scene: BattlegroundScene, state: State }) => {
		await runUnitEventWithTargetTraits("onUnitKillByMe", payload.scene, payload.state, payload.unit, payload.killedUnit);
	});

	// TODO: Add listeners for onUnitKill, onAlliedKilled, onEnemyKilled, onAlliedAction, onTurnStart, onTurnEnd, onBattleEnd
	// These will require careful consideration of when their corresponding high-level game events are emitted.
	// For example, onTurnStart might be part of a turn management system emitting an event.
	// onAlliedKilled would need an event like GameEvents.ALLY_DIED with { killedUnit, killerUnit (optional), scene, state }
	// and the listener would iterate all other allied units to trigger their "onAlliedKilled" traits.
}

/**
 * Initializes and registers trait definitions from a loaded data source.
 * @param traitDefinitions An array of TraitDefinition objects.
 */
export function initializeTraitsFromData(traitDefinitions: TraitDefinition[]): void {
	traitDefinitions.forEach(traitDef => {
		// The TraitDefinition type expects `id` to be `TraitId`.
		// When loaded from JSON, `id` is a string. Casting it here aligns with the type.
		// The `registerNewTraitDefinition` function itself handles the `TraitDefinition` type.
		registerNewTraitDefinition(traitDef as TraitDefinition);
	});
}