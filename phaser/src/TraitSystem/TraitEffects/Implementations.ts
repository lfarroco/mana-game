/**
 * @file Contains the actual implementations for various trait effects.
 * Each function defined here corresponds to an `effectId` that can be used
 * in `TraitDefinition`s. These functions are registered with the `TraitEffectSystem`.
 * 
 * NOTE: HP-based traits have been removed as the game no longer uses HP mechanics.
 * Removed traits include:
 * - "temporary_hp_boost" (temporary HP increase)
 * - "damage_scales_with_missing_hp" (berserker rage based on missing HP)
 * - "sacrifice_hp_for_damage" (reckless abandon trading HP for power)
 * - "source_hp_below_percent" condition (HP threshold checks)
 * 
 * Alternative mechanics can focus on:
 * - Time-based effects (duration, cooldowns)
 * - Position-based bonuses (formation strategy)
 * - Resource management (morale, gold)
 * - Turn-based mechanics (action economy)
 */
import { registerTraitEffectImplementation } from "../TraitEffectSystem";
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
import { TraitEffectFn, TraitEffectContext } from "../TraitEffectSystem";
import { pickRandom } from "../../utils";
import { impactEffect } from "../../Effects";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

// ===== HELPER FUNCTIONS TO REDUCE REPETITION =====

/**
 * Helper function to get effect parameters with fallbacks
 */
function getEffectParams<T>(
	traitInstanceParams: any,
	effectInstance: any,
	paramName: string,
	defaultValue: T
): T {
	return (traitInstanceParams[paramName] ?? effectInstance[paramName] ?? defaultValue) as T;
}

/**
 * Helper function to apply a temporary attribute modification to targets
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
			await chara.updateUnitAttribute(attribute, amount);
			await chara.showPopText(popTextOverride || `${amount > 0 ? '+' : ''}${amount} ${attribute}`);

			// Use Phaser's time management to revert the change after duration
			scene.time.addEvent({
				delay: duration,
				callback: async () => {
					await chara.updateUnitAttribute(attribute, -amount);
				}
			});
		}
	}
}

/**
 * Helper function to apply temporary cooldown modifications (haste/slow effects)
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
			const originalCooldown = target.cooldown;
			target.cooldown = Math.floor(target.cooldown * multiplier);
			await chara.showPopText(popText);

			scene.time.addEvent({
				delay: duration,
				callback: () => {
					target.cooldown = originalCooldown;
				}
			});
		}
	}
}

/**
 * Helper function to manipulate force morale with proper event emission
 */
async function manipulateForceMorele(
	forceId: string,
	amount: number,
	context: TraitEffectContext,
	popTextPrefix: string = ""
): Promise<void> {
	const { scene, state, sourceUnit } = context;
	const targetForce = state.battleData.forces.find(f => f.id === forceId);

	if (targetForce) {
		const oldMorale = targetForce.morale;
		if (amount > 0) {
			targetForce.morale = Math.min(targetForce.maxMorale, targetForce.morale + amount);
		} else {
			targetForce.morale = Math.max(0, targetForce.morale + amount);
		}
		const actualChange = targetForce.morale - oldMorale;

		if (actualChange !== 0) {
			scene.events.emit(GameEvents.MORALE_UPDATED, {
				forceId: targetForce.id,
				newMorale: targetForce.morale,
				maxMorale: targetForce.maxMorale,
			});

			const chara = getChara(sourceUnit.id);
			if (chara) {
				const sign = actualChange > 0 ? '+' : '';
				await chara.showPopText(`${popTextPrefix}${sign}${actualChange} Morale`, actualChange > 0 ? "heal" : "damage");
			}
		}
	}
}

/**
 * Helper function to apply damage over time effects using Phaser's timer
 */
async function applyDamageOverTime(
	targets: Unit[],
	damagePerTick: number,
	duration: number,
	tickInterval: number,
	scene: BattlegroundScene,
	effectName: string = "DoT"
): Promise<void> {
	const poisonTicks = Math.floor(duration / tickInterval);

	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			await chara.showPopText(`${effectName}!`, "damage");

			for (let i = 0; i < poisonTicks; i++) {
				scene.time.addEvent({
					delay: tickInterval * (i + 1),
					callback: async () => {
						if (chara) {
							await chara.showPopText(`-${damagePerTick} ${effectName}`, "damage");
							chara.unitHit(damagePerTick);
						}
					}
				});
			}
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
 * Helper function to create effects that target the closest enemy (simplified targeting)
 * Uses pre-resolved targets from context.targets for consistency
 */
function createSimpleEnemyEffect(effectLogic: (target: Unit, context: TraitEffectContext) => Promise<void>): TraitEffectFn {
	return async (context) => {
		// Use pre-resolved targets from the trait system
		for (const target of context.targets) {
			await effectLogic(target, context);
		}
	};
}

/**
 * Helper function to create effects that affect the entire enemy guild
 * Uses pre-resolved targets from context.targets for consistency
 */
function createGuildWideEnemyEffect(effectLogic: (targets: Unit[], context: TraitEffectContext) => Promise<void>): TraitEffectFn {
	return async (context) => {
		// Use pre-resolved targets from the trait system
		await effectLogic(context.targets, context);
	};
}

// ===== EFFECT IMPLEMENTATIONS =====

/**
 * Effect: Grants a specified amount of gold to the player.
 * The source unit must belong to the player.
 */
const grantGoldToPlayerLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = context;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);

	if (amount !== 0 && sourceUnit.force === playerForce.id) {
		const chara = getChara(sourceUnit.id);
		await chara?.showPopText(`+${amount} Gold`);
		updatePlayerGoldIO(scene, amount);
	}
};

/**
 * Effect: Deals damage to target units.
 */
const dealDamageLogic: TraitEffectFn = async (context) => {
	const { targets } = context;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);

	for (const target of targets) {
		const charaTarget = getChara(target.id);
		await charaTarget?.showPopText(`-${amount} Dmg`, "damage");
	}
};

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

/**
 * Effect: If the source unit is in the back row, it gains an attack bonus.
 */
const traitSniperLogic: TraitEffectFn = async (context) => {
	const { sourceUnit } = context;
	const attackBonus = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 10);

	let isBackRow = false;
	const boardHeightInTiles = 3;

	if (sourceUnit.force === playerForce.id) {
		isBackRow = sourceUnit.position.y === boardHeightInTiles - 1;
	} else {
		isBackRow = sourceUnit.position.y === 0;
	}

	if (isBackRow) {
		const chara = getChara(sourceUnit.id);
		if (!chara) return;
		await chara.updateUnitAttribute("power", attackBonus);
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
			await chara.showPopText(`+${amount} Max Morale`);
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

	// Use pre-resolved adjacent allies targets (assumes targetSelector is "allies_adjacent")
	if (context.targets.length > 0) {
		const randomAlly = pickRandom(context.targets, 1)[0];
		const chara = getChara(randomAlly.id);
		const sourceChara = getChara(sourceUnit.id);
		if (chara && sourceChara) {
			await chara.showPopText(`-${damage} Dmg`, "damage");
			chara.unitHit(damage);
			impactEffect({ scene, location: chara, pointA: sourceChara, pointB: chara });
		}
	}
};

/**
 * Effect: Restores morale to the unit's force
 */
const restoreForceMoraleLogic: TraitEffectFn = async (context) => {
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 50);
	await manipulateForceMorele(context.sourceUnit.force, amount, context);
};

/**
 * Effect: Reduces enemy force morale
 */
const reduceEnemyMoraleLogic: TraitEffectFn = async (context) => {
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 75);
	const enemyForceId = context.state.battleData.forces.find(f => f.id !== context.sourceUnit.force)?.id;

	if (enemyForceId) {
		await manipulateForceMorele(enemyForceId, -amount, context, "Enemy ");
	}
};

/**
 * Effect: Boosts ally damage temporarily
 */
const boostAllyDamageLogic: TraitEffectFn = async (context) => {
	const { targets, scene } = context;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 15);
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 3000);

	await applyTemporaryAttributeModification(targets, "power", amount, duration, scene, `+${amount} Damage!`);
};

/**
 * Effect: Hastes all allies
 */
const hasteAllAlliesLogic: TraitEffectFn = async (context) => {
	const { targets, scene } = context;
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 2500);

	// Use pre-resolved targets (assumes targetSelector is "all_allies")
	await applyTemporaryCooldownModification(targets, 0.5, duration, scene, "Hasted!");
};

/**
 * Effect: Slows all enemies
 */
const slowAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { targets, scene } = context;
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 2500);

	// Use pre-resolved targets (assumes targetSelector is "enemy_guild" for guild-wide effects)
	await applyTemporaryCooldownModification(targets, 1.5, duration, scene, "Slowed!");
};

/**
 * Effect: Freezes all enemies (prevents actions)
 */
const freezeAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { targets, scene, effectInstance, traitInstanceParams } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1500) as number;

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara) {
			// Freeze enemy (prevent actions)
			const originalCooldown = enemy.cooldown;
			enemy.cooldown = Number.MAX_SAFE_INTEGER; // Effectively infinite cooldown
			await chara.showPopText("Frozen!", "damage");

			// Use Phaser's time management to unfreeze after duration
			scene.time.addEvent({
				delay: duration,
				callback: () => {
					enemy.cooldown = originalCooldown;
				}
			});
		}
	}
};

/**
 * Effect: Stuns all enemies
 */
const stunAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { targets, scene, effectInstance, traitInstanceParams } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1200) as number;

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara) {
			// Stun enemy (prevent actions and movement)
			const originalCooldown = enemy.cooldown;
			enemy.cooldown = Number.MAX_SAFE_INTEGER;
			await chara.showPopText("Stunned!", "damage");

			// Use Phaser's time management to remove stun after duration
			scene.time.addEvent({
				delay: duration,
				callback: () => {
					enemy.cooldown = originalCooldown;
				}
			});
		}
	}
};

/**
 * Effect: Area damage to all enemies (guild-wide)
 */
const areaDamageEnemiesLogic: TraitEffectFn = createGuildWideEnemyEffect(async (enemies, context) => {
	const damage = getEffectParams(context.traitInstanceParams, context.effectInstance, 'damage', 15);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id);
		if (chara) {
			await chara.showPopText(`-${damage} Area Dmg`, "damage");
			chara.unitHit(damage);
		}
	}
});

/**
 * Effect: Applies poison to enemies (closest enemy)
 */
const applyPoisonToEnemiesLogic: TraitEffectFn = createSimpleEnemyEffect(async (enemy, context) => {
	const { scene } = context;
	const damagePerTick = getEffectParams(context.traitInstanceParams, context.effectInstance, 'damage_per_tick', 3);
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 5000);
	const tickInterval = getEffectParams(context.traitInstanceParams, context.effectInstance, 'tick_interval', 1000);

	await applyDamageOverTime([enemy], damagePerTick, duration, tickInterval, scene, "Poison");
});

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
	await manipulateForceMorele(context.sourceUnit.force, moraleAmount, context, "Team ");
};

/**
 * Effect: Cleanses debuffs from allies
 */
const cleanseAllyDebuffsLogic: TraitEffectFn = async (context) => {
	const { targets } = context;

	// Use pre-resolved targets (assumes targetSelector is "all_allies")
	for (const ally of targets) {
		const chara = getChara(ally.id);
		if (chara) {
			// Reset cooldown to base value (removes slow/freeze effects)
			// In a full implementation, you'd track individual debuffs
			await chara.showPopText("Cleansed!", "heal");
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
		await chara.showPopText("Dodged!");
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
		await chara.showPopText(`Fortress Mode: +${armorBonus} Armor`);

		// Note: Damage reflection would be implemented in the damage handling system
	}
};

/**
 * Effect: Reduces damage taken by all allies
 */
const reduceAllyDamageTakenLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams } = context;
	const reduction = (traitInstanceParams.reduction ?? effectInstance.reduction ?? 12) as number;

	for (const ally of targets) {
		const chara = getChara(ally.id);
		if (chara) {
			// This would typically be implemented as a damage reduction modifier
			// For visual feedback:
			await chara.showPopText(`Protected (${reduction}%)`);
		}
	}

	// Note: The actual damage reduction would be implemented in the damage calculation system
};

/**
 * Effect: Damage scales with time in battle (growing fury)
 * Alternative to HP-based berserker rage
 */
const damageScalesWithTimeLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	const damagePerSecond = getEffectParams(traitInstanceParams, effectInstance, 'damage_per_second', 1);
	const timeInBattle = scene.time.now / 1000; // Convert to seconds

	const bonusDamage = Math.floor(timeInBattle * damagePerSecond);

	if (bonusDamage > 0) {
		const chara = getChara(sourceUnit.id);
		if (chara) {
			await chara.updateUnitAttribute("power", bonusDamage);
			await chara.showPopText(`+${bonusDamage} Fury!`);
		}
	}
};

/**
 * Effect: Sacrifice cooldown for damage (reckless haste)
 * Alternative to HP sacrifice - trades action speed for power
 */
const sacrificeCooldownForDamageLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const cooldownIncrease = getEffectParams(traitInstanceParams, effectInstance, 'cooldown_increase', 500);
	const damageBonus = getEffectParams(traitInstanceParams, effectInstance, 'damage_bonus', 8);

	const chara = getChara(sourceUnit.id);
	if (chara) {
		// Increase cooldown (slower actions)
		sourceUnit.cooldown += cooldownIncrease;

		// Increase damage
		await chara.updateUnitAttribute("power", damageBonus);
		await chara.showPopText(`Reckless! +${damageBonus} Dmg`);
	}
};

// ===== EFFECT REGISTRATIONS =====
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
	registerTraitEffectImplementation("splash_damage_to_random_adjacent_ally", splashDamageToRandomAdjacentAllyLogic);
	registerTraitEffectImplementation("restore_force_morale", restoreForceMoraleLogic);
	registerTraitEffectImplementation("reduce_enemy_morale", reduceEnemyMoraleLogic);
	registerTraitEffectImplementation("boost_ally_damage", boostAllyDamageLogic);
	registerTraitEffectImplementation("haste_all_allies", hasteAllAlliesLogic);
	registerTraitEffectImplementation("slow_all_enemies", slowAllEnemiesLogic);
	registerTraitEffectImplementation("freeze_all_enemies", freezeAllEnemiesLogic);
	registerTraitEffectImplementation("stun_all_enemies", stunAllEnemiesLogic);
	registerTraitEffectImplementation("area_damage_enemies", areaDamageEnemiesLogic);
	registerTraitEffectImplementation("reduce_enemy_damage_global", reduceEnemyDamageGlobalLogic);
	registerTraitEffectImplementation("grant_morale_to_allies", grantMoraleToAlliesLogic);
	registerTraitEffectImplementation("cleanse_ally_debuffs", cleanseAllyDebuffsLogic);
	registerTraitEffectImplementation("chance_to_dodge", chanceToDodgeLogic);
	registerTraitEffectImplementation("apply_poison_to_enemies", applyPoisonToEnemiesLogic);
	registerTraitEffectImplementation("reduce_enemy_damage", reduceEnemyDamageLogic);
	registerTraitEffectImplementation("fortress_mode_passive", fortressModePassiveLogic);
	registerTraitEffectImplementation("reduce_ally_damage_taken", reduceAllyDamageTakenLogic);

	// Alternative mechanics (replacing removed HP-based traits)
	registerTraitEffectImplementation("damage_scales_with_time", damageScalesWithTimeLogic);
	registerTraitEffectImplementation("sacrifice_cooldown_for_damage", sacrificeCooldownForDamageLogic);

	// Simple attribute modification effects (using the helper factory)
	registerTraitEffectImplementation("increase_power", increasePowerLogic);

	// Alternative effects replacing HP-based traits
	registerTraitEffectImplementation("damage_scales_with_time", damageScalesWithTimeLogic);
	registerTraitEffectImplementation("sacrifice_cooldown_for_damage", sacrificeCooldownForDamageLogic);
}
