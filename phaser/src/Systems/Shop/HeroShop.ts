import { getState } from "@Models/State";
import { SimpleEventEmitter } from "@Systems/Events";

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
	state: State,
	eventEmitter: EventEmitter,
	serverCardIds?: string[]
): HeroShopResult {
	const cardIds = serverCardIds || [];

	// Emit shop opened event
	const shopOpenedEvent: SystemEvent = {
		type: 'SHOP_OPENED',
		shopType: 'hero',
		cardIds
	};

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
export function closeHeroShop(eventEmitter: EventEmitter): SystemEvent[] {
	return [{
		type: 'SHOP_CLOSED',
		shopType: 'hero'
	}];
}

/**
 * Handle unit purchase from shop
 */
export function purchaseUnit(
	state: State,
	eventEmitter: EventEmitter,
	cardId: string,
	targetSlot?: number
): SystemEvent[] {
	return [{
		type: 'UNIT_PURCHASED',
		cardId,
		targetSlot
	}];
}

/**
 * Skip shop phase
 */
export function skipShopPhase(eventEmitter: EventEmitter): SystemEvent[] {
	return [{
		type: 'PHASE_SKIPPED'
	}];
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
	result.events.forEach(event => eventEmitter.emit(event));
	
	// TODO: Connect to actual visualizer when multiplayer is updated
}
