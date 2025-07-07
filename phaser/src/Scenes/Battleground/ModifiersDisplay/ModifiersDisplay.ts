import Phaser from 'phaser';
import * as c from '../../../constants/constants';
import { GameEvents } from '../../../constants/events';
import {
	createInitialStates,
	processModifierEvent,
	formatModifierValue,
	createDisplayConfig,
	calculateTextPositions,
	type ModifierStates,
	type ModifierEvent
} from './ModifiersDisplay.pure';

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

// Track current modifier values using pure state
let modifierStates: ModifierStates = createInitialStates();

/**
 * Generic event handler that processes all modifier events using pure functions
 */
function handleModifierEvent(event: ModifierEvent): void {
	const result = processModifierEvent(modifierStates, event);
	modifierStates = result.newStates;

	if (result.displayUpdate) {
		updateModifiersDisplay(
			result.displayUpdate.forceId,
			result.displayUpdate.atkMod,
			result.displayUpdate.defMod,
			result.displayUpdate.healMod,
			result.displayUpdate.changedFields
		);
	}
}

/**
 * Handles the MODIFIERS_UPDATED event
 */
function handleModifiersUpdated(payload: { forceId: string, atkMod: number, defMod: number, healMod: number }) {
	handleModifierEvent({
		type: 'MODIFIERS_UPDATED',
		forceId: payload.forceId,
		atkMod: payload.atkMod,
		defMod: payload.defMod,
		healMod: payload.healMod
	});
}

/**
 * Handles individual modifier change events
 */
function handleAttackChanged(payload: { forceId: string, newValue: number }) {
	handleModifierEvent({
		type: 'MODIFIER_ATTACK_CHANGED',
		forceId: payload.forceId,
		newValue: payload.newValue
	});
}

function handleDefenseChanged(payload: { forceId: string, newValue: number }) {
	handleModifierEvent({
		type: 'MODIFIER_DEFENSE_CHANGED',
		forceId: payload.forceId,
		newValue: payload.newValue
	});
}

function handleHealChanged(payload: { forceId: string, newValue: number }) {
	handleModifierEvent({
		type: 'MODIFIER_HEAL_CHANGED',
		forceId: payload.forceId,
		newValue: payload.newValue
	});
}

/**
 * Handles delta modifier change events
 */
function handleAttackDelta(payload: { forceId: string, delta: number }) {
	handleModifierEvent({
		type: 'MODIFIER_DELTA_ATTACK',
		forceId: payload.forceId,
		delta: payload.delta
	});
}

function handleDefenseDelta(payload: { forceId: string, delta: number }) {
	handleModifierEvent({
		type: 'MODIFIER_DELTA_DEFENSE',
		forceId: payload.forceId,
		delta: payload.delta
	});
}

function handleHealDelta(payload: { forceId: string, delta: number }) {
	handleModifierEvent({
		type: 'MODIFIER_DELTA_HEAL',
		forceId: payload.forceId,
		delta: payload.delta
	});
}

/**
 * Handles reset all modifiers event
 */
function handleResetAll(payload: { forceId: string }) {
	handleModifierEvent({
		type: 'MODIFIER_RESET_ALL',
		forceId: payload.forceId
	});
}

function create(
	scene: Phaser.Scene,
	x: number,
	y: number,
	forceId: string,
): ModifiersDisplay {
	const config = createDisplayConfig(forceId);
	const positions = calculateTextPositions(config);
	const { width, height } = config.dimensions;

	const container = scene.add.container(x, y);

	// Background
	const background = scene.add.graphics();
	background.fillStyle(config.colors.background, 0.7);
	background.lineStyle(2, config.colors.border, 0.5);
	background.fillRoundedRect(0, 0, width, height, 4);
	background.strokeRoundedRect(0, 0, width, height, 4);
	container.add(background);

	// Text configuration for labels
	const labelConfig = {
		...c.defaultTextConfig,
		fontSize: '42px',
		color: config.colors.label
	};

	// Text configuration for values
	const valueConfig = {
		...c.defaultTextConfig,
		fontSize: '42px',
		color: config.colors.value,
	};

	// Create text elements using calculated positions
	const atkText = scene.add.text(positions.atkLabel.x, positions.atkLabel.y, 'Atk:', labelConfig).setOrigin(0.5);
	const atkValue = scene.add.text(positions.atkValue.x, positions.atkValue.y, '+0', valueConfig).setOrigin(0.5);

	const defText = scene.add.text(positions.defLabel.x, positions.defLabel.y, 'Def:', labelConfig).setOrigin(0.5);
	const defValue = scene.add.text(positions.defValue.x, positions.defValue.y, '+0', valueConfig).setOrigin(0.5);

	const healText = scene.add.text(positions.healLabel.x, positions.healLabel.y, 'Heal:', labelConfig).setOrigin(0.5);
	const healValue = scene.add.text(positions.healValue.x, positions.healValue.y, '+0', valueConfig).setOrigin(0.5);

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

	// Create displays using pure configuration functions
	const playerConfig = createDisplayConfig(c.FORCE_ID_PLAYER);
	const cpuConfig = createDisplayConfig(c.FORCE_ID_CPU);

	playerModifiersDisplay = create(sceneRef, playerConfig.position.x, playerConfig.position.y, c.FORCE_ID_PLAYER);
	cpuModifiersDisplay = create(sceneRef, cpuConfig.position.x, cpuConfig.position.y, c.FORCE_ID_CPU);

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
	changedFields?: { atk?: boolean, def?: boolean, heal?: boolean }
): void {
	const targetDisplay = forceId === c.FORCE_ID_PLAYER ? playerModifiersDisplay : cpuModifiersDisplay;
	if (!targetDisplay) return;

	// If no specific fields are marked as changed, animate all (for backward compatibility)
	if (!changedFields) {
		animateValueChange(targetDisplay.atkValue, formatModifierValue(atkMod));
		animateValueChange(targetDisplay.defValue, formatModifierValue(defMod));
		animateValueChange(targetDisplay.healValue, formatModifierValue(healMod));
	} else {
		// Only animate the fields that actually changed
		if (changedFields.atk) {
			animateValueChange(targetDisplay.atkValue, formatModifierValue(atkMod));
		} else {
			targetDisplay.atkValue.setText(formatModifierValue(atkMod));
		}

		if (changedFields.def) {
			animateValueChange(targetDisplay.defValue, formatModifierValue(defMod));
		} else {
			targetDisplay.defValue.setText(formatModifierValue(defMod));
		}

		if (changedFields.heal) {
			animateValueChange(targetDisplay.healValue, formatModifierValue(healMod));
		} else {
			targetDisplay.healValue.setText(formatModifierValue(healMod));
		}
	}
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
	// Reset modifier values using pure functions
	modifierStates = createInitialStates();
}

/**
 * Public API functions for other parts of the game to query current modifier values
 */
export function getCurrentModifiers(forceId: string): { atk: number, def: number, heal: number } {
	return forceId === c.FORCE_ID_PLAYER ? modifierStates.player : modifierStates.cpu;
}

export function getPlayerModifiers(): { atk: number, def: number, heal: number } {
	return { ...modifierStates.player };
}

export function getCpuModifiers(): { atk: number, def: number, heal: number } {
	return { ...modifierStates.cpu };
}
