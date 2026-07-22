import { getSettings } from "@Models/OptionsStore";
import { env } from "../Env";

let currentMusic: Phaser.Sound.BaseSound | null = null;
let currentMusicKey: string | null = null;

const soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();
const soundEffectCooldowns: Map<string, number> = new Map();
const SOUND_EFFECT_COOLDOWN_MS = 1000;

type VolumeSound = Phaser.Sound.BaseSound & {
	setVolume: (volume: number) => Phaser.Sound.BaseSound;
};

export const playMusic = (musicKey: string, loop: boolean = true, fadeIn: number = 0) => {
	if (!getSettings().music) {
		console.debug("AudioManager", "Music disabled - skipping playback", { musicKey });
		return;
	}


	if (currentMusic && currentMusic.isPlaying) {
		currentMusic.stop();
	}

	let music;
	try {
		music = env.scene.game.sound.add(musicKey, {
			volume: getSettings().musicVolume,
			loop: loop,
		});
	} catch (e) {
		// Warn but do not crash the app/test
		console.warn("AudioManager", "Failed to load/play music", { musicKey, error: e });
		return;
	}

	if (!music) return;

	currentMusic = music;
	currentMusicKey = musicKey;

	if (fadeIn > 0) {
		// Start at 0 volume and fade in using Phaser tween
		const targetVolume = getSettings().musicVolume;
		const volumeMusic = music as VolumeSound;
		volumeMusic.setVolume(0);
		music.play();

		// Get active scene for tween manager
		const activeScene = env.scene.game.scene.getScenes(true)[0];
		if (activeScene) {
			activeScene.tweens.add({
				targets: music,
				volume: targetVolume,
				duration: fadeIn,
				ease: "Linear",
			});
		} else {
			// Fallback if no active scene
			volumeMusic.setVolume(targetVolume);
		}
	} else {
		music.play();
	}

	console.info("AudioManager", "Playing music", { musicKey, loop });
};

export const stopMusic = (fadeOut: number = 0) => {
	if (!currentMusic || !currentMusic.isPlaying) {
		return;
	}

	if (fadeOut > 0) {
		// Fade out using Phaser tween
		const activeScene = env.scene.game.scene.getScenes(true)[0];
		if (activeScene) {
			const musicToStop = currentMusic;
			activeScene.tweens.add({
				targets: musicToStop,
				volume: 0,
				duration: fadeOut,
				ease: "Linear",
				onComplete: () => {
					musicToStop.stop();
				},
			});
		} else {
			// Fallback if no active scene
			currentMusic.stop();
		}
	} else {
		currentMusic.stop();
	}

	console.info("AudioManager", "Stopped music", { currentMusicKey });
	currentMusic = null;
	currentMusicKey = null;
};

export const playSoundEffect = (soundKey: string, volume?: number) => {
	if (!getSettings().sound) {
		console.debug("AudioManager", "Sound effects disabled - skipping playback", { soundKey });
		return;
	}

	if (!env.scene.game.sound) {
		return;
	}

	if (!env.scene.game.cache.audio.has(soundKey)) {
		console.warn("AudioManager", "Audio key not found in cache - skipping", { soundKey });
		return;
	}

	const now = Date.now();
	const lastPlayed = soundEffectCooldowns.get(soundKey);
	if (lastPlayed && now - lastPlayed < SOUND_EFFECT_COOLDOWN_MS) {
		console.debug("AudioManager", "Sound effect on cooldown", { soundKey, cooldownMs: SOUND_EFFECT_COOLDOWN_MS });
		return;
	}

	const effectVolume = volume ?? getSettings().soundVolume;
	const soundEffect = env.scene.game.sound.add(soundKey, {
		volume: effectVolume,
	});

	if (!soundEffect) return;

	soundEffect.play();
	soundEffects.set(soundKey, soundEffect);
	soundEffectCooldowns.set(soundKey, now);

	soundEffect.once("complete", () => {
		soundEffects.delete(soundKey);
	});

	console.debug("AudioManager", "Playing sound effect", { soundKey, volume: effectVolume });
};

export const stopAllSoundEffects = () => {
	soundEffects.forEach((soundEffect) => {
		if (soundEffect.isPlaying) {
			soundEffect.stop();
		}
	});
	soundEffects.clear();
	console.debug("AudioManager", "Stopped all sound effects");
};

export const onOptionsChanged = () => {
	const settings = getSettings();
	const soundEnabled = settings.sound;
	const musicEnabled = settings.music;
	const soundVolume = settings.soundVolume;
	const musicVolume = settings.musicVolume;

	if (currentMusic && currentMusic.isPlaying) {
		//phaserjs misstyping
		(currentMusic as VolumeSound).setVolume(musicEnabled ? musicVolume : 0);
	}

	soundEffects.forEach((soundEffect) => {
		if (soundEffect.isPlaying) {
			(soundEffect as VolumeSound).setVolume(soundEnabled ? soundVolume : 0);
		}
	});

	if (!soundEnabled) {
		stopAllSoundEffects();
	}
	if (!musicEnabled) {
		stopMusic();
	}
};
