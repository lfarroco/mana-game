/**
 * Lifecycle management for the component system
 */

import type { ComponentState, Element } from './types';

/**
 * Cleanup hook type for custom cleanup logic
 */
export type CleanupHook<Msg> = (state: ComponentState<Msg>) => void;

/**
 * Lifecycle hook called when an element is mounted (created)
 */
export type MountHook<Msg> = (
	element: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
) => void;

/**
 * Lifecycle hook called when an element is unmounted (destroyed)
 */
export type UnmountHook<Msg> = (
	element: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
) => void;

/**
 * Registry of cleanup hooks
 */
const cleanupHooks: CleanupHook<any>[] = [];

/**
 * Registry of mount hooks by component type
 */
const mountHooks: Record<string, MountHook<any>[]> = {};

/**
 * Registry of unmount hooks by component type
 */
const unmountHooks: Record<string, UnmountHook<any>[]> = {};

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
 * Register a mount hook for a specific component type
 * Called when a component is created
 *
 * @example
 * registerMountHook('sprite', (element, data, state) => {
 *   console.log('Sprite mounted:', data.id);
 * });
 */
export const registerMountHook = <Msg>(type: string, hook: MountHook<Msg>): void => {
	if (!mountHooks[type]) {
		mountHooks[type] = [];
	}
	mountHooks[type].push(hook);
};

/**
 * Register an unmount hook for a specific component type
 * Called when a component is destroyed
 *
 * @example
 * registerUnmountHook('sprite', (element, data, state) => {
 *   console.log('Sprite unmounted:', data.id);
 * });
 */
export const registerUnmountHook = <Msg>(type: string, hook: UnmountHook<Msg>): void => {
	if (!unmountHooks[type]) {
		unmountHooks[type] = [];
	}
	unmountHooks[type].push(hook);
};

/**
 * Call all mount hooks for a component
 * @internal
 */
export const callMountHooks = <Msg>(
	element: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
): void => {
	const hooks = mountHooks[data.type] || [];
	hooks.forEach(hook => hook(element, data, state));
};

/**
 * Call all unmount hooks for a component
 * @internal
 */
export const callUnmountHooks = <Msg>(
	element: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
): void => {
	const hooks = unmountHooks[data.type] || [];
	hooks.forEach(hook => hook(element, data, state));
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

	// Call unmount hooks and destroy all game objects
	for (const id in state.elements) {
		const element = state.elements[id];
		const data = state.data.find(d => d.id === id);

		if (data) {
			callUnmountHooks(element, data, state);
		}

		element.destroy();
	}

	// Return clean state
	return {
		...state,
		elements: {},
		data: [] as readonly Element<Msg>[],
		eventHandlersAttached: new Set(),
	};
};