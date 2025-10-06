/**
 * Simplified Mana API - Clean interface for reactive rendering POC
 *
 * This replaces the complex 30+ export API with a minimal, focused interface
 * that demonstrates the core reactive rendering concepts without overwhelming complexity.
 */

// Export the simple API
export type {
	// Core types
	Element,
	ManaMsg,
} from './simple';

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
} from './simple';

// Keep the existing createComponent for backward compatibility
export { createComponent } from './api';