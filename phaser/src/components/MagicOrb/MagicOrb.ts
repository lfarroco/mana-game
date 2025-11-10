import * as Phaser from "phaser";
import * as Board from "@Models/Board";
import * as Tooltip from "../Tooltip";
import { getCurrentScene } from "@Models/State";
import { simpleMagicOrbFragmentShader } from "@Shaders/MagicOrbShader";

export interface MagicOrbConfig {
	size?: number;
	color?: Phaser.Types.Math.Vector3Like;
	intensity?: number;
	speed?: number;
	x?: number;
	y?: number;
	dissolveDuration?: number;
	dissolveGridSize?: number;
	dissolveUpwardMovement?: number;
	dissolveFadeRange?: number;
	enableDrag?: boolean;
	returnDuration?: number;
	onDropTarget?: (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => void;
	dropTargetNames?: string[];
}

export class MagicOrb {
	scene: Phaser.Scene;
	shader: Phaser.GameObjects.Shader;
	startTime: number;
	config: Required<Omit<MagicOrbConfig, 'x' | 'y'>>;
	isDissolving: boolean = false;
	dissolveStartTime: number = 0;
	originalPosition: { x: number; y: number };
	isDragging: boolean = false;
	isDestroyed: boolean = false;

	constructor(x: number, y: number, config: MagicOrbConfig = {}) {
		this.scene = getCurrentScene();

		const defaultConfig = {
			size: 100,
			color: { x: 0.5, y: 0.3, z: 1.0 },
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
			onDropTarget: () => { },
			dropTargetNames: [] as string[]
		};

		this.config = { ...defaultConfig, ...config };
		this.startTime = this.scene.time.now;
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

		const animationPhaseOffset = Math.random() * Math.PI * 2;
		console.log(`MagicOrb randomization: phase offset=${animationPhaseOffset}`);

		const baseShader = new Phaser.Display.BaseShader(
			'MagicOrb',
			simpleMagicOrbFragmentShader,
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
				dissolveTime: { type: '1f', value: 0.0 }
			}
		);

		console.log('BaseShader created successfully');

		this.shader = this.scene.add.shader(
			baseShader,
			x,
			y,
			this.config.size,
			this.config.size
		).setOrigin(0.5, 0.5);

		if (this.config.enableDrag) {
			this.setupInteractivity();
		}

		console.log('Shader game object created:', this.shader);
		console.log('Shader visible:', this.shader.visible);
		console.log('Shader alpha:', (this.shader as any).alpha);
	}

	private setupInteractivity(): void {
		this.shader.setInteractive(
			new Phaser.Geom.Circle(this.config.size / 2, this.config.size / 2, this.config.size / 2),
			Phaser.Geom.Circle.Contains
		);

		if (this.config.enableDrag) {
			this.scene.input.setDraggable(this.shader);

			this.shader.on('dragstart', () => {
				this.isDragging = true;
				Tooltip.hideTooltip();
				this.scene.input.setDefaultCursor('grabbing');
			});

			this.shader.on('drag', (_pointer: Pointer, dragX: number, dragY: number) => {
				this.shader.setPosition(dragX, dragY);
			});

			this.shader.on('dragend', (pointer: Pointer) => {
				this.isDragging = false;
				this.scene.input.setDefaultCursor('default');

				const dropTarget = this.checkDropTarget(pointer);
				if (dropTarget && this.config.onDropTarget) {
					this.config.onDropTarget(this, dropTarget);
				} else {
					this.returnToOriginalPosition();
				}
			});
		}

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

	returnToOriginalPosition(): void {
		this.scene.tweens.add({
			targets: this.shader,
			x: this.originalPosition.x,
			y: this.originalPosition.y,
			duration: this.config.returnDuration,
			ease: 'Back.easeOut',
		});
	}

	private checkDropTarget(pointer: Pointer): Phaser.GameObjects.GameObject | null {
		const objectsAtPointer = this.scene.input.hitTestPointer(pointer);

		const playerBoard = Board.getBoardState();

		if (playerBoard && playerBoard.dropZones) {
			for (const zone of playerBoard.dropZones) {
				if (objectsAtPointer.includes(zone)) {
					console.log('Magic orb dropped on board zone at index:', playerBoard.dropZones.indexOf(zone));
					return zone;
				}
			}
		}

		if (this.config.dropTargetNames.length === 0) {
			return null;
		}

		for (const obj of objectsAtPointer) {
			if (obj.name && this.config.dropTargetNames.includes(obj.name)) {
				console.log('Magic orb dropped on named target:', obj.name);
				return obj;
			}

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
		if (this.isDestroyed) {
			return;
		}

		const elapsedTime = (time - this.startTime) / 1000;
		this.shader.setUniform('time.value', elapsedTime);

		if (this.isDissolving) {
			const dissolveElapsed = (time - this.dissolveStartTime) / 1000;
			const dissolveProgress = Math.min(dissolveElapsed / this.config.dissolveDuration, 1.0);
			this.shader.setUniform('dissolveProgress.value', dissolveProgress);

			this.shader.setUniform('dissolveTime.value', dissolveElapsed);

			if (Math.floor(dissolveElapsed * 10) % 10 === 0) {
				console.log(`Dissolve progress: ${(dissolveProgress * 100).toFixed(1)}%`);
			}

			if (dissolveProgress >= 1.0) {
				console.log('Dissolve animation complete, destroying orb');
				this.destroy();
			}
		}
	}

	setOrbColor(r: number, g: number, b: number): this {
		this.config.color = { x: r, y: g, z: b };
		this.shader.setUniform('color1.value', this.config.color);
		return this;
	}

	setIntensity(intensity: number): this {
		this.config.intensity = intensity;
		this.shader.setUniform('intensity.value', intensity);
		return this;
	}

	setSpeed(speed: number): this {
		this.config.speed = speed;
		this.shader.setUniform('speed.value', speed);
		return this;
	}

	setSize(size: number): this {
		this.config.size = size;
		this.shader.setSize(size, size);
		this.shader.setUniform('resolution.value', [size, size]);
		return this;
	}

	setPosition(x: number, y: number): this {
		this.shader.setPosition(x, y);
		this.originalPosition = { x, y };
		return this;
	}

	setDepth(depth: number): this {
		this.shader.setDepth(depth);
		return this;
	}

	setAlpha(alpha: number): this {
		(this.shader as any).alpha = alpha;
		return this;
	}

	startDissolve(): this {
		if (!this.isDissolving) {
			this.isDissolving = true;
			this.dissolveStartTime = this.scene.time.now;
			console.log('Starting dissolve animation at time:', this.dissolveStartTime);
		}
		return this;
	}

	isDissolveActive(): boolean {
		return this.isDissolving;
	}

	isOrbDestroyed(): boolean {
		return this.isDestroyed;
	}

	destroy(): void {
		if (this.isDestroyed) {
			return;
		}

		this.isDestroyed = true;
		if (this.shader) {
			this.shader.destroy();
		}
	}

	getShader(): Phaser.GameObjects.Shader {
		return this.shader;
	}

	addToContainer(container: Container): this {
		container.add(this.shader);
		return this;
	}

	removeFromContainer(container: Container): this {
		container.remove(this.shader);
		return this;
	}

	setDragEnabled(enabled: boolean): this {
		this.config.enableDrag = enabled;

		if (!enabled && this.shader.input) {
			this.scene.input.setDraggable(this.shader, false);
		} else if (enabled && this.shader.input) {
			this.scene.input.setDraggable(this.shader, true);
		}

		return this;
	}

	isDragActive(): boolean {
		return this.isDragging;
	}

	setDropCallback(callback: (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => void, targetNames: string[] = []): this {
		this.config.onDropTarget = callback;
		this.config.dropTargetNames = targetNames;
		return this;
	}

	addDropTargetNames(names: string[]): this {
		this.config.dropTargetNames.push(...names);
		return this;
	}

	removeDropTargetNames(names: string[]): this {
		this.config.dropTargetNames = this.config.dropTargetNames.filter(name => !names.includes(name));
		return this;
	}

	clearDropTargetNames(): this {
		this.config.dropTargetNames = [];
		return this;
	}

	getOriginalPosition(): { x: number; y: number } {
		return { ...this.originalPosition };
	}

	getCurrentPosition(): { x: number; y: number } {
		return { x: this.shader.x, y: this.shader.y };
	}
}

export class MagicOrbCallbacks {
	static returnToPosition(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Returning to position after touching', target.name || 'target');
		orb.returnToOriginalPosition();
	}

	static dissolveOnDrop(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Dissolving after touching', target.name || 'target');
		orb.startDissolve();
	}

	static healingEffect(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Healing', target.name || 'target');
		orb.setIntensity(2.0);
		orb.setOrbColor(0.3, 1.0, 0.4);
		setTimeout(() => {
			orb.returnToOriginalPosition();
		}, 1000);
	}

	static damageEffect(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		console.log('Orb effect: Damaging', target.name || 'target');
		orb.setOrbColor(1.0, 0.3, 0.2); // Red damage color
		orb.setIntensity(2.5);
		setTimeout(() => {
			orb.startDissolve();
		}, 500);
	}

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

export class MagicOrbFactory {
	static createPurpleOrb(x: number, y: number, size: number = 100, draggable: boolean = false): MagicOrb {
		return new MagicOrb(x, y, {
			size,
			color: { x: 0.5, y: 0.3, z: 1.0 },
			intensity: 1.2,
			speed: 1.0,
			enableDrag: draggable
		});
	}

	static createBlueOrb(x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(x, y, {
			size,
			color: { x: 0.2, y: 0.6, z: 1.0 },
			intensity: 1.0,
			speed: 0.8
		});
	}

	static createRedOrb(x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(x, y, {
			size,
			color: { x: 1.0, y: 0.3, z: 0.2 },
			intensity: 1.3,
			speed: 1.2
		});
	}

	static createGreenOrb(x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(x, y, {
			size,
			color: { x: 0.3, y: 1.0, z: 0.4 },
			intensity: 1.1,
			speed: 0.9
		});
	}

	static createGoldenOrb(x: number, y: number, size: number = 100): MagicOrb {
		return new MagicOrb(x, y, {
			size,
			color: { x: 1.0, y: 0.8, z: 0.2 },
			intensity: 1.4,
			speed: 0.7
		});
	}
}
