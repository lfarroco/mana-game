import { env } from "@Env";

export interface EnergySlotConfig {
	size?: number;
	color?: number;
	alpha?: number;
	x?: number;
	y?: number;
}

export class EnergySlot {
	private graphics: Phaser.GameObjects.Graphics;
	private config: Required<Omit<EnergySlotConfig, "x" | "y">>;
	private isDestroyed: boolean = false;

	constructor(x: number, y: number, config: EnergySlotConfig = {}) {
		// Set default config
		const defaultConfig = {
			size: 100,
			color: 0xb3e6ff, // Slight blue tint
			alpha: 1.0,
		};

		this.config = { ...defaultConfig, ...config };

		// Create the graphics object
		this.graphics = env.scene.add.graphics();
		this.graphics.setPosition(x, y);
		this.drawRing();

		// Oscillating glow/fade effect. The tween is bound to the graphics
		// object, so when the object is destroyed the tween goes away with it —
		// no cleanup or scene update listeners are necessary.
		env.scene.tweens.add({
			targets: this.graphics,
			alpha: { from: this.config.alpha * 0.4, to: this.config.alpha },
			duration: 1600,
			yoyo: true,
			repeat: -1,
			ease: "Sine.easeInOut",
		});
	}

	private drawRing(): void {
		const g = this.graphics;
		g.clear();
		const radius = this.config.size * 0.45;
		const ringWidth = this.config.size * 0.04;
		g.lineStyle(ringWidth, this.config.color, 1);
		g.strokeCircle(0, 0, radius);
	}

	// Method to change slot color dynamically
	setSlotColor(color: number): this {
		this.config.color = color;
		this.drawRing();
		return this;
	}

	// Method to change the base alpha (the oscillating tween scales around it)
	setAlpha(alpha: number): this {
		this.config.alpha = alpha;
		return this;
	}

	// Method to resize the slot
	setSize(size: number): this {
		this.config.size = size;
		this.drawRing();
		return this;
	}

	// Method to set position
	setPosition(x: number, y: number): this {
		this.graphics.setPosition(x, y);
		return this;
	}

	// Method to set depth
	setDepth(depth: number): this {
		this.graphics.setDepth(depth);
		return this;
	}

	// Method to set visibility
	setVisible(visible: boolean): this {
		this.graphics.setVisible(visible);
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
		if (this.graphics) {
			this.graphics.destroy();
		}
	}

	// Get the underlying graphics object for advanced manipulation
	getGraphics(): Phaser.GameObjects.Graphics {
		return this.graphics;
	}

	// Add the slot to a container
	addToContainer(container: Container): this {
		container.add(this.graphics);
		return this;
	}

	// Remove the slot from a container
	removeFromContainer(container: Container): this {
		container.remove(this.graphics);
		return this;
	}

	// Get current position
	getCurrentPosition(): { x: number; y: number } {
		return { x: this.graphics.x, y: this.graphics.y };
	}
}

// Factory class for creating different types of energy slots
export class EnergySlotFactory {
	static createPlayerSlot(x: number, y: number, size: number = 80): EnergySlot {
		return new EnergySlot(x, y, {
			size,
			color: 0xb3e6ff, // Blue-white for player
			alpha: 1.0,
		});
	}

	static createEnemySlot(x: number, y: number, size: number = 80): EnergySlot {
		return new EnergySlot(x, y, {
			size,
			color: 0xffb3b3, // Red-white for enemy
			alpha: 0.8,
		});
	}

	static createNeutralSlot(x: number, y: number, size: number = 80): EnergySlot {
		return new EnergySlot(x, y, {
			size,
			color: 0xe6e6e6, // Pure white for neutral
			alpha: 1.2,
		});
	}
}
