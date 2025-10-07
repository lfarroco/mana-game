/**
 * Core type definitions for the Mana reactive rendering library
 */

/**
 * Handler for click events that produces messages
 */
export type ClickHandler<Msg> = (pointer: Phaser.Input.Pointer) => Msg[];

/**
 * Base properties shared by all elements
 */
export type BaseElement<Msg> = {
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

/**
 * Image element with texture
 */
export type ImageElement<Msg> = BaseElement<Msg> & {
	type: 'image';
	texture: string;
};

/**
 * Text element with content and styling
 */
export type TextElement<Msg> = BaseElement<Msg> & {
	type: 'text';
	text: string;
	style?: Phaser.Types.GameObjects.Text.TextStyle;
};

/**
 * Container element that can hold children
 */
export type ContainerElement<Msg> = BaseElement<Msg> & {
	type: 'container';
	children: Element<Msg>[];
};

/**
 * Union type of all element types
 */
export type Element<Msg> = ImageElement<Msg> | TextElement<Msg> | ContainerElement<Msg>;

/**
 * State management for the component system
 */
export type ComponentState<Msg> = {
	scene: Phaser.Scene;
	elements: Record<string, Phaser.GameObjects.GameObject>;
	data: Element<Msg>[];
	messageQueue: Msg[];
	update?: (msg: Msg, state: ComponentState<Msg>) => ComponentState<Msg>;
	eventHandlersAttached: Set<string>;
	subscribers: Array<(msg: Msg) => void>;
	updateHandler?: () => void;
};