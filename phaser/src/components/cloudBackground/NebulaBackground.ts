import Phaser from 'phaser';
import * as constants from '../../Constants/constants';

export interface NebulaBackgroundOptions {
	width?: number;
	height?: number;
	colors?: [number, number, number][]; // Array of vec3 colors
}

export class NebulaBackground {
	shaderSprite: Phaser.GameObjects.Shader;

	constructor(scene: Phaser.Scene, options: NebulaBackgroundOptions = {}) {
		const width = options.width ?? constants.SCREEN_WIDTH;
		const height = options.height ?? constants.SCREEN_HEIGHT;
		const colors = options.colors ?? [
			[0.15, 0.05, 0.25], // deep purple
			[0.2, 0.3, 0.6],    // blue
			[0.8, 0.2, 0.5],    // magenta
			[0.1, 0.7, 0.5],    // teal/green
			[0.9, 0.8, 0.6],    // yellow/white
		];

		this.shaderSprite = scene.add.shader(
			'cloudsBackgroundShader',
			width / 2, height / 2,
			width, height
		);
		this.shaderSprite.setUniform('resolution', [width, height]);
		this.shaderSprite.setUniform('color1', colors[0]);
		this.shaderSprite.setUniform('color2', colors[1]);
		this.shaderSprite.setUniform('color3', colors[2]);
		this.shaderSprite.setUniform('color4', colors[3]);
		this.shaderSprite.setUniform('color5', colors[4]);

		scene.events.on('update', () => {
			this.shaderSprite.setUniform('time', scene.time.now / 1000.0);
		});
	}

	get displayObject() {
		return this.shaderSprite;
	}
}
