import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { eqVec2, vec2 } from "../../Models/Geometry";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board";
import { addStatus, getState, } from "../../Models/State";
import * as TooltipSytem from "../Tooltip";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { images } from "../../assets";

// A Chara is the graphical representation of a Unit
export class Chara extends Phaser.GameObjects.Container {
	public unit: Unit;
	public id: string; // Alias for unit.id for convenience if needed, or use this.unit.id directly

	private sprite!: Phaser.GameObjects.Image; // Definite assignment assertion
	private atkDisplay!: Phaser.GameObjects.Text;
	private hpDisplay!: Phaser.GameObjects.Text;
	private chargeBar!: Phaser.GameObjects.Graphics;
	private cooldownBar!: Phaser.GameObjects.Graphics;
	private hpBar!: Phaser.GameObjects.Graphics;
	// The container itself will be the interactive zone.

	private static readonly BOX_WIDTH_RATIO = 0.4;
	private static readonly BOX_HEIGHT_RATIO = 0.2;
	private static readonly STAT_BOX_CORNER_RADIUS_RATIO = 0.1; // Ratio of boxWidth for corner radius
	private static readonly STAT_BOX_MARGIN_RATIO = 0.1; // Ratio of boxWidth for margin
	private static readonly DEBUG_BAR_PADDING = 10;
	private static readonly DEBUG_BAR_HEIGHT = 10;

	constructor(scene: Phaser.Scene, unit: Unit) {
		const position = UnitManager.getCharaPosition(unit);
		super(scene, position.x, position.y);

		this.unit = unit;
		this.id = unit.id;
		this.name = unit.id; // For Phaser's GameObject name property, useful for lookups

		this.createSprite();
		this.createStatsDisplay();
		this.createBars();

		this.scene.add.existing(this); // Add this container to the scene

		// Setup interactivity and event listeners
		this.setInteractive(
			new Phaser.Geom.Rectangle(
				-bgConstants.HALF_TILE_WIDTH,
				-bgConstants.HALF_TILE_HEIGHT,
				bgConstants.TILE_WIDTH,
				bgConstants.TILE_HEIGHT
			),
			Phaser.Geom.Rectangle.Contains
		);

		if (this.unit.force === FORCE_ID_PLAYER) {
			this.scene.input.setDraggable(this);
			this.on('dragstart', this.handleDragStart);
			this.on('drag', this.handleDrag);
			this.on('drop', this.handleDrop); // Note: drop target needs to be set up on potential drop zones
			this.on('dragend', this.handleDragEnd);
		}

		// Initial update of displays
		this.updateHpDisplay();
		this.updateAtkDisplay();
		//this.updateChargeBar();

		// Note: UnitManager.addCharaToState(this) should be called by the code that *creates* this Chara instance.
	}

	private createSprite() {
		const textureKey = this.scene.textures.exists(this.unit.name) ? this.unit.name : images.nameless.key;
		if (textureKey === images.nameless.key) {
			console.warn(`Chara ${this.unit.id} using default texture ${textureKey}`);
		}
		this.sprite = this.scene.add.image(0, 0, textureKey)
			.setDisplaySize(bgConstants.TILE_WIDTH, bgConstants.TILE_HEIGHT);

		if (this.unit.force === bgConstants.FORCE_ID_CPU) {
			this.sprite.flipX = true;
		}
		this.add(this.sprite);
	}

	private createStatsDisplay() {
		const boxWidth = bgConstants.TILE_WIDTH * Chara.BOX_WIDTH_RATIO;
		const boxHeight = bgConstants.TILE_HEIGHT * Chara.BOX_HEIGHT_RATIO;
		const cornerRadius = boxWidth * Chara.STAT_BOX_CORNER_RADIUS_RATIO;
		const margin = boxWidth * Chara.STAT_BOX_MARGIN_RATIO;

		// ATK Display
		const atkPosition: [number, number] = [
			-bgConstants.HALF_TILE_WIDTH + margin,
			bgConstants.HALF_TILE_HEIGHT - boxHeight - margin,
		];
		const atkBg = this.scene.add.graphics();
		atkBg.fillStyle(0xff0000, 1).fillRoundedRect(atkPosition[0], atkPosition[1], boxWidth, boxHeight, cornerRadius);

		this.atkDisplay = this.scene.add.text(
			atkPosition[0] + boxWidth / 2,
			atkPosition[1] + boxHeight / 2,
			this.unit.attackPower.toString(),
			bgConstants.defaultTextConfig
		).setOrigin(0.5).setAlign('center');

		if (this.unit.attackType === "none") {
			this.atkDisplay.setAlpha(0);
			atkBg.setAlpha(0);
		}
		this.add([atkBg, this.atkDisplay]);

		// HP Display
		const hpPosition: [number, number] = [
			bgConstants.HALF_TILE_WIDTH - boxWidth - margin,
			bgConstants.HALF_TILE_HEIGHT - boxHeight - margin,
		];
		const hpBg = this.scene.add.graphics();
		hpBg.fillStyle(0x327a0a, 1.0).fillRoundedRect(hpPosition[0], hpPosition[1], boxWidth, boxHeight, cornerRadius);

		this.hpDisplay = this.scene.add.text(
			hpPosition[0] + boxWidth / 2,
			hpPosition[1] + boxHeight / 2,
			this.unit.hp.toString(),
			bgConstants.defaultTextConfig
		).setOrigin(0.5).setAlign('center');
		this.add([hpBg, this.hpDisplay]);
	}

	private createBars() {
		this.chargeBar = this.scene.add.graphics();
		this.cooldownBar = this.scene.add.graphics();
		this.hpBar = this.scene.add.graphics();
		this.add([this.chargeBar, this.cooldownBar, this.hpBar]);
	}

	// --- Event Handlers ---
	private handleDragStart = () => {
		this.scene.children.bringToTop(this);
		tween({
			targets: [this],
			angle: -10,
			duration: 100,
			ease: "Cubic.Out",
		});
	}

	private handleDrag(pointer: Phaser.Input.Pointer) {
		// unit.force check already done before attaching listener
		this.x = pointer.x;
		this.y = pointer.y;
		TooltipSytem.hide();
	}

	private handleDrop(
		pointer: Phaser.Input.Pointer,
		dropZoneTarget: Phaser.GameObjects.GameObject, // This is the GameObject it was dropped on
	) {
		// Ensure it was dropped on the main board drop zone
		// UIManager.dropZone is the main board drop zone.
		if (!UIManager.dropZone || dropZoneTarget !== UIManager.dropZone) {
			// If not dropped on the main board, revert (handled by dragend if not on any valid zone)
			// This specific check might be redundant if dragend handles non-dropzone drops.
			return;
		}

		const state = getState(); // Required for accessing global unit list
		// The board will change: remove position bonuses for all units
		// TODO: This global iteration is not ideal here. A BoardManager should handle this.
		state.gameData.player.units.forEach((unit) => {
			unit.events.onLeavePosition.forEach(fn => fn(unit)());
		});

		const tile = Board.getTileAt(pointer);

		if (!tile) {
			// Dropped on the board zone, but not on a specific tile. Revert.
			tween({
				targets: [this],
				...UnitManager.getCharaPosition(this.unit)
			});
			return;
		}

		const position = vec2(tile.x, tile.y)!

		const maybeOccupier = state.gameData.player.units.find(u => eqVec2(u.position, position));

		if (maybeOccupier) {
			const occupierChara = UnitManager.getChara(maybeOccupier.id);

			occupierChara.unit.position = { ...this.unit.position };

			tween({
				targets: [occupierChara],
				...UnitManager.getCharaPosition(occupierChara.unit)
			})
		}

		this.unit.position = position;

		// The board has changed: calculate position bonuses for all units
		state.gameData.player.units.forEach((unit) => {
			unit.events.onEnterPosition.forEach(fn => fn(unit)());
		});

		tween({
			targets: [this],
			...UnitManager.getCharaPosition(this.unit)
		})

	}

	private handleDragEnd = (pointer: Phaser.Input.Pointer) => {

		tween({
			targets: [this],
			angle: 0,
			duration: 100,
			ease: "Cubic.Out",
		});

		if (UIManager.isPointerInDropZone(pointer)) return

		// check if the drag ended inside or outside scene.dropZone
		// return to original position if outside
		tween({
			targets: [this],
			...UnitManager.getCharaPosition(this.unit)
		})

	}

	updateHpDisplay = () => {
		this.hpDisplay.setText(Math.floor(this.unit.hp).toString());
	}

	updateAtkDisplay = () => {
		this.atkDisplay.setText(Math.floor(this.unit.attackPower).toString());
	}

	addTooltip = () => {
		this.on('pointerover', () => {

			const text = [
				`Attack: ${this.unit.attackPower} HP: ${this.unit.hp}`,
				this.unit.traits.map((trait) => trait.description).join("\n"),
			].join('\n');

			TooltipSytem.render(
				this.x + 340,
				this.y,
				this.unit.name,
				text
			);
		});

		this.on('pointerout', () => {
			TooltipSytem.hide()
		})
	}
	updateChargeBar = () => {

		// This bar visually "drains": a full bar means 0% charge, an empty bar means 100% charged.
		const { chargeBar, cooldownBar, hpBar, unit } = this;
		const maxWidthForDebugBars = bgConstants.TILE_WIDTH - (2 * Chara.DEBUG_BAR_PADDING);

		chargeBar.clear(); // Clears previously drawn graphics on this Graphics object
		const percent = unit.charge / unit.cooldown;

		let color = 0x000;

		if (unit.hasted > 0 && unit.slowed > 0)
			color = 0x000;
		else if (unit.hasted > 0)
			color = 0x00ff00;
		else if (unit.slowed > 0)
			color = 0xff0000;

		chargeBar.fillStyle(color, 0.2);
		chargeBar.fillRect(
			-bgConstants.HALF_TILE_WIDTH, // x
			-bgConstants.HALF_TILE_HEIGHT, // y
			bgConstants.TILE_WIDTH,
			// Height of the bar represents the portion yet to be charged (1 - progress)
			bgConstants.TILE_HEIGHT - Math.min(percent * bgConstants.TILE_HEIGHT, bgConstants.TILE_HEIGHT)
		);

		if (!getState().options.debug) return;

		cooldownBar.clear();
		// Assuming unit.refresh is current cooldown value and MIN_COOLDOWN is the max/target for this bar
		const cooldownPercent = Math.min(unit.refresh / bgConstants.MIN_COOLDOWN, 1);
		cooldownBar.fillStyle(0xff0000, 1);
		cooldownBar.fillRect(
			-bgConstants.HALF_TILE_WIDTH + Chara.DEBUG_BAR_PADDING,
			-bgConstants.HALF_TILE_HEIGHT + 30, // Y position for this debug bar
			cooldownPercent * maxWidthForDebugBars,
			Chara.DEBUG_BAR_HEIGHT
		);

		hpBar.clear();
		const hpPercent = Math.min(unit.hp / unit.maxHp, 1);
		hpBar.fillStyle(0x00ff00, 1);
		hpBar.fillRect(
			-bgConstants.HALF_TILE_WIDTH + Chara.DEBUG_BAR_PADDING,
			-bgConstants.HALF_TILE_HEIGHT + 50, // Y position for this debug bar
			hpPercent * maxWidthForDebugBars,
			Chara.DEBUG_BAR_HEIGHT
		);

	}

	damageUnit = (damage: number, isCritical = false) => {

		const chara = this;

		const nextHp = chara.unit.hp - damage;

		const hasDied = nextHp <= 0;

		chara.unit.hp = nextHp <= 0 ? 0 : nextHp;
		this.updateHpDisplay();

		if (isCritical) {
			criticalDamageDisplay(this.scene, this, Math.floor(damage));
		} else {
			popText({ text: Math.floor(damage).toFixed(0).toString(), targetId: chara.id, type: "damage" });
		}

		if (hasDied) {
			this.killUnit();
			return;
		}

		if (
			nextHp <= chara.unit.maxHp / 2 &&
			!chara.unit.statuses["on-half-hp"]
		) {
			chara.unit.events.onHalfHP.forEach(fn => fn(chara.unit)());
			addStatus(chara.unit, "on-half-hp");
		}

	}
	killUnit = async () => {

		this.unit.hp = 0;

		tween({
			targets: [this],
			alpha: 0,
			duration: 1000,
		});

		const originalX = this.x;

		for (let i = 0; i < 5; i++) {
			await tween({
				targets: [this],
				x: originalX - 20,
				duration: 100,
				ease: "Cubic.Out",
			});

			await tween({
				targets: [this],
				x: originalX + 20,
				duration: 100,
				ease: "Cubic.Out",
			});
			// Note: this loop will leave the chara.x at originalX + 20
		}

		await delay(this.scene, 2000);

		UnitManager.destroyChara(this.id);

		getState().battleData.units = getState().battleData.units
			.filter(u => u.id !== this.id);

		for (const ev of this.unit.events.onDeath)
			ev(this.unit)()

		if (this.unit.force === bgConstants.FORCE_ID_PLAYER)
			getState().gameData.player.units = getState().gameData.player.units
				.filter(u => u.id !== this.id);

	}

	// Function to update an attribute, not applying it (not apply damage of heal)
	// This means changing the value of the card
	updateUnitAttribute = async <K extends keyof Unit>(
		attribute: K,
		num: number,
	) => {
		const { unit } = this;
		const positive = num >= 0;
		const text = `${positive ? "+" : "-"}${num} ${attribute}`;

		if (typeof unit[attribute] === "number") {
			(unit[attribute] as number) += num;
		} else {
			console.error(`Cannot add number to non-numeric attribute: ${attribute}`);
		}

		if (attribute === "attackPower") {
			this.updateAtkDisplay();
		} else if (attribute === "maxHp") {
			unit.hp = unit.maxHp;
			this.updateHpDisplay();
		}

		await popText({ text, targetId: unit.id, speed: 2 });
	}

	healUnit = (amount: number) => {

		const nextHp = this.unit.hp + amount;

		this.unit.hp = nextHp > this.unit.maxHp ? this.unit.maxHp : nextHp;

		this.updateHpDisplay();
	}


}
