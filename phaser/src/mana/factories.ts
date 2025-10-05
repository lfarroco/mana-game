/**
 * Component factory functions for creating Phaser game objects
 */

import type { ComponentState, ImageElement, TextElement, ContainerElement } from './types';
import { applyBaseProps } from './properties';

/**
 * Factory function type for creating game objects
 */
export type ComponentFactory<Msg> = (
	state: ComponentState<Msg>,
	data: any
) => Phaser.GameObjects.GameObject | null;

/**
 * Registry of component factories by type
 * Allows registering custom component types
 */
const factoryRegistry: Record<string, ComponentFactory<any>> = {};

/**
 * Create an image game object
 */
export const createImage = <Msg>(
	state: ComponentState<Msg>,
	data: ImageElement<Msg>
): Phaser.GameObjects.Image => {
	const img = state.scene.add.image(data.x, data.y, data.texture);
	applyBaseProps(img, data, state);
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
	applyBaseProps(container, data, state);
	return container;
};

/**
 * Register built-in factories
 */
const registerBuiltInFactories = (): void => {
	factoryRegistry['image'] = createImage;
	factoryRegistry['text'] = createText;
	factoryRegistry['container'] = createContainer;
};

// Initialize built-in factories
registerBuiltInFactories();

/**
 * Register a custom component factory
 * Enables extending the system with new component types
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

/**
 * Create a component using the registered factory for its type
 */
export const createComponent = <Msg>(
	state: ComponentState<Msg>,
	data: any
): Phaser.GameObjects.GameObject | null => {
	const factory = factoryRegistry[data.type];
	return factory ? factory(state, data) : null;
};

/**
 * Get all registered component types
 */
export const getRegisteredTypes = (): string[] => {
	return Object.keys(factoryRegistry);
};