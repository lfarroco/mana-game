/**
 * @file Manages the game's configuration options like sound, music, debug mode, and game speed.
 * This store provides a centralized and controlled way to access and potentially update these options.
 */

import { TypedEventEmitter } from "../Systems/Events/TypedEventEmitter";
import { OptionsSystemEvents, OptionsSystemEventPayloads } from "../Systems/OptionsSystem/events";

export type Options = {
	sound: boolean;
	soundVolume: number;
	music: boolean;
	musicVolume: number;
	debug: boolean;
	speed: number;
	particles: 'low' | 'medium' | 'high';
};

let currentOptions: Options;
let game: Phaser.Game;
let eventEmitter: TypedEventEmitter<OptionsSystemEventPayloads> | null = null;

const STORAGE_KEY = 'mana-game-options';

/**
 * Initializes the OptionsStore.
 * Reads 'speed' and 'debug' from URL parameters and sets defaults for other options.
 * This function should be called once at the beginning of the application.
 */
export function initializeOptionsStore(gameRef: Phaser.Game, optionsEventEmitter?: TypedEventEmitter<OptionsSystemEventPayloads>): void {

	game = gameRef;
	eventEmitter = optionsEventEmitter || null;
	let speed = 1;
	let debug = false;

	const urlParams = new URLSearchParams(window.location.search);

	if (urlParams.has("speed")) {
		const paramSpeed = urlParams.get("speed");
		if (paramSpeed) {
			const parsedSpeed = parseFloat(paramSpeed);
			if (!isNaN(parsedSpeed)) {
				speed = parsedSpeed;
			}
		}
	}

	if (urlParams.has("debug")) {
		const paramDebug = urlParams.get("debug");
		if (paramDebug) {
			debug = paramDebug === "true";
		}
	}

	// Start with default options
	currentOptions = {
		sound: true,
		soundVolume: 0.4,
		music: true,
		musicVolume: 0.2,
		debug,
		speed,
		particles: 'medium',
	};

	// Load saved options from localStorage and merge with defaults
	const savedOptions = loadOptionsFromStorage();
	if (savedOptions) {
		// Merge saved options with defaults, but preserve URL parameters
		Object.assign(currentOptions, savedOptions);

		// URL parameters take precedence over saved options
		if (urlParams.has("speed")) {
			currentOptions.speed = speed;
		}
		if (urlParams.has("debug")) {
			currentOptions.debug = debug;
		}
	}

	setGameSpeed(currentOptions.speed);
}

/**
 * Retrieves a copy of all current game options.
 * @returns A shallow copy of the Options object.
 */
export function getOptions(): Readonly<Options> {
	return { ...currentOptions };
}

/**
 * Retrieves the value of a specific game option.
 * @param key The key of the option to retrieve.
 * @returns The value of the specified option.
 */
export function getOption<K extends keyof Options>(key: K): Options[K] {
	return currentOptions[key];
}

/**
 * Sets a specific game option.
 * @param key The key of the option to set.
 * @param value The new value for the option.
 */
export function setOption<K extends keyof Options>(key: K, value: Options[K]): void {
	const previousValue = currentOptions[key];
	currentOptions[key] = value;

	// Save to localStorage whenever an option changes
	saveOptionsToStorage();

	// Emit events if event emitter is available
	if (eventEmitter) {
		// General option changed event
		eventEmitter.emit(OptionsSystemEvents.OPTION_CHANGED, key, value, previousValue);

		// Specific events for different option types
		switch (key) {
			case 'sound':
				eventEmitter.emit(OptionsSystemEvents.SOUND_ENABLED, value as boolean);
				break;
			case 'music':
				eventEmitter.emit(OptionsSystemEvents.MUSIC_ENABLED, value as boolean);
				break;
			case 'soundVolume':
				eventEmitter.emit(OptionsSystemEvents.SOUND_VOLUME_CHANGED, value as number);
				break;
			case 'musicVolume':
				eventEmitter.emit(OptionsSystemEvents.MUSIC_VOLUME_CHANGED, value as number);
				break;
			case 'speed':
				eventEmitter.emit(OptionsSystemEvents.GAME_SPEED_CHANGED, value as number);
				break;
			case 'debug':
				eventEmitter.emit(OptionsSystemEvents.DEBUG_MODE_CHANGED, value as boolean);
				break;
			case 'particles':
				eventEmitter.emit(OptionsSystemEvents.PARTICLES_QUALITY_CHANGED, value as 'low' | 'medium' | 'high');
				break;
		}
	}

	// Special handling for certain options that require immediate application
	if (key === 'speed') {
		setGameSpeed(value as number);
		return;
	}
	// Add other special handling here if needed, e.g., for sound volume
	if (key === 'soundVolume' || key === 'musicVolume') {
		// This assumes you have a global sound manager or similar
		// For now, Phaser's global sound volume can be set if applicable
		if (game && game.sound) {
			game.sound.volume = (currentOptions.soundVolume as number) * (currentOptions.musicVolume as number);
		}
		return;
	}
}

/**
 * Manually save current options to localStorage
 * This is automatically called by setOption, but can be called manually if needed
 */
export function saveOptions(): void {
	saveOptionsToStorage();
}

/**
 * Reset all options to default values and save to localStorage
 */
export function resetOptionsToDefaults(): void {
	const urlParams = new URLSearchParams(window.location.search);
	let speed = 1;
	let debug = false;

	// Preserve URL parameters
	if (urlParams.has("speed")) {
		const paramSpeed = urlParams.get("speed");
		if (paramSpeed) {
			const parsedSpeed = parseFloat(paramSpeed);
			if (!isNaN(parsedSpeed)) {
				speed = parsedSpeed;
			}
		}
	}

	if (urlParams.has("debug")) {
		const paramDebug = urlParams.get("debug");
		if (paramDebug) {
			debug = paramDebug === "true";
		}
	}

	currentOptions = {
		sound: true,
		soundVolume: 0.4,
		music: true,
		musicVolume: 0.2,
		debug,
		speed,
		particles: 'medium',
	};

	saveOptionsToStorage();
	setGameSpeed(currentOptions.speed);

	// Emit options reset event
	if (eventEmitter) {
		eventEmitter.emit(OptionsSystemEvents.OPTIONS_RESET);
	}
}

/**
 * Sets the global game speed for all active scenes.
 * This function should be called whenever the user changes the speed setting.
 *
 * @param speed The new speed multiplier (1=normal, 0.5=slow, 0=pause).
 */
function setGameSpeed(speed: number) {
	// Clamp the speed to non-negative values.
	const newSpeed = Math.max(0, speed);

	// Update the time scale for every currently running scene.
	// The 'true' argument for getScenes gets only active scenes.
	game.scene.getScenes(true).forEach(scene => {
		//https://phaser.discourse.group/t/how-to-add-time-scale-that-affects-tweens-animations-and-so-on-solved/1357/2
		scene.time.timeScale = newSpeed;
		scene.tweens.timeScale = newSpeed;
	});
}

/**
 * Load options from localStorage
 * @returns Saved options or null if not found or invalid
 */
function loadOptionsFromStorage(): Partial<Options> | null {
	try {
		const savedOptions = localStorage.getItem(STORAGE_KEY);
		if (!savedOptions) {
			return null;
		}

		const parsed = JSON.parse(savedOptions);

		// Validate the parsed options structure
		if (typeof parsed !== 'object' || parsed === null) {
			return null;
		}

		// Return only valid option keys to avoid potential issues
		const validOptions: Partial<Options> = {};

		if (typeof parsed.sound === 'boolean') validOptions.sound = parsed.sound;
		if (typeof parsed.soundVolume === 'number' && parsed.soundVolume >= 0 && parsed.soundVolume <= 1) {
			validOptions.soundVolume = parsed.soundVolume;
		}
		if (typeof parsed.music === 'boolean') validOptions.music = parsed.music;
		if (typeof parsed.musicVolume === 'number' && parsed.musicVolume >= 0 && parsed.musicVolume <= 1) {
			validOptions.musicVolume = parsed.musicVolume;
		}
		if (typeof parsed.debug === 'boolean') validOptions.debug = parsed.debug;
		if (typeof parsed.speed === 'number' && parsed.speed > 0) validOptions.speed = parsed.speed;
		if (['low', 'medium', 'high'].includes(parsed.particles)) {
			validOptions.particles = parsed.particles;
		}

		return validOptions;
	} catch (error) {
		console.warn('Failed to load options from localStorage:', error);
		return null;
	}
}

/**
 * Save current options to localStorage
 */
function saveOptionsToStorage(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOptions));
	} catch (error) {
		console.warn('Failed to save options to localStorage:', error);
	}
}

// Debug helper - only exposed in development mode
if (process.env.NODE_ENV === 'development') {
	//@ts-ignore
	window.setGameSpeed = setGameSpeed;
	//@ts-ignore
	window.getGameOptions = getOptions;
	//@ts-ignore
	window.saveGameOptions = saveOptions;
	//@ts-ignore
	window.resetGameOptions = resetOptionsToDefaults;
	//@ts-ignore
	window.clearGameOptionsStorage = () => {
		try {
			localStorage.removeItem(STORAGE_KEY);
			console.log('Game options cleared from localStorage');
		} catch (error) {
			console.error('Failed to clear options from localStorage:', error);
		}
	};
}