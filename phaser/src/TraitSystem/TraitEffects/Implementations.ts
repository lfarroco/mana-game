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
import { GameEvents } from "../../constants/events";
import { playerForce, manipulateForceMoreale } from "../../Models/Entities/Force";
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
import { TraitEffectFn, TraitEffectContext } from "../TraitEffectSystem";
import { pickRandom, devlog } from "../../utils";
import { impactEffect } from "../../Effects";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { Chara } from "../../Systems/Chara/Chara";
import { applyStatusEffect } from "../../Systems/StatusEffects/StatusEffectManager";

// Import extracted implementations
import { dealDamageLogic, grantGoldLogic, restoreForceMoraleLogic, reduceEnemyMoraleLogic, guildWideDamageLogic, boostAllyDamageLogic, hasteAllAlliesLogic, applyPoisonToEnemiesLogic, slowAllEnemies, traitSniper } from "./implementations/index";

// ===== HELPER FUNCTIONS TO REDUCE REPETITION =====

/**
 * Helper function to safely show pop text only when the scene and chara are active
 */
async function safeShowPopText(chara: Chara, text: string, type?: "heal" | "damage", scene?: BattlegroundScene): Promise<void> {
	if (chara && chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
		await chara.showPopText(text, type);
	}
}

/**
 * Helper function to apply a temporary attribute modification to targets
 * Uses the new unified status effect system
 */
async function applyTemporaryAttributeModification(
	targets: Unit[],
	attribute: keyof Unit,
	amount: number,
	duration: number,
	scene: BattlegroundScene,
	popTextOverride?: string
): Promise<void> {
	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			const effectType = amount > 0 ? 'power_buff' : 'power_debuff';

			applyStatusEffect(target, {
				type: effectType,
				remainingDuration: duration,
				attribute,
				amount,
				displayName: popTextOverride || `${amount > 0 ? '+' : ''}${amount} ${attribute}`
			});

			// Only show pop text if the scene is still active (battle hasn't ended)
			await safeShowPopText(chara, popTextOverride || `${amount > 0 ? '+' : ''}${amount} ${attribute}`, undefined, scene);
		}
	}
}

/**
 * Helper function to apply temporary cooldown modifications (haste/slow effects)
 * Uses the new unified status effect system
 */
async function applyTemporaryCooldownModification(
	targets: Unit[],
	multiplier: number,
	duration: number,
	scene: BattlegroundScene,
	popText: string
): Promise<void> {
	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			// Determine the effect type based on multiplier
			const effectType = multiplier < 1.0 ? 'haste' : 'slow';

			applyStatusEffect(target, {
				type: effectType,
				remainingDuration: duration,
				cooldownMultiplier: multiplier,
				displayName: effectType === 'haste' ? 'Hasted' : 'Slowed'
			});

			// Only show pop text if the scene is still active
			await safeShowPopText(chara, popText, undefined, scene);
		}
	}
}

/**
 * Helper function to manipulate force morale with proper event emission and pop text
 */
async function manipulateForceMorealeWrapper(
	forceId: string,
	amount: number,
	context: TraitEffectContext,
	popTextPrefix: string = ""
): Promise<void> {
	const { scene, state, sourceUnit } = context;
	const targetForce = state.battleData.forces.find(f => f.id === forceId);

	if (targetForce) {
		// Use the shared utility function that handles morale damage reduction
		const actualChange = manipulateForceMoreale(targetForce, amount, scene);

		// Show pop text for the source unit
		if (actualChange !== 0) {
			const chara = getChara(sourceUnit.id);
			if (chara) {
				const sign = actualChange > 0 ? '+' : '';
				await safeShowPopText(chara, `${popTextPrefix}${sign}${actualChange} Morale`, actualChange > 0 ? "heal" : "damage", scene);
			}
		}
	}
}

/**
 * Helper function to apply damage over time effects using the new status system
 */
async function applyDamageOverTime(
	targets: Unit[],
	damagePerTick: number,
	duration: number,
	tickInterval: number,
	scene: BattlegroundScene,
	effectName: string = "DoT"
): Promise<void> {
	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			applyStatusEffect(target, {
				type: 'poison',
				remainingDuration: duration,
				damagePerTick,
				tickInterval,
				timeSinceLastTick: 0,
				displayName: effectName
			});

			// Only show pop text if the scene is still active
			await safeShowPopText(chara, `${effectName}!`, "damage", scene);
		}
	}
}

/**
 * Helper function to create skill-based effects
 */
function createSkillEffect(skillFunction: (scene: BattlegroundScene, unit: Unit) => Promise<void>): TraitEffectFn {
	return async (context) => {
		const { sourceUnit, scene } = context;
		await skillFunction(scene, sourceUnit);
	};
}

/**
 * Helper function to create parameterized skill effects
 */
function createParameterizedSkillEffect(
	skillFunction: (scene: BattlegroundScene) => (unit: Unit, ...args: any[]) => Promise<void>,
	paramName?: string,
	defaultValue?: any
): TraitEffectFn {
	return async (context) => {
		const { sourceUnit, scene } = context;
		if (paramName) {
			const param = getEffectParams(context.traitInstanceParams, context.effectInstance, paramName, defaultValue);
			await skillFunction(scene)(sourceUnit, param);
		} else {
			await skillFunction(scene)(sourceUnit);
		}
	};
}

/**
 * Helper function to create simple attribute modification effects
 */
function createAttributeModificationEffect(attribute: keyof Unit, isTemporary: boolean = false): TraitEffectFn {
	return async (context) => {
		const { targets, scene } = context;
		const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);

		if (isTemporary) {
			const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 3000);
			await applyTemporaryAttributeModification(targets, attribute, amount, duration, scene);
		} else {
			for (const target of targets) {
				const chara = getChara(target.id);
				if (chara) {
					await chara.updateUnitAttribute(attribute, amount);
				}
			}
		}
	};
}

/**
 * Helper function to create effects that target the closest enemy
 */
function createSimpleEnemyEffect(effectLogic: (target: Unit, context: TraitEffectContext) => Promise<void>): TraitEffectFn {
	return async (context) => {
		for (const target of context.targets) {
			await effectLogic(target, context);
		}
	};
}

/**
 * Helper function to create effects that affect the entire enemy guild
 */
function createGuildWideEnemyEffect(effectLogic: (targets: Unit[], context: TraitEffectContext) => Promise<void>): TraitEffectFn {
	return async (context) => {
		await effectLogic(context.targets, context);
	};
}

// ===== EFFECT IMPLEMENTATIONS =====

/**
 * Effect: Grants a specified amount of gold to the player.
 * The source unit must belong to the player.
 */
// grantGoldToPlayerLogic implementation moved to ./implementations/grantGold.ts

/**
 * Effect: Makes the source unit perform the "slash" skill.
 */
const performSkillMeleeLogic: TraitEffectFn = createSkillEffect(slash);

/**
 * Effect: Makes the source unit perform the "shoot" skill.
 */
const performSkillShootLogic: TraitEffectFn = createParameterizedSkillEffect(shootSkillFn);

/**
 * Effect: Makes the source unit perform the "heal" skill.
 */
const performSkillHealLogic: TraitEffectFn = createParameterizedSkillEffect(healing);

/**
 * Effect: Makes the source unit perform the "healing wave" skill.
 */
const performSkillHealingWaveLogic: TraitEffectFn = createSkillEffect(healingWave);

/**
 * Effect: Makes the source unit perform the "arcane missiles" skill.
 * Can take `projectiles` parameter from trait/effect data.
 */
const performSkillArcaneMissilesLogic: TraitEffectFn = createParameterizedSkillEffect(arcaneMissiles, 'projectiles', 3);

/**
 * Effect: Makes the source unit perform the "haste" skill.
 */
const performSkillHasteLogic: TraitEffectFn = createSkillEffect(haste);

/**
 * Effect: Makes the source unit perform the "slow" skill.
 */
const performSkillSlowLogic: TraitEffectFn = createSkillEffect(slow);

/**
 * Effect: Makes the source unit perform the "fireball" skill.
 */
const performSkillFireballLogic: TraitEffectFn = createParameterizedSkillEffect(fireballSkillFn);

/**
 * Effect: Makes the source unit perform the "summon" skill.
 * Requires `cardIdToSummon` parameter from trait/effect data.
 */
const performSkillSummonLogic: TraitEffectFn = async (context) => {
	const { sourceUnit } = context;
	const cardIdToSummon = getEffectParams(context.traitInstanceParams, context.effectInstance, 'cardIdToSummon', '');
	const chara = getChara(sourceUnit.id);

	if (chara && cardIdToSummon) {
		await summon(chara, cardIdToSummon);
	} else {
		console.warn(`Summon effect: Chara for sourceUnit ${sourceUnit.id} not found, or cardIdToSummon missing. Card ID: ${cardIdToSummon}`);
	}
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
			await safeShowPopText(chara, `+${amount} Max Morale`, undefined, scene);
		}
	}
};

const modifyStatPassiveLogic: TraitEffectFn = async (context) => {
	const { targets } = context;
	const attribute = getEffectParams(context.traitInstanceParams, context.effectInstance, 'attribute', 'power') as keyof Unit;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);

	if (!attribute || amount === 0) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`Modify stat effect is missing required parameters (attribute, amount).`, { attribute, amount });
		}
		return;
	}

	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			await chara.updateUnitAttribute(attribute, amount);
		}
	}
};

/**
 * Effect: Permanently increases power of targets
 */
const increasePowerLogic: TraitEffectFn = createAttributeModificationEffect('power', false);

const splashDamageToRandomAdjacentAllyLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	const percent = (traitInstanceParams.percent ?? effectInstance.percent ?? 50) as number;
	const damage = Math.floor(sourceUnit.power * (percent / 100));

	if (damage <= 0) return;

	if (context.targets.length > 0) {
		const randomAlly = pickRandom(context.targets, 1)[0];
		const chara = getChara(randomAlly.id);
		const sourceChara = getChara(sourceUnit.id);
		if (chara && sourceChara) {
			await safeShowPopText(chara, `-${damage} Dmg`, "damage", scene);
			chara.unitHit(damage);
			impactEffect({ scene, location: chara, pointA: sourceChara, pointB: chara });
		}
	}
};

/**
 * Effect: Slows all enemies
 */
// slowAllEnemiesLogic implementation moved to ./implementations/slowAllEnemies.ts

/**
 * Effect: Freezes all enemies (prevents actions)
 */
const freezeAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, scene } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1500) as number;

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara) {
			applyStatusEffect(enemy, {
				type: 'freeze',
				remainingDuration: duration,
				displayName: 'Frozen'
			});

			// Only show pop text if the scene is still active
			await safeShowPopText(chara, "Frozen!", "damage", scene);
		}
	}
};

/**
 * Effect: Stuns all enemies
 */
const stunAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, scene } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1200) as number;

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara) {
			applyStatusEffect(enemy, {
				type: 'stun',
				remainingDuration: duration,
				displayName: 'Stunned'
			});

			// Only show pop text if the scene is still active
			await safeShowPopText(chara, "Stunned!", "damage", scene);
		}
	}
};

/**
 * Effect: Reduces enemy damage globally while this unit is alive
 */
const reduceEnemyDamageGlobalLogic: TraitEffectFn = createGuildWideEnemyEffect(async (enemies, context) => {
	const reduction = getEffectParams(context.traitInstanceParams, context.effectInstance, 'reduction', 15);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id);
		if (chara) {
			const damageReduction = Math.floor(enemy.power * (reduction / 100));
			await chara.updateUnitAttribute("power", -damageReduction);
		}
	}
	// Note: In a full implementation, you'd want to track this effect and remove it when the source unit dies
});

/**
 * Effect: Grants morale to allies
 */
const grantMoraleToAlliesLogic: TraitEffectFn = async (context) => {
	const moraleAmount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'morale', 40);
	await manipulateForceMorealeWrapper(context.sourceUnit.force, moraleAmount, context, "Team ");
};

/**
 * Effect: Cleanses debuffs from allies
 */
const cleanseAllyDebuffsLogic: TraitEffectFn = async (context) => {
	const { targets } = context;

	for (const ally of targets) {
		const chara = getChara(ally.id);
		if (chara) {
			// Reset cooldown to base value (removes slow/freeze effects)
			// In a full implementation, you'd track individual debuffs
			await safeShowPopText(chara, "Cleansed!", "heal", context.scene);
		}
	}
};

/**
 * Effect: Chance to dodge incoming damage
 */
const chanceToDodgeLogic: TraitEffectFn = async (context) => {
	const { sourceUnit } = context;
	const dodgeChance = getEffectParams(context.traitInstanceParams, context.effectInstance, 'dodge_chance', 30);

	// This would typically be implemented in the damage handling system
	// For now, we'll just show the passive effect is active
	const chara = getChara(sourceUnit.id);
	if (chara && Math.random() * 100 < dodgeChance) {
		await safeShowPopText(chara, "Dodged!", undefined, context.scene);
	}
};

/**
 * Effect: Reduces enemy damage temporarily
 */
const reduceEnemyDamageLogic: TraitEffectFn = async (context) => {
	const { targets, scene } = context;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 8);
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 4000);

	await applyTemporaryAttributeModification(targets, "power", -amount, duration, scene, `-${amount} Damage`);
};

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
	registerTraitEffectImplementation("grant_gold_to_player", grantGoldLogic);
	registerTraitEffectImplementation("deal_damage", dealDamageLogic);

	// Trait-based effects
	registerTraitEffectImplementation("trait_sniper", traitSniper);

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
	registerTraitEffectImplementation("splash_damage_to_random_adjacent_ally", splashDamageToRandomAdjacentAllyLogic);
	registerTraitEffectImplementation("restore_force_morale", restoreForceMoraleLogic);
	registerTraitEffectImplementation("reduce_enemy_morale", reduceEnemyMoraleLogic);
	registerTraitEffectImplementation("boost_ally_damage", boostAllyDamageLogic);
	registerTraitEffectImplementation("haste_all_allies", hasteAllAlliesLogic);
	registerTraitEffectImplementation("slow_all_enemies", slowAllEnemies);
	registerTraitEffectImplementation("freeze_all_enemies", freezeAllEnemiesLogic);
	registerTraitEffectImplementation("stun_all_enemies", stunAllEnemiesLogic);
	registerTraitEffectImplementation("guild_wide_damage", guildWideDamageLogic);
	registerTraitEffectImplementation("reduce_enemy_damage_global", reduceEnemyDamageGlobalLogic);
	registerTraitEffectImplementation("grant_morale_to_allies", grantMoraleToAlliesLogic);
	registerTraitEffectImplementation("cleanse_ally_debuffs", cleanseAllyDebuffsLogic);
	registerTraitEffectImplementation("chance_to_dodge", chanceToDodgeLogic);
	registerTraitEffectImplementation("apply_poison_to_enemies", applyPoisonToEnemiesLogic);
	registerTraitEffectImplementation("reduce_enemy_damage", reduceEnemyDamageLogic);
	registerTraitEffectImplementation("fortress_mode_passive", fortressModePassiveLogic);
	registerTraitEffectImplementation("reduce_ally_damage_taken", reduceAllyDamageTakenLogic);
	registerTraitEffectImplementation("morale_damage_reduction", moraleDamageReductionLogic);

	// Time-based and alternative mechanics
	registerTraitEffectImplementation("damage_scales_with_time", damageScalesWithTimeLogic);
	registerTraitEffectImplementation("sacrifice_cooldown_for_damage", sacrificeCooldownForDamageLogic);

	// Simple attribute modification effects
	registerTraitEffectImplementation("increase_power", increasePowerLogic);

}
