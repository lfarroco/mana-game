import { State } from "../../../Models/State";
import { UIManager } from "../../../UI/UIManager";
import { PlayerBoard, createBoardDropZone } from "../../../Models/Board";
import { Shop } from "./Shop";
import { BattleProgressionSystem } from "./BattleProgressionSystem";
import { RunCombatSystem } from "../RunCombatIO";
import { Unit, makeUnit } from "../../../Models/Entities/Unit";
import * as CharaManager from "./CharaManager"; // Keep CharaManager import
import * as Relic from "./Relic";
import { popText } from "../../../Systems/Chara/Animations/popText";
import { battleResultAnimation } from "../battleResultAnimation";
import { vignette } from "../Animations/vignette";
import { GameEvents } from "../../../constants/events";
import { BattlegroundScene } from "../BattlegroundScene";
import { UIButton } from "../../../UI/UIButton";
import * as constants from "../../../constants/constants";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { handleCharaDeath } from "../../../Systems/Chara/CharaDeathSequenceHandler";
import { Chara } from "../../../Systems/Chara/Chara";
import * as CharaTooltip from "../../../Systems/Chara/CharaTooltip";
import { FORCE_ID_PLAYER, MAX_PARTY_SIZE, SHOP_ITEM_PURCHASE_COST } from "../../../constants/constants";
import { getUnitAt } from "../../../Models/State";
import { Vec2 } from "../../../Models/Geometry";

/**
 * @class BattlegroundEventSystem
 * @description
 * Manages and centralizes the handling of game-specific events within the BattlegroundScene.
 *
 * **Goal:**
 * To act as the primary dispatcher for `GameEvents`, ensuring that different game systems
 * and UI components react appropriately to in-game occurrences, thereby decoupling event
 * emitters from direct knowledge of event consumers.
 *
 * **Purpose:**
 * - Subscribes to a wide array of `GameEvents` (e.g., unit death, phase transitions, UI updates, player actions).
 * - Delegates event handling to appropriate systems (`BattleProgressionSystem`, `CharaManager`, `UIManager`, `Shop`, etc.) or handles them directly.
 * - Manages the lifecycle of its event listeners, registering them on creation and unregistering them on destruction.
 */
export class BattlegroundEventSystem {
	private scene: BattlegroundScene;
	private state: State;
	private uiManager: UIManager;
	private playerBoard: PlayerBoard;
	private shop: Shop;
	private battleProgressionSystem: BattleProgressionSystem;
	private runCombatSystem: RunCombatSystem;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.state = scene.state;
		this.uiManager = scene.uiManager;
		this.playerBoard = scene.playerBoard;
		this.shop = scene.shop;
		this.battleProgressionSystem = scene.battleProgressionSystem;
		this.runCombatSystem = scene.runCombatSystem;
	}

	public registerEventHandlers(): void {
		const events = this.scene.events;

		events.on(GameEvents.UNIT_DIED_IN_BATTLE, this._onUnitDiedInBattle, this);
		events.on(GameEvents.SHOP_PHASE_ENDED, this._onShopPhaseEnded, this);
		events.on(GameEvents.COMBAT_ENDED_VICTORY, this._onCombatEndedVictory, this);
		events.on(GameEvents.COMBAT_ENDED_DEFEAT, this._onCombatEndedDefeat, this);
		events.on(GameEvents.GAME_OVER_SHOW_UI_TRIGGER, this._onGameOverShowUITrigger, this);

		events.on(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, this._onPlayerGoldUpdateRequest, this);
		events.on(GameEvents.PLAYER_BOARD_CREATE_DROP_ZONE, this._onPlayerBoardCreateDropZone, this);
		events.on(GameEvents.PLAYER_BOARD_SHOW, this._onPlayerBoardShow, this);
		events.on(GameEvents.PLAYER_BOARD_HIDE, this._onPlayerBoardHide, this);
		events.on(GameEvents.UI_MAIN_CREATE, this._onUIMainCreate, this);
		events.on(GameEvents.RELIC_SLOTS_SETUP, this._onRelicSlotsSetup, this);
		events.on(GameEvents.CHARA_SUMMON_TO_BOARD, this._onCharaSummonToBoard, this);
		events.on(GameEvents.CHARA_DESTROY_FROM_BOARD, this._onCharaDestroyFromBoard, this);
		events.on(GameEvents.POP_TEXT_SHOW, this._onPopTextShow, this);
		events.on(GameEvents.CHARA_HP_DISPLAY_UPDATE, this._onCharaHpDisplayUpdate, this);
		events.on(GameEvents.CHARA_CHARGE_BAR_UPDATE, this._onCharaChargeBarUpdate, this);
		events.on(GameEvents.CHARA_BARS_VISIBILITY_SET, this._onCharaBarsVisibilitySet, this);
		events.on(GameEvents.BATTLE_RESULT_SHOW, this._onBattleResultShow, this);
		events.on(GameEvents.VIGNETTE_MESSAGE_SHOW, this._onVignetteMessageShow, this);
		events.on(GameEvents.SHOP_OPEN_UI_TRIGGER, this._onShopOpenUITrigger, this);
		events.on(GameEvents.COMBAT_START_EXECUTION_TRIGGER, this._onCombatStartExecutionTrigger, this);
		events.on(GameEvents.CHARA_FATALLY_WOUNDED, this._onCharaFatallyWounded, this);
		events.on(GameEvents.CHARA_POINTER_OVER, CharaTooltip.onCharaPointerOver, this);
		events.on(GameEvents.CHARA_POINTER_OUT, CharaTooltip.onCharaPointerOut, this);

		// Shop Purchase Request Handlers
		events.on(GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED, this._onShopItemClickPurchaseRequested, this);
		events.on(GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED, this._onShopItemDragPurchaseRequested, this);
		events.on(GameEvents.OWNED_UNIT_MOVE_REQUESTED, this._onOwnedUnitMoveRequested, this);
		events.on(GameEvents.BOARD_CHARA_CREATE_REQUESTED, this._onBoardCharaCreateRequested, this);
	}

	public destroy(): void {
		const events = this.scene.events;
		// Remove all listeners this system added
		Object.values(GameEvents).forEach(eventKey => {
			events.off(eventKey, undefined, this);
		});
	}

	private _onPlayerGoldUpdateRequest(goldDelta: number): void {
		const changeAmount = Math.floor(goldDelta);
		this.state.gameData.player.gold += changeAmount;
		this.scene.events.emit(GameEvents.GOLD_CHANGED, this.state.gameData.player.gold, changeAmount);
	}

	private _onPlayerBoardCreateDropZone(): void { createBoardDropZone(); }
	private _onPlayerBoardShow(): void { this.playerBoard.display(); }
	private _onPlayerBoardHide(): void { this.playerBoard.hide(); }
	private _onUIMainCreate(): void { this.uiManager.createMainUI(); }
	private _onRelicSlotsSetup(): void { Relic.setupRelicSlots(this.scene); }

	private _onCharaSummonToBoard(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void {
		CharaManager.summonChara(payload.unit, payload.animateAppear, payload.playSound);
	}

	private _onCharaDestroyFromBoard(payload: { unitId: string }): void {
		CharaManager.destroyChara(payload.unitId);
	}

	private _onPopTextShow(payload: { text: string, targetId: string, color?: string }): void {
		popText(payload);
	}

	private _onCharaHpDisplayUpdate(payload: { unitId: string }): void {
		CharaManager.getChara(payload.unitId)?.updateHpDisplay();
	}

	private _onCharaChargeBarUpdate(payload: { unitId: string }): void {
		CharaManager.getChara(payload.unitId)?.updateChargeBar();
	}

	private _onCharaBarsVisibilitySet(payload: { unitId: string, visible: boolean }): void {
		CharaManager.getChara(payload.unitId)?.setBarsVisibility(payload.visible);
	}

	private async _onBattleResultShow(payload: { result: "victory" | "defeat" }): Promise<void> {
		await battleResultAnimation(this.scene, payload.result);
	}

	private _onVignetteMessageShow(payload: { message: string }): void {
		vignette(this.scene, payload.message);
	}

	private _onUnitDiedInBattle(payload: { unit: Unit, killerId?: string }): void {
		this.state.battleData.units = this.state.battleData.units.filter(u => u.id !== payload.unit.id);
		this.scene.events.emit(GameEvents.CHARA_DESTROY_FROM_BOARD, { unitId: payload.unit.id });
	}

	private async _onShopOpenUITrigger(): Promise<void> {
		if (this.shop) {
			await this.shop.open();
		} else {
			console.error("Shop not initialized when trying to open UI.");
		}
	}

	private _onShopPhaseEnded(): void {
		this.battleProgressionSystem.transitionToCombatPhase();
	}

	private _onCombatEndedVictory(payload: { enemiesDefeated: Unit[] }): void {
		this.battleProgressionSystem.transitionToShopPhase(payload);
	}

	private _onCombatEndedDefeat(): void {
		this.battleProgressionSystem.processGameOver();
	}

	private async _onCombatStartExecutionTrigger(payload: { enemies: Unit[] }): Promise<void> {
		const combatResult = await this.runCombatSystem.runCombatIO();
		if (combatResult === "player_won") {
			this.scene.events.emit(GameEvents.COMBAT_ENDED_VICTORY, { enemiesDefeated: payload.enemies });
		} else {
			this.scene.events.emit(GameEvents.COMBAT_ENDED_DEFEAT, {});
		}
	}

	private _onGameOverShowUITrigger(): void {
		new UIButton(this.scene, "new run",
			constants.SCREEN_WIDTH / 2 + BG_CONSTANTS.UI_BUTTON_RESTART_X_OFFSET,
			constants.SCREEN_HEIGHT / 2 + BG_CONSTANTS.UI_BUTTON_RESTART_Y_OFFSET, () => {
				this.scene.scene.restart();
			});
		new UIButton(this.scene, "return to menu",
			constants.SCREEN_WIDTH / 2 + BG_CONSTANTS.UI_BUTTON_MENU_X_OFFSET,
			constants.SCREEN_HEIGHT / 2 + BG_CONSTANTS.UI_BUTTON_MENU_Y_OFFSET, () => {
				this.scene.scene.start("MainMenuScene");
			});
	}

	private async _onCharaFatallyWounded(data: { chara: Chara, killerId: string }): Promise<void> {
		await handleCharaDeath(this.scene, data);
	}

	private _onShopItemClickPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, dragStartX: number, dragStartY: number }): void {
		const { shopUnitData, shopCharaId, dragStartX, dragStartY } = payload;

		if (this.state.gameData.player.gold < SHOP_ITEM_PURCHASE_COST) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "INSUFFICIENT_GOLD", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "INSUFFICIENT_GOLD", cost: SHOP_ITEM_PURCHASE_COST });
			return;
		}
		if (this.state.gameData.player.units.length >= MAX_PARTY_SIZE) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "PARTY_FULL", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "PARTY_FULL" });
			return;
		}

		const targetTile = this.playerBoard.getEmptySlot(this.state.gameData.player.units, FORCE_ID_PLAYER);
		if (!targetTile) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "NO_EMPTY_SLOT", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "NO_EMPTY_SLOT" });
			return;
		}

		// Proceed with purchase
		this.scene.events.emit(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, -SHOP_ITEM_PURCHASE_COST);

		const newUnit = makeUnit(FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
		this.state.gameData.player.units.push(newUnit);

		this.scene.events.emit(GameEvents.BOARD_CHARA_CREATE_REQUESTED, { unit: newUnit });
		this.scene.events.emit(GameEvents.SHOP_PURCHASE_SUCCESSFUL, { purchasedUnit: newUnit, originalShopCharaId: shopCharaId });
	}

	private _onShopItemDragPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
		const { shopUnitData, shopCharaId, targetTile, dragStartX, dragStartY } = payload;

		if (this.state.gameData.player.gold < SHOP_ITEM_PURCHASE_COST) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "INSUFFICIENT_GOLD", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "INSUFFICIENT_GOLD", cost: SHOP_ITEM_PURCHASE_COST });
			return;
		}
		if (this.state.gameData.player.units.length >= MAX_PARTY_SIZE) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "PARTY_FULL", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "PARTY_FULL" });
			return;
		}

		const occupier = getUnitAt(this.state.gameData.player.units)(targetTile);
		if (occupier) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "SLOT_OCCUPIED", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "SLOT_OCCUPIED" });
			return;
		}

		// Proceed with purchase
		this.scene.events.emit(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, -SHOP_ITEM_PURCHASE_COST);

		const newUnit = makeUnit(FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
		this.state.gameData.player.units.push(newUnit);

		this.scene.events.emit(GameEvents.BOARD_CHARA_CREATE_REQUESTED, { unit: newUnit });
		this.scene.events.emit(GameEvents.SHOP_PURCHASE_SUCCESSFUL, { purchasedUnit: newUnit, originalShopCharaId: shopCharaId });
	}

	private _onBoardCharaCreateRequested(payload: { unit: Unit }): void {
		// When a new Chara is requested for the board (e.g., after a purchase),
		// tell CharaManager to summon it. Default to animating its appearance.
		CharaManager.summonChara(payload.unit, true, true); // summonChara is async, but we don't need to await its completion for this logic
		if (this.battleProgressionSystem.isInShopPhase && payload.unit.force === constants.FORCE_ID_PLAYER) {
			// Ensure the newly summoned player unit also has its bars hidden during shop phase
			this.scene.events.emit(GameEvents.CHARA_BARS_VISIBILITY_SET, { unitId: payload.unit.id, visible: false });
		}
	}

	private _onOwnedUnitMoveRequested(payload: { unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
		const { unitId, targetTile, dragStartX, dragStartY } = payload;
		const unitToMove = this.state.gameData.player.units.find(u => u.id === unitId);

		if (!unitToMove) {
			console.error(`[BattlegroundEventSystem] Unit with ID ${unitId} not found for move request.`);
			this.scene.events.emit(GameEvents.OWNED_UNIT_MOVE_REJECTED, { unitId, reason: "UNIT_NOT_FOUND", dragStartX, dragStartY });
			return;
		}

		const moveResult = PlayerBoard.updateUnitPosition(unitToMove, targetTile, this.state.gameData.player.units);

		if (!moveResult) {
			// No change in position, or invalid move (e.g., trying to move to the same spot without a swap)
			this.scene.events.emit(GameEvents.OWNED_UNIT_MOVE_REJECTED, { unitId, reason: "NO_CHANGE_OR_INVALID", dragStartX, dragStartY });
			return;
		}

		// Successfully moved or swapped
		const movedUnitVisualPosition = CharaManager.getCharaPosition(moveResult.movedUnit);

		if (moveResult.swappedUnit) {
			const swappedUnitVisualPosition = CharaManager.getCharaPosition(moveResult.swappedUnit);
			this.scene.events.emit(GameEvents.OWNED_UNIT_SWAP_ACCEPTED, {
				movedUnitId: moveResult.movedUnit.id,
				movedUnitNewLogicalPosition: moveResult.movedUnit.position,
				movedUnitVisualPosition: { x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y },
				swappedUnitId: moveResult.swappedUnit.id,
				swappedUnitNewLogicalPosition: moveResult.swappedUnit.position,
				swappedUnitVisualPosition: { x: swappedUnitVisualPosition.x, y: swappedUnitVisualPosition.y },
			});
		} else {
			this.scene.events.emit(GameEvents.OWNED_UNIT_MOVE_ACCEPTED, {
				unitId: moveResult.movedUnit.id,
				newLogicalPosition: moveResult.movedUnit.position,
				newVisualPosition: { x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y },
			});
		}
	}




}