// System Events for Architecture Proposal Item 3
// Events that systems emit instead of directly manipulating Phaser objects

export type SystemEvent =
	| ShopOpenedEvent
	| UnitPurchasedEvent
	| ShopClosedEvent
	| PhaseSkippedEvent
	| UnitDamagedEvent
	| UnitHealedEvent
	| CombatStartedEvent
	| CombatEndedEvent
	| RegenAppliedEvent
	| PoisonAppliedEvent
	| TimeoutDamageAppliedEvent;

export interface ShopOpenedEvent {
	type: 'SHOP_OPENED';
	shopType: 'hero' | 'orb' | 'effect';
	cardIds: string[];
}

export interface UnitPurchasedEvent {
	type: 'UNIT_PURCHASED';
	cardId: string;
	targetSlot?: number;
}

export interface ShopClosedEvent {
	type: 'SHOP_CLOSED';
	shopType: 'hero' | 'orb' | 'effect';
}

export interface PhaseSkippedEvent {
	type: 'PHASE_SKIPPED';
}

export interface UnitDamagedEvent {
	type: 'UNIT_DAMAGED';
	unitId: string;
	damage: number;
	source?: string;
}

export interface UnitHealedEvent {
	type: 'UNIT_HEALED';
	unitId: string;
	healing: number;
	source?: string;
}

export interface CombatStartedEvent {
	type: 'COMBAT_STARTED';
	attackerId: string;
	defenderId: string;
}

export interface CombatEndedEvent {
	type: 'COMBAT_ENDED';
	winnerId?: string;
	loserId?: string;
}

export interface RegenAppliedEvent {
	type: 'REGEN_APPLIED';
	unitId: string;
	healing: number;
}

export interface PoisonAppliedEvent {
	type: 'POISON_APPLIED';
	unitId: string;
	damage: number;
}

export interface TimeoutDamageAppliedEvent {
	type: 'TIMEOUT_DAMAGE_APPLIED';
	unitId: string;
	damage: number;
}

// Event emitter interface
export interface EventEmitter {
	emit(event: SystemEvent): void;
	on(eventType: SystemEvent['type'], handler: (event: SystemEvent) => void): void;
	off(eventType: SystemEvent['type'], handler: (event: SystemEvent) => void): void;
}
// Simple event emitter implementation
export class SimpleEventEmitter implements EventEmitter {
	private listeners: Map<SystemEvent['type'], ((event: SystemEvent) => void)[]> = new Map();

	emit(event: SystemEvent): void {
		const handlers = this.listeners.get(event.type);
		if (handlers) {
			handlers.forEach(handler => handler(event));
		}
	}

	on(eventType: SystemEvent['type'], handler: (event: SystemEvent) => void): void {
		if (!this.listeners.has(eventType)) {
			this.listeners.set(eventType, []);
		}
		this.listeners.get(eventType)!.push(handler);
	}

	off(eventType: SystemEvent['type'], handler: (event: SystemEvent) => void): void {
		const handlers = this.listeners.get(eventType);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}
}