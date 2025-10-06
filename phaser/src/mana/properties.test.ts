/**
 * Tests for property application helpers
 */

import { applyBaseProps } from './properties';
import type { BaseElement, ComponentState } from './types';

const createMockState = <Msg>(): ComponentState<Msg> & { dispatch: jest.Mock } => {
	const dispatch = jest.fn();
	return {
		scene: {} as any,
		elements: {},
		elementData: new Map(),
		elementState: new Map(),
		data: [],
		eventHandlersAttached: new Set(),
		dispatch,
	} as any;
};

describe('applyBaseProps', () => {
	it('supports click handlers that return nothing', () => {
		type Msg = { type: 'PING' };
		const state = createMockState<Msg>();

		const handlers: Record<string, ((pointer: any) => void)[]> = {};
		const gameObject: any = {
			setInteractive: jest.fn().mockReturnThis(),
			on: jest.fn((event: string, handler: (pointer: any) => void) => {
				handlers[event] = handlers[event] || [];
				handlers[event].push(handler);
			}),
		};

		const element: BaseElement<Msg> = {
			id: 'button',
			type: 'image',
			x: 0,
			y: 0,
			interactive: true,
			onClick: () => {
				// no-op
			},
		};

		applyBaseProps(gameObject, element, state);

		expect(handlers.pointerdown).toBeDefined();
		handlers.pointerdown?.[0]({});

		expect(state.dispatch).not.toHaveBeenCalled();
	});

	it('dispatches single messages returned by handlers', () => {
		type Msg = { type: 'PING' };
		const state = createMockState<Msg>();

		const handlers: Record<string, ((pointer: any) => void)[]> = {};
		const gameObject: any = {
			setInteractive: jest.fn().mockReturnThis(),
			on: jest.fn((event: string, handler: (pointer: any) => void) => {
				handlers[event] = handlers[event] || [];
				handlers[event].push(handler);
			}),
		};

		const element: BaseElement<Msg> = {
			id: 'button',
			type: 'image',
			x: 0,
			y: 0,
			interactive: true,
			onClick: () => ({ type: 'PING' }),
		};

		applyBaseProps(gameObject, element, state);

		handlers.pointerdown?.[0]({});

		expect(state.dispatch).toHaveBeenCalledWith({ type: 'PING' });
	});
});
