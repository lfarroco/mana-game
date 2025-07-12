import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { GameEvents } from '../../constants/events';

const BAR_HEIGHT = 20;
const BORDER_THICKNESS = 2;

// This type represents the components of a single morale bar
type MoraleBar = {
	container: Phaser.GameObjects.Container;
	backgroundBar: Phaser.GameObjects.Graphics;
	foregroundBar: Phaser.GameObjects.Graphics;
	barFill: Phaser.GameObjects.Graphics;
	label: Phaser.GameObjects.Text;
}

// Module-level variables to hold the two bars
let playerMoraleBar: MoraleBar | null = null;
let cpuMoraleBar: MoraleBar | null = null;
let scene: Phaser.Scene | null = null;

// Track previous morale values to calculate deltas
let previousPlayerMorale: number | null = null;
let previousCpuMorale: number | null = null;

/**
 * Handles the MORALE_UPDATED event by calling the bar update function.
 * @param payload The event payload with forceId, newMorale, and maxMorale.
 */
function handleMoraleUpdated(payload: { forceId: string, newMorale: number, maxMorale: number }) {
	updateMoraleBar(payload.forceId, payload.newMorale, payload.maxMorale);

	// Calculate morale delta and show pop text
	const targetBar = payload.forceId === c.FORCE_ID_PLAYER ? playerMoraleBar : cpuMoraleBar;
	if (!targetBar || !scene) return;

	// Get previous morale value
	const isPlayer = payload.forceId === c.FORCE_ID_PLAYER;
	const previousMorale = isPlayer ? previousPlayerMorale : previousCpuMorale;

	// Calculate delta if we have a previous value
	if (previousMorale !== null) {
		const delta = payload.newMorale - previousMorale;

		if (delta !== 0) {
			// Calculate position at the center of the morale bar
			const popTextX = targetBar.container.x + (scene.scale.width / 4) / 2;
			const popTextY = targetBar.container.y;

			const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
			const textType = delta > 0 ? "heal" : "damage"; // Green for positive, red for negative

			scene.events.emit(GameEvents.POP_TEXT_SHOW, {
				text: deltaText,
				x: popTextX,
				y: popTextY,
				type: textType,
			});
		}
	}

	// Update the stored previous value
	if (isPlayer) {
		previousPlayerMorale = payload.newMorale;
	} else {
		previousCpuMorale = payload.newMorale;
	}
}

function create(
	scene: Phaser.Scene,
	y: number,
	forceId: string,
	labelText: string,
): MoraleBar {
	const barWidth = scene.scale.width / 4;
	// Position both bars on the right side of the screen
	const xPosition = scene.scale.width - barWidth - 20; // Right side with padding

	const container = scene.add.container(xPosition, y);
	// Background
	const backgroundBar = scene.add.graphics();
	backgroundBar.fillStyle(0x000000, 0.5);
	backgroundBar.fillRect(0, 0, barWidth, BAR_HEIGHT);
	backgroundBar.lineStyle(BORDER_THICKNESS, 0xffffff, 0.8);
	backgroundBar.strokeRect(0, 0, barWidth, BAR_HEIGHT);
	container.add(backgroundBar);

	// Foreground
	const foregroundBar = scene.add.graphics(); // Blue for player, Red for CPU
	const barColor = forceId === c.FORCE_ID_PLAYER ? c.PLAYER_MORALE_BAR_COLOR : c.CPU_MORALE_BAR_COLOR;
	foregroundBar.fillStyle(barColor, 1);
	foregroundBar.fillRect(0, 0, barWidth, BAR_HEIGHT);
	container.add(foregroundBar);

	// Shape to "fill" of the foreground bar
	const barFill = scene.add.graphics();
	barFill.fillStyle(0xffffff);
	barFill.fillRect(0, 0, barWidth, BAR_HEIGHT);
	container.add(barFill);

	// Label
	const label = scene.add.text(
		barWidth / 2, BAR_HEIGHT / 2,
		labelText, c.defaultTextConfig
	).setOrigin(0.5);
	container.add(label);

	container.setVisible(false); // Initially hidden

	return {
		container,
		backgroundBar,
		foregroundBar,
		barFill,
		label,
	}
}

export function init(sceneRef: Phaser.Scene): void {
	// Clean up existing bars if re-initializing
	destroy();

	scene = sceneRef;

	// Position bars on the right side with different vertical positions
	const centerY = scene.scale.height / 2;
	const playerBarY = centerY + 30; // Player bar lower (below center)
	playerMoraleBar = create(sceneRef, playerBarY, c.FORCE_ID_PLAYER, "Player Morale");

	const cpuBarY = centerY - 30; // Enemy bar higher (above center)
	cpuMoraleBar = create(sceneRef, cpuBarY, c.FORCE_ID_CPU, "Enemy Morale");

	scene.events.on(GameEvents.MORALE_UPDATED, handleMoraleUpdated);
}

export function showBars(): void {
	if (playerMoraleBar) playerMoraleBar.container.setVisible(true);
	if (cpuMoraleBar) cpuMoraleBar.container.setVisible(true);
}

export function hideBars(): void {
	if (playerMoraleBar) playerMoraleBar.container.setVisible(false);
	if (cpuMoraleBar) cpuMoraleBar.container.setVisible(false);
}

export function updateMoraleBar(
	forceId: string,
	currentMorale: number,
	maxMorale: number,
): void {
	const targetBar = forceId === c.FORCE_ID_PLAYER ? playerMoraleBar : cpuMoraleBar;
	if (!targetBar) return;

	const percentage = Math.max(0, currentMorale) / maxMorale;
	// Animate the mask's horizontal scale to reveal the bar
	targetBar.barFill.scene.tweens.add(
		{
			targets: targetBar.barFill,
			scaleX: percentage,
			duration: 200,
		}
	);
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
