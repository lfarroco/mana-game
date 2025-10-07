/**
 * Property application and management for game objects
 */

import type { BaseElement, ComponentState } from './types';

/**
 * Property setter function type
 */
export type PropertySetter = (obj: any, val: any) => void;

/**
 * Properties that are expected to have setters in the registry
 */
const expectedProperties = ['x', 'y', 'visible', 'alpha', 'rotation', 'scale', 'origin'];

/**
 * Registry of property setters that can be extended
 */
export const propertySetters: Record<string, PropertySetter> = {
	x: (obj, val) => { if ('x' in obj) obj.x = val; },
	y: (obj, val) => { if ('y' in obj) obj.y = val; },
	visible: (obj, val) => { if ('setVisible' in obj) obj.setVisible(val); },
	alpha: (obj, val) => { if ('setAlpha' in obj) obj.setAlpha(val); },
	rotation: (obj, val) => { if ('rotation' in obj) obj.rotation = val; },
	scale: (obj, val) => {
		if ('setScale' in obj && val && typeof val === 'object' && 'x' in val && 'y' in val) {
			obj.setScale(val.x, val.y);
		}
	},
	origin: (obj, val) => {
		if ('setOrigin' in obj && val && typeof val === 'object' && 'x' in val && 'y' in val) {
			obj.setOrigin(val.x, val.y);
		}
	},
};

/**
 * Register a custom property setter
 * Allows extending the system with new properties without modifying core code
 *
 * @example
 * registerPropertySetter('tint', (obj, val) => {
 *   if ('setTint' in obj && typeof val === 'number') {
 *     obj.setTint(val);
 *   }
 * });
 */
export const registerPropertySetter = (property: string, setter: PropertySetter): void => {
	propertySetters[property] = setter;
};

/**
 * Apply base properties to a game object
 * Handles common properties like position, visibility, interactivity, etc.
 */
export const applyBaseProps = <T extends Phaser.GameObjects.GameObject, Msg>(
	gameObject: T,
	data: BaseElement<Msg>,
	state: ComponentState<Msg>
): void => {
	// Apply all registered property setters
	Object.keys(data).forEach(key => {
		if (key in propertySetters && (data as any)[key] !== undefined) {
			propertySetters[key](gameObject, (data as any)[key]);
		} else if (expectedProperties.includes(key) && (data as any)[key] !== undefined) {
			throw new Error(`Property '${key}' is declared in element data but has no corresponding setter in propertySetters registry.`);
		}
	});

	// Handle interactivity and click events
	if ((data.interactive || data.onClick || data.onHover || data.onHoverOut) && 'setInteractive' in gameObject) {
		const go = gameObject as any;

		if (!go.input) {
			// Check if data has hitArea property (for graphics objects)
			if ('hitArea' in data && (data as any).hitArea) {
				const hitAreaConfig = (data as any).hitArea;
				go.setInteractive(hitAreaConfig.shape, hitAreaConfig.callback);
			} else {
				go.setInteractive();
			}
		} else {
			// Input already exists - ensure it's enabled
			if (!go.input.enabled) {
				go.input.enabled = true;
			}
		}

		// Handle click events
		if (data.onClick && 'on' in go && !state.eventHandlersAttached.has(`${data.id}:click`)) {
			go.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
				const messages = data.onClick!(pointer);
				// Dispatch messages immediately
				messages.forEach(msg => {
					if ((state as any).dispatch) {
						(state as any).dispatch(msg);
					}
				});
			});
			state.eventHandlersAttached.add(`${data.id}:click`);
		}

		// Handle hover events
		if (data.onHover && 'on' in go && !state.eventHandlersAttached.has(`${data.id}:hover`)) {
			go.on('pointerover', (pointer: Phaser.Input.Pointer) => {
				const messages = data.onHover!(pointer);
				// Dispatch messages immediately
				messages.forEach(msg => {
					if ((state as any).dispatch) {
						(state as any).dispatch(msg);
					}
				});
			});
			state.eventHandlersAttached.add(`${data.id}:hover`);
		}

		// Handle hover out events
		if (data.onHoverOut && 'on' in go && !state.eventHandlersAttached.has(`${data.id}:hoverout`)) {
			go.on('pointerout', (pointer: Phaser.Input.Pointer) => {
				const messages = data.onHoverOut!(pointer);
				// Dispatch messages immediately
				messages.forEach(msg => {
					if ((state as any).dispatch) {
						(state as any).dispatch(msg);
					}
				});
			});
			state.eventHandlersAttached.add(`${data.id}:hoverout`);
		}
	}

	// Call onMount handler if provided
	if ('onMount' in data && typeof (data as any).onMount === 'function') {
		(data as any).onMount(gameObject);
	}
};