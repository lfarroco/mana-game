/**
 * Core type definitions for the Mana reactive rendering library
 */

/**
 * Handler for click events that produces messages
 */
export type ClickHandler<Msg> = (pointer: Phaser.Input.Pointer) => readonly Msg[];

/**
 * Handler for hover events
 */
export type HoverHandler<Msg> = (pointer: Phaser.Input.Pointer) => readonly Msg[];

/**
 * Handler for mount lifecycle events
 */
export type MountHandler = (gameObject: Phaser.GameObjects.GameObject) => void;

/**
 * Base properties shared by all elements
 */
export type BaseElement<Msg> = {
	readonly id: string;
	readonly type: 'image' | 'text' | 'container' | 'graphics' | 'rect' | 'roundrect' | 'circle' | 'ellipse';
	readonly x: number;
	readonly y: number;
	readonly visible?: boolean;
	readonly alpha?: number;
	readonly rotation?: number;
	readonly scale?: { readonly x: number; readonly y: number };
	readonly interactive?: boolean;
	readonly onClick?: ClickHandler<Msg>;
	readonly onHover?: HoverHandler<Msg>;
	readonly onHoverOut?: HoverHandler<Msg>;
	readonly onMount?: MountHandler;
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
 * Shape definitions for graphics elements
 */
export type RectangleShape = {
	readonly type: 'rectangle';
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

export type RoundedRectangleShape = {
	readonly type: 'roundedRectangle';
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly radius: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

export type CircleShape = {
	readonly type: 'circle';
	readonly x: number;
	readonly y: number;
	readonly radius: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

export type EllipseShape = {
	readonly type: 'ellipse';
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

export type LineShape = {
	readonly type: 'line';
	readonly x1: number;
	readonly y1: number;
	readonly x2: number;
	readonly y2: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

export type PolygonShape = {
	readonly type: 'polygon';
	readonly points: readonly { readonly x: number; readonly y: number }[];
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

export type ArcShape = {
	readonly type: 'arc';
	readonly x: number;
	readonly y: number;
	readonly radius: number;
	readonly startAngle: number;
	readonly endAngle: number;
	readonly anticlockwise?: boolean;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

export type TriangleShape = {
	readonly type: 'triangle';
	readonly x1: number;
	readonly y1: number;
	readonly x2: number;
	readonly y2: number;
	readonly x3: number;
	readonly y3: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
};

/**
 * Union type of all shape definitions
 */
export type Shape =
	| RectangleShape
	| RoundedRectangleShape
	| CircleShape
	| EllipseShape
	| LineShape
	| PolygonShape
	| ArcShape
	| TriangleShape;

/**
 * Graphics element for drawing shapes
 */
export type GraphicsElement<Msg> = BaseElement<Msg> & {
	readonly type: 'graphics';
	readonly shapes: readonly Shape[];
	readonly hitArea?: {
		readonly shape: Phaser.Geom.Rectangle | Phaser.Geom.Circle | Phaser.Geom.Polygon;
		readonly callback: Phaser.Types.Input.HitAreaCallback;
	};
};

/**
 * Rectangle shape element
 */
export type RectangleElement<Msg> = BaseElement<Msg> & {
	readonly type: 'rect';
	readonly width: number;
	readonly height: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
	readonly hitArea?: {
		readonly shape: Phaser.Geom.Rectangle | Phaser.Geom.Circle | Phaser.Geom.Polygon;
		readonly callback: Phaser.Types.Input.HitAreaCallback;
	};
};

/**
 * Rounded rectangle shape element
 */
export type RoundedRectangleElement<Msg> = BaseElement<Msg> & {
	readonly type: 'roundrect';
	readonly width: number;
	readonly height: number;
	readonly radius: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
	readonly hitArea?: {
		readonly shape: Phaser.Geom.Rectangle | Phaser.Geom.Circle | Phaser.Geom.Polygon;
		readonly callback: Phaser.Types.Input.HitAreaCallback;
	};
};

/**
 * Circle shape element
 */
export type CircleElement<Msg> = BaseElement<Msg> & {
	readonly type: 'circle';
	readonly radius: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
	readonly hitArea?: {
		readonly shape: Phaser.Geom.Rectangle | Phaser.Geom.Circle | Phaser.Geom.Polygon;
		readonly callback: Phaser.Types.Input.HitAreaCallback;
	};
};

/**
 * Ellipse shape element
 */
export type EllipseElement<Msg> = BaseElement<Msg> & {
	readonly type: 'ellipse';
	readonly width: number;
	readonly height: number;
	readonly fillColor?: number;
	readonly fillAlpha?: number;
	readonly strokeColor?: number;
	readonly strokeWidth?: number;
	readonly strokeAlpha?: number;
	readonly hitArea?: {
		readonly shape: Phaser.Geom.Rectangle | Phaser.Geom.Circle | Phaser.Geom.Polygon;
		readonly callback: Phaser.Types.Input.HitAreaCallback;
	};
};

/**
 * Union type of all element types
 */
export type Element<Msg> =
	| ImageElement<Msg>
	| TextElement<Msg>
	| ContainerElement<Msg>
	| GraphicsElement<Msg>
	| RectangleElement<Msg>
	| RoundedRectangleElement<Msg>
	| CircleElement<Msg>
	| EllipseElement<Msg>;

/**
 * State management for the component system
 */
export type ComponentState<Msg> = {
	readonly scene: Phaser.Scene;
	elements: Record<string, Phaser.GameObjects.GameObject>;
	elementData: Map<string, Element<Msg>>;
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
