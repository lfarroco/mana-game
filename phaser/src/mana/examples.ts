/**
 * Mana Library Extension Examples
 *
 * This file demonstrates how to extend the Mana reactive rendering library
 * with custom properties, update handlers, and cleanup hooks.
 */

import type { ComponentState } from './types';
import {
	registerPropertySetter,
	registerUpdateHandler,
	registerCleanupHook
} from './index';

// ========================================
// Example 2: Custom Properties
// ========================================

/**
 * Add tint property support for all components
 */
registerPropertySetter('tint', (obj, val) => {
	if ('setTint' in obj && typeof val === 'number') {
		obj.setTint(val);
	}
});

/**
 * Add depth property for layering
 */
registerPropertySetter('depth', (obj, val) => {
	if ('setDepth' in obj && typeof val === 'number') {
		obj.setDepth(val);
	}
});

/**
 * Add origin property for pivot points
 */
registerPropertySetter('origin', (obj, val) => {
	if ('setOrigin' in obj && val && typeof val === 'object' && 'x' in val && 'y' in val) {
		obj.setOrigin(val.x, val.y);
	}
});

/**
 * Add scroll factor for camera effects
 */
registerPropertySetter('scrollFactor', (obj, val) => {
	if ('setScrollFactor' in obj && val && typeof val === 'object' && 'x' in val && 'y' in val) {
		obj.setScrollFactor(val.x, val.y);
	}
});

/**
 * Add blend mode property
 */
registerPropertySetter('blendMode', (obj, val) => {
	if ('setBlendMode' in obj && typeof val === 'string') {
		const blendMode = Phaser.BlendModes[val as keyof typeof Phaser.BlendModes];
		if (blendMode !== undefined) {
			obj.setBlendMode(blendMode);
		}
	}
});

/**
 * Add custom shader property
 */
registerPropertySetter('shader', (obj, val) => {
	if ('setPipeline' in obj && typeof val === 'string') {
		obj.setPipeline(val);
	}
});

// ========================================
// Example 3: Custom Update Handlers
// ========================================

/**
 * Update handler for images
 * Handles tint updates
 */
registerUpdateHandler('image', (gameObject, data, _state) => {
	const image = gameObject as Phaser.GameObjects.Image;
	const imageData = data as any;

	// Update tint if specified
	if (imageData.tint !== undefined) {
		image.setTint(imageData.tint);
	}
});

/**
 * Update handler for text
 * Handles text content updates
 */
registerUpdateHandler('text', (gameObject, data, _state) => {
	const text = gameObject as Phaser.GameObjects.Text;
	const textData = data as any;

	// Update text content if changed
	if (textData.text !== text.text) {
		text.setText(textData.text);
	}

	// Update style if changed
	if (textData.style) {
		text.setStyle(textData.style);
	}
});

/**
 * Update handler for containers
 * Handles child updates
 */
registerUpdateHandler('container', (_gameObject, _data, _state) => {
	// Container updates are handled by the renderer
	// This is a placeholder for any container-specific logic
});

// ========================================
// Example 4: Custom Cleanup Hooks
// ========================================

/**
 * Cleanup hook for stopping all animations
 */
registerCleanupHook((_state: ComponentState<any>) => {
	console.log('[Mana] Stopping all animations during cleanup');

	// Note: In a real implementation, you'd iterate through state.elements
	// and stop animations. This is just a logging example.
});

/**
 * Cleanup hook for particle emitters
 */
registerCleanupHook((_state: ComponentState<any>) => {
	console.log('[Mana] Cleaning up particle emitters');

	// Note: In a real implementation, you'd iterate through state.elements
	// and stop particle emitters. This is just a logging example.
});

/**
 * Cleanup hook for custom resource tracking
 */
let customResources: string[] = [];

registerCleanupHook((_state: ComponentState<any>) => {
	console.log('[Mana] Cleaning up custom resources:', customResources);
	customResources = []; // Clear the list
});

// ========================================
// Example Usage
// ========================================

/*
// In your game code:

import { createComponentState, setData } from './mana';
// Import the examples to register all extensions
import './examples';

type GameMsg =
  | { type: 'IMAGE_CLICKED', id: string }
  | { type: 'TEXT_CLICKED', id: string }
  | { type: 'CONTAINER_CLICKED', id: string };

const state = createComponentState(scene, updateFunction);

const components = [
  // Image with custom properties
  {
    id: 'hero',
    type: 'image',
    x: 100,
    y: 100,
    texture: 'hero',
    tint: 0xffffff,
    depth: 10,
    interactive: true,
    onClick: () => [{ type: 'IMAGE_CLICKED', id: 'hero' }]
  },

  // Text with custom properties
  {
    id: 'score-text',
    type: 'text',
    x: 200,
    y: 50,
    text: 'Score: 0',
    style: { fontSize: '24px', color: '#ffffff' },
    origin: { x: 0.5, y: 0.5 }
  },

  // Container with children
  {
    id: 'ui-panel',
    type: 'container',
    x: 400,
    y: 300,
    depth: 100
  }
];

setData(components)(state);
*/