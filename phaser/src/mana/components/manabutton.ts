/**
 * Mana Button Component
 * 
 * A reusable button component built with the Mana library.
 * Features:
 * - Graphics rect background
 * - Text label overlay
 * - Click handling with messages
 * - Hover effects with color tween
 */

import type { Element, GraphicsElement, TextElement } from '../types';

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
 * Button state for tracking hover
 */
type ButtonState = {
	isHovered: boolean;
	tween?: Phaser.Tweens.Tween;
	currentColor: number;
	graphics?: Phaser.GameObjects.Graphics; // Reference to the actual graphics object
};

// Store button states
const buttonStates = new Map<string, ButtonState>();

/**
 * Helper to redraw button graphics with current color
 */
const redrawButton = (
	graphics: Phaser.GameObjects.Graphics,
	width: number,
	height: number,
	cornerRadius: number,
	color: number
): void => {
	graphics.clear();
	graphics.fillStyle(color, 1);
	graphics.fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
};

/**
 * Create a button component
 * Returns a container with graphics background and text
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
		});
	}

	const state = buttonStates.get(id)!;

	// Background graphics rect
	const background: GraphicsElement<Msg> = {
		id: `${id}-bg`,
		type: 'graphics',
		x: 0,
		y: 0,
		interactive: true,
		shapes: [
			{
				type: 'roundedRectangle',
				x: -width / 2,
				y: -height / 2,
				width,
				height,
				radius: cornerRadius,
				fillColor: state.currentColor,
				fillAlpha: 1,
			},
		],
		hitArea: {
			shape: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
			callback: Phaser.Geom.Rectangle.Contains,
		},
		onMount: (gameObject) => {
			// Capture reference to the graphics object for direct updates
			state.graphics = gameObject as Phaser.GameObjects.Graphics;
		},
		onClick,
		onHover: (pointer) => {
			state.isHovered = true;
			// Tween color change on hover
			const scene = pointer.manager.game.scene.scenes[0]; // Get active scene
			if (state.tween) {
				state.tween.stop();
			}
			state.tween = scene.tweens.addCounter({
				from: state.currentColor,
				to: hoverColor,
				duration: 150,
				ease: 'Power2',
				onUpdate: (tween) => {
					state.currentColor = Math.floor(tween.getValue());
					// Directly update the graphics if we have a reference
					if (state.graphics) {
						redrawButton(state.graphics, width, height, cornerRadius, state.currentColor);
					}
				},
			});
			return [];
		},
		onHoverOut: (pointer) => {
			state.isHovered = false;
			// Tween back to normal color
			const scene = pointer.manager.game.scene.scenes[0];
			if (state.tween) {
				state.tween.stop();
			}
			state.tween = scene.tweens.addCounter({
				from: state.currentColor,
				to: normalColor,
				duration: 150,
				ease: 'Power2',
				onUpdate: (tween) => {
					state.currentColor = Math.floor(tween.getValue());
					// Directly update the graphics if we have a reference
					if (state.graphics) {
						redrawButton(state.graphics, width, height, cornerRadius, state.currentColor);
					}
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
