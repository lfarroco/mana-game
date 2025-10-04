type ClickHandler<Msg> = (pointer: Phaser.Input.Pointer) => Msg[];

type BaseElement<Msg> = {
	id: string;
	type: 'image' | 'text' | 'container';
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
	subscribers: Array<(msg: Msg) => void>;
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
	eventHandlersAttached: new Set(),
	subscribers: [],
});

export const enqueueMessages = <Msg>(messages: Msg[]) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => ({
	...state,
	messageQueue: [...state.messageQueue, ...messages],
});

export const subscribe = <Msg>(callback: (msg: Msg) => void) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => ({
	...state,
	subscribers: [...state.subscribers, callback],
});

const emitToSubscribers = <Msg>(msg: Msg, subscribers: Array<(msg: Msg) => void>): void => {
	subscribers.forEach(sub => sub(msg));
};

export const processMessages = <Msg>(
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	if (!state.update || state.messageQueue.length === 0) {
		return { ...state, messageQueue: [] };
	}

	let currentState = state;
	for (const msg of state.messageQueue) {
		emitToSubscribers(msg, currentState.subscribers);
		if (currentState.update) {
			currentState = currentState.update(msg, currentState);
		}
	}

	return { ...currentState, messageQueue: [] };
};

const applyBaseProps = <T extends Phaser.GameObjects.GameObject, Msg>(
	gameObject: T,
	data: BaseElement<Msg>,
	state: ComponentState<Msg>
): void => {
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
		}

		if (data.onClick && 'on' in go && !state.eventHandlersAttached.has(data.id)) {
			go.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
				const messages = data.onClick!(pointer);
				messages.forEach(msg => emitToSubscribers(msg, state.subscribers));
			});
			state.eventHandlersAttached.add(data.id);
		}
	}
};

const createImage = <Msg>(state: ComponentState<Msg>, data: ImageElement<Msg>): Phaser.GameObjects.Image => {
	const img = state.scene.add.image(data.x, data.y, data.texture);
	applyBaseProps(img, data, state);
	return img;
};

const createText = <Msg>(state: ComponentState<Msg>, data: TextElement<Msg>): Phaser.GameObjects.Text => {
	const text = state.scene.add.text(data.x, data.y, data.text, data.style);
	applyBaseProps(text, data, state);
	return text;
};

const createContainer = <Msg>(state: ComponentState<Msg>, data: ContainerElement<Msg>): Phaser.GameObjects.Container => {
	const container = state.scene.add.container(data.x, data.y);
	applyBaseProps(container, data, state);
	return container;
};

const createComponent = <Msg>(state: ComponentState<Msg>, data: Component<Msg>): Phaser.GameObjects.GameObject | null => {
	switch (data.type) {
		case 'image': return createImage(state, data);
		case 'text': return createText(state, data);
		case 'container': return createContainer(state, data);
		default: return null;
	}
};

const updateElement = <Msg>(gameObject: Phaser.GameObjects.GameObject, data: Component<Msg>, state: ComponentState<Msg>): void => {
	applyBaseProps(gameObject, data, state);
	if (data.type === 'text' && gameObject instanceof Phaser.GameObjects.Text) {
		gameObject.setText(data.text);
	}
};

const syncComponent = <Msg>(state: ComponentState<Msg>, componentData: Component<Msg>): void => {
	const existing = state.elements[componentData.id];

	if (existing) {
		updateElement(existing, componentData, state);
	} else {
		const newElement = createComponent(state, componentData);
		if (newElement) {
			state.elements[componentData.id] = newElement;
		}
	}
};

export const setData = <Msg>(newData: Component<Msg>[]) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	const currentIds = new Set(newData.map(c => c.id));

	for (const id in state.elements) {
		if (!currentIds.has(id)) {
			state.elements[id].destroy();
			state.eventHandlersAttached.delete(id);
			delete state.elements[id];
		}
	}

	for (const componentData of newData) {
		syncComponent(state, componentData);
	}

	return { ...state, data: newData };
};

export const getData = <Msg>(state: ComponentState<Msg>): Component<Msg>[] => state.data;

export const destroy = <Msg>(state: ComponentState<Msg>): ComponentState<Msg> => {
	for (const id in state.elements) {
		state.elements[id].destroy();
	}

	return {
		...state,
		elements: {},
		data: [],
		eventHandlersAttached: new Set(),
		subscribers: [],
	};
};

export type { Component, ImageElement as ImageComponent, TextElement as TextComponent, ContainerElement as ContainerComponent, ComponentState as SystemState, ClickHandler };