/**
 * Rendering and synchronization logic for components
 */

import type { Element, ComponentState, Shape } from './types';
import { createComponent } from './factories';
import { applyBaseProps } from './properties';
import { callUnmountHooks } from './lifecycle';
import { elementsEqual } from './utils';
import { validateElements, checkPerformance, validateState } from './validation';

/**
 * Draw a single shape on the graphics object
 */
const drawShape = (graphics: Phaser.GameObjects.Graphics, shape: Shape): void => {
	switch (shape.type) {
		case 'rectangle': {
			if (shape.fillColor !== undefined) {
				graphics.fillStyle(shape.fillColor, shape.fillAlpha ?? 1);
				graphics.fillRect(shape.x, shape.y, shape.width, shape.height);
			}
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.strokeRect(shape.x, shape.y, shape.width, shape.height);
			}
			break;
		}
		case 'roundedRectangle': {
			if (shape.fillColor !== undefined) {
				graphics.fillStyle(shape.fillColor, shape.fillAlpha ?? 1);
				graphics.fillRoundedRect(shape.x, shape.y, shape.width, shape.height, shape.radius);
			}
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.strokeRoundedRect(shape.x, shape.y, shape.width, shape.height, shape.radius);
			}
			break;
		}
		case 'circle': {
			if (shape.fillColor !== undefined) {
				graphics.fillStyle(shape.fillColor, shape.fillAlpha ?? 1);
				graphics.fillCircle(shape.x, shape.y, shape.radius);
			}
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.strokeCircle(shape.x, shape.y, shape.radius);
			}
			break;
		}
		case 'ellipse': {
			if (shape.fillColor !== undefined) {
				graphics.fillStyle(shape.fillColor, shape.fillAlpha ?? 1);
				graphics.fillEllipse(shape.x, shape.y, shape.width, shape.height);
			}
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.strokeEllipse(shape.x, shape.y, shape.width, shape.height);
			}
			break;
		}
		case 'line': {
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.lineBetween(shape.x1, shape.y1, shape.x2, shape.y2);
			}
			break;
		}
		case 'polygon': {
			if (shape.fillColor !== undefined) {
				graphics.fillStyle(shape.fillColor, shape.fillAlpha ?? 1);
				graphics.fillPoints(shape.points as any, true);
			}
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.strokePoints(shape.points as any, true);
			}
			break;
		}
		case 'arc': {
			if (shape.fillColor !== undefined) {
				graphics.fillStyle(shape.fillColor, shape.fillAlpha ?? 1);
				graphics.slice(shape.x, shape.y, shape.radius, shape.startAngle, shape.endAngle, shape.anticlockwise);
				graphics.fillPath();
			}
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.arc(shape.x, shape.y, shape.radius, shape.startAngle, shape.endAngle, shape.anticlockwise);
				graphics.strokePath();
			}
			break;
		}
		case 'triangle': {
			if (shape.fillColor !== undefined) {
				graphics.fillStyle(shape.fillColor, shape.fillAlpha ?? 1);
				graphics.fillTriangle(shape.x1, shape.y1, shape.x2, shape.y2, shape.x3, shape.y3);
			}
			if (shape.strokeColor !== undefined) {
				graphics.lineStyle(shape.strokeWidth ?? 1, shape.strokeColor, shape.strokeAlpha ?? 1);
				graphics.strokeTriangle(shape.x1, shape.y1, shape.x2, shape.y2, shape.x3, shape.y3);
			}
			break;
		}
	}
};

/**
 * Update handler type that can be extended for custom update logic
 */
export type UpdateHandler<Msg> = (
	gameObject: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
) => void;

/**
 * Registry of update handlers by component type
 */
const updateHandlerRegistry: Record<string, UpdateHandler<any>> = {};

/**
 * Default update handler for text components
 */
const updateTextElement: UpdateHandler<any> = (gameObject, data) => {
	if (data.type === 'text' && 'setText' in gameObject) {
		(gameObject as any).setText(data.text);
	}
};

/**
 * Default update handler for container components
 * Handles updating children within the container
 */
const updateContainerElement: UpdateHandler<any> = (gameObject, data, state) => {
	if (data.type === 'container' && 'list' in gameObject) {
		const container = gameObject as Phaser.GameObjects.Container;
		const containerData = data as any;

		if (!containerData.children) return;

		// Get current children IDs
		const currentChildIds = new Set(containerData.children.map((c: any) => c.id));
		const existingChildIds = new Set(
			container.list
				.map((child: any) => {
					// Find the ID from state.elements
					for (const [id, element] of Object.entries(state.elements)) {
						if (element === child) return id;
					}
					return null;
				})
				.filter(Boolean)
		);

		// Remove children no longer in the data
		for (const childId of existingChildIds) {
			if (!currentChildIds.has(childId as string)) {
				const element = state.elements[childId as string];
				if (element) {
					container.remove(element);
					element.destroy();
					delete state.elements[childId as string];
				}
			}
		}

		// Update or create children
		container.removeAll(false); // Don't destroy, just remove
		for (const childData of containerData.children) {
			const existing = state.elements[childData.id];
			if (existing) {
				// Update existing child
				const oldChildData = state.data.find((d: any) => d.id === childData.id);
				if (!oldChildData || !elementsEqual(oldChildData, childData)) {
					applyBaseProps(existing, childData, state);
				}
				container.add(existing);
			} else {
				// Create new child
				const newChild = createComponent(state, childData);
				if (newChild) {
					state.elements[childData.id] = newChild;
					container.add(newChild);
				}
			}
		}
	}
};

/**
 * Default update handler for graphics components
 */
const updateGraphicsElement: UpdateHandler<any> = (gameObject, data) => {
	if (data.type === 'graphics' && 'clear' in gameObject) {
		const graphics = gameObject as Phaser.GameObjects.Graphics;
		const graphicsData = data as any;

		// Clear and redraw all shapes
		graphics.clear();
		if (graphicsData.shapes && Array.isArray(graphicsData.shapes)) {
			for (const shape of graphicsData.shapes) {
				drawShape(graphics, shape);
			}
		}
	}
};

/**
 * Register built-in update handlers
 */
const registerBuiltInUpdateHandlers = (): void => {
	updateHandlerRegistry['text'] = updateTextElement;
	updateHandlerRegistry['container'] = updateContainerElement;
	updateHandlerRegistry['graphics'] = updateGraphicsElement;
};

// Initialize built-in handlers
registerBuiltInUpdateHandlers();

/**
 * Register a custom update handler for a component type
 * Allows extending update logic for custom or existing component types
 *
 * @example
 * registerUpdateHandler('sprite', (gameObject, data, state) => {
 *   if ('play' in gameObject && data.animation) {
 *     gameObject.play(data.animation);
 *   }
 * });
 */
export const registerUpdateHandler = <Msg>(
	type: string,
	handler: UpdateHandler<Msg>
): void => {
	updateHandlerRegistry[type] = handler;
};

/**
 * Update an existing element with new data
 */
const updateElement = <Msg>(
	gameObject: Phaser.GameObjects.GameObject,
	data: Element<Msg>,
	state: ComponentState<Msg>
): void => {
	// Apply base properties
	applyBaseProps(gameObject, data, state);

	// Apply type-specific updates
	const handler = updateHandlerRegistry[data.type];
	if (handler) {
		handler(gameObject, data, state);
	}
};

/**
 * Synchronize a component with its data
 * Creates new elements or updates existing ones
 * Skips updates if element data hasn't changed (optimization)
 */
const syncComponent = <Msg>(
	state: ComponentState<Msg>,
	componentData: Element<Msg>
): void => {
	const existing = state.elements[componentData.id];

	if (existing) {
		// Check if update is needed by comparing with cached data
		const oldData = state.data.find(d => d.id === componentData.id);

		// Skip update if data hasn't changed (optimization)
		if (oldData && elementsEqual(oldData, componentData)) {
			return;
		}

		updateElement(existing, componentData, state);
	} else {
		const newElement = createComponent(state, componentData);
		if (newElement) {
			state.elements[componentData.id] = newElement;
		}
	}
};

/**
 * Set new component data and synchronize all elements
 * Removes elements that are no longer in the data
 * Creates or updates elements as needed
 */
export const setData = <Msg>(newData: readonly Element<Msg>[]) => (
	state: ComponentState<Msg>
): ComponentState<Msg> => {
	// Validate elements in development mode
	validateElements(newData);

	const currentIds = new Set(newData.map(c => c.id));

	// Remove elements that are no longer present
	for (const id in state.elements) {
		if (!currentIds.has(id)) {
			const element = state.elements[id];
			const oldData = state.data.find(d => d.id === id);

			// Call unmount hooks before destroying
			if (oldData) {
				callUnmountHooks(element, oldData, state);
			}

			element.destroy();
			state.eventHandlersAttached.delete(id);
			delete state.elements[id];
		}
	}

	// Create or update all current elements
	for (const componentData of newData) {
		syncComponent(state, componentData);
	}

	const newState = { ...state, data: newData };

	// Check for performance issues and state consistency
	checkPerformance(newState);
	validateState(newState);

	return newState;
};