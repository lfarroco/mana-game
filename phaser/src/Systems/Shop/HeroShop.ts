import { getState, State } from "@Models/State";
import { SimpleEventEmitter, EventEmitter, SystemEvent, createShopOpenedEvent, createShopClosedEvent, createUnitPurchasedEvent, createPhaseSkippedEvent } from "@Systems/Events";

export interface HeroShopResult {
	events: SystemEvent[];
	shopData: {
		cardIds: string[];
		shopType: 'hero';
	};
}

/**
 * Open hero shop - returns events instead of manipulating Phaser objects
 * Per Architecture Proposal Item 3: systems should return mutations/events
 */
export function openHeroShop(
	_state: State,
	_eventEmitter: EventEmitter,
	serverCardIds?: string[]
): HeroShopResult {
	const cardIds = serverCardIds || [];

	// Emit shop opened event
	const shopOpenedEvent = createShopOpenedEvent(cardIds);

	return {
		events: [shopOpenedEvent],
		shopData: {
			cardIds,
			shopType: 'hero'
		}
	};
}

/**
 * Handle shop close - emits phase skip event
 */
export function closeHeroShop(_eventEmitter: EventEmitter): SystemEvent[] {
	return [createShopClosedEvent()];
}

/**
 * Handle unit purchase from shop
 */
export function purchaseUnit(
	_state: State,
	_eventEmitter: EventEmitter,
	cardId: string,
	_targetSlot?: number
): SystemEvent[] {
	return [createUnitPurchasedEvent(cardId, "", false)];
}

/**
 * Skip shop phase
 */
export function skipShopPhase(_eventEmitter: EventEmitter): SystemEvent[] {
	return [createPhaseSkippedEvent("shop")];
}

/**
 * Backward compatibility function for existing code
 * TODO: Update all callers to use the new event-driven system
 */
export async function openHeroShopLegacy(serverCardIds?: string[]): Promise<void> {
	const state = getState();
	const eventEmitter = new SimpleEventEmitter();
	
	// For now, just emit the event but don't handle visualization
	// This maintains backward compatibility while we migrate
	const result = openHeroShop(state, eventEmitter, serverCardIds);
	result.events.forEach(event => eventEmitter.emit(event.type, event));
	
	// TODO: Connect to actual visualizer when multiplayer is updated
}
