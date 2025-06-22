import { State } from "../../../Models/State";
import { Unit } from "../../../Models/Entities/Unit";
import { delay } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { GameEvents } from "../../../constants/events";
import { getAllCards } from "../../../Models/Entities/Card";
import { generateEnemyTeam } from "../generateEnemyTeam";
import { PrestigeSystem } from "../../../Systems/PrestigeSystem";
import * as CharaManager from "./CharaManager";
import { cpuForce, playerForce } from "../../../Models/Entities/Force";

/**
 * Manages the overall progression of the battle, including transitions
 * between shop and combat phases, round victories, and game over.
 */
export class BattleProgressionSystem {
	scene: BattlegroundScene;
	state: State;
	_isInShopPhase: boolean = false;
	prestigeSystem: PrestigeSystem;
	listeners: any[] = [];

	addListener(event: string, handler: (...args: any[]) => void,): void {
		this.scene.events.on(event, handler, this);
		this.listeners.push({ event, handler, context: this })
	}

	constructor(scene: BattlegroundScene, state: State) {
		this.scene = scene;
		this.state = state;
		this.prestigeSystem = new PrestigeSystem(scene, state);

		// Shop Phase
		this.addListener(GameEvents.SHOP_PHASE_ENDED, this.handleShopPhaseEnded);

		// Combat Phase
		this.addListener(GameEvents.COMBAT_START_EXECUTION_TRIGGER, this.handleCombatStartExecution);
		this.addListener(GameEvents.COMBAT_ENDED_VICTORY, this.handleCombatEndedVictory);
		this.addListener(GameEvents.COMBAT_ENDED_DEFEAT, this.handleCombatEndedDefeat);
		this.addListener(GameEvents.UNIT_DIED_IN_BATTLE, this.handleUnitDiedInBattle);

		// Game Over
		this.addListener(GameEvents.PLAYER_WON_GAME, this.handlePlayerWonGame);
	}

	get isInShopPhase(): boolean {
		return this._isInShopPhase;
	}

	/**
	 * Transitions the game to the shop phase.
	 * If called after a victory, processes round victory rewards first.
	 */
	async transitionToShopPhase(payload?: { enemiesDefeated?: Unit[] }): Promise<void> {

		await delay(this.scene, 1000);
		// cleanup
		CharaManager.clearCharas();
		this.state.battleData.units = [];

		this.resetPlayerUnitsForNewRound();

		const summonPromises = this.state.gameData.player.units.map(async (unit, index) => {
			await delay(this.scene, index * 200)
			await CharaManager.summonChara(unit, true)
		});
		await Promise.all(summonPromises);

		this.resetPlayerUnitChargeBars();
		this.setAllPlayerUnitBarsVisibility(false);
		this.state.gameData.round++;

		this._isInShopPhase = true;
		if (payload && payload.enemiesDefeated) {
			this.scene.events.emit(GameEvents.PLAYER_GOLD_DELTA_REQUEST, BG_CONSTANTS.VICTORY_GOLD_REWARD);
			this.prestigeSystem.processVictory();
			this.prestigeSystem.finalizeRound();
		}
		console.log("Round", this.state.gameData.round, "Shop Phase Starting.");
		this.scene.events.emit(GameEvents.PLAYER_BOARD_SHOW);
		this.scene.events.emit(GameEvents.SHOP_OPEN_UI_TRIGGER);
	}

	/**
	 * Transitions the game to the combat phase for the current round.
	 */
	transitionToCombatPhase(): void {
		this._isInShopPhase = false;
		console.log("Round", this.state.gameData.round, "Combat Phase Starting.");
		const { enemies } = this.setupBattle();

		this.setAllPlayerUnitBarsVisibility(true); // Show bars for player units in combat
		this.scene.events.emit(GameEvents.PLAYER_BOARD_HIDE);
		this.scene.events.emit(GameEvents.COMBAT_START_EXECUTION_TRIGGER, { enemies });
	}

	/**
	 * Handles the game over sequence.
	 */
	async handleCombatEndedDefeat(): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Defeat...");
		await delay(this.scene, BG_CONSTANTS.POST_COMBAT_DELAY);
		this.scene.events.emit(GameEvents.BATTLE_RESULT_SHOW, { result: "defeat" });
		await delay(this.scene, 1500); // Wait for animation

		this.prestigeSystem.processDefeat();

		// Instead of game over, lose prestige and return to shop
		this.transitionToShopPhase();
	}

	/**
	 * Handles the event when the player achieves the ultimate win condition (30 prestige).
	 */
	async handlePlayerWonGame(): Promise<void> {
		this._isInShopPhase = false; // Stop normal game flow
		console.log(`PLAYER HAS WON THE GAME! Prestige: ${this.state.gameData.player.prestige}, Total Rounds: ${this.state.gameData.player.totalRoundsPlayed}`);

		// Display a unique victory message/screen
		this.scene.events.emit(
			GameEvents.VIGNETTE_MESSAGE_SHOW,
			{ message: `Victory! You reached Champion status in ${this.state.gameData.player.totalRoundsPlayed} rounds!` }
		);
		// Here you could transition to a dedicated "Game Won" scene or show a special UI.
	}

	resetPlayerUnitsForNewRound(): void {
		this.state.gameData.player.units.forEach(unit => {
			unit.charge = 0;
			unit.refresh = 0;
			unit.slowed = 0;
			unit.hasted = 0;
			unit.hp = unit.maxHp;
		});
	}

	resetPlayerUnitChargeBars(): void {
		CharaManager.getAllCharas().forEach(chara => {
			this.scene.events.emit(
				GameEvents.CHARA_CHARGE_BAR_UPDATE,
				{ unitId: chara.id }
			);
		});
	}

	setAllPlayerUnitBarsVisibility(visible: boolean): void {
		CharaManager.getAllCharas().forEach(chara => {
			this.scene.events.emit(
				GameEvents.CHARA_BARS_VISIBILITY_SET,
				{ unitId: chara.id, visible },
			);
		});
	}

	/**
	 * Sets up the battle by generating the enemy team and adding all units (player and enemy)
	 * to the battle data. Also summons CPU units to the board.
	 * @returns An object containing the array of enemy units.
	 */
	setupBattle(): { enemies: Unit[] } {
		const cardPool = getAllCards();
		const enemies = generateEnemyTeam(this.state.gameData.round, cardPool);

		this.state.battleData.forces = [
			cpuForce,
			playerForce
		];
		this.state.battleData.units = [...enemies, ...this.state.gameData.player.units];

		// Summon CPU units to the board
		enemies.forEach(unit => {
			this.scene.events.emit(
				GameEvents.CHARA_SUMMON_TO_BOARD,
				{
					unit,
					animateAppear: false,
					playSound: false,
				}
			);
		});
		return { enemies };
	}

	// --- Event Handlers Moved from BattlegroundEventSystem ---

	handleUnitDiedInBattle(payload: { unit: Unit, killerId?: string }): void {
		this.state.battleData.units = this.state.battleData.units.filter(u => u.id !== payload.unit.id);
		this.scene.events.emit(GameEvents.CHARA_DESTROY_FROM_BOARD, { unitId: payload.unit.id });
	}

	handleShopPhaseEnded(): void {
		this.transitionToCombatPhase();
	}

	async handleCombatEndedVictory(payload: { enemiesDefeated: Unit[] }): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Victory...");
		await delay(this.scene, BG_CONSTANTS.POST_COMBAT_DELAY);
		this.scene.events.emit(GameEvents.BATTLE_RESULT_SHOW, { result: "victory" });
		await delay(this.scene, 1500); // Wait for animation

		this.transitionToShopPhase(payload);
	}

	async handleCombatStartExecution(payload: { enemies: Unit[] }): Promise<void> {
		const combatResult = await this.scene.runCombatSystem.runCombatIO(); // runCombatSystem is on BattlegroundScene
		if (combatResult === "player_won") {
			this.scene.events.emit(GameEvents.COMBAT_ENDED_VICTORY, { enemiesDefeated: payload.enemies });
		} else {
			this.scene.events.emit(GameEvents.COMBAT_ENDED_DEFEAT, {});
		}
	}

	destroy(): void {
		this.listeners.forEach(listener => {
			this.scene.events.off(listener.event, listener.handler, listener.context);
		});
		this.listeners = [];
	}
}