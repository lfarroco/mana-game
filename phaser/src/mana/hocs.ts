/**
 * Higher-order components for Mana
 *
 * These are components that wrap other components with additional behavior,
 * such as hover states, click handling, animations, etc.
 */

import type { Element } from './types';
import type { ManaMsg } from './actions';
import { updateElementState, createColorTween, createPropertyTween } from './actions';

// Constants
const DEFAULT_TWEEN_DURATION = 200;
const DEFAULT_BUTTON_BASE_COLOR = 0x4a5568;
const DEFAULT_BUTTON_HOVER_COLOR = 0x2d3748;
const DEFAULT_BUTTON_CORNER_RADIUS = 8;
const DEFAULT_BUTTON_FONT_SIZE = '16px';

/**
 * Helper function to create tween messages for hover transitions
 */
const createTweenMessages = (
	elementId: string,
	tweens: HoverTweenConfig[],
	isHoverIn: boolean
): ManaMsg[] => {
	return tweens.map((tweenConfig) => {
		const { property, baseValue, hoverValue, duration = DEFAULT_TWEEN_DURATION } = tweenConfig;
		const tweenId = `${elementId}-hover-${isHoverIn ? 'in' : 'out'}-${property}`;
		const fromValue = isHoverIn ? baseValue : hoverValue;
		const toValue = isHoverIn ? hoverValue : baseValue;

		if (property === 'fillColor' || property === 'strokeColor') {
			return createColorTween(
				tweenId,
				elementId,
				property as 'fillColor' | 'strokeColor',
				fromValue,
				toValue,
				duration
			);
		} else {
			return createPropertyTween(tweenId, elementId, property, fromValue, toValue, duration);
		}
	});
};

/**
 * Validate hover tween configuration
 */
const validateHoverTweenConfig = (config: HoverTweenConfig): void => {
	if (config.duration !== undefined && config.duration <= 0) {
		throw new Error(`Invalid duration: ${config.duration}. Duration must be positive.`);
	}
	// Could add more validation for property names if needed
};

/**
 * Configuration for hoverable behavior
 */
export type HoverTweenConfig = {
	property: string;
	baseValue: number;
	hoverValue: number;
	duration?: number;
};

export type HoverableConfig = {
	tweens?: HoverTweenConfig[];
};

/**
 * Wrap an element with hoverable behavior
 * Automatically handles color transitions on hover
 */
export const withHoverable = <Msg>(
	element: Element<Msg | ManaMsg>,
	config: HoverableConfig = {}
): Element<Msg | ManaMsg> => {
	const { tweens = [] } = config;

	// Validate tween configurations
	tweens.forEach(validateHoverTweenConfig);

	// Enhanced element with hover behavior
	const hoverableElement = {
		...element,
		onHover: (pointer: Phaser.Input.Pointer) => {
			const messages: (Msg | ManaMsg)[] = [];

			// Update state
			messages.push(updateElementState(element.id, { isHovered: true }));

			// Start transition tweens
			messages.push(...createTweenMessages(element.id, tweens, true));

			// Call original onHover if it exists
			if (element.onHover) {
				messages.push(...element.onHover(pointer));
			}

			return messages;
		},
		onHoverOut: (pointer: Phaser.Input.Pointer) => {
			const messages: (Msg | ManaMsg)[] = [];

			// Update state
			messages.push(updateElementState(element.id, { isHovered: false }));

			// Start transition tweens back to base values
			messages.push(...createTweenMessages(element.id, tweens, false));

			// Call original onHoverOut if it exists
			if (element.onHoverOut) {
				messages.push(...element.onHoverOut(pointer));
			}

			return messages;
		},
	};

	return hoverableElement;
};

/**
 * Configuration for clickable behavior
 */
export type ClickableConfig<Msg> = {
	onClick: () => (Msg | ManaMsg)[];
	disabled?: boolean;
};

/**
 * Wrap an element with clickable behavior
 */
export const withClickable = <Msg>(
	element: Element<Msg | ManaMsg>,
	config: ClickableConfig<Msg>
): Element<Msg | ManaMsg> => {
	return {
		...element,
		interactive: true,
		onClick: config.onClick,
	};
};

/**
 * Configuration for pressable behavior (button-like)
 */
export type PressableConfig<Msg> = {
	onPress: () => (Msg | ManaMsg)[];
	normalColor?: number;
	disabled?: boolean;
};

/**
 * Wrap an element with pressable behavior (shows pressed state)
 */
export const withPressable = <Msg>(
	element: Element<Msg | ManaMsg>,
	config: PressableConfig<Msg>
): Element<Msg | ManaMsg> => {
	const { onPress, disabled = false } = config;

	return {
		...element,
		interactive: !disabled,
		onClick: disabled ? undefined : onPress,
	};
};

/**
 * Combine multiple higher-order components
 * Applies them in order from right to left (like function composition)
 */
export const compose = <Msg>(
	...hocs: Array<(element: Element<Msg | ManaMsg>) => Element<Msg | ManaMsg>>
) => (element: Element<Msg | ManaMsg>): Element<Msg | ManaMsg> => {
	return hocs.reduceRight((acc, hoc) => hoc(acc), element);
};

/**
 * Create a button using higher-order components
 * This demonstrates how HOCs can be composed to create complex behavior
 */
export const createButtonHOC = <Msg>(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	text: string,
	onClick: () => (Msg | ManaMsg)[],
	config: HoverableConfig & { cornerRadius?: number } = {}
): readonly Element<Msg | ManaMsg>[] => {
	const { cornerRadius = DEFAULT_BUTTON_CORNER_RADIUS, ...hoverConfig } = config;

	// Provide default hover colors if none specified
	const finalHoverConfig: HoverableConfig = {
		tweens: [
			{
				property: 'fillColor',
				baseValue: DEFAULT_BUTTON_BASE_COLOR,
				hoverValue: DEFAULT_BUTTON_HOVER_COLOR,
				duration: DEFAULT_TWEEN_DURATION,
			},
		],
		...hoverConfig,
	};

	// Base rounded rectangle
	const background: Element<Msg | ManaMsg> = {
		id: `${id}-bg`,
		type: 'roundrect',
		x: 0,
		y: 0,
		width,
		height,
		radius: cornerRadius,
		fillColor: finalHoverConfig.tweens?.[0]?.baseValue ?? DEFAULT_BUTTON_BASE_COLOR,
		interactive: true,
		hitArea: {
			shape: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
			callback: Phaser.Geom.Rectangle.Contains,
		},
	};

	// Apply higher-order components
	const hoverableBackground = withHoverable(withClickable(background, { onClick }), finalHoverConfig);

	// Text label
	const label: Element<Msg | ManaMsg> = {
		id: `${id}-text`,
		type: 'text',
		x: 0,
		y: 0,
		text,
		style: {
			fontSize: DEFAULT_BUTTON_FONT_SIZE,
			color: '#ffffff',
			fontFamily: 'Arial',
			align: 'center',
		},
	};

	// Return as container
	return [
		{
			id,
			type: 'container',
			x,
			y,
			children: [hoverableBackground, label],
		} as Element<Msg | ManaMsg>,
	];
};