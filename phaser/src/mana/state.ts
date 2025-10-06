/**
 * State management for the reactive rendering system
 * State-driven architecture with immediate message processing
 */

import type { ComponentState } from './types';
import { handleManaMsg } from './actions';
import { validateMessage, attemptRecovery } from './validation';

/**
 * Create a new component state
 * Sets up the reactive system with immediate message processing
 */
export const createComponentState = <Msg>(
	scene: Phaser.Scene,
	update?: (msg: Msg, state: ComponentState<Msg>) => ComponentState<Msg>
): ComponentState<Msg> => {
	const state: ComponentState<Msg> = {
		scene,
		elements: {},
		elementData: new Map(),
		elementState: new Map(),
		data: [],
		update,
		eventHandlersAttached: new Set(),
	};

	// Process messages immediately when dispatched
	(state as any).dispatch = (msg: Msg) => {
		try {
			// Validate message
			if (!validateMessage(msg)) {
				console.warn(`[Mana] Skipping invalid message:`, msg);
				return;
			}

			let newState = state;

			// Handle Mana messages first
			const msgObj = msg as any;
			if (msgObj.type && (msgObj.type.startsWith('@mana/') || msgObj.tweenId)) {
				const manaState = handleManaMsg(msg as any, newState);
				if (manaState !== newState) {
					newState = manaState;
				}
			} else {
				// Handle user messages
				if (newState.update) {
					newState = newState.update(msg, newState);
				}
			}

			// If state changed, trigger re-render
			if (newState !== state) {
				// Update the original state object
				Object.assign(state, newState);
			}
		} catch (error) {
			console.error('[Mana] Error processing message:', msg, error);
			attemptRecovery(state, error);
		}
	};

	return state;
};

/**
 * Get the current data from the state
 */
export const getData = <Msg>(state: ComponentState<Msg>) => state.data;