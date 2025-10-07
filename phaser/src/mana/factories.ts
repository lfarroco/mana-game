/**
 * Component factory functions for creating Phaser game objects
 */

import type {
	ComponentState,
	ImageElement,
	TextElement,
	ContainerElement,
	GraphicsElement,
	RectangleElement,
	RoundedRectangleElement,
	CircleElement,
	EllipseElement,
	ShaderElement,
	Shape
} from './types';
import { applyBaseProps } from './properties';
import { callMountHooks } from './lifecycle';
import { validateTexture, validateClickHandler } from './validation';
import { normalizeUniformMap } from './uniforms';

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
	console.log(`[Container Factory] Created container ${data.id} at (${data.x}, ${data.y})`);

	// Create and add children
	if (data.children && data.children.length > 0) {
		console.log(`[Container Factory] Adding ${data.children.length} children to container ${data.id}`);
		for (const childData of data.children) {
			console.log(`[Container Factory] Creating child ${childData.id} (type: ${childData.type})`);
			const child = createComponent(state, childData);
			if (child) {
				container.add(child);
				console.log(`[Container Factory] Added child ${childData.id} to container. Child position: (${(child as any).x}, ${(child as any).y}), Container has ${container.list.length} children`);
				// Also track children in state.elements
				state.elements[childData.id] = child;
			} else {
				console.warn(`[Container Factory] Failed to create child ${childData.id}`);
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
 * Create a rectangle shape element
 */
export const createRectangle = <Msg>(
	state: ComponentState<Msg>,
	data: RectangleElement<Msg>
): Phaser.GameObjects.Graphics => {
	const graphics = state.scene.add.graphics({ x: data.x, y: data.y });

	// Draw rectangle
	if (data.fillColor !== undefined) {
		graphics.fillStyle(data.fillColor, data.fillAlpha ?? 1);
		graphics.fillRect(-data.width / 2, -data.height / 2, data.width, data.height);
	}
	if (data.strokeColor !== undefined) {
		graphics.lineStyle(data.strokeWidth ?? 1, data.strokeColor, data.strokeAlpha ?? 1);
		graphics.strokeRect(-data.width / 2, -data.height / 2, data.width, data.height);
	}

	applyBaseProps(graphics, data, state);
	callMountHooks(graphics, data, state);
	return graphics;
};

/**
 * Create a rounded rectangle shape element
 */
export const createRoundedRectangle = <Msg>(
	state: ComponentState<Msg>,
	data: RoundedRectangleElement<Msg>
): Phaser.GameObjects.Graphics => {
	const graphics = state.scene.add.graphics({ x: data.x, y: data.y });

	// Draw rounded rectangle
	if (data.fillColor !== undefined) {
		graphics.fillStyle(data.fillColor, data.fillAlpha ?? 1);
		graphics.fillRoundedRect(-data.width / 2, -data.height / 2, data.width, data.height, data.radius);
	}
	if (data.strokeColor !== undefined) {
		graphics.lineStyle(data.strokeWidth ?? 1, data.strokeColor, data.strokeAlpha ?? 1);
		graphics.strokeRoundedRect(-data.width / 2, -data.height / 2, data.width, data.height, data.radius);
	}

	applyBaseProps(graphics, data, state);
	callMountHooks(graphics, data, state);
	return graphics;
};

/**
 * Create a circle shape element
 */
export const createCircle = <Msg>(
	state: ComponentState<Msg>,
	data: CircleElement<Msg>
): Phaser.GameObjects.Graphics => {
	const graphics = state.scene.add.graphics({ x: data.x, y: data.y });

	// Draw circle
	if (data.fillColor !== undefined) {
		graphics.fillStyle(data.fillColor, data.fillAlpha ?? 1);
		graphics.fillCircle(0, 0, data.radius);
	}
	if (data.strokeColor !== undefined) {
		graphics.lineStyle(data.strokeWidth ?? 1, data.strokeColor, data.strokeAlpha ?? 1);
		graphics.strokeCircle(0, 0, data.radius);
	}

	applyBaseProps(graphics, data, state);
	callMountHooks(graphics, data, state);
	return graphics;
};

/**
 * Create an ellipse shape element
 */
export const createEllipse = <Msg>(
	state: ComponentState<Msg>,
	data: EllipseElement<Msg>
): Phaser.GameObjects.Graphics => {
	const graphics = state.scene.add.graphics({ x: data.x, y: data.y });

	// Draw ellipse
	if (data.fillColor !== undefined) {
		graphics.fillStyle(data.fillColor, data.fillAlpha ?? 1);
		graphics.fillEllipse(0, 0, data.width, data.height);
	}
	if (data.strokeColor !== undefined) {
		graphics.lineStyle(data.strokeWidth ?? 1, data.strokeColor, data.strokeAlpha ?? 1);
		graphics.strokeEllipse(0, 0, data.width, data.height);
	}

	applyBaseProps(graphics, data, state);
	callMountHooks(graphics, data, state);
	return graphics;
};

/**
 * Create a shader game object
 */
export const createShader = <Msg>(
	state: ComponentState<Msg>,
	data: ShaderElement<Msg>
): Phaser.GameObjects.Shader => {
	console.log(`[Shader Factory] createShader called for ${data.id}`);
	console.log(`[Shader Factory] Data:`, data);

	// Create a unique key for this shader instance
	const shaderKey = `mana-shader-${data.id}`;

	// Normalize uniforms so Phaser receives typed entries (avoids array -> vec issues)
	const uniformConfig = normalizeUniformMap(data.uniforms, {
		time: { type: '1f', value: data.uniforms?.time ?? 0 },
		resolution: { type: '2f', value: data.uniforms?.resolution ?? [data.width, data.height] },
		intensity: { type: '1f', value: data.uniforms?.intensity ?? 1.0 }
	});

	// Keep element data uniforms in normalized form for future updates
	const normalizedUniformValues: Record<string, any> = {};
	for (const [key, entry] of Object.entries(uniformConfig)) {
		normalizedUniformValues[key] = entry.value;
	}
	(data as any).uniforms = normalizedUniformValues;

	const baseShader = new Phaser.Display.BaseShader(
		shaderKey,
		data.fragmentShader,
		data.vertexShader || undefined,
		uniformConfig
	);
	console.log(`[Shader Factory] BaseShader created`);

	// Create the shader game object
	// IMPORTANT: Shaders need absolute world coordinates when added to containers
	// Use data.x and data.y directly (these should be world coordinates for shaders in containers)
	const shader = state.scene.add.shader(baseShader, data.x, data.y, data.width, data.height);
	console.log(`[Shader Factory] Shader game object created at (${data.x}, ${data.y})`);

	// Set origin to center (like UIButton)
	shader.setOrigin(0.5);

	// Use normal blending so colors darken/lighten as expected
	(shader as any).blendMode = Phaser.BlendModes.NORMAL;

	// Ensure shader is visible
	shader.setVisible(true);
	(shader as any).alpha = 1.0; // Ensure full opacity

	// Set depth to ensure it's above background
	shader.setDepth(1);

	console.log(`[Shader Factory] Created shader ${data.id}:`, {
		width: data.width,
		height: data.height,
		position: { x: shader.x, y: shader.y },
		visible: shader.visible,
		alpha: (shader as any).alpha,
		depth: shader.depth,
		blendMode: (shader as any).blendMode,
		displayWidth: shader.displayWidth,
		displayHeight: shader.displayHeight,
		uniforms: data.uniforms,
		shader: shader,
		type: shader.type
	});

	// Auto-update time uniform on every frame if it exists in the uniforms
	if (data.uniforms && 'time' in data.uniforms) {
		console.log(`[Shader Factory] Setting up auto-update for shader ${data.id}`);
		let frameCount = 0;

		const updateHandler = () => {
			frameCount++;
		};

		// Listen to scene update event using proper Phaser event constant
		state.scene.events.on(Phaser.Scenes.Events.UPDATE, updateHandler);
		console.log(`[Shader Factory] Registered UPDATE event handler for ${data.id}`);

		// Clean up listener when shader is destroyed
		shader.once('destroy', () => {
			console.log(`[Shader Factory] Cleaning up UPDATE handler for ${data.id}`);
			state.scene.events.off(Phaser.Scenes.Events.UPDATE, updateHandler);
		});
	} else {
		console.log(`[Shader Factory] No time uniform found for shader ${data.id}, skipping auto-update`);
	}

	applyBaseProps(shader, data, state);
	callMountHooks(shader, data, state);
	return shader;
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
		case 'rect':
			return createRectangle(state, data);
		case 'roundrect':
			return createRoundedRectangle(state, data);
		case 'circle':
			return createCircle(state, data);
		case 'ellipse':
			return createEllipse(state, data);
		case 'shader':
			return createShader(state, data);
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