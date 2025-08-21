import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { tween } from "../../Utils/animation";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board";
import { popText } from "./Animations/popText";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { CharaStatsDisplay } from "./CharaStatsDisplay";
import { CharaBarsDisplay } from "./CharaBarsDisplay";
import { CharaInputHandler } from "./CharaInputHandler";
import { createContinuousHasteEffect } from "../../Effects/hasteEffect";
import { onCharaPointerOut, onCharaPointerOver } from "./CharaTooltip";
import { hideTooltip } from "../../UI/Tooltip";
import { vec2, Vec2 } from "../../Models/Geometry.pure";
import { playSoundEffect } from "../AudioManager";
import * as Shop from "../../Scenes/Battleground/Systems/Shop/Shop";

export type CharaOptions = {
	isShopItem?: boolean;
};

export class Chara extends Phaser.GameObjects.Container {
	unit: Unit;
	id: string;

	isAnimating: boolean;

	sprite!: Phaser.GameObjects.Sprite;
	spriteBorder?: Phaser.GameObjects.Graphics;
	statsDisplay!: CharaStatsDisplay;
	barsDisplay!: CharaBarsDisplay;

	inputHandler!: CharaInputHandler;
	isShopItem: boolean;

	private hasteEffect?: { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void };
	private previousHasteState: number = 0;

	playerBoard: Board.PartyBoard;

	constructor(scene: BattlegroundScene, unit: Unit, options?: CharaOptions) {
		const position = UnitManager.getCharaPosition(unit);
		super(scene, position.x, position.y);

		this.scene = scene;
		this.playerBoard = scene.playerBoard;
		this.unit = unit;
		this.isShopItem = options?.isShopItem ?? false;

		this.id = unit.id;
		this.name = unit.id;
		this.createSprite();
		if (this.unit.force === constants.FORCE_ID_CPU) {
			this.sprite.setFlipX(true);
		}
		this.barsDisplay = new CharaBarsDisplay(this.scene, this.unit);
		this.barsDisplay.addToContainer(this);
		this.statsDisplay = new CharaStatsDisplay(this.scene, this.unit);
		this.statsDisplay.addToContainer(this);

		this.scene.add.existing(this);

		this.setInteractive(
			new Phaser.Geom.Rectangle(
				-constants.HALF_TILE_WIDTH,
				-constants.HALF_TILE_HEIGHT,
				constants.TILE_WIDTH,
				constants.TILE_HEIGHT
			),
			Phaser.Geom.Rectangle.Contains
		);

		this.inputHandler = new CharaInputHandler(this);

		this.on(Phaser.Input.Events.POINTER_OVER, () => {
			onCharaPointerOver({ chara: this });
		});
		this.on(Phaser.Input.Events.POINTER_OUT, () => {
			onCharaPointerOut();
		});

		this.statsDisplay.updatePower();
		this.barsDisplay.updateBars();

		this.updateStatusEffects();

	}

	createSprite(borderWidth: number = 3, borderColor: number = 0xffffff) {

		const animCacheKey = this.unit.pic + '-anims';
		const animData = this.scene.cache.json.get(animCacheKey);
		if (animData && animData.anims) {
			for (const anim of animData.anims) {
				const animKey = this.unit.pic + '_' + anim.key;
				if (!this.scene.anims.exists(animKey)) {
					const animConfig = {
						...anim,
						key: animKey,
						frames: (anim.frames as { frame: string }[])
							.map((f: { frame: string }) => ({ key: this.unit.pic, frame: f.frame })),
					};
					this.scene.anims.create(animConfig);
				}
			}
		}

		const frameNames = this.scene.textures.get(this.unit.pic).getFrameNames();
		const idleFrames = frameNames.filter(name => name.startsWith(this.unit.pic + '_idle_'));
		idleFrames.sort((a, b) => {
			const numA = parseInt(a.match(/_(\d+)\.png$/)?.[1] || '0', 10);
			const numB = parseInt(b.match(/_(\d+)\.png$/)?.[1] || '0', 10);
			return numA - numB;
		});
		const firstIdle = idleFrames[0] || frameNames[0];

		const radius = (constants.TILE_WIDTH * 0.8) / 2;
		const border = this.scene.add.graphics({ x: 0, y: 0 });
		border.lineStyle(borderWidth, borderColor, 1);
		border.strokeCircle(0, 0, radius);
		this.add(border);
		this.spriteBorder = border;

		this.sprite = this.scene.add.sprite(0, -15, this.unit.pic, firstIdle);
		this.sprite.setDisplaySize(constants.TILE_WIDTH * 1.2, constants.TILE_HEIGHT * 1.2);
		this.add(this.sprite);
		if (this.scene.anims.exists(this.unit.pic + '_idle')) {
			this.sprite.play(this.unit.pic + '_idle');
		}
	}

	onShopPurchaseSuccesful(): void {

		this.isShopItem = false;
		hideTooltip();

		Shop.flyout.remove(this);

		Shop.handleCharaPurchaseFinalized(this);

		playSoundEffect('sfx_artifact_equipweapon');

		UnitManager.destroyChara(this.id);
	}

	onShopPurchaseFailed(vec: Vec2) {
		hideTooltip();
		this.moveToPosition(vec);
	}

	moveToPosition(newVisualPosition: { x: number, y: number }) {
		tween({ targets: [this], x: newVisualPosition.x, y: newVisualPosition.y, duration: 150 });
	}

	revertToPosition(dragStartX: number, dragStartY: number): void {
		hideTooltip();
		this.moveToPosition(vec2(dragStartX, dragStartY));
	}

	getIsShopItem(): boolean {
		return this.isShopItem;
	}

	updateUnit(newUnit: Unit): void {
		this.unit = newUnit;
		this.statsDisplay.updateUnit(newUnit);
		this.barsDisplay.updateUnit(newUnit);
		this.updateStatusEffects();
	}

	updatePowerDisplay = () => {
		this.statsDisplay.animatePowerChange(this.unit.power);
	}

	setBarsVisibility(visible: boolean): void {
		this.barsDisplay.setVisible(visible);
	}

	updateChargeBar = () => {
		this.barsDisplay.updateBars();
	}

	updateUnitAttribute = async <K extends keyof Unit>(attribute: K, num: number) => {
		const { unit } = this;
		const positive = num >= 0;
		const text = `${positive ? "+" : "-"}${num}`;

		if (typeof unit[attribute] === "number") {
			(unit[attribute] as number) += num;
		} else {
			console.error(`Cannot add number to non-numeric attribute: ${attribute}`);
		}

		if (attribute === "power") {
			this.updatePowerDisplay();
		}

		this.showPopText(text);
	}

	async showPopText(text: string, type?: "heal" | "damage" | "shield" | "poison" | "timeout"): Promise<void> {
		await popText({
			x: this.x, y: this.y, text, type
		});
	}

	destroy(fromScene?: boolean) {
		if (this.inputHandler) {
			this.inputHandler.destroy();
		}

		this.removeHasteEffect();

		this.off(Phaser.Input.Events.POINTER_OVER);
		this.off(Phaser.Input.Events.POINTER_OUT);

		super.destroy(fromScene);
	}

	async pop() {
		if (this.isAnimating) return;
		this.isAnimating = true;

		const attackAnimKey = `${this.unit.pic}_attack`;
		const idleAnimKey = `${this.unit.pic}_idle`;

		this.sprite.anims.play(attackAnimKey, true);

		this.sprite.playAfterRepeat(idleAnimKey)

		await tween({
			targets: [this],
			scale: 1.2,
			yoyo: true,
			duration: 300,
			repeat: 0,
		});

		this.isAnimating = false;
	}


	updateStatusEffects(): void {
		if (this.unit.hasted > 0 && this.previousHasteState === 0) {
			this.showHasteEffect();
		} else if (this.unit.hasted === 0 && this.previousHasteState > 0) {
			this.removeHasteEffect();
		}
		this.previousHasteState = this.unit.hasted;
	}

	private showHasteEffect(): void {
		if (this.hasteEffect) return;

		this.hasteEffect = createContinuousHasteEffect(
			this.scene,
			{ x: this.x, y: this.y },
			{
				intensity: 1.0,
				color: 0x00eaff
			}
		);

		this.add(this.hasteEffect.particles);

		this.hasteEffect.particles.setPosition(0, 0);
	}

	private removeHasteEffect(): void {
		if (!this.hasteEffect) return;

		this.hasteEffect.cleanup();
		this.hasteEffect = undefined;
	}
}