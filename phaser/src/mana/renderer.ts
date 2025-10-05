/**
 * Rendering and synchronization logic for components
 */

import type { Element, ComponentState } from './types';
import { createComponent } from './factories';
import { applyBaseProps } from './properties';

/**
 * Update handler type that can be extended for custom update logic
 */
export type UpdateHandler<Msg> = (
	gameObject: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
) => void;

/**
 * Registry of update handlers by component type
 */
const updateHandlerRegistry: Record<string, UpdateHandler<any>> = {};

/**
 * Default update handler for text components
 */
const updateTextElement: UpdateHandler<any> = (gameObject, data) => {
	if (data.type === 'text' && 'setText' in gameObject) {
		(gameObject as any).setText(data.text);
	}
};

/**
 * Register built-in update handlers
 */
const registerBuiltInUpdateHandlers = (): void => {
	updateHandlerRegistry['text'] = updateTextElement;
};

// Initialize built-in handlers
registerBuiltInUpdateHandlers();

/**
 * Register a custom update handler for a component type
 * Allows extending update logic for custom or existing component types
 *
 * @example
 * registerUpdateHandler('sprite', (gameObject, data, state) => {
 *   if ('play' in gameObject && data.animation) {
 *     gameObject.play(data.animation);
 *   }
 * });
 */
export const registerUpdateHandler = <Msg>(
	type: string,
	handler: UpdateHandler<Msg>
): void => {
	updateHandlerRegistry[type] = handler;
};

/**
 * Update an existing element with new data
 */
const updateElement = <Msg>(
	gameObject: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
): void => {
	// Apply base properties
	applyBaseProps(gameObject, data, state);

	// Apply type-specific updates
	const handler = updateHandlerRegistry[data.type];
	if (handler) {
		handler(gameObject, data, state);
	}
};

/**
 * Synchronize a component with its data
 * Creates new elements or updates existing ones
 */
const syncComponent = <Msg>(
	state: ComponentState<Msg>,
	componentData: Element<Msg>
): void => {
	const existing = state.elements[componentData.id];

	if (existing) {
		updateElement(existing, componentData, state);
	} else {
		const newElement = createComponent(state, componentData);
		if (newElement) {
			state.elements[componentData.id] = newElement;
		}
	}
};

/**
 * Set new component data and synchronize all elements
 * Removes elements that are no longer in the data
 * Creates or updates elements as needed
 */
export const setData = <Msg>(newData: Element<Msg>[]) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	const currentIds = new Set(newData.map(c => c.id));

	// Remove elements that are no longer present
	for (const id in state.elements) {
		if (!currentIds.has(id)) {
			state.elements[id].destroy();
			state.eventHandlersAttached.delete(id);
			delete state.elements[id];
		}
	}

	// Create or update all current elements
	for (const componentData of newData) {
		syncComponent(state, componentData);
	}

	return { ...state, data: newData };
};