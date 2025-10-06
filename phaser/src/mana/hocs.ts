/**
 * Higher-order components for Mana
 *
 * These are components that wrap other components with additional behavior,
 * such as hover states, click handling, animations, etc.
 */

import type { Element } from './types';
import type { ManaMsg } from './actions';
import { updateElementState, createColorTween, createPropertyTween } from './actions';

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
	const { tweens } = config;

	// Use provided tweens or empty array for no hover effects
	const hoverTweens: HoverTweenConfig[] = tweens || [];

	// Enhanced element with hover behavior
	const hoverableElement = {
		...element,
		onHover: (pointer: Phaser.Input.Pointer) => {
			const messages: (Msg | ManaMsg)[] = [];

			// Update state
			messages.push(updateElementState(element.id, { isHovered: true }) as Msg);

			// Start transition tweens
			hoverTweens.forEach((tweenConfig) => {
				const { property, baseValue, hoverValue, duration = 200 } = tweenConfig;
				const tweenId = `${element.id}-hover-${property}`;

				if (property === 'fillColor' || property === 'strokeColor') {
					messages.push(
						createColorTween(
							tweenId,
							element.id,
							property as 'fillColor' | 'strokeColor',
							baseValue,
							hoverValue,
							duration
						) as Msg
					);
				} else {
					messages.push(
						createPropertyTween(
							tweenId,
							element.id,
							property,
							baseValue,
							hoverValue,
							duration
						) as Msg
					);
				}
			});

			// Call original onHover if it exists
			if (element.onHover) {
				messages.push(...element.onHover(pointer));
			}

			return messages;
		},
		onHoverOut: (pointer: Phaser.Input.Pointer) => {
			const messages: (Msg | ManaMsg)[] = [];

			// Update state
			messages.push(updateElementState(element.id, { isHovered: false }) as Msg);

			// Start transition tweens back to base values
			hoverTweens.forEach((tweenConfig) => {
				const { property, baseValue, hoverValue, duration = 200 } = tweenConfig;
				const tweenId = `${element.id}-hover-out-${property}`;

				if (property === 'fillColor' || property === 'strokeColor') {
					messages.push(
						createColorTween(
							tweenId,
							element.id,
							property as 'fillColor' | 'strokeColor',
							hoverValue,
							baseValue,
							duration
						) as Msg
					);
				} else {
					messages.push(
						createPropertyTween(
							tweenId,
							element.id,
							property,
							hoverValue,
							baseValue,
							duration
						) as Msg
					);
				}
			});

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
 * Wrap an element with focusable behavior
 */
export const withFocusable = <Msg>(
	element: Element<Msg | ManaMsg>
): Element<Msg | ManaMsg> => {
	return {
		...element,
		// Note: Phaser doesn't have built-in focus events, this would need
		// additional implementation for keyboard navigation
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
	const { cornerRadius = 8, ...hoverConfig } = config;

	// Provide default hover colors if none specified
	const finalHoverConfig: HoverableConfig = {
		tweens: [
			{
				property: 'fillColor',
				baseValue: 0x4a5568,
				hoverValue: 0x2d3748,
				duration: 200,
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
		fillColor: finalHoverConfig.tweens?.[0]?.baseValue ?? 0x4a5568,
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
			fontSize: '16px',
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