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
import { createLogger } from "@Utils/Logger";

const logger = createLogger("Visualizer");

/**
 * Event handler function type
 */
type EventHandler<T extends SystemEvents.SystemEvent> = (event: T) => void | Promise<void>;

/**
 * Event handlers map
 */
const eventHandlers: Map<string, Set<EventHandler<SystemEvents.SystemEvent>>> = new Map();

/**
 * Initialize the visualizer and subscribe to system events
 */
export function initialize(): void {

	// Subscribe to Shop events
	subscribe("ShopOpened", handleShopOpened);
	subscribe("ShopClosed", handleShopClosed);
	subscribe("UnitPurchased", handleUnitPurchased);
	subscribe("PurchaseFailed", handlePurchaseFailed);
	subscribe("UnitSold", handleUnitSold);

	// Subscribe to Unit events
	subscribe("UnitSpawned", handleUnitSpawned);
	subscribe("UnitUpgraded", handleUnitUpgraded);

	logger.debug("Visualizer initialized");
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
	eventHandlers.get(eventType)!.add(handler as unknown as EventHandler<SystemEvents.SystemEvent>);
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
			logger.error(`Error handling event ${event.type}:`, error);
		}
	}

	// Wait for all async handlers to complete
	if (promises.length > 0) {
		await Promise.all(promises);
	}
}

// ========================================================================
// Shop Event Handlers
// ========================================================================

async function handleShopOpened(_event: SystemEvents.ShopOpenedEvent): Promise<void> {
	logger.debug("Visualizer: Shop opened with cards:", _event.cardIds);
	// The actual shop opening and rendering is handled elsewhere
	// This is just for logging/tracking
}

async function handleShopClosed(_event: SystemEvents.ShopClosedEvent): Promise<void> {
	logger.debug("Visualizer: Shop closed");
	await ShopUI.slideOut();
}

async function handleUnitPurchased(event: SystemEvents.UnitPurchasedEvent): Promise<void> {
	logger.debug(`Visualizer: Unit purchased: ${event.cardId}, wasUpgrade: ${event.wasUpgrade}`);

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
}

function handlePurchaseFailed(event: SystemEvents.PurchaseFailedEvent): void {
	logger.debug("Visualizer: Purchase failed:", event.reason);

	// Get the shop character for failure animation
	const shopChara = Chara.getCharaById(event.shopCharaId);

	// Play failure animation on the shop character
	charaEvents.onShopPurchaseFailed(
		shopChara,
		Geometry.vec2(event.dragStartPosition.x, event.dragStartPosition.y)
	);

	// Show UI feedback
	uiEvents.onPurchaseFailed(event.unitName, event.reason, event.cost);
}

function handleUnitSold(event: SystemEvents.UnitSoldEvent): void {
	logger.debug("Visualizer: Unit sold:", event.unitId);
	// Visual feedback for unit sale could be added here
	// For now, the unit removal is handled by the game logic
}

// ========================================================================
// Unit Event Handlers
// ========================================================================

async function handleUnitSpawned(event: SystemEvents.UnitSpawnedEvent): Promise<void> {
	logger.debug("Visualizer: Unit spawned:", event.unit.cardId);

	// Summon the unit with visual effects
	await Chara.summon(event.unit, event.isFromShop);
}

async function handleUnitUpgraded(event: SystemEvents.UnitUpgradedEvent): Promise<void> {
	logger.debug(
		`Visualizer: Unit upgraded: ${event.unit.cardId} from rank ${event.previousRank} to ${event.unit.rank}`
	);

	// Animate the upgrade
	await Chara.upgradeUnit(event.unit);
}

/**
 * Initialize the global visualizer
 */
export function initializeVisualizer(): void {

	initialize();
}

/**
 * Emit a system event to the visualizer
 * This is a convenience function that can be called from anywhere
 */
export async function emitSystemEvent(event: SystemEvents.AllSystemEvents): Promise<void> {
	await emit(event);
}
