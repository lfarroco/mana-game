import { OptionsSystemManager } from "../OptionsSystem/OptionsSystemManager";
import { OptionsSystemEvents } from "../OptionsSystem/events";
import { getOption } from "../../Models/OptionsStore";

/**
 * Audio system that manages music and sound effects with proper options integration
 * Features:
 * - Music playback with automatic stopping of previous tracks
 * - Sound effect debouncing to prevent rapid repeated playback
 * - Volume control based on user options
 * - Respects sound/music enable/disable settings
 */
export class AudioSystem {
	private game: Phaser.Game;
	private isInitialized = false;

	// Music management
	private currentMusic: Phaser.Sound.BaseSound | null = null;
	private currentMusicKey: string | null = null;

	// Sound effect management
	private soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();
	private soundEffectCooldowns: Map<string, number> = new Map();
	private readonly SOUND_EFFECT_COOLDOWN_MS = 100; // Prevent same effect playing within 100ms

	constructor(game: Phaser.Game) {
		this.game = game;
	}

	/**
	 * Initialize the audio system and set up event listeners
	 */
	initialize(): void {
		if (this.isInitialized) {
			console.warn('AudioSystem already initialized');
			return;
		}

		try {
			const optionsManager = OptionsSystemManager.getInstance();
			const eventEmitter = optionsManager.getEventEmitter();

			// Listen to sound/music option events
			eventEmitter.on(OptionsSystemEvents.SOUND_ENABLED, this.handleSoundToggle.bind(this));
			eventEmitter.on(OptionsSystemEvents.MUSIC_ENABLED, this.handleMusicToggle.bind(this));
			eventEmitter.on(OptionsSystemEvents.SOUND_VOLUME_CHANGED, this.handleSoundVolumeChange.bind(this));
			eventEmitter.on(OptionsSystemEvents.MUSIC_VOLUME_CHANGED, this.handleMusicVolumeChange.bind(this));
			eventEmitter.on(OptionsSystemEvents.OPTIONS_RESET, this.handleOptionsReset.bind(this));

			// Listen to audio playback events
			eventEmitter.on(OptionsSystemEvents.PLAY_MUSIC, this.handlePlayMusic.bind(this));
			eventEmitter.on(OptionsSystemEvents.STOP_MUSIC, this.handleStopMusic.bind(this));
			eventEmitter.on(OptionsSystemEvents.PLAY_SOUND_EFFECT, this.handlePlaySoundEffect.bind(this));
			eventEmitter.on(OptionsSystemEvents.STOP_SOUND_EFFECT, this.handleStopSoundEffect.bind(this));
			eventEmitter.on(OptionsSystemEvents.STOP_ALL_SOUND_EFFECTS, this.handleStopAllSoundEffects.bind(this));

			// Apply current sound settings
			this.applyCurrentSoundSettings();

			this.isInitialized = true;
			console.log('AudioSystem initialized with event listeners');
		} catch (error) {
			console.error('Failed to initialize AudioSystem:', error);
		}
	}

	/**
	 * Play music - stops current music if playing
	 */
	private handlePlayMusic(musicKey: string, loop: boolean = true, fadeIn: number = 0): void {
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
			const music = this.game.sound.add(musicKey, {
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
	private handleStopMusic(fadeOut: number = 0): void {
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
	private handlePlaySoundEffect(soundKey: string, volume?: number): void {
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
			const soundEffect = this.game.sound.add(soundKey, {
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
	private handleStopSoundEffect(soundKey: string): void {
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
	private handleStopAllSoundEffects(): void {
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
	 * Apply current sound settings without events
	 */
	private applyCurrentSoundSettings(): void {
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

			console.log(`Audio settings applied: sound=${soundEnabled}, music=${musicEnabled}, soundVol=${soundVolume}, musicVol=${musicVolume}`);
		} catch (error) {
			console.error('Failed to apply current sound settings:', error);
		}
	}

	/**
	 * Handle sound enable/disable
	 */
	private handleSoundToggle(enabled: boolean): void {
		console.log(`Sound ${enabled ? 'enabled' : 'disabled'}`);
		if (!enabled) {
			this.handleStopAllSoundEffects();
		}
		this.updateAudioState();
	}

	/**
	 * Handle music enable/disable
	 */
	private handleMusicToggle(enabled: boolean): void {
		console.log(`Music ${enabled ? 'enabled' : 'disabled'}`);
		if (!enabled) {
			this.handleStopMusic();
		}
		this.updateAudioState();
	}

	/**
	 * Handle sound volume changes
	 */
	private handleSoundVolumeChange(volume: number): void {
		console.log(`Sound volume changed to: ${volume}`);
		this.updateAudioState();
	}

	/**
	 * Handle music volume changes
	 */
	private handleMusicVolumeChange(volume: number): void {
		console.log(`Music volume changed to: ${volume}`);
		this.updateAudioState();
	}

	/**
	 * Handle options reset
	 */
	private handleOptionsReset(): void {
		console.log('Options reset - reapplying audio settings');
		this.applyCurrentSoundSettings();
	}

	/**
	 * Update the audio state based on current options
	 */
	private updateAudioState(): void {
		this.applyCurrentSoundSettings();
	}

	// Public API methods for external use

	/**
	 * Play music from external code
	 */
	public playMusic(musicKey: string, loop: boolean = true, fadeIn: number = 0): void {
		const optionsManager = OptionsSystemManager.getInstance();
		const eventEmitter = optionsManager.getEventEmitter();
		eventEmitter.emit(OptionsSystemEvents.PLAY_MUSIC, musicKey, loop, fadeIn);
	}

	/**
	 * Stop music from external code
	 */
	public stopMusic(fadeOut: number = 0): void {
		const optionsManager = OptionsSystemManager.getInstance();
		const eventEmitter = optionsManager.getEventEmitter();
		eventEmitter.emit(OptionsSystemEvents.STOP_MUSIC, fadeOut);
	}

	/**
	 * Play sound effect from external code
	 */
	public playSoundEffect(soundKey: string, volume?: number): void {
		const optionsManager = OptionsSystemManager.getInstance();
		const eventEmitter = optionsManager.getEventEmitter();
		eventEmitter.emit(OptionsSystemEvents.PLAY_SOUND_EFFECT, soundKey, volume);
	}

	/**
	 * Stop specific sound effect from external code
	 */
	public stopSoundEffect(soundKey: string): void {
		const optionsManager = OptionsSystemManager.getInstance();
		const eventEmitter = optionsManager.getEventEmitter();
		eventEmitter.emit(OptionsSystemEvents.STOP_SOUND_EFFECT, soundKey);
	}

	/**
	 * Stop all sound effects from external code
	 */
	public stopAllSoundEffects(): void {
		const optionsManager = OptionsSystemManager.getInstance();
		const eventEmitter = optionsManager.getEventEmitter();
		eventEmitter.emit(OptionsSystemEvents.STOP_ALL_SOUND_EFFECTS);
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
			this.handleStopMusic();
			this.handleStopAllSoundEffects();

			// Clear collections
			this.soundEffects.clear();
			this.soundEffectCooldowns.clear();

			// Reset state
			this.currentMusic = null;
			this.currentMusicKey = null;
			this.isInitialized = false;

			console.log('AudioSystem destroyed');
		} catch (error) {
			console.error('Error during AudioSystem destruction:', error);
		}
	}
}