import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { Vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { images } from "../../assets";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { CharaStatsDisplay } from "./CharaStatsDisplay";
import { CharaBarsDisplay } from "./CharaBarsDisplay";
import { GameEvents } from "../../constants/events";
import { CharaInputHandler } from "./CharaInputHandler"; // +++ NEW IMPORT
import * as sc from "../../Scenes/Battleground/Systems/Shop/ShopConstants";

export type CharaOptions = {
	isShopItem?: boolean;
	onPurchased?: () => void;
};

/**
 * Represents the visual and interactive game object for a `Unit` on the battlefield or in the shop (as a `Chara` instance).
 * It extends `Phaser.GameObjects.Container` to group various visual elements like sprite, stats, and bars.
 * Handles unit appearance, drag-and-drop interactions (for board placement and shop purchases),
 * and visual feedback for actions like taking damage or being healed.
 *
 * The `Chara` acts as the "View" and part of the "Controller" for a `Unit` (the "Model"),
 * linking the logical game state of the `Unit` to its graphical representation and player interaction within the Phaser scene.
 */
export class Chara extends Phaser.GameObjects.Container {
	/** The underlying data model for this character, containing all its stats and state. */
	unit: Unit;
	/** A direct alias to `unit.id` for convenience and for Phaser's GameObject naming. */
	id: string;

	/** The main visual image/sprite for the character. */
	sprite!: Phaser.GameObjects.Image;
	/** Component responsible for displaying ATK/HP numerical stats. */
	statsDisplay!: CharaStatsDisplay;
	/** Component responsible for displaying HP, charge, and cooldown bars. */
	barsDisplay!: CharaBarsDisplay;

	/** Handles all input interactions for this Chara. */
	inputHandler!: CharaInputHandler; // +++ NEW PROPERTY
	/** Indicates if this Chara instance represents an item currently in the shop. */
	isShopItem: boolean;
	/** Optional callback function to execute after a shop item is successfully purchased. */
	onPurchasedCallback?: () => void;
	playerBoard: Board.PlayerBoard;
	shop: import("/Users/<redacted>/dev/mana-game/phaser/src/Scenes/Battleground/Systems/Shop/Shop").Shop;

	/**
	 * Creates an instance of a Chara.
	 * @param scene The `BattlegroundScene` this Chara belongs to.
	 * @param unit The `Unit` data object this Chara represents.
	 * @param options Optional configuration, primarily for shop items.
	 *                `isShopItem`: Marks the Chara as a shop item.
	 *                `onPurchased`: Callback executed upon successful purchase from the shop.
	 *                               This is typically used to update the shop's display (e.g., remove the item).
	 */
	constructor(scene: BattlegroundScene, unit: Unit, options?: CharaOptions) {
		const position = UnitManager.getCharaPosition(unit);
		super(scene, position.x, position.y);

		this.scene = scene;
		this.playerBoard = scene.playerBoard;
		this.shop = scene.shop;
		this.unit = unit;
		this.isShopItem = options?.isShopItem ?? false;
		this.onPurchasedCallback = options?.onPurchased;

		this.id = unit.id;
		this.name = unit.id; // For Phaser's GameObject name property, useful for lookups
		this.createSprite();
		this.statsDisplay = new CharaStatsDisplay(this.scene, this.unit);
		this.statsDisplay.addToContainer(this);
		this.barsDisplay = new CharaBarsDisplay(this.scene, this.unit);
		this.barsDisplay.addToContainer(this);

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

		// Setup input handling
		this.inputHandler = new CharaInputHandler(this);

		// Emit events for tooltip handling by BattlegroundEventSystem
		this.on(Phaser.Input.Events.POINTER_OVER, () => {
			this.scene.events.emit(GameEvents.CHARA_POINTER_OVER, { chara: this });
		});
		this.on(Phaser.Input.Events.POINTER_OUT, () => {
			this.scene.events.emit(GameEvents.CHARA_POINTER_OUT, { chara: this });
		});

		this.statsDisplay.updateHp();
		this.statsDisplay.updateAtk();
		this.barsDisplay.updateBars();

		if (this.isShopItem) {
			this.scene.events.on(GameEvents.SHOP_PURCHASE_SUCCESSFUL, this._onShopPurchaseSuccessful, this);
			this.scene.events.on(GameEvents.SHOP_PURCHASE_FAILED, this._onShopPurchaseFailed, this);
		}
		// Listen for move/swap outcomes if it's an owned unit (or becomes one)
		// These listeners are safe even if the Chara starts as a shop item,
		// as they'll only react if the IDs match after it's owned.
		this.scene.events.on(GameEvents.OWNED_UNIT_MOVE_ACCEPTED, this._onOwnedUnitMoveAccepted, this);
		this.scene.events.on(GameEvents.OWNED_UNIT_SWAP_ACCEPTED, this._onOwnedUnitSwapAccepted, this);
		this.scene.events.on(GameEvents.OWNED_UNIT_MOVE_REJECTED, this._onOwnedUnitMoveRejected, this);

		this.scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ACTION, this.onAction, this);
	}



	/**
	 * Creates the main sprite for the Chara based on `unit.pic`.
	 * Uses a default "nameless" image if the specified picture key doesn't exist.
	 */
	createSprite() {
		// Use unit.pic if valid, otherwise default to "nameless"
		const textureKey = this.unit.pic && this.scene.textures.exists(this.unit.pic)
			? this.unit.pic
			: images.nameless.key;

		if (textureKey === images.nameless.key) {
			console.warn(`Chara ${this.unit.id} using default texture ${textureKey}`);
		}
		this.sprite = this.scene.add.image(0, 0, textureKey)
			.setDisplaySize(constants.TILE_WIDTH, constants.TILE_HEIGHT);

		this.add(this.sprite);
	}

	/**
	 * Called by CharaInputHandler when a shop item is clicked.
	 * Emits an event to request a purchase attempt.
	 * @param dragStartX The X coordinate where the potential drag started (or click position).
	 * @param dragStartY The Y coordinate where the potential drag started (or click position).
	 *                   For click purchases, these parameters from CharaInputHandler are the click coordinates.
	 *                   However, for the purpose of reverting a failed purchase, we need the Chara's
	 *                   actual current position (its shop slot position).
	 */
	processShopItemClick(_clickX: number, _clickY: number): void {
		// For a click purchase, targetBoardPos is undefined; the ShopSystem will find an empty slot.
		// We pass a copy of unit data as the shop Chara's unit shouldn't be mutated directly
		// until purchase is confirmed and a new unit is officially created.
		// The dragStartX/Y here MUST be the Chara's current position in the shop,
		// so it can revert correctly if the purchase fails.
		// _clickX and _clickY (the actual pointer coordinates) are not used for the revert logic.
		this.scene.events.emit(GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED, { shopUnitData: { ...this.unit }, shopCharaId: this.id, dragStartX: this.x, dragStartY: this.y });
	}

	/**
	 * Helper to visually revert a shop item Chara to its original drag start position (its shop slot).
	 */
	_revertShopItemToPosition(x: number, y: number) {
		tween({ targets: [this], x, y });
	}

	/**
	 * Handles the logic when an already owned unit is dropped onto the player's board.
	 * This can result in moving the unit to an empty tile or swapping it with an existing unit.
	 * @param tile The board tile (Vec2) where the unit was dropped, or null if not on a specific tile.
	 * @param dragStartX The X coordinate where the drag started.
	 * @param dragStartY The Y coordinate where the drag started.
	 */
	_handleDropOwnedUnit(tile: Vec2, dragStartX: number, dragStartY: number): void {
		this.scene.events.emit(GameEvents.OWNED_UNIT_MOVE_REQUESTED, {
			unitId: this.unit.id,
			targetTile: tile,
			dragStartX,
			dragStartY
		});
		// The success/failure and visual update will be handled by listeners to OWNED_UNIT_MOVE_ACCEPTED/REJECTED/SWAP_ACCEPTED
	}


	/**
	 * Handles the logic when a shop item is dropped onto the player's board.
	 * This attempts to purchase and place the unit.
	 * @param tile The board tile (Vec2) where the item was dropped, or null if not on a specific tile.
	 * @param dragStartX The X coordinate where the drag started.
	 * @param dragStartY The Y coordinate where the drag started.
	 */
	_handleDropShopItem(tile: Vec2, dragStartX: number, dragStartY: number): void {
		// We pass a copy of unit data as the shop Chara's unit shouldn't be mutated directly
		// until purchase is confirmed and a new unit is officially created.
		this.scene.events.emit(GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED, {
			shopUnitData: { ...this.unit }, // Pass a copy
			shopCharaId: this.id,
			targetTile: tile,
			dragStartX,
			dragStartY
		});
		// The success/failure and visual update will be handled by listeners to SHOP_PURCHASE_SUCCESSFUL/FAILED
	}

	/**
	 * Processes a drop action onto a game object, typically a board tile zone.
	 * Determines if the Chara is an owned unit or a shop item and delegates to the appropriate handler.
	 * @param dragStartX The X coordinate where the drag started.
	 * @param dragStartY The Y coordinate where the drag started.
	 */
	processDrop(dropZoneTarget: Phaser.GameObjects.GameObject, dragStartX: number, dragStartY: number): boolean {
		if (dropZoneTarget.name === sc.SHOP_SELL_ZONE_NAME) {
			if (!this.isShopItem) { // Can only sell owned units
				this._handleSellUnit();
				return true; // Drop handled
			} else {
				// Shop item dropped on sell zone - invalid action, revert.
				return false;
			}
		}

		if (!Board.PlayerBoard.isTileZone(dropZoneTarget)) {
			// Dropped outside a valid player board tile zone or the sell zone.
			return false;
		}

		const tile = Board.PlayerBoard.getTileFromZone(dropZoneTarget);
		// The following check is technically redundant if the first 'if' handles SHOP_SELL_ZONE_NAME
		// and the second 'if' ensures it's a PlayerBoard tile zone.
		// However, it's a good safeguard.
		if (!tile && Board.PlayerBoard.isTileZone(dropZoneTarget)) {
			console.warn("Chara.processDrop: Dropped on a player board tile zone, but could not derive tile coordinates.", dropZoneTarget.name);
			return false;
		}

		// If execution reaches here, it must be a player board tile zone, and 'tile' should be valid.
		// This explicit check on 'tile' handles the case where getTileFromZone might return null for some reason.
		if (!tile) {
			console.warn("Chara.handleDrop: Dropped on a board tile zone, but could not derive tile coordinates.", dropZoneTarget.name);
			return false;
		}

		if (!this.isShopItem) { // It's an owned unit
			this._handleDropOwnedUnit(tile, dragStartX, dragStartY);
			return true; // Assume the request was successfully emitted. Outcome handled by events.
		} else { // Assumed to be a shop item
			this._handleDropShopItem(tile, dragStartX, dragStartY);
			return true; // Assume the request was successfully emitted. Outcome handled by events.
		}
	}

	_handleSellUnit(): void {
		const sellPrice = Math.floor(constants.SHOP_ITEM_PURCHASE_COST / 2);

		// Emit the OWNED_UNIT_SOLD event. The BattlegroundScene handler will
		// manage gold update, pop text, state removal, visual cleanup, and sell zone.
		this.scene.events.emit(GameEvents.OWNED_UNIT_SOLD, { unitId: this.unit.id, soldForGold: sellPrice });
	}

	/**
	 * Reverts the Chara's visual position after an unsuccessful drag or failed purchase.
	 * @param originalX The X position to revert to.
	 * @param originalY The Y position to revert to.
	 */
	revertDragOrFailedPurchase(revertToX: number, revertToY: number): void {
		if (this.isShopItem) { // If it's still a shop item (purchase failed or invalid drop for shop item)
			this._revertShopItemToPosition(revertToX, revertToY);
		} else { // Owned unit that failed to move
			// Revert to the actual screen coordinates from before the drag started.
			tween({ targets: [this], x: revertToX, y: revertToY, duration: 150 });
		}
	};

	/**
	 * Called when this Chara, as a shop item, has been successfully purchased.
	 * Invokes the onPurchasedCallback if it exists.
	 */
	finalizePurchase(): void {
		this.isShopItem = false; // No longer a shop item
		if (this.onPurchasedCallback) this.onPurchasedCallback();
	};

	_onShopPurchaseSuccessful(payload: { purchasedUnit: Unit, originalShopCharaId: string }): void {
		if (this.isShopItem && payload.originalShopCharaId === this.id) {
			this.finalizePurchase(); // This calls the onPurchasedCallback which should handle removal from flyout
			// The CharaManager is responsible for the actual destruction and removal from its index.
			UnitManager.destroyChara(this.id);
		}
	}

	_onShopPurchaseFailed(payload: { originalShopCharaId: string, reason: string, dragStartX: number, dragStartY: number }): void {
		if (this.isShopItem && payload.originalShopCharaId === this.id) {
			// Ensure tooltip is hidden before reverting, as pointer might not naturally move out
			this.scene.events.emit(GameEvents.TOOLTIP_HIDE);
			this.revertDragOrFailedPurchase(payload.dragStartX, payload.dragStartY);
			// Optionally, re-enable input if it was disabled during purchase attempt, though current logic doesn't show it being disabled.
			// this.input.enabled = true;
		}
	}

	_onOwnedUnitMoveAccepted(payload: { unitId: string, newVisualPosition: { x: number, y: number } }): void {
		if (!this.isShopItem && payload.unitId === this.id) {
			tween({ targets: [this], x: payload.newVisualPosition.x, y: payload.newVisualPosition.y, duration: 150 });
		}
	}

	_onOwnedUnitSwapAccepted(payload: { movedUnitId: string, movedUnitVisualPosition: { x: number, y: number }, swappedUnitId: string, swappedUnitVisualPosition: { x: number, y: number } }): void {
		if (!this.isShopItem) {
			if (payload.movedUnitId === this.id) {
				tween({ targets: [this], x: payload.movedUnitVisualPosition.x, y: payload.movedUnitVisualPosition.y, duration: 150 });
			} else if (payload.swappedUnitId === this.id) {
				tween({ targets: [this], x: payload.swappedUnitVisualPosition.x, y: payload.swappedUnitVisualPosition.y, duration: 150 });
			}
		}
	}

	_onOwnedUnitMoveRejected(payload: { unitId: string, dragStartX: number, dragStartY: number }): void {
		if (!this.isShopItem && payload.unitId === this.id) {
			// Ensure tooltip is hidden before reverting, as pointer might not naturally move out
			this.scene.events.emit(GameEvents.TOOLTIP_HIDE);
			this.revertDragOrFailedPurchase(payload.dragStartX, payload.dragStartY);
		}
	}






	// --- UI Update Methods ---

	/** Accessor for the input handler to know if this is a shop item. */
	getIsShopItem(): boolean {
		return this.isShopItem;
	}

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
	setBarsVisibility(visible: boolean): void {
		this.barsDisplay.setVisible(visible);
	}

	/** Updates the charge bar and other debug bars via the `barsDisplay` component. */
	updateChargeBar = () => {
		this.barsDisplay.updateBars();
	}

	// --- Unit Action and State Methods ---

	/**
	 * Applies damage to the Chara's unit. Updates HP display, shows damage pop-up text,
	 * handles critical hit display, checks for death, and triggers 'onHalfHP' events.
	 * @param sourceId The id of the character that inflicted the damage
	 * @param damage The amount of damage to apply.
	 * @param isCritical Whether the damage is a critical hit.
	 */
	damageUnit = (sourceId: string, damage: number, isCritical = false) => {
		const chara = this;
		const nextHp = chara.unit.hp - damage;
		const hasDied = nextHp <= 0;

		chara.unit.hp = nextHp <= 0 ? 0 : nextHp;
		this.updateHpDisplay();

		if (isCritical) {
			criticalDamageDisplay(this.scene, this, Math.floor(damage));
		} else {
			this.showPopText(Math.floor(damage).toFixed(0).toString(), "damage");
		}

		if (hasDied) {
			this.killUnit(sourceId);
			return;
		}

	}

	/**
	 * Handles the death of the unit. Sets HP to 0, plays death animation,
	 * removes the Chara from the game state and manager, and triggers 'onDeath' events.
	 */
	killUnit = (killerId: string) => { // No longer async

		this.unit.hp = 0;
		this.updateHpDisplay(); // Update display to show 0 HP immediately

		this.scene.events.emit(GameEvents.CHARA_FATALLY_WOUNDED, { chara: this, killerId });

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

		await this.showPopText(text);
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

	/**
	 * Displays pop-up text originating from this Chara's position.
	 * @param text The text to display.
	 * @param type Optional type for styling (e.g., "heal", "damage").
	 */
	async showPopText(text: string, type?: "heal" | "damage"): Promise<void> {
		await popText({ scene: this.scene, x: this.x, y: this.y, text, type });
	}

	/** Overridden destroy method to also clean up the input handler. */
	destroy(fromScene?: boolean) {
		if (this.inputHandler) {
			this.inputHandler.destroy();
		}
		// Remove event listeners this Chara instance might have set up on scene.events
		// For example, if Chara listens to SHOP_PURCHASE_FAILED, OWNED_UNIT_MOVE_ACCEPTED etc.
		// This is important to prevent memory leaks if Charas are frequently created/destroyed.
		this.off(Phaser.Input.Events.POINTER_OVER);
		this.off(Phaser.Input.Events.POINTER_OUT);

		if (this.isShopItem) { // Clean up shop-specific listeners
			this.scene.events.off(GameEvents.SHOP_PURCHASE_SUCCESSFUL, this._onShopPurchaseSuccessful, this);
			this.scene.events.off(GameEvents.SHOP_PURCHASE_FAILED, this._onShopPurchaseFailed, this);
		}
		// Clean up owned unit move listeners
		this.scene.events.off(GameEvents.OWNED_UNIT_MOVE_ACCEPTED, this._onOwnedUnitMoveAccepted, this);
		this.scene.events.off(GameEvents.OWNED_UNIT_SWAP_ACCEPTED, this._onOwnedUnitSwapAccepted, this);
		this.scene.events.off(GameEvents.OWNED_UNIT_MOVE_REJECTED, this._onOwnedUnitMoveRejected, this);
		this.scene.events.off(GameEvents.TRAIT_EVAL_UNIT_ACTION, this.onAction, this);

		super.destroy(fromScene);
	}

	onAction() {
		tween({
			targets: [this],
			scale: 1.1,
			yoyo: true,
			repeat: 0
		})
	}
}
