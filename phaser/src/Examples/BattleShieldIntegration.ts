/**
 * Integration Example: Adding shields to forces before battle (morale-based system)
 * 
 * This example shows how to give forces shield before battle starts.
 * Shield capacity is determined by current morale - shields can't exceed morale.
 * The shield bars will automatically appear alongside morale bars when combat begins.
 */

import { manipulateForceShield, playerForce, cpuForce } from '../Models/Entities/Force';

/**
 * Example: Give both forces shields before battle starts
 * Call this somewhere in your game logic before combat begins
 */
export function setupBattleShields(scene?: Phaser.Scene) {
	// Assume forces have some morale already (e.g., 500 from INITIAL_MORALE)
	// Give player 100 shield (capped by current morale)
	manipulateForceShield(playerForce, 100, scene);

	// Give enemy 75 shield (capped by current morale)
	manipulateForceShield(cpuForce, 75, scene);

	console.log('Battle shields set up:');
	console.log(`Player: ${playerForce.shield}/${playerForce.morale} shield (morale acts as capacity)`);
	console.log(`Enemy: ${cpuForce.shield}/${cpuForce.morale} shield (morale acts as capacity)`);
}

/**
 * Example: Give only the player shields (defensive advantage)
 */
export function setupPlayerShieldAdvantage(scene?: Phaser.Scene) {
	// Give player shield advantage
	manipulateForceShield(playerForce, 150, scene);

	// Enemy has no shields (but could get them later via units/abilities)
	// No need to explicitly set to 0, shields start at 0

	console.log('Player shield advantage set up');
}

/**
 * Example: Progressive shield system - shields increase each round
 */
export function setupProgressiveShields(round: number, scene?: Phaser.Scene) {
	const playerShieldAmount = round * 50; // 50, 100, 150, etc.
	const enemyShieldAmount = round * 30;  // 30, 60, 90, etc.

	// Add shields (will be capped by current morale)
	manipulateForceShield(playerForce, playerShieldAmount, scene);
	manipulateForceShield(cpuForce, enemyShieldAmount, scene);

	console.log(`Round ${round} shields: Player ${playerForce.shield}, Enemy ${cpuForce.shield}`);
}

/**
 * Example: Conditional shields based on game state
 */
export function setupConditionalShields(playerPrestige: number, scene?: Phaser.Scene) {
	// Player gets more shields with higher prestige
	if (playerPrestige >= 100) {
		manipulateForceShield(playerForce, 200, scene);
		manipulateForceShield(cpuForce, 50, scene);
	} else if (playerPrestige >= 50) {
		manipulateForceShield(playerForce, 100, scene);
		manipulateForceShield(cpuForce, 75, scene);
	} else {
		// Low prestige players start with minimal shields
		manipulateForceShield(playerForce, 25, scene);
		// Enemy gets no starting shields
	}
}

/**
 * Example: Reset shields between battles (they start at 0 anyway)
 */
export function resetAllShields(scene?: Phaser.Scene) {
	// Set both shields to 0
	playerForce.shield = 0;
	cpuForce.shield = 0;

	// Emit events to update display
	if (scene) {
		scene.events.emit('shield_updated', {
			forceId: playerForce.id,
			newShield: 0,
			maxShield: playerForce.morale
		});
		scene.events.emit('shield_updated', {
			forceId: cpuForce.id,
			newShield: 0,
			maxShield: cpuForce.morale
		});
	}

	console.log('All shields reset');
}

/**
 * Example: Shield-based abilities during battle
 */
export function grantShieldAbility(targetForce: any, shieldAmount: number, scene?: Phaser.Scene) {
	// A unit ability that grants shields to its force
	const actualShieldGained = manipulateForceShield(targetForce, shieldAmount, scene);

	console.log(`Ability granted ${actualShieldGained} shield to ${targetForce.id}`);
	return actualShieldGained;
}

/**
 * Example: Damage application using the new shield-first system
 */
export function dealDamageWithShieldAbsorption(targetForce: any, damage: number, scene?: Phaser.Scene) {
	// This is now handled automatically by applyDamageToForce in the Force module
	// But here's how you might implement similar logic manually:

	if (targetForce.shield > 0) {
		const shieldAbsorbed = Math.min(damage, targetForce.shield);
		const remainingDamage = damage - shieldAbsorbed;

		// Remove absorbed damage from shield
		manipulateForceShield(targetForce, -shieldAbsorbed, scene);

		console.log(`Shield absorbed ${shieldAbsorbed} damage, ${remainingDamage} damage remains`);
		return remainingDamage;
	}

	return damage; // No shield, full damage goes through
}
