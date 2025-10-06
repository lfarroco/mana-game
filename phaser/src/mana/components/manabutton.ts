/**
 * Mana Button Component
 * 
 * A reusable button component built with the Mana library.
 * Features:
 * - Rounded rectangle background
 * - Text label overlay
 * - Click handling with messages
 * - Smooth color tween animations using declarative ManaMsg actions
 * 
 * Usage:
 * The button requires your message type to extend ManaMsg so it can dispatch tween actions.
 * 
 * ```typescript
 * import { ManaMsg, handleManaMsg } from './mana';
 * 
 * type MyMsg = ManaMsg | { type: 'BUTTON_CLICKED' };
 * 
 * const update = (msg: MyMsg, state) => {
 *   const newState = handleManaMsg(msg, state);
 *   if (newState !== state) return newState;
 *   // ... handle custom messages
 * };
 * 
 * const button = createButton<MyMsg>({
 *   id: 'my-button',
 *   x: 100,
 *   y: 100,
 *   width: 200,
 *   height: 50,
 *   text: 'Click Me',
 *   onClick: () => [{ type: 'BUTTON_CLICKED' }],
 * });
 * ```
 */

import type { Element, RoundedRectangleElement, TextElement } from '../types';
import type { ManaMsg } from '../actions';
import { createTween, redrawShape, stopTween } from '../actions';

// Re-export ManaMsg types and helpers for convenience
export type { ManaMsg, TweenAction } from '../actions';
export {
	handleManaMsg,
	redrawShape,
	updateElement,
	setFillColor,
	setVisible,
	moveTo,
	createTween,
	stopTween,
} from '../actions';

/**
 * Button configuration
 * Generic type can be any message type - ManaMsg actions are handled automatically
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
 * Button state for tracking hover and current color
 */
type ButtonState = {
	isHovered: boolean;
	currentColor: number;
	isTweening: boolean;
};

// Store button states
const buttonStates = new Map<string, ButtonState>();

/**
 * Create a button component
 * Returns a container with rounded rectangle background and text
 * Uses declarative tween actions for smooth color animations
 */
export const createButton = <Msg>(config: ButtonConfig<Msg>): readonly Element<Msg | ManaMsg>[] => {
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
			currentColor: normalColor,
			isTweening: false,
		});
	}

	const state = buttonStates.get(id)!;

	// Background graphics rect
	const background: RoundedRectangleElement<Msg> = {
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
		hitArea: {
			shape: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
			callback: Phaser.Geom.Rectangle.Contains,
		},
		onClick,
		onHover: () => {
			// Prevent creating multiple tweens if already tweening or at target color
			if (state.isTweening || state.currentColor === hoverColor) {
				state.isHovered = true;
				return [];
			}

			state.isHovered = true;
			state.isTweening = true;

			// Extract RGB components for proper color interpolation
			const fromR = (state.currentColor >> 16) & 0xff;
			const fromG = (state.currentColor >> 8) & 0xff;
			const fromB = state.currentColor & 0xff;

			const toR = (hoverColor >> 16) & 0xff;
			const toG = (hoverColor >> 8) & 0xff;
			const toB = hoverColor & 0xff;

			// Return tween action that dispatches redraw messages
			return [
				stopTween(`${id}-hover-tween`) as Msg, // Stop any existing tween
				createTween<Msg>(
					`${id}-hover-tween`,
					0,
					1,
					200,
					{
						ease: 'Power2',
						onUpdate: (t: number) => {
							// Interpolate each RGB component
							const r = Math.round(fromR + (toR - fromR) * t);
							const g = Math.round(fromG + (toG - fromG) * t);
							const b = Math.round(fromB + (toB - fromB) * t);
							// Combine back into hex color
							const color = (r << 16) | (g << 8) | b;
							state.currentColor = color;

							// Return redraw action
							return [redrawShape(`${id}-bg`, { fillColor: color }) as Msg];
						},
						onComplete: () => {
							state.currentColor = hoverColor;
							state.isTweening = false;
							return [];
						},
					}
				) as Msg,
			];
		},
		onHoverOut: () => {
			// Prevent creating multiple tweens if already tweening or at target color
			if (state.isTweening || state.currentColor === normalColor) {
				state.isHovered = false;
				return [];
			}

			state.isHovered = false;
			state.isTweening = true;

			// Extract RGB components for proper color interpolation
			const fromR = (state.currentColor >> 16) & 0xff;
			const fromG = (state.currentColor >> 8) & 0xff;
			const fromB = state.currentColor & 0xff;

			const toR = (normalColor >> 16) & 0xff;
			const toG = (normalColor >> 8) & 0xff;
			const toB = normalColor & 0xff;

			// Return tween action that dispatches redraw messages
			return [
				stopTween(`${id}-hover-out-tween`) as Msg, // Stop any existing tween
				createTween<Msg>(
					`${id}-hover-out-tween`,
					0,
					1,
					200,
					{
						ease: 'Power2',
						onUpdate: (t: number) => {
							// Interpolate each RGB component
							const r = Math.round(fromR + (toR - fromR) * t);
							const g = Math.round(fromG + (toG - fromG) * t);
							const b = Math.round(fromB + (toB - fromB) * t);
							// Combine back into hex color
							const color = (r << 16) | (g << 8) | b;
							state.currentColor = color;

							// Return redraw action
							return [redrawShape(`${id}-bg`, { fillColor: color }) as Msg];
						},
						onComplete: () => {
							state.currentColor = normalColor;
							state.isTweening = false;
							return [];
						},
					}
				) as Msg,
			];
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
	// Stop any running tweens
	stopTween(`${id}-hover-tween`);
	stopTween(`${id}-hover-out-tween`);
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
): readonly Element<Msg | ManaMsg>[] => {
	return buttons.flatMap((btn) =>
		createButton({
			width: 200,
			height: 50,
			...commonConfig,
			...btn,
		} as ButtonConfig<Msg>)
	);
};
