// Jest setup file for phaser project tests
// This file is loaded before each test suite via setupFilesAfterEnv in jest.config.cjs

// jsdom test environments don't expose structuredClone (Node global), but core/
// game logic relies on it for deep-cloning units/cards. Provide a JSON-based
// fallback for the plain-data structures the game uses.
if (typeof globalThis.structuredClone !== "function") {
	(globalThis as { structuredClone?: <T>(value: T) => T }).structuredClone = <T>(value: T): T =>
		JSON.parse(JSON.stringify(value));
}

