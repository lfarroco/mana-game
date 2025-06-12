import { State } from "../../../Models/State";
import { UIManager } from "../../../UI/UIManager";
import { PlayerBoard, createBoardDropZone } from "../../../Models/Board";
import { Shop } from "./Shop";
import { BattleProgressionSystem } from "./BattleProgressionSystem";
import { RunCombatSystem } from "../RunCombatIO";
import { Unit } from "../../../Models/Entities/Unit";
import * as CharaManager from "./CharaManager";
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

export class BattlegroundEventSystem {
	private scene: BattlegroundScene;
	private state: State;
	private uiManager: UIManager;
	private playerBoard: PlayerBoard;
	private shop: Shop;
	private battleProgressionSystem: BattleProgressionSystem;
	private runCombatSystem: RunCombatSystem;

	constructor(
		scene: BattlegroundScene,
		state: State,
		uiManager: UIManager,
		playerBoard: PlayerBoard,
		shop: Shop,
		battleProgressionSystem: BattleProgressionSystem,
		runCombatSystem: RunCombatSystem
	) {
		this.scene = scene;
		this.state = state;
		this.uiManager = uiManager;
		this.playerBoard = playerBoard;
		this.shop = shop;
		this.battleProgressionSystem = battleProgressionSystem;
		this.runCombatSystem = runCombatSystem;
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
}