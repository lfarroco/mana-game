/**
 * Simplified API for creating and rendering components
 * This is the recommended entry point - single import needed!
 */

import type { Element, ComponentState } from './types';
import { createComponentState } from './state';
import { setData } from './renderer';
import type { ManaMsg } from './actions';
import { validateComponentCreation } from './validation';

/**
 * Create a render function with simplified API
 * 
 * @param scene - The Phaser scene
 * @param update - Optional message handler function for user-defined messages (ManaMsg are handled automatically)
 * @returns A render function that takes elements and renders them
 * 
 * @example
 * // Simple usage
 * const render = createComponent(scene);
 * render(buttonElements);
 * 
 * @example
 * // With message handling
 * const render = createComponent(scene, (msg, state) => {
 *   console.log('Message received:', msg);
 *   return state;
 * });
 * render(buttonElements);
 */
export const createComponent = <UserMsg>(
	scene: Phaser.Scene,
	update?: (msg: UserMsg, state: ComponentState<UserMsg | ManaMsg>) => ComponentState<UserMsg | ManaMsg>
) => {
	const state = createComponentState<UserMsg | ManaMsg>(scene, update as any);

	// Return a render function that takes elements and renders them
	return (elements: readonly Element<UserMsg | ManaMsg>[]): ComponentState<UserMsg | ManaMsg> => {
		// Validate component creation
		if (!validateComponentCreation(scene, elements)) {
			console.error('[Mana] Component validation failed, skipping render');
			return state;
		}

		const newState = setData(elements)(state);
		// Update the original state with the new data and registry
		Object.assign(state, { data: newState.data, elementData: newState.elementData });
		return newState;
	};
};

/**
 * Clean up a component and destroy all its elements
 * Should be called when the component is no longer needed
 */
export const destroyComponent = <Msg>(state: ComponentState<Msg>): void => {
	// Stop any active tweens
	const activeTweens = require('./actions').activeTweens;
	for (const [, tween] of activeTweens) {
		if (tween) {
			tween.stop();
		}
	}
	activeTweens.clear();

	// Destroy all elements
	for (const element of Object.values(state.elements)) {
		if (element && typeof element.destroy === 'function') {
			element.destroy();
		}
	}

	// Clear state
	state.elements = {};
	state.elementData.clear();
	state.data = [];
	state.messageQueue = [];
	state.eventHandlersAttached.clear();
	state.subscribers = [];

	// Remove update handler
	if (state.updateHandler) {
		state.scene.events.off('update', state.updateHandler);
		state.updateHandler = undefined;
	}
};
