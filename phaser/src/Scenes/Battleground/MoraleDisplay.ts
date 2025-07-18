import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { GameEvents } from '../../constants/events';
import { StylizedBar, createStylizedBar, updateStylizedBar } from './StylizedBar';
import { tween } from '../../Utils/animation';
import { cpuForce, playerForce } from '../../Models/Entities/Force';

// This type represents the components of a single morale bar
type MoraleBar = StylizedBar;

// Module-level variables to hold the two bars
let playerMoraleBar: MoraleBar | null = null;
let cpuMoraleBar: MoraleBar | null = null;
let scene: Phaser.Scene | null = null;

// Track previous morale values to calculate deltas
let previousPlayerMorale: number | null = null;
let previousCpuMorale: number | null = null;

/**
 * Handles the MORALE_UPDATED event by calling the bar update function.
 * @param payload The event payload with forceId, newMorale, maxMorale, and optional totalDamage.
 */
function handleMoraleUpdated(payload: { forceId: string, newMorale: number, maxMorale: number, totalDamage?: number }) {
	updateMoraleBar(payload.forceId);

	// Calculate morale delta and show pop text
	const targetBar = payload.forceId === c.FORCE_ID_PLAYER ? playerMoraleBar : cpuMoraleBar;
	if (!targetBar || !scene) return;

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

		const popTextX = targetBar.container.x + randomOffsetX;
		const popTextY = targetBar.container.y + randomOffsetY;

		const deltaText = displayValue > 0 ? `+${displayValue}` : `${displayValue}`;
		const textType = displayValue > 0 ? "heal" : "damage"; // Green for positive, red for negative
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

function create(
	scene: Phaser.Scene,
	y: number,
	forceId: string,
): MoraleBar {
	const barWidth = scene.scale.width / 4;
	// Position both bars on the right side of the screen
	const xPosition = scene.scale.width - barWidth - 120; // Right side with padding

	const barColor = forceId === c.FORCE_ID_PLAYER ? 0x4CAF50 : 0xF44336; // Bright green for player, red for CPU
	const backgroundColor = 0x000000; // Black background for morale bars

	return createStylizedBar(scene, {
		x: xPosition,
		y: y,
		width: barWidth,
		barColor: barColor,
		backgroundColor: backgroundColor,
		backgroundOpacity: 0.2, // Slightly more opaque for morale bars
		textConfig: c.defaultTextConfig
	});
}

export function init(sceneRef: Phaser.Scene): void {
	// Clean up existing bars if re-initializing
	destroy();

	scene = sceneRef;

	// Position bars on the right side with different vertical positions
	const centerY = scene.scale.height / 2;
	const playerBarY = centerY + 50; // Player bar lower (below center) - increased spacing for larger bars
	playerMoraleBar = create(sceneRef, playerBarY, c.FORCE_ID_PLAYER); // Initial value will be set on first update
	if (playerMoraleBar) playerMoraleBar.container.setVisible(true); // Always visible
	updateMoraleBar(playerForce.id); // Initialize with max morale

	const cpuBarY = centerY - 50; // Enemy bar higher (above center) - increased spacing for larger bars
	cpuMoraleBar = create(sceneRef, cpuBarY, c.FORCE_ID_CPU);

	scene.events.on(GameEvents.MORALE_UPDATED, handleMoraleUpdated);
}

export function showBars(): void {
	if (playerMoraleBar) playerMoraleBar.container.setVisible(true);
	if (cpuMoraleBar) cpuMoraleBar.container.setVisible(true);
}

export function hideBars(): void {
	// playerbar: always visible
	//if (playerMoraleBar) playerMoraleBar.container.setVisible(false);
	if (cpuMoraleBar) cpuMoraleBar.container.setVisible(false);
}

export async function fadeOutBars(): Promise<void> {
	const bars = [cpuMoraleBar].filter(bar => bar !== null);
	if (bars.length === 0) return;

	// Fade out all bars simultaneously
	await tween({
		targets: bars.map(bar => bar!.container),
		alpha: 0,
	});

	// Hide them after fading
	hideBars();

	// Reset alpha for next time
	bars.forEach(bar => {
		if (bar) bar.container.setAlpha(1);
	});
}

export function updateMoraleBar(
	forceId: string,
): void {
	const targetBar = forceId === c.FORCE_ID_PLAYER ? playerMoraleBar : cpuMoraleBar;
	if (!targetBar) return;

	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	updateStylizedBar(targetBar, force.morale, force.maxMorale);

	const shieldText = force.shield > 0 ? `(${force.shield})` : '';

	targetBar.label.setText(`${force.morale}${shieldText}`);
}

export function destroy(): void {
	if (scene) {
		scene.events.off(GameEvents.MORALE_UPDATED, handleMoraleUpdated);
		scene = null;
	}
	if (playerMoraleBar) {
		playerMoraleBar.container.destroy();
		playerMoraleBar = null;
	}
	if (cpuMoraleBar) {
		cpuMoraleBar.container.destroy();
		cpuMoraleBar = null;
	}

	// Reset previous morale values
	previousPlayerMorale = null;
	previousCpuMorale = null;
}
