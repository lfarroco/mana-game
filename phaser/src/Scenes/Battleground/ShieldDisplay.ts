import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { GameEvents } from '../../constants/events';
import { StylizedBar, createStylizedBar, updateStylizedBar } from './StylizedBar';
import { tween } from '../../Utils/animation';

// This type represents the components of a single shield bar
type ShieldBar = StylizedBar;

// Module-level variables to hold the two bars
let playerShieldBar: ShieldBar | null = null;
let cpuShieldBar: ShieldBar | null = null;
let scene: Phaser.Scene | null = null;

// Track previous shield values to calculate deltas
let previousPlayerShield: number | null = null;
let previousCpuShield: number | null = null;

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
	const targetBar = payload.forceId === c.FORCE_ID_PLAYER ? playerShieldBar : cpuShieldBar;
	if (!targetBar || !scene) return;

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

			const popTextX = targetBar.container.x + randomOffsetX;
			const popTextY = targetBar.container.y + randomOffsetY;

			const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
			const textType = delta > 0 ? "shield" : "damage"; // Yellow for positive shield gain, red for negative
			const textDirection = isPlayer ? "down" : "up"; // Player text flows down, enemy text flows up

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

function create(
	scene: Phaser.Scene,
	y: number,
	_forceId: string, // Not used since shields are always yellow
): ShieldBar {
	const barWidth = scene.scale.width / 4;
	// Position both bars on the right side of the screen
	const xPosition = scene.scale.width - barWidth - 20; // Right side with padding

	// Always yellow for shields (both player and enemy)
	const barColor = 0xFFD700; // Gold/Yellow color

	const shieldBar = createStylizedBar(scene, {
		x: xPosition,
		y: y,
		width: barWidth,
		labelText: "",
		barColor: barColor,
		backgroundColor: 0x000000, // This won't be visible due to backgroundOpacity: 0
		backgroundOpacity: 0, // No background
		borderOpacity: 0, // No border
		textConfig: c.defaultTextConfig
	});

	// Make the entire shield bar semi-transparent
	shieldBar.container.setAlpha(0.5);

	return shieldBar;
}

export function init(sceneRef: Phaser.Scene): void {
	// Clean up existing bars if re-initializing
	destroy();

	scene = sceneRef;

	// Position shield bars over the morale bars (same Y positions as morale bars)
	const centerY = scene.scale.height / 2;
	const playerBarY = centerY + 50; // Same as player morale bar position
	playerShieldBar = create(sceneRef, playerBarY, c.FORCE_ID_PLAYER);

	const cpuBarY = centerY - 50; // Same as enemy morale bar position
	cpuShieldBar = create(sceneRef, cpuBarY, c.FORCE_ID_CPU);

	scene.events.on(GameEvents.SHIELD_UPDATED, handleShieldUpdated);
}

export function showBars(): void {
	if (playerShieldBar) playerShieldBar.container.setVisible(true);
	if (cpuShieldBar) cpuShieldBar.container.setVisible(true);
}

export function hideBars(): void {
	if (playerShieldBar) playerShieldBar.container.setVisible(false);
	if (cpuShieldBar) cpuShieldBar.container.setVisible(false);
}

export async function fadeOutBars(): Promise<void> {
	const bars = [playerShieldBar, cpuShieldBar].filter(bar => bar !== null);
	if (bars.length === 0) return;

	// Fade out all bars simultaneously
	await tween({
		targets: bars.map(bar => bar!.container),
		alpha: 0,
		duration: 500,
	});

	// Hide them after fading
	hideBars();

	// Reset alpha for next time
	bars.forEach(bar => {
		if (bar) bar.container.setAlpha(1);
	});
}

export function updateShieldBar(
	forceId: string,
	currentShield: number,
	maxShield: number,
): void {
	const targetBar = forceId === c.FORCE_ID_PLAYER ? playerShieldBar : cpuShieldBar;
	if (!targetBar) return;

	// Hide the bar only if maxShield is 0 (no shield) - shield can be 0 and still show empty bar
	if (maxShield === 0) {
		targetBar.container.setVisible(false);
		return;
	}

	// Show the bar (even if shield is 0, it shows as empty)
	targetBar.container.setVisible(true);

	updateStylizedBar(targetBar, currentShield, maxShield);
}

export function destroy(): void {
	if (scene) {
		scene.events.off(GameEvents.SHIELD_UPDATED, handleShieldUpdated);
		scene = null;
	}
	if (playerShieldBar) {
		playerShieldBar.container.destroy();
		playerShieldBar = null;
	}
	if (cpuShieldBar) {
		cpuShieldBar.container.destroy();
		cpuShieldBar = null;
	}

	// Reset previous shield values
	previousPlayerShield = null;
	previousCpuShield = null;
}
