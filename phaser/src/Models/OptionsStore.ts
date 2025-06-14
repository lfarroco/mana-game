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

/**
 * Initializes the OptionsStore.
 * Reads 'speed' and 'debug' from URL parameters and sets defaults for other options.
 * This function should be called once at the beginning of the application.
 */
export function initializeOptionsStore(): void {
	let speed = 2; // Default speed
	let debug = false; // Default debug state

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
}

/**
 * Retrieves a copy of all current game options.
 * @returns A shallow copy of the Options object.
 */
export function getOptions(): Readonly<Options> {
	if (!currentOptions) {
		console.warn("OptionsStore not initialized. Call initializeOptionsStore() first. Returning defaults.");
		// Fallback to ensure parts of the game don't crash if called too early, though initialization is key.
		initializeOptionsStore();
	}
	return { ...currentOptions }; // Return a copy
}

/**
 * Retrieves the value of a specific game option.
 * @param key The key of the option to retrieve.
 * @returns The value of the specified option.
 */
export function getOption<K extends keyof Options>(key: K): Options[K] {
	if (!currentOptions) {
		// As above, ensure initialization, but this is a sign of an issue if hit.
		initializeOptionsStore();
	}
	return currentOptions[key];
}