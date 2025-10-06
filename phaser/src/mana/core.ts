/**
 * Mana Core API - Main interface for reactive rendering
 *
 * This provides the complete API for reactive rendering in Phaser:
 * - Element creation helpers
 * - Core rendering functions
 * - Message handling system
 * - State management
 */

import type { Element, ComponentState } from './types';
import { createComponentState } from './state';
import { setData } from './renderer';
import type { ManaMsg } from './actions';
import { handleManaMsg } from './actions';

// Re-export essential types
export type { Element, ManaMsg };

// Re-export message handling
export { handleManaMsg };

/**
 * Element creation helpers - clean API
 */
export const container = <Msg>(
	id: string,
	x: number,
	y: number,
	children: readonly Element<Msg>[] = []
): Element<Msg> => ({
	id,
	type: 'container',
	x,
	y,
	children,
});

export const text = <Msg>(
	id: string,
	x: number,
	y: number,
	textContent: string,
	style?: Phaser.Types.GameObjects.Text.TextStyle
): Element<Msg> => ({
	id,
	type: 'text',
	x,
	y,
	text: textContent,
	style: {
		fontSize: '16px',
		color: '#ffffff',
		fontFamily: 'Arial',
		...style,
	},
});

export const image = (
	id: string,
	x: number,
	y: number,
	texture: string,
	onClick?: () => readonly ManaMsg[]
): Element<ManaMsg> => ({
	id,
	type: 'image',
	x,
	y,
	texture,
	...(onClick && { interactive: true, onClick }),
});

export const rectangle = (
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	fillColor?: number,
	onClick?: () => readonly ManaMsg[]
): Element<ManaMsg> => ({
	id,
	type: 'rect',
	x,
	y,
	width,
	height,
	...(fillColor && { fillColor }),
	...(onClick && { interactive: true, onClick }),
});

export const shader = <Msg>(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	vertexShader: string,
	fragmentShader: string,
	uniforms?: Record<string, any>
): Element<Msg> => ({
	id,
	type: 'shader',
	x,
	y,
	width,
	height,
	vertexShader,
	fragmentShader,
	...(uniforms && { uniforms }),
});

/**
 * Core render function - takes scene and elements, returns state
 */
export const render = <Msg>(
	scene: Phaser.Scene,
	elements: readonly Element<Msg | ManaMsg>[],
	update?: (msg: Msg, state: ComponentState<Msg | ManaMsg>) => ComponentState<Msg | ManaMsg>
): ComponentState<Msg | ManaMsg> => {
	// Create or reuse component state
	let state: ComponentState<Msg | ManaMsg>;

	// Try to get existing state from scene
	const existingState = (scene as any)._manaState;
	if (existingState) {
		state = existingState;
		// Update the update handler if provided
		if (update) {
			state.update = update as any;
		}
	} else {
		state = createComponentState<Msg | ManaMsg>(scene, update as any);
		(scene as any)._manaState = state;
	}

	// Render elements
	const newState = setData(elements)(state);
	// Update the original state with the new data and registry
	Object.assign(state, { data: newState.data, elementData: newState.elementData });
	// Store the updated state in the scene
	(scene as any)._manaState = state;
	return state;
};

/**
 * App creation function
 */
export const createApp = <Msg>(
	scene: Phaser.Scene,
	update?: (msg: Msg, state: ComponentState<Msg | ManaMsg>) => ComponentState<Msg | ManaMsg>
) => {
	return (elements: readonly Element<Msg | ManaMsg>[]) => render(scene, elements, update);
};

/**
 * Message dispatching
 */
export const dispatch = <Msg>(
	state: ComponentState<Msg | ManaMsg>,
	messages: readonly (Msg | ManaMsg)[]
): ComponentState<Msg | ManaMsg> => {
	// Use the state's built-in dispatch function
	const dispatchFn = (state as any).dispatch;
	if (dispatchFn) {
		for (const msg of messages) {
			dispatchFn(msg);
		}
	}
	return state;
};

/**
 * Clean up function
 */
export const cleanup = (scene: Phaser.Scene): void => {
	const state = (scene as any)._manaState;
	if (state) {
		// Destroy all elements
		for (const element of Object.values(state.elements)) {
			if (element && typeof (element as any).destroy === 'function') {
				(element as any).destroy();
			}
		}
		// Clear state
		state.elements = {};
		state.elementData.clear();
		state.data = [];
		state.eventHandlersAttached.clear();
	}
};