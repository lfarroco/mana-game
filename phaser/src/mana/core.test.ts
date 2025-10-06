/**
 * Tests for the Mana Core API
 */

import { container, text, image, rectangle, render, createApp, dispatch, cleanup, type Element, type ManaMsg } from './core';

// Mock Phaser
const mockScene = {
	add: {
		container: jest.fn(() => ({ destroy: jest.fn() })),
		text: jest.fn(() => ({ destroy: jest.fn() })),
		image: jest.fn(() => ({ destroy: jest.fn() })),
		rectangle: jest.fn(() => ({ destroy: jest.fn() })),
	},
	textures: {
		exists: jest.fn(() => true), // Mock texture existence check
	},
} as any;

describe('Simplified Mana API', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Element creation helpers', () => {
		it('creates container element', () => {
			const element = container('test', 10, 20, []);
			expect(element).toEqual({
				id: 'test',
				type: 'container',
				x: 10,
				y: 20,
				children: [],
			});
		});

		it('creates text element', () => {
			const element = text('test', 10, 20, 'Hello World');
			expect(element).toEqual({
				id: 'test',
				type: 'text',
				x: 10,
				y: 20,
				text: 'Hello World',
				style: {
					fontSize: '16px',
					color: '#ffffff',
					fontFamily: 'Arial',
				},
			});
		});

		it('creates image element', () => {
			const element = image('test', 10, 20, 'texture');
			expect(element).toEqual({
				id: 'test',
				type: 'image',
				x: 10,
				y: 20,
				texture: 'texture',
			});
		});

		it('creates rectangle element', () => {
			const element = rectangle('test', 10, 20, 100, 50);
			expect(element).toEqual({
				id: 'test',
				type: 'rect',
				x: 10,
				y: 20,
				width: 100,
				height: 50,
			});
		});

		it('creates interactive elements', () => {
			const clickHandler = () => [];
			const imgElement = image('test', 10, 20, 'texture', clickHandler);
			const rectElement = rectangle('test2', 10, 20, 100, 50, undefined, clickHandler);

			expect(imgElement.interactive).toBe(true);
			expect(imgElement.onClick).toBe(clickHandler);
			expect(rectElement.interactive).toBe(true);
			expect(rectElement.onClick).toBe(clickHandler);
		});
	});

	describe('render function', () => {
		it('renders elements to scene', () => {
			const elements: Element<ManaMsg>[] = [
				text('text1', 10, 20, 'Hello'),
				image('img1', 30, 40, 'texture'),
			];

			const state = render(mockScene, elements);

			expect(state).toBeDefined();
			expect(state.data).toEqual(elements);
			expect(mockScene._manaState).toBe(state);
		});

		it('reuses existing state on subsequent renders', () => {
			const elements1: Element<ManaMsg>[] = [text('text1', 10, 20, 'Hello')];
			const elements2: Element<ManaMsg>[] = [text('text2', 30, 40, 'World')];

			const state1 = render(mockScene, elements1);
			const state2 = render(mockScene, elements2);

			expect(state1).toBe(state2); // Same state object
			expect(state2.data).toEqual(elements2); // But data is updated
		});
	});

	describe('createApp function', () => {
		it('creates a render function with update handler', () => {
			type TestMsg = { type: 'TEST' };

			const update = jest.fn((_msg, state) => state);
			const app = createApp<TestMsg>(mockScene, update);

			const elements: Element<TestMsg | ManaMsg>[] = [text('test', 10, 20, 'Hello')];
			const state = app(elements);

			expect(state).toBeDefined();
			expect(state.update).toBe(update);
		});
	});

	describe('dispatch function', () => {
		it('handles ManaMsg messages automatically', () => {
			const state = render(mockScene, []);
			const messages: ManaMsg[] = [];

			const newState = dispatch(state, messages);
			expect(newState).toBe(state);
		});

		it('calls update handler for user messages', () => {
			type TestMsg = { type: 'TEST' };

			const update = jest.fn((_msg, state) => state);
			const state = render(mockScene, [], update);

			const messages: TestMsg[] = [{ type: 'TEST' }];
			dispatch(state, messages);

			expect(update).toHaveBeenCalledWith({ type: 'TEST' }, state);
		});
	});

	describe('cleanup function', () => {
		it('cleans up rendered elements', () => {
			const elements: Element<ManaMsg>[] = [text('test', 10, 20, 'Hello')];
			render(mockScene, elements);

			const mockDestroy = jest.fn();
			mockScene._manaState.elements = {
				test: { destroy: mockDestroy },
			};

			cleanup(mockScene);

			expect(mockDestroy).toHaveBeenCalled();
			expect(mockScene._manaState.elements).toEqual({});
		});
	});
});