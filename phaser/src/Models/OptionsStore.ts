import * as AudioManager from "@Systems/AudioManager";
import { storage } from "@Systems/Storage";
import { ClientState, defaultSettings, type PlayerSettings } from "@Models/ClientState";
import { env } from "@Env";
import { parseStoredOptions } from "@game/settings/options";

let clientStateRef: ClientState | null = null;

// Single source of truth for defaults — mirrors ClientState.defaultSettings()
// These values are persisted under
// `mana-game-options` on first boot.
const currentOptions: PlayerSettings = defaultSettings();

export const init = () => {
	clientStateRef = env.state;
	ensureOptionsInStorage();
	const savedOptions = loadOptionsFromStorage();
	if (savedOptions) {
		Object.assign(currentOptions, savedOptions);
		Object.assign(env.state.settings, savedOptions);
	}
	setGameSpeed(currentOptions.speed);
	env.scene.sound.volume = currentOptions.masterVolume;
	AudioManager.onOptionsChanged();
};

export type Options = PlayerSettings;

const STORAGE_KEY = "mana-game-options";

export function getSettings(): PlayerSettings {
	return currentOptions;
}

export function setOption<K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]): void {
	currentOptions[key] = value;

	// Keep clientState.settings in sync
	if (clientStateRef) {
		clientStateRef.settings[key] = value;
	}

	saveOptionsToStorage();

	if (key === "sound" || key === "music" || key === "soundVolume" || key === "musicVolume") {
		AudioManager.onOptionsChanged();
	}

	if (key === "speed") {
		setGameSpeed(value as number);
		return;
	}
	if (key === "masterVolume") {
		env.scene.sound.volume = value as number;
		return;
	}
	if (key === "soundVolume" || key === "musicVolume") {
		return;
	}
}

export function saveOptions(): void {
	saveOptionsToStorage();
}

function setGameSpeed(speed: number) {
	const newSpeed = Math.max(0, speed);

	//https://phaser.discourse.group/t/how-to-add-time-scale-that-affects-tweens-animations-and-so-on-solved/1357/2
	env.scene.time.timeScale = newSpeed;
	env.scene.tweens.timeScale = newSpeed;
}

/**
 * Ensures the options namespace exists in storage on boot. The first run has no
 * persisted settings, so the namespace is created with the default values —
 * otherwise `loadOptionsFromStorage()` would find nothing and the in-memory
 * defaults would never be persisted (causing e.g. game speed to drift from the
 * default defined in `ClientState.defaultSettings()`).
 */
function ensureOptionsInStorage(): void {
	if (storage.getItem(STORAGE_KEY) === null) {
		saveOptionsToStorage();
	}
}

function loadOptionsFromStorage(): Partial<PlayerSettings> | null {
	const raw = storage.getItem(STORAGE_KEY);
	if (!raw) return null;
	const parsed = parseStoredOptions(raw);
	if (parsed === null) {
		console.warn("OptionsStore", "Invalid options format in storage:", raw);
	}
	return parsed;
}

function saveOptionsToStorage(): void {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(currentOptions));
	} catch (error) {
		console.warn("OptionsStore", "Failed to save options to storage:", error);
	}
}
