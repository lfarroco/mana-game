/**
 * Example usage of ModifiersDisplay
 * 
 * This demonstrates how to integrate and use the ModifiersDisplay system
 * in your game scenes.
 */

import { GameEvents } from '../../constants/events';
import * as c from '../../constants/constants';

// Example usage in a game scene:
export class ExampleUsage {
	private scene: Phaser.Scene;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	// Example: Player gains +2 attack, +1 defense, +0 heal
	playerGainsAttackBonus() {
		this.scene.events.emit(GameEvents.MODIFIERS_UPDATED, {
			forceId: c.FORCE_ID_PLAYER,
			atkMod: 2,
			defMod: 1,
			healMod: 0
		});
	}

	// Example: Enemy gains +1 attack, +2 defense, +1 heal
	enemyGainsDefensiveBonus() {
		this.scene.events.emit(GameEvents.MODIFIERS_UPDATED, {
			forceId: c.FORCE_ID_CPU,
			atkMod: 1,
			defMod: 2,
			healMod: 1
		});
	}

	// Example: Player loses some modifiers (negative values)
	playerLosesModifiers() {
		this.scene.events.emit(GameEvents.MODIFIERS_UPDATED, {
			forceId: c.FORCE_ID_PLAYER,
			atkMod: -1,
			defMod: 0,
			healMod: -2
		});
	}

	// Show displays at battle start
	onBattleStart() {
		this.scene.events.emit(GameEvents.MODIFIERS_DISPLAYS_SHOW);
	}

	// Hide displays when battle ends
	onBattleEnd() {
		this.scene.events.emit(GameEvents.MODIFIERS_DISPLAYS_HIDE);
	}
}

/* 
 * USAGE NOTES:
 * 
 * 1. The ModifiersDisplay is automatically initialized by BattlegroundEventSystem
 * 2. To update modifiers, emit GameEvents.MODIFIERS_UPDATED with payload:
 *    { forceId: string, atkMod: number, defMod: number, healMod: number }
 * 3. To show displays: emit GameEvents.MODIFIERS_DISPLAYS_SHOW
 * 4. To hide displays: emit GameEvents.MODIFIERS_DISPLAYS_HIDE
 * 5. Values can be positive or negative integers
 * 6. The display will automatically format with + or - prefix
 * 7. Colors are different for player (green) vs enemy (red)
 */
