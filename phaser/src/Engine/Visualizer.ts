/**
 * Visualizer
 *
 * The visualization layer that subscribes to system events and handles all visual updates.
 * This class separates business logic from presentation concerns by:
 * - Subscribing to system events emitted by pure systems
 * - Handling all Phaser GameObject manipulations
 * - Managing animations and visual effects
 *
 * This follows the mana-battle-standards: use classes for Phaser integration,
 * while keeping game logic in pure functions.
 */

import * as SystemEvents from "@Systems/Events";
import * as Chara from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as ShopUI from "@Systems/Shop/ShopPanel";
import * as Geometry from "@Models/Geometry";

/**
 * Event handler function type
 */
type EventHandler<T extends SystemEvents.SystemEvent> = (event: T) => void | Promise<void>;

/**
 * Event handlers map
 */
const eventHandlers: Map<string, Set<EventHandler<any>>> = new Map();
let isInitialized: boolean = false;

/**
 * Initialize the visualizer and subscribe to system events
 */
export function initialize(): void {
	if (isInitialized) {
		console.warn("Visualizer already initialized");
		return;
	}

	// Subscribe to Shop events
	subscribe("ShopOpened", handleShopOpened);
	subscribe("ShopClosed", handleShopClosed);
	subscribe("UnitPurchased", handleUnitPurchased);
	subscribe("PurchaseFailed", handlePurchaseFailed);
	subscribe("UnitSold", handleUnitSold);

	// Subscribe to Unit events
	subscribe("UnitSpawned", handleUnitSpawned);
	subscribe("UnitUpgraded", handleUnitUpgraded);

	isInitialized = true;
	console.log("Visualizer initialized");
}

/**
 * Subscribe to a specific event type
 */
function subscribe<T extends SystemEvents.SystemEvent>(
	eventType: T["type"],
	handler: EventHandler<T>
): void {
	if (!eventHandlers.has(eventType)) {
		eventHandlers.set(eventType, new Set());
	}
	eventHandlers.get(eventType)!.add(handler);
}

/**
 * Emit an event to all subscribers
 */
export async function emit(event: SystemEvents.AllSystemEvents): Promise<void> {
	const handlers = eventHandlers.get(event.type);
	if (!handlers || handlers.size === 0) {
		// No handlers for this event type - this is okay
		return;
	}

	// Execute all handlers for this event
	const promises: Promise<void>[] = [];
	for (const handler of handlers) {
		try {
			const result = handler(event);
			if (result instanceof Promise) {
				promises.push(result);
			}
		} catch (error) {
			console.error(`Error handling event ${event.type}:`, error);
		}
	}

	// Wait for all async handlers to complete
	if (promises.length > 0) {
		await Promise.all(promises);
	}
}

/**
 * Cleanup and destroy the visualizer
 */
export function destroy(): void {
	eventHandlers.clear();
	isInitialized = false;
	console.log("Visualizer destroyed");
}

// ========================================================================
// Shop Event Handlers
// ========================================================================

async function handleShopOpened(_event: SystemEvents.ShopOpenedEvent): Promise<void> {
	console.log("Visualizer: Shop opened with cards:", _event.cardIds);
	// The actual shop opening and rendering is handled elsewhere
	// This is just for logging/tracking
}

async function handleShopClosed(_event: SystemEvents.ShopClosedEvent): Promise<void> {
	console.log("Visualizer: Shop closed");
	await ShopUI.slideOut();
}

async function handleUnitPurchased(event: SystemEvents.UnitPurchasedEvent): Promise<void> {
	console.log("Visualizer: Unit purchased:", event.cardId, "wasUpgrade:", event.wasUpgrade);

	try {
		// Shop item visuals may already be gone if phase transition happened immediately.
		let shopChara: Chara.Chara | undefined;
		try {
			shopChara = Chara.getCharaById(event.shopCharaId);
		} catch {
			shopChara = undefined;
		}

		// Handle visual feedback for successful purchase
		if (event.wasUpgrade && event.upgradedUnit) {
			// Unit was upgraded - animate the upgrade
			await Chara.upgradeUnit(event.upgradedUnit);
		} else if (event.unit) {
			// New unit was created - summon it
			await Chara.summon(event.unit, true);
		}

		// Play success animation on the shop character when still present
		if (shopChara) {
			charaEvents.onShopPurchaseSuccesful(shopChara);
		}

		// Close the shop UI
		if (ShopUI.container) {
			await ShopUI.slideOut();
		}
	} catch (error) {
		console.error("Error handling UnitPurchased event:", error);
	}
}

function handlePurchaseFailed(event: SystemEvents.PurchaseFailedEvent): void {
	console.log("Visualizer: Purchase failed:", event.reason);

	try {
		// Get the shop character for failure animation
		const shopChara = Chara.getCharaById(event.shopCharaId);

		// Play failure animation on the shop character
		charaEvents.onShopPurchaseFailed(
			shopChara,
			Geometry.vec2(event.dragStartPosition.x, event.dragStartPosition.y)
		);

		// Show UI feedback
		uiEvents.onPurchaseFailed(event.unitName, event.reason, event.cost);
	} catch (error) {
		console.error("Error handling PurchaseFailed event:", error);
	}
}

function handleUnitSold(event: SystemEvents.UnitSoldEvent): void {
	console.log("Visualizer: Unit sold:", event.unitId);
	// Visual feedback for unit sale could be added here
	// For now, the unit removal is handled by the game logic
}

// ========================================================================
// Unit Event Handlers
// ========================================================================

async function handleUnitSpawned(event: SystemEvents.UnitSpawnedEvent): Promise<void> {
	console.log("Visualizer: Unit spawned:", event.unit.cardId);

	try {
		// Summon the unit with visual effects
		await Chara.summon(event.unit, event.isFromShop);
	} catch (error) {
		console.error("Error handling UnitSpawned event:", error);
	}
}

async function handleUnitUpgraded(event: SystemEvents.UnitUpgradedEvent): Promise<void> {
	console.log(
		"Visualizer: Unit upgraded:",
		event.unit.cardId,
		"from rank",
		event.previousRank,
		"to",
		event.unit.rank
	);

	try {
		// Animate the upgrade
		await Chara.upgradeUnit(event.unit);
	} catch (error) {
		console.error("Error handling UnitUpgraded event:", error);
	}
}

/**
 * Global visualizer instance management
 */
let globalVisualizerInitialized: boolean = false;

/**
 * Initialize the global visualizer
 */
export function initializeVisualizer(): void {
	if (globalVisualizerInitialized) {
		console.warn("Global visualizer already exists, destroying and recreating");
		destroyVisualizer();
	}

	initialize();
	globalVisualizerInitialized = true;
}

/**
 * Get whether the visualizer is initialized
 */
export function isVisualizerInitialized(): boolean {
	return globalVisualizerInitialized;
}

/**
 * Destroy the global visualizer
 */
export function destroyVisualizer(): void {
	destroy();
	globalVisualizerInitialized = false;
}

/**
 * Emit a system event to the visualizer
 * This is a convenience function that can be called from anywhere
 */
export async function emitSystemEvent(event: SystemEvents.AllSystemEvents): Promise<void> {
	if (globalVisualizerInitialized) {
		await emit(event);
	} else {
		console.warn("Cannot emit event - visualizer not initialized:", event.type);
	}
}
