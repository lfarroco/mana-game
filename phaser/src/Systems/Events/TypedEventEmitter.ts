/**
 * Utility type to extract payload from event payloads interface
 * Supports both object payloads and tuple payloads for backward compatibility
 */
type EventPayload<T, K extends keyof T> = T[K] extends void
	? []
	: T[K] extends readonly unknown[]
	? T[K]  // If it's a tuple, use it directly
	: [T[K]]; // If it's an object, wrap in array

/**
 * Type-safe wrapper around Phaser's EventEmitter
 * Provides compile-time type checking for event names and payloads
 */
export class TypedEventEmitter<TEventPayloads> {
	constructor(private eventEmitter: Phaser.Events.EventEmitter) { }

	emit<K extends keyof TEventPayloads>(
		event: K,
		...args: EventPayload<TEventPayloads, K>
	): void {
		this.eventEmitter.emit(event as string, ...args);
	}

	on<K extends keyof TEventPayloads>(
		event: K,
		fn: TEventPayloads[K] extends void
			? () => void
			: TEventPayloads[K] extends readonly unknown[]
			? (...args: TEventPayloads[K]) => void  // Spread tuple parameters
			: (data: TEventPayloads[K]) => void
	): void {
		this.eventEmitter.on(event as string, fn);
	}

	off<K extends keyof TEventPayloads>(
		event: K,
		fn?: TEventPayloads[K] extends void
			? () => void
			: TEventPayloads[K] extends readonly unknown[]
			? (...args: TEventPayloads[K]) => void
			: (data: TEventPayloads[K]) => void
	): void {
		this.eventEmitter.off(event as string, fn);
	}

	once<K extends keyof TEventPayloads>(
		event: K,
		fn: TEventPayloads[K] extends void
			? () => void
			: TEventPayloads[K] extends readonly unknown[]
			? (...args: TEventPayloads[K]) => void
			: (data: TEventPayloads[K]) => void
	): void {
		this.eventEmitter.once(event as string, fn);
	}
}
