import * as Phaser from 'phaser';
import { CloudsBackground } from '../components/cloudBackground/CloudsBackground';

/**
 * Example showing how to use the CloudsBackground component in different scenes
 */

// Example 1: Basic usage with default settings
export function createBasicCloudsBackground(scene: Phaser.Scene): CloudsBackground {
	return new CloudsBackground(scene);
}

// Example 2: Custom positioned and sized background
export function createCustomSizedBackground(scene: Phaser.Scene): CloudsBackground {
	return new CloudsBackground(scene, {
		x: 200,
		y: 150,
		width: 400,
		height: 300,
		preset: 'sunset',
		depth: -500 // Behind most elements but not the deepest
	});
}

// Example 3: Background with custom colors
export function createCustomColorBackground(scene: Phaser.Scene): CloudsBackground {
	const customColors = {
		color1: { x: 0.1, y: 0.05, z: 0.3 },   // Dark purple
		color2: { x: 0.2, y: 0.1, z: 0.6 },    // Purple
		color3: { x: 0.6, y: 0.3, z: 0.8 },    // Light blue
		color4: { x: 0.8, y: 0.6, z: 0.2 },    // Gold
		color5: { x: 1.0, y: 0.9, z: 0.9 }     // White
	};

	return new CloudsBackground(scene, {
		customColors,
		alpha: 0.8 // Semi-transparent
	});
}

// Example 4: Auto-changing background for dynamic scenes
export function createDynamicBackground(scene: Phaser.Scene): CloudsBackground {
	return new CloudsBackground(scene, {
		preset: 'aurora',
		autoChangePresets: true,
		presetChangeInterval: 3000, // Change every 3 seconds
		depth: -1000
	});
}

// Example 5: Small overlay background
export function createOverlayBackground(scene: Phaser.Scene, x: number, y: number): CloudsBackground {
	return new CloudsBackground(scene, {
		x,
		y,
		width: 200,
		height: 150,
		preset: 'forest',
		alpha: 0.5,
		depth: 10 // Above other elements
	});
}

/**
 * Example scene showing various CloudsBackground usages
 */
export class CloudsBackgroundExampleScene extends Phaser.Scene {
	private backgrounds: CloudsBackground[] = [];

	constructor() {
		super({ key: 'CloudsBackgroundExample' });
	}

	create() {
		// Example 1: Full screen background
		const mainBackground = new CloudsBackground(this, {
			preset: 'nebula',
			autoChangePresets: true,
			presetChangeInterval: 4000
		});
		this.backgrounds.push(mainBackground);

		// Example 2: Small panel background in top-left
		const panelBackground = new CloudsBackground(this, {
			x: 150,
			y: 100,
			width: 300,
			height: 200,
			preset: 'sea',
			depth: -100
		});
		this.backgrounds.push(panelBackground);

		// Example 3: Custom colored background in bottom-right
		const customBackground = new CloudsBackground(this, {
			x: this.scale.width - 150,
			y: this.scale.height - 100,
			width: 300,
			height: 200,
			customColors: {
				color1: { x: 0.2, y: 0.0, z: 0.0 },   // Dark red
				color2: { x: 0.6, y: 0.2, z: 0.0 },   // Orange
				color3: { x: 1.0, y: 0.8, z: 0.0 },   // Bright yellow
				color4: { x: 0.8, y: 0.0, z: 0.2 },   // Pink
				color5: { x: 1.0, y: 1.0, z: 1.0 }    // White
			},
			alpha: 0.7,
			depth: -50
		});
		this.backgrounds.push(customBackground);

		// Add some text to show the scene is working
		this.add.text(
			this.scale.width / 2,
			50,
			'CloudsBackground Component Examples',
			{
				fontSize: '32px',
				color: '#ffffff',
				stroke: '#000000',
				strokeThickness: 4
			}
		).setOrigin(0.5);

		// Add interactive elements to demonstrate manual control
		const changePresetButton = this.add.text(
			this.scale.width / 2,
			this.scale.height - 100,
			'Click to Change Main Background Preset',
			{
				fontSize: '20px',
				color: '#ffff00',
				stroke: '#000000',
				strokeThickness: 2
			}
		).setOrigin(0.5)
			.setInteractive()
			.on('pointerdown', () => {
				mainBackground.changePreset();
			});

		// Hover effect for button
		changePresetButton.on('pointerover', () => {
			changePresetButton.setScale(1.1);
		});
		changePresetButton.on('pointerout', () => {
			changePresetButton.setScale(1.0);
		});

		// Add text showing current preset
		const presetLabel = this.add.text(
			this.scale.width / 2,
			this.scale.height - 60,
			'Current: ' + mainBackground.getCurrentPresetName(),
			{
				fontSize: '16px',
				color: '#ffffff',
				stroke: '#000000',
				strokeThickness: 2
			}
		).setOrigin(0.5);

		// Update preset label when changed
		this.time.addEvent({
			delay: 100,
			callback: () => {
				presetLabel.setText('Current: ' + mainBackground.getCurrentPresetName());
			},
			loop: true
		});
	}

	destroy() {
		// Clean up all backgrounds
		this.backgrounds.forEach(bg => bg.destroy());
		this.backgrounds = [];
	}
}

/**
 * Utility functions for common CloudsBackground configurations
 */
export const CloudsBackgroundPresets = {
	/**
	 * Creates a full-screen background suitable for title screens
	 */
	titleScreen: (scene: Phaser.Scene): CloudsBackground => {
		return new CloudsBackground(scene, {
			preset: 'nebula',
			autoChangePresets: true,
			presetChangeInterval: 5000,
			depth: -1000
		});
	},

	/**
	 * Creates a subtle background for gameplay scenes
	 */
	gameplayBackground: (scene: Phaser.Scene): CloudsBackground => {
		return new CloudsBackground(scene, {
			preset: 'forest',
			alpha: 0.3,
			depth: -2000
		});
	},

	/**
	 * Creates a dialog/modal background overlay
	 */
	dialogOverlay: (scene: Phaser.Scene, x: number, y: number, width: number, height: number): CloudsBackground => {
		return new CloudsBackground(scene, {
			x,
			y,
			width,
			height,
			preset: 'aurora',
			alpha: 0.8,
			depth: 100
		});
	},

	/**
	 * Creates a battle background with dynamic effects
	 */
	battleBackground: (scene: Phaser.Scene): CloudsBackground => {
		return new CloudsBackground(scene, {
			preset: 'sunset',
			autoChangePresets: false,
			depth: -1500
		});
	}
};
