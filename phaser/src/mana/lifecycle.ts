/**
 * Lifecycle management for the component system
 */

import type { ComponentState } from './types';

/**
 * Cleanup hook type for custom cleanup logic
 */
export type CleanupHook<Msg> = (state: ComponentState<Msg>) => void;

/**
 * Registry of cleanup hooks
 */
const cleanupHooks: CleanupHook<any>[] = [];

/**
 * Register a cleanup hook
 * Hooks are called when the component system is destroyed
 * Allows extending cleanup logic for custom components
 *
 * @example
 * registerCleanupHook((state) => {
 *   console.log('Cleaning up custom resources');
 *   // Custom cleanup logic here
 * });
 */
export const registerCleanupHook = <Msg>(hook: CleanupHook<Msg>): void => {
	cleanupHooks.push(hook);
};

/**
 * Destroy the component system
 * Removes all elements, event handlers, and cleans up resources
 */
export const destroy = <Msg>(state: ComponentState<Msg>): ComponentState<Msg> => {
	// Remove update handler from scene
	if (state.updateHandler) {
		state.scene.events.off('update', state.updateHandler);
	}

	// Run all registered cleanup hooks
	cleanupHooks.forEach(hook => hook(state));

	// Destroy all game objects
	for (const id in state.elements) {
		state.elements[id].destroy();
	}

	// Return clean state
	return {
		...state,
		elements: {},
		data: [],
		eventHandlersAttached: new Set(),
		subscribers: [],
	};
};