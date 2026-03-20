/**
 * System Events
 *
 * This module defines event types emitted by game systems.
 * Systems should be pure functions that accept game state and return events/mutations
 * instead of directly manipulating Phaser GameObjects.
 *
 * The Visualizer layer subscribes to these events and handles all visual updates.
 */

import { Unit } from "@Models/Entities/Unit";

/**
 * EventEmitter interface for system events
 */
export interface EventEmitter {
	on(event: string, listener: (event: SystemEvent) => void): void;
	off(event: string, listener: (event: SystemEvent) => void): void;
	emit(event: string, data?: SystemEvent): void;
}

/**
 * Simple implementation of EventEmitter
 */
export class SimpleEventEmitter implements EventEmitter {
	private listeners: { [event: string]: ((data: SystemEvent) => void)[] } = {};

	on(event: string, listener: (data: SystemEvent) => void): void {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event].push(listener);
	}

	off(event: string, listener: (data: SystemEvent) => void): void {
		const eventListeners = this.listeners[event];
		if (eventListeners) {
			const index = eventListeners.indexOf(listener);
			if (index > -1) {
				eventListeners.splice(index, 1);
			}
		}
	}

	emit(event: string, data?: SystemEvent): void {
		const eventListeners = this.listeners[event];
		if (eventListeners && data) {
			eventListeners.forEach((listener) => listener(data));
		}
	}
}

/**
 * Base event type that all system events extend
 */
export type SystemEvent = {
	type: string;
	timestamp: number;
};

// ============================================================================
// Shop Events
// ============================================================================

/**
 * Emitted when the shop is opened
 */
export type ShopOpenedEvent = SystemEvent & {
	type: "ShopOpened";
	cardIds: string[];
};

/**
 * Emitted when the shop is closed
 */
export type ShopClosedEvent = SystemEvent & {
	type: "ShopClosed";
};

/**
 * Emitted when a unit purchase is successful
 */
export type UnitPurchasedEvent = SystemEvent & {
	type: "UnitPurchased";
	cardId: string;
	shopCharaId: string;
	wasUpgrade: boolean;
	unit?: Unit; // The newly created unit (if not an upgrade)
	upgradedUnit?: Unit; // The upgraded unit (if it was an upgrade)
};

/**
 * Emitted when a unit purchase fails
 */
export type PurchaseFailedEvent = SystemEvent & {
	type: "PurchaseFailed";
	cardId: string;
	unitName: string;
	reason: string;
	cost?: number;
	shopCharaId: string;
	dragStartPosition: { x: number; y: number };
};

/**
 * Emitted when a unit is sold
 */
export type UnitSoldEvent = SystemEvent & {
	type: "UnitSold";
	unitId: string;
};

// ============================================================================
// Unit Events
// ============================================================================

/**
 * Emitted when a unit is spawned/summoned
 */
export type UnitSpawnedEvent = SystemEvent & {
	type: "UnitSpawned";
	unit: Unit;
	isFromShop: boolean;
};

/**
 * Emitted when a unit is upgraded
 */
export type UnitUpgradedEvent = SystemEvent & {
	type: "UnitUpgraded";
	unit: Unit;
	previousRank: number;
};

/**
 * Emitted when a unit takes damage
 */
export type UnitDamagedEvent = SystemEvent & {
	type: "UnitDamaged";
	unitId: string;
	damage: number;
	source?: string;
};

/**
 * Emitted when a unit is destroyed/killed
 */
export type UnitDestroyedEvent = SystemEvent & {
	type: "UnitDestroyed";
	unitId: string;
};

// ============================================================================
// Phase Events
// ============================================================================

/**
 * Emitted when a phase is skipped
 */
export type PhaseSkippedEvent = SystemEvent & {
	type: "PhaseSkipped";
	phaseName: string;
};

/**
 * Emitted when a phase starts
 */
export type PhaseStartedEvent = SystemEvent & {
	type: "PhaseStarted";
	phaseName: string;
};

/**
 * Emitted when a phase ends
 */
export type PhaseEndedEvent = SystemEvent & {
	type: "PhaseEnded";
	phaseName: string;
};

// ============================================================================
// UI Events
// ============================================================================

/**
 * Emitted when currency/resources change
 */
export type ResourcesChangedEvent = SystemEvent & {
	type: "ResourcesChanged";
	currency?: number;
	wins?: number;
	lives?: number;
	round?: number;
};

// ============================================================================
// Union Types
// ============================================================================

/**
 * All shop-related events
 */
export type ShopEvent =
	| ShopOpenedEvent
	| ShopClosedEvent
	| UnitPurchasedEvent
	| PurchaseFailedEvent
	| UnitSoldEvent;

/**
 * All unit-related events
 */
export type UnitEvent =
	| UnitSpawnedEvent
	| UnitUpgradedEvent
	| UnitDamagedEvent
	| UnitDestroyedEvent;

/**
 * All phase-related events
 */
export type PhaseEvent = PhaseSkippedEvent | PhaseStartedEvent | PhaseEndedEvent;

/**
 * All system events (union of all event types)
 */
export type AllSystemEvents = ShopEvent | UnitEvent | PhaseEvent | ResourcesChangedEvent;

// ============================================================================
// Event Creation Helpers
// ============================================================================

/**
 * Creates a timestamp for an event
 */
const createTimestamp = (): number => Date.now();

/**
 * Helper to create a ShopOpenedEvent
 */
export const createShopOpenedEvent = (cardIds: string[]): ShopOpenedEvent => ({
	type: "ShopOpened",
	timestamp: createTimestamp(),
	cardIds,
});

/**
 * Helper to create a ShopClosedEvent
 */
export const createShopClosedEvent = (): ShopClosedEvent => ({
	type: "ShopClosed",
	timestamp: createTimestamp(),
});

/**
 * Helper to create a UnitPurchasedEvent
 */
export const createUnitPurchasedEvent = (
	cardId: string,
	shopCharaId: string,
	wasUpgrade: boolean,
	unit?: Unit,
	upgradedUnit?: Unit
): UnitPurchasedEvent => ({
	type: "UnitPurchased",
	timestamp: createTimestamp(),
	cardId,
	shopCharaId,
	wasUpgrade,
	unit,
	upgradedUnit,
});

/**
 * Helper to create a PurchaseFailedEvent
 */
export const createPurchaseFailedEvent = (
	cardId: string,
	unitName: string,
	reason: string,
	shopCharaId: string,
	dragStartPosition: { x: number; y: number },
	cost?: number
): PurchaseFailedEvent => ({
	type: "PurchaseFailed",
	timestamp: createTimestamp(),
	cardId,
	unitName,
	reason,
	cost,
	shopCharaId,
	dragStartPosition,
});

/**
 * Helper to create a UnitSoldEvent
 */
export const createUnitSoldEvent = (unitId: string): UnitSoldEvent => ({
	type: "UnitSold",
	timestamp: createTimestamp(),
	unitId,
});

/**
 * Helper to create a PhaseSkippedEvent
 */
export const createPhaseSkippedEvent = (phaseName: string): PhaseSkippedEvent => ({
	type: "PhaseSkipped",
	timestamp: createTimestamp(),
	phaseName,
});
