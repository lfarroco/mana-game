import {
	TraitEffectFn,
	registerTraitEffectImplementation
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


// --- Effect Implementations ---

const grantGoldToPlayer: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	// Allow amount from effectInstance (definition) or traitInstanceParams (instance on unit/relic)
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 0) as number;

	if (amount !== 0 && sourceUnit.force === playerForce.id) { // Ensure it's for the player
		await popText({ text: `+${amount} Gold`, targetId: sourceUnit.id, speed: scene.state.options.speed });
		updatePlayerGoldIO(scene, amount);
	}
};

const dealDamage: TraitEffectFn = async (context) => {
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
			console.log(`${sourceUnit.name} deals ${baseAmount} damage to ${target.name} via trait ${effectInstance.effectId}`);
		}
	}
};

const performSkillSlash: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	// Assuming 'slash' skill takes scene and unit
	await slash(scene, sourceUnit);
};

const performSkillShoot: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await shoot(scene)(sourceUnit);
};

const performSkillHeal: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await healing(scene)(sourceUnit);
};

const performSkillHealingWave: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await healingWave(scene, sourceUnit);
};

const performSkillArcaneMissiles: TraitEffectFn = async (context) => {
	const { sourceUnit, scene, traitInstanceParams, effectInstance } = context;
	// Arcane missiles might take specific data from the trait instance or effect definition
	const projectiles = traitInstanceParams.projectiles ?? effectInstance.projectiles ?? 3;
	await arcaneMissiles(scene)(sourceUnit, projectiles);
};

const performSkillHaste: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await haste(scene, sourceUnit);
};

const performSkillSlow: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	await slow(scene, sourceUnit);
};

const performSkillSummon: TraitEffectFn = async (context) => {
	const { sourceUnit, traitInstanceParams, effectInstance } = context;
	const cardIdToSummon = traitInstanceParams.cardIdToSummon ?? effectInstance.cardIdToSummon as string;
	const chara = getChara(sourceUnit.id);

	if (chara && cardIdToSummon) {
		// The summon skill needs the chara, and the cardId of what to summon.
		// The original summon skill in Traits.ts took (chara, data.summonId)
		// where data was the TraitData. So data.summonId is cardIdToSummon here.
		await summon(chara, cardIdToSummon);
	} else {
		console.warn("Summon effect: Chara not found or cardIdToSummon missing.", sourceUnit.id, cardIdToSummon);
	}
};


const modifyUnitCooldowns: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams } = context;
	const percentReduction = (traitInstanceParams.percent ?? effectInstance.percent ?? 0) as number;
	if (percentReduction <= 0 || percentReduction >= 100) {
		console.warn(`Relic Effect (AlliedCooldownReduction): Invalid 'percent'. Expected > 0 and < 100.`);
		return;
	}
	const multiplier = 1 - (percentReduction / 100);
	targets.forEach(u => {
		u.cooldown = Math.max(100, Math.round(u.cooldown * multiplier));
		// TODO: Visual update if needed
		console.log(`Unit ${u.name} cooldown reduced by ${percentReduction}% to ${u.cooldown}`);
	});
};

const modifyUnitMaxHp: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams } = context;
	const percentIncrease = (traitInstanceParams.percent ?? effectInstance.percent ?? 0) as number;
	if (percentIncrease <= 0) {
		console.warn(`Relic Effect (AlliedMaxHpIncrease): Invalid 'percent'. Expected > 0.`);
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
	registerTraitEffectImplementation("grant_gold_to_player", grantGoldToPlayer);
	registerTraitEffectImplementation("deal_damage", dealDamage); // Example

	// Skill-based effects
	registerTraitEffectImplementation("skill_slash", performSkillSlash);
	registerTraitEffectImplementation("skill_shoot", performSkillShoot);
	registerTraitEffectImplementation("skill_heal", performSkillHeal);
	registerTraitEffectImplementation("skill_healing_wave", performSkillHealingWave);
	registerTraitEffectImplementation("skill_arcane_missiles", performSkillArcaneMissiles);
	registerTraitEffectImplementation("skill_haste", performSkillHaste);
	registerTraitEffectImplementation("skill_slow", performSkillSlow);
	registerTraitEffectImplementation("skill_summon", performSkillSummon);


	// Relic-like effects (can be triggered by onBattleStart, etc.)
	registerTraitEffectImplementation("modify_unit_cooldowns", modifyUnitCooldowns);
	registerTraitEffectImplementation("modify_unit_max_hp", modifyUnitMaxHp);

	// Add more registrations here
	// e.g., registerTraitEffectImplementation("apply_status", applyStatusEffect);
	// e.g., registerTraitEffectImplementation("heal_targets", healTargetsEffect);
}
