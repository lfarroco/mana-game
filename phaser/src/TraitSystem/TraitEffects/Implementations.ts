/**
 * @file Contains the actual implementations for various trait effects.
 * Each function defined here corresponds to an `effectId` that can be used
 * in `TraitDefinition`s. These functions are registered with the `TraitEffectSystem`.
 */
import { registerTraitEffectImplementation, } from "../TraitEffectSystem";
import { GameEvents } from "../../constants/events";
import { playerForce, updatePlayerGoldIO } from "../../Models/Entities/Force";
import { getChara } from "../../Scenes/Battleground/Systems/CharaManager";
import { slash } from "../../Systems/Chara/Skills/slash";
import { healing } from "../../Systems/Chara/Skills/healing";
import { healingWave } from "../../Systems/Chara/Skills/healingWave";
import { arcaneMissiles } from "../../Systems/Chara/Skills/arcaneMissiles";
import { haste } from "../../Systems/Chara/Skills/haste";
import { slow } from "../../Systems/Chara/Skills/slow";
import { summon } from "../../Systems/Chara/Skills/summon";
import { Unit } from "../../Models/Entities/Unit";
import { fireball as fireballSkillFn } from "../../Systems/Chara/Skills/fireball";
import { shoot as shootSkillFn } from "../../Systems/Chara/Skills/shoot";
import { TraitEffectFn } from "../TraitEffectSystem";

/**
 * Effect: Grants a specified amount of gold to the player.
 * The source unit must belong to the player.
 */
const grantGoldToPlayerLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	// Allow amount from effectInstance (definition) or traitInstanceParams (instance on unit)
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;

	if (amount !== 0 && sourceUnit.force === playerForce.id) { // Ensure it's for the player
		const chara = getChara(sourceUnit.id);
		await chara?.showPopText(`+${amount} Gold`);
		updatePlayerGoldIO(scene, amount);
	}
};

/**
 * Effect: Deals damage to target units.
 * The actual damage calculation might be more complex in a full implementation.
 */
const dealDamageLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams } = context;
	const baseAmount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;

	for (const target of targets) {
		const charaTarget = getChara(target.id);
		await charaTarget?.showPopText(`-${baseAmount} Dmg`, "damage");
	}
};

/**
 * Effect: Makes the source unit perform the "slash" skill.
 */
const performSkillMeleeLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await slash(scene, sourceUnit);
};

/**
 * Effect: Makes the source unit perform the "shoot" skill.
 */
const performSkillShootLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await shootSkillFn(scene)(sourceUnit);
};

/**
 * Effect: Makes the source unit perform the "heal" skill.
 */
const performSkillHealLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await healing(scene)(sourceUnit);
};

/**
 * Effect: Makes the source unit perform the "healing wave" skill.
 */
const performSkillHealingWaveLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await healingWave(scene, sourceUnit);
};

/**
 * Effect: Makes the source unit perform the "arcane missiles" skill.
 * Can take `projectiles` parameter from trait/effect data.
 */
const performSkillArcaneMissilesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene, traitInstanceParams, effectInstance } = context;
	const projectiles = traitInstanceParams.projectiles ?? effectInstance.projectiles ?? 3;
	await arcaneMissiles(scene)(sourceUnit, projectiles);
};

/**
 * Effect: Makes the source unit perform the "haste" skill.
 */
const performSkillHasteLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await haste(scene, sourceUnit);
};
/**
 * Effect: Makes the source unit perform the "slow" skill.
 */
const performSkillSlowLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await slow(scene, sourceUnit);
};

const performSkillSummonLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, traitInstanceParams, effectInstance } = context;
	/**
	 * Effect: Makes the source unit perform the "summon" skill.
	 * Requires `sourceUnit` and a `cardIdToSummon` parameter from trait/effect data.
	 */
	const cardIdToSummon = traitInstanceParams.cardIdToSummon ?? effectInstance.cardIdToSummon as string;
	const chara = getChara(sourceUnit.id);

	if (chara && cardIdToSummon) {
		await summon(chara, cardIdToSummon);
	} else {
		console.warn(`Summon effect: Chara for sourceUnit ${sourceUnit.id} not found, or cardIdToSummon missing. Card ID: ${cardIdToSummon}`);
	}
};

/**
 * Effect: If the source unit is in the back row, it gains an attack bonus.
 * The attack bonus amount can be specified in `effectInstance.amount`
 * or `traitInstanceParams.amount`, defaulting to 10.
 */
const traitSniperLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;

	// Determine the attack bonus amount, defaulting to 10
	const attackBonus = (traitInstanceParams.amount ?? effectInstance.amount ?? 10) as number;

	let isBackRow = false;
	const boardHeightInTiles = 3; // Standard board height

	if (sourceUnit.force === playerForce.id) {
		// Player's back row is the highest y-index (e.g., 2 for a 0,1,2 indexed board)
		if (sourceUnit.position.y === boardHeightInTiles - 1) {
			isBackRow = true;
		}
	} else {
		// CPU's back row (relative to their board, furthest from player) is y-index 0
		if (sourceUnit.position.y === 0) {
			isBackRow = true;
		}
	}

	if (isBackRow) {
		const chara = getChara(sourceUnit.id);
		if (!chara) return;
		// updateUnitAttribute handles data update, display refresh, and popText
		await chara.updateUnitAttribute("power", attackBonus);
	}
};

const performSkillFireballLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await fireballSkillFn(scene)(sourceUnit);
};


const positionalBonusLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;

	// Configurable parameters from trait data
	const attribute = (traitInstanceParams.attribute ?? effectInstance.attribute) as keyof Unit;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;
	const row = (traitInstanceParams.row ?? effectInstance.row) as 'front' | 'mid' | 'back';

	if (!attribute || amount === 0 || !row) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`Positional bonus effect for unit ${sourceUnit.id} is missing required parameters (attribute, amount, row).`, { attribute, amount, row });
		}
		return;
	}

	const boardHeightInTiles = 3; // Standard 3x3 board
	const backRowY = boardHeightInTiles - 1;
	const midRowY = 1;
	const frontRowY = 0;

	let isCorrectRow = false;
	const unitY = sourceUnit.position.y;

	if (sourceUnit.force === playerForce.id) {
		if (row === 'back' && unitY === backRowY) isCorrectRow = true;
		if (row === 'mid' && unitY === midRowY) isCorrectRow = true;
		if (row === 'front' && unitY === frontRowY) isCorrectRow = true;
	} else { // CPU force
		if (row === 'back' && unitY === frontRowY) isCorrectRow = true; // CPU back is at y=0
		if (row === 'mid' && unitY === midRowY) isCorrectRow = true;
		if (row === 'front' && unitY === backRowY) isCorrectRow = true; // CPU front is at y=2
	}

	if (isCorrectRow) {
		const chara = getChara(sourceUnit.id);
		if (!chara) return;
		// updateUnitAttribute handles data update, display refresh, and popText
		await chara.updateUnitAttribute(attribute, amount);
	}
};

/**
 * Effect: Increases the max and current morale of the source unit's force.
 */
const increaseForceMaxMoraleLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene, state } = context;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 100) as number;

	// In battle, the forces are in `battleData.forces`.
	const targetForce = state.battleData.forces.find(f => f.id === sourceUnit.force);

	if (targetForce) {
		targetForce.maxMorale += amount;
		// At the start of battle, morale is typically set to maxMorale.
		// So we should increase both.
		targetForce.morale += amount;

		// Emit event for UI update. The MoraleDisplay listens to this.
		scene.events.emit(GameEvents.MORALE_UPDATED, {
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
		});

		const chara = getChara(sourceUnit.id);
		if (chara) {
			await chara.showPopText(`+${amount} Max Morale`);
		}
	}
};

const modifyStatPassiveLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams } = context;

	const attribute = (traitInstanceParams.attribute ?? effectInstance.attribute) as keyof Unit;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;

	if (!attribute || amount === 0) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`Modify stat effect is missing required parameters (attribute, amount).`, { attribute, amount });
		}
		return;
	}

	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			// updateUnitAttribute handles data update, display refresh, and popText
			await chara.updateUnitAttribute(attribute, amount);
		}
	}
};

/**
 * Registers all defined trait effect implementations with the TraitEffectSystem.
 * This function should be called once during game initialization.
 */
export function registerAllTraitEffects() {
	registerTraitEffectImplementation("grant_gold_to_player", grantGoldToPlayerLogic);
	registerTraitEffectImplementation("deal_damage", dealDamageLogic);

	// Trait-based effects
	registerTraitEffectImplementation("trait_sniper", traitSniperLogic); // TODO: generic position check effect

	// Skill-based effects
	registerTraitEffectImplementation("skill_melee", performSkillMeleeLogic);
	registerTraitEffectImplementation("skill_shoot", performSkillShootLogic);
	registerTraitEffectImplementation("skill_heal", performSkillHealLogic);
	registerTraitEffectImplementation("skill_healing_wave", performSkillHealingWaveLogic);
	registerTraitEffectImplementation("skill_arcane_missiles", performSkillArcaneMissilesLogic);
	registerTraitEffectImplementation("skill_haste", performSkillHasteLogic);
	registerTraitEffectImplementation("skill_slow", performSkillSlowLogic);
	registerTraitEffectImplementation("skill_summon", performSkillSummonLogic);
	registerTraitEffectImplementation("skill_fireball", performSkillFireballLogic);
	registerTraitEffectImplementation("positional_bonus", positionalBonusLogic);
	registerTraitEffectImplementation("increase_force_max_morale", increaseForceMaxMoraleLogic);
	registerTraitEffectImplementation("modify_stat_passive", modifyStatPassiveLogic);


}
