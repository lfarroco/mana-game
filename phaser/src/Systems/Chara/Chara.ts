import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { Vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board"; // getState is used here
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { images } from "../../assets";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { CharaStatsDisplay } from "./CharaStatsDisplay";
import { CharaBarsDisplay } from "./CharaBarsDisplay";
import { GameEvents } from "../../constants/events";
import { CharaInputHandler } from "./CharaInputHandler"; // +++ NEW IMPORT

export type CharaOptions = {
	isShopItem?: boolean;
	onPurchased?: () => void;
};

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

	/** Handles all input interactions for this Chara. */
	private inputHandler!: CharaInputHandler; // +++ NEW PROPERTY
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
	constructor(public parent: BattlegroundScene, unit: Unit, options?: CharaOptions) {
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

		// Setup input handling
		this.inputHandler = new CharaInputHandler(this);

		// Emit events for tooltip handling by BattlegroundEventSystem
		this.on(Phaser.Input.Events.POINTER_OVER, () => {
			this.parent.events.emit(GameEvents.CHARA_POINTER_OVER, { chara: this });
		});
		this.on(Phaser.Input.Events.POINTER_OUT, () => {
			this.parent.events.emit(GameEvents.CHARA_POINTER_OUT, { chara: this });
		});

		this.statsDisplay.updateHp();
		this.statsDisplay.updateAtk();
		this.barsDisplay.updateBars();

		if (this.isShopItem) {
			this.parent.events.on(GameEvents.SHOP_PURCHASE_SUCCESSFUL, this._onShopPurchaseSuccessful, this);
			this.parent.events.on(GameEvents.SHOP_PURCHASE_FAILED, this._onShopPurchaseFailed, this);
		}
		// Listen for move/swap outcomes if it's an owned unit (or becomes one)
		// These listeners are safe even if the Chara starts as a shop item,
		// as they'll only react if the IDs match after it's owned.
		this.parent.events.on(GameEvents.OWNED_UNIT_MOVE_ACCEPTED, this._onOwnedUnitMoveAccepted, this);
		this.parent.events.on(GameEvents.OWNED_UNIT_SWAP_ACCEPTED, this._onOwnedUnitSwapAccepted, this);
		this.parent.events.on(GameEvents.OWNED_UNIT_MOVE_REJECTED, this._onOwnedUnitMoveRejected, this);
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

	/**
	 * Called by CharaInputHandler when a shop item is clicked.
	 * Emits an event to request a purchase attempt.
	 * @param dragStartX The X coordinate where the potential drag started (or click position).
	 * @param dragStartY The Y coordinate where the potential drag started (or click position).
	 *                   For click purchases, these parameters from CharaInputHandler are the click coordinates.
	 *                   However, for the purpose of reverting a failed purchase, we need the Chara's
	 *                   actual current position (its shop slot position).
	 */
	public processShopItemClick(_clickX: number, _clickY: number): void {
		// For a click purchase, targetBoardPos is undefined; the ShopSystem will find an empty slot.
		// We pass a copy of unit data as the shop Chara's unit shouldn't be mutated directly
		// until purchase is confirmed and a new unit is officially created.
		// The dragStartX/Y here MUST be the Chara's current position in the shop,
		// so it can revert correctly if the purchase fails.
		// _clickX and _clickY (the actual pointer coordinates) are not used for the revert logic.
		this.parent.events.emit(GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED, { shopUnitData: { ...this.unit }, shopCharaId: this.id, dragStartX: this.x, dragStartY: this.y });
	}

	/**
	 * Helper to visually revert a shop item Chara to its original drag start position (its shop slot).
	 */
	private _revertShopItemToPosition(x: number, y: number) {
		tween({ targets: [this], x, y });
	}

	/**
	 * Handles the logic when an already owned unit is dropped onto the player's board.
	 * This can result in moving the unit to an empty tile or swapping it with an existing unit.
	 * @param tile The board tile (Vec2) where the unit was dropped, or null if not on a specific tile.
	 * @param dragStartX The X coordinate where the drag started.
	 * @param dragStartY The Y coordinate where the drag started.
	 */
	private _handleDropOwnedUnit(tile: Vec2, dragStartX: number, dragStartY: number): void {
		this.parent.events.emit(GameEvents.OWNED_UNIT_MOVE_REQUESTED, {
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
	private _handleDropShopItem(tile: Vec2, dragStartX: number, dragStartY: number): void {
		// We pass a copy of unit data as the shop Chara's unit shouldn't be mutated directly
		// until purchase is confirmed and a new unit is officially created.
		this.parent.events.emit(GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED, {
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
	public processDrop(dropZoneTarget: Phaser.GameObjects.GameObject, dragStartX: number, dragStartY: number): boolean {
		if (!Board.PlayerBoard.isTileZone(dropZoneTarget)) {
			// Dropped outside a valid player board tile zone.
			return false;
		}

		const tile = Board.PlayerBoard.getTileFromZone(dropZoneTarget);
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

	/**
	 * Reverts the Chara's visual position after an unsuccessful drag or failed purchase.
	 * @param originalX The X position to revert to.
	 * @param originalY The Y position to revert to.
	 */
	public revertDragOrFailedPurchase(revertToX: number, revertToY: number): void {
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
	public finalizePurchase(): void {
		this.isShopItem = false; // No longer a shop item
		if (this.onPurchasedCallback) this.onPurchasedCallback();
	};

	private _onShopPurchaseSuccessful(payload: { purchasedUnit: Unit, originalShopCharaId: string }): void {
		if (this.isShopItem && payload.originalShopCharaId === this.id) {
			this.finalizePurchase(); // This calls the onPurchasedCallback which should handle removal from flyout
			// The CharaManager is responsible for the actual destruction and removal from its index.
			UnitManager.destroyChara(this.id);
		}
	}

	private _onShopPurchaseFailed(payload: { originalShopCharaId: string, reason: string, dragStartX: number, dragStartY: number }): void {
		if (this.isShopItem && payload.originalShopCharaId === this.id) {
			// Ensure tooltip is hidden before reverting, as pointer might not naturally move out
			this.parent.events.emit(GameEvents.TOOLTIP_HIDE);
			this.revertDragOrFailedPurchase(payload.dragStartX, payload.dragStartY);
			// Optionally, re-enable input if it was disabled during purchase attempt, though current logic doesn't show it being disabled.
			// this.input.enabled = true;
		}
	}

	private _onOwnedUnitMoveAccepted(payload: { unitId: string, newVisualPosition: { x: number, y: number } }): void {
		if (!this.isShopItem && payload.unitId === this.id) {
			tween({ targets: [this], x: payload.newVisualPosition.x, y: payload.newVisualPosition.y, duration: 150 });
		}
	}

	private _onOwnedUnitSwapAccepted(payload: { movedUnitId: string, movedUnitVisualPosition: { x: number, y: number }, swappedUnitId: string, swappedUnitVisualPosition: { x: number, y: number } }): void {
		if (!this.isShopItem) {
			if (payload.movedUnitId === this.id) {
				tween({ targets: [this], x: payload.movedUnitVisualPosition.x, y: payload.movedUnitVisualPosition.y, duration: 150 });
			} else if (payload.swappedUnitId === this.id) {
				tween({ targets: [this], x: payload.swappedUnitVisualPosition.x, y: payload.swappedUnitVisualPosition.y, duration: 150 });
			}
		}
	}

	private _onOwnedUnitMoveRejected(payload: { unitId: string, dragStartX: number, dragStartY: number }): void {
		if (!this.isShopItem && payload.unitId === this.id) {
			// Ensure tooltip is hidden before reverting, as pointer might not naturally move out
			this.parent.events.emit(GameEvents.TOOLTIP_HIDE);
			this.revertDragOrFailedPurchase(payload.dragStartX, payload.dragStartY);
		}
	}






	// --- UI Update Methods ---

	/** Accessor for the input handler to know if this is a shop item. */
	public getIsShopItem(): boolean {
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
	public setBarsVisibility(visible: boolean): void {
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
			criticalDamageDisplay(this.parent, this, Math.floor(damage));
		} else {
			popText({ text: Math.floor(damage).toFixed(0).toString(), targetId: chara.id, type: "damage" });
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

		// Announce that this Chara has been fatally wounded.
		// A separate handler (CharaDeathSequenceHandler) will manage the death sequence (animations, further events).
		this.parent.events.emit(GameEvents.CHARA_FATALLY_WOUNDED, { chara: this, killerId });

		// Note: The actual destruction of this Chara GameObject and its removal from managers
		// should ideally occur after animations, triggered by an event like GameEvents.UNIT_DIED_IN_BATTLE
		// (which is now emitted by CharaDeathSequenceHandler).
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

		await popText({ text, targetId: unit.id, });
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
			this.parent.events.off(GameEvents.SHOP_PURCHASE_SUCCESSFUL, this._onShopPurchaseSuccessful, this);
			this.parent.events.off(GameEvents.SHOP_PURCHASE_FAILED, this._onShopPurchaseFailed, this);
		}
		// Clean up owned unit move listeners
		this.parent.events.off(GameEvents.OWNED_UNIT_MOVE_ACCEPTED, this._onOwnedUnitMoveAccepted, this);
		this.parent.events.off(GameEvents.OWNED_UNIT_SWAP_ACCEPTED, this._onOwnedUnitSwapAccepted, this);
		this.parent.events.off(GameEvents.OWNED_UNIT_MOVE_REJECTED, this._onOwnedUnitMoveRejected, this);

		super.destroy(fromScene);
	}
}
