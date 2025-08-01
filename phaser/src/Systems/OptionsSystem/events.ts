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

	// Audio playback events
	"play_music": [musicKey: string, loop?: boolean, fadeIn?: number];
	"stop_music": [fadeOut?: number];
	"play_sound_effect": [soundKey: string, volume?: number];
	"stop_sound_effect": [soundKey: string];
	"stop_all_sound_effects": void;
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

	// Audio playback events
	PLAY_MUSIC: "play_music" as const,
	STOP_MUSIC: "stop_music" as const,
	PLAY_SOUND_EFFECT: "play_sound_effect" as const,
	STOP_SOUND_EFFECT: "stop_sound_effect" as const,
	STOP_ALL_SOUND_EFFECTS: "stop_all_sound_effects" as const,
} as const;
