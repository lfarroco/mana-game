import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { eqVec2, Vec2, vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../constants/constants";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board"; // getState is used here
import { addStatus, getState, } from "../../Models/State";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { images } from "../../assets";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { updatePlayerGoldIO } from "../../Models/Entities/Force";
import { CharaStatsDisplay } from "./CharaStatsDisplay";
import { CharaBarsDisplay } from "./CharaBarsDisplay";
import { GameEvents } from "../../constants/events";
import { CharaInputHandler } from "./CharaInputHandler"; // +++ NEW IMPORT

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

		// Setup input handling
		this.inputHandler = new CharaInputHandler(this);

		this.statsDisplay.updateHp();
		this.statsDisplay.updateAtk();
		this.barsDisplay.updateBars();
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
			this.parent.events.emit(GameEvents.PURCHASE_FAILED, {
				unitName: this.unit.name,
				reason: "PARTY_FULL"
			});
			return false;
		}
		if (state.gameData.player.gold < purchaseCost) {
			this.parent.events.emit(GameEvents.PURCHASE_FAILED, {
				unitName: this.unit.name,
				reason: "INSUFFICIENT_GOLD", cost: purchaseCost
			});
			return false;
		}

		if (targetBoardPos) {
			const occupierOnBoard = state.gameData.player.units.find(u => eqVec2(u.position, targetBoardPos));
			if (occupierOnBoard) {
				this.parent.events.emit(GameEvents.PURCHASE_FAILED, {
					unitName: this.unit.name,
					reason: "SLOT_OCCUPIED"
				});
				return false;
			}
			this.unit.position = targetBoardPos;
		} else { // Purchasing by click, find an empty slot
			const emptySlot = this.parent.playerBoard?.getEmptySlot(state.gameData.player.units, FORCE_ID_PLAYER); // TODO: Ensure this finds a slot on the *player's* board specifically if not already guaranteed
			if (!emptySlot) {
				this.parent.events.emit(GameEvents.PURCHASE_FAILED, {
					unitName: this.unit.name,
					reason: "NO_EMPTY_SLOT"
				});
				return false;
			}
			this.unit.position = emptySlot;
		}

		updatePlayerGoldIO(this.parent, -purchaseCost);
		state.gameData.player.units.push(this.unit);
		this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, { unit: this.unit });

		// Transition from shop item to owned item
		this.isShopItem = false;
		this.inputHandler.updateShopItemStatus(false); // Notify handler

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

	// --- Methods called by CharaInputHandler ---
	public processShopItemClick(): boolean {
		if (this.attemptPurchase()) {
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			return true;
		}
		return false;
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
	private _revertShopItemToPosition(x: number, y: number) {
		tween({ targets: [this], x, y });
	}

	/**
	 * Handles the logic when an already owned unit is dropped onto the player's board.
	 * This can result in moving the unit to an empty tile or swapping it with an existing unit.
	 * @param tile The board tile (Vec2) where the unit was dropped, or null if not on a specific tile.
	 */
	private _handleDropOwnedUnit(tile: Vec2): boolean {
		const unitToMove = this.unit;
		const state = getState();

		const newBoardModelPosition = vec2(tile.x, tile.y);
		// Trigger 'onLeavePosition' for the unit being moved *before* its position is updated in the model.
		this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_LEAVE_POSITION, { unit: unitToMove });

		const occupierUnitIfAny = state.gameData.player.units.find(
			u => u.id !== unitToMove.id && eqVec2(u.position, newBoardModelPosition)
		);
		// If there's an occupier, trigger its 'onLeavePosition' before it's potentially moved.
		if (occupierUnitIfAny) {
			this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_LEAVE_POSITION, { unit: occupierUnitIfAny });
		}

		const moveResult = Board.PlayerBoard.updateUnitPosition(
			unitToMove,
			newBoardModelPosition,
			state.gameData.player.units
		);

		if (moveResult) {
			// Trigger 'onEnterPosition' for the moved unit at its new position.
			this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, { unit: unitToMove });
			tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) });

			if (moveResult.swappedUnit) {
				this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, { unit: moveResult.swappedUnit });
				const occupierChara = UnitManager.getChara(moveResult.swappedUnit.id);
				tween({ targets: [occupierChara], ...UnitManager.getCharaPosition(moveResult.swappedUnit) });
			}
			return true;
		} else {
			// Re-trigger for the original spot if move failed but unit didn't change tile
			this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, { unit: unitToMove });
			if (occupierUnitIfAny) {
				this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_ENTER_POSITION, { unit: occupierUnitIfAny });
			}
			tween({ targets: [this], ...UnitManager.getCharaPosition(unitToMove) }); // Revert to current model position
			// If dropped on the same spot, it's a "successful" drag in terms of completing the action.
			if (eqVec2(unitToMove.position, newBoardModelPosition)) {
				return true;
			} else {
				return false; // Move failed for other reasons
			}
		}
	}

	/**
	 * Handles the logic when a shop item is dropped onto the player's board.
	 * This attempts to purchase and place the unit.
	 * @param tile The board tile (Vec2) where the item was dropped, or null if not on a specific tile.
	 */
	private _handleDropShopItem(tile: Vec2): boolean {
		const newBoardModelPosition = vec2(tile.x, tile.y);
		if (this.attemptPurchase(newBoardModelPosition)) {
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
			return true;
		} else {
			// Purchase failed (e.g., not enough gold, slot occupied); error handled by attemptPurchase. Revert visual.
			// Reversion will be handled by revertDragOrFailedPurchase using dragStartX/Y from handler
			return false;
		}
	}

	/**
	 * Processes a drop action onto a game object, typically a board tile zone.
	 * Determines if the Chara is an owned unit or a shop item and delegates to the appropriate handler.
	 * @param dropZoneTarget The GameObject that is the drop zone.
	 * @returns `true` if the drop was successful, `false` otherwise.
	 */
	public processDrop(dropZoneTarget: Phaser.GameObjects.GameObject): boolean {
		if (!Board.PlayerBoard.isTileZone(dropZoneTarget)) {
			// Dropped outside a valid player board tile zone.
			return false;
		}

		const tile = Board.PlayerBoard.getTileFromZone(dropZoneTarget);
		if (!tile) {
			console.warn("Chara.handleDrop: Dropped on a board tile zone, but could not derive tile coordinates.", dropZoneTarget.name);
			return false;
		}

		if (this.isOwnedByPlayer()) {
			return this._handleDropOwnedUnit(tile);
		} else { // Assumed to be a shop item
			return this._handleDropShopItem(tile);
		}
	}

	/**
	 * Reverts the Chara's visual position after an unsuccessful drag or failed purchase.
	 * @param originalX The X position to revert to.
	 * @param originalY The Y position to revert to.
	 */
	public revertDragOrFailedPurchase(originalX: number, originalY: number): void {
		if (this.isShopItem && !this.isOwnedByPlayer()) {
			this._revertShopItemToPosition(originalX, originalY);
		} else { // Owned unit, or a shop item that failed purchase but its state might be complex
			tween({ targets: [this], ...UnitManager.getCharaPosition(this.unit) });
		}
	};

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

	/**
	 * Sets up tooltip display for this Chara on pointer hover.
	 */
	addTooltip = () => {
		this.on('pointerover', () => {
			const text = [
				`Attack: ${this.unit.attackPower} HP: ${this.unit.hp}`,
				this.unit.traits.map((trait) => trait.description).join("\n"),
			].join('\n');

			this.parent.events.emit(GameEvents.TOOLTIP_SHOW, {
				x: this.x + 340, // TODO: Adjust tooltip position based on Chara's screen position/side
				y: this.y,
				title: this.unit.name,
				description: text
			});
		});

		this.on('pointerout', () => {
			this.parent.events.emit(GameEvents.TOOLTIP_HIDE);
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

		if (nextHp <= chara.unit.maxHp / 2 && !chara.unit.statuses["on-half-hp"]) {
			addStatus(chara.unit, "on-half-hp");
			this.parent.events.emit(GameEvents.TRAIT_EVAL_UNIT_HALF_HP, { unit: chara.unit });

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

	/** Overridden destroy method to also clean up the input handler. */
	destroy(fromScene?: boolean) {
		if (this.inputHandler) {
			this.inputHandler.destroy();
		}
		super.destroy(fromScene);
	}
}
