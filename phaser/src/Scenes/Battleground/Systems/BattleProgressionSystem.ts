import { State } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
import { delay } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { GameEvents } from "../../../constants/events";

/**
 * Manages the overall progression of the battle, including transitions
 * between shop and combat phases, round victories, and game over.
 */
export class BattleProgressionSystem {
	private scene: BattlegroundScene;
	private state: State;

	constructor(scene: BattlegroundScene, state: State) {
		this.scene = scene;
		this.state = state;
	}

	/**
	 * Transitions the game to the shop phase.
	 * If called after a victory, processes round victory rewards first.
	 */
	public async transitionToShopPhase(payload?: { enemiesDefeated?: Unit[] }): Promise<void> {
		if (payload && payload.enemiesDefeated) {
			await this.processRoundVictory(payload.enemiesDefeated);
		}
		console.log("Round", this.state.gameData.round, "Shop Phase Starting.");
		this.scene.events.emit(GameEvents.PLAYER_BOARD_SHOW);
		this.scene.events.emit(GameEvents.SHOP_OPEN_UI_TRIGGER);
	}

	/**
	 * Transitions the game to the combat phase for the current round.
	 */
	public transitionToCombatPhase(): void {
		console.log("Round", this.state.gameData.round, "Combat Phase Starting.");
		const { enemies } = this.scene.setupBattle(); // setupBattle remains in Scene

		this.scene.events.emit(GameEvents.PLAYER_BOARD_HIDE);
		this.scene.events.emit(GameEvents.COMBAT_START_EXECUTION_TRIGGER, { enemies });
	}

	/**
	 * Processes the logic for a player's victory in a round.
	 */
	private async processRoundVictory(enemiesDefeated: Unit[]): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Victory...");
		await delay(this.scene, BG_CONSTANTS.POST_COMBAT_DELAY);
		this.scene.events.emit(GameEvents.BATTLE_RESULT_SHOW, { result: "victory" });
		await delay(this.scene, 1500); // Wait for animation

		this.scene.events.emit(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, BG_CONSTANTS.VICTORY_GOLD_REWARD);
		this.resetPlayerUnitsForNewRound();
		this.resetPlayerUnitChargeBars();
		this.setAllPlayerUnitBarsVisibility(false);
		await this.awardXPAndHandleLevelUps(enemiesDefeated.length);

		this.state.battleData.units = []; // Clear units from battle state
		this.state.gameData.round++;
	}

	/**
	 * Handles the game over sequence.
	 */
	public async processGameOver(): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Defeat...");
		await delay(this.scene, BG_CONSTANTS.POST_COMBAT_DELAY);
		this.scene.events.emit(GameEvents.BATTLE_RESULT_SHOW, { result: "defeat" });
		await delay(this.scene, 1500); // Wait for animation

		this.setAllPlayerUnitBarsVisibility(false); // Hide bars for player units
		this.state.battleData.units = []; // Clear units from battle state

		this.scene.events.emit(GameEvents.GAME_OVER_SHOW_UI_TRIGGER);
		this.scene.events.emit(GameEvents.VIGNETTE_MESSAGE_SHOW, { message: "Thanks for playing!" });
	}

	private resetPlayerUnitsForNewRound(): void {
		this.state.gameData.player.units.forEach(unit => {
			unit.charge = 0;
			unit.refresh = 0;
			unit.slowed = 0;
			unit.hasted = 0;
			unit.hp = unit.maxHp;
			unit.statuses = {};
		});
	}

	private resetPlayerUnitChargeBars(): void {
		this.state.gameData.player.units.forEach(unit => {
			this.scene.events.emit(GameEvents.CHARA_CHARGE_BAR_UPDATE, { unitId: unit.id });
		});
	}

	private setAllPlayerUnitBarsVisibility(visible: boolean): void {
		this.state.gameData.player.units.forEach(unit => {
			this.scene.events.emit(GameEvents.CHARA_BARS_VISIBILITY_SET, { unitId: unit.id, visible });
		});
	}

	private async awardXPAndHandleLevelUps(enemiesDefeatedCount: number): Promise<void> {
		const xpGained = enemiesDefeatedCount * BG_CONSTANTS.XP_PER_ENEMY;
		const levelUpPromises: Promise<void>[] = [];

		this.state.gameData.player.units.forEach(unit => {
			this.scene.events.emit(GameEvents.POP_TEXT_SHOW, { text: `+${xpGained} XP`, targetId: unit.id });
			unit.xp += xpGained;

			const levelsGained = Math.floor(unit.xp / BG_CONSTANTS.XP_FOR_LEVEL_UP);

			if (levelsGained > 0) {
				this.scene.events.emit(GameEvents.POP_TEXT_SHOW, { text: `Level up!`, targetId: unit.id });
				unit.xp -= levelsGained * BG_CONSTANTS.XP_FOR_LEVEL_UP; // Consume XP

				for (let i = 0; i < levelsGained; i++) {
					unit.maxHp = Math.floor(unit.maxHp * BG_CONSTANTS.HP_MULTIPLIER_LEVEL_UP);
					unit.hp = unit.maxHp; // Refill HP
					unit.attackPower = Math.floor(unit.attackPower * (1 + BG_CONSTANTS.ATTACK_POWER_MULTIPLIER_LEVEL_UP));
				}
				levelUpPromises.push(delay(this.scene, 0)); // Micro-delay or animation trigger
				this.scene.events.emit(GameEvents.CHARA_HP_DISPLAY_UPDATE, { unitId: unit.id });
			}
		});

		if (levelUpPromises.length > 0) {
			await Promise.all(levelUpPromises);
			// A small delay to let player appreciate level ups, if desired
			await delay(this.scene, BG_CONSTANTS.LEVEL_UP_APPRECIATION_DELAY);
		}
	}
}