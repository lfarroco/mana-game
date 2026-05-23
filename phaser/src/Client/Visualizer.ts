import * as SystemEvents from "@Systems/Events";
import * as Chara from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as ShopUI from "@Systems/Shop/ShopPanel";
import * as Geometry from "@Models/Geometry";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("Visualizer");

type EventHandler<T extends SystemEvents.SystemEvent> = (event: T) => void | Promise<void>;

const eventHandlers: Map<string, Set<EventHandler<SystemEvents.SystemEvent>>> = new Map();

export function initializeVisualizer(): void {

	subscribe("ShopOpened", handleShopOpened);
	subscribe("ShopClosed", handleShopClosed);
	subscribe("UnitPurchased", handleUnitPurchased);
	subscribe("PurchaseFailed", handlePurchaseFailed);
	subscribe("UnitSold", handleUnitSold);

	subscribe("UnitSpawned", handleUnitSpawned);
	subscribe("UnitUpgraded", handleUnitUpgraded);

}

function subscribe<T extends SystemEvents.SystemEvent>(
	eventType: T["type"],
	handler: EventHandler<T>
): void {
	if (!eventHandlers.has(eventType)) {
		eventHandlers.set(eventType, new Set());
	}
	eventHandlers.get(eventType)!.add(handler as unknown as EventHandler<SystemEvents.SystemEvent>);
}

export async function emit(event: SystemEvents.AllSystemEvents): Promise<void> {
	const handlers = eventHandlers.get(event.type);
	if (!handlers || handlers.size === 0) {
		return;
	}

	const promises: Promise<void>[] = [];
	for (const handler of handlers) {
		const result = handler(event);
		if (result instanceof Promise) {
			promises.push(result);
		}
	}

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

	const shopChara = Chara.getCharaById(event.shopCharaId);

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
}

// ========================================================================
// Unit Event Handlers
// ========================================================================

async function handleUnitSpawned(event: SystemEvents.UnitSpawnedEvent): Promise<void> {
	logger.debug("Visualizer: Unit spawned:", event.unit.cardId);

	await Chara.summon(event.unit, event.isFromShop);
}

async function handleUnitUpgraded(event: SystemEvents.UnitUpgradedEvent): Promise<void> {
	logger.debug(
		`Visualizer: Unit upgraded: ${event.unit.cardId} from rank ${event.previousRank} to ${event.unit.rank}`
	);

	await Chara.upgradeUnit(event.unit);
}

/**
 * Emit a system event to the visualizer
 * This is a convenience function that can be called from anywhere
 */
export async function emitSystemEvent(event: SystemEvents.AllSystemEvents): Promise<void> {
	await emit(event);
}
