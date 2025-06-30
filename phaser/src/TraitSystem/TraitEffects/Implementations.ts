/**
 * @file Contains the actual implementations for various trait effects.
 * Each function defined here corresponds to an `effectId` that can be used
 * in `TraitDefinition`s. These functions are registered with the `TraitEffectSystem`.
 * 
 * IMPORTANT: All temporary effects now use frame-based countdown instead of scene.time.addEvent
 * to prevent effects from persisting after battle ends. The RunCombatIO.chargeUnits function
 * processes these effects each frame and automatically cleans them up when combat ends.
 */
import { registerTraitEffectImplementation } from "../TraitEffectSystem";
import { getEffectParams } from "../TraitSystem.pure"; // Use our tested pure function
import { getChara } from "../../Scenes/Battleground/Systems/CharaManager";
import { TraitEffectFn } from "../TraitEffectSystem";
import { devlog } from "../../utils";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { Chara } from "../../Systems/Chara/Chara";
import { applyStatusEffect } from "../../Systems/StatusEffects/StatusEffectManager";

// Import extracted implementations
import * as implementations from "./implementations/index";

// ===== HELPER FUNCTIONS TO REDUCE REPETITION =====

/**
 * Helper function to safely show pop text only when the scene and chara are active
 */
async function safeShowPopText(chara: Chara, text: string, type?: "heal" | "damage", scene?: BattlegroundScene): Promise<void> {
	if (chara && chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
		await chara.showPopText(text, type);
	}
}

// ===== EFFECT IMPLEMENTATIONS =====

// All implementations that have been migrated to ./implementations/ are now imported above.
// Remove any duplicate or leftover implementations here.





/**
 * Effect: Slows all enemies
 */
// slowAllEnemiesLogic implementation moved to ./implementations/slowAllEnemies.ts

/**
 * Effect: Fortress mode passive (conditional armor and reflect)
 */
const fortressModePassiveLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const armorBonus = (traitInstanceParams.armor_bonus ?? effectInstance.armor_bonus ?? 20) as number;

	// Check if unit is stationary (this would need to be tracked in the movement system)
	// For now, assume fortress units are always stationary when not moving
	const chara = getChara(sourceUnit.id);
	if (chara) {
		await chara.updateUnitAttribute("power", armorBonus); // Using power as armor for simplicity
		await safeShowPopText(chara, `Fortress Mode: +${armorBonus} Armor`, undefined, context.scene);

		// Note: Damage reflection would be implemented in the damage handling system
	}
};

/**
 * Effect: Reduces damage taken by all allies
 */
const reduceAllyDamageTakenLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, sourceUnit } = context;
	const reduction = (traitInstanceParams.reduction ?? effectInstance.reduction ?? 12) as number;

	// Add damage reduction tracking to each ally
	for (const ally of targets) {
		// Initialize damage reduction stacks if not present
		if (!ally.damageReductionStacks) {
			ally.damageReductionStacks = [];
		}

		// Add this source's reduction to the stack
		ally.damageReductionStacks.push({
			sourceUnitId: sourceUnit.id,
			reductionPercent: reduction
		});

		const chara = getChara(ally.id);
		if (chara) {
			await safeShowPopText(chara, `Protected (${reduction}%)`, undefined, context.scene);
		}
	}

	devlog(`[Defensive Matrix] ${sourceUnit.name} is protecting ${targets.length} allies with ${reduction}% damage reduction`);
};

/**
 * Effect: Damage scales with time in battle (growing fury)
 * This provides a temporary boost that scales with time, replacing any previous fury effect
 */
const damageScalesWithTimeLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	const damagePerTime = getEffectParams(traitInstanceParams, effectInstance, 'damage_per_time', 1);
	const timeThreshold = getEffectParams(traitInstanceParams, effectInstance, 'time_threshold', 1000);

	const timeInBattle = scene.time.now; // Keep in milliseconds
	const timeSegments = Math.floor(timeInBattle / timeThreshold);
	const currentFuryBonus = timeSegments * damagePerTime;

	// Apply fury scaling effect (this will automatically replace any existing fury effect)
	if (currentFuryBonus > 0) {
		const chara = getChara(sourceUnit.id);
		if (chara) {
			applyStatusEffect(sourceUnit, {
				type: 'fury_scaling',
				remainingDuration: Number.MAX_SAFE_INTEGER, // Lasts until battle ends
				attribute: 'power',
				amount: currentFuryBonus,
				stackId: 'berserker_fury', // Prevents stacking
				displayName: `Fury: ${currentFuryBonus}`
			});

			await safeShowPopText(chara, `Fury: ${currentFuryBonus} bonus!`, undefined, context.scene);
		}
	}
};

/**
 * Effect: Sacrifice cooldown for damage (reckless haste)
 * Each attack permanently increases damage but also permanently increases cooldown
 */
const sacrificeCooldownForDamageLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const cooldownPenalty = getEffectParams(traitInstanceParams, effectInstance, 'cooldown_penalty', 500);
	const damageBonus = getEffectParams(traitInstanceParams, effectInstance, 'damage_bonus', 4);

	const chara = getChara(sourceUnit.id);
	if (chara) {
		// Increase cooldown (slower actions) - this is permanent
		sourceUnit.cooldown += cooldownPenalty;

		// Increase damage permanently
		await chara.updateUnitAttribute("power", damageBonus);
		await safeShowPopText(chara, `Reckless! +${damageBonus} Dmg, +${cooldownPenalty}ms cooldown`, undefined, context.scene);
	}
};

/**
 * Effect: Reduces morale loss by a percentage for the unit's force.
 * This creates a passive protective effect that makes tank units more valuable.
 */
const moraleDamageReductionLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance } = context;
	const reductionPercent = effectInstance.reduction_percent || 10;

	// Get the source unit's force
	const sourceForce = context.state.battleData.forces.find(force =>
		force.units.some(unit => unit.id === sourceUnit.id)
	);

	if (!sourceForce) return;

	// Initialize morale reduction stacks if not present
	if (!sourceForce.moraleReductionStacks) {
		sourceForce.moraleReductionStacks = [];
	}

	// Add this unit's reduction to the stack
	sourceForce.moraleReductionStacks.push({
		unitId: sourceUnit.id,
		reductionPercent: reductionPercent
	});

	// Show activation feedback
	const chara = getChara(sourceUnit.id);
	if (chara) {
		await safeShowPopText(chara, `Morale Guardian Active`, "heal", context.scene);
	}

	devlog(`[Morale Guardian] ${sourceUnit.name} is protecting force ${sourceForce.id} with ${reductionPercent}% morale damage reduction`);
};

// ===== EFFECT REGISTRATIONS =====
/**
 * Registers all defined trait effect implementations with the TraitEffectSystem.
 * This function should be called once during game initialization.
 */
export function registerAllTraitEffects() {
	registerTraitEffectImplementation("grant_gold_to_player", implementations.grantGoldLogic);
	registerTraitEffectImplementation("deal_damage", implementations.dealDamageLogic);

	// Trait-based effects
	registerTraitEffectImplementation("trait_sniper", implementations.traitSniper);

	// Skill-based effects
	registerTraitEffectImplementation("skill_melee", implementations.performSkillMelee);
	registerTraitEffectImplementation("skill_shoot", implementations.performSkillShoot);
	registerTraitEffectImplementation("skill_heal", implementations.performSkillHeal);
	registerTraitEffectImplementation("skill_healing_wave", implementations.performSkillHealingWave);
	registerTraitEffectImplementation("skill_arcane_missiles", implementations.performSkillArcaneMissiles);
	registerTraitEffectImplementation("skill_haste", implementations.performSkillHaste);
	registerTraitEffectImplementation("skill_slow", implementations.performSkillSlow);
	registerTraitEffectImplementation("skill_summon", implementations.performSkillSummon);
	registerTraitEffectImplementation("skill_fireball", implementations.performSkillFireball);
	registerTraitEffectImplementation("positional_bonus", implementations.positionalBonusLogic);
	registerTraitEffectImplementation("increase_force_max_morale", implementations.increaseForceMaxMoraleLogic);
	registerTraitEffectImplementation("modify_stat_passive", implementations.modifyStatPassiveLogic);
	registerTraitEffectImplementation("splash_damage_to_random_adjacent_ally", implementations.splashDamageToRandomAdjacentAllyLogic);
	registerTraitEffectImplementation("restore_force_morale", implementations.restoreForceMoraleLogic);
	registerTraitEffectImplementation("reduce_enemy_morale", implementations.reduceEnemyMoraleLogic);
	registerTraitEffectImplementation("boost_ally_damage", implementations.boostAllyDamageLogic);
	registerTraitEffectImplementation("haste_all_allies", implementations.hasteAllAlliesLogic);
	registerTraitEffectImplementation("slow_all_enemies", implementations.slowAllEnemies);
	registerTraitEffectImplementation("freeze_all_enemies", implementations.freezeAllEnemiesLogic);
	registerTraitEffectImplementation("stun_all_enemies", implementations.stunAllEnemiesLogic);
	registerTraitEffectImplementation("guild_wide_damage", implementations.guildWideDamageLogic);
	registerTraitEffectImplementation("reduce_enemy_damage_global", implementations.reduceEnemyDamageGlobalLogic);
	registerTraitEffectImplementation("grant_morale_to_allies", implementations.grantMoraleToAlliesLogic);
	registerTraitEffectImplementation("cleanse_ally_debuffs", implementations.cleanseAllyDebuffsLogic);
	registerTraitEffectImplementation("chance_to_dodge", implementations.chanceToDodgeLogic);
	registerTraitEffectImplementation("apply_poison_to_enemies", implementations.applyPoisonToEnemiesLogic);
	registerTraitEffectImplementation("reduce_enemy_damage", implementations.reduceEnemyDamageLogic);
	registerTraitEffectImplementation("fortress_mode_passive", fortressModePassiveLogic);
	registerTraitEffectImplementation("reduce_ally_damage_taken", reduceAllyDamageTakenLogic);
	registerTraitEffectImplementation("morale_damage_reduction", moraleDamageReductionLogic);

	// Time-based and alternative mechanics
	registerTraitEffectImplementation("damage_scales_with_time", damageScalesWithTimeLogic);
	registerTraitEffectImplementation("sacrifice_cooldown_for_damage", sacrificeCooldownForDamageLogic);

	// Simple attribute modification effects
	registerTraitEffectImplementation("increase_power", implementations.increasePowerLogic);

}
