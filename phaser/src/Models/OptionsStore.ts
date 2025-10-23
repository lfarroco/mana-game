import { game } from "../main";
import * as AudioManager from "@Systems/AudioManager";

let currentOptions: Options = {
	sound: true,
	soundVolume: 0.4,
	music: true,
	musicVolume: 0.2,
	debug: false,
	speed: 2,
	particles: 'medium',
};

export const init = () => {
	const savedOptions = loadOptionsFromStorage();
	if (savedOptions) {
		Object.assign(currentOptions, savedOptions);
	}
	setGameSpeed(currentOptions.speed);
}

export type Options = {
	sound: boolean;
	soundVolume: number;
	music: boolean;
	musicVolume: number;
	debug: boolean;
	speed: number;
	particles: 'low' | 'medium' | 'high';
};

const STORAGE_KEY = 'mana-game-options';

export function getOptions(): Readonly<Options> {
	return { ...currentOptions };
}

export function getOption<K extends keyof Options>(key: K, default_?: Options[K]): Options[K] {
	return currentOptions[key] ?? default_;
}

export function setOption<K extends keyof Options>(key: K, value: Options[K]): void {
	currentOptions[key] = value;

	saveOptionsToStorage();

	if (key === 'sound' || key === 'music' || key === 'soundVolume' || key === 'musicVolume') {
		AudioManager.onOptionsChanged();
	}

	if (key === 'speed') {
		setGameSpeed(value as number);
		return;
	}
	if (key === 'soundVolume' || key === 'musicVolume') {
		game.sound.volume = (currentOptions.soundVolume as number) * (currentOptions.musicVolume as number);
		return;
	}
}

export function saveOptions(): void {
	saveOptionsToStorage();
}

function setGameSpeed(speed: number) {
	const newSpeed = Math.max(0, speed);

	game.scene.getScenes(true).forEach(scene => {
		//https://phaser.discourse.group/t/how-to-add-time-scale-that-affects-tweens-animations-and-so-on-solved/1357/2
		scene.time.timeScale = newSpeed;
		scene.tweens.timeScale = newSpeed;
	});
}

function loadOptionsFromStorage(): Partial<Options> | null {
	const savedOptions = localStorage.getItem(STORAGE_KEY);
	if (!savedOptions) {
		return null;
	}

	const parsed = JSON.parse(savedOptions);

	if (typeof parsed !== 'object' || parsed === null) {
		console.warn('Invalid options format in localStorage:', parsed);
		return null;
	}

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
}

function saveOptionsToStorage(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOptions));
	} catch (error) {
		console.warn('Failed to save options to localStorage:', error);
	}
}