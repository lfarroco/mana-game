/**
 * Mana Core API - Main interface for reactive rendering
 *
 * This provides the complete API for reactive rendering in Phaser:
 * - Element creation helpers
 * - Core rendering functions
 * - Message handling system
 * - State management
 */

// Export the core API
export type {
	// Core types
	Element,
	ManaMsg,
} from './core';

export {
	// Element creation helpers
	container,
	text,
	image,
	rectangle,

	// Core rendering
	render,
	createApp,

	// Message handling
	handleManaMsg,
	dispatch,

	// Cleanup
	cleanup,
} from './core';

// Keep the existing createComponent for backward compatibility
export { createComponent } from './api';