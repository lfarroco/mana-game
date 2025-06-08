import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as constants from "../../Scenes/Battleground/constants";
import { eqVec2, Vec2, vec2 } from "../../Models/Geometry";
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
import { CharaStatsDisplay } from "./CharaStatsDisplay"; // +
import { CharaBarsDisplay } from "./CharaBarsDisplay"; // +

// A Chara is the graphical representation of a Unit
export class Chara extends Phaser.GameObjects.Container {
	public unit: Unit;
	public id: string; // Alias for unit.id for convenience if needed, or use this.unit.id directly

	private sprite!: Phaser.GameObjects.Image;
	private statsDisplay!: CharaStatsDisplay; // +
	private barsDisplay!: CharaBarsDisplay; // +
	// The container itself will be the interactive zone.


	// Properties for drag-and-drop handling, especially for shop items
	private dragStartX: number = 0;
	private dragStartY: number = 0;
	private wasDragSuccessful: boolean = false;
	private isShopItem: boolean; // New flag
	private onPurchasedCallback?: () => void; // New callback

	constructor(public parent: BattlegroundScene, unit: Unit, options?: { isShopItem?: boolean, onPurchased?: () => void }) {
		const position = UnitManager.getCharaPosition(unit);
		super(parent, position.x, position.y);

		this.unit = unit;
		this.isShopItem = options?.isShopItem ?? false;
		this.onPurchasedCallback = options?.onPurchased;


		this.id = unit.id;
		this.name = unit.id; // For Phaser's GameObject name property, useful for lookups

		this.createSprite();
		// Initialize and add new components
		this.statsDisplay = new CharaStatsDisplay(this.parent, this.unit);
		this.statsDisplay.addToContainer(this);
		this.barsDisplay = new CharaBarsDisplay(this.parent, this.unit);
		this.barsDisplay.addToContainer(this);

		this.parent.add.existing(this); // Add this container to the scene

		// Setup interactivity and event listeners
		this.setInteractive(
			new Phaser.Geom.Rectangle(
				-constants.HALF_TILE_WIDTH,
				-constants.HALF_TILE_HEIGHT,
				constants.TILE_WIDTH,
				constants.TILE_HEIGHT
			),
			Phaser.Geom.Rectangle.Contains
		);

		// Player units are draggable on board, shop items are draggable from shop
		if (this.unit.force === FORCE_ID_PLAYER || this.isShopItem) {
			this.parent.input.setDraggable(this);
			this.on('dragstart', this.handleDragStart);
			this.on('drag', this.handleDrag);
			this.on('drop', this.handleDrop); // Note: drop target needs to be set up on potential drop zones
			this.on('dragend', this.handleDragEnd);
		}
		if (this.isShopItem) {
			this.on('pointerup', this.handleShopItemClick);
		}

		// Initial update of displays
		this.statsDisplay.updateHp();
		this.statsDisplay.updateAtk();
		this.barsDisplay.updateBars();

		// Store initial visual position, useful for reverting shop items if drag fails
		this.dragStartX = this.x;
		this.dragStartY = this.y;

	}

	private attemptPurchase(targetBoardPos?: Vec2): boolean {
		const state = getState();
		const purchaseCost = constants.SHOP_ITEM_PURCHASE_COST;

		if (state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
			this.parent.uiManager.displayError("Your party is full!");
			return false;
		}
		if (state.gameData.player.gold < purchaseCost) {
			this.parent.uiManager.displayError("You don't have enough gold!");
			return false;
		}

		if (targetBoardPos) { // If purchasing by dragging to a specific slot
			const occupierOnBoard = state.gameData.player.units.find(u => eqVec2(u.position, targetBoardPos));
			if (occupierOnBoard) {
				this.parent.uiManager.displayError("Slot is occupied!");
				return false;
			}
			this.unit.position = targetBoardPos;
		} else { // Purchasing by click, find an empty slot
			const emptySlot = Board.getEmptySlot(state.gameData.player.units, FORCE_ID_PLAYER);
			if (!emptySlot) {
				this.parent.uiManager.displayError("No empty slot on board!");
				return false;
			}
			this.unit.position = emptySlot;
		}

		updatePlayerGoldIO(this.parent, -purchaseCost);
		state.gameData.player.units.push(this.unit);
		runUnitEventTraits("onEnterPosition")(this.unit);

		// Transition from shop item to owned item
		this.isShopItem = false;
		this.off('pointerup', this.handleShopItemClick); // Remove shop-specific click
		// Add board-specific interactivity if needed, or rely on existing drag for owned units

		if (this.onPurchasedCallback) {
			this.onPurchasedCallback();
		}
		// The Chara is now "owned", its drag/drop will follow the owned unit logic.
		// Visual tweening to the board position will be handled by the caller (handleShopItemClick or handleDrop)
		return true;
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
			.setDisplaySize(constants.TILE_WIDTH, constants.TILE_HEIGHT);

		if (this.unit.force === constants.FORCE_ID_CPU) {
			this.sprite.flipX = true;
		}
		this.add(this.sprite);
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

	private handleShopItemClick = (pointer: Phaser.Input.Pointer) => {
		if (!this.isShopItem) return;

		if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
			return;
		}

		if (this.attemptPurchase()) {
			// Visually place the Chara on the board to its new model position
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			this.wasDragSuccessful = true; // Mark as successful to prevent revert in dragEnd if it was a quick drag-release
		}
		// If attemptPurchase fails, error is displayed, Chara remains in shop.
	}

	// Helper to check if this Chara's unit is already owned by the player
	private isOwnedByPlayer(): boolean {
		return getState().gameData.player.units.some(u => u.id === this.unit.id);
	}
	private _revertShopItemToDragStartPosition() {
		tween({ targets: [this], x: this.dragStartX, y: this.dragStartY });
	}

	private _handleDropOwnedUnit(tile: Vec2 | null) {
		const unitToMove = this.unit;
		const state = getState();

		if (!tile) {
			// Dropped on the board zone, but not on a specific tile. Revert to current model position.
			tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) });
			// Consider if this should set wasDragSuccessful. If reverting to same spot is "no change", then false.
			// If it's a valid "end" of a drag even if no change, then true.
			// For now, let's assume no change means the specific drop action wasn't "successful" in changing state.
			this.wasDragSuccessful = eqVec2(vec2(this.x, this.y), UnitManager.getCharaPosition(unitToMove)); // True if already there
			return;
		}

		const newBoardModelPosition = vec2(tile.x, tile.y);
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
			// Move was not made (e.g., dropped on the same spot or invalid move that board logic prevented).
			runUnitEventTraits("onEnterPosition")(unitToMove); // Re-trigger for the original spot
			if (occupierUnitIfAny) runUnitEventTraits("onEnterPosition")(occupierUnitIfAny); // And for the occupier if it existed
			tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) });
			// If dropped on the same spot, it's a "successful" drag in terms of completing the action.
			if (eqVec2(unitToMove.position, newBoardModelPosition)) {
				this.wasDragSuccessful = true;
			} else {
				this.wasDragSuccessful = false; // Move failed for other reasons
			}
		}
	}

	private _handleDropShopItem(tile: Vec2 | null) {
		if (!tile) {
			// Dropped on the board zone, but not on a specific tile. Revert shop item.
			this._revertShopItemToDragStartPosition();
			this.wasDragSuccessful = false;
			return;
		}

		const newBoardModelPosition = vec2(tile.x, tile.y);
		if (this.attemptPurchase(newBoardModelPosition)) {
			// Purchase successful, model updated by attemptPurchase.
			// Visually place the Chara on the board.
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			this.wasDragSuccessful = true;
		} else {
			// Purchase failed (e.g., not enough gold, slot occupied).
			// Error message handled by attemptPurchase. Revert visual position.
			this._revertShopItemToDragStartPosition();
			this.wasDragSuccessful = false;
		}
	}

	private handleDrop(
		_pointer: Phaser.Input.Pointer, // Renamed as pointer is used by Board.getTileAt
		dropZoneTarget: Phaser.GameObjects.GameObject,
	) {
		// Default to unsuccessful, successful paths will set it to true
		this.wasDragSuccessful = false;

		if (!Board.getBoardDropZone() || dropZoneTarget !== Board.getBoardDropZone()) {
			// Revert is handled by dragend if not on any valid zone.
			// This check ensures we only process drops on the intended main board drop zone.
			return;
		}

		const tile = Board.getTileAt(_pointer);

		if (this.isOwnedByPlayer()) {
			this._handleDropOwnedUnit(tile);
		} else {
			this._handleDropShopItem(tile);
		}


	}

	private _revertDragEndPositionIfDroppedOutsideBoard(pointer: Phaser.Input.Pointer) {
		const isOverBoardZone = Board.isPointerInBoardDropZone(pointer);

		if (!isOverBoardZone) {
			// Drag ended completely outside the player board drop zone. Revert to original position.
			if (this.isShopItem && !this.isOwnedByPlayer()) { // Check if it's still a shop item
				// It's a shop item, revert to its shop slot visual position (dragStartX/Y)
				this._revertShopItemToDragStartPosition();
			} else {
				// It's an owned unit, revert to its last known valid model position
				tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			}
		}
		// If isOverBoardZone is true BUT wasDragSuccessful is false,
		// it implies that handleDrop was called, deemed the drop invalid, and already handled the reversion.
		// So, no further action is needed here for that specific case.
	}

	private handleDragEnd = (pointer: Phaser.Input.Pointer) => {

		tween({ // Always reset angle
			targets: [this],
			angle: 0,
			duration: 100,
			ease: "Cubic.Out",
		});

		if (this.wasDragSuccessful) {
			// Drop was successful (or reverted by handleDrop itself to a "final" state for that action).
			// handleDrop (or handleShopItemClick) already positioned the Chara.
			return;
		}

		// If wasDragSuccessful is false, it means the drop was not on a valid zone,
		// or was on a valid zone but handleDrop determined it was an invalid action and did not set wasDragSuccessful = true.
		this._revertDragEndPositionIfDroppedOutsideBoard(pointer);

	}

	updateHpDisplay = () => {
		this.statsDisplay.updateHp();
	}

	updateAtkDisplay = () => {
		this.statsDisplay.updateAtk();
	}

	public setBarsVisibility(visible: boolean): void {
		this.barsDisplay.setVisible(visible);
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

	updateChargeBar = () => {
		this.barsDisplay.updateBars();
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

		if (this.unit.force === constants.FORCE_ID_PLAYER) {
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
