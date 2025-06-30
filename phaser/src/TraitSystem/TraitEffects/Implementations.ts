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

// Import extracted implementations
import * as implementations from "./implementations/index";

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
	registerTraitEffectImplementation("fortress_mode_passive", implementations.fortressModePassiveLogic);
	registerTraitEffectImplementation("reduce_ally_damage_taken", implementations.reduceAllyDamageTakenLogic);
	registerTraitEffectImplementation("morale_damage_reduction", implementations.moraleDamageReductionLogic);

	// Time-based and alternative mechanics
	registerTraitEffectImplementation("damage_scales_with_time", implementations.damageScalesWithTimeLogic);
	registerTraitEffectImplementation("sacrifice_cooldown_for_damage", implementations.sacrificeCooldownForDamageLogic);

	// Simple attribute modification effects
	registerTraitEffectImplementation("increase_power", implementations.increasePowerLogic);

}
