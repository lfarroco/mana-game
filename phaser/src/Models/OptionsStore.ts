/**
 * @file Manages the game's configuration options like sound, music, debug mode, and game speed.
 * This store provides a centralized and controlled way to access and potentially update these options.
 */

export type Options = {
	sound: boolean;
	soundVolume: number;
	music: boolean;
	musicVolume: number;
	debug: boolean;
	speed: number;
};

let currentOptions: Options;
let game: Phaser.Game;

/**
 * Initializes the OptionsStore.
 * Reads 'speed' and 'debug' from URL parameters and sets defaults for other options.
 * This function should be called once at the beginning of the application.
 */
export function initializeOptionsStore(gameRef: Phaser.Game): void {

	game = gameRef;
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

	currentOptions = {
		sound: true,
		soundVolume: 0.4,
		music: true,
		musicVolume: 0.2,
		debug,
		speed,
	};

	setGameSpeed(speed);
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
	currentOptions[key] = value;

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

// Debug helper - only exposed in development mode
if (process.env.NODE_ENV === 'development') {
	//@ts-ignore
	window.setGameSpeed = setGameSpeed;
}