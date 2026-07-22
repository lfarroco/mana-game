import * as AudioManager from "@Systems/AudioManager";
import { storage } from "@Storage/index";
import { ClientState, type PlayerSettings } from "@Models/ClientState";
import { env } from "../Env";

let clientStateRef: ClientState | null = null;

const currentOptions: PlayerSettings = {
	sound: true,
	soundVolume: 0.6,
	music: true,
	musicVolume: 0.4,
	masterVolume: 1,
	debug: false,
	speed: 4,
	particles: "medium",
	compactTooltips: false,
};

export const init = () => {
	clientStateRef = env.state;
	const savedOptions = loadOptionsFromStorage();
	if (savedOptions) {
		Object.assign(currentOptions, savedOptions);
		Object.assign(env.state.settings, savedOptions);
	}
	setGameSpeed(currentOptions.speed);
	io.game.sound.volume = currentOptions.masterVolume;
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
		io.game.sound.volume = value as number;
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
	io.scene.time.timeScale = newSpeed;
	io.scene.tweens.timeScale = newSpeed;
}

function loadOptionsFromStorage(): Partial<PlayerSettings> | null {
	const savedOptions = storage.getItem(STORAGE_KEY);
	if (!savedOptions) {
		return null;
	}

	const parsed = JSON.parse(savedOptions);

	if (typeof parsed !== "object" || parsed === null) {
		console.warn("OptionsStore", "Invalid options format in storage:", parsed);
		return null;
	}

	const validOptions: Partial<PlayerSettings> = {};

	if (typeof parsed.sound === "boolean") validOptions.sound = parsed.sound;
	if (
		typeof parsed.soundVolume === "number" &&
		parsed.soundVolume >= 0 &&
		parsed.soundVolume <= 1
	) {
		validOptions.soundVolume = parsed.soundVolume;
	}
	if (typeof parsed.music === "boolean") validOptions.music = parsed.music;
	if (
		typeof parsed.musicVolume === "number" &&
		parsed.musicVolume >= 0 &&
		parsed.musicVolume <= 1
	) {
		validOptions.musicVolume = parsed.musicVolume;
	}
	if (
		typeof parsed.masterVolume === "number" &&
		parsed.masterVolume >= 0 &&
		parsed.masterVolume <= 1
	) {
		validOptions.masterVolume = parsed.masterVolume;
	}
	if (typeof parsed.debug === "boolean") validOptions.debug = parsed.debug;
	if (typeof parsed.speed === "number" && parsed.speed > 0) validOptions.speed = parsed.speed;
	if (["low", "medium", "high"].includes(parsed.particles)) {
		validOptions.particles = parsed.particles;
	}
	if (typeof parsed.compactTooltips === "boolean")
		validOptions.compactTooltips = parsed.compactTooltips;

	return validOptions;
}

function saveOptionsToStorage(): void {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(currentOptions));
	} catch (error) {
		console.warn("OptionsStore", "Failed to save options to storage:", error);
	}
}
