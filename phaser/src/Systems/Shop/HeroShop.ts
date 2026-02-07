import * as Card from "@Models/Entities/Card";
import { State } from "@Models/State";
import { SystemEvent, EventEmitter } from "@Systems/Events";

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
