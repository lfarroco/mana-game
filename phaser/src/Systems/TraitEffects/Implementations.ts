import {
	TraitEffectFn,
	registerTraitEffectImplementation,
	TraitEffectContext,
} from "../../Models/TraitEffectSystem";
import { playerForce, updatePlayerGoldIO } from "../../Models/Force";
import { popText } from "../Chara/Animations/popText";
import { getChara } from "../../Scenes/Battleground/Systems/CharaManager";
import { slash } from "../Chara/Skills/slash";
import { shoot } from "../Chara/Skills/shoot";
import { healing } from "../Chara/Skills/healing";
import { healingWave } from "../Chara/Skills/healingWave";
import { arcaneMissiles } from "../Chara/Skills/arcaneMissiles";
import { haste } from "../Chara/Skills/haste";
import { slow } from "../Chara/Skills/slow";
import { summon } from "../Chara/Skills/summon";
import { Unit } from "../../Models/Unit";
import { RelicStateObject } from "../../Models/Traits";


// --- Higher-Order Function for Source Unit Requirement ---

// Type for effect functions that are guaranteed to have a sourceUnit
type SourceUnitGuaranteedEffectFn = (
	context: TraitEffectContext & { sourceUnit: Unit }
) => Promise<void>;

/**
 * Higher-order function to wrap TraitEffectFns that require a sourceUnit.
 * It checks for sourceUnit and logs an error if it's missing.
 */
function requireSourceUnit(effectFn: SourceUnitGuaranteedEffectFn): TraitEffectFn {
	return async (context: TraitEffectContext) => {
		if (!context.sourceUnit) {
			if (process.env.NODE_ENV === "development") {
				console.error(
					`Effect ${context.effectInstance.effectId} requires a sourceUnit, but it was not provided. Context:`,
					context
				);
			}
			return;
		}
		// Now sourceUnit is guaranteed to exist, so we can cast the context type.
		await effectFn(context as TraitEffectContext & { sourceUnit: Unit });
	};
}

// --- Higher-Order Function for Source Relic Requirement ---

// Type for effect functions that are guaranteed to have a sourceRelic
type SourceRelicGuaranteedEffectFn = (
	context: TraitEffectContext & { sourceRelic: RelicStateObject }
) => Promise<void>;

/**
 * Higher-order function to wrap TraitEffectFns that require a sourceRelic.
 * It checks for sourceRelic and logs an error if it's missing.
 */
function requireSourceRelic(effectFn: SourceRelicGuaranteedEffectFn): TraitEffectFn {
	return async (context: TraitEffectContext) => {
		if (!context.sourceRelic) {
			if (process.env.NODE_ENV === "development") {
				console.error(
					`Effect ${context.effectInstance.effectId} requires a sourceRelic, but it was not provided. Context:`,
					context
				);
			}
			return;
		}
		// Now sourceRelic is guaranteed to exist, so we can cast the context type.
		await effectFn(context as TraitEffectContext & { sourceRelic: RelicStateObject });
	};
}

// --- Effect Implementations ---

const grantGoldToPlayerLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	// Allow amount from effectInstance (definition) or traitInstanceParams (instance on unit/relic)
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;

	if (amount !== 0 && sourceUnit.force === playerForce.id) { // Ensure it's for the player
		await popText({ text: `+${amount} Gold`, targetId: sourceUnit.id, speed: scene.state.options.speed });
		updatePlayerGoldIO(scene, amount);
	}
};

const dealDamageLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, targets, effectInstance, traitInstanceParams, scene } = context;
	const baseAmount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;

	// TODO: Implement actual damage calculation, considering sourceUnit.attackPower, target.defense, etc.
	// For now, a simple popText
	for (const target of targets) {
		const charaTarget = getChara(target.id);
		if (charaTarget) {
			// This is where you'd call a proper damage dealing function
			// charaTarget.takeDamage(baseAmount, sourceUnit);
			await popText({ text: `-${baseAmount} Dmg`, targetId: target.id, type: "damage", speed: scene.state.options.speed });
			console.log(`${sourceUnit.name} (Trait: ${context.traitInstanceParams.id}) deals ${baseAmount} damage to ${target.name} via effect ${effectInstance.effectId}`);
		}
	}
};

const performSkillSlashLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	// Assuming 'slash' skill takes scene and unit
	await slash(scene, sourceUnit);
};

const performSkillShootLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await shoot(scene)(sourceUnit);
};

const performSkillHealLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await healing(scene)(sourceUnit);
};

const performSkillHealingWaveLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await healingWave(scene, sourceUnit);
};

const performSkillArcaneMissilesLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, scene, traitInstanceParams, effectInstance } = context;
	// Arcane missiles might take specific data from the trait instance or effect definition
	const projectiles = traitInstanceParams.projectiles ?? effectInstance.projectiles ?? 3;
	await arcaneMissiles(scene)(sourceUnit, projectiles);
};

const performSkillHasteLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await haste(scene, sourceUnit);
};

const performSkillSlowLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await slow(scene, sourceUnit);
};

const performSkillSummonLogic: SourceUnitGuaranteedEffectFn = async (context) => {
	const { sourceUnit, traitInstanceParams, effectInstance } = context;
	const cardIdToSummon = traitInstanceParams.cardIdToSummon ?? effectInstance.cardIdToSummon as string;
	const chara = getChara(sourceUnit.id);

	if (chara && cardIdToSummon) {
		// The summon skill needs the chara, and the cardId of what to summon.
		// The original summon skill in Traits.ts took (chara, data.summonId)
		// where data was the TraitData. So data.summonId is cardIdToSummon here.
		await summon(chara, cardIdToSummon);
	} else {
		console.warn(`Summon effect: Chara for sourceUnit ${sourceUnit.id} not found, or cardIdToSummon missing. Card ID: ${cardIdToSummon}`);
	}
};


const modifyUnitCooldownsLogic: SourceRelicGuaranteedEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, sourceRelic } = context;
	const percentReduction = (traitInstanceParams.percent ?? effectInstance.percent ?? 0) as number;
	if (percentReduction <= 0 || percentReduction >= 100) {
		console.warn(`Relic Effect (ID: ${sourceRelic.id}, Effect: ${context.effectInstance.effectId}): Invalid 'percent' for cooldown reduction. Expected > 0 and < 100. Got: ${percentReduction}`);
		return;
	}
	const multiplier = 1 - (percentReduction / 100);
	targets.forEach(u => {
		u.cooldown = Math.max(100, Math.round(u.cooldown * multiplier));
		// TODO: Visual update if needed
		console.log(`Unit ${u.name} cooldown reduced by ${percentReduction}% to ${u.cooldown}`);
	});
};

const modifyUnitMaxHpLogic: SourceRelicGuaranteedEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, sourceRelic } = context;
	const percentIncrease = (traitInstanceParams.percent ?? effectInstance.percent ?? 0) as number;

	if (percentIncrease <= 0) {
		console.warn(`Relic Effect (ID: ${sourceRelic.id}, Effect: ${context.effectInstance.effectId}): Invalid 'percent' for Max HP increase. Expected > 0. Got: ${percentIncrease}`);
		return;
	}
	const multiplier = 1 + (percentIncrease / 100);
	targets.forEach(u => {
		u.maxHp = Math.round(u.maxHp * multiplier);
		u.hp = u.maxHp; // Also refill HP to new max
		const chara = getChara(u.id);
		if (chara) {
			chara.updateHpDisplay();
		}
		console.log(`Unit ${u.name} Max HP increased by ${percentIncrease}% to ${u.maxHp}`);
	});
};


// Register all effect implementations
export function registerAllTraitEffects() {
	registerTraitEffectImplementation("grant_gold_to_player", requireSourceUnit(grantGoldToPlayerLogic));
	registerTraitEffectImplementation("deal_damage", requireSourceUnit(dealDamageLogic));

	// Skill-based effects
	registerTraitEffectImplementation("skill_slash", requireSourceUnit(performSkillSlashLogic));
	registerTraitEffectImplementation("skill_shoot", requireSourceUnit(performSkillShootLogic));
	registerTraitEffectImplementation("skill_heal", requireSourceUnit(performSkillHealLogic));
	registerTraitEffectImplementation("skill_healing_wave", requireSourceUnit(performSkillHealingWaveLogic));
	registerTraitEffectImplementation("skill_arcane_missiles", requireSourceUnit(performSkillArcaneMissilesLogic));
	registerTraitEffectImplementation("skill_haste", requireSourceUnit(performSkillHasteLogic));
	registerTraitEffectImplementation("skill_slow", requireSourceUnit(performSkillSlowLogic));
	registerTraitEffectImplementation("skill_summon", requireSourceUnit(performSkillSummonLogic));

	registerTraitEffectImplementation("modify_unit_cooldowns", requireSourceRelic(modifyUnitCooldownsLogic));
	registerTraitEffectImplementation("modify_unit_max_hp", requireSourceRelic(modifyUnitMaxHpLogic));

	// Add more registrations here
	// e.g., registerTraitEffectImplementation("apply_status", applyStatusEffect);
	// e.g., registerTraitEffectImplementation("heal_targets", healTargetsEffect);
}
