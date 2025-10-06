/**
 * Mana Button Component - Declarative Version
 *
 * A simplified, more declarative button component that uses the new Mana features:
 * - Declarative color tweening
 * - Element state management
 * - Higher-order components
 * - Built-in state management
 *
 * This replaces the old imperative button with global state.
 */

import type { Element } from '../types';
import type { ManaMsg } from '../actions';
import { updateElementState } from '../actions';
import { withHoverable, withClickable, compose, type HoverTweenConfig, type ClickableConfig } from '../hocs';

// Re-export types and helpers for convenience
export type { ManaMsg } from '../actions';
export {
	handleManaMsg,
	updateElementState,
	createColorTween,
} from '../actions';

/**
 * Button states
 */
export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

/**
 * Button configuration with declarative state management
 */
export type DeclarativeButtonConfig<Msg> = {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly text: string;
	readonly textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
	readonly states?: {
		readonly normal: { readonly fillColor: number; readonly textColor?: string };
		readonly hover?: { readonly fillColor: number; readonly textColor?: string };
		readonly pressed?: { readonly fillColor: number; readonly textColor?: string };
		readonly disabled?: { readonly fillColor: number; readonly textColor?: string };
	};
	readonly transitionDuration?: number;
	readonly cornerRadius?: number;
	readonly onClick: () => readonly (Msg | ManaMsg)[];
	readonly initialState?: ButtonState;
};

/**
 * Create a declarative button component
 * Uses element state management and declarative color tweening
 */
export const create = <Msg>(
	config: DeclarativeButtonConfig<Msg>
): readonly Element<Msg | ManaMsg>[] => {
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
		states = {
			normal: { fillColor: 0x4a5568 },
			hover: { fillColor: 0x2d3748 },
		},
		transitionDuration = 200,
		cornerRadius = 8,
		onClick,
		initialState = 'normal',
	} = config;

	// Initialize button state
	const initialColor = states[initialState]?.fillColor ?? states.normal.fillColor;

	// Background with state-based behavior
	const baseBackground: Element<Msg | ManaMsg> = {
		id: `${id}-bg`,
		type: 'roundrect',
		x: 0,
		y: 0,
		width,
		height,
		radius: cornerRadius,
		fillColor: initialColor,
		hitArea: {
			shape: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
			callback: Phaser.Geom.Rectangle.Contains,
		},
		onHover: () => {
			const messages: ManaMsg[] = [];
			if (states.hover?.textColor) {
				messages.push(updateElementState(`${id}-text`, { style: { ...textStyle, color: states.hover.textColor } }));
			}
			return messages as Msg[];
		},
		onHoverOut: () => {
			const messages: ManaMsg[] = [];
			if (states.hover?.textColor) {
				messages.push(updateElementState(`${id}-text`, { style: { ...textStyle, color: textStyle.color } }));
			}
			return messages as Msg[];
		},
	};

	let background: Element<Msg | ManaMsg> = baseBackground;
	if (initialState !== 'disabled') {
		const tweens: HoverTweenConfig[] = [];
		if (states.hover) {
			tweens.push({
				property: 'fillColor',
				baseValue: states.normal.fillColor,
				hoverValue: states.hover.fillColor,
				duration: transitionDuration,
			});
		}
		const clickableConfig: ClickableConfig<Msg> = {
			onClick,
		};
		if (tweens.length > 0) {
			background = compose(
				withHoverable<Msg>(tweens),
				withClickable<Msg>(clickableConfig)
			)(baseBackground);
		} else {
			background = withClickable<Msg>(clickableConfig)(baseBackground);
		}
	} else {
		background = { ...baseBackground, interactive: false };
	}

	// Text label
	const label: Element<Msg | ManaMsg> = {
		id: `${id}-text`,
		type: 'text',
		x: 0,
		y: 0,
		origin: { x: 0.5, y: 0.5 },
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
		} as Element<Msg | ManaMsg>,
	];
};

/**
 * Update button state programmatically
 */
export const setButtonState = (
	buttonId: string,
	state: ButtonState,
	transitionDuration = 200
): ManaMsg => {
	return updateElementState(buttonId, { state, transitionDuration });
};

/**
 * Enable/disable a button
 */
export const setButtonEnabled = (
	buttonId: string,
	enabled: boolean
): ManaMsg => {
	return updateElementState(buttonId, { disabled: !enabled });
};
