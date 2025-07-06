import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { GameEvents } from '../../constants/events';

// This type represents the components of a single modifiers display
type ModifiersDisplay = {
	container: Phaser.GameObjects.Container;
	background: Phaser.GameObjects.Graphics;
	atkText: Phaser.GameObjects.Text;
	defText: Phaser.GameObjects.Text;
	healText: Phaser.GameObjects.Text;
	atkValue: Phaser.GameObjects.Text;
	defValue: Phaser.GameObjects.Text;
	healValue: Phaser.GameObjects.Text;
}

// Module-level variables to hold the two displays
let playerModifiersDisplay: ModifiersDisplay | null = null;
let cpuModifiersDisplay: ModifiersDisplay | null = null;
let scene: Phaser.Scene | null = null;

// Track current modifier values for each force
let playerModifiers = { atk: 0, def: 0, heal: 0 };
let cpuModifiers = { atk: 0, def: 0, heal: 0 };

/**
 * Handles the MODIFIERS_UPDATED event by calling the display update function.
 * @param payload The event payload with forceId, atkMod, defMod, and healMod.
 */
function handleModifiersUpdated(payload: { forceId: string, atkMod: number, defMod: number, healMod: number }) {
	setModifierValues(payload.forceId, payload.atkMod, payload.defMod, payload.healMod);
}

/**
 * Handles individual modifier change events
 */
function handleAttackChanged(payload: { forceId: string, newValue: number }) {
	const current = getModifiers(payload.forceId);
	setModifierValues(payload.forceId, payload.newValue, current.def, current.heal);
}

function handleDefenseChanged(payload: { forceId: string, newValue: number }) {
	const current = getModifiers(payload.forceId);
	setModifierValues(payload.forceId, current.atk, payload.newValue, current.heal);
}

function handleHealChanged(payload: { forceId: string, newValue: number }) {
	const current = getModifiers(payload.forceId);
	setModifierValues(payload.forceId, current.atk, current.def, payload.newValue);
}

/**
 * Handles delta modifier change events (relative changes)
 */
function handleAttackDelta(payload: { forceId: string, delta: number }) {
	const current = getModifiers(payload.forceId);
	setModifierValues(payload.forceId, current.atk + payload.delta, current.def, current.heal);
}

function handleDefenseDelta(payload: { forceId: string, delta: number }) {
	const current = getModifiers(payload.forceId);
	setModifierValues(payload.forceId, current.atk, current.def + payload.delta, current.heal);
}

function handleHealDelta(payload: { forceId: string, delta: number }) {
	const current = getModifiers(payload.forceId);
	setModifierValues(payload.forceId, current.atk, current.def, current.heal + payload.delta);
}

/**
 * Handles reset all modifiers event
 */
function handleResetAll(payload: { forceId: string }) {
	setModifierValues(payload.forceId, 0, 0, 0);
}

/**
 * Helper function to get current modifiers for a force
 */
function getModifiers(forceId: string): { atk: number, def: number, heal: number } {
	return forceId === c.FORCE_ID_PLAYER ? playerModifiers : cpuModifiers;
}

/**
 * Helper function to set modifier values and update the display
 */
function setModifierValues(forceId: string, atkMod: number, defMod: number, healMod: number): void {
	// Update internal state
	if (forceId === c.FORCE_ID_PLAYER) {
		playerModifiers = { atk: atkMod, def: defMod, heal: healMod };
	} else {
		cpuModifiers = { atk: atkMod, def: defMod, heal: healMod };
	}

	// Update the display
	updateModifiersDisplay(forceId, atkMod, defMod, healMod);
}

function create(
	scene: Phaser.Scene,
	x: number,
	y: number,
	forceId: string,
): ModifiersDisplay {
	const displayWidth = 360;
	const displayHeight = 240;
	const padding = 24;
	const lineHeight = 54;

	const container = scene.add.container(x, y);

	// Background
	const background = scene.add.graphics();
	background.fillStyle(0x000000, 0.7);
	background.lineStyle(2, 0xffffff, 0.5);
	background.fillRoundedRect(0, 0, displayWidth, displayHeight, 4);
	background.strokeRoundedRect(0, 0, displayWidth, displayHeight, 4);
	container.add(background);

	// Text configuration for labels
	const labelConfig = {
		...c.defaultTextConfig,
		fontSize: '42px',
		color: '#ffffff'
	};

	// Text configuration for values
	const valueConfig = {
		...c.defaultTextConfig,
		fontSize: '42px',
		color: forceId === c.FORCE_ID_PLAYER ? '#00ff00' : '#ff4444'
	};

	// Create text elements
	const atkText = scene.add.text(padding, padding, 'Atk:', labelConfig);
	const atkValue = scene.add.text(padding + 105, padding, '+0', valueConfig);

	const defText = scene.add.text(padding, padding + lineHeight, 'Def:', labelConfig);
	const defValue = scene.add.text(padding + 105, padding + lineHeight, '+0', valueConfig);

	const healText = scene.add.text(padding, padding + lineHeight * 2, 'Heal:', labelConfig);
	const healValue = scene.add.text(padding + 120, padding + lineHeight * 2, '+0', valueConfig);

	container.add([atkText, atkValue, defText, defValue, healText, healValue]);
	container.setVisible(false); // Initially hidden

	return {
		container,
		background,
		atkText,
		defText,
		healText,
		atkValue,
		defValue,
		healValue,
	}
}

export function init(sceneRef: Phaser.Scene): void {
	// Clean up existing displays if re-initializing
	destroy();

	scene = sceneRef;

	// Position player display in bottom-left corner
	const playerDisplayX = 20;
	const playerDisplayY = c.SCREEN_HEIGHT - 260;
	playerModifiersDisplay = create(sceneRef, playerDisplayX, playerDisplayY, c.FORCE_ID_PLAYER);

	// Position CPU display in top-right corner
	const cpuDisplayX = c.SCREEN_WIDTH - 380;
	const cpuDisplayY = 20;
	cpuModifiersDisplay = create(sceneRef, cpuDisplayX, cpuDisplayY, c.FORCE_ID_CPU);

	// Listen for modifier updates
	scene.events.on(GameEvents.MODIFIERS_UPDATED, handleModifiersUpdated);
	scene.events.on(GameEvents.MODIFIER_ATTACK_CHANGED, handleAttackChanged);
	scene.events.on(GameEvents.MODIFIER_DEFENSE_CHANGED, handleDefenseChanged);
	scene.events.on(GameEvents.MODIFIER_HEAL_CHANGED, handleHealChanged);
	scene.events.on(GameEvents.MODIFIER_DELTA_ATTACK, handleAttackDelta);
	scene.events.on(GameEvents.MODIFIER_DELTA_DEFENSE, handleDefenseDelta);
	scene.events.on(GameEvents.MODIFIER_DELTA_HEAL, handleHealDelta);
	scene.events.on(GameEvents.MODIFIER_RESET_ALL, handleResetAll);
}

export function showDisplays(): void {
	if (playerModifiersDisplay) playerModifiersDisplay.container.setVisible(true);
	if (cpuModifiersDisplay) cpuModifiersDisplay.container.setVisible(true);
}

export function hideDisplays(): void {
	if (playerModifiersDisplay) playerModifiersDisplay.container.setVisible(false);
	if (cpuModifiersDisplay) cpuModifiersDisplay.container.setVisible(false);
}

export function updateModifiersDisplay(
	forceId: string,
	atkMod: number,
	defMod: number,
	healMod: number,
): void {
	const targetDisplay = forceId === c.FORCE_ID_PLAYER ? playerModifiersDisplay : cpuModifiersDisplay;
	if (!targetDisplay) return;

	// Format modifier values with + or - prefix
	const formatMod = (value: number): string => {
		return value >= 0 ? `+${value}` : `${value}`;
	};

	// Update text values with animation
	animateValueChange(targetDisplay.atkValue, formatMod(atkMod));
	animateValueChange(targetDisplay.defValue, formatMod(defMod));
	animateValueChange(targetDisplay.healValue, formatMod(healMod));
}

function animateValueChange(textObject: Phaser.GameObjects.Text, newValue: string): void {
	// Scale down, change text, then scale back up
	textObject.scene.tweens.add({
		targets: textObject,
		scaleX: 0.8,
		scaleY: 0.8,
		duration: 100,
		yoyo: true,
		onComplete: () => {
			textObject.setText(newValue);
		}
	});
}

export function destroy(): void {
	if (scene) {
		scene.events.off(GameEvents.MODIFIERS_UPDATED, handleModifiersUpdated);
		scene.events.off(GameEvents.MODIFIER_ATTACK_CHANGED, handleAttackChanged);
		scene.events.off(GameEvents.MODIFIER_DEFENSE_CHANGED, handleDefenseChanged);
		scene.events.off(GameEvents.MODIFIER_HEAL_CHANGED, handleHealChanged);
		scene.events.off(GameEvents.MODIFIER_DELTA_ATTACK, handleAttackDelta);
		scene.events.off(GameEvents.MODIFIER_DELTA_DEFENSE, handleDefenseDelta);
		scene.events.off(GameEvents.MODIFIER_DELTA_HEAL, handleHealDelta);
		scene.events.off(GameEvents.MODIFIER_RESET_ALL, handleResetAll);
		scene = null;
	}
	if (playerModifiersDisplay) {
		playerModifiersDisplay.container.destroy();
		playerModifiersDisplay = null;
	}
	if (cpuModifiersDisplay) {
		cpuModifiersDisplay.container.destroy();
		cpuModifiersDisplay = null;
	}
	// Reset modifier values
	playerModifiers = { atk: 0, def: 0, heal: 0 };
	cpuModifiers = { atk: 0, def: 0, heal: 0 };
}

/**
 * Public API functions for other parts of the game to query current modifier values
 */
export function getCurrentModifiers(forceId: string): { atk: number, def: number, heal: number } {
	return getModifiers(forceId);
}

export function getPlayerModifiers(): { atk: number, def: number, heal: number } {
	return { ...playerModifiers };
}

export function getCpuModifiers(): { atk: number, def: number, heal: number } {
	return { ...cpuModifiers };
}
