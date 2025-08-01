/**
 * @file Audio Usage Examples
 * This file demonstrates how to use the AudioSystem for playing music and sound effects
 */

import { AudioSystem } from "../Systems/AudioSystem";

/**
 * Example of using the AudioSystem in a game scene
 */
export class ExampleScene extends Phaser.Scene {
	private audioSystem!: AudioSystem;

	create(): void {
		// Initialize the audio system
		this.audioSystem = new AudioSystem(this.game);
		this.audioSystem.initialize();

		// Example: Play background music when scene starts
		this.audioSystem.playMusic('menu-music', true); // Loop the music

		// Example: Play sound effects for user interactions
		this.setupSoundEffectExamples();
	}

	private setupSoundEffectExamples(): void {
		// Create a button that plays a sound effect when clicked
		this.add.rectangle(400, 300, 200, 50, 0x00ff00)
			.setInteractive()
			.on('pointerdown', () => {
				// This will respect the sound effect cooldown and user settings
				this.audioSystem.playSoundEffect('button-click');
			});

		// Example: Combat sounds
		this.input.keyboard?.on('keydown-SPACE', () => {
			this.audioSystem.playSoundEffect('sword-attack', 0.7);
		});

		// Example: Achievement sound
		this.input.keyboard?.on('keydown-A', () => {
			this.audioSystem.playSoundEffect('achievement', 1.0);
		});

		// Example: Change background music
		this.input.keyboard?.on('keydown-M', () => {
			this.audioSystem.playMusic('battle-music', true, 1000); // 1 second fade in
		});

		// Example: Stop music
		this.input.keyboard?.on('keydown-S', () => {
			this.audioSystem.stopMusic(500); // 0.5 second fade out
		});
	}

	destroy(): void {
		// Clean up audio system when scene is destroyed
		this.audioSystem?.destroy();
	}
}

/**
 * Example helper functions for common audio patterns
 */
export class AudioHelpers {
	constructor(private audioSystem: AudioSystem) { }

	/**
	 * Play a UI sound effect (typically short and quick)
	 */
	playUISound(soundKey: string): void {
		this.audioSystem.playSoundEffect(soundKey, 0.6);
	}

	/**
	 * Play a combat sound effect (typically louder)
	 */
	playCombatSound(soundKey: string): void {
		this.audioSystem.playSoundEffect(soundKey, 0.8);
	}

	/**
	 * Play ambient background music
	 */
	playAmbientMusic(musicKey: string): void {
		this.audioSystem.playMusic(musicKey, true, 2000); // Long fade in for ambient
	}

	/**
	 * Play intense battle music
	 */
	playBattleMusic(musicKey: string): void {
		this.audioSystem.playMusic(musicKey, true, 500); // Quick transition for battle
	}

	/**
	 * Gradually stop music (useful for scene transitions)
	 */
	fadeOutMusic(): void {
		this.audioSystem.stopMusic(1500); // 1.5 second fade out
	}

	/**
	 * Emergency stop all audio (useful for pause/settings)
	 */
	stopAllAudio(): void {
		this.audioSystem.stopMusic();
		this.audioSystem.stopAllSoundEffects();
	}

	/**
	 * Get current audio status for debugging or UI display
	 */
	getAudioStatus(): { music: string | null; soundEffects: string[] } {
		const musicInfo = this.audioSystem.getCurrentMusic();
		return {
			music: musicInfo.isPlaying ? musicInfo.key : null,
			soundEffects: this.audioSystem.getActiveSoundEffects()
		};
	}
}

/**
 * Example of how to integrate with the BattlegroundEventSystem
 */
export function addAudioEventHandlers(audioSystem: AudioSystem, scene: Phaser.Scene): void {
	// Play sound effects for various game events
	scene.events.on('UNIT_ATTACK', () => {
		audioSystem.playSoundEffect('attack-sound');
	});

	scene.events.on('UNIT_SHIELD_GAINED', () => {
		audioSystem.playSoundEffect('shield-up');
	});

	scene.events.on('COMBAT_ENDED_VICTORY', () => {
		audioSystem.playSoundEffect('victory-fanfare', 0.9);
		// Optionally change music
		audioSystem.playMusic('victory-music', false); // Don't loop victory music
	});

	scene.events.on('COMBAT_ENDED_DEFEAT', () => {
		audioSystem.playSoundEffect('defeat-sound', 0.7);
		audioSystem.stopMusic(1000); // Fade out music on defeat
	});

	scene.events.on('SHOP_PHASE_ENDED', () => {
		audioSystem.playMusic('battle-music', true, 800);
	});
}

// Export for use in development/testing
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	//@ts-ignore
	window.ExampleScene = ExampleScene;
	//@ts-ignore
	window.AudioHelpers = AudioHelpers;
	//@ts-ignore
	window.addAudioEventHandlers = addAudioEventHandlers;
}
