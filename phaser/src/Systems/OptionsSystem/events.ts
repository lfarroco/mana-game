import { Options } from "../../Models/OptionsStore";

export interface OptionsSystemEventPayloads {
	"option_changed": [key: keyof Options, value: Options[keyof Options], previousValue: Options[keyof Options]];
	"sound_enabled": [enabled: boolean];
	"music_enabled": [enabled: boolean];
	"sound_volume_changed": [volume: number];
	"music_volume_changed": [volume: number];
	"game_speed_changed": [speed: number];
	"debug_mode_changed": [debug: boolean];
	"particles_quality_changed": [quality: 'low' | 'medium' | 'high'];
	"options_reset": void;

	// Note: Audio playback events have been removed and replaced with direct AudioManager calls
	// Use AudioManager.getInstance().playMusic(), .stopMusic(), .playSoundEffect(), etc.
}

export const OptionsSystemEvents = {
	OPTION_CHANGED: "option_changed" as const,
	SOUND_ENABLED: "sound_enabled" as const,
	MUSIC_ENABLED: "music_enabled" as const,
	SOUND_VOLUME_CHANGED: "sound_volume_changed" as const,
	MUSIC_VOLUME_CHANGED: "music_volume_changed" as const,
	GAME_SPEED_CHANGED: "game_speed_changed" as const,
	DEBUG_MODE_CHANGED: "debug_mode_changed" as const,
	PARTICLES_QUALITY_CHANGED: "particles_quality_changed" as const,
	OPTIONS_RESET: "options_reset" as const,

	// Note: Audio playback events have been removed and replaced with direct AudioManager calls
	// Use AudioManager.getInstance().playMusic(), .stopMusic(), .playSoundEffect(), etc.
} as const;
