import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';
import { pipe } from 'fp-ts/function';

// Message system - Each component can define its own messages
type Msg = unknown;

// Event handlers return messages
type ClickHandler<TMsg extends Msg> = (pointer: Phaser.Input.Pointer) => TMsg[];

// Component data structures
type ComponentType = 'image' | 'text' | 'container';

type BaseComponent<TMsg extends Msg = Msg> = {
	id: string;
	type: ComponentType;
	x: number;
	y: number;
	visible?: boolean;
	alpha?: number;
	rotation?: number;
	scale?: { x: number; y: number };
	// Event handlers
	onClick?: ClickHandler<TMsg>;
	interactive?: boolean;
};

type ImageComponent<TMsg extends Msg = Msg> = BaseComponent<TMsg> & {
	type: 'image';
	texture: string;
	frame?: string | number;
};

type TextComponent<TMsg extends Msg = Msg> = BaseComponent<TMsg> & {
	type: 'text';
	text: string;
	style?: Phaser.Types.GameObjects.Text.TextStyle;
};

type ContainerComponent<TMsg extends Msg = Msg> = BaseComponent<TMsg> & {
	type: 'container';
	children: Component<TMsg>[];
};

type Component<TMsg extends Msg = Msg> = ImageComponent<TMsg> | TextComponent<TMsg> | ContainerComponent<TMsg>;

// System state
type SystemState<TMsg extends Msg = Msg> = {
	scene: Phaser.Scene;
	components: Record<string, Phaser.GameObjects.GameObject>;
	data: Component<TMsg>[];
	messageQueue: TMsg[];
	update?: (msg: TMsg, state: SystemState<TMsg>) => SystemState<TMsg>;
};

// Create initial system state
export const createSystemState = <TMsg extends Msg = Msg>(
	scene: Phaser.Scene,
	update?: (msg: TMsg, state: SystemState<TMsg>) => SystemState<TMsg>
): SystemState<TMsg> => ({
	scene,
	components: {},
	data: [],
	messageQueue: [],
	update,
});

// Add messages to the queue
export const enqueueMessages = <TMsg extends Msg>(messages: TMsg[]) => (
	state: SystemState<TMsg>
): SystemState<TMsg> => ({
	...state,
	messageQueue: [...state.messageQueue, ...messages],
});

// Process all messages in the queue
export const processMessages = <TMsg extends Msg>(
	state: SystemState<TMsg>
): SystemState<TMsg> => {
	if (!state.update || state.messageQueue.length === 0) {
		return { ...state, messageQueue: [] };
	}

	const processedState = pipe(
		state.messageQueue,
		A.reduce<TMsg, SystemState<TMsg>>(
			state,
			(acc, msg) => (acc.update ? acc.update(msg, acc) : acc)
		)
	);

	return { ...processedState, messageQueue: [] };
};

// Apply base properties and event handlers to game object
const applyBaseProps = <T extends Phaser.GameObjects.GameObject, TMsg extends Msg>(
	data: BaseComponent<TMsg>,
	state: SystemState<TMsg>
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

		// Setup interactivity and event handlers
		if ((data.interactive || data.onClick) && 'setInteractive' in gameObject) {
			(gameObject as any).setInteractive();

			// Remove old listeners to avoid duplicates
			if ('removeAllListeners' in gameObject) {
				(gameObject as any).removeAllListeners();
			}

			// Add click handler
			if (data.onClick && 'on' in gameObject) {
				(gameObject as any).on('pointerdown', (pointer: Phaser.Input.Pointer) => {
					const messages = data.onClick!(pointer);
					// Mutate state to add messages - will be processed in next frame
					state.messageQueue.push(...messages);
				});
			}
		}

		return gameObject;
	};

// Create component game objects
const createImage = <TMsg extends Msg>(state: SystemState<TMsg>) => (
	data: ImageComponent<TMsg>
): Phaser.GameObjects.Image =>
	pipe(
		state.scene.add.image(data.x, data.y, data.texture, data.frame),
		applyBaseProps(data, state)
	);

const createText = <TMsg extends Msg>(state: SystemState<TMsg>) => (
	data: TextComponent<TMsg>
): Phaser.GameObjects.Text =>
	pipe(
		state.scene.add.text(data.x, data.y, data.text, data.style),
		applyBaseProps(data, state)
	);

const createContainer = <TMsg extends Msg>(state: SystemState<TMsg>) => (
	data: ContainerComponent<TMsg>
): Phaser.GameObjects.Container =>
	pipe(state.scene.add.container(data.x, data.y), applyBaseProps(data, state));

// Pattern match on component type
const createComponent = <TMsg extends Msg>(state: SystemState<TMsg>) => (
	data: Component<TMsg>
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

// Update existing game object with new data
const updateComponent = <TMsg extends Msg>(
	data: Component<TMsg>,
	state: SystemState<TMsg>
) => (
	gameObject: Phaser.GameObjects.GameObject
): Phaser.GameObjects.GameObject => {
		pipe(gameObject, applyBaseProps(data, state));

		// Update type-specific properties
		if (data.type === 'text' && gameObject instanceof Phaser.GameObjects.Text) {
			gameObject.setText(data.text);
		}

		return gameObject;
	};

// Get current component IDs from data
const getCurrentIds = <TMsg extends Msg>(data: Component<TMsg>[]): Set<string> =>
	new Set(pipe(data, A.map((c) => c.id)));

// Remove components no longer in data
const removeStaleComponents = <TMsg extends Msg>(currentIds: Set<string>) => (
	state: SystemState<TMsg>
): SystemState<TMsg> => {
	const updatedComponents = pipe(
		state.components,
		R.filterWithIndex((id, gameObject) => {
			if (!currentIds.has(id)) {
				gameObject.destroy();
				return false;
			}
			return true;
		})
	);

	return {
		...state,
		components: updatedComponents,
	};
};

// Sync a single component (create or update)
const syncComponent = <TMsg extends Msg>(componentData: Component<TMsg>) => (
	state: SystemState<TMsg>
): SystemState<TMsg> => {
	const existingOption = pipe(
		state.components,
		R.lookup(componentData.id)
	);

	return pipe(
		existingOption,
		O.fold(
			// Create new component
			() => {
				const newComponent = createComponent(state)(componentData);
				return pipe(
					newComponent,
					O.fold(
						() => state,
						(gameObject) => ({
							...state,
							components: {
								...state.components,
								[componentData.id]: gameObject,
							},
						})
					)
				);
			},
			// Update existing component
			(gameObject) => {
				pipe(gameObject, updateComponent(componentData, state));
				return state;
			}
		)
	);
};

// Update system state with new data
export const setData = <TMsg extends Msg>(newData: Component<TMsg>[]) => (
	state: SystemState<TMsg>
): SystemState<TMsg> => {
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

// Get current data
export const getData = <TMsg extends Msg>(state: SystemState<TMsg>): Component<TMsg>[] => state.data;

// Destroy all components
export const destroy = <TMsg extends Msg>(state: SystemState<TMsg>): SystemState<TMsg> => {
	pipe(
		state.components,
		R.map((gameObject) => {
			gameObject.destroy();
			return gameObject;
		})
	);

	return {
		...state,
		components: {},
		data: [],
	};
};

// Example usage / Proof of concept with events
type DemoMsg =
	| { type: 'ImageClicked'; id: string; x: number; y: number }
	| { type: 'MoveImage'; id: string; dx: number; dy: number };

export const createReactiveDemo = (scene: Phaser.Scene) => {
	// Update function - handles messages and returns new state
	const update = (msg: DemoMsg, state: SystemState<DemoMsg>): SystemState<DemoMsg> => {
		switch (msg.type) {
			case 'ImageClicked':
				console.log(`Image ${msg.id} clicked at (${msg.x}, ${msg.y})`);
				// Move the clicked image by enqueueing a new message
				const withMessage: SystemState<DemoMsg> = enqueueMessages<DemoMsg>([
					{ type: 'MoveImage', id: msg.id, dx: 50, dy: 50 },
				])(state);
				return withMessage;

			case 'MoveImage':
				// Update the component position
				const updatedData = state.data.map((comp) =>
					comp.id === msg.id ? { ...comp, x: comp.x + msg.dx, y: comp.y + msg.dy } : comp
				);
				return setData<DemoMsg>(updatedData)(state);

			default:
				return state;
		}
	};

	let state = createSystemState<DemoMsg>(scene, update);

	// Initial data: two clickable images
	const initialData: Component<DemoMsg>[] = [
		{
			id: 'image1',
			type: 'image',
			x: 100,
			y: 100,
			texture: 'your-texture-key', // Replace with actual texture key
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
			texture: 'your-texture-key', // Replace with actual texture key
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

	// Process messages every frame
	scene.events.on('update', () => {
		state = processMessages<DemoMsg>(state);
	});

	return state;
};

export type { Component, ImageComponent, TextComponent, ContainerComponent, SystemState, Msg, ClickHandler };