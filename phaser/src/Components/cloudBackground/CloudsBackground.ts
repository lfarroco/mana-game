import * as Phaser from "phaser";
import { cloudsBackgroundShader } from "../../Shaders/CloudsBackground";
import { colorPresets, IColorPreset } from "@Constants/colorPresets";
import { getCurrentScene } from "@Models/State";

export interface CloudsBackgroundConfig {
	/** Initial color preset to use */
	preset?: keyof typeof colorPresets;
	/** Custom color preset (overrides preset) */
	customColors?: IColorPreset;
	/** X position of the background */
	x?: number;
	/** Y position of the background */
	y?: number;
	/** Width of the background */
	width?: number;
	/** Height of the background */
	height?: number;

	/** Depth/z-index of the background */
	depth?: number;
	/** Alpha/opacity of the background (0-1) */
	alpha?: number;
	/** Animation speed multiplier (default: 1.0, lower values = slower animation) */
	timeScale?: number;
}

export class CloudsBackground {
	private scene: Phaser.Scene;
	private shader: Phaser.GameObjects.Shader;
	private preset: keyof typeof colorPresets;
	private customColors?: IColorPreset;
	private x: number;
	private y: number;
	private width: number;
	private height: number;
	private depth: number;
	private alpha: number;
	private timeScale: number;
	private presetKeys: string[];
	private currentPresetIndex: number = 0;
	constructor(config: CloudsBackgroundConfig = {}) {
		const scene = getCurrentScene();
		this.scene = scene;

		// Set default configuration
		this.preset = config.preset || "nebula";
		this.customColors = config.customColors;
		this.x = config.x !== undefined ? config.x : scene.scale.width / 2;
		this.y = config.y !== undefined ? config.y : scene.scale.height / 2;
		this.width = config.width !== undefined ? config.width : scene.scale.width;
		this.height = config.height !== undefined ? config.height : scene.scale.height;
		this.depth = config.depth !== undefined ? config.depth : -1000;
		this.alpha = config.alpha !== undefined ? config.alpha : 1;
		this.timeScale = config.timeScale !== undefined ? config.timeScale : 1.0;

		this.presetKeys = Object.keys(colorPresets);

		// Find the starting preset index
		this.currentPresetIndex = this.presetKeys.indexOf(this.preset as string);
		if (this.currentPresetIndex === -1) {
			this.currentPresetIndex = 0;
		}

		this.createShader();
	}

	private createShader(): void {
		const colors = this.getCurrentColors();

		// Create the shader
		const backgroundShader = new Phaser.Display.BaseShader(
			"cloudsBackground",
			cloudsBackgroundShader,
			undefined,
			{
				color1: { type: "3f", value: colors.color1 },
				color2: { type: "3f", value: colors.color2 },
				color3: { type: "3f", value: colors.color3 },
				color4: { type: "3f", value: colors.color4 },
				color5: { type: "3f", value: colors.color5 },
				timeScale: { type: "1f", value: this.timeScale },
				particleQuality: { type: "1f", value: this.getParticleQualityValue() },
			}
		);

		this.shader = this.scene.add
			.shader(backgroundShader, this.x, this.y, this.width, this.height)
			.setOrigin(0.5, 0.5)
			.setDepth(this.depth);

		// Set alpha via the shader's alpha property since setAlpha might not exist
		(this.shader as any).alpha = this.alpha;
	}

	private getCurrentColors(): IColorPreset {
		if (this.customColors) {
			return this.customColors;
		}

		const presetKey = this.presetKeys[this.currentPresetIndex];
		return colorPresets[presetKey];
	}

	/**
	 * Manually change to the next preset
	 */
	public changePreset(): void {
		if (this.customColors) {
			console.warn("Cannot change presets when using custom colors");
			return;
		}

		this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presetKeys.length;
		const colors = this.getCurrentColors();

		this.shader.setUniform("color1.value", colors.color1);
		this.shader.setUniform("color2.value", colors.color2);
		this.shader.setUniform("color3.value", colors.color3);
		this.shader.setUniform("color4.value", colors.color4);
		this.shader.setUniform("color5.value", colors.color5);
	}

	/**
	 * Set a specific preset by name
	 */
	public setPreset(presetName: keyof typeof colorPresets): void {
		if (this.customColors) {
			console.warn("Cannot set preset when using custom colors");
			return;
		}

		const index = this.presetKeys.indexOf(presetName as string);
		if (index === -1) {
			console.warn(`Preset '${presetName}' not found`);
			return;
		}

		this.currentPresetIndex = index;
		const colors = this.getCurrentColors();

		this.shader.setUniform("color1.value", colors.color1);
		this.shader.setUniform("color2.value", colors.color2);
		this.shader.setUniform("color3.value", colors.color3);
		this.shader.setUniform("color4.value", colors.color4);
		this.shader.setUniform("color5.value", colors.color5);
	}

	/**
	 * Set custom colors
	 */
	public setCustomColors(colors: IColorPreset): void {
		this.customColors = colors;

		this.shader.setUniform("color1.value", colors.color1);
		this.shader.setUniform("color2.value", colors.color2);
		this.shader.setUniform("color3.value", colors.color3);
		this.shader.setUniform("color4.value", colors.color4);
		this.shader.setUniform("color5.value", colors.color5);
	}

	/**
	 * Get the current preset name
	 */
	public getCurrentPresetName(): string {
		return this.presetKeys[this.currentPresetIndex];
	}

	/**
	 * Set the position of the background
	 */
	public setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
		this.shader.setPosition(x, y);
	}

	/**
	 * Set the size of the background
	 */
	public setSize(width: number, height: number): void {
		this.width = width;
		this.height = height;
		this.shader.setSize(width, height);
	}

	/**
	 * Set the depth of the background
	 */
	public setDepth(depth: number): void {
		this.depth = depth;
		this.shader.setDepth(depth);
	}

	/**
	 * Set the alpha/opacity of the background
	 */
	public setAlpha(alpha: number): void {
		this.alpha = alpha;
		// Directly set the alpha property since setAlpha method might not exist
		(this.shader as any).alpha = alpha;
	}

	/**
	 * Set the animation speed scale (lower values = slower animation)
	 */
	public setTimeScale(timeScale: number): void {
		this.timeScale = timeScale;
		this.shader.setUniform("timeScale.value", timeScale);
	}

	/**
	 * Get the numeric value for particle quality based on options
	 */
	private getParticleQualityValue(): number {
		try {
			// Import getOption here to avoid circular dependencies
			const { getOption } = require("@Models/OptionsStore");
			const particles = getOption("particles");

			switch (particles) {
				case "low":
					return 0.0;
				case "medium":
					return 1.0;
				case "high":
					return 2.0;
				default:
					return 1.0; // Default to medium
			}
		} catch (error) {
			// Fallback to medium quality if OptionsStore is not available
			console.warn("Could not access OptionsStore, defaulting to medium particle quality");
			return 1.0;
		}
	}

	/**
	 * Update the particle quality based on the current options
	 */
	public updateParticleQuality(): void {
		const qualityValue = this.getParticleQualityValue();
		this.shader.setUniform("particleQuality.value", qualityValue);
	}

	/**
	 * Get the underlying Phaser shader object
	 */
	public getShader(): Phaser.GameObjects.Shader {
		return this.shader;
	}

	/**
	 * Destroy the background and clean up resources
	 */
	public destroy(): void {
		this.shader.destroy();
	}
}
