import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';
import { pipe } from 'fp-ts/function';

type ClickHandler<Msg> = (pointer: Phaser.Input.Pointer) => Msg[];

type ElementType = 'image' | 'text' | 'container';

type BaseElement<Msg> = {
	id: string;
	type: ElementType;
	x: number;
	y: number;
	visible?: boolean;
	alpha?: number;
	rotation?: number;
	scale?: { x: number; y: number };
	interactive?: boolean;
	onClick?: ClickHandler<Msg>;
};

type ImageElement<Msg> = BaseElement<Msg> & {
	type: 'image';
	texture: string;
};

type TextElement<Msg> = BaseElement<Msg> & {
	type: 'text';
	text: string;
	style?: Phaser.Types.GameObjects.Text.TextStyle;
};

type ContainerElement<Msg> = BaseElement<Msg> & {
	type: 'container';
	children: Component<Msg>[];
};

type Component<Msg> = ImageElement<Msg> | TextElement<Msg> | ContainerElement<Msg>;

type ComponentState<Msg> = {
	scene: Phaser.Scene;
	elements: Record<string, Phaser.GameObjects.GameObject>;
	data: Component<Msg>[];
	messageQueue: Msg[];
	update?: (msg: Msg, state: ComponentState<Msg>) => ComponentState<Msg>;
	eventHandlersAttached: Set<string>;
};

export const createComponentState = <Msg>(
	scene: Phaser.Scene,
	update?: (msg: Msg, state: ComponentState<Msg>) => ComponentState<Msg>
): ComponentState<Msg> => ({
	scene,
	elements: {},
	data: [],
	messageQueue: [],
	update,
	eventHandlersAttached: new Set<string>(),
});

export const enqueueMessages = <Msg>(messages: Msg[]) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => ({
	...state,
	messageQueue: [...state.messageQueue, ...messages],
});

export const processMessages = <Msg>(
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	if (!state.update || state.messageQueue.length === 0) {
		return { ...state, messageQueue: [] };
	}

	console.log(`Processing ${state.messageQueue.length} messages:`, state.messageQueue);

	const processedState = pipe(
		state.messageQueue,
		A.reduce<Msg, ComponentState<Msg>>(
			state,
			(acc, msg) => (acc.update ? acc.update(msg, acc) : acc)
		)
	);

	return { ...processedState, messageQueue: [] };
};

const applyBaseProps = <T extends Phaser.GameObjects.GameObject, Msg>(
	data: BaseElement<Msg>,
	state: ComponentState<Msg>
) => (
	gameObject: T
): T => {
		if ('x' in gameObject && 'y' in gameObject) {
			gameObject.x = data.x;
			gameObject.y = data.y;
		}

		if (data.visible !== undefined && 'setVisible' in gameObject) {
			(gameObject as any).setVisible(data.visible);
		}

		if (data.alpha !== undefined && 'setAlpha' in gameObject) {
			(gameObject as any).setAlpha(data.alpha);
		}

		if (data.rotation !== undefined && 'rotation' in gameObject) {
			gameObject.rotation = data.rotation;
		}

		if (data.scale && 'setScale' in gameObject) {
			(gameObject as any).setScale(data.scale.x, data.scale.y);
		}

		if ((data.interactive || data.onClick) && 'setInteractive' in gameObject) {
			const go = gameObject as any;

			if (!go.input) {
				go.setInteractive();
				console.log(`Made ${data.id} interactive`);
			}

			if (data.onClick && 'on' in go && !state.eventHandlersAttached.has(data.id)) {
				go.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
					console.log(`${data.id} clicked!`);
					const messages = data.onClick!(pointer);
					state.messageQueue.push(...messages);
				});
				state.eventHandlersAttached.add(data.id);
				console.log(`Attached click handler to ${data.id}`);
			}
		} return gameObject;
	};

const createImage = <Msg>(state: ComponentState<Msg>) => (
	data: ImageElement<Msg>
): Phaser.GameObjects.Image =>
	pipe(
		state.scene.add.image(data.x, data.y, data.texture),
		applyBaseProps(data, state)
	);

const createText = <Msg>(state: ComponentState<Msg>) => (
	data: TextElement<Msg>
): Phaser.GameObjects.Text =>
	pipe(
		state.scene.add.text(data.x, data.y, data.text, data.style),
		applyBaseProps(data, state)
	);

const createContainer = <Msg>(state: ComponentState<Msg>) => (
	data: ContainerElement<Msg>
): Phaser.GameObjects.Container =>
	pipe(state.scene.add.container(data.x, data.y), applyBaseProps(data, state));

const createComponent = <Msg>(state: ComponentState<Msg>) => (
	data: Component<Msg>
): O.Option<Phaser.GameObjects.GameObject> => {
	switch (data.type) {
		case 'image':
			return O.some(createImage(state)(data));
		case 'text':
			return O.some(createText(state)(data));
		case 'container':
			return O.some(createContainer(state)(data));
		default:
			return O.none;
	}
};

const updateElement = <Msg>(
	data: Component<Msg>,
	state: ComponentState<Msg>
) => (
	gameObject: Phaser.GameObjects.GameObject
): Phaser.GameObjects.GameObject => {
		pipe(gameObject, applyBaseProps(data, state));

		if (data.type === 'text' && gameObject instanceof Phaser.GameObjects.Text) {
			gameObject.setText(data.text);
		}

		return gameObject;
	};

const getCurrentIds = <Msg>(data: Component<Msg>[]): Set<string> =>
	new Set(pipe(data, A.map((c) => c.id)));

const removeStaleComponents = <Msg>(currentIds: Set<string>) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	const updatedComponents = pipe(
		state.elements,
		R.filterWithIndex((id, gameObject) => {
			if (!currentIds.has(id)) {
				gameObject.destroy();
				state.eventHandlersAttached.delete(id);
				return false;
			}
			return true;
		})
	);

	return {
		...state,
		elements: updatedComponents,
	};
};

const syncComponent = <Msg>(componentData: Component<Msg>) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	const existingOption = pipe(
		state.elements,
		R.lookup(componentData.id)
	);

	return pipe(
		existingOption,
		O.fold(
			() => {
				const newElement = createComponent(state)(componentData);
				return pipe(
					newElement,
					O.fold(
						() => state,
						(gameObject) => ({
							...state,
							components: {
								...state.elements,
								[componentData.id]: gameObject,
							},
						})
					)
				);
			},
			(gameObject) => {
				pipe(gameObject, updateElement(componentData, state));
				return state;
			}
		)
	);
};

export const setData = <Msg>(newData: Component<Msg>[]) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	const currentIds = getCurrentIds(newData);

	return pipe(
		state,
		removeStaleComponents(currentIds),
		(s) => ({ ...s, data: newData }),
		(s) =>
			pipe(
				newData,
				A.reduce(s, (acc, componentData) => syncComponent(componentData)(acc))
			)
	);
};

export const getData = <Msg>(state: ComponentState<Msg>): Component<Msg>[] => state.data;

export const destroy = <Msg>(state: ComponentState<Msg>): ComponentState<Msg> => {
	pipe(
		state.elements,
		R.map((gameObject) => {
			gameObject.destroy();
			return gameObject;
		})
	);

	return {
		...state,
		elements: {},
		data: [],
		eventHandlersAttached: new Set<string>(),
	};
};

type DemoMsg =
	| { type: 'ImageClicked'; id: string; x: number; y: number }
	| { type: 'MoveImage'; id: string; dx: number; dy: number };

export const createReactiveDemo = (scene: Phaser.Scene) => {
	const update = (msg: DemoMsg, state: ComponentState<DemoMsg>): ComponentState<DemoMsg> => {
		switch (msg.type) {
			case 'ImageClicked':
				console.log(`Image ${msg.id} clicked at (${msg.x}, ${msg.y})`);
				const withMessage: ComponentState<DemoMsg> = enqueueMessages<DemoMsg>([
					{ type: 'MoveImage', id: msg.id, dx: 50, dy: 50 },
				])(state);
				return withMessage;

			case 'MoveImage':
				const updatedData = state.data.map((comp) =>
					comp.id === msg.id ? { ...comp, x: comp.x + msg.dx, y: comp.y + msg.dy } : comp
				);
				return setData<DemoMsg>(updatedData)(state);

			default:
				return state;
		}
	};

	let state = createComponentState<DemoMsg>(scene, update);

	const initialData: Component<DemoMsg>[] = [
		{
			id: 'image1',
			type: 'image',
			x: 100,
			y: 100,
			texture: 'ui/logo',
			alpha: 1,
			interactive: true,
			onClick: (pointer) => [
				{
					type: 'ImageClicked',
					id: 'image1',
					x: pointer.x,
					y: pointer.y,
				},
			],
		},
		{
			id: 'image2',
			type: 'image',
			x: 200,
			y: 200,
			texture: 'ui/logo',
			alpha: 1,
			interactive: true,
			onClick: (pointer) => [
				{
					type: 'ImageClicked',
					id: 'image2',
					x: pointer.x,
					y: pointer.y,
				},
			],
		},
	];

	state = setData<DemoMsg>(initialData)(state);

	scene.events.on('update', () => {
		state = processMessages<DemoMsg>(state);
	});

	return state;
};

export type { Component, ImageElement as ImageComponent, TextElement as TextComponent, ContainerElement as ContainerComponent, ComponentState as SystemState, ClickHandler };