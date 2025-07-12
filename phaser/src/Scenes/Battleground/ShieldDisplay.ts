import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { GameEvents } from '../../constants/events';

const BAR_HEIGHT = 20;
const BORDER_THICKNESS = 2;

// This type represents the components of a single shield bar
type ShieldBar = {
	container: Phaser.GameObjects.Container;
	backgroundBar: Phaser.GameObjects.Graphics;
	foregroundBar: Phaser.GameObjects.Graphics;
	barFill: Phaser.GameObjects.Graphics;
	label: Phaser.GameObjects.Text;
}

// Module-level variables to hold the two bars
let playerShieldBar: ShieldBar | null = null;
let cpuShieldBar: ShieldBar | null = null;
let scene: Phaser.Scene | null = null;

/**
 * Handles the SHIELD_UPDATED event by calling the bar update function.
 * @param payload The event payload with forceId, newShield, and maxShield.
 */
function handleShieldUpdated(payload: { forceId: string, newShield: number, maxShield: number }) {
	updateShieldBar(payload.forceId, payload.newShield, payload.maxShield);
}

function create(
	scene: Phaser.Scene,
	y: number,
	forceId: string,
	labelText: string,
): ShieldBar {
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
	const foregroundBar = scene.add.graphics(); // Green for player, Orange for CPU
	const barColor = forceId === c.FORCE_ID_PLAYER ? c.PLAYER_SHIELD_BAR_COLOR : c.CPU_SHIELD_BAR_COLOR;
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

	// Position shield bars on the right side with different vertical positions (above morale bars)
	const centerY = scene.scale.height / 2;
	const playerBarY = centerY + 10; // Player shield bar lower (but still above player morale bar)
	playerShieldBar = create(sceneRef, playerBarY, c.FORCE_ID_PLAYER, "Player Shield");

	const cpuBarY = centerY - 50; // Enemy shield bar higher (above enemy morale bar)
	cpuShieldBar = create(sceneRef, cpuBarY, c.FORCE_ID_CPU, "Enemy Shield");

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

export function updateShieldBar(
	forceId: string,
	currentShield: number,
	maxShield: number,
): void {
	const targetBar = forceId === c.FORCE_ID_PLAYER ? playerShieldBar : cpuShieldBar;
	if (!targetBar) return;

	// Hide the bar only if maxShield is 0 (no morale) - shield can be 0 and still show empty bar
	if (maxShield === 0) {
		targetBar.container.setVisible(false);
		return;
	}

	// Show the bar (even if shield is 0, it shows as empty)
	targetBar.container.setVisible(true);

	// Calculate percentage, but cap visual display at 100% (bar shows "full" when shield >= morale)
	const percentage = Math.min(1.0, Math.max(0, currentShield) / maxShield);
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
}
