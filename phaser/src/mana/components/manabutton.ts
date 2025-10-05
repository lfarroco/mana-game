/**
 * Mana Button Component
 * 
 * A reusable button component built with the Mana library.
 * Features:
 * - Rounded rectangle background
 * - Text label overlay
 * - Click handling with messages
 * - Hover effects with smooth color tween
 * 
 * The button manages its own drawing internally for optimal performance.
 * For other components, consider using the ManaMsg system (see actions.ts).
 */

import type { Element, RoundedRectangleElement, TextElement } from '../types';

// Re-export ManaMsg types and helpers for convenience
export type { ManaMsg } from '../actions';
export { handleManaMsg, redrawShape, updateElement, setFillColor, setVisible, moveTo } from '../actions';

/**
 * Helper to redraw a rounded rectangle shape
 * Used internally by the button for tween animations
 */
const redrawRoundedRect = (
	graphics: Phaser.GameObjects.Graphics,
	width: number,
	height: number,
	radius: number,
	color: number
): void => {
	graphics.clear();
	graphics.fillStyle(color, 1);
	graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
};

/**
 * Button configuration
 */
export type ButtonConfig<Msg> = {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly text: string;
	readonly textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
	readonly normalColor?: number;
	readonly hoverColor?: number;
	readonly onClick: () => readonly Msg[];
	readonly cornerRadius?: number;
};

/**
 * Button state for tracking hover and graphics reference
 */
type ButtonState = {
	isHovered: boolean;
	tween?: Phaser.Tweens.Tween;
	currentColor: number;
	isTweening: boolean;
	graphics?: Phaser.GameObjects.Graphics; // Direct reference for manual drawing
};

// Store button states
const buttonStates = new Map<string, ButtonState>();

/**
 * Create a button component
 * Returns a container with rounded rectangle background and text
 */
export const createButton = <Msg>(config: ButtonConfig<Msg>): readonly Element<Msg>[] => {
	const {
		id,
		x,
		y,
		width,
		height,
		text,
		textStyle = {
			fontSize: '16px',
			color: '#ffffff',
			fontFamily: 'Arial',
		},
		normalColor = 0x4a5568,
		hoverColor = 0x2d3748,
		onClick,
		cornerRadius = 8,
	} = config;

	// Initialize button state if it doesn't exist
	if (!buttonStates.has(id)) {
		buttonStates.set(id, {
			isHovered: false,
			tween: undefined,
			currentColor: normalColor,
			isTweening: false,
		});
	}

	const state = buttonStates.get(id)!;

	// Background graphics rect
	const background: RoundedRectangleElement<Msg> & { skipAutoUpdate?: boolean } = {
		id: `${id}-bg`,
		type: 'roundrect',
		x: 0,
		y: 0,
		width,
		height,
		radius: cornerRadius,
		fillColor: state.currentColor,
		fillAlpha: 1,
		interactive: true,
		skipAutoUpdate: true,  // Prevent Mana's automatic graphics redrawing
		hitArea: {
			shape: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
			callback: Phaser.Geom.Rectangle.Contains,
		},
		onMount: (gameObject) => {
			// Store graphics reference for direct drawing during tweens
			state.graphics = gameObject as Phaser.GameObjects.Graphics;
		},
		onClick,
		onHover: (pointer) => {
			// Prevent creating multiple tweens if already tweening or at target color
			if (state.isTweening || state.currentColor === hoverColor) {
				state.isHovered = true;
				return [];
			}

			state.isHovered = true;

			// Stop any existing tween (shouldn't happen with isTweening guard, but just in case)
			if (state.tween) {
				state.tween.stop();
				state.tween = undefined;
			}

			// Tween color change on hover - dispatch redrawShape actions
			const scene = pointer.manager.game.scene.scenes[0]; // Get active scene
			state.isTweening = true;

			// Extract RGB components for proper color interpolation
			const fromR = (state.currentColor >> 16) & 0xff;
			const fromG = (state.currentColor >> 8) & 0xff;
			const fromB = state.currentColor & 0xff;

			const toR = (hoverColor >> 16) & 0xff;
			const toG = (hoverColor >> 8) & 0xff;
			const toB = hoverColor & 0xff;

			state.tween = scene.tweens.addCounter({
				from: 0,
				to: 1,
				duration: 200,
				ease: 'Power2',
				onUpdate: (tween) => {
					const t = tween.getValue();
					// Interpolate each RGB component
					const r = Math.round(fromR + (toR - fromR) * t);
					const g = Math.round(fromG + (toG - fromG) * t);
					const b = Math.round(fromB + (toB - fromB) * t);
					// Combine back into hex color
					state.currentColor = (r << 16) | (g << 8) | b;
					
					// Directly redraw with new color for smooth animation
					if (state.graphics) {
						redrawRoundedRect(state.graphics, width, height, cornerRadius, state.currentColor);
					}
				},
				onComplete: () => {
					state.currentColor = hoverColor;
					state.isTweening = false;
					state.tween = undefined;
				},
			});
			return [];
		},
		onHoverOut: (pointer) => {
			// Prevent creating multiple tweens if already tweening or at target color
			if (state.isTweening || state.currentColor === normalColor) {
				state.isHovered = false;
				return [];
			}

			state.isHovered = false;

			// Stop any existing tween (shouldn't happen with isTweening guard, but just in case)
			if (state.tween) {
				state.tween.stop();
				state.tween = undefined;
			}

			// Tween back to normal color - dispatch redrawShape actions
			const scene = pointer.manager.game.scene.scenes[0];
			state.isTweening = true;

			// Extract RGB components for proper color interpolation
			const fromR = (state.currentColor >> 16) & 0xff;
			const fromG = (state.currentColor >> 8) & 0xff;
			const fromB = state.currentColor & 0xff;

			const toR = (normalColor >> 16) & 0xff;
			const toG = (normalColor >> 8) & 0xff;
			const toB = normalColor & 0xff;

			state.tween = scene.tweens.addCounter({
				from: 0,
				to: 1,
				duration: 200,
				ease: 'Power2',
				onUpdate: (tween) => {
					const t = tween.getValue();
					// Interpolate each RGB component
					const r = Math.round(fromR + (toR - fromR) * t);
					const g = Math.round(fromG + (toG - fromG) * t);
					const b = Math.round(fromB + (toB - fromB) * t);
					// Combine back into hex color
					state.currentColor = (r << 16) | (g << 8) | b;
					
					// Directly redraw with new color for smooth animation
					if (state.graphics) {
						redrawRoundedRect(state.graphics, width, height, cornerRadius, state.currentColor);
					}
				},
				onComplete: () => {
					state.currentColor = normalColor;
					state.isTweening = false;
					state.tween = undefined;
				},
			});
			return [];
		},
	};

	// Text label
	const label: TextElement<Msg> = {
		id: `${id}-text`,
		type: 'text',
		x: 0,
		y: 0,
		text,
		style: {
			...textStyle,
			align: 'center',
		},
	};

	// Return as container with children
	return [
		{
			id,
			type: 'container',
			x,
			y,
			children: [background, label],
		} as Element<Msg>,
	];
};

/**
 * Clean up button state (call when button is destroyed)
 */
export const destroyButton = (id: string): void => {
	const state = buttonStates.get(id);
	if (state?.tween) {
		state.tween.stop();
	}
	buttonStates.delete(id);
};

/**
 * Helper to create multiple buttons with common styling
 */
export const createButtonGroup = <Msg>(
	buttons: Array<{
		id: string;
		x: number;
		y: number;
		text: string;
		onClick: () => readonly Msg[];
	}>,
	commonConfig?: Partial<ButtonConfig<Msg>>
): readonly Element<Msg>[] => {
	return buttons.flatMap((btn) =>
		createButton({
			width: 200,
			height: 50,
			...commonConfig,
			...btn,
		} as ButtonConfig<Msg>)
	);
};
