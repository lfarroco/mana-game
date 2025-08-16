import { OptionsSystemEvents } from "./EventRegistry";

/**
 * ⚠️  LEGACY EVENT SYSTEM - Consider Using Typed Events Instead
 * 
 * This file contains the old string-based event system. For new events, please consider
 * using the new typed event system for better type safety and modularity:
 * 
 * 1. Create events in `/src/Systems/[SystemName]/events.ts` with:
 *    - Interface defining event payloads with proper TypeScript types
 *    - Constants object with event names (using `as const`)
 * 
 * 2. Use `TypedEventEmitter<SystemEventPayloads>` for type-safe emission/listening
 * 
 * 3. Add to `/src/constants/EventRegistry.ts` for global type awareness
 * 
 * Philosophy: Each system owns its events, making them easier to maintain and remove.
 * When removing a feature, you only need to delete its folder and remove the import
 * from EventRegistry.ts - the compiler will catch any remaining references.
 * 
 */
export const GameEvents = {

	// Options System Events
	OPTION_CHANGED: OptionsSystemEvents.OPTION_CHANGED,
	SOUND_ENABLED: OptionsSystemEvents.SOUND_ENABLED,
	MUSIC_ENABLED: OptionsSystemEvents.MUSIC_ENABLED,
	SOUND_VOLUME_CHANGED: OptionsSystemEvents.SOUND_VOLUME_CHANGED,
	MUSIC_VOLUME_CHANGED: OptionsSystemEvents.MUSIC_VOLUME_CHANGED,
	GAME_SPEED_CHANGED: OptionsSystemEvents.GAME_SPEED_CHANGED,
	DEBUG_MODE_CHANGED: OptionsSystemEvents.DEBUG_MODE_CHANGED,
	PARTICLES_QUALITY_CHANGED: OptionsSystemEvents.PARTICLES_QUALITY_CHANGED,
	OPTIONS_RESET: OptionsSystemEvents.OPTIONS_RESET,

	// Audio Playback Events
	PLAY_MUSIC: OptionsSystemEvents.PLAY_MUSIC,
	STOP_MUSIC: OptionsSystemEvents.STOP_MUSIC,
	PLAY_SOUND_EFFECT: OptionsSystemEvents.PLAY_SOUND_EFFECT,
	STOP_SOUND_EFFECT: OptionsSystemEvents.STOP_SOUND_EFFECT,
	STOP_ALL_SOUND_EFFECTS: OptionsSystemEvents.STOP_ALL_SOUND_EFFECTS,

	// Shop / Unit Acquisition Events
	PURCHASE_FAILED: "purchase_failed", // Payload: { unitName: string, reason: string, cost?: number }
	SHOP_PHASE_ENDED: "shop_phase_ended",

	//UNIT_TOOK_HIT: "unit_took_hit", // Payload: { unit: Unit, damage: number }
	UNIT_SHIELD_GAINED: "unit_shield_gained", // Payload: { unit: Unit, amount: number }
	UNIT_MORALE_RESTORED: "unit_morale_restored", // Payload: { unit: Unit, amount: number }

	MORALE_UPDATED: "morale_updated", // Payload: { forceId: string, newMorale: number, maxMorale: number, totalDamage?: number, damageType?: "poison" | "normal" }

	SHIELD_UPDATED: "shield_updated", // Payload: { forceId: string, newShield: number, maxShield: number }

	// Outcome Events (emitted by the system handling the request)

	OWNED_UNIT_MOVE_ACCEPTED: "owned_unit_move_accepted", // Payload: { unitId: string, newPosition: Vec2, newVisualPosition: {x,y} }
	OWNED_UNIT_SWAP_ACCEPTED: "owned_unit_swap_accepted",   // Payload: { movedUnitId: string, movedUnitNewPos: Vec2, movedUnitVisualPos: {x,y}, swappedUnitId: string, swappedUnitNewPos: Vec2, swappedUnitVisualPos: {x,y} }
	OWNED_UNIT_MOVE_REJECTED: "owned_unit_move_rejected", // Payload: { unitId: string, reason: string, dragStartX: number, dragStartY: number }

};