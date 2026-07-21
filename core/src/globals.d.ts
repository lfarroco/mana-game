// Minimal declarations for universally-available JS APIs.
// console is available in browsers, Node.js, Deno, and Supabase Edge Functions.
// We intentionally do NOT include "DOM" in tsconfig lib to prevent accidental
// usage of browser-only globals (window, document, localStorage, etc.).

declare var console: {
	log(...data: unknown[]): void;
	debug(...data: unknown[]): void;
	info(...data: unknown[]): void;
	warn(...data: unknown[]): void;
	error(...data: unknown[]): void;
};

/** Available in Node 17+, all modern browsers, and Edge Functions. */
declare function structuredClone<T>(value: T, options?: StructuredSerializeOptions): T;

interface StructuredSerializeOptions {
	transfer?: any[];
}
