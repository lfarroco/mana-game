/**
 * Utility functions for optimization and comparison
 */

import type { Element } from './types';

/**
 * Shallow comparison of two objects
 * Returns true if all properties match
 */
export const shallowEqual = (obj1: any, obj2: any): boolean => {
	if (obj1 === obj2) return true;
	if (!obj1 || !obj2) return false;
	if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) return false;

	for (const key of keys1) {
		if (obj1[key] !== obj2[key]) return false;
	}

	return true;
};

/**
 * Check if two elements are structurally equal
 * Used to skip unnecessary updates
 */
export const elementsEqual = <Msg>(
	element1: Element<Msg>,
	element2: Element<Msg>
): boolean => {
	// Quick reference check
	if (element1 === element2) return true;

	// Check type and id
	if (element1.type !== element2.type || element1.id !== element2.id) {
		return false;
	}

	// Check base properties
	if (
		element1.x !== element2.x ||
		element1.y !== element2.y ||
		element1.visible !== element2.visible ||
		element1.alpha !== element2.alpha ||
		element1.rotation !== element2.rotation ||
		element1.interactive !== element2.interactive
	) {
		return false;
	}

	// Check scale
	if (element1.scale?.x !== element2.scale?.x || element1.scale?.y !== element2.scale?.y) {
		return false;
	}

	// Type-specific checks
	if (element1.type === 'image' && element2.type === 'image') {
		if (element1.texture !== element2.texture || element1.frame !== element2.frame) {
			return false;
		}
	}

	if (element1.type === 'text' && element2.type === 'text') {
		if (element1.text !== element2.text || !shallowEqual(element1.style, element2.style)) {
			return false;
		}
	}

	if (element1.type === 'container' && element2.type === 'container') {
		if (element1.children.length !== element2.children.length) {
			return false;
		}
		// For containers, we do a shallow check on children count
		// Deep comparison would be too expensive
	}

	return true;
};

/**
 * Create a memoized version of element data
 * Caches elements to avoid unnecessary re-creates
 */
export class ElementCache<Msg> {
	private cache = new Map<string, Element<Msg>>();

	/**
	 * Get an element from cache or add it
	 * Returns the cached version if equal, or updates the cache
	 */
	get(element: Element<Msg>): Element<Msg> {
		const cached = this.cache.get(element.id);

		if (cached && elementsEqual(cached, element)) {
			return cached;
		}

		this.cache.set(element.id, element);
		return element;
	}

	/**
	 * Clear specific element from cache
	 */
	remove(id: string): void {
		this.cache.delete(id);
	}

	/**
	 * Clear entire cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size;
	}
}

/**
 * Batch multiple updates into a single operation
 * Useful for performance when updating many components
 */
export const batchUpdates = <T>(
	updates: Array<() => T>
): T[] => {
	return updates.map(update => update());
};

/**
 * Debounce function for expensive operations
 */
export const debounce = <T extends (...args: any[]) => any>(
	func: T,
	delay: number
): ((...args: Parameters<T>) => void) => {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
};

/**
 * Throttle function for rate-limiting updates
 */
export const throttle = <T extends (...args: any[]) => any>(
	func: T,
	limit: number
): ((...args: Parameters<T>) => void) => {
	let inThrottle: boolean;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
};
