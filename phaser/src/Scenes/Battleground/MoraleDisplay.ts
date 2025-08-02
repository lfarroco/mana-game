import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { GameEvents } from '../../constants/events';
import { StylizedBar, createStylizedBar, updateStylizedBar } from './StylizedBar';
import { tween } from '../../Utils/animation';
import { cpuForce, playerForce } from '../../Models/Entities/Force';

// Combined display for both morale and shield bars
type CombinedDisplay = {
	moraleBar: StylizedBar;
	shieldBar: StylizedBar;
};

// Module-level variables to hold the combined displays
let playerDisplay: CombinedDisplay | null = null;
let cpuDisplay: CombinedDisplay | null = null;
let scene: Phaser.Scene | null = null;

/**
 * Returns the position of the morale bar for a given forceId.
 * @param forceId Player or CPU force id
 * @returns { x: number, y: number } or null if not available
 */
export function getMoraleBarPosition(forceId: string): { x: number, y: number } | null {
	if (forceId === c.FORCE_ID_PLAYER && playerDisplay) {
		return {
			x: playerDisplay.moraleBar.container.x,
			y: playerDisplay.moraleBar.container.y
		};
	} else if (forceId === c.FORCE_ID_CPU && cpuDisplay) {
		return {
			x: cpuDisplay.moraleBar.container.x,
			y: cpuDisplay.moraleBar.container.y
		};
	}
	return null;
}

// Track previous values to calculate deltas
let previousPlayerMorale: number | null = null;
let previousCpuMorale: number | null = null;
let previousPlayerShield: number | null = null;
let previousCpuShield: number | null = null;

/**
 * Handles the MORALE_UPDATED event by calling the bar update function.
 * @param payload The event payload with forceId, newMorale, maxMorale, optional totalDamage, and optional damageType.
 */
function handleMoraleUpdated(payload: { forceId: string, newMorale: number, maxMorale: number, totalDamage?: number, damageType?: "poison" | "normal" }) {
	updateMoraleBar(payload.forceId);

	// Calculate morale delta and show pop text
	const targetDisplay = payload.forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay || !scene) return;

	// Get previous morale value
	const isPlayer = payload.forceId === c.FORCE_ID_PLAYER;
	const previousMorale = isPlayer ? previousPlayerMorale : previousCpuMorale;

	// Use totalDamage if provided (for damage that affects both shield and morale)
	// Otherwise calculate delta as usual
	let displayValue: number;
	if (payload.totalDamage !== undefined && payload.totalDamage > 0) {
		displayValue = -payload.totalDamage; // Show total damage as negative
	} else if (previousMorale !== null) {
		displayValue = payload.newMorale - previousMorale; // Normal delta calculation
	} else {
		displayValue = 0; // No previous value to compare
	}

	// Update the stored previous value
	if (isPlayer) {
		previousPlayerMorale = payload.newMorale;
	} else {
		previousCpuMorale = payload.newMorale;
	}

	// Show pop text if there's a meaningful change
	if (displayValue !== 0) {
		// Calculate random position over the morale bar area
		const barWidth = scene.scale.width / 4;
		const randomOffsetX = Math.random() * barWidth; // Random position across bar width
		const randomOffsetY = (Math.random() - 0.5) * 40; // Random vertical offset (-20 to +20 pixels)

		const popTextX = targetDisplay.moraleBar.container.x + randomOffsetX;
		const popTextY = targetDisplay.moraleBar.container.y + randomOffsetY;

		const deltaText = displayValue > 0 ? `+${displayValue}` : `${displayValue}`;

		// Determine text type based on damage type and value
		let textType: "heal" | "damage" | "poison";
		if (displayValue > 0) {
			textType = "heal"; // Green for positive (healing)
		} else if (payload.damageType === "poison") {
			textType = "poison"; // Purple for poison damage
		} else {
			textType = "damage"; // Red for normal damage
		}

		const textDirection = isPlayer ? "left" : "right"; // Player text flows left, enemy text flows right

		scene.events.emit(GameEvents.POP_TEXT_SHOW, {
			text: deltaText,
			x: popTextX,
			y: popTextY,
			type: textType,
			direction: textDirection,
		});
	}
}

/**
 * Handles the SHIELD_UPDATED event by calling the bar update function.
 * @param payload The event payload with forceId, newShield, maxShield, and optional suppressPopText.
 */
function handleShieldUpdated(payload: { forceId: string, newShield: number, maxShield: number, suppressPopText?: boolean }) {
	updateShieldBar(payload.forceId, payload.newShield, payload.maxShield);

	// Skip pop text if suppressed (e.g., when damage affects both shield and morale)
	if (payload.suppressPopText) {
		// Still update previous values for future calculations
		const isPlayer = payload.forceId === c.FORCE_ID_PLAYER;
		if (isPlayer) {
			previousPlayerShield = payload.newShield;
		} else {
			previousCpuShield = payload.newShield;
		}
		return;
	}

	// Calculate shield delta and show pop text
	const targetDisplay = payload.forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay || !scene) return;

	// Get previous shield value
	const isPlayer = payload.forceId === c.FORCE_ID_PLAYER;
	const previousShield = isPlayer ? previousPlayerShield : previousCpuShield;

	// Calculate delta if we have a previous value
	if (previousShield !== null) {
		const delta = payload.newShield - previousShield;

		if (delta !== 0) {
			// Calculate random position over the shield bar area
			const barWidth = scene.scale.width / 4;
			const randomOffsetX = Math.random() * barWidth; // Random position across bar width
			const randomOffsetY = (Math.random() - 0.5) * 40; // Random vertical offset (-20 to +20 pixels)

			const popTextX = targetDisplay.shieldBar.container.x + randomOffsetX;
			const popTextY = targetDisplay.shieldBar.container.y + randomOffsetY;

			const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
			const textType = delta > 0 ? "shield" : "damage"; // Yellow for positive shield gain, red for negative
			const textDirection = isPlayer ? "left" : "right"; // Player text flows left, enemy text flows right

			scene.events.emit(GameEvents.POP_TEXT_SHOW, {
				text: deltaText,
				x: popTextX,
				y: popTextY,
				type: textType,
				direction: textDirection,
			});
		}
	}

	// Update the stored previous value
	if (isPlayer) {
		previousPlayerShield = payload.newShield;
	} else {
		previousCpuShield = payload.newShield;
	}
}

export const MORALE_BAR_WIDTH = c.TILE_WIDTH * 3 + 8 * 2; // width of board

function createCombinedDisplay(
	scene: Phaser.Scene,
	forceId: string,
): CombinedDisplay {
	// Board constants
	const BAR_OFFSET = 16; // px below the board
	let x = 0, y = 0;
	if (forceId === c.FORCE_ID_PLAYER) {
		x = c.PLAYER_BOARD_X;
		y = c.PLAYER_BOARD_Y + c.TILE_HEIGHT * 3 + 8 * 2 + BAR_OFFSET;
	} else {
		x = c.CPU_BOARD_X;
		y = c.CPU_BOARD_Y + c.TILE_HEIGHT * 3 + 8 * 2 + BAR_OFFSET;
	}

	// Create morale bar
	const moraleBarColor = forceId === c.FORCE_ID_PLAYER ? 0x4CAF50 : 0xF44336;
	const moraleBar = createStylizedBar(scene, {
		x,
		y,
		width: MORALE_BAR_WIDTH,
		barColor: moraleBarColor,
		backgroundColor: 0x000000,
		backgroundOpacity: 0.2,
		textConfig: c.defaultTextConfig
	});

	// Create shield bar positioned over the morale bar
	const shieldBarColor = 0xFFD700; // Gold/Yellow color for shields
	const shieldBar = createStylizedBar(scene, {
		x,
		y: y, // Same Y position as morale bar
		width: MORALE_BAR_WIDTH,
		barColor: shieldBarColor,
		backgroundColor: 0x000000,
		backgroundOpacity: 0, // No background
		borderOpacity: 0, // No border
		textConfig: c.defaultTextConfig
	});

	// Make the shield bar semi-transparent
	shieldBar.container.setAlpha(0.5);

	return {
		moraleBar,
		shieldBar
	};
}

export function init(sceneRef: Phaser.Scene): void {
	// Clean up existing displays if re-initializing
	destroy();

	// Assign scene
	scene = sceneRef;

	// Create combined displays (morale + shield bars)
	if (scene) {
		playerDisplay = createCombinedDisplay(scene, c.FORCE_ID_PLAYER);
		if (playerDisplay) {
			playerDisplay.moraleBar.container.setVisible(true);
			playerDisplay.shieldBar.container.setVisible(true);
		}
		updateMoraleBar(playerForce.id);
		updateShieldBar(playerForce.id, playerForce.shield, playerForce.maxMorale); // Use maxMorale as maxShield

		cpuDisplay = createCombinedDisplay(scene, c.FORCE_ID_CPU);

		scene.events.on(GameEvents.MORALE_UPDATED, handleMoraleUpdated);
		scene.events.on(GameEvents.SHIELD_UPDATED, handleShieldUpdated);
	}
}

export function showBars(): void {
	if (playerDisplay) {
		playerDisplay.moraleBar.container.setVisible(true);
		playerDisplay.shieldBar.container.setVisible(true);
	}
	if (cpuDisplay) {
		cpuDisplay.moraleBar.container.setVisible(true);
		cpuDisplay.shieldBar.container.setVisible(true);
	}
}

export function hideBars(): void {
	// playerbar: always visible
	//if (playerDisplay) {
	//	playerDisplay.moraleBar.container.setVisible(false);
	//	playerDisplay.shieldBar.container.setVisible(false);
	//}
	if (cpuDisplay) {
		cpuDisplay.moraleBar.container.setVisible(false);
		cpuDisplay.shieldBar.container.setVisible(false);
	}
}

export async function fadeOutBars(): Promise<void> {
	const containers = [];
	if (cpuDisplay) {
		containers.push(cpuDisplay.moraleBar.container, cpuDisplay.shieldBar.container);
	}
	if (containers.length === 0) return;

	// Fade out all containers simultaneously
	await tween({
		targets: containers,
		alpha: 0,
	});

	// Hide them after fading
	hideBars();

	// Reset alpha for next time
	containers.forEach(container => {
		container.setAlpha(1);
	});
}

export function updateMoraleBar(
	forceId: string,
): void {
	const targetDisplay = forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay) return;

	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	updateStylizedBar(targetDisplay.moraleBar, force.morale, force.maxMorale);

	const shieldText = force.shield > 0 ? `(${force.shield})` : '';
	targetDisplay.moraleBar.label.setText(`${force.morale}${shieldText}`);
}

export function updateShieldBar(
	forceId: string,
	currentShield: number,
	maxShield: number,
): void {
	const targetDisplay = forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay) return;

	// Hide the bar only if maxShield is 0 (no shield) - shield can be 0 and still show empty bar
	if (maxShield === 0) {
		targetDisplay.shieldBar.container.setVisible(false);
		return;
	}

	// Show the bar (even if shield is 0, it shows as empty)
	targetDisplay.shieldBar.container.setVisible(true);

	updateStylizedBar(targetDisplay.shieldBar, currentShield, maxShield);
}

export function destroy(): void {
	if (scene) {
		scene.events.off(GameEvents.MORALE_UPDATED, handleMoraleUpdated);
		scene.events.off(GameEvents.SHIELD_UPDATED, handleShieldUpdated);
		scene = null;
	}
	if (playerDisplay) {
		playerDisplay.moraleBar.container.destroy();
		playerDisplay.shieldBar.container.destroy();
		playerDisplay = null;
	}
	if (cpuDisplay) {
		cpuDisplay.moraleBar.container.destroy();
		cpuDisplay.shieldBar.container.destroy();
		cpuDisplay = null;
	}

	// Reset previous values
	previousPlayerMorale = null;
	previousCpuMorale = null;
	previousPlayerShield = null;
	previousCpuShield = null;
}
