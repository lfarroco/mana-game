import * as Phaser from "phaser";
import * as CloudsBackgroundShader from "@Components/CloudsBackground/CloudsBackgroundShader";
import * as colorPresets from "./colorPresets";
import { getSettings } from "@Models/OptionsStore";
import { env } from "@Env";
export type CloudsBackgroundConfig = {
	/** Initial color preset to use */
	preset?: keyof typeof colorPresets.colorPresets;
	/** Custom color preset (overrides preset) */
	customColors?: colorPresets.IColorPreset;
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

	/**
	 * Internal render-resolution scale (0..1).  The shader renders into a
	 * low-res texture that is then scaled up, so lower values are far cheaper
	 * on the GPU.  Defaults from the particle-quality option:
	 * low = 0.25, medium = 0.5, high = 0.75.
	 */
	renderScale?: number;
};

/**
 * The most recently created CloudsBackground instance.  The options screen
 * uses this to push particle-quality changes to the live background.
 */
let activeInstance: CloudsBackground | null = null;

/** Returns the active background instance, or null when none exists. */
export function getActiveInstance(): CloudsBackground | null {
	return activeInstance;
}

/** Module-level setter (avoids the `no-this-alias` lint rule on `this`). */
function setActiveInstance(instance: CloudsBackground | null): void {
	activeInstance = instance;
}

/** Render-resolution scales per particle-quality level. */
const RENDER_TEXTURE_SCALE_BY_QUALITY: Record<number, number> = {
	0: 0.25, // low
	1: 0.5, // medium
	2: 0.75, // high
};

/** Unique Texture Manager key per instance (removed again on destroy). */
let renderTextureCounter = 0;

export class CloudsBackground {
	private scene: Phaser.Scene;
	private shader: Phaser.GameObjects.Shader;
	private displayImage: Phaser.GameObjects.Image;
	private preset: keyof typeof colorPresets.colorPresets;
	private customColors?: colorPresets.IColorPreset;
	private x: number;
	private y: number;
	private width: number;
	private height: number;
	private depth: number;
	private alpha: number;
	private timeScale: number;
	private presetKeys: string[];
	private currentPresetIndex: number = 0;
	private renderColors: colorPresets.IColorPreset;
	private renderScale: number;
	private isDestroyed = false;
	private currentTween: Phaser.Tweens.Tween | null = null;
	private timeScaleTween: Phaser.Tweens.Tween | null = null;
	private alphaTween: Phaser.Tweens.Tween | null = null;
	constructor(config: CloudsBackgroundConfig = {}) {
		const scene = this.resolveScene();
		this.scene = scene;

		const viewportWidth =
			scene.scale?.width ?? scene.cameras?.main?.width ?? scene.game?.scale?.width ?? 1280;
		const viewportHeight =
			scene.scale?.height ?? scene.cameras?.main?.height ?? scene.game?.scale?.height ?? 720;

		// Set default configuration
		this.preset = config.preset || "nebula";
		this.customColors = config.customColors;
		this.x = config.x !== undefined ? config.x : viewportWidth / 2;
		this.y = config.y !== undefined ? config.y : viewportHeight / 2;
		this.width = config.width !== undefined ? config.width : viewportWidth;
		this.height = config.height !== undefined ? config.height : viewportHeight;
		this.depth = config.depth !== undefined ? config.depth : -1000;
		this.alpha = config.alpha !== undefined ? config.alpha : 1;
		this.timeScale = config.timeScale !== undefined ? config.timeScale : 1.0;
		this.renderScale = this.resolveRenderScale(config.renderScale);

		this.presetKeys = Object.keys(colorPresets.colorPresets);

		// Find the starting preset index
		this.currentPresetIndex = this.presetKeys.indexOf(this.preset as string);
		if (this.currentPresetIndex === -1) {
			this.currentPresetIndex = 0;
		}

		// Initialize renderColors with a deep copy of current settings
		this.renderColors = JSON.parse(JSON.stringify(this.getCurrentColors()));
		const colors = this.renderColors;

		// Render the shader into a low-resolution texture, then display it scaled
		// up to full screen.  The shader's fragment work is per-pixel of the
		// render target, so this cuts the GPU cost by ~1 / renderScale^2.
		const renderWidth = Math.max(1, Math.round(this.width * this.renderScale));
		const renderHeight = Math.max(1, Math.round(this.height * this.renderScale));

		// Create the shader
		const backgroundShader = new Phaser.Display.BaseShader(
			"cloudsBackground",
			CloudsBackgroundShader.cloudsBackgroundShader,
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
			.shader(backgroundShader, renderWidth / 2, renderHeight / 2, renderWidth, renderHeight)
			.setOrigin(0.5, 0.5)
			.setDepth(this.depth);

		// Render to a low-res frame buffer; the result is exposed as a texture.
		const renderTextureKey = `cloudsBackground_${++renderTextureCounter}`;
		this.shader.setRenderToTexture(renderTextureKey, true);

		// The frame-buffer texture is stored upside down (GL convention), so the
		// display image flips it back.  Linear filtering gives a soft upscale.
		this.displayImage = this.scene.add
			.image(this.x, this.y, renderTextureKey)
			.setOrigin(0.5, 0.5)
			.setDisplaySize(this.width, this.height)
			.setDepth(this.depth)
			.setAlpha(this.alpha);
		this.displayImage.setFlipY(true);
		this.displayImage.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

		setActiveInstance(this);
	}
	private resolveScene(): Phaser.Scene {
		return env.scene;
	}

	private getCurrentColors(): colorPresets.IColorPreset {
		if (this.customColors) {
			return this.customColors;
		}

		const presetKey = this.presetKeys[this.currentPresetIndex];
		return colorPresets.colorPresets[presetKey];
	}

	/**
	 * Manually change to the next preset
	 */
	public changePreset(): void {
		if (this.customColors) {
			console.warn("CloudsBackground", "Cannot change presets when using custom colors");
			return;
		}

		this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presetKeys.length;
		const colors = this.getCurrentColors();

		// Update renderColors to match the new preset instantly
		this.renderColors = JSON.parse(JSON.stringify(colors));

		this.shader.setUniform("color1.value", colors.color1);
		this.shader.setUniform("color2.value", colors.color2);
		this.shader.setUniform("color3.value", colors.color3);
		this.shader.setUniform("color4.value", colors.color4);
		this.shader.setUniform("color5.value", colors.color5);
	}

	/**
	 * Set a specific preset by name
	 */
	public setPreset(presetName: keyof typeof colorPresets.colorPresets): void {
		if (this.customColors) {
			console.warn("CloudsBackground", "Cannot set preset when using custom colors");
			return;
		}

		const index = this.presetKeys.indexOf(presetName as string);
		if (index === -1) {
			console.warn("CloudsBackground", `Preset '${presetName}' not found`);
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
	public setCustomColors(colors: colorPresets.IColorPreset): void {
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
		this.displayImage.setPosition(x, y);
	}

	/**
	 * Set the size of the background
	 */
	public setSize(width: number, height: number): void {
		this.width = width;
		this.height = height;
		// The shader keeps its low-res render size; only the display image scales.
		this.displayImage.setDisplaySize(width, height);
	}

	/**
	 * Set the depth of the background
	 */
	public setDepth(depth: number): void {
		this.depth = depth;
		this.shader.setDepth(depth);
		this.displayImage.setDepth(depth);
	}

	/**
	 * Set the alpha/opacity of the background
	 */
	public setAlpha(alpha: number): void {
		this.alpha = alpha;
		this.displayImage.setAlpha(alpha);
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
		const particles = getSettings().particles;

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
	}

	/**
	 * Internal render-resolution scale.  An explicit config value wins;
	 * otherwise the particle-quality option picks the scale so that the
	 * "low" setting is genuinely much cheaper on the GPU.
	 */
	private resolveRenderScale(explicit?: number): number {
		if (explicit !== undefined) {
			return Math.min(1, Math.max(0.05, explicit));
		}
		const quality = this.getParticleQualityValue();
		return RENDER_TEXTURE_SCALE_BY_QUALITY[quality] ?? RENDER_TEXTURE_SCALE_BY_QUALITY[1];
	}

	/**
	 * Update the particle quality based on the current options
	 */
	public updateParticleQuality(): void {
		const qualityValue = this.getParticleQualityValue();
		this.shader.setUniform("particleQuality.value", qualityValue);
	}

	/**
	 * Tween the shader colors to a new target
	 * @param targetColors The target colors to tween to
	 * @param duration Duration in ms
	 * @param ease Phaser ease string (default: 'Linear')
	 */
	public tweenColors(
		targetColors: colorPresets.IColorPreset,
		duration: number = 2000,
		ease: string | ((...args: unknown[]) => unknown) = "Linear"
	): void {
		// Stop any existing tween
		if (this.currentTween) {
			this.currentTween.stop();
		}

		// Capture start values (deep copy to avoid reference issues)
		const startColors = JSON.parse(JSON.stringify(this.renderColors));

		this.currentTween = this.scene.tweens.addCounter({
			from: 0,
			to: 1,
			duration: duration,
			ease: ease,
			onUpdate: (tween) => {
				const progress = tween.getValue() ?? 0;

				// Helper to interpolate vectors
				const lerpVector = (
					start: Phaser.Types.Math.Vector3Like,
					end: Phaser.Types.Math.Vector3Like
				) => ({
					x: (start.x || 0) + ((end.x || 0) - (start.x || 0)) * progress,
					y: (start.y || 0) + ((end.y || 0) - (start.y || 0)) * progress,
					z: (start.z || 0) + ((end.z || 0) - (start.z || 0)) * progress,
				});

				// Interpolate all 5 colors
				this.renderColors.color1 = lerpVector(startColors.color1, targetColors.color1);
				this.renderColors.color2 = lerpVector(startColors.color2, targetColors.color2);
				this.renderColors.color3 = lerpVector(startColors.color3, targetColors.color3);
				this.renderColors.color4 = lerpVector(startColors.color4, targetColors.color4);
				this.renderColors.color5 = lerpVector(startColors.color5, targetColors.color5);

				// Update Uniforms
				this.shader.setUniform("color1.value", this.renderColors.color1);
				this.shader.setUniform("color2.value", this.renderColors.color2);
				this.shader.setUniform("color3.value", this.renderColors.color3);
				this.shader.setUniform("color4.value", this.renderColors.color4);
				this.shader.setUniform("color5.value", this.renderColors.color5);
			},
			onComplete: () => {
				this.currentTween = null;
			},
		});
	}

	/**
	 * Tween to a specific named preset
	 */
	public tweenToPreset(
		presetName: keyof typeof colorPresets.colorPresets,
		duration: number = 2000,
		ease: string = "Linear"
	): void {
		const targetPreset = colorPresets.colorPresets[presetName];
		if (targetPreset) {
			this.tweenColors(targetPreset, duration, ease);
		} else {
			console.warn("CloudsBackground", `Preset ${presetName} not found`);
		}
	}

	/**
	 * Tween the time scale (animation speed)
	 * @param targetTimeScale Target time scale
	 * @param duration Duration in ms
	 * @param ease Phaser ease string
	 */
	public tweenTimeScale(
		targetTimeScale: number,
		duration: number = 2000,
		ease: string | ((...args: unknown[]) => unknown) = "Linear"
	): void {
		this.timeScaleTween?.stop();
		this.timeScaleTween = this.scene.tweens.addCounter({
			from: this.timeScale,
			to: targetTimeScale,
			duration: duration,
			ease: ease,
			onUpdate: (tween) => {
				this.timeScale = tween.getValue() ?? this.timeScale;
				this.shader.setUniform("timeScale.value", this.timeScale);
			},
		});
	}

	/**
	 * Tween the alpha (opacity)
	 * @param targetAlpha Target alpha (0-1)
	 * @param duration Duration in ms
	 * @param ease Phaser ease string
	 */
	public tweenAlpha(
		targetAlpha: number,
		duration: number = 2000,
		ease: string | ((...args: unknown[]) => unknown) = "Linear"
	): void {
		this.alphaTween?.stop();
		this.alphaTween = this.scene.tweens.addCounter({
			from: this.alpha,
			to: targetAlpha,
			duration: duration,
			ease: ease,
			onUpdate: (tween) => {
				this.alpha = tween.getValue() ?? this.alpha;
				this.displayImage.setAlpha(this.alpha);
			},
		});
	}

	/**
	 * Get the underlying Phaser shader object
	 */
	public getShader(): Phaser.GameObjects.Shader {
		return this.shader;
	}

	/**
	 * Destroy the background and clean up resources.
	 * Idempotent — safe to call from the framework teardown and manually.
	 */
	public destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		this.currentTween?.stop();
		this.timeScaleTween?.stop();
		this.alphaTween?.stop();
		this.currentTween = null;
		this.timeScaleTween = null;
		this.alphaTween = null;

		// Destroy the display image before the shader — the image references the
		// render texture that the shader removes from the Texture Manager.
		this.displayImage.destroy();
		this.shader.destroy();

		if (activeInstance === this) setActiveInstance(null);
	}
}
