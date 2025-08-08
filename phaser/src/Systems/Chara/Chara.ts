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
import { GameEvents } from "../../constants/events";
import { CharaInputHandler } from "./CharaInputHandler";
import { Shop } from "../../Scenes/Battleground/Systems/Shop/Shop";
import { createContinuousHasteEffect } from "../../Effects/hasteEffect";
import { AudioSystem } from "../AudioSystem/AudioSystem";

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

	/** Used to check if there is an ongoing tween involving this chara */
	isAnimating: boolean;

	/** The main visual image/sprite for the character. */
	sprite!: Phaser.GameObjects.Sprite;
	/** The border graphics object for the sprite. */
	spriteBorder?: Phaser.GameObjects.Graphics;
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

	// Status effect visual tracking
	/** Active haste effect particles and cleanup function */
	private hasteEffect?: { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void };
	/** Previous haste state for change detection */
	private previousHasteState: number = 0;

	playerBoard: Board.PartyBoard;
	shop: Shop;

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
		// Flip horizontally if this Chara is on the CPU force
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

		// Setup input handling
		this.inputHandler = new CharaInputHandler(this);

		// Emit events for tooltip handling by BattlegroundEventSystem
		this.on(Phaser.Input.Events.POINTER_OVER, () => {
			this.scene.events.emit(GameEvents.CHARA_POINTER_OVER, { chara: this });
		});
		this.on(Phaser.Input.Events.POINTER_OUT, () => {
			this.scene.events.emit(GameEvents.CHARA_POINTER_OUT, { chara: this });
		});

		this.statsDisplay.updatePower();
		this.barsDisplay.updateBars();

		// Initialize status effects based on unit state
		this.updateStatusEffects();

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

		this.scene.events.on(GameEvents.TRAIT_EVAL_UNIT_ACTION, this.pop, this);
	}

	/**
	 * Reverts the Chara's visual position after an unsuccessful drag or failed purchase.
	 * @param originalX The X position to revert to.
	 * @param originalY The Y position to revert to.
	 */
	revertDragOrFailedPurchase(revertToX: number, revertToY: number): void {
		if (this.isShopItem) { // If it's still a shop item (purchase failed or invalid drop for shop item)
			tween({ targets: [this], x: revertToX, y: revertToY });
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

	/**
	 * Creates the main sprite for the Chara based on `unit.pic`.
	 * Uses a default "nameless" image if the specified picture key doesn't exist.
	 * Adds a circular border around the sprite.
	 * @param borderWidth The width of the border in pixels (default 3).
	 * @param borderColor The color of the border (default 0xffffff).
	 */
	createSprite(borderWidth: number = 3, borderColor: number = 0xffffff) {
		// If the andromeda atlas is loaded, use it and play idle animation if available
		// Try to get idle frames

		// Load and register animations from cache if not already present
		const animCacheKey = this.unit.pic + '-anims';
		const animData = this.scene.cache.json.get(animCacheKey);
		if (animData && animData.anims) {
			for (const anim of animData.anims) {
				const animKey = this.unit.pic + '_' + anim.key;
				if (!this.scene.anims.exists(animKey)) {
					// Clone and set the key to be unique per unit.pic
					const animConfig = {
						...anim,
						key: animKey,
						frames: (anim.frames as { frame: string }[]).map((f: { frame: string }) => ({ key: this.unit.pic, frame: f.frame })),
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


		// Add a circular border using Phaser.GameObjects.Graphics
		const radius = (constants.TILE_WIDTH * 0.8) / 2;
		const border = this.scene.add.graphics({ x: 0, y: 0 });
		border.lineStyle(borderWidth, borderColor, 1);
		border.strokeCircle(0, 0, radius);
		// Ensure border is above the sprite
		this.add(border);
		this.spriteBorder = border;

		this.sprite = this.scene.add.sprite(0, -15, this.unit.pic, firstIdle);
		this.sprite.setDisplaySize(constants.TILE_WIDTH * 1.2, constants.TILE_HEIGHT * 1.2);
		this.add(this.sprite);
		// Play idle animation if it exists
		if (this.scene.anims.exists(this.unit.pic + '_idle')) {
			this.sprite.play(this.unit.pic + '_idle');
		}
	}

	_onShopPurchaseSuccessful(payload: { purchasedUnit: Unit, originalShopCharaId: string }): void {
		if (this.isShopItem && payload.originalShopCharaId === this.id) {
			this.finalizePurchase(); // This calls the onPurchasedCallback which should handle removal from flyout

			// Play sound before destroying the character
			try {
				const audioSystem = AudioSystem.getInstance();
				audioSystem.playSoundEffect('sfx_artifact_equipweapon');
			} catch (error) {
				console.warn('Could not play equip weapon sound:', error);
			}

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

	/** Updates the unit reference and refreshes all display components */
	updateUnit(newUnit: Unit): void {
		this.unit = newUnit;
		this.statsDisplay.updateUnit(newUnit);
		this.barsDisplay.updateUnit(newUnit);
		this.updateStatusEffects();
	}

	/** Updates the displayed Attack Power value via the `statsDisplay` component, with animation. */
	updatePowerDisplay = () => {
		this.statsDisplay.animatePowerChange(this.unit.power);
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

	/**
	 * Displays pop-up text originating from this Chara's position.
	 * @param text The text to display.
	 * @param type Optional type for styling (e.g., "heal", "damage", "shield").
	 */
	async showPopText(text: string, type?: "heal" | "damage" | "shield"): Promise<void> {
		await popText({ scene: this.scene, x: this.x, y: this.y, text, type });
	}

	/** Overridden destroy method to also clean up the input handler. */
	destroy(fromScene?: boolean) {
		if (this.inputHandler) {
			this.inputHandler.destroy();
		}

		// Clean up status effects
		this.removeHasteEffect();

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
		this.scene.events.off(GameEvents.TRAIT_EVAL_UNIT_ACTION, this.pop, this);

		super.destroy(fromScene);
	}

	async pop(payload: { unit: Unit }) {
		if (payload.unit.id !== this.id) return;
		if (this.isAnimating) return;
		this.isAnimating = true;

		const attackAnimKey = `${this.unit.pic}_attack`;
		const idleAnimKey = `${this.unit.pic}_idle`;

		// Play the attack animation
		this.sprite.anims.play(attackAnimKey, true);

		this.sprite.playAfterRepeat(idleAnimKey)

		// Optional: scale pop effect (can be run in parallel or after anim)
		await tween({
			targets: [this],
			scale: 1.2,
			yoyo: true,
			duration: 300,
			repeat: 0,
		});

		this.isAnimating = false;
	}

	// --- Status Effects ---

	/**
	 * Updates the visual state of the Chara based on current status effects.
	 * This includes showing or hiding particles for effects like haste.
	 */
	updateStatusEffects(): void {
		// Haste effect: Shows particles when hasted > 0
		if (this.unit.hasted > 0 && this.previousHasteState === 0) {
			// Haste just got applied
			this.showHasteEffect();
		} else if (this.unit.hasted === 0 && this.previousHasteState > 0) {
			// Haste just wore off
			this.removeHasteEffect();
		}
		this.previousHasteState = this.unit.hasted;
	}

	/**
	 * Shows the visual effect for haste with light-blue droplets moving upward.
	 */
	private showHasteEffect(): void {
		if (this.hasteEffect) return; // Already have haste effect active

		// Create continuous haste effect centered on this chara
		this.hasteEffect = createContinuousHasteEffect(
			this.scene,
			{ x: this.x, y: this.y },
			{
				intensity: 1.0,
				color: 0x00eaff // Light blue color matching the charge bar
			}
		);

		// Add the particles to this container so they follow the chara
		this.add(this.hasteEffect.particles);

		// Reset position since it's now relative to the container
		this.hasteEffect.particles.setPosition(0, 0);
	}

	/**
	 * Removes the visual effect for haste.
	 */
	private removeHasteEffect(): void {
		if (!this.hasteEffect) return; // No haste effect to remove

		// Clean up the haste effect
		this.hasteEffect.cleanup();
		this.hasteEffect = undefined;
	}
}