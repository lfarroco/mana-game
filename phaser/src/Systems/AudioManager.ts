import { game } from "../main";
import { getOption } from "@Models/OptionsStore";

let currentMusic: Phaser.Sound.BaseSound | null = null;
let currentMusicKey: string | null = null;

let soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();
let soundEffectCooldowns: Map<string, number> = new Map();
const SOUND_EFFECT_COOLDOWN_MS = 300;

export const playMusic = (
	musicKey: string,
	loop: boolean = true,
	fadeIn: number = 0,
) => {
	if (!getOption('music')) {
		console.log(`Music disabled - not playing ${musicKey}`);
		return;
	}

	if (currentMusic && currentMusic.isPlaying) {
		currentMusic.stop();
	}
	const music = game.sound.add(musicKey, {
		volume: getOption('musicVolume'),
		loop: loop
	});

	if (!music) return;

	currentMusic = music;
	currentMusicKey = musicKey;

	if (fadeIn > 0) {
		// Start at 0 volume and fade in
		(music as any).setVolume(0);
		music.play();
		setTimeout(() => {
			if (music.isPlaying) {
				(music as any).setVolume(getOption('musicVolume'));
			}
		}, 50);
	} else {
		music.play();
	}

	console.log(`Playing music: ${musicKey} (loop: ${loop})`);
}

export const stopMusic = (fadeOut: number = 0) => {
	if (!currentMusic || !currentMusic.isPlaying) {
		return;
	}

	if (fadeOut > 0) {
		setTimeout(() => {
			if (currentMusic) {
				currentMusic.stop();
			}
		}, fadeOut);
	} else {
		currentMusic.stop();
	}

	console.log(`Stopped music: ${currentMusicKey}`);
	currentMusic = null;
	currentMusicKey = null;
}

export const playSoundEffect = (soundKey: string, volume?: number) => {

	if (!getOption('sound')) {
		console.log(`Sound effects disabled - not playing ${soundKey}`);
		return;
	}

	const now = Date.now();
	const lastPlayed = soundEffectCooldowns.get(soundKey);
	if (lastPlayed && (now - lastPlayed) < SOUND_EFFECT_COOLDOWN_MS) {
		console.log(`Sound effect ${soundKey} on cooldown`);
		return;
	}

	const effectVolume = volume ?? getOption('soundVolume');
	const soundEffect = game.sound.add(soundKey, {
		volume: effectVolume
	});

	if (!soundEffect) return;

	soundEffect.play();
	soundEffects.set(soundKey, soundEffect);
	soundEffectCooldowns.set(soundKey, now);

	soundEffect.once('complete', () => {
		soundEffects.delete(soundKey);
	});

	console.log(`Playing sound effect: ${soundKey} (volume: ${effectVolume})`);
}


export const stopSoundEffect = (soundKey: string) => {

	const soundEffect = soundEffects.get(soundKey);
	if (soundEffect && soundEffect.isPlaying) {
		soundEffect.stop();
		soundEffects.delete(soundKey);
		console.log(`Stopped sound effect: ${soundKey}`);
	}
}


export const stopAllSoundEffects = () => {
	soundEffects.forEach((soundEffect) => {
		if (soundEffect.isPlaying) {
			soundEffect.stop();
		}
	});
	soundEffects.clear();
	console.log('Stopped all sound effects');
}

export function updateMusicVolume(volume: number) {

	const musicVolume = volume;

	if (currentMusic && currentMusic.isPlaying) {
		//phaserjs misstyping
		(currentMusic as any).setVolume(musicVolume);
	}
}

export function updateSoundVolume(volume: number) {

	const soundVolume = volume / 10;

	soundEffects.forEach((soundEffect) => {
		if (soundEffect.isPlaying) {
			(soundEffect as any).setVolume(soundVolume);
		}
	});

}



export const onOptionsChanged = () => {
	const soundEnabled = getOption('sound');
	const musicEnabled = getOption('music');
	const soundVolume = getOption('soundVolume');
	const musicVolume = getOption('musicVolume');

	if (currentMusic && currentMusic.isPlaying) {
		//phaserjs misstyping
		(currentMusic as any).setVolume(musicEnabled ? musicVolume : 0);
	}

	soundEffects.forEach((soundEffect) => {
		if (soundEffect.isPlaying) {
			(soundEffect as any).setVolume(soundEnabled ? soundVolume : 0);
		}
	});

	if (!soundEnabled) {
		stopAllSoundEffects();
	}
	if (!musicEnabled) {
		stopMusic();
	}
}