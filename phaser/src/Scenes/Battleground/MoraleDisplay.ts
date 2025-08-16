import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { StylizedBar, createStylizedBar, updateStylizedBar } from './StylizedBar';
import { tween } from '../../Utils/animation';
import { cpuForce, playerForce } from '../../Models/Entities/Force';
import { popText } from '../../Systems/Chara/Animations/popText';

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

/**
 * Returns the position of the current tip of the morale bar for a given forceId.
 * The tip position represents where the morale bar currently ends based on current morale percentage.
 * @param forceId Player or CPU force id
 * @returns { x: number, y: number } or null if not available
 */
export function getMoraleBarTipPosition(forceId: string): { x: number, y: number } | null {
	const barPosition = getMoraleBarPosition(forceId);
	if (!barPosition) return null;

	// Get the force to calculate current morale percentage
	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	const moralePercentage = Math.max(0, force.morale) / force.maxMorale;

	// Calculate the tip position: bars are vertical and fill from bottom
	// Y position = bar top + (1 - percentage) * bar height
	const tipY = barPosition.y + (1 - moralePercentage) * MORALE_BAR_HEIGHT;

	return {
		x: barPosition.x + MORALE_BAR_WIDTH / 2, // Center of the bar horizontally
		y: tipY
	};
}

/**
 * Returns the position of the shield bar for a given forceId.
 * @param forceId Player or CPU force id
 * @returns { x: number, y: number } or null if not available
 */
export function getShieldBarPosition(forceId: string): { x: number, y: number } | null {
	if (forceId === c.FORCE_ID_PLAYER && playerDisplay) {
		return {
			x: playerDisplay.shieldBar.container.x,
			y: playerDisplay.shieldBar.container.y
		};
	} else if (forceId === c.FORCE_ID_CPU && cpuDisplay) {
		return {
			x: cpuDisplay.shieldBar.container.x,
			y: cpuDisplay.shieldBar.container.y
		};
	}
	return null;
}

/**
 * Returns the position of the current tip of the shield bar for a given forceId.
 * The tip position represents where the shield bar currently ends based on current shield percentage.
 * @param forceId Player or CPU force id
 * @returns { x: number, y: number } or null if not available
 */
export function getShieldBarTipPosition(forceId: string): { x: number, y: number } | null {
	const barPosition = getShieldBarPosition(forceId);
	if (!barPosition) return null;

	// Get the force to calculate current shield percentage
	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	// Shield uses maxMorale as the scale for display, but cap at 100% visually
	const shieldPercentage = Math.min(1.0, Math.max(0, force.shield) / force.maxMorale);

	// Calculate the tip position: bars are vertical and fill from bottom
	// Y position = bar top + (1 - percentage) * bar height
	const tipY = barPosition.y + (1 - shieldPercentage) * MORALE_BAR_HEIGHT;

	return {
		x: barPosition.x + MORALE_BAR_WIDTH / 2, // Center of the bar horizontally
		y: tipY
	};
}// Track previous values to calculate deltas
let previousPlayerMorale: number | null = null;
let previousCpuMorale: number | null = null;
let previousPlayerShield: number | null = null;
let previousCpuShield: number | null = null;

/**
 * Handles the MORALE_UPDATED event by calling the bar update function.
 * @param payload The event payload with forceId, newMorale, maxMorale, optional totalDamage, and optional damageType.
 */
export function updateMoraleDisplay(payload: { forceId: string, newMorale: number, maxMorale: number, totalDamage?: number, damageType?: "poison" | "normal" | "timeout" }) {
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
		// Calculate random position over the morale bar area (vertical bar)
		const barHeight = MORALE_BAR_HEIGHT;
		const randomOffsetY = Math.random() * barHeight; // Random position along bar height
		const randomOffsetX = (Math.random() - 0.5) * 60; // Random horizontal offset (-30 to +30 pixels)

		const popTextX = targetDisplay.moraleBar.container.x + randomOffsetX;
		const popTextY = targetDisplay.moraleBar.container.y + randomOffsetY;

		const deltaText = displayValue > 0 ? `+${displayValue}` : `${displayValue}`;

		// Determine text type based on damage type and value
		let textType: "heal" | "damage" | "poison" | "timeout";
		if (displayValue > 0) {
			textType = "heal"; // Green for positive (healing)
		} else if (payload.damageType === "poison") {
			textType = "poison"; // Purple for poison damage
		} else if (payload.damageType === "timeout") {
			textType = "timeout"; // Orange for timeout damage
		} else {
			textType = "damage"; // Red for normal damage
		}

		const textDirection = isPlayer ? "left" : "right"; // Player text flows left, enemy text flows right

		popText({
			x: popTextX,
			y: popTextY,
			text: deltaText,
			type: textType,
			direction: textDirection
		})

	}
}

/**
 * Handles the SHIELD_UPDATED event by calling the bar update function.
 * @param payload The event payload with forceId, newShield, maxShield, and optional suppressPopText.
 */
export function handleShieldUpdated(payload: {
	forceId: string,
	newShield: number,
	maxShield: number,
	suppressPopText?: boolean,
	totalDamage?: number,
	damageType?: "poison" | "normal" | "timeout"
}) {
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

	// Use totalDamage if provided (for damage that only affects shield)
	// Otherwise calculate delta as usual
	let displayValue: number;
	if (payload.totalDamage !== undefined && payload.totalDamage > 0) {
		displayValue = -payload.totalDamage; // Show total damage as negative
	} else if (previousShield !== null) {
		const delta = payload.newShield - previousShield;
		displayValue = delta; // Normal delta calculation
	} else {
		displayValue = 0; // No previous value to compare
	}

	// Show pop text if there's a meaningful change
	if (displayValue !== 0) {
		// Calculate random position over the shield bar area (vertical bar)
		const barHeight = MORALE_BAR_HEIGHT;
		const randomOffsetY = Math.random() * barHeight; // Random position along bar height
		const randomOffsetX = (Math.random() - 0.5) * 60; // Random horizontal offset (-30 to +30 pixels)

		const popTextX = targetDisplay.shieldBar.container.x + randomOffsetX;
		const popTextY = targetDisplay.shieldBar.container.y + randomOffsetY;

		const deltaText = displayValue > 0 ? `+${displayValue}` : `${displayValue}`;

		// Determine text type based on damage type and value
		let textType: "heal" | "damage" | "poison" | "shield" | "timeout";
		if (displayValue > 0) {
			textType = "shield"; // Yellow for positive shield gain
		} else if (payload.damageType === "poison") {
			textType = "poison"; // Purple for poison damage (though this shouldn't happen for shields)
		} else if (payload.damageType === "timeout") {
			textType = "timeout"; // Orange for timeout damage
		} else {
			textType = "damage"; // Red for damage absorbed by shield
		}

		const textDirection = isPlayer ? "left" : "right";

		popText({
			x: popTextX,
			y: popTextY,
			text: deltaText,
			type: textType,
			direction: textDirection
		})
	}

	// Update the stored previous value
	if (isPlayer) {
		previousPlayerShield = payload.newShield;
	} else {
		previousCpuShield = payload.newShield;
	}
}

export const MORALE_BAR_WIDTH = 25; // Much thinner for vertical bars (like letter "I")
export const MORALE_BAR_HEIGHT = c.TILE_HEIGHT * 4; // Taller height for vertical bars

function createCombinedDisplay(
	scene: Phaser.Scene,
	forceId: string,
): CombinedDisplay {
	// Position bars in the middle of the screen, close to each team's board
	let x = 0, y = 0;
	if (forceId === c.FORCE_ID_PLAYER) {
		// Player bars: left side of middle screen, close to player board
		x = c.MIDDLE_SCREEN_X - 50; // 150px left of center
		y = c.MIDDLE_SCREEN_Y - MORALE_BAR_HEIGHT / 2; // Vertically centered
	} else {
		// CPU bars: right side of middle screen, close to CPU board
		x = c.MIDDLE_SCREEN_X + 50; // 150px right of center
		y = c.MIDDLE_SCREEN_Y - MORALE_BAR_HEIGHT / 2; // Vertically centered
	}

	// Create morale bar (vertical)
	const moraleBarColor = forceId === c.FORCE_ID_PLAYER ? 0x4CAF50 : 0xF44336;
	const moraleBar = createStylizedBar(scene, {
		x,
		y,
		width: MORALE_BAR_WIDTH,
		height: MORALE_BAR_HEIGHT,
		barColor: moraleBarColor,
		backgroundColor: 0x000000,
		backgroundOpacity: 0.2,
		textConfig: c.defaultTextConfig,
		orientation: 'vertical'
	});

	// Create shield bar positioned next to the morale bar
	const shieldBarColor = 0xFFD700; // Gold/Yellow color for shields
	let shieldBarX;
	if (forceId === c.FORCE_ID_PLAYER) {
		// Player shield bar: to the right of morale bar
		shieldBarX = x + MORALE_BAR_WIDTH + 5;
	} else {
		// CPU shield bar: to the left of morale bar
		shieldBarX = x - MORALE_BAR_WIDTH - 5;
	}

	const shieldBar = createStylizedBar(scene, {
		x: shieldBarX,
		y,
		width: MORALE_BAR_WIDTH,
		height: MORALE_BAR_HEIGHT,
		barColor: shieldBarColor,
		backgroundColor: 0x000000,
		backgroundOpacity: 0, // No background
		borderOpacity: 0, // No border
		textConfig: c.defaultTextConfig,
		orientation: 'vertical'
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

	// Use maxMorale as the scale so shield bar height matches morale bar height visually
	// But cap the visual at 100% even if shield exceeds maxMorale
	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	const percentage = Math.min(1.0, Math.max(0, currentShield) / force.maxMorale); // Cap at 1.0

	// Custom update that keeps shield bar within normal height bounds
	const bar = targetDisplay.shieldBar;
	const duration = 200;

	// Stop any existing tweens
	bar.barFill.scene.tweens.killTweensOf([bar.barFill, bar.innerHighlight]);

	// Get the original height from when the bar was created
	const originalHeight = (bar.container as any)._originalHeight || MORALE_BAR_HEIGHT;
	const fillHeight = originalHeight - 6; // INNER_PADDING * 2 = 6

	// Calculate the Y offset to simulate scaling from bottom
	const targetScaleY = percentage; // Capped at 1.0
	const yOffset = 3 + fillHeight * (1 - targetScaleY); // INNER_PADDING = 3

	bar.barFill.scene.tweens.add({
		targets: [bar.barFill, bar.innerHighlight],
		scaleY: targetScaleY,
		y: yOffset,
		duration: duration,
	});
}

export function destroy(): void {
	if (scene) {
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
