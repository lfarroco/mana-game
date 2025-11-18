import * as Phaser from "phaser";

export interface IColorPreset {
	color1: Phaser.Types.Math.Vector3Like;
	color2: Phaser.Types.Math.Vector3Like;
	color3: Phaser.Types.Math.Vector3Like;
	color4: Phaser.Types.Math.Vector3Like;
	color5: Phaser.Types.Math.Vector3Like;
}

export const colorPresets: { [key: string]: IColorPreset } = {
	nebula: {
		color1: { x: 0.1, y: 0.1, z: 0.2 }, // Deep space blue
		color2: { x: 0.3, y: 0.2, z: 0.5 }, // Purple
		color3: { x: 0.8, y: 0.3, z: 0.6 }, // Magenta
		color4: { x: 0.5, y: 0.7, z: 0.9 }, // Cyan
		color5: { x: 1.0, y: 1.0, z: 1.0 }, // Bright star white
	},
	sunset: {
		color1: { x: 0.2, y: 0.1, z: 0.1 }, // Deep red
		color2: { x: 0.8, y: 0.3, z: 0.1 }, // Orange
		color3: { x: 1.0, y: 0.6, z: 0.2 }, // Yellow
		color4: { x: 0.6, y: 0.2, z: 0.4 }, // Purple shadow
		color5: { x: 0.9, y: 0.8, z: 0.7 }, // Faint pink cloud
	},
	sea: {
		color1: { x: 0.0, y: 0.1, z: 0.2 }, // Deep ocean
		color2: { x: 0.1, y: 0.3, z: 0.5 }, // Mid-depth blue
		color3: { x: 0.3, y: 0.6, z: 0.8 }, // Light blue surface
		color4: { x: 0.1, y: 0.4, z: 0.3 }, // Seaweed green
		color5: { x: 0.9, y: 0.9, z: 0.9 }, // White foam
	},
	forest: {
		color1: { x: 0.05, y: 0.15, z: 0.05 }, // Dark green undergrowth
		color2: { x: 0.1, y: 0.3, z: 0.1 }, // Forest green
		color3: { x: 0.3, y: 0.5, z: 0.2 }, // Lighter green canopy
		color4: { x: 0.4, y: 0.3, z: 0.1 }, // Brown earth/trunk
		color5: { x: 0.8, y: 0.8, z: 0.6 }, // Sunbeam yellow
	},
	aurora: {
		color1: { x: 0.05, y: 0.05, z: 0.15 }, // Night sky
		color2: { x: 0.1, y: 0.4, z: 0.2 }, // Green glow
		color3: { x: 0.3, y: 0.7, z: 0.5 }, // Bright green
		color4: { x: 0.5, y: 0.2, z: 0.6 }, // Purple hint
		color5: { x: 0.8, y: 0.9, z: 1.0 }, // Icy blue
	},
};
