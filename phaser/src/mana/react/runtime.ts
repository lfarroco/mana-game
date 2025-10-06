import { render as coreRender } from '../core';
import type { ComponentState, Element } from '../types';
import type { ManaMsg } from '../actions';
import { createTween } from '../actions';

type EffectCleanup = (() => void) | void;
type EffectCallback = () => EffectCleanup;

type HookBucket =
	| { type: 'state'; value: any }
	| { type: 'reducer'; value: any; dispatch: (action: any) => void }
	| { type: 'memo'; value: any; deps?: readonly unknown[] }
	| { type: 'effect'; deps?: readonly unknown[]; cleanup?: EffectCleanup }
	| { type: 'ref'; value: { current: any } };

type PendingEffect = {
	index: number;
	callback: EffectCallback;
	deps?: readonly unknown[];
};

type ComponentInstance<Msg, Props> = {
	key: string;
	component: ManaFC<Props, Msg>;
	hooks: HookBucket[];
	hookCursor: number;
	pendingEffects: PendingEffect[];
	childInstances: Map<string, ComponentInstance<Msg, any>>;
	activeChildKeys: Set<string>;
};

type DispatchFn<Msg> = (messages: readonly (Msg | ManaMsg)[]) => void;

type Runtime<Msg, Props> = {
	scene: Phaser.Scene;
	rootInstance: ComponentInstance<Msg, Props>;
	componentState?: ComponentState<Msg | ManaMsg>;
	userUpdate?: (msg: Msg, state: ComponentState<Msg | ManaMsg>) => ComponentState<Msg | ManaMsg>;
	pendingProps: Props | undefined;
	currentProps: Props | undefined;
	mounted: boolean;
	needsRender: boolean;
	renderScheduled: boolean;
	flushing: boolean;
	dispatch: DispatchFn<Msg>;
	pendingDispatchQueues: (readonly (Msg | ManaMsg)[])[];
};

export type ManaFC<Props, Msg> = (
	props: Props
) => readonly Element<Msg | ManaMsg>[] | Element<Msg | ManaMsg> | null | undefined;

export type ManaApp<Msg, Props> = {
	render: (props: Props) => void;
	unmount: () => void;
	getState: () => ComponentState<Msg | ManaMsg> | undefined;
};

let currentRuntime: Runtime<any, any> | null = null;
let currentInstance: ComponentInstance<any, any> | null = null;

const assertRendering = (): void => {
	if (!currentRuntime || !currentInstance) {
		throw new Error('[ManaReact] Hooks can only be used while rendering a Mana function component');
	}
};

const shallowArrayEqual = (
	prev: readonly unknown[] | undefined,
	next: readonly unknown[] | undefined
): boolean => {
	if (!prev && !next) return true;
	if (!prev || !next) return false;
	if (prev.length !== next.length) return false;
	for (let i = 0; i < prev.length; i += 1) {
		if (Object.is(prev[i], next[i])) continue;
		return false;
	}
	return true;
};

const normalizeOutput = <Msg>(
	output: readonly Element<Msg | ManaMsg>[] | Element<Msg | ManaMsg> | null | undefined
): readonly Element<Msg | ManaMsg>[] => {
	if (!output) return [];
	return Array.isArray(output)
		? (output as readonly Element<Msg | ManaMsg>[])
		: ([output] as readonly Element<Msg | ManaMsg>[]);
};

const createComponentInstance = <Msg, Props>(
	component: ManaFC<Props, Msg>,
	key: string
): ComponentInstance<Msg, Props> => ({
	key,
	component,
	hooks: [],
	hookCursor: 0,
	pendingEffects: [],
	childInstances: new Map(),
	activeChildKeys: new Set(),
});

const destroyComponentInstance = <Msg, Props>(instance: ComponentInstance<Msg, Props>): void => {
	for (const child of instance.childInstances.values()) {
		destroyComponentInstance(child);
	}
	instance.childInstances.clear();
	for (const hook of instance.hooks) {
		if (hook.type === 'effect' && typeof hook.cleanup === 'function') {
			try {
				hook.cleanup();
			} catch (error) {
				console.error('[ManaReact] Error during effect cleanup', error);
			}
			delete hook.cleanup;
		}
	}
	instance.hooks = [];
	instance.pendingEffects = [];
	instance.activeChildKeys.clear();
};

const commitEffects = <Msg>(instance: ComponentInstance<Msg, any>): void => {
	for (const { index, callback, deps } of instance.pendingEffects) {
		const bucket = instance.hooks[index] as HookBucket | undefined;
		if (!bucket || bucket.type !== 'effect') continue;
		const prevDeps = bucket.deps;
		if (prevDeps && deps && shallowArrayEqual(prevDeps, deps)) {
			continue;
		}
		if (typeof bucket.cleanup === 'function') {
			try {
				bucket.cleanup();
			} catch (error) {
				console.error('[ManaReact] Error during effect cleanup', error);
			}
		}
		bucket.deps = deps;
		try {
			bucket.cleanup = callback() ?? undefined;
		} catch (error) {
			console.error('[ManaReact] Error executing effect', error);
		}
	}
	instance.pendingEffects = [];
	for (const child of instance.childInstances.values()) {
		commitEffects(child);
	}
};

const cleanupUnusedChildren = <Msg>(instance: ComponentInstance<Msg, any>): void => {
	for (const [key, child] of instance.childInstances.entries()) {
		if (!instance.activeChildKeys.has(key)) {
			destroyComponentInstance(child);
			instance.childInstances.delete(key);
		}
	}
	instance.activeChildKeys.clear();
};

const pushContext = <Msg, Props>(
	runtime: Runtime<Msg, Props>,
	instance: ComponentInstance<Msg, any>
): void => {
	currentRuntime = runtime;
	currentInstance = instance;
	instance.hookCursor = 0;
	instance.pendingEffects = [];
	instance.activeChildKeys = new Set();
};

const popContext = (): void => {
	currentRuntime = null;
	currentInstance = null;
};

const renderComponentInstance = <Msg, Props>(
	runtime: Runtime<Msg, Props>,
	instance: ComponentInstance<Msg, Props>,
	props: Props
): readonly Element<Msg | ManaMsg>[] => {
	pushContext(runtime, instance);
	let result: readonly Element<Msg | ManaMsg>[];
	try {
		const output = instance.component(props);
		result = normalizeOutput(output);
	} finally {
		cleanupUnusedChildren(instance);
		popContext();
	}
	return result;
};

const scheduleRender = <Msg, Props>(runtime: Runtime<Msg, Props>): void => {
	if (!runtime.mounted) return;
	runtime.needsRender = true;
	if (runtime.renderScheduled) return;
	runtime.renderScheduled = true;
	Promise.resolve().then(() => {
		runtime.renderScheduled = false;
		if (!runtime.needsRender) return;
		runtime.needsRender = false;
		runRender(runtime);
	});
};

const flushPendingDispatch = <Msg, Props>(runtime: Runtime<Msg, Props>): void => {
	if (!runtime.pendingDispatchQueues.length) return;
	const state = runtime.componentState;
	if (!state || !(state as any).dispatch) return;
	for (const queue of runtime.pendingDispatchQueues) {
		for (const msg of queue) {
			(state as any).dispatch(msg);
		}
	}
	runtime.pendingDispatchQueues = [];
};

const runRender = <Msg, Props>(runtime: Runtime<Msg, Props>): void => {
	if (runtime.flushing) return;
	runtime.flushing = true;
	try {
		const props = runtime.pendingProps ?? runtime.currentProps;
		if (props === undefined) {
			throw new Error('[ManaReact] No props provided for render');
		}
		runtime.currentProps = props;
		runtime.pendingProps = undefined;
		const elements = renderComponentInstance(runtime, runtime.rootInstance, props);
		const state = coreRender(runtime.scene, elements, runtime.userUpdate);
		runtime.componentState = state;
		runtime.dispatch = (messages) => {
			if (state && (state as any).dispatch) {
				for (const msg of messages) {
					(state as any).dispatch(msg);
				}
			} else if (messages.length) {
				runtime.pendingDispatchQueues = [...runtime.pendingDispatchQueues, messages.slice()];
			}
		};
		commitEffects(runtime.rootInstance);
		flushPendingDispatch(runtime);
	} finally {
		runtime.flushing = false;
	}
};

const getHookBucket = (type: HookBucket['type']): HookBucket => {
	const instance = currentInstance!;
	const cursor = instance.hookCursor++;
	if (!instance.hooks[cursor]) {
		switch (type) {
			case 'state':
				instance.hooks[cursor] = { type: 'state', value: undefined };
				break;
			case 'memo':
				instance.hooks[cursor] = { type: 'memo', value: undefined, deps: undefined };
				break;
			case 'effect':
				instance.hooks[cursor] = { type: 'effect', deps: undefined, cleanup: undefined };
				break;
			case 'reducer':
				instance.hooks[cursor] = { type: 'reducer', value: undefined, dispatch: () => { } };
				break;
			case 'ref':
				instance.hooks[cursor] = { type: 'ref', value: { current: undefined } };
				break;
		}
	}
	return instance.hooks[cursor];
};

export const useState = <S>(initial: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void] => {
	assertRendering();
	const runtime = currentRuntime as Runtime<any, any>;
	const bucket = getHookBucket('state');
	if (bucket.type !== 'state') {
		throw new Error('[ManaReact] useState hook order changed');
	}
	if (bucket.value === undefined && !(bucket as any).__initialized) {
		bucket.value = typeof initial === 'function' ? (initial as () => S)() : initial;
		(bucket as any).__initialized = true;
	}
	const setState = (value: S | ((prev: S) => S)) => {
		const nextValue = typeof value === 'function' ? (value as (prev: S) => S)(bucket.value as S) : value;
		if (Object.is(nextValue, bucket.value)) return;
		bucket.value = nextValue;
		scheduleRender(runtime);
	};
	return [bucket.value as S, setState];
};

export const useReducer = <S, A>(
	reducer: (state: S, action: A) => S,
	initial: S,
	initializer?: (arg: S) => S
): [S, (action: A) => void] => {
	assertRendering();
	const runtime = currentRuntime as Runtime<any, any>;
	const bucket = getHookBucket('reducer');
	if (bucket.type !== 'reducer') {
		throw new Error('[ManaReact] useReducer hook order changed');
	}
	if (bucket.value === undefined && !(bucket as any).__initialized) {
		bucket.value = initializer ? initializer(initial) : initial;
		bucket.dispatch = (action: A) => {
			const next = reducer(bucket.value as S, action);
			if (Object.is(next, bucket.value)) return;
			bucket.value = next;
			scheduleRender(runtime);
		};
		(bucket as any).__initialized = true;
	}
	return [bucket.value as S, bucket.dispatch as (action: A) => void];
};

export const useMemo = <T>(factory: () => T, deps: readonly unknown[]): T => {
	assertRendering();
	const bucket = getHookBucket('memo');
	if (bucket.type !== 'memo') {
		throw new Error('[ManaReact] useMemo hook order changed');
	}
	if (!bucket.deps || !shallowArrayEqual(bucket.deps, deps)) {
		bucket.value = factory();
		bucket.deps = deps;
	}
	return bucket.value as T;
};

export const useCallback = <T extends (...args: any[]) => any>(
	callback: T,
	deps: readonly unknown[]
): T => useMemo(() => callback, deps);

export const useRef = <T>(initial?: T) => {
	assertRendering();
	const bucket = getHookBucket('ref');
	if (bucket.type !== 'ref') {
		throw new Error('[ManaReact] useRef hook order changed');
	}
	if (bucket.value.current === undefined && initial !== undefined) {
		bucket.value.current = initial;
	}
	return bucket.value as { current: T | undefined };
};

export const useEffect = (
	effect: EffectCallback,
	deps?: readonly unknown[]
): void => {
	assertRendering();
	const instance = currentInstance!;
	const bucket = getHookBucket('effect');
	if (bucket.type !== 'effect') {
		throw new Error('[ManaReact] useEffect hook order changed');
	}
	instance.pendingEffects.push({ index: instance.hookCursor - 1, callback: effect, deps });
};

export const useScene = (): Phaser.Scene => {
	assertRendering();
	return currentRuntime!.scene;
};

export const useDispatch = <Msg>(): ((message: Msg | ManaMsg | readonly (Msg | ManaMsg)[]) => void) => {
	assertRendering();
	const runtime = currentRuntime as Runtime<Msg, any>;
	return (message: Msg | ManaMsg | readonly (Msg | ManaMsg)[]) => {
		const messages = Array.isArray(message)
			? (message as readonly (Msg | ManaMsg)[])
			: ([message] as readonly (Msg | ManaMsg)[]);
		runtime.dispatch(messages);
	};
};

let componentKeySeed = 0;

export const useComponent = <Props, Msg>(
	Component: ManaFC<Props, Msg>,
	props: Props,
	key?: string
): readonly Element<Msg | ManaMsg>[] => {
	assertRendering();
	const runtime = currentRuntime as Runtime<Msg, any>;
	const parent = currentInstance!;
	const resolvedKey = key ?? `${Component.name || 'Component'}-${componentKeySeed++}`;
	let child = parent.childInstances.get(resolvedKey) as ComponentInstance<Msg, Props> | undefined;
	if (!child) {
		child = createComponentInstance(Component, resolvedKey);
		parent.childInstances.set(resolvedKey, child);
	}
	parent.activeChildKeys.add(resolvedKey);
	return renderComponentInstance(runtime, child, props);
};

export const useTween = <Msg>(
	defaults: {
		tweenId: string;
		from: number;
		to: number;
		duration: number;
		ease?: string;
	}
) => {
	const dispatch = useDispatch<Msg>();
	return (
		overrides: Partial<typeof defaults> & {
			onUpdate?: (value: number) => readonly (Msg | ManaMsg)[];
			onComplete?: () => readonly (Msg | ManaMsg)[];
		}
	) => {
		const payload = {
			...defaults,
			...overrides,
		};
		dispatch([
			createTween<Msg | ManaMsg>(
				payload.tweenId,
				payload.from,
				payload.to,
				payload.duration,
				{
					ease: payload.ease,
					onUpdate: payload.onUpdate as ((value: number) => readonly (Msg | ManaMsg)[]) | undefined,
					onComplete: payload.onComplete as (() => readonly (Msg | ManaMsg)[]) | undefined,
				}
			)
		]);
	};
};

export const createManaApp = <Msg, Props>(
	scene: Phaser.Scene,
	Component: ManaFC<Props, Msg>,
	options?: {
		update?: (msg: Msg, state: ComponentState<Msg | ManaMsg>) => ComponentState<Msg | ManaMsg>;
		initialProps?: Props;
	}
): ManaApp<Msg, Props> => {
	const rootInstance = createComponentInstance(Component, 'root');
	const runtime: Runtime<Msg, Props> = {
		scene,
		rootInstance,
		userUpdate: options?.update,
		componentState: undefined,
		pendingProps: options?.initialProps,
		currentProps: undefined,
		mounted: false,
		needsRender: false,
		renderScheduled: false,
		flushing: false,
		dispatch: (messages) => {
			if (!messages.length) return;
			runtime.pendingDispatchQueues = [...runtime.pendingDispatchQueues, messages.slice()];
		},
		pendingDispatchQueues: [],
	};

	const render = (props: Props) => {
		runtime.pendingProps = props;
		if (!runtime.mounted) {
			runtime.mounted = true;
			runRender(runtime);
			return;
		}
		scheduleRender(runtime);
	};

	const unmount = () => {
		if (!runtime.mounted) return;
		runtime.mounted = false;
		runtime.pendingProps = undefined;
		runtime.currentProps = undefined;
		destroyComponentInstance(runtime.rootInstance);
	};

	if (options?.initialProps !== undefined) {
		render(options.initialProps);
	}

	return {
		render,
		unmount,
		getState: () => runtime.componentState,
	};
};
