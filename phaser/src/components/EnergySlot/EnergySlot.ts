import * as Phaser from "phaser";
import { energySlotFragmentShader } from "../../Shaders/EnergySlotShader";

export interface EnergySlotConfig {
	size?: number;
	color?: Phaser.Types.Math.Vector3Like; // Use Phaser's Vector3Like format
	intensity?: number;
	speed?: number;
	x?: number;
	y?: number;
}

export class EnergySlot {
	private scene: Phaser.Scene;
	private shader: Phaser.GameObjects.Shader;
	private startTime: number;
	private config: Required<Omit<EnergySlotConfig, 'x' | 'y'>>;
	private isDestroyed: boolean = false;

	constructor(scene: Phaser.Scene, x: number, y: number, config: EnergySlotConfig = {}) {
		this.scene = scene;

		// Set default config
		const defaultConfig = {
			size: 100,
			color: { x: 0.8, y: 0.9, z: 1.0 }, // Slight blue tint
			intensity: 1.0,
			speed: 1.0
		};

		this.config = { ...defaultConfig, ...config };
		this.startTime = scene.time.now;

		this.createShader(x, y);
	}

	private createShader(x: number, y: number): void {
		// Calculate animation phase offset - randomized for variety
		const animationPhaseOffset = Math.random() * Math.PI * 2;

		// Create the base shader
		const baseShader = new Phaser.Display.BaseShader(
			'EnergySlot',
			energySlotFragmentShader,
			undefined,
			{
				time: { type: '1f', value: 0.0 },
				resolution: { type: '2f', value: [this.config.size, this.config.size] },
				color1: { type: '3f', value: this.config.color },
				intensity: { type: '1f', value: this.config.intensity },
				speed: { type: '1f', value: this.config.speed },
				animationPhaseOffset: { type: '1f', value: animationPhaseOffset }
			}
		);

		// Create the shader game object
		this.shader = this.scene.add.shader(
			baseShader,
			x,
			y,
			this.config.size,
			this.config.size
		).setOrigin(0.5, 0.5);
	}

	update(time: number): void {
		// Skip update if slot is destroyed
		if (this.isDestroyed) {
			return;
		}

		// Update time uniform for animation
		const elapsedTime = (time - this.startTime) / 1000; // Convert to seconds
		this.shader.setUniform('time.value', elapsedTime);
	}

	// Method to change slot color dynamically
	setSlotColor(r: number, g: number, b: number): this {
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

	// Method to resize the slot
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

	// Method to set visibility
	setVisible(visible: boolean): this {
		this.shader.setVisible(visible);
		return this;
	}

	// Method to check if slot is destroyed
	isSlotDestroyed(): boolean {
		return this.isDestroyed;
	}

	// Method to destroy the slot
	destroy(): void {
		if (this.isDestroyed) {
			return; // Already destroyed
		}

		this.isDestroyed = true;
		if (this.shader) {
			this.shader.destroy();
		}
	}

	// Get the underlying shader object for advanced manipulation
	getShader(): Phaser.GameObjects.Shader {
		return this.shader;
	}

	// Add the slot to a container
	addToContainer(container: Phaser.GameObjects.Container): this {
		container.add(this.shader);
		return this;
	}

	// Remove the slot from a container
	removeFromContainer(container: Phaser.GameObjects.Container): this {
		container.remove(this.shader);
		return this;
	}

	// Get current position
	getCurrentPosition(): { x: number; y: number } {
		return { x: this.shader.x, y: this.shader.y };
	}

	// Method to set interactive (for drop zones)
	setInteractive(shape?: Phaser.Types.Input.InputConfiguration, callback?: Phaser.Types.Input.HitAreaCallback): this {
		if (shape && callback) {
			this.shader.setInteractive(shape, callback);
		} else {
			// Default circular hit area
			this.shader.setInteractive(
				new Phaser.Geom.Circle(this.config.size / 2, this.config.size / 2, this.config.size / 2),
				Phaser.Geom.Circle.Contains
			);
		}
		return this;
	}

	// Method to set as drop zone
	setAsDropZone(): this {
		const hitArea = new Phaser.Geom.Circle(this.config.size / 2, this.config.size / 2, this.config.size / 2);
		this.shader.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
		this.shader.input!.dropZone = true;
		return this;
	}
}

// Factory class for creating different types of energy slots
export class EnergySlotFactory {
	static createPlayerSlot(scene: Phaser.Scene, x: number, y: number, size: number = 80): EnergySlot {
		return new EnergySlot(scene, x, y, {
			size,
			color: { x: 0.7, y: 0.9, z: 1.0 }, // Blue-white for player
			intensity: 1.0,
			speed: 1.0
		});
	}

	static createEnemySlot(scene: Phaser.Scene, x: number, y: number, size: number = 80): EnergySlot {
		return new EnergySlot(scene, x, y, {
			size,
			color: { x: 1.0, y: 0.7, z: 0.7 }, // Red-white for enemy
			intensity: 0.8,
			speed: 0.8
		});
	}

	static createNeutralSlot(scene: Phaser.Scene, x: number, y: number, size: number = 80): EnergySlot {
		return new EnergySlot(scene, x, y, {
			size,
			color: { x: 0.9, y: 0.9, z: 0.9 }, // Pure white for neutral
			intensity: 1.2,
			speed: 1.2
		});
	}
}
