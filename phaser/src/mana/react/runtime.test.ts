/**
 * Tests for Mana React-style runtime
 */

import type { Element } from '../types';
import type { ManaMsg } from '../actions';
import {
	createManaApp,
	type ManaFC,
	useState,
	useDispatch,
	useEffect,
} from './index';

type MockScene = any;

const mockRender = jest.fn((scene: MockScene, elements: readonly Element<any>[]) => {
	const state: any = {
		scene,
		elements: {},
		elementData: new Map(),
		elementState: new Map(),
		data: elements,
		eventHandlersAttached: new Set(),
	};
	state.dispatch = jest.fn();
	return state;
});

jest.mock('../core', () => ({
	render: (...args: any[]) => mockRender(...(args as [MockScene, readonly Element<any>[]])),
}));

describe('Mana React runtime', () => {
	beforeEach(() => {
		mockRender.mockClear();
	});

	it('renders function components and rerenders on state updates', async () => {
		type TestMsg = { type: 'TEST' };

		let capturedSetState: ((value: number | ((prev: number) => number)) => void) | undefined;

		const Counter: ManaFC<{ label: string }, TestMsg> = ({ label }) => {
			const [count, setCount] = useState(0);
			capturedSetState = setCount;
			return [
				{
					id: 'counter-text',
					type: 'text',
					x: 0,
					y: 0,
					text: `${label}:${count}`,
				} as Element<TestMsg | ManaMsg>,
			];
		};

		const scene: MockScene = {};
		const app = createManaApp<TestMsg, { label: string }>(scene, Counter, {
			initialProps: { label: 'Count' },
		});

		expect(mockRender).toHaveBeenCalledTimes(1);
		let elements = mockRender.mock.calls[0][1] as readonly Element<TestMsg | ManaMsg>[];
		expect(elements[0]).toMatchObject({ text: 'Count:0' });

		capturedSetState?.((prev) => prev + 1);
		await Promise.resolve();

		expect(mockRender).toHaveBeenCalledTimes(2);
		elements = mockRender.mock.calls[1][1] as readonly Element<TestMsg | ManaMsg>[];
		expect(elements[0]).toMatchObject({ text: 'Count:1' });

		app.render({ label: 'Total' });
		await Promise.resolve();
		expect(mockRender).toHaveBeenCalledTimes(3);
		elements = mockRender.mock.calls[2][1] as readonly Element<TestMsg | ManaMsg>[];
		expect(elements[0]).toMatchObject({ text: 'Total:1' });
	});

	it('dispatches messages from hooks', () => {
		type TestMsg = { type: 'PING' };

		const dispatched: any[] = [];
		mockRender.mockImplementationOnce((scene: MockScene, elements: readonly Element<any>[]) => {
			const state: any = {
				scene,
				elements: {},
				elementData: new Map(),
				elementState: new Map(),
				data: elements,
				eventHandlersAttached: new Set(),
			};
			state.dispatch = (msg: any) => dispatched.push(msg);
			return state;
		});

		const Dispatcher: ManaFC<Record<string, never>, TestMsg> = () => {
			const dispatch = useDispatch<TestMsg>();
			useEffect(() => {
				dispatch({ type: 'PING' });
			}, [dispatch]);
			return [];
		};

		const scene: MockScene = {};
		createManaApp<TestMsg, Record<string, never>>(scene, Dispatcher, {
			initialProps: {},
		});

		expect(dispatched).toEqual([{ type: 'PING' }]);
	});
});
