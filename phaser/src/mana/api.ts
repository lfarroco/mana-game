/**
 * Simplified API for creating and rendering components
 * This is the recommended entry point - single import needed!
 */

import type { Element, ComponentState } from './types';
import { createComponentState } from './state';
import { setData } from './renderer';
import type { ManaMsg } from './actions';

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
		const newState = setData(elements)(state);
		// Update the original state with the new data
		state.data = newState.data;
		return newState;
	};
};
