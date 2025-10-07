/**
 * Built-in Mana actions and message types
 * 
 * These are common operations that can be composed with user message types:
 * type MyMsg = ManaMsg | { type: 'MY_CUSTOM_ACTION', payload: string };
 */

import type { ComponentState } from './types';

/**
 * Action to redraw a shape element with new properties
 */
export type RedrawShapeAction = {
	readonly type: '@mana/REDRAW_SHAPE';
	readonly elementId: string;
	readonly properties: {
		readonly fillColor?: number;
		readonly fillAlpha?: number;
		readonly strokeColor?: number;
		readonly strokeWidth?: number;
		readonly strokeAlpha?: number;
		// Shape-specific properties
		readonly width?: number;
		readonly height?: number;
		readonly radius?: number; // For circles and rounded rectangles
	};
};

/**
 * Action to update element properties
 */
export type UpdateElementAction = {
	readonly type: '@mana/UPDATE_ELEMENT';
	readonly elementId: string;
	readonly properties: {
		readonly x?: number;
		readonly y?: number;
		readonly alpha?: number;
		readonly visible?: boolean;
		readonly rotation?: number;
		readonly scale?: { readonly x: number; readonly y: number };
	};
};

/**
 * Union type of all built-in Mana messages
 */
export type ManaMsg = RedrawShapeAction | UpdateElementAction;

/**
 * Helper to create a redraw shape action
 */
export const redrawShape = (
	elementId: string,
	properties: RedrawShapeAction['properties']
): RedrawShapeAction => ({
	type: '@mana/REDRAW_SHAPE',
	elementId,
	properties,
});

/**
 * Helper to create an update element action
 */
export const updateElement = (
	elementId: string,
	properties: UpdateElementAction['properties']
): UpdateElementAction => ({
	type: '@mana/UPDATE_ELEMENT',
	elementId,
	properties,
});

/**
 * Helper to redraw a rectangle with a new fill color
 */
export const setFillColor = (elementId: string, fillColor: number): RedrawShapeAction => ({
	type: '@mana/REDRAW_SHAPE',
	elementId,
	properties: { fillColor },
});

/**
 * Helper to change element visibility
 */
export const setVisible = (elementId: string, visible: boolean): UpdateElementAction => ({
	type: '@mana/UPDATE_ELEMENT',
	elementId,
	properties: { visible },
});

/**
 * Helper to move an element to a new position
 */
export const moveTo = (elementId: string, x: number, y: number): UpdateElementAction => ({
	type: '@mana/UPDATE_ELEMENT',
	elementId,
	properties: { x, y },
});

/**
 * Built-in handler for Mana messages
 * Processes common operations like redrawing shapes
 * 
 * Usage in your update function:
 * ```typescript
 * const update = (msg: ManaMsg | MyMsg, state: ComponentState<ManaMsg | MyMsg>) => {
 *   // Handle Mana messages first
 *   const newState = handleManaMsg(msg, state);
 *   if (newState !== state) return newState; // Message was handled
 *   
 *   // Handle your custom messages
 *   switch (msg.type) {
 *     case 'MY_ACTION':
 *       // ... your logic
 *   }
 *   return state;
 * };
 * ```
 */
export const handleManaMsg = <Msg extends ManaMsg>(
	msg: Msg,
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	switch (msg.type) {
		case '@mana/REDRAW_SHAPE': {
			const element = state.elements[msg.elementId];
			if (!element || !('clear' in element)) {
				console.warn(`[Mana] Cannot redraw element: ${msg.elementId} not found or not a graphics object`);
				return state;
			}

			const graphics = element as Phaser.GameObjects.Graphics;
			const data = state.data.find(d => d.id === msg.elementId) as any;
			
			if (!data) {
				console.warn(`[Mana] Cannot redraw element: ${msg.elementId} data not found`);
				return state;
			}

			// Merge new properties with existing data
			const mergedProps = { ...data, ...msg.properties };

			// Clear and redraw based on element type
			graphics.clear();

			switch (data.type) {
				case 'rect': {
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillRect(
							-mergedProps.width / 2,
							-mergedProps.height / 2,
							mergedProps.width,
							mergedProps.height
						);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeRect(
							-mergedProps.width / 2,
							-mergedProps.height / 2,
							mergedProps.width,
							mergedProps.height
						);
					}
					break;
				}
				case 'roundrect': {
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillRoundedRect(
							-mergedProps.width / 2,
							-mergedProps.height / 2,
							mergedProps.width,
							mergedProps.height,
							mergedProps.radius
						);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeRoundedRect(
							-mergedProps.width / 2,
							-mergedProps.height / 2,
							mergedProps.width,
							mergedProps.height,
							mergedProps.radius
						);
					}
					break;
				}
				case 'circle': {
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillCircle(0, 0, mergedProps.radius);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeCircle(0, 0, mergedProps.radius);
					}
					break;
				}
				case 'ellipse': {
					if (mergedProps.fillColor !== undefined) {
						graphics.fillStyle(mergedProps.fillColor, mergedProps.fillAlpha ?? 1);
						graphics.fillEllipse(0, 0, mergedProps.width, mergedProps.height);
					}
					if (mergedProps.strokeColor !== undefined) {
						graphics.lineStyle(mergedProps.strokeWidth ?? 1, mergedProps.strokeColor, mergedProps.strokeAlpha ?? 1);
						graphics.strokeEllipse(0, 0, mergedProps.width, mergedProps.height);
					}
					break;
				}
			}

			return state;
		}

		case '@mana/UPDATE_ELEMENT': {
			const element = state.elements[msg.elementId];
			if (!element) {
				console.warn(`[Mana] Cannot update element: ${msg.elementId} not found`);
				return state;
			}

			const props = msg.properties;
			
			// Cast to any to access common game object properties
			const gameObject = element as any;
			
			if (props.x !== undefined || props.y !== undefined) {
				if (gameObject.setPosition) {
					gameObject.setPosition(
						props.x ?? gameObject.x,
						props.y ?? gameObject.y
					);
				}
			}
			if (props.alpha !== undefined && gameObject.setAlpha) {
				gameObject.setAlpha(props.alpha);
			}
			if (props.visible !== undefined && gameObject.setVisible) {
				gameObject.setVisible(props.visible);
			}
			if (props.rotation !== undefined && gameObject.setRotation) {
				gameObject.setRotation(props.rotation);
			}
			if (props.scale !== undefined && gameObject.setScale) {
				gameObject.setScale(props.scale.x, props.scale.y);
			}

			return state;
		}

		default:
			return state;
	}
};
