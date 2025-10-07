/**
 * Core type definitions for the Mana reactive rendering library
 */

/**
 * Handler for click events that produces messages
 */
export type ClickHandler<Msg> = (pointer: Phaser.Input.Pointer) => readonly Msg[];

/**
 * Base properties shared by all elements
 */
export type BaseElement<Msg> = {
	readonly id: string;
	readonly type: 'image' | 'text' | 'container';
	readonly x: number;
	readonly y: number;
	readonly visible?: boolean;
	readonly alpha?: number;
	readonly rotation?: number;
	readonly scale?: { readonly x: number; readonly y: number };
	readonly interactive?: boolean;
	readonly onClick?: ClickHandler<Msg>;
};

/**
 * Image element with texture
 */
export type ImageElement<Msg> = BaseElement<Msg> & {
	readonly type: 'image';
	readonly texture: string;
	readonly frame?: string | number;
};

/**
 * Text element with content and styling
 */
export type TextElement<Msg> = BaseElement<Msg> & {
	readonly type: 'text';
	readonly text: string;
	readonly style?: Phaser.Types.GameObjects.Text.TextStyle;
};

/**
 * Container element that can hold children
 */
export type ContainerElement<Msg> = BaseElement<Msg> & {
	readonly type: 'container';
	readonly children: readonly Element<Msg>[];
};

/**
 * Union type of all element types
 */
export type Element<Msg> = ImageElement<Msg> | TextElement<Msg> | ContainerElement<Msg>;

/**
 * State management for the component system
 */
export type ComponentState<Msg> = {
	readonly scene: Phaser.Scene;
	elements: Record<string, Phaser.GameObjects.GameObject>;
	data: readonly Element<Msg>[];
	messageQueue: readonly Msg[];
	update?: (msg: Msg, state: ComponentState<Msg>) => ComponentState<Msg>;
	eventHandlersAttached: Set<string>;
	subscribers: ReadonlyArray<(msg: Msg) => void>;
	updateHandler?: () => void;
};

/**
 * Helper type to extract the message type from a ComponentState
 */
export type MessageType<T> = T extends ComponentState<infer Msg> ? Msg : never;

/**
 * Helper type for component with extended properties
 */
export type ExtendedElement<Msg, Props = {}> = Element<Msg> & Props;