import { TypedEventEmitter } from "../Events/TypedEventEmitter";
import { OptionsSystemEventPayloads } from "./events";

/**
 * Centralized manager for options-related events
 * Provides a convenient interface for creating typed event emitters for the options system
 */
export class OptionsSystemManager {
	private static instance: OptionsSystemManager | null = null;
	private eventEmitter: TypedEventEmitter<OptionsSystemEventPayloads>;

	private constructor(phaserEventEmitter: Phaser.Events.EventEmitter) {
		this.eventEmitter = new TypedEventEmitter(phaserEventEmitter);
	}

	/**
	 * Initialize the OptionsSystemManager with a Phaser event emitter
	 * This should be called once during game initialization
	 */
	static initialize(phaserEventEmitter: Phaser.Events.EventEmitter): OptionsSystemManager {
		if (OptionsSystemManager.instance) {
			console.warn('OptionsSystemManager already initialized');
			return OptionsSystemManager.instance;
		}

		OptionsSystemManager.instance = new OptionsSystemManager(phaserEventEmitter);
		return OptionsSystemManager.instance;
	}

	/**
	 * Get the singleton instance
	 * Throws an error if not initialized
	 */
	static getInstance(): OptionsSystemManager {
		if (!OptionsSystemManager.instance) {
			throw new Error('OptionsSystemManager not initialized. Call initialize() first.');
		}
		return OptionsSystemManager.instance;
	}

	/**
	 * Get the typed event emitter for options events
	 */
	getEventEmitter(): TypedEventEmitter<OptionsSystemEventPayloads> {
		return this.eventEmitter;
	}

	/**
	 * Cleanup method for when the system is being destroyed
	 */
	static destroy(): void {
		OptionsSystemManager.instance = null;
	}
}
