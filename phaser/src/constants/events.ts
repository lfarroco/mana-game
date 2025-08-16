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

	// Options System Events (non-audio)
	OPTION_CHANGED: OptionsSystemEvents.OPTION_CHANGED,
	SOUND_ENABLED: OptionsSystemEvents.SOUND_ENABLED,
	MUSIC_ENABLED: OptionsSystemEvents.MUSIC_ENABLED,
	SOUND_VOLUME_CHANGED: OptionsSystemEvents.SOUND_VOLUME_CHANGED,
	MUSIC_VOLUME_CHANGED: OptionsSystemEvents.MUSIC_VOLUME_CHANGED,
	GAME_SPEED_CHANGED: OptionsSystemEvents.GAME_SPEED_CHANGED,
	DEBUG_MODE_CHANGED: OptionsSystemEvents.DEBUG_MODE_CHANGED,
	PARTICLES_QUALITY_CHANGED: OptionsSystemEvents.PARTICLES_QUALITY_CHANGED,
	OPTIONS_RESET: OptionsSystemEvents.OPTIONS_RESET,

	// Note: Audio playback events have been removed and replaced with direct AudioManager calls
	// Use AudioManager.getInstance().playMusic(), .stopMusic(), .playSoundEffect(), etc.

};