/**
 * Simplified API for creating and rendering components
 * This is the recommended entry point - single import needed!
 */

import type { Element, ComponentState } from './types';
import { createComponentState } from './state';
import { setData } from './renderer';

/**
 * Create a render function with simplified API
 * 
 * @param scene - The Phaser scene
 * @param update - Optional message handler function
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
export const createComponent = <Msg>(
	scene: Phaser.Scene,
	update?: (msg: Msg, state: ComponentState<Msg>) => ComponentState<Msg>
) => {
	const state = createComponentState<Msg>(scene, update);

	// Return a render function that takes elements and renders them
	return (elements: readonly Element<Msg>[]): ComponentState<Msg> => {
		return setData(elements)(state);
	};
};
