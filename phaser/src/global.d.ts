// Ambient declarations for modules provided by webpack (not real npm dependencies).

// The `events` module is provided by webpack's node-libs-browser polyfill.
declare module "events" {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Listener = (...args: any[]) => void;
	class EventEmitter {
		static defaultMaxListeners: number;
		on(event: string | symbol, listener: Listener): this;
		emit(event: string | symbol, ...args: unknown[]): boolean;
		once(event: string | symbol, listener: Listener): this;
		off(event: string | symbol, listener: Listener): this;
		removeListener(event: string | symbol, listener: Listener): this;
		removeAllListeners(event?: string | symbol): this;
		listeners(event: string | symbol): Listener[];
	}
	export { EventEmitter, Listener };
	export default EventEmitter;
}