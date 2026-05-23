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


export type ClientEvent = {
	type: string;
	timestamp: number;
};

// ============================================================================
// Shop Events
// ============================================================================

export type ShopOpenedEvent = ClientEvent & {
	type: "ShopOpened";
	cardIds: string[];
};

export type ShopClosedEvent = ClientEvent & {
	type: "ShopClosed";
};

export type UnitPurchasedEvent = ClientEvent & {
	type: "UnitPurchased";
	cardId: string;
	shopCharaId: string;
	wasUpgrade: boolean;
	unit?: Unit; // The newly created unit (if not an upgrade)
	upgradedUnit?: Unit; // The upgraded unit (if it was an upgrade)
};

export type PurchaseFailedEvent = ClientEvent & {
	type: "PurchaseFailed";
	cardId: string;
	unitName: string;
	reason: string;
	cost?: number;
	shopCharaId: string;
	dragStartPosition: { x: number; y: number };
};

export type UnitSoldEvent = ClientEvent & {
	type: "UnitSold";
	unitId: string;
};

// ============================================================================
// Unit Events
// ============================================================================

export type UnitSpawnedEvent = ClientEvent & {
	type: "UnitSpawned";
	unit: Unit;
	isFromShop: boolean;
};

export type UnitUpgradedEvent = ClientEvent & {
	type: "UnitUpgraded";
	unit: Unit;
	previousRank: number;
};

export type UnitDamagedEvent = ClientEvent & {
	type: "UnitDamaged";
	unitId: string;
	damage: number;
	source?: string;
};

export type UnitDestroyedEvent = ClientEvent & {
	type: "UnitDestroyed";
	unitId: string;
};

// ============================================================================
// Phase Events
// ============================================================================

export type PhaseSkippedEvent = ClientEvent & {
	type: "PhaseSkipped";
	phaseName: string;
};

export type PhaseStartedEvent = ClientEvent & {
	type: "PhaseStarted";
	phaseName: string;
};

export type PhaseEndedEvent = ClientEvent & {
	type: "PhaseEnded";
	phaseName: string;
};

// ============================================================================
// UI Events
// ============================================================================

export type ResourcesChangedEvent = ClientEvent & {
	type: "ResourcesChanged";
	currency?: number;
	wins?: number;
	lives?: number;
	round?: number;
};

// ============================================================================
// Union Types
// ============================================================================

export type ShopEvent =
	| ShopOpenedEvent
	| ShopClosedEvent
	| UnitPurchasedEvent
	| PurchaseFailedEvent
	| UnitSoldEvent;

export type UnitEvent =
	| UnitSpawnedEvent
	| UnitUpgradedEvent
	| UnitDamagedEvent
	| UnitDestroyedEvent;

export type PhaseEvent = PhaseSkippedEvent | PhaseStartedEvent | PhaseEndedEvent;

export type AllSystemEvents = ShopEvent | UnitEvent | PhaseEvent | ResourcesChangedEvent;

// ============================================================================
// Event Creation Helpers
// ============================================================================

const createTimestamp = (): number => Date.now();

export const createShopOpenedEvent = (cardIds: string[]): ShopOpenedEvent => ({
	type: "ShopOpened",
	timestamp: createTimestamp(),
	cardIds,
});

export const createShopClosedEvent = (): ShopClosedEvent => ({
	type: "ShopClosed",
	timestamp: createTimestamp(),
});

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

export const createUnitSoldEvent = (unitId: string): UnitSoldEvent => ({
	type: "UnitSold",
	timestamp: createTimestamp(),
	unitId,
});

export const createPhaseSkippedEvent = (phaseName: string): PhaseSkippedEvent => ({
	type: "PhaseSkipped",
	timestamp: createTimestamp(),
	phaseName,
});
