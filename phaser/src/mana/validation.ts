/**
 * Validation and error handling utilities
 */

import type { Element, ComponentState } from './types';

/**
 * Development mode flag
 * Can be set to false in production for better performance
 */
export let DEV_MODE = true;

/**
 * Set development mode
 */
export const setDevMode = (enabled: boolean): void => {
	DEV_MODE = enabled;
};

/**
 * Log warning in development mode
 */
const warn = (message: string, ...args: any[]): void => {
	if (DEV_MODE) {
		console.warn(`[Mana] ${message}`, ...args);
	}
};

/**
 * Log error in development mode
 */
const error = (message: string, ...args: any[]): void => {
	if (DEV_MODE) {
		console.error(`[Mana] ${message}`, ...args);
	}
};

/**
 * Validate element has required properties
 */
export const validateElement = <Msg>(element: Element<Msg>): boolean => {
	if (!DEV_MODE) return true;

	if (!element.id) {
		error('Element missing required property "id"', element);
		return false;
	}

	if (!element.type) {
		error('Element missing required property "type"', element);
		return false;
	}

	if (typeof element.x !== 'number') {
		error('Element "x" must be a number', element);
		return false;
	}

	if (typeof element.y !== 'number') {
		error('Element "y" must be a number', element);
		return false;
	}

	// Type-specific validation
	if (element.type === 'image') {
		if (!('texture' in element) || !element.texture) {
			error('Image element missing "texture" property', element);
			return false;
		}
	}

	if (element.type === 'text') {
		if (!('text' in element)) {
			error('Text element missing "text" property', element);
			return false;
		}
	}

	if (element.type === 'container') {
		if (!('children' in element)) {
			error('Container element missing "children" property', element);
			return false;
		}
	}

	return true;
};

/**
 * Check for duplicate IDs in element array
 */
export const checkDuplicateIds = <Msg>(elements: readonly Element<Msg>[]): void => {
	if (!DEV_MODE) return;

	const ids = new Set<string>();
	const duplicates = new Set<string>();

	for (const element of elements) {
		if (ids.has(element.id)) {
			duplicates.add(element.id);
		}
		ids.add(element.id);
	}

	if (duplicates.size > 0) {
		error(`Duplicate element IDs found:`, Array.from(duplicates));
	}
};

/**
 * Validate all elements in an array
 */
export const validateElements = <Msg>(elements: readonly Element<Msg>[]): boolean => {
	if (!DEV_MODE) return true;

	let valid = true;

	for (const element of elements) {
		if (!validateElement(element)) {
			valid = false;
		}
	}

	checkDuplicateIds(elements);

	return valid;
};

/**
 * Warn about potential performance issues
 */
export const checkPerformance = <Msg>(state: ComponentState<Msg>): void => {
	if (!DEV_MODE) return;

	const elementCount = Object.keys(state.elements).length;

	if (elementCount > 1000) {
		warn(
			`High element count detected (${elementCount}). Consider using object pooling or pagination.`
		);
	}
};

/**
 * Validate texture exists in scene
 */
export const validateTexture = (scene: Phaser.Scene, textureKey: string): boolean => {
	if (!DEV_MODE) return true;

	if (!scene.textures.exists(textureKey)) {
		error(`Texture "${textureKey}" does not exist. Did you forget to load it?`);
		return false;
	}

	return true;
};

/**
 * Check if onClick handler is properly defined
 */
export const validateClickHandler = <Msg>(element: Element<Msg>): void => {
	if (!DEV_MODE) return;

	if (element.onClick && !element.interactive) {
		warn(
			`Element "${element.id}" has onClick handler but interactive is not set to true. ` +
			`The element will be made interactive automatically, but you should set interactive: true explicitly.`,
			element
		);
	}
};

/**
 * Validate state consistency
 */
export const validateState = <Msg>(state: ComponentState<Msg>): void => {
	if (!DEV_MODE) return;

	// Check for orphaned elements
	const dataIds = new Set(state.data.map(d => d.id));
	const elementIds = new Set(Object.keys(state.elements));

	for (const id of elementIds) {
		if (!dataIds.has(id)) {
			warn(`Orphaned element detected: ${id}. This element exists but is not in the data array.`);
		}
	}

	// Check element data registry consistency
	const registryIds = new Set(state.elementData.keys());
	if (registryIds.size !== dataIds.size) {
		warn(`Element data registry size mismatch. Registry: ${registryIds.size}, Data: ${dataIds.size}`);
	}

	// Check for missing elements
	for (const id of dataIds) {
		if (!elementIds.has(id)) {
			warn(`Missing element: ${id}. Data exists but no corresponding game object found.`);
		}
		if (!registryIds.has(id)) {
			warn(`Missing in registry: ${id}. Data exists but not in element data registry.`);
		}
	}
};

/**
 * Validate message structure
 */
export const validateMessage = (msg: any): boolean => {
	if (!DEV_MODE) return true;

	if (!msg || typeof msg !== 'object') {
		error('Message must be an object', msg);
		return false;
	}

	if (!msg.type) {
		error('Message missing required "type" property', msg);
		return false;
	}

	// Mana message validation
	if (typeof msg.type === 'string' && msg.type.startsWith('@mana/')) {
		if (msg.type === '@mana/TWEEN' && !msg.tweenId) {
			error('TWEEN message missing "tweenId"', msg);
			return false;
		}
		if (msg.type === '@mana/STOP_TWEEN' && !msg.tweenId) {
			error('STOP_TWEEN message missing "tweenId"', msg);
			return false;
		}
		if (msg.type === '@mana/REDRAW_SHAPE' && !msg.elementId) {
			error('REDRAW_SHAPE message missing "elementId"', msg);
			return false;
		}
	}

	return true;
};

/**
 * Validate component creation
 */
export const validateComponentCreation = <Msg>(scene: Phaser.Scene, elements: readonly Element<Msg>[]): boolean => {
	if (!DEV_MODE) return true;

	if (!scene) {
		error('Scene is required for component creation');
		return false;
	}

	if (!Array.isArray(elements)) {
		error('Elements must be an array', elements);
		return false;
	}

	if (elements.length === 0) {
		warn('Creating component with empty elements array');
	}

	return validateElements(elements);
};

/**
 * Attempt to recover from common errors
 */
export const attemptRecovery = <Msg>(state: ComponentState<Msg>, error: any): ComponentState<Msg> => {
	if (!DEV_MODE) return state;

	warn('Attempting error recovery...', error);

	try {
		// Rebuild element data registry if corrupted
		if (state.elementData.size === 0 && state.data.length > 0) {
			warn('Rebuilding corrupted element data registry');
			const registry = new Map<string, Element<Msg>>();
			const addToRegistry = (element: Element<Msg>) => {
				registry.set(element.id, element);
				if ('children' in element && element.children) {
					element.children.forEach(addToRegistry);
				}
			};
			state.data.forEach(addToRegistry);
			return { ...state, elementData: registry };
		}
	} catch (recoveryError) {
		error('Recovery failed', recoveryError);
	}

	return state;
};
