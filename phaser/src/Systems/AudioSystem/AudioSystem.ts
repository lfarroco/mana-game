import { OptionsSystemManager } from "../OptionsSystem/OptionsSystemManager";
import { OptionsSystemEvents } from "../OptionsSystem/events";
import { getOption } from "../../Models/OptionsStore";

/**
 * Audio system that responds to sound/music option changes
 * This is an example of how systems can listen to options events
 */
export class AudioSystem {
	private game: Phaser.Game;
	private isInitialized = false;

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

			// Listen to sound/music related events
			eventEmitter.on(OptionsSystemEvents.SOUND_ENABLED, this.handleSoundToggle.bind(this));
			eventEmitter.on(OptionsSystemEvents.MUSIC_ENABLED, this.handleMusicToggle.bind(this));
			eventEmitter.on(OptionsSystemEvents.SOUND_VOLUME_CHANGED, this.handleSoundVolumeChange.bind(this));
			eventEmitter.on(OptionsSystemEvents.MUSIC_VOLUME_CHANGED, this.handleMusicVolumeChange.bind(this));
			eventEmitter.on(OptionsSystemEvents.OPTIONS_RESET, this.handleOptionsReset.bind(this));

			// Apply current sound settings
			this.applyCurrentSoundSettings();

			this.isInitialized = true;
			console.log('AudioSystem initialized with event listeners');
		} catch (error) {
			console.error('Failed to initialize AudioSystem:', error);
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

			// Apply settings to Phaser's sound system
			if (this.game && this.game.sound) {
				// Note: You might want to separate sound effects and music volumes
				// This is a simplified example
				this.game.sound.mute = !soundEnabled && !musicEnabled;
				this.game.sound.volume = Math.max(soundVolume, musicVolume);
			}

			console.log(`Audio settings applied: sound=${soundEnabled}, music=${musicEnabled}, volume=${Math.max(soundVolume, musicVolume)}`);
		} catch (error) {
			console.error('Failed to apply current sound settings:', error);
		}
	}

	/**
	 * Handle sound enable/disable
	 */
	private handleSoundToggle(enabled: boolean): void {
		console.log(`Sound ${enabled ? 'enabled' : 'disabled'}`);
		this.updateAudioState();
	}

	/**
	 * Handle music enable/disable
	 */
	private handleMusicToggle(enabled: boolean): void {
		console.log(`Music ${enabled ? 'enabled' : 'disabled'}`);
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

	/**
	 * Cleanup method
	 */
	destroy(): void {
		// Event cleanup would happen automatically when the event emitter is destroyed
		this.isInitialized = false;
		console.log('AudioSystem destroyed');
	}
}
