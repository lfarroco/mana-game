import * as Phaser from "phaser";
import { magicOrbFragmentShader } from "../../Shaders/MagicOrbShader";
import { GameEvents } from "../../constants/events";
import * as Board from "../../Models/Board";

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
	// Drag configuration
	enableDrag?: boolean; // Whether to enable drag functionality (default: false)
	returnDuration?: number; // Duration for return animation in milliseconds (default: 300)
	onDropTarget?: (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => void; // Callback when dropped on a valid target
	dropTargetNames?: string[]; // Array of target names to check for drops (default: empty)
}

export class MagicOrb {
	private scene: Phaser.Scene;
	private shader: Phaser.GameObjects.Shader;
	private startTime: number;
	private config: Required<Omit<MagicOrbConfig, 'x' | 'y'>>;
	private isDissolving: boolean = false;
	private dissolveStartTime: number = 0;
	private originalPosition: { x: number; y: number };
	private isDragging: boolean = false;
	private isDestroyed: boolean = false;

	constructor(scene: Phaser.Scene, x: number, y: number, config: MagicOrbConfig = {}) {
		this.scene = scene;

		// Set default config
		const defaultConfig = {
			size: 100,
			color: { x: 0.5, y: 0.3, z: 1.0 }, // Purple/blue magic color
			intensity: 1.0,
			speed: 1.0,
			dissolveDuration: 0.5,
			dissolveGridSize: 20.0,
			dissolveUpwardMovement: 0.3,
			dissolveFadeRange: 0.15,
			tooltipText: '',
			tooltipTitle: '',
			enableTooltip: false,
			enableDrag: false,
			returnDuration: 300,
			onDropTarget: () => { }, // Default empty callback
			dropTargetNames: [] as string[]
		};

		this.config = { ...defaultConfig, ...config };
		this.startTime = scene.time.now;
		this.originalPosition = { x, y };

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
				animationPhaseOffset: { type: '1f', value: animationPhaseOffset },
				dissolveTime: { type: '1f', value: 0.0 } // Separate time for dissolve effects
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

		// Add interactivity if needed (tooltip or drag)
		if ((this.config.enableTooltip && (this.config.tooltipText || this.config.tooltipTitle)) || this.config.enableDrag) {
			this.setupInteractivity();
		}

		console.log('Shader game object created:', this.shader);
		console.log('Shader visible:', this.shader.visible);
		console.log('Shader alpha:', (this.shader as any).alpha);
	}

	private setupInteractivity(): void {
		// Make the shader interactive
		this.shader.setInteractive(
			new Phaser.Geom.Circle(this.config.size / 2, this.config.size / 2, this.config.size / 2),
			Phaser.Geom.Circle.Contains
		);

		// Add tooltip events if enabled
		if (this.config.enableTooltip && (this.config.tooltipText || this.config.tooltipTitle)) {
			this.shader.on('pointerover', () => {
				if (!this.isDragging) {
					this.showTooltip();
				}
			});

			this.shader.on('pointerout', () => {
				this.hideTooltip();
			});
		}

		// Add drag functionality if enabled
		if (this.config.enableDrag) {
			this.scene.input.setDraggable(this.shader);

			this.shader.on('dragstart', () => {
				this.isDragging = true;
				this.hideTooltip(); // Hide tooltip when dragging starts
				this.scene.input.setDefaultCursor('grabbing');
			});

			this.shader.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
				this.shader.setPosition(dragX, dragY);
			});

			this.shader.on('dragend', (pointer: Phaser.Input.Pointer) => {
				this.isDragging = false;
				this.scene.input.setDefaultCursor('default');

				// Check if dropped over a valid target
				const dropTarget = this.checkDropTarget(pointer);
				if (dropTarget && this.config.onDropTarget) {
					// Execute the callback with the orb and target
					this.config.onDropTarget(this, dropTarget);
				} else {
					// No valid target found, return to original position
					this.returnToOriginalPosition();
				}
			});
		}

		// Add pointer cursor on hover (for both tooltip and drag)
		this.shader.on('pointerover', () => {
			if (!this.isDragging) {
				this.scene.input.setDefaultCursor(this.config.enableDrag ? 'grab' : 'pointer');
			}
		});

		this.shader.on('pointerout', () => {
			if (!this.isDragging) {
				this.scene.input.setDefaultCursor('default');
			}
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

	returnToOriginalPosition(): void {
		// Animate the orb back to its original position
		this.scene.tweens.add({
			targets: this.shader,
			x: this.originalPosition.x,
			y: this.originalPosition.y,
			duration: this.config.returnDuration,
			ease: 'Back.easeOut',
			onComplete: () => {
				// Orb has returned to original position
			}
		});
	}

	private checkDropTarget(pointer: Phaser.Input.Pointer): Phaser.GameObjects.GameObject | null {
		// Get all game objects at the pointer position
		const objectsAtPointer = this.scene.input.hitTestPointer(pointer);

		// First check for player board drop zones (most common case)
		const playerBoard = Board.getSharedPlayerBoard();

		if (playerBoard && playerBoard.dropZones) {
			for (const zone of playerBoard.dropZones) {
				if (objectsAtPointer.includes(zone)) {
					console.log('Magic orb dropped on board zone at index:', playerBoard.dropZones.indexOf(zone));
					return zone;
				}
			}
		}

		// If no drop target names specified, and no board zone hit, return null
		if (this.config.dropTargetNames.length === 0) {
			return null;
		}

		// Check each object to see if it matches our target criteria (for custom targets)
		for (const obj of objectsAtPointer) {
			// Check if object has a name that matches our target names
			if (obj.name && this.config.dropTargetNames.includes(obj.name)) {
				console.log('Magic orb dropped on named target:', obj.name);
				return obj;
			}

			// Also check for objects with getData that might have identifiers
			if (obj.getData && typeof obj.getData === 'function') {
				const objType = obj.getData('type');
				const objId = obj.getData('id');

				if (objType && this.config.dropTargetNames.includes(objType)) {
					console.log('Magic orb dropped on object with type:', objType);
					return obj;
				}
				if (objId && this.config.dropTargetNames.includes(objId)) {
					console.log('Magic orb dropped on object with id:', objId);
					return obj;
				}
			}
		}

		return null;
	}

	update(time: number): void {
		// Skip update if orb is destroyed
		if (this.isDestroyed) {
			return;
		}

		// Update time uniform for animation
		const elapsedTime = (time - this.startTime) / 1000; // Convert to seconds
		this.shader.setUniform('time.value', elapsedTime);

		// Update dissolve animation if active
		if (this.isDissolving) {
			const dissolveElapsed = (time - this.dissolveStartTime) / 1000;
			const dissolveProgress = Math.min(dissolveElapsed / this.config.dissolveDuration, 1.0);
			this.shader.setUniform('dissolveProgress.value', dissolveProgress);

			// Update dissolveTime for dissolve-specific animations
			this.shader.setUniform('dissolveTime.value', dissolveElapsed);

			// Debug logging (remove this later if it gets too verbose)
			if (Math.floor(dissolveElapsed * 10) % 10 === 0) { // Log every 100ms
				console.log(`Dissolve progress: ${(dissolveProgress * 100).toFixed(1)}%`);
			}

			// Destroy the orb when dissolve is complete
			if (dissolveProgress >= 1.0) {
				console.log('Dissolve animation complete, destroying orb');
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
		this.originalPosition = { x, y }; // Update original position
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
			console.log('Starting dissolve animation at time:', this.dissolveStartTime);
		}
		return this;
	}

	// Method to check if orb is dissolving
	isDissolveActive(): boolean {
		return this.isDissolving;
	}

	// Method to check if orb is destroyed
	isOrbDestroyed(): boolean {
		return this.isDestroyed;
	}

	// Method to destroy the orb
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

	// Method to enable or disable drag functionality
	setDragEnabled(enabled: boolean): this {
		this.config.enableDrag = enabled;

		// If disabling drag, remove drag functionality
		if (!enabled && this.shader.input) {
			this.scene.input.setDraggable(this.shader, false);
		} else if (enabled && this.shader.input) {
			// If enabling drag, set it up
			this.scene.input.setDraggable(this.shader, true);
		}

		return this;
	}

	// Method to check if orb is currently being dragged
	isDragActive(): boolean {
		return this.isDragging;
	}

	// Method to set drop callback and target names
	setDropCallback(callback: (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => void, targetNames: string[] = []): this {
		this.config.onDropTarget = callback;
		this.config.dropTargetNames = targetNames;
		return this;
	}

	// Method to add drop target names
	addDropTargetNames(names: string[]): this {
		this.config.dropTargetNames.push(...names);
		return this;
	}

	// Method to remove drop target names
	removeDropTargetNames(names: string[]): this {
		this.config.dropTargetNames = this.config.dropTargetNames.filter(name => !names.includes(name));
		return this;
	}

	// Method to clear all drop target names
	clearDropTargetNames(): this {
		this.config.dropTargetNames = [];
		return this;
	}

	// Method to get the original position
	getOriginalPosition(): { x: number; y: number } {
		return { ...this.originalPosition };
	}

	// Method to get current position
	getCurrentPosition(): { x: number; y: number } {
		return { x: this.shader.x, y: this.shader.y };
	}
}

// Helper callbacks for common drop behaviors
export class MagicOrbCallbacks {
	// Callback that makes the orb return to its original position
	static returnToPosition(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Returning to position after touching', target.name || 'target');
		orb.returnToOriginalPosition();
	}

	// Callback that makes the orb dissolve when dropped
	static dissolveOnDrop(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Dissolving after touching', target.name || 'target');
		orb.startDissolve();
	}

	// Callback that creates a healing effect (brighten then return)
	static healingEffect(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Healing', target.name || 'target');
		orb.setIntensity(2.0);
		orb.setOrbColor(0.3, 1.0, 0.4); // Green healing color
		setTimeout(() => {
			orb.returnToOriginalPosition();
		}, 1000);
	}

	// Callback that creates a damage effect (red flash then dissolve)
	static damageEffect(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Damaging', target.name || 'target');
		orb.setOrbColor(1.0, 0.3, 0.2); // Red damage color
		orb.setIntensity(2.5);
		setTimeout(() => {
			orb.startDissolve();
		}, 500);
	}

	// Callback that creates a custom effect with parameters
	static createCustomEffect(
		color: { r: number; g: number; b: number },
		intensity: number,
		behavior: 'return' | 'dissolve' = 'return',
		delay: number = 1000
	): (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => void {
		return (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => {
			console.log('Orb effect: Custom effect on', target.name || 'target');
			orb.setOrbColor(color.r, color.g, color.b);
			orb.setIntensity(intensity);
			setTimeout(() => {
				if (behavior === 'dissolve') {
					orb.startDissolve();
				} else {
					orb.returnToOriginalPosition();
				}
			}, delay);
		};
	}
}

// Helper function to create multiple orbs with different colors
export class MagicOrbFactory {
	static createPurpleOrb(scene: Phaser.Scene, x: number, y: number, size: number = 100, draggable: boolean = false): MagicOrb {
		return new MagicOrb(scene, x, y, {
			size,
			color: { x: 0.5, y: 0.3, z: 1.0 },
			intensity: 1.2,
			speed: 1.0,
			enableDrag: draggable
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
