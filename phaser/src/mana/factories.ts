/**
 * Component factory functions for creating Phaser game objects
 */

import type { ComponentState, ImageElement, TextElement, ContainerElement, GraphicsElement, Shape } from './types';
import { applyBaseProps } from './properties';
import { callMountHooks } from './lifecycle';
import { validateTexture, validateClickHandler } from './validation';

/**
 * Factory function type for creating game objects
 */
export type ComponentFactory<Msg> = (
	state: ComponentState<Msg>,
	data: any
) => Phaser.GameObjects.GameObject | null;

/**
 * Registry of component factories by type
 */
const factoryRegistry: Record<string, ComponentFactory<any>> = {};

/**
 * Create an image game object
 */
export const createImage = <Msg>(
	state: ComponentState<Msg>,
	data: ImageElement<Msg>
): Phaser.GameObjects.Image => {
	validateTexture(state.scene, data.texture);
	validateClickHandler(data);

	const img = state.scene.add.image(data.x, data.y, data.texture, data.frame);
	applyBaseProps(img, data, state);
	callMountHooks(img, data, state);
	return img;
};

/**
 * Create a text game object
 */
export const createText = <Msg>(
	state: ComponentState<Msg>,
	data: TextElement<Msg>
): Phaser.GameObjects.Text => {
	const text = state.scene.add.text(data.x, data.y, data.text, data.style);
	applyBaseProps(text, data, state);
	callMountHooks(text, data, state);
	return text;
};

/**
 * Create a container game object
 */
export const createContainer = <Msg>(
	state: ComponentState<Msg>,
	data: ContainerElement<Msg>
): Phaser.GameObjects.Container => {
	const container = state.scene.add.container(data.x, data.y);

	// Create and add children
	if (data.children && data.children.length > 0) {
		for (const childData of data.children) {
			const child = createComponent(state, childData);
			if (child) {
				container.add(child);
				// Also track children in state.elements
				state.elements[childData.id] = child;
			}
		}
	}

	applyBaseProps(container, data, state);
	callMountHooks(container, data, state);
	return container;
};

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
 * Create a graphics game object
 */
export const createGraphics = <Msg>(
	state: ComponentState<Msg>,
	data: GraphicsElement<Msg>
): Phaser.GameObjects.Graphics => {
	const graphics = state.scene.add.graphics({ x: data.x, y: data.y });

	// Clear and draw all shapes
	graphics.clear();
	for (const shape of data.shapes) {
		drawShape(graphics, shape);
	}

	applyBaseProps(graphics, data, state);
	callMountHooks(graphics, data, state);
	return graphics;
};

/**
 * Create a component for supported game object types
 * Checks the factory registry first, then falls back to built-in types
 */
export const createComponent = <Msg>(
	state: ComponentState<Msg>,
	data: any
): Phaser.GameObjects.GameObject | null => {
	// Check custom factories first
	const customFactory = factoryRegistry[data.type];
	if (customFactory) {
		return customFactory(state, data);
	}

	// Fall back to built-in types
	switch (data.type) {
		case 'image':
			return createImage(state, data);
		case 'text':
			return createText(state, data);
		case 'container':
			return createContainer(state, data);
		case 'graphics':
			return createGraphics(state, data);
		default:
			console.warn(`[Mana] Unknown component type: ${data.type}`);
			return null;
	}
};

/**
 * Register a custom component factory
 * Allows extending the system with new component types
 *
 * @example
 * registerComponentFactory('sprite', (state, data) => {
 *   const sprite = state.scene.add.sprite(data.x, data.y, data.texture);
 *   applyBaseProps(sprite, data, state);
 *   return sprite;
 * });
 */
export const registerComponentFactory = <Msg>(
	type: string,
	factory: ComponentFactory<Msg>
): void => {
	factoryRegistry[type] = factory;
};