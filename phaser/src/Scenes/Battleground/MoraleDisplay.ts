import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { GameEvents } from '../../constants/events';

const BAR_HEIGHT = 32;
const INNER_PADDING = 3;

// This type represents the components of a single morale bar
type MoraleBar = {
	container: Phaser.GameObjects.Container;
	outerBorder: Phaser.GameObjects.Graphics;
	backgroundBar: Phaser.GameObjects.Graphics;
	foregroundBar: Phaser.GameObjects.Graphics;
	barFill: Phaser.GameObjects.Graphics;
	innerHighlight: Phaser.GameObjects.Graphics;
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
 * @param payload The event payload with forceId, newMorale, maxMorale, and optional totalDamage.
 */
function handleMoraleUpdated(payload: { forceId: string, newMorale: number, maxMorale: number, totalDamage?: number }) {
	updateMoraleBar(payload.forceId, payload.newMorale, payload.maxMorale);

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
	labelText: string,
): MoraleBar {
	const barWidth = scene.scale.width / 4;
	// Position both bars on the right side of the screen
	const xPosition = scene.scale.width - barWidth - 20; // Right side with padding

	const container = scene.add.container(xPosition, y);

	// Outer border (dark)
	const outerBorder = scene.add.graphics();
	outerBorder.fillStyle(0x2a2a2a, 1);
	outerBorder.fillRoundedRect(0, 0, barWidth, BAR_HEIGHT, 6);
	container.add(outerBorder);

	// Inner background (transparent black)
	const backgroundBar = scene.add.graphics();
	backgroundBar.fillStyle(0x000000, 0.6);
	backgroundBar.fillRoundedRect(INNER_PADDING, INNER_PADDING, barWidth - (INNER_PADDING * 2), BAR_HEIGHT - (INNER_PADDING * 2), 3);
	container.add(backgroundBar);

	// Foreground bar (the fill color - this will be animated to show current percentage)
	const foregroundBar = scene.add.graphics();
	const barColor = forceId === c.FORCE_ID_PLAYER ? 0x4CAF50 : 0xF44336; // Bright green for player, red for CPU
	foregroundBar.fillStyle(barColor, 1);
	foregroundBar.fillRoundedRect(INNER_PADDING, INNER_PADDING, barWidth - (INNER_PADDING * 2), BAR_HEIGHT - (INNER_PADDING * 2), 3);
	container.add(foregroundBar);

	// We'll use the foregroundBar itself for animation, no need for a separate barFill
	const barFill = foregroundBar; // Just reference the same object

	// Inner highlight (subtle top highlight) - should scale with the bar
	const innerHighlight = scene.add.graphics();
	innerHighlight.fillStyle(0xffffff, 0.3);
	innerHighlight.fillRoundedRect(INNER_PADDING + 1, INNER_PADDING + 1, barWidth - (INNER_PADDING * 2) - 2, (BAR_HEIGHT - (INNER_PADDING * 2)) / 3, 2);
	container.add(innerHighlight);

	// Label with stroke for better readability
	const label = scene.add.text(
		barWidth / 2, BAR_HEIGHT / 2,
		labelText, {
		...c.defaultTextConfig,
		fontSize: '14px',
		fontStyle: 'bold',
		color: '#ffffff',
		stroke: '#000000',
		strokeThickness: 3
	}
	).setOrigin(0.5);
	container.add(label);

	container.setVisible(false); // Initially hidden

	return {
		container,
		outerBorder,
		backgroundBar,
		foregroundBar,
		barFill,
		innerHighlight,
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
	// Animate both the bar and highlight's horizontal scale
	targetBar.barFill.scene.tweens.add(
		{
			targets: [targetBar.barFill, targetBar.innerHighlight],
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
