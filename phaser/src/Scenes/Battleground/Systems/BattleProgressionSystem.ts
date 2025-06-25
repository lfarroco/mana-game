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
import { cpuForce, playerForce, } from "../../../Models/Entities/Force";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../constants/constants";

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
		this.addListener(GameEvents.UNIT_TOOK_DAMAGE, this._handleUnitDamageForMoraleUpdate);

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
		this._hideMoraleBars();
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
		const enemy = generateEnemyTeam(this.state.gameData.round, cardPool);

		this.state.battleData.forces = [
			cpuForce,
			playerForce
		];
		this.state.battleData.units = [...enemy.units, ...this.state.gameData.player.units];

		// Summon CPU units to the board
		enemy.units.forEach(unit => {
			this.scene.events.emit(
				GameEvents.CHARA_SUMMON_TO_BOARD,
				{
					unit,
					animateAppear: false,
					playSound: false,
				}
			);
		});
		this.scene.events.emit(GameEvents.DIFFICULTY_TIER_CHANGED, { difficultyTier: enemy.difficultyTier });
		return { enemies: enemy.units };
	}

	// --- Event Handlers Moved from BattlegroundEventSystem ---

	/**
	 * When a unit dies, it's removed from the battle state, its character is destroyed,
	 * and the morale is updated.
	 */
	handleUnitDiedInBattle(payload: { unit: Unit, killerId?: string }): void {
		this.state.battleData.units = this.state.battleData.units.filter(u => u.id !== payload.unit.id);
		this.scene.events.emit(GameEvents.CHARA_DESTROY_FROM_BOARD, { unitId: payload.unit.id });
		// A unit dying is a form of taking damage, so we can reuse the same morale update logic.
		this._handleUnitDamageForMoraleUpdate(payload);
	}

	/**
	 * When the shop phase ends, transition to the combat phase.
	 */
	handleShopPhaseEnded(): void {
		this.transitionToCombatPhase();
	}

	/**
	 * Handles the end of a victorious combat, hiding morale bars and transitioning to the shop phase.
	 */
	async handleCombatEndedVictory(payload: { enemiesDefeated: Unit[] }): Promise<void> {
		this._hideMoraleBars();
		console.log("Round", this.state.gameData.round, "Processing Victory...");
		await delay(this.scene, BG_CONSTANTS.POST_COMBAT_DELAY);
		this.scene.events.emit(GameEvents.BATTLE_RESULT_SHOW, { result: "victory" });
		await delay(this.scene, 1500); // Wait for animation

		this.transitionToShopPhase(payload);
	}

	/**
	 * Kicks off the combat sequence. This initializes morale and starts the combat simulation.
	 * @param payload Contains the enemy units for this combat.
	 */
	async handleCombatStartExecution(payload: { enemies: Unit[] }): Promise<void> {
		this._initializeMorale();
		const combatResult = await this.scene.runCombatSystem.runCombatIO(); // runCombatSystem is on BattlegroundScene
		if (combatResult === "player_won") {
			this.scene.events.emit(GameEvents.COMBAT_ENDED_VICTORY, { enemiesDefeated: payload.enemies });
		} else {
			this.scene.events.emit(GameEvents.COMBAT_ENDED_DEFEAT, {});
		}
	}

	// --- Morale Management ---

	_calculateForceMaxMorale(forceId: string): number {
		return this.state.battleData.units
			.filter(u => u.force === forceId)
			.map(u => u.maxHp)
			.reduce((a, b) => a + b, 0);
	}

	_calculateForceCurrentMorale(forceId: string): number {
		return this.state.battleData.units
			.filter(u => u.force === forceId)
			.map(u => Math.max(0, u.hp)) // Use current HP, ensure it's not negative
			.reduce((a, b) => a + b, 0);
	}

	/**
	 * Sets the initial morale for both forces at the start of combat and shows the bars.
	 */
	_initializeMorale(): void {
		const playerMorale = this._calculateForceMaxMorale(FORCE_ID_PLAYER);
		const cpuMorale = this._calculateForceMaxMorale(FORCE_ID_CPU)

		playerForce.morale = playerMorale;
		playerForce.maxMorale = playerMorale;

		cpuForce.morale = cpuMorale;
		cpuForce.maxMorale = cpuMorale;

		this.scene.events.emit(GameEvents.MORALE_BARS_SHOW);
		this.scene.events.emit(
			GameEvents.MORALE_UPDATED,
			{
				forceId: FORCE_ID_PLAYER,
				newMorale: playerForce.morale,
				maxMorale: playerForce.maxMorale,
			}
		);
		this.scene.events.emit(
			GameEvents.MORALE_UPDATED,
			{
				forceId: FORCE_ID_CPU,
				newMorale: cpuForce.morale,
				maxMorale: cpuForce.maxMorale
			}
		);
	}

	_hideMoraleBars(): void {
		this.scene.events.emit(GameEvents.MORALE_BARS_HIDE);
	}

	/**
	 * Recalculates and emits the new morale value for a force when one of its units takes damage.
	 */
	_handleUnitDamageForMoraleUpdate(payload: { unit: Unit }): void {
		const { unit } = payload;
		const targetForce = unit.force === FORCE_ID_PLAYER ? playerForce : (unit.force === FORCE_ID_CPU ? cpuForce : null);

		if (!targetForce) return;

		targetForce.morale = this._calculateForceCurrentMorale(targetForce.id);
		this.scene.events.emit(
			GameEvents.MORALE_UPDATED,
			{ forceId: targetForce.id, newMorale: targetForce.morale, maxMorale: targetForce.maxMorale, }
		);
	}


	destroy(): void {
		this.listeners.forEach(listener => {
			this.scene.events.off(listener.event, listener.handler, listener.context);
		});
		this.listeners = [];
	}
}