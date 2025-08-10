import * as Phaser from "phaser";
import { magicOrbFragmentShader } from "../../Shaders/MagicOrbShader";
import { GameEvents } from "../../constants/events";

export interface MagicOrbConfig {
	size?: number;
	color?: Phaser.Types.Math.Vector3Like; // Use Phaser's Vector3Like format
	intensity?: number;
	speed?: number;
	x?: number;
	y?: number;
	// Dissolve animation parameters
	dissolveDuration?: number; // Duration in seconds (default: 1.0)
	dissolveGridSize?: number; // Grid resolution for pixelated effect (default: 20)
	dissolveUpwardMovement?: number; // How far squares move up (default: 0.3)
	dissolveFadeRange?: number; // Smoothness of fade transition (default: 0.15)
	// Tooltip configuration
	tooltipText?: string; // Text to show in tooltip
	tooltipTitle?: string; // Title for the tooltip
	enableTooltip?: boolean; // Whether to enable tooltip on hover (default: false)
}

export class MagicOrb {
	private scene: Phaser.Scene;
	private shader: Phaser.GameObjects.Shader;
	private startTime: number;
	private config: Required<Omit<MagicOrbConfig, 'x' | 'y'>>;
	private isDissolving: boolean = false;
	private dissolveStartTime: number = 0;

	constructor(scene: Phaser.Scene, x: number, y: number, config: MagicOrbConfig = {}) {
		this.scene = scene;

		// Set default config
		const defaultConfig = {
			size: 100,
			color: { x: 0.5, y: 0.3, z: 1.0 }, // Purple/blue magic color
			intensity: 1.0,
			speed: 1.0,
			dissolveDuration: 1.0,
			dissolveGridSize: 20.0,
			dissolveUpwardMovement: 0.3,
			dissolveFadeRange: 0.15,
			tooltipText: '',
			tooltipTitle: '',
			enableTooltip: false
		};

		this.config = { ...defaultConfig, ...config };
		this.startTime = scene.time.now;

		console.log('Creating MagicOrb with config:', this.config);
		console.log('Position:', x, y);

		this.createShader(x, y);
	}

	private createShader(x: number, y: number): void {
		console.log('Creating shader at position:', x, y);
		console.log('Shader size:', this.config.size);
		console.log('Shader color:', this.config.color);
		console.log('Shader intensity:', this.config.intensity);

		// Calculate animation phase offset - always randomized
		const animationPhaseOffset = Math.random() * Math.PI * 2;
		console.log(`MagicOrb randomization: phase offset=${animationPhaseOffset}`);

		// Create the base shader
		const baseShader = new Phaser.Display.BaseShader(
			'MagicOrb',
			magicOrbFragmentShader,
			undefined,
			{
				time: { type: '1f', value: 0.0 },
				resolution: { type: '2f', value: [this.config.size, this.config.size] },
				color1: { type: '3f', value: this.config.color },
				intensity: { type: '1f', value: this.config.intensity },
				speed: { type: '1f', value: this.config.speed },
				dissolveProgress: { type: '1f', value: 0.0 },
				dissolveGridSize: { type: '1f', value: this.config.dissolveGridSize },
				dissolveUpwardMovement: { type: '1f', value: this.config.dissolveUpwardMovement },
				dissolveFadeRange: { type: '1f', value: this.config.dissolveFadeRange },
				animationPhaseOffset: { type: '1f', value: animationPhaseOffset }
			}
		);

		console.log('BaseShader created successfully');

		// Create the shader game object
		this.shader = this.scene.add.shader(
			baseShader,
			x,
			y,
			this.config.size,
			this.config.size
		).setOrigin(0.5, 0.5);

		// Add interactivity and tooltip if enabled
		if (this.config.enableTooltip && (this.config.tooltipText || this.config.tooltipTitle)) {
			this.setupTooltip();
		}

		console.log('Shader game object created:', this.shader);
		console.log('Shader visible:', this.shader.visible);
		console.log('Shader alpha:', (this.shader as any).alpha);
	}

	private setupTooltip(): void {
		// Make the shader interactive
		this.shader.setInteractive(
			new Phaser.Geom.Circle(this.config.size / 2, this.config.size / 2, this.config.size / 2),
			Phaser.Geom.Circle.Contains
		);

		// Add hover events
		this.shader.on('pointerover', () => {
			this.showTooltip();
		});

		this.shader.on('pointerout', () => {
			this.hideTooltip();
		});

		// Add pointer cursor on hover
		this.shader.on('pointerover', () => {
			this.scene.input.setDefaultCursor('pointer');
		});

		this.shader.on('pointerout', () => {
			this.scene.input.setDefaultCursor('default');
		});
	}

	private showTooltip(): void {
		// Emit tooltip show event with orb data
		this.scene.events.emit(GameEvents.TOOLTIP_SHOW, {
			x: this.shader.x,
			y: this.shader.y - this.config.size / 2 - 10, // Position above the orb
			title: this.config.tooltipTitle,
			description: this.config.tooltipText
		});
	}

	private hideTooltip(): void {
		// Emit tooltip hide event
		this.scene.events.emit(GameEvents.TOOLTIP_HIDE);
	}

	update(time: number): void {
		// Update time uniform for animation
		const elapsedTime = (time - this.startTime) / 1000; // Convert to seconds
		this.shader.setUniform('time.value', elapsedTime);

		// Update dissolve animation if active
		if (this.isDissolving) {
			const dissolveElapsed = (time - this.dissolveStartTime) / 1000;
			const dissolveProgress = Math.min(dissolveElapsed / this.config.dissolveDuration, 1.0);
			this.shader.setUniform('dissolveProgress.value', dissolveProgress);

			// Destroy the orb when dissolve is complete
			if (dissolveProgress >= 1.0) {
				this.destroy();
			}
		}
	}

	// Method to change orb color dynamically
	setOrbColor(r: number, g: number, b: number): this {
		this.config.color = { x: r, y: g, z: b };
		this.shader.setUniform('color1.value', this.config.color);
		return this;
	}

	// Method to change intensity
	setIntensity(intensity: number): this {
		this.config.intensity = intensity;
		this.shader.setUniform('intensity.value', intensity);
		return this;
	}

	// Method to change animation speed
	setSpeed(speed: number): this {
		this.config.speed = speed;
		this.shader.setUniform('speed.value', speed);
		return this;
	}

	// Method to resize the orb
	setSize(size: number): this {
		this.config.size = size;
		this.shader.setSize(size, size);
		this.shader.setUniform('resolution.value', [size, size]);
		return this;
	}

	// Method to set position
	setPosition(x: number, y: number): this {
		this.shader.setPosition(x, y);
		return this;
	}

	// Method to set depth
	setDepth(depth: number): this {
		this.shader.setDepth(depth);
		return this;
	}

	// Method to set alpha
	setAlpha(alpha: number): this {
		(this.shader as any).alpha = alpha;
		return this;
	}

	// Method to start dissolve animation
	startDissolve(): this {
		if (!this.isDissolving) {
			this.isDissolving = true;
			this.dissolveStartTime = this.scene.time.now;
		}
		return this;
	}

	// Method to check if orb is dissolving
	isDissolveActive(): boolean {
		return this.isDissolving;
	}

	// Method to destroy the orb
	destroy(): void {
		if (this.shader) {
			this.shader.destroy();
		}
	}

	// Get the underlying shader object for advanced manipulation
	getShader(): Phaser.GameObjects.Shader {
		return this.shader;
	}

	// Add the orb to a container
	addToContainer(container: Phaser.GameObjects.Container): this {
		container.add(this.shader);
		return this;
	}

	// Remove the orb from a container
	removeFromContainer(container: Phaser.GameObjects.Container): this {
		container.remove(this.shader);
		return this;
	}
}

// Helper function to create multiple orbs with different colors
export class MagicOrbFactory {
	static createPurpleOrb(scene: Phaser.Scene, x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(scene, x, y, {
			size,
			color: { x: 0.5, y: 0.3, z: 1.0 },
			intensity: 1.2,
			speed: 1.0
		});
	}

	static createBlueOrb(scene: Phaser.Scene, x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(scene, x, y, {
			size,
			color: { x: 0.2, y: 0.6, z: 1.0 },
			intensity: 1.0,
			speed: 0.8
		});
	}

	static createRedOrb(scene: Phaser.Scene, x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(scene, x, y, {
			size,
			color: { x: 1.0, y: 0.3, z: 0.2 },
			intensity: 1.3,
			speed: 1.2
		});
	}

	static createGreenOrb(scene: Phaser.Scene, x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(scene, x, y, {
			size,
			color: { x: 0.3, y: 1.0, z: 0.4 },
			intensity: 1.1,
			speed: 0.9
		});
	}

	static createGoldenOrb(scene: Phaser.Scene, x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(scene, x, y, {
			size,
			color: { x: 1.0, y: 0.8, z: 0.2 },
			intensity: 1.4,
			speed: 0.7
		});
	}
}
