/**
 * @file Contains the actual implementations for various trait effects.
 * Each function defined here corresponds to an `effectId` that can be used
 * in `TraitDefinition`s. These functions are registered with the `TraitEffectSystem`.
 */
import { registerTraitEffectImplementation, resolveTargets, } from "../TraitEffectSystem";
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
import { TraitEffectFn, } from "../TraitEffectSystem";
import { pickRandom } from "../../utils";
import { impactEffect } from "../../Effects";

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

const splashDamageToRandomAdjacentAllyLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, state, scene } = context;
	const percent = (traitInstanceParams.percent ?? effectInstance.percent ?? 50) as number;
	const damage = Math.floor(sourceUnit.power * (percent / 100));

	if (damage <= 0) return;

	// Use the 'allies_adjacent' selector to find potential targets
	const adjacentAllies = resolveTargets(sourceUnit, sourceUnit.force, "allies_adjacent", state, scene);

	if (adjacentAllies.length > 0) {
		const randomAlly = pickRandom(adjacentAllies, 1)[0];
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
	const { sourceUnit, effectInstance, traitInstanceParams, scene, state } = context;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 50) as number;

	const targetForce = state.battleData.forces.find(f => f.id === sourceUnit.force);
	if (targetForce) {
		const oldMorale = targetForce.morale;
		targetForce.morale = Math.min(targetForce.maxMorale, targetForce.morale + amount);
		const actualRestore = targetForce.morale - oldMorale;

		if (actualRestore > 0) {
			scene.events.emit(GameEvents.MORALE_UPDATED, {
				forceId: targetForce.id,
				newMorale: targetForce.morale,
				maxMorale: targetForce.maxMorale,
			});

			const chara = getChara(sourceUnit.id);
			if (chara) {
				await chara.showPopText(`+${actualRestore} Morale`, "heal");
			}
		}
	}
};

/**
 * Effect: Reduces enemy force morale
 */
const reduceEnemyMoraleLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene, state } = context;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 75) as number;

	const enemyForce = state.battleData.forces.find(f => f.id !== sourceUnit.force);
	if (enemyForce) {
		const oldMorale = enemyForce.morale;
		enemyForce.morale = Math.max(0, enemyForce.morale - amount);
		const actualReduction = oldMorale - enemyForce.morale;

		if (actualReduction > 0) {
			scene.events.emit(GameEvents.MORALE_UPDATED, {
				forceId: enemyForce.id,
				newMorale: enemyForce.morale,
				maxMorale: enemyForce.maxMorale,
			});

			const chara = getChara(sourceUnit.id);
			if (chara) {
				await chara.showPopText(`-${actualReduction} Enemy Morale`, "damage");
			}
		}
	}
};

/**
 * Effect: Boosts ally damage temporarily
 */
const boostAllyDamageLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, scene } = context;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 15) as number;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 3000) as number;

	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			await chara.updateUnitAttribute("power", amount);
			await chara.showPopText(`+${amount} Damage!`);

			// Use Phaser's time management to remove the buff after duration
			scene.time.addEvent({
				delay: duration,
				callback: async () => {
					await chara.updateUnitAttribute("power", -amount);
				}
			});
		}
	}
};

/**
 * Effect: Hastes all allies
 */
const hasteAllAlliesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 2500) as number;

	const allies = resolveTargets(sourceUnit, sourceUnit.force, "all_allies", state, scene);

	for (const ally of allies) {
		const chara = getChara(ally.id); if (chara) {
			// Apply haste effect (increase action speed)
			const originalCooldown = ally.cooldown;
			ally.cooldown = Math.floor(ally.cooldown * 0.5); // 50% faster
			await chara.showPopText("Hasted!");

			// Use Phaser's time management to remove haste after duration
			scene.time.addEvent({
				delay: duration,
				callback: () => {
					ally.cooldown = originalCooldown;
				}
			});
		}
	}
};

/**
 * Effect: Slows all enemies
 */
const slowAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 2500) as number;

	const enemies = resolveTargets(sourceUnit, sourceUnit.force, "all_enemies", state, scene);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id); if (chara) {
			// Apply slow effect (decrease action speed)
			const originalCooldown = enemy.cooldown;
			enemy.cooldown = Math.floor(enemy.cooldown * 1.5); // 50% slower
			await chara.showPopText("Slowed!", "damage");

			// Use Phaser's time management to remove slow after duration
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
 * Effect: Freezes all enemies (prevents actions)
 */
const freezeAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1500) as number;

	const enemies = resolveTargets(sourceUnit, sourceUnit.force, "all_enemies", state, scene);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id); if (chara) {
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
 * Effect: Damage scales with missing HP (berserker rage)
 */
const damageScalesWithMissingHpLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const damagePerMissingHp = (traitInstanceParams.damage_per_missing_hp ?? effectInstance.damage_per_missing_hp ?? 2) as number;
	const hpThreshold = (traitInstanceParams.hp_threshold ?? effectInstance.hp_threshold ?? 10) as number;

	const missingHp = sourceUnit.maxHp - sourceUnit.hp;
	const bonusDamage = Math.floor(missingHp / hpThreshold) * damagePerMissingHp;

	if (bonusDamage > 0) {
		const chara = getChara(sourceUnit.id);
		if (chara) {
			await chara.updateUnitAttribute("power", bonusDamage);
			await chara.showPopText(`+${bonusDamage} Rage!`);
		}
	}
};

/**
 * Effect: Sacrifice HP for damage (reckless abandon)
 */
const sacrificeHpForDamageLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const hpLoss = (traitInstanceParams.hp_loss ?? effectInstance.hp_loss ?? 8) as number;
	const damageBonus = (traitInstanceParams.damage_bonus ?? effectInstance.damage_bonus ?? 4) as number;

	const chara = getChara(sourceUnit.id);
	if (chara && sourceUnit.hp > hpLoss) {
		// Reduce max HP and current HP
		sourceUnit.maxHp = Math.max(1, sourceUnit.maxHp - hpLoss);
		sourceUnit.hp = Math.min(sourceUnit.hp - hpLoss, sourceUnit.maxHp);

		// Increase damage
		await chara.updateUnitAttribute("power", damageBonus);
		await chara.showPopText(`Reckless! +${damageBonus} Dmg`);
	}
};

/**
 * Effect: Stuns all enemies
 */
const stunAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1200) as number;

	const enemies = resolveTargets(sourceUnit, sourceUnit.force, "all_enemies", state, scene);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id); if (chara) {
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
 * Effect: Area damage to all enemies
 */
const areaDamageEnemiesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const damage = (traitInstanceParams.damage ?? effectInstance.damage ?? 15) as number;

	const enemies = resolveTargets(sourceUnit, sourceUnit.force, "all_enemies", state, scene);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id);
		if (chara) {
			await chara.showPopText(`-${damage} Area Dmg`, "damage");
			chara.unitHit(damage);
		}
	}
};

/**
 * Effect: Reduces enemy damage globally while this unit is alive
 */
const reduceEnemyDamageGlobalLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, effectInstance, traitInstanceParams } = context;
	const reduction = (traitInstanceParams.reduction ?? effectInstance.reduction ?? 15) as number;

	const enemies = resolveTargets(sourceUnit, sourceUnit.force, "all_enemies", state, context.scene);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id);
		if (chara) {
			const damageReduction = Math.floor(enemy.power * (reduction / 100));
			await chara.updateUnitAttribute("power", -damageReduction);
		}
	}

	// Note: In a full implementation, you'd want to track this effect and remove it when the source unit dies
};

/**
 * Effect: Grants morale to allies
 */
const grantMoraleToAlliesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const moraleAmount = (traitInstanceParams.morale ?? effectInstance.morale ?? 40) as number;

	// This is a simplification - in a full implementation, you might have individual unit morale
	const targetForce = state.battleData.forces.find(f => f.id === sourceUnit.force);
	if (targetForce) {
		const oldMorale = targetForce.morale;
		targetForce.morale = Math.min(targetForce.maxMorale, targetForce.morale + moraleAmount);
		const actualGrant = targetForce.morale - oldMorale;

		if (actualGrant > 0) {
			scene.events.emit(GameEvents.MORALE_UPDATED, {
				forceId: targetForce.id,
				newMorale: targetForce.morale,
				maxMorale: targetForce.maxMorale,
			});

			const chara = getChara(sourceUnit.id);
			if (chara) {
				await chara.showPopText(`+${actualGrant} Team Morale`, "heal");
			}
		}
	}
};

/**
 * Effect: Cleanses debuffs from allies
 */
const cleanseAllyDebuffsLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene } = context;
	const allies = resolveTargets(sourceUnit, sourceUnit.force, "all_allies", state, scene);

	for (const ally of allies) {
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
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const dodgeChance = (traitInstanceParams.dodge_chance ?? effectInstance.dodge_chance ?? 30) as number;

	// This would typically be implemented in the damage handling system
	// For now, we'll just show the passive effect is active
	const chara = getChara(sourceUnit.id);
	if (chara && Math.random() * 100 < dodgeChance) {
		await chara.showPopText("Dodged!");
	}
};

/**
 * Effect: Applies poison to enemies
 */
const applyPoisonToEnemiesLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const damagePerTick = (traitInstanceParams.damage_per_tick ?? effectInstance.damage_per_tick ?? 3) as number;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 5000) as number;
	const tickInterval = (traitInstanceParams.tick_interval ?? effectInstance.tick_interval ?? 1000) as number;

	const enemies = resolveTargets(sourceUnit, sourceUnit.force, "all_enemies", state, scene);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id); if (chara) {
			await chara.showPopText("Poisoned!", "damage");

			// Apply poison damage over time using Phaser's time management
			const poisonTicks = Math.floor(duration / tickInterval);
			for (let i = 0; i < poisonTicks; i++) {
				scene.time.addEvent({
					delay: tickInterval * (i + 1),
					callback: async () => {
						if (chara && enemy.hp > 0) {
							await chara.showPopText(`-${damagePerTick} Poison`, "damage");
							chara.unitHit(damagePerTick);
						}
					}
				});
			}
		}
	}
};

/**
 * Effect: Reduces enemy damage temporarily
 */
const reduceEnemyDamageLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 8) as number;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 4000) as number;

	const enemies = resolveTargets(sourceUnit, sourceUnit.force, "all_enemies", state, scene);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id); if (chara) {
			await chara.updateUnitAttribute("power", -amount);
			await chara.showPopText(`-${amount} Damage`, "damage");

			// Use Phaser's time management to restore damage after duration
			scene.time.addEvent({
				delay: duration,
				callback: async () => {
					await chara.updateUnitAttribute("power", amount);
				}
			});
		}
	}
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
	const { sourceUnit, state, scene, effectInstance, traitInstanceParams } = context;
	const reduction = (traitInstanceParams.reduction ?? effectInstance.reduction ?? 12) as number;

	const allies = resolveTargets(sourceUnit, sourceUnit.force, "all_allies", state, scene);

	for (const ally of allies) {
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
	registerTraitEffectImplementation("damage_scales_with_missing_hp", damageScalesWithMissingHpLogic);
	registerTraitEffectImplementation("sacrifice_hp_for_damage", sacrificeHpForDamageLogic);
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

}
