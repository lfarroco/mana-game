import * as Phaser from "phaser";
import * as Board from "@Models/Board";
import * as Tooltip from "@Components/Tooltip";
import { magicOrbFragmentShader } from "@Shaders/MagicOrbShader";
import { nextValue } from "@Utils/Random";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("MagicOrb");

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
	shader: Phaser.GameObjects.Shader;
	startTime: number;
	config: Required<Omit<MagicOrbConfig, "x" | "y">>;
	isDissolving: boolean = false;
	dissolveStartTime: number = 0;
	originalPosition: { x: number; y: number };
	isDragging: boolean = false;
	isDestroyed: boolean = false;

	constructor(x: number, y: number, config: MagicOrbConfig = {}) {

		const defaultConfig = {
			size: 100,
			color: { x: 0.5, y: 0.3, z: 1.0 },
			intensity: 1.0,
			speed: 1.0,
			dissolveDuration: 0.5,
			dissolveGridSize: 20.0,
			dissolveUpwardMovement: 0.3,
			dissolveFadeRange: 0.15,
			tooltipText: "",
			tooltipTitle: "",
			enableTooltip: false,
			enableDrag: false,
			returnDuration: 300,
			onDropTarget: () => { },
			dropTargetNames: [] as string[],
		};

		this.config = { ...defaultConfig, ...config };
		this.startTime = io.scene.time.now;
		this.originalPosition = { x, y };

		this.createShader(x, y);
	}

	private createShader(x: number, y: number): void {
		const animationPhaseOffset = nextValue() * Math.PI * 2;
		logger.debug(`MagicOrb randomization: phase offset=${animationPhaseOffset}`);

		const baseShader = new Phaser.Display.BaseShader(
			"MagicOrb",
			magicOrbFragmentShader,
			undefined,
			{
				time: { type: "1f", value: 0.0 },
				resolution: { type: "2f", value: [this.config.size, this.config.size] },
				color1: { type: "3f", value: this.config.color },
				intensity: { type: "1f", value: this.config.intensity },
				speed: { type: "1f", value: this.config.speed },
				dissolveProgress: { type: "1f", value: 0.0 },
				dissolveGridSize: { type: "1f", value: this.config.dissolveGridSize },
				dissolveUpwardMovement: { type: "1f", value: this.config.dissolveUpwardMovement },
				dissolveFadeRange: { type: "1f", value: this.config.dissolveFadeRange },
				animationPhaseOffset: { type: "1f", value: animationPhaseOffset },
				dissolveTime: { type: "1f", value: 0.0 },
			}
		);

		logger.debug("BaseShader created successfully");

		this.shader = io.scene.add
			.shader(baseShader, x, y, this.config.size, this.config.size)
			.setOrigin(0.5, 0.5);

		if (this.config.enableDrag) {
			this.setupInteractivity();
		}

		logger.debug("Shader game object created:", this.shader);
		logger.debug("Shader visible:", this.shader.visible);
		logger.debug("Shader active:", this.shader.active);
	}

	private setupInteractivity(): void {
		this.shader.setInteractive(
			new Phaser.Geom.Circle(this.config.size / 2, this.config.size / 2, this.config.size / 2),
			Phaser.Geom.Circle.Contains
		);

		if (this.config.enableDrag) {
			io.scene.input.setDraggable(this.shader);

			this.shader.on("dragstart", () => {
				this.isDragging = true;
				Tooltip.hideTooltip();
				io.scene.input.setDefaultCursor("grabbing");
			});

			this.shader.on("drag", (_pointer: Pointer, dragX: number, dragY: number) => {
				this.shader.setPosition(dragX, dragY);
			});

			this.shader.on("dragend", (pointer: Pointer) => {
				this.isDragging = false;
				io.scene.input.setDefaultCursor("default");

				const dropTarget = this.checkDropTarget(pointer);
				if (dropTarget && this.config.onDropTarget) {
					this.config.onDropTarget(this, dropTarget);
				} else {
					this.returnToOriginalPosition();
				}
			});
		}

		this.shader.on("pointerover", () => {
			if (!this.isDragging) {
				io.scene.input.setDefaultCursor(this.config.enableDrag ? "grab" : "pointer");
			}
		});

		this.shader.on("pointerout", () => {
			if (!this.isDragging) {
				io.scene.input.setDefaultCursor("default");
			}
		});
	}

	returnToOriginalPosition(): void {
		io.scene.tweens.add({
			targets: this.shader,
			x: this.originalPosition.x,
			y: this.originalPosition.y,
			duration: this.config.returnDuration,
			ease: "Back.easeOut",
		});
	}

	private checkDropTarget(pointer: Pointer): Phaser.GameObjects.GameObject | null {
		const objectsAtPointer = io.scene.input.hitTestPointer(pointer);

		const playerBoard = Board.getBoardState();

		if (playerBoard && playerBoard.dropZones) {
			for (const zone of playerBoard.dropZones) {
				if (objectsAtPointer.includes(zone)) {
					logger.debug(
						"Magic orb dropped on board zone at index:",
						playerBoard.dropZones.indexOf(zone)
					);
					return zone;
				}
			}
		}

		if (this.config.dropTargetNames.length === 0) {
			return null;
		}

		for (const obj of objectsAtPointer) {
			if (obj.name && this.config.dropTargetNames.includes(obj.name)) {
				logger.debug("Magic orb dropped on named target:", obj.name);
				return obj;
			}

			if (obj.getData && typeof obj.getData === "function") {
				const objType = obj.getData("type");
				const objId = obj.getData("id");

				if (objType && this.config.dropTargetNames.includes(objType)) {
					logger.debug("Magic orb dropped on object with type:", objType);
					return obj;
				}
				if (objId && this.config.dropTargetNames.includes(objId)) {
					logger.debug("Magic orb dropped on object with id:", objId);
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
		this.shader.setUniform("time.value", elapsedTime);

		if (this.isDissolving) {
			const dissolveElapsed = (time - this.dissolveStartTime) / 1000;
			const dissolveProgress = Math.min(dissolveElapsed / this.config.dissolveDuration, 1.0);
			this.shader.setUniform("dissolveProgress.value", dissolveProgress);

			this.shader.setUniform("dissolveTime.value", dissolveElapsed);

			if (Math.floor(dissolveElapsed * 10) % 10 === 0) {
				logger.debug(`Dissolve progress: ${(dissolveProgress * 100).toFixed(1)}%`);
			}

			if (dissolveProgress >= 1.0) {
				logger.debug("Dissolve animation complete, destroying orb");
				this.destroy();
			}
		}
	}

	setOrbColor(r: number, g: number, b: number): this {
		this.config.color = { x: r, y: g, z: b };
		this.shader.setUniform("color1.value", this.config.color);
		return this;
	}

	setIntensity(intensity: number): this {
		this.config.intensity = intensity;
		this.shader.setUniform("intensity.value", intensity);
		return this;
	}

	setSpeed(speed: number): this {
		this.config.speed = speed;
		this.shader.setUniform("speed.value", speed);
		return this;
	}

	setSize(size: number): this {
		this.config.size = size;
		this.shader.setSize(size, size);
		this.shader.setUniform("resolution.value", [size, size]);
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
		(this.shader as Phaser.GameObjects.Shader & { alpha: number }).alpha = alpha;
		return this;
	}

	startDissolve(): this {
		if (!this.isDissolving) {
			this.isDissolving = true;
			this.dissolveStartTime = io.scene.time.now;
			logger.debug("Starting dissolve animation at time:", this.dissolveStartTime);
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
			io.scene.input.setDraggable(this.shader, false);
		} else if (enabled && this.shader.input) {
			io.scene.input.setDraggable(this.shader, true);
		}

		return this;
	}

	isDragActive(): boolean {
		return this.isDragging;
	}

	setDropCallback(
		callback: (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => void,
		targetNames: string[] = []
	): this {
		this.config.onDropTarget = callback;
		this.config.dropTargetNames = targetNames;
		return this;
	}

	addDropTargetNames(names: string[]): this {
		this.config.dropTargetNames.push(...names);
		return this;
	}

	removeDropTargetNames(names: string[]): this {
		this.config.dropTargetNames = this.config.dropTargetNames.filter(
			(name) => !names.includes(name)
		);
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
		logger.debug("Orb effect: Returning to position after touching", target.name || "target");
		orb.returnToOriginalPosition();
	}

	static dissolveOnDrop(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		logger.debug("Orb effect: Dissolving after touching", target.name || "target");
		orb.startDissolve();
	}

	static healingEffect(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		logger.debug("Orb effect: Healing", target.name || "target");
		orb.setIntensity(2.0);
		orb.setOrbColor(0.3, 1.0, 0.4);
		setTimeout(() => {
			orb.returnToOriginalPosition();
		}, 1000);
	}

	static damageEffect(orb: MagicOrb, target: Phaser.GameObjects.GameObject): void {
		logger.debug("Orb effect: Damaging", target.name || "target");
		orb.setOrbColor(1.0, 0.3, 0.2); // Red damage color
		orb.setIntensity(2.5);
		setTimeout(() => {
			orb.startDissolve();
		}, 500);
	}

	static createCustomEffect(
		color: { r: number; g: number; b: number },
		intensity: number,
		behavior: "return" | "dissolve" = "return",
		delay: number = 1000
	): (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => void {
		return (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => {
			logger.debug("Orb effect: Custom effect on", target.name || "target");
			orb.setOrbColor(color.r, color.g, color.b);
			orb.setIntensity(intensity);
			setTimeout(() => {
				if (behavior === "dissolve") {
					orb.startDissolve();
				} else {
					orb.returnToOriginalPosition();
				}
			}, delay);
		};
	}
}

