/**
 * State management for the reactive rendering system
 */

import type { ComponentState } from './types';
import { handleManaMsg } from './actions';

/**
 * Emit a message to all registered subscribers
 */
const emitToSubscribers = <Msg>(msg: Msg, subscribers: ReadonlyArray<(msg: Msg) => void>): void => {
	subscribers.forEach(sub => sub(msg));
};

/**
 * Create a new component state
 * Sets up the reactive system with message processing
 */
export const createComponentState = <Msg>(
	scene: Phaser.Scene,
	update?: (msg: any, state: ComponentState<Msg>) => ComponentState<Msg>
): ComponentState<Msg> => {
	const state: ComponentState<Msg> = {
		scene,
		elements: {},
		data: [],
		messageQueue: [],
		update,
		eventHandlersAttached: new Set(),
		subscribers: [],
	};

	state.updateHandler = () => {
		const newState = processMessages(state);
		Object.assign(state, newState);
	};

	scene.events.on('update', state.updateHandler);

	return state;
};

/**
 * Add messages to the processing queue
 * Messages will be processed on the next update cycle
 */
export const enqueueMessages = <Msg>(messages: readonly Msg[]) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => ({
	...state,
	messageQueue: [...state.messageQueue, ...messages] as readonly Msg[],
});

/**
 * Subscribe to messages
 * Subscriber will be called for each processed message
 */
export const subscribe = <Msg>(callback: (msg: Msg) => void) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => ({
	...state,
	subscribers: [...state.subscribers, callback],
});

/**
 * Process all queued messages
 * Calls the update function for each message and emits to subscribers
 */
export const processMessages = <Msg>(
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	if (state.messageQueue.length === 0) {
		return { ...state, messageQueue: [] as readonly Msg[] };
	}

	let currentState = state;
	for (const msg of state.messageQueue) {
		emitToSubscribers(msg, currentState.subscribers);

		// Automatically handle ManaMsg first
		const msgObj = msg as any;
		let isManaMsg = false;
		if (msgObj.type && (msgObj.type.startsWith('@mana/') || msgObj.tweenId)) {
			const manaState = handleManaMsg(msg as any, currentState);
			if (manaState !== currentState) {
				currentState = manaState;
			}
			isManaMsg = true;
		}

		// Call user update function for non-Mana messages
		if (currentState.update && !isManaMsg) {
			currentState = currentState.update(msg, currentState);
		}
	}

	return { ...currentState, messageQueue: [] as readonly Msg[] };
};

/**
 * Get the current data from the state
 */
export const getData = <Msg>(state: ComponentState<Msg>) => state.data;