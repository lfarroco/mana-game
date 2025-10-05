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
 * Create a component for supported game object types
 */
export const createComponent = <Msg>(
	state: ComponentState<Msg>,
	data: any
): Phaser.GameObjects.GameObject | null => {
	switch (data.type) {
		case 'image':
			return createImage(state, data);
		case 'text':
			return createText(state, data);
		case 'container':
			return createContainer(state, data);
		default:
			return null;
	}
};