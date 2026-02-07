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

import Phaser from "phaser";
import * as SystemEvents from "@Systems/Events";
import * as Chara from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as ShopUI from "@Systems/Shop/ShopPanel";
import * as Geometry from "@Models/Geometry";
import { getName } from "@i18n/i18n";

/**
 * Event handler function type
 */
type EventHandler<T extends SystemEvents.SystemEvent> = (event: T) => void | Promise<void>;

/**
 * Visualizer class that manages visual updates based on system events
 */
export class Visualizer {
	private scene: Phaser.Scene;
	private eventHandlers: Map<string, Set<EventHandler<any>>>;
	private isInitialized: boolean = false;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.eventHandlers = new Map();
	}

	/**
	 * Initialize the visualizer and subscribe to system events
	 */
	public initialize(): void {
		if (this.isInitialized) {
			console.warn("Visualizer already initialized");
			return;
		}

		// Subscribe to Shop events
		this.subscribe("ShopOpened", this.handleShopOpened.bind(this));
		this.subscribe("ShopClosed", this.handleShopClosed.bind(this));
		this.subscribe("UnitPurchased", this.handleUnitPurchased.bind(this));
		this.subscribe("PurchaseFailed", this.handlePurchaseFailed.bind(this));
		this.subscribe("UnitSold", this.handleUnitSold.bind(this));

		// Subscribe to Unit events
		this.subscribe("UnitSpawned", this.handleUnitSpawned.bind(this));
		this.subscribe("UnitUpgraded", this.handleUnitUpgraded.bind(this));

		this.isInitialized = true;
		console.log("Visualizer initialized");
	}

	/**
	 * Subscribe to a specific event type
	 */
	private subscribe<T extends SystemEvents.SystemEvent>(
		eventType: T["type"],
		handler: EventHandler<T>
	): void {
		if (!this.eventHandlers.has(eventType)) {
			this.eventHandlers.set(eventType, new Set());
		}
		this.eventHandlers.get(eventType)!.add(handler);
	}

	/**
	 * Emit an event to all subscribers
	 */
	public async emit(event: SystemEvents.AllSystemEvents): Promise<void> {
		const handlers = this.eventHandlers.get(event.type);
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
	public destroy(): void {
		this.eventHandlers.clear();
		this.isInitialized = false;
		console.log("Visualizer destroyed");
	}

	// ========================================================================
	// Shop Event Handlers
	// ========================================================================

	private async handleShopOpened(event: SystemEvents.ShopOpenedEvent): Promise<void> {
		console.log("Visualizer: Shop opened with cards:", event.cardIds);
		// The actual shop opening and rendering is handled elsewhere
		// This is just for logging/tracking
	}

	private async handleShopClosed(event: SystemEvents.ShopClosedEvent): Promise<void> {
		console.log("Visualizer: Shop closed");
		await ShopUI.slideOut();
	}

	private async handleUnitPurchased(event: SystemEvents.UnitPurchasedEvent): Promise<void> {
		console.log("Visualizer: Unit purchased:", event.cardId, "wasUpgrade:", event.wasUpgrade);

		try {
			// Get the shop character for success animation
			const shopChara = Chara.getCharaById(event.shopCharaId);

			// Handle visual feedback for successful purchase
			if (event.wasUpgrade && event.upgradedUnit) {
				// Unit was upgraded - animate the upgrade
				await Chara.upgradeUnit(event.upgradedUnit);
			} else if (event.unit) {
				// New unit was created - summon it
				await Chara.summon(event.unit, true);
			}

			// Play success animation on the shop character
			charaEvents.onShopPurchaseSuccesful(shopChara);

			// Close the shop UI
			await ShopUI.slideOut();
		} catch (error) {
			console.error("Error handling UnitPurchased event:", error);
		}
	}

	private handlePurchaseFailed(event: SystemEvents.PurchaseFailedEvent): void {
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

	private handleUnitSold(event: SystemEvents.UnitSoldEvent): void {
		console.log("Visualizer: Unit sold:", event.unitId);
		// Visual feedback for unit sale could be added here
		// For now, the unit removal is handled by the game logic
	}

	// ========================================================================
	// Unit Event Handlers
	// ========================================================================

	private async handleUnitSpawned(event: SystemEvents.UnitSpawnedEvent): Promise<void> {
		console.log("Visualizer: Unit spawned:", event.unit.cardId);

		try {
			// Summon the unit with visual effects
			await Chara.summon(event.unit, event.isFromShop);
		} catch (error) {
			console.error("Error handling UnitSpawned event:", error);
		}
	}

	private async handleUnitUpgraded(event: SystemEvents.UnitUpgradedEvent): Promise<void> {
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
}

/**
 * Global visualizer instance
 * This allows systems to emit events without needing to pass the visualizer around
 */
let globalVisualizer: Visualizer | null = null;

/**
 * Initialize the global visualizer
 */
export function initializeVisualizer(scene: Phaser.Scene): Visualizer {
	if (globalVisualizer) {
		console.warn("Global visualizer already exists, destroying and recreating");
		globalVisualizer.destroy();
	}

	globalVisualizer = new Visualizer(scene);
	globalVisualizer.initialize();
	return globalVisualizer;
}

/**
 * Get the global visualizer instance
 */
export function getVisualizer(): Visualizer {
	if (!globalVisualizer) {
		throw new Error("Visualizer not initialized. Call initializeVisualizer first.");
	}
	return globalVisualizer;
}

/**
 * Destroy the global visualizer
 */
export function destroyVisualizer(): void {
	if (globalVisualizer) {
		globalVisualizer.destroy();
		globalVisualizer = null;
	}
}

/**
 * Emit a system event to the visualizer
 * This is a convenience function that can be called from anywhere
 */
export async function emitSystemEvent(event: SystemEvents.AllSystemEvents): Promise<void> {
	if (globalVisualizer) {
		await globalVisualizer.emit(event);
	} else {
		console.warn("Cannot emit event - visualizer not initialized:", event.type);
	}
}
