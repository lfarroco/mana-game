import { game } from "../main";
import { getOption } from "@Models/OptionsStore";
import { createLogger } from "@Utils/Logger";

let currentMusic: Phaser.Sound.BaseSound | null = null;
let currentMusicKey: string | null = null;

const soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();
const soundEffectCooldowns: Map<string, number> = new Map();
const SOUND_EFFECT_COOLDOWN_MS = 1000;
const logger = createLogger("AudioManager");

type VolumeSound = Phaser.Sound.BaseSound & {
	setVolume: (volume: number) => Phaser.Sound.BaseSound;
};

export const playMusic = (musicKey: string, loop: boolean = true, fadeIn: number = 0) => {
	if (!getOption("music")) {
		logger.debug("Music disabled - skipping playback", { musicKey });
		return;
	}

	if (!game || !game.sound) {
		// Silently fail or log warning if game sound system is not ready (common in tests)
		return;
	}

	if (currentMusic && currentMusic.isPlaying) {
		currentMusic.stop();
	}

	let music;
	try {
		music = game.sound.add(musicKey, {
			volume: getOption("musicVolume"),
			loop: loop,
		});
	} catch (e) {
		// Warn but do not crash the app/test
		logger.warn("Failed to load/play music", { musicKey, error: e });
		return;
	}

	if (!music) return;

	currentMusic = music;
	currentMusicKey = musicKey;

	if (fadeIn > 0) {
		// Start at 0 volume and fade in using Phaser tween
		const targetVolume = getOption("musicVolume");
		const volumeMusic = music as VolumeSound;
		volumeMusic.setVolume(0);
		music.play();

		// Get active scene for tween manager
		const activeScene = game.scene.getScenes(true)[0];
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

	logger.info("Playing music", { musicKey, loop });
};

export const stopMusic = (fadeOut: number = 0) => {
	if (!currentMusic || !currentMusic.isPlaying) {
		return;
	}

	if (fadeOut > 0) {
		// Fade out using Phaser tween
		const activeScene = game.scene.getScenes(true)[0];
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

	logger.info("Stopped music", { currentMusicKey });
	currentMusic = null;
	currentMusicKey = null;
};

export const playSoundEffect = (soundKey: string, volume?: number) => {
	if (!getOption("sound")) {
		logger.debug("Sound effects disabled - skipping playback", { soundKey });
		return;
	}

	if (!game || !game.sound) {
		return;
	}

	if (!game.cache.audio.has(soundKey)) {
		logger.warn("Audio key not found in cache - skipping", { soundKey });
		return;
	}

	const now = Date.now();
	const lastPlayed = soundEffectCooldowns.get(soundKey);
	if (lastPlayed && now - lastPlayed < SOUND_EFFECT_COOLDOWN_MS) {
		logger.debug("Sound effect on cooldown", { soundKey, cooldownMs: SOUND_EFFECT_COOLDOWN_MS });
		return;
	}

	const effectVolume = volume ?? getOption("soundVolume");
	const soundEffect = game.sound.add(soundKey, {
		volume: effectVolume,
	});

	if (!soundEffect) return;

	soundEffect.play();
	soundEffects.set(soundKey, soundEffect);
	soundEffectCooldowns.set(soundKey, now);

	soundEffect.once("complete", () => {
		soundEffects.delete(soundKey);
	});

	logger.debug("Playing sound effect", { soundKey, volume: effectVolume });
};

export const stopSoundEffect = (soundKey: string) => {
	const soundEffect = soundEffects.get(soundKey);
	if (soundEffect && soundEffect.isPlaying) {
		soundEffect.stop();
		soundEffects.delete(soundKey);
		logger.debug("Stopped sound effect", { soundKey });
	}
};

export const stopAllSoundEffects = () => {
	soundEffects.forEach((soundEffect) => {
		if (soundEffect.isPlaying) {
			soundEffect.stop();
		}
	});
	soundEffects.clear();
	logger.debug("Stopped all sound effects");
};

export const onOptionsChanged = () => {
	const soundEnabled = getOption("sound");
	const musicEnabled = getOption("music");
	const soundVolume = getOption("soundVolume");
	const musicVolume = getOption("musicVolume");

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
