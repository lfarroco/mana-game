/**
 * AudioManager - Centralized singleton for audio management
 * 
 * This replaces the event-based audio system with direct method calls.
 * Manages music and sound effects with proper options integration.
 * 
 * Features:
 * - Music playback with automatic stopping of previous tracks
 * - Sound effect debouncing to prevent rapid repeated playback
 * - Volume control based on user options
 * - Respects sound/music enable/disable settings
 */

import { getOption } from "../Models/OptionsStore";

export class AudioManager {
	private static instance: AudioManager | null = null;
	private game: Phaser.Game | null = null;
	private isInitialized = false;

	// Music management
	private currentMusic: Phaser.Sound.BaseSound | null = null;
	private currentMusicKey: string | null = null;

	// Sound effect management
	private soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();
	private soundEffectCooldowns: Map<string, number> = new Map();
	private readonly SOUND_EFFECT_COOLDOWN_MS = 100; // Prevent same effect playing within 100ms

	private constructor() {
		// Private constructor for singleton
	}

	/**
	 * Get the singleton instance of AudioManager
	 */
	public static getInstance(): AudioManager {
		if (!AudioManager.instance) {
			AudioManager.instance = new AudioManager();
		}
		return AudioManager.instance;
	}

	/**
	 * Initialize the audio manager with the Phaser game instance
	 */
	initialize(game: Phaser.Game): void {
		if (this.isInitialized) {
			console.warn('AudioManager already initialized');
			return;
		}

		this.game = game;
		this.isInitialized = true;
		console.log('AudioManager initialized');
	}

	/**
	 * Check if the audio manager is initialized
	 */
	private ensureInitialized(): void {
		if (!this.isInitialized || !this.game) {
			throw new Error('AudioManager not initialized. Call initialize() first.');
		}
	}

	/**
	 * Play music - stops current music if playing
	 */
	public playMusic(musicKey: string, loop: boolean = true, fadeIn: number = 0): void {
		this.ensureInitialized();

		try {
			if (!getOption('music')) {
				console.log(`Music disabled - not playing ${musicKey}`);
				return;
			}

			// Stop current music if playing
			if (this.currentMusic && this.currentMusic.isPlaying) {
				this.currentMusic.stop();
			}

			// Create and play new music
			const music = this.game!.sound.add(musicKey, {
				volume: getOption('musicVolume'),
				loop: loop
			});

			if (music) {
				this.currentMusic = music;
				this.currentMusicKey = musicKey;

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
		} catch (error) {
			console.error(`Failed to play music ${musicKey}:`, error);
		}
	}

	/**
	 * Stop current music
	 */
	public stopMusic(fadeOut: number = 0): void {
		this.ensureInitialized();

		try {
			if (!this.currentMusic || !this.currentMusic.isPlaying) {
				return;
			}

			if (fadeOut > 0) {
				setTimeout(() => {
					if (this.currentMusic) {
						this.currentMusic.stop();
					}
				}, fadeOut);
			} else {
				this.currentMusic.stop();
			}

			console.log(`Stopped music: ${this.currentMusicKey}`);
			this.currentMusic = null;
			this.currentMusicKey = null;
		} catch (error) {
			console.error('Failed to stop music:', error);
		}
	}

	/**
	 * Play sound effect with cooldown protection
	 */
	public playSoundEffect(soundKey: string, volume?: number): void {
		this.ensureInitialized();

		try {
			if (!getOption('sound')) {
				console.log(`Sound effects disabled - not playing ${soundKey}`);
				return;
			}

			// Check cooldown to prevent rapid repeated sounds
			const now = Date.now();
			const lastPlayed = this.soundEffectCooldowns.get(soundKey);
			if (lastPlayed && (now - lastPlayed) < this.SOUND_EFFECT_COOLDOWN_MS) {
				console.log(`Sound effect ${soundKey} on cooldown`);
				return;
			}

			// Play the sound effect
			const effectVolume = volume ?? getOption('soundVolume');
			const soundEffect = this.game!.sound.add(soundKey, {
				volume: effectVolume
			});

			if (soundEffect) {
				soundEffect.play();
				this.soundEffects.set(soundKey, soundEffect);
				this.soundEffectCooldowns.set(soundKey, now);

				// Clean up when sound finishes
				soundEffect.once('complete', () => {
					this.soundEffects.delete(soundKey);
				});

				console.log(`Playing sound effect: ${soundKey} (volume: ${effectVolume})`);
			}
		} catch (error) {
			console.error(`Failed to play sound effect ${soundKey}:`, error);
		}
	}

	/**
	 * Stop specific sound effect
	 */
	public stopSoundEffect(soundKey: string): void {
		this.ensureInitialized();

		try {
			const soundEffect = this.soundEffects.get(soundKey);
			if (soundEffect && soundEffect.isPlaying) {
				soundEffect.stop();
				this.soundEffects.delete(soundKey);
				console.log(`Stopped sound effect: ${soundKey}`);
			}
		} catch (error) {
			console.error(`Failed to stop sound effect ${soundKey}:`, error);
		}
	}

	/**
	 * Stop all sound effects
	 */
	public stopAllSoundEffects(): void {
		this.ensureInitialized();

		try {
			this.soundEffects.forEach((soundEffect) => {
				if (soundEffect.isPlaying) {
					soundEffect.stop();
				}
			});
			this.soundEffects.clear();
			console.log('Stopped all sound effects');
		} catch (error) {
			console.error('Failed to stop all sound effects:', error);
		}
	}

	/**
	 * Update audio state when options change
	 * This should be called by the OptionsStore when audio-related options change
	 */
	public onOptionsChanged(): void {
		this.ensureInitialized();

		try {
			const soundEnabled = getOption('sound');
			const musicEnabled = getOption('music');
			const soundVolume = getOption('soundVolume');
			const musicVolume = getOption('musicVolume');

			// Update current music volume if playing
			if (this.currentMusic && this.currentMusic.isPlaying) {
				(this.currentMusic as any).setVolume(musicEnabled ? musicVolume : 0);
			}

			// Update sound effect volumes
			this.soundEffects.forEach((soundEffect) => {
				if (soundEffect.isPlaying) {
					(soundEffect as any).setVolume(soundEnabled ? soundVolume : 0);
				}
			});

			// If sound/music disabled, stop them
			if (!soundEnabled) {
				this.stopAllSoundEffects();
			}
			if (!musicEnabled) {
				this.stopMusic();
			}

			console.log(`Audio settings applied: sound=${soundEnabled}, music=${musicEnabled}, soundVol=${soundVolume}, musicVol=${musicVolume}`);
		} catch (error) {
			console.error('Failed to apply audio settings:', error);
		}
	}

	/**
	 * Get current music info
	 */
	public getCurrentMusic(): { key: string | null; isPlaying: boolean } {
		return {
			key: this.currentMusicKey,
			isPlaying: this.currentMusic ? this.currentMusic.isPlaying : false
		};
	}

	/**
	 * Get active sound effects
	 */
	public getActiveSoundEffects(): string[] {
		return Array.from(this.soundEffects.keys()).filter(key => {
			const effect = this.soundEffects.get(key);
			return effect && effect.isPlaying;
		});
	}

	/**
	 * Cleanup method
	 */
	destroy(): void {
		try {
			// Stop all audio
			this.stopMusic();
			this.stopAllSoundEffects();

			// Clear collections
			this.soundEffects.clear();
			this.soundEffectCooldowns.clear();

			// Reset state
			this.currentMusic = null;
			this.currentMusicKey = null;
			this.game = null;
			this.isInitialized = false;

			console.log('AudioManager destroyed');
		} catch (error) {
			console.error('Error during AudioManager destruction:', error);
		}
	}

	/**
	 * Reset singleton instance (for testing or complete reinitialization)
	 */
	public static reset(): void {
		if (AudioManager.instance) {
			AudioManager.instance.destroy();
			AudioManager.instance = null;
		}
	}
}
