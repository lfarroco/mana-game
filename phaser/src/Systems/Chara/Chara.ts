import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { eqVec2, vec2 } from "../../Models/Geometry";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board"; // getState is used here
import { addStatus, getState, } from "../../Models/State";
import * as TooltipSytem from "../Tooltip";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { images } from "../../assets";
import { runUnitEventTraits } from "../../Models/Traits";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { updatePlayerGoldIO } from "../../Models/Force";

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

	// Properties for drag-and-drop handling, especially for shop items
	private dragStartX: number = 0;
	private dragStartY: number = 0;
	private wasDragSuccessful: boolean = false;

	constructor(public parent: BattlegroundScene, unit: Unit) {
		const position = UnitManager.getCharaPosition(unit);
		super(parent, position.x, position.y);

		this.unit = unit;
		this.id = unit.id;
		this.name = unit.id; // For Phaser's GameObject name property, useful for lookups

		this.createSprite();
		this.createStatsDisplay();
		this.createBars();

		this.parent.add.existing(this); // Add this container to the scene

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
			this.parent.input.setDraggable(this);
			this.on('dragstart', this.handleDragStart);
			this.on('drag', this.handleDrag);
			this.on('drop', this.handleDrop); // Note: drop target needs to be set up on potential drop zones
			this.on('dragend', this.handleDragEnd);
		}

		// Initial update of displays
		this.updateHpDisplay();
		this.updateAtkDisplay();
		this.updateChargeBar();

		// Store initial visual position, useful for reverting shop items if drag fails
		this.dragStartX = this.x;
		this.dragStartY = this.y;

	}

	private createSprite() {

		// Ensure unit.pic is a valid texture key, otherwise use a default
		const textureKey = this.unit.pic && this.parent.textures.exists(this.unit.pic)
			? this.unit.pic
			: images.nameless.key;

		if (textureKey === images.nameless.key) {
			console.warn(`Chara ${this.unit.id} using default texture ${textureKey}`);
		}
		this.sprite = this.parent.add.image(0, 0, textureKey)
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
		const atkBg = this.parent.add.graphics();
		atkBg.fillStyle(0xff0000, 1).fillRoundedRect(atkPosition[0], atkPosition[1], boxWidth, boxHeight, cornerRadius);

		this.atkDisplay = this.parent.add.text(
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
		const hpBg = this.parent.add.graphics();
		hpBg.fillStyle(0x327a0a, 1.0).fillRoundedRect(hpPosition[0], hpPosition[1], boxWidth, boxHeight, cornerRadius);

		this.hpDisplay = this.parent.add.text(
			hpPosition[0] + boxWidth / 2,
			hpPosition[1] + boxHeight / 2,
			this.unit.hp.toString(),
			bgConstants.defaultTextConfig
		).setOrigin(0.5).setAlign('center');
		this.add([hpBg, this.hpDisplay]);
	}

	private createBars() {
		this.chargeBar = this.parent.add.graphics();
		this.cooldownBar = this.parent.add.graphics();
		this.hpBar = this.parent.add.graphics();
		this.add([this.chargeBar, this.cooldownBar, this.hpBar]);
	}

	// --- Event Handlers ---
	private handleDragStart = () => {
		this.dragStartX = this.x;
		this.dragStartY = this.y;
		this.wasDragSuccessful = false; // Reset flag at the start of a new drag

		this.parent.children.bringToTop(this);
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

	// Helper to check if this Chara's unit is already owned by the player
	private isOwnedByPlayer(): boolean {
		return getState().gameData.player.units.some(u => u.id === this.unit.id);
	}

	private handleDrop(
		pointer: Phaser.Input.Pointer,
		dropZoneTarget: Phaser.GameObjects.GameObject, // This is the GameObject it was dropped on
	) {
		// Default to unsuccessful, successful paths will set it to true
		this.wasDragSuccessful = false;

		if (!Board.getBoardDropZone() || dropZoneTarget !== Board.getBoardDropZone()) {
			// Revert is handled by dragend if not on any valid zone.
			// This check ensures we only process drops on the intended main board drop zone.
			return;
		}

		const state = getState();
		const tile = Board.getTileAt(pointer); // From Board.ts

		const revertToOriginalVisualPosition = () => {
			tween({ targets: [this], x: this.dragStartX, y: this.dragStartY });
		};

		if (!tile) {
			// Dropped on the board zone, but not on a specific tile. Revert.
			// If owned, revert to its model position. If not (shop item), revert to drag start.
			if (this.isOwnedByPlayer()) {
				tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			} else {
				revertToOriginalVisualPosition();
			}
			return;
		}

		const newBoardModelPosition = vec2(tile.x, tile.y);
		const unitToMove = this.unit;

		if (this.isOwnedByPlayer()) {
			// --- Logic for moving an already owned unit ---
			runUnitEventTraits("onLeavePosition")(unitToMove);

			const occupierUnitIfAny = state.gameData.player.units.find(
				u => u.id !== unitToMove.id && eqVec2(u.position, newBoardModelPosition)
			);
			if (occupierUnitIfAny) {
				runUnitEventTraits("onLeavePosition")(occupierUnitIfAny);
			}

			const moveResult = Board.updateUnitPositionOnBoard(
				unitToMove,
				newBoardModelPosition,
				state.gameData.player.units
			);

			if (moveResult) {
				runUnitEventTraits("onEnterPosition")(unitToMove);
				tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) });

				if (moveResult.swappedUnit) {
					runUnitEventTraits("onEnterPosition")(moveResult.swappedUnit);
					const occupierChara = UnitManager.getChara(moveResult.swappedUnit.id);
					tween({ targets: [occupierChara], ...UnitManager.getCharaPosition(moveResult.swappedUnit) });
				}
				this.wasDragSuccessful = true;
			} else {
				// Move was not made (e.g., dropped on the same spot).
				runUnitEventTraits("onEnterPosition")(unitToMove);
				if (occupierUnitIfAny) runUnitEventTraits("onEnterPosition")(occupierUnitIfAny);
				tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
				// wasDragSuccessful remains false or could be true if same spot is "success"
				if (eqVec2(unitToMove.position, newBoardModelPosition)) this.wasDragSuccessful = true;
			}
		} else {
			// --- Logic for purchasing a new unit (e.g., from shop) ---
			const purchaseCost = 3; // TODO: Make this configurable, e.g., from unit.cost or shop config

			if (state.gameData.player.units.length >= bgConstants.MAX_PARTY_SIZE) {
				this.parent.uiManager.displayError("Your party is full!");
				revertToOriginalVisualPosition();
				return;
			}
			if (state.gameData.player.gold < purchaseCost) {
				this.parent.uiManager.displayError("You don't have enough gold!");
				revertToOriginalVisualPosition();
				return;
			}

			const occupierOnBoard = state.gameData.player.units.find(u => eqVec2(u.position, newBoardModelPosition));
			if (occupierOnBoard) {
				this.parent.uiManager.displayError("Slot is occupied!");
				revertToOriginalVisualPosition();
				return;
			}

			// Process purchase
			updatePlayerGoldIO(this.parent, -purchaseCost);

			unitToMove.position = newBoardModelPosition; // Set model position
			state.gameData.player.units.push(unitToMove); // Add to player's roster

			// Visually place the Chara on the board
			tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) });

			runUnitEventTraits("onEnterPosition")(unitToMove); // Call traits for entering board

			this.parentContainer.remove(this); // True to destroy the Chara from flyout

			// Remove the shop's specific 'pointerup' click-to-buy listener if it exists
			// This is a bit of a hack; ideally, the shop manages its listeners.
			// For now, we assume the shop might have added a 'pointerup'.
			this.off('pointerup');

			this.wasDragSuccessful = true;
		}


	}

	private handleDragEnd = (pointer: Phaser.Input.Pointer) => {

		tween({
			targets: [this],
			angle: 0,
			duration: 100,
			ease: "Cubic.Out",
		});

		if (Board.isPointerInBoardDropZone(pointer)) return

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

	public setBarsVisibility(visible: boolean): void {
		this.chargeBar.setVisible(visible);

		// Debug bars should only be affected if debug mode is on
		const debugMode = getState().options.debug;
		this.cooldownBar.setVisible(visible && debugMode);
		this.hpBar.setVisible(visible && debugMode);
	}

	addTooltip = () => {
		this.on('pointerover', () => {
			const text = [
				`Attack: ${this.unit.attackPower} HP: ${this.unit.hp}`,
				this.unit.traits.map((trait) => trait.description).join("\n"),
			].join('\n');

			TooltipSytem.render(
				this.x + 340, // TODO: Adjust tooltip position based on Chara's screen position/side
				this.y,
				this.unit.name,
				text
			);
		});

		this.on('pointerout', () => {
			TooltipSytem.hide();
		});
	}

	// TODO: extract chargebar to isolated component
	updateChargeBar = () => {
		// This bar visually "drains": a full bar means 0% charge, an empty bar means 100% charged.
		const { chargeBar, cooldownBar, hpBar, unit } = this;
		const maxWidthForDebugBars = bgConstants.TILE_WIDTH - (2 * Chara.DEBUG_BAR_PADDING);

		chargeBar.clear(); // Clears previously drawn graphics on this Graphics object
		const percent = unit.charge / unit.cooldown;

		let color = 0x000;

		if (unit.hasted > 0 && unit.slowed > 0) color = 0x000;
		else if (unit.hasted > 0) color = 0x00ff00;
		else if (unit.slowed > 0) color = 0xff0000;

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
			criticalDamageDisplay(this.parent, this, Math.floor(damage));
		} else {
			popText({ text: Math.floor(damage).toFixed(0).toString(), targetId: chara.id, type: "damage" });
		}

		if (hasDied) {
			this.killUnit();
			return;
		}

		if (nextHp <= chara.unit.maxHp / 2 && !chara.unit.statuses["on-half-hp"]) {
			runUnitEventTraits("onHalfHP")(chara.unit);
			addStatus(chara.unit, "on-half-hp");
		}
	}

	killUnit = async () => {
		this.unit.hp = 0;

		tween({ targets: [this], alpha: 0, duration: 1000 });

		const originalX = this.x;
		for (let i = 0; i < 5; i++) {
			await tween({ targets: [this], x: originalX - 20, duration: 100, ease: "Cubic.Out" });
			await tween({ targets: [this], x: originalX + 20, duration: 100, ease: "Cubic.Out" });
		}

		await delay(this.parent, 2000);

		UnitManager.destroyChara(this.id);

		getState().battleData.units = getState().battleData.units.filter(u => u.id !== this.id);
		runUnitEventTraits("onDeath")(this.unit);

		if (this.unit.force === bgConstants.FORCE_ID_PLAYER) {
			getState().gameData.player.units = getState().gameData.player.units.filter(u => u.id !== this.id);
		}
	}

	// Function to update an attribute, not applying it (not apply damage of heal)
	// This means changing the value of the card
	updateUnitAttribute = async <K extends keyof Unit>(attribute: K, num: number) => {
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
			unit.hp = unit.maxHp; // Also heal to new maxHp
			this.updateHpDisplay();
		} else if (attribute === "hp") {
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
