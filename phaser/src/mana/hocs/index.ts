/**
 * Higher-order components for Mana
 *
 * These are components that wrap other components with additional behavior,
 * such as hover states, click handling, animations, etc.
 */

import type { Element } from '../types';
import type { ManaMsg } from '../actions';
import { updateElementState, createColorTween, createPropertyTween } from '../actions';

// Constants
const DEFAULT_TWEEN_DURATION = 200;

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

;

/**
 * Wrap an element with hoverable behavior
 * Automatically handles color transitions on hover
 */
export const withHoverable = <Msg>(
	tweens: HoverTweenConfig[]
) => (
	element: Element<Msg | ManaMsg>
): Element<Msg | ManaMsg> => {

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
	};/**
 * Configuration for clickable behavior
 */
export type ClickableConfig<Msg> = {
	onClick: () => readonly (Msg | ManaMsg)[];
	disabled?: boolean;
};

/**
 * Wrap an element with clickable behavior
 */
export const withClickable = <Msg>(
	config: ClickableConfig<Msg>
) => (
	element: Element<Msg | ManaMsg>
): Element<Msg | ManaMsg> => {
		return {
			...element,
			interactive: true,
			onClick: config.onClick,
		};
	};/**
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