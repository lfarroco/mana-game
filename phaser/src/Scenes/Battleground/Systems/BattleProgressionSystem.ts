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
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../constants/constants";
import { updateMoraleBar } from "../MoraleDisplay";
import { AudioSystem } from "../../../Systems/AudioSystem/AudioSystem";

/**
 * Creates a deep copy of a unit for battle purposes.
 * This ensures that any modifications during battle don't affect the persistent game data.
 */
function createUnitCopy(unit: Unit): Unit {
	return {
		...unit,
		// Deep copy nested objects
		position: { ...unit.position },
		reactions: unit.reactions.map(reaction => ({ ...reaction, effects: reaction.effects.map(effect => ({ ...effect })) })),
		effects: unit.effects.map(effect => ({ ...effect })),
	};
}

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

		this.addListener(GameEvents.UNIT_ATTACK, this.handleUnitAttackOnMorale);

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

		// cleanup
		CharaManager.clearCharas();
		this.state.battleData.units = [];

		playerForce.morale = playerForce.maxMorale;
		updateMoraleBar(playerForce.id);

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
		this.scene.events.emit(GameEvents.SHOP_OPEN_UI_TRIGGER);
	}

	/**
	 * Transitions the game to the combat phase for the current round.
	 */
	async transitionToCombatPhase(): Promise<void> {
		this._isInShopPhase = false;
		console.log("Round", this.state.gameData.round, "Combat Phase Starting.");
		const { enemies } = await this.setupBattle();

		this.setAllPlayerUnitBarsVisibility(true); // Show bars for player units in combat
		this.scene.events.emit(GameEvents.COMBAT_START_EXECUTION_TRIGGER, { enemies });
	}

	/**
	 * Handles the game over sequence.
	 */
	async handleCombatEndedDefeat(): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Defeat...");
		// Wait 1 second for current animations to complete

		try {
			const audioSystem = AudioSystem.getInstance();
			audioSystem.playSoundEffect('sfx_victory_match');
		} catch (error) {
			console.warn('Could not play victory match sound:', error);
		}

		await delay(this.scene, 1000);
		// Fade out the bars smoothly before hiding them
		await this._fadeOutDisplayBars();
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
			unit.hasted = 0;
			unit.slowed = 0;
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
	async setupBattle(): Promise<{ enemies: Unit[]; }> {
		const cardPool = getAllCards();
		const enemy = generateEnemyTeam(this.state.gameData.round, cardPool);

		// Create deep copies of player units for the battle
		const playerUnitsForBattle = this.state.gameData.player.units.map(unit => createUnitCopy(unit));

		this.state.battleData.forces = [
			cpuForce,
			playerForce
		];
		this.state.battleData.units = [...enemy.units, ...playerUnitsForBattle];

		// Small delay to ensure Chara objects are properly initialized
		await delay(this.scene, 100);

		// Update existing player Chara objects to reference the battle copies
		playerUnitsForBattle.forEach(battleCopy => {
			const chara = CharaManager.getChara(battleCopy.id);
			if (chara) {
				chara.updateUnit(battleCopy); // Update the Chara and its display components to reference the battle copy
			}
		});

		// Show enemy board in combat phase
		this.scene.events.emit(GameEvents.ENEMY_BOARD_SHOW);

		await delay(this.scene, 500); // Wait for any animations to complete before proceeding

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
		console.log("Round", this.state.gameData.round, "Processing Victory...");

		try {
			const audioSystem = AudioSystem.getInstance();
			audioSystem.playSoundEffect('sfx_victory_reward_chant');
		} catch (error) {
			console.warn('Could not play victory reward chant sound:', error);
		}

		// Wait 1 second for current animations to complete
		await delay(this.scene, 1000);
		// Fade out the bars smoothly before hiding them
		await this._fadeOutDisplayBars();
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

	/**
	 * Sets the initial morale for both forces at the start of combat and shows the bars.
	 * Morale is reset to maxMorale, but maxMorale itself is not recalculated from unit HP.
	 */
	_initializeMorale(): void {
		// With the new system, maxMorale is a fixed value that can be upgraded.
		// We just need to reset the current morale to the max at the start of each combat.
		// The maxMorale value itself is NOT recalculated based on unit HP anymore.
		playerForce.morale = playerForce.maxMorale;
		cpuForce.morale = cpuForce.maxMorale;

		// Reset shields to 0 at battle start
		playerForce.shield = 0;
		cpuForce.shield = 0;

		this.scene.events.emit(GameEvents.MORALE_BARS_SHOW);
		this.scene.events.emit(GameEvents.SHIELD_BARS_SHOW);
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
		this.scene.events.emit(
			GameEvents.SHIELD_UPDATED,
			{
				forceId: FORCE_ID_PLAYER,
				newShield: playerForce.shield,
				maxShield: playerForce.maxMorale, // maxShield for display = max morale
			}
		);
		this.scene.events.emit(
			GameEvents.SHIELD_UPDATED,
			{
				forceId: FORCE_ID_CPU,
				newShield: cpuForce.shield,
				maxShield: cpuForce.maxMorale // maxShield for display = max morale
			}
		);
	}

	/**
	 * Fades out display bars smoothly before hiding them.
	 */
	async _fadeOutDisplayBars(): Promise<void> {
		// Run both fade outs in parallel
		await Promise.all([
			new Promise<void>((resolve) => {
				this.scene.events.emit(GameEvents.MORALE_BARS_FADE_OUT);
				// Wait for fade out to complete
				setTimeout(resolve, 500); // Match the fade duration
			}),
			new Promise<void>((resolve) => {
				this.scene.events.emit(GameEvents.SHIELD_BARS_FADE_OUT);
				// Wait for fade out to complete  
				setTimeout(resolve, 500); // Match the fade duration
			})
		]);
	}

	/**
	 * Damages enemy force when a unit attacks (shields absorb damage first)
	 */
	handleUnitAttackOnMorale(_payload: { unit: Unit }): void {
		// This method now only handles the attack event for other purposes
		// Damage application is handled by the trait system in dealDamage.ts
		// to avoid duplicate damage application

		// Any additional attack processing logic can go here
		// (e.g., sound effects, visual effects, logging, etc.)
	}

	destroy(): void {
		this.listeners.forEach(listener => {
			this.scene.events.off(listener.event, listener.handler, listener.context);
		});
		this.listeners = [];
	}
}