import { AudioManager } from "../AudioManager";

/**
 * DEPRECATED: Legacy AudioSystem - Use AudioManager directly instead
 * 
 * This class is kept for backward compatibility but now delegates to AudioManager.
 * For new code, use AudioManager.getInstance() directly.
 * 
 * @deprecated Use AudioManager.getInstance() instead
 */
export class AudioSystem {
	private static instance: AudioSystem | null = null;
	private audioManager: AudioManager;

	constructor(game: Phaser.Game) {
		// Initialize AudioManager with the game instance
		this.audioManager = AudioManager.getInstance();
		this.audioManager.initialize(game);
		AudioSystem.instance = this;
	}

	/**
	 * Get the singleton instance of AudioSystem
	 * @deprecated Use AudioManager.getInstance() instead
	 */
	public static getInstance(): AudioSystem {
		if (!AudioSystem.instance) {
			throw new Error('AudioSystem not initialized. Create an instance first.');
		}
		return AudioSystem.instance;
	}

	/**
	 * Initialize the audio system and set up event listeners
	 * @deprecated AudioManager handles this internally now
	 */
	initialize(): void {


	}

	/**
	 * Play music from external code
	 * @deprecated Use AudioManager.getInstance().playMusic() instead
	 */
	public playMusic(musicKey: string, loop: boolean = true, fadeIn: number = 0): void {
		this.audioManager.playMusic(musicKey, loop, fadeIn);
	}

	/**
	 * Stop music from external code
	 * @deprecated Use AudioManager.getInstance().stopMusic() instead
	 */
	public stopMusic(fadeOut: number = 0): void {
		this.audioManager.stopMusic(fadeOut);
	}

	/**
	 * Play sound effect from external code
	 * @deprecated Use AudioManager.getInstance().playSoundEffect() instead
	 */
	public playSoundEffect(soundKey: string, volume?: number): void {
		this.audioManager.playSoundEffect(soundKey, volume);
	}

	/**
	 * Stop specific sound effect from external code
	 * @deprecated Use AudioManager.getInstance().stopSoundEffect() instead
	 */
	public stopSoundEffect(soundKey: string): void {
		this.audioManager.stopSoundEffect(soundKey);
	}

	/**
	 * Stop all sound effects from external code
	 * @deprecated Use AudioManager.getInstance().stopAllSoundEffects() instead
	 */
	public stopAllSoundEffects(): void {
		this.audioManager.stopAllSoundEffects();
	}

	/**
	 * Get current music info
	 * @deprecated Use AudioManager.getInstance().getCurrentMusic() instead
	 */
	public getCurrentMusic(): { key: string | null; isPlaying: boolean } {
		return this.audioManager.getCurrentMusic();
	}

	/**
	 * Get active sound effects
	 * @deprecated Use AudioManager.getInstance().getActiveSoundEffects() instead
	 */
	public getActiveSoundEffects(): string[] {
		return this.audioManager.getActiveSoundEffects();
	}

	/**
	 * Cleanup method
	 * @deprecated Use AudioManager.getInstance().destroy() instead
	 */
	destroy(): void {
		try {
			this.audioManager.destroy();
			console.log('AudioSystem destroyed (delegated to AudioManager)');
		} catch (error) {
			console.error('Error during AudioSystem destruction:', error);
		}
	}
}