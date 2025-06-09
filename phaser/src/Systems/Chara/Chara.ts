import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as constants from "../../Scenes/Battleground/constants";
import { eqVec2, Vec2, vec2 } from "../../Models/Geometry";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board"; // getState is used here
import { addStatus, getState, } from "../../Models/State";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { images } from "../../assets";
import { runUnitEventTraits } from "../../Models/Traits";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { updatePlayerGoldIO } from "../../Models/Force";
import { CharaStatsDisplay } from "./CharaStatsDisplay";
import { CharaBarsDisplay } from "./CharaBarsDisplay";

/**
 * Represents the visual and interactive game object for a `Unit` on the battlefield or in the shop.
 * It extends `Phaser.GameObjects.Container` to group various visual elements like sprite, stats, and bars.
 * Handles unit appearance, drag-and-drop interactions (for board placement and shop purchases),
 * and visual feedback for actions like taking damage or being healed.
 */
export class Chara extends Phaser.GameObjects.Container {
	/** The underlying data model for this character, containing all its stats and state. */
	public unit: Unit;
	/** A direct alias to `unit.id` for convenience and for Phaser's GameObject naming. */
	public id: string;

	/** The main visual image/sprite for the character. */
	private sprite!: Phaser.GameObjects.Image;
	/** Component responsible for displaying ATK/HP numerical stats. */
	private statsDisplay!: CharaStatsDisplay;
	/** Component responsible for displaying HP, charge, and cooldown bars. */
	private barsDisplay!: CharaBarsDisplay;

	// --- Drag-and-Drop Properties ---
	/** Initial X position when a drag operation starts. Used for reverting position. */
	private dragStartX: number = 0;
	/** Initial Y position when a drag operation starts. Used for reverting position. */
	private dragStartY: number = 0;
	/** Flag to track if the current drag-and-drop operation concluded successfully (e.g., valid placement or purchase). */
	private wasDragSuccessful: boolean = false;
	/** Indicates if this Chara instance represents an item currently in the shop. */
	private isShopItem: boolean;
	/** Optional callback function to execute after a shop item is successfully purchased. */
	private onPurchasedCallback?: () => void;

	/**
	 * Creates an instance of a Chara.
	 * @param parent The `BattlegroundScene` this Chara belongs to.
	 * @param unit The `Unit` data object this Chara represents.
	 * @param options Optional configuration, primarily for shop items.
	 *                `isShopItem`: Marks the Chara as a shop item.
	 *                `onPurchased`: Callback executed upon successful purchase from the shop.
	 *                               This is typically used to update the shop's display (e.g., remove the item).
	 */
	constructor(public parent: BattlegroundScene, unit: Unit, options?: { isShopItem?: boolean, onPurchased?: () => void }) {
		const position = UnitManager.getCharaPosition(unit);
		super(parent, position.x, position.y);

		this.unit = unit;
		this.isShopItem = options?.isShopItem ?? false;
		this.onPurchasedCallback = options?.onPurchased;

		this.id = unit.id;
		this.name = unit.id; // For Phaser's GameObject name property, useful for lookups
		this.createSprite();
		this.statsDisplay = new CharaStatsDisplay(this.parent, this.unit);
		this.statsDisplay.addToContainer(this);
		this.barsDisplay = new CharaBarsDisplay(this.parent, this.unit);
		this.barsDisplay.addToContainer(this);

		this.parent.add.existing(this);

		this.setInteractive(
			new Phaser.Geom.Rectangle(
				-constants.HALF_TILE_WIDTH,
				-constants.HALF_TILE_HEIGHT,
				constants.TILE_WIDTH,
				constants.TILE_HEIGHT
			),
			Phaser.Geom.Rectangle.Contains
		);

		if (this.unit.force === FORCE_ID_PLAYER || this.isShopItem) {
			this.parent.input.setDraggable(this);
			this.on('dragstart', this.handleDragStart);
			this.on('drag', this.handleDrag);
			this.on('drop', this.handleDrop);
			this.on('dragend', this.handleDragEnd);
		}
		if (this.isShopItem) {
			this.on('pointerup', this.handleShopItemClick);
		}

		this.statsDisplay.updateHp();
		this.statsDisplay.updateAtk();
		this.barsDisplay.updateBars();

		// Store initial visual position, useful for reverting shop items if drag fails
		this.dragStartX = this.x;
		this.dragStartY = this.y;
	}

	/**
	 * Attempts to purchase this Chara if it's a shop item.
	 * Validates player's gold, party size, and target slot availability.
	 * Updates player's gold and unit list upon successful purchase.
	 * @param targetBoardPos Optional. If provided, attempts to place the unit at this specific board position. Otherwise, finds an empty slot.
	 * @returns `true` if the purchase was successful, `false` otherwise.
	 */
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

		if (targetBoardPos) {
			const occupierOnBoard = state.gameData.player.units.find(u => eqVec2(u.position, targetBoardPos));
			if (occupierOnBoard) {
				this.parent.uiManager.displayError("Slot is occupied!");
				return false;
			}
			this.unit.position = targetBoardPos;
		} else { // Purchasing by click, find an empty slot
			const emptySlot = this.parent.playerBoard.getEmptySlot(state.gameData.player.units, FORCE_ID_PLAYER); // TODO: Ensure this finds a slot on the *player's* board specifically if not already guaranteed
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
		this.off('pointerup', this.handleShopItemClick);

		if (this.onPurchasedCallback) {
			this.onPurchasedCallback();
		}
		// Visual tweening to the board position is handled by the calling method (handleShopItemClick or handleDrop).
		return true;
	}

	/**
	 * Creates the main sprite for the Chara based on `unit.pic`.
	 * Uses a default "nameless" image if the specified picture key doesn't exist.
	 */
	private createSprite() {
		// Use unit.pic if valid, otherwise default to "nameless"
		const textureKey = this.unit.pic && this.parent.textures.exists(this.unit.pic)
			? this.unit.pic
			: images.nameless.key;

		if (textureKey === images.nameless.key) {
			console.warn(`Chara ${this.unit.id} using default texture ${textureKey}`);
		}
		this.sprite = this.parent.add.image(0, 0, textureKey)
			.setDisplaySize(constants.TILE_WIDTH, constants.TILE_HEIGHT);

		this.add(this.sprite);
	}

	// --- Drag-and-Drop Event Handlers ---

	/**
	 * Handles the 'dragstart' event. Sets initial drag state and provides visual feedback.
	 */
	private handleDragStart = () => {
		this.dragStartX = this.x;
		this.dragStartY = this.y;
		this.wasDragSuccessful = false;

		this.parent.children.bringToTop(this);
		tween({
			targets: [this],
			angle: -10,
			duration: 100,
			ease: "Cubic.Out",
		});
	}

	/**
	 * Handles the 'drag' event. Updates the Chara's position to follow the pointer.
	 * @param pointer The Phaser input pointer.
	 */
	private handleDrag(pointer: Phaser.Input.Pointer) {
		this.x = pointer.x;
		this.y = pointer.y;
		this.parent.uiManager.tooltip.hide();
	}

	/**
	 * Handles the 'pointerup' event specifically for shop items, interpreting it as a click-to-buy action.
	 */

	private handleShopItemClick = (pointer: Phaser.Input.Pointer) => {
		if (!this.isShopItem) return;

		if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
			return;
		}

		if (this.attemptPurchase()) {
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			this.wasDragSuccessful = true; // Mark as successful to prevent revert in dragEnd if it was a quick drag-release
		}
		// If attemptPurchase fails, error is displayed, Chara remains in shop.
	}

	/**
	 * Helper to check if this Chara's underlying unit is already owned by the player.
	 * @returns `true` if the unit is in the player's `gameData.units` list, `false` otherwise.
	 */
	private isOwnedByPlayer(): boolean {
		return getState().gameData.player.units.some(u => u.id === this.unit.id);
	}

	/**
	 * Helper to visually revert a shop item Chara to its original drag start position (its shop slot).
	 */
	private _revertShopItemToDragStartPosition() {
		tween({ targets: [this], x: this.dragStartX, y: this.dragStartY });
	}

	/**
	 * Handles the logic when an already owned unit is dropped onto the player's board.
	 * This can result in moving the unit to an empty tile or swapping it with an existing unit.
	 * @param tile The board tile (Vec2) where the unit was dropped, or null if not on a specific tile.
	 */
	private _handleDropOwnedUnit(tile: Vec2) {
		const unitToMove = this.unit;
		const state = getState();


		const newBoardModelPosition = vec2(tile.x, tile.y);
		// Trigger 'onLeavePosition' for the unit being moved *before* its position is updated in the model.
		runUnitEventTraits("onLeavePosition")(unitToMove);

		const occupierUnitIfAny = state.gameData.player.units.find(
			u => u.id !== unitToMove.id && eqVec2(u.position, newBoardModelPosition)
		);
		// If there's an occupier, trigger its 'onLeavePosition' before it's potentially moved.
		if (occupierUnitIfAny) {
			runUnitEventTraits("onLeavePosition")(occupierUnitIfAny);
		}

		const moveResult = Board.PlayerBoard.updateUnitPosition(
			unitToMove,
			newBoardModelPosition,
			state.gameData.player.units
		);

		if (moveResult) {
			// Trigger 'onEnterPosition' for the moved unit at its new position.
			runUnitEventTraits("onEnterPosition")(unitToMove);
			tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) });

			if (moveResult.swappedUnit) {
				runUnitEventTraits("onEnterPosition")(moveResult.swappedUnit);
				const occupierChara = UnitManager.getChara(moveResult.swappedUnit.id);
				tween({ targets: [occupierChara], ...UnitManager.getCharaPosition(moveResult.swappedUnit) });
			}
			this.wasDragSuccessful = true;
		} else {
			runUnitEventTraits("onEnterPosition")(unitToMove); // Re-trigger for the original spot
			if (occupierUnitIfAny) runUnitEventTraits("onEnterPosition")(occupierUnitIfAny);
			tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) });
			// If dropped on the same spot, it's a "successful" drag in terms of completing the action.
			if (eqVec2(unitToMove.position, newBoardModelPosition)) {
				this.wasDragSuccessful = true;
			} else {
				this.wasDragSuccessful = false; // Move failed for other reasons
			}
		}
	}

	/**
	 * Handles the logic when a shop item is dropped onto the player's board.
	 * This attempts to purchase and place the unit.
	 * @param tile The board tile (Vec2) where the item was dropped, or null if not on a specific tile.
	 */
	private _handleDropShopItem(tile: Vec2) {
		const newBoardModelPosition = vec2(tile.x, tile.y);
		if (this.attemptPurchase(newBoardModelPosition)) {
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			this.wasDragSuccessful = true;
		} else {
			// Purchase failed (e.g., not enough gold, slot occupied); error handled by attemptPurchase. Revert visual.
			this._revertShopItemToDragStartPosition();
			this.wasDragSuccessful = false;
		}
	}

	/**
	 * Handles the 'drop' event, which is emitted by a drop zone when this Chara is dropped onto it.
	 * Determines if the Chara is an owned unit or a shop item and delegates to the appropriate handler.
	 * @param _pointer The Phaser input pointer.
	 * @param dropZoneTarget The GameObject that is the drop zone.
	 */
	private handleDrop(
		_pointer: Phaser.Input.Pointer, // _pointer to avoid conflict with Board.getTileAt which uses pointer
		dropZoneTarget: Phaser.GameObjects.GameObject,
	) {
		this.wasDragSuccessful = false;

		if (!Board.PlayerBoard.isTileZone(dropZoneTarget)) {
			// Dropped outside a valid player board tile zone.
			// handleDragEnd will take care of reverting if necessary.
			return;
		}

		const tile = Board.PlayerBoard.getTileFromZone(dropZoneTarget);

		if (!tile) {
			// Should not happen if isPlayerBoardTileZone passed and getTileFromZone is robust
			console.warn("Chara.handleDrop: Dropped on a board tile zone, but could not derive tile coordinates.", dropZoneTarget.name);
			return;
		}

		if (this.isOwnedByPlayer()) {
			this._handleDropOwnedUnit(tile);
		} else { // Assumed to be a shop item
			this._handleDropShopItem(tile);
		}
	}

	/**
	 * Handles the 'dragend' event. Finalizes the drag operation, reverting the Chara's position
	 * if the drop was not successful or occurred outside a valid zone.
	 */
	private handleDragEnd = (_pointer: Phaser.Input.Pointer) => {
		this.parent.tweens.add({ // Ensure using scene's tween manager if tween is a global util
			targets: [this],
			angle: 0,
			duration: 100,
			ease: "Cubic.Out",
		});
		if (this.wasDragSuccessful) {
			// handleDrop (or handleShopItemClick) already positioned the Chara.
			return;
		}

		// If wasDragSuccessful is false, the drop was not successful. Revert the Chara.
		if (this.isShopItem && !this.isOwnedByPlayer()) {
			this._revertShopItemToDragStartPosition();
		} else { // Owned unit, or a shop item that failed purchase but its state might be complex
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
		}
	};

	// --- UI Update Methods ---

	/** Updates the displayed HP value via the `statsDisplay` component. */
	updateHpDisplay = () => {
		this.statsDisplay.updateHp();
	}

	/** Updates the displayed Attack Power value via the `statsDisplay` component. */
	updateAtkDisplay = () => {
		this.statsDisplay.updateAtk();
	}

	/**
	 * Sets the visibility of the HP, charge, and cooldown bars.
	 * @param visible `true` to show bars, `false` to hide.
	 */
	public setBarsVisibility(visible: boolean): void {
		this.barsDisplay.setVisible(visible);
	}

	/**
	 * Sets up tooltip display for this Chara on pointer hover.
	 */
	addTooltip = () => {
		this.on('pointerover', () => {
			const text = [
				`Attack: ${this.unit.attackPower} HP: ${this.unit.hp}`,
				this.unit.traits.map((trait) => trait.description).join("\n"),
			].join('\n');

			this.parent.uiManager.tooltip.render(
				this.x + 340, // TODO: Adjust tooltip position based on Chara's screen position/side
				this.y,
				this.unit.name,
				text
			);
		});

		this.on('pointerout', () => {
			this.parent.uiManager.tooltip.hide();
		});
	}

	/** Updates the charge bar and other debug bars via the `barsDisplay` component. */
	updateChargeBar = () => {
		this.barsDisplay.updateBars();
	}

	// --- Unit Action and State Methods ---

	/**
	 * Applies damage to the Chara's unit. Updates HP display, shows damage pop-up text,
	 * handles critical hit display, checks for death, and triggers 'onHalfHP' events.
	 * @param damage The amount of damage to apply.
	 * @param isCritical Whether the damage is a critical hit.
	 */
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

	/**
	 * Handles the death of the unit. Sets HP to 0, plays death animation,
	 * removes the Chara from the game state and manager, and triggers 'onDeath' events.
	 */
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

	/**
	 * Updates a specified attribute of the Chara's unit by a numerical amount.
	 * This directly modifies the unit's data (e.g., base attackPower, maxHp).
	 * It also handles updating relevant UI displays and shows a pop-up text for the change.
	 * @param attribute The key of the `Unit` attribute to update.
	 * @param num The numerical value to add to the attribute (can be negative).
	 * @template K Extends keyof Unit, ensuring `attribute` is a valid property of `Unit`.
	 */
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
			unit.hp = unit.maxHp; // Also heal to new maxHp when maxHp increases
			this.updateHpDisplay();
		} else if (attribute === "hp") {
			this.updateHpDisplay();
		}

		await popText({ text, targetId: unit.id, speed: 2 });
	}

	/**
	 * Heals the Chara's unit by a specified amount, up to its maximum HP.
	 * Updates the HP display.
	 * @param amount The amount of HP to restore.
	 */
	healUnit = (amount: number) => {
		const nextHp = this.unit.hp + amount;
		this.unit.hp = nextHp > this.unit.maxHp ? this.unit.maxHp : nextHp;
		this.updateHpDisplay();
	}
}
