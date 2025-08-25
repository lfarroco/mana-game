import { State } from "../../../Models/State";
import { Unit } from "../../../Models/Entities/Unit";
import { delay } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { getAllCards } from "../../../Models/Entities/Card";
import { generateEnemyTeam } from "../generateEnemyTeam";
import { PrestigeSystem } from "../../../Systems/PrestigeSystem";
import { cpuForce, playerForce, updatePlayerGoldIO } from "../../../Models/Entities/Force";
import * as GhostStore from "../../../Models/GhostStore";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../constants/constants";
import * as MoraleDisplay from "../MoraleDisplay";
import { renderVignette } from "../Animations/vignette";
import * as AudioManager from "../../../Systems/AudioManager";
import * as Shop from "./Shop/Shop";
import { Chara } from "../../../Systems/Chara";
import { battleResultAnimation } from "../battleResultAnimation";

function createUnitCopy(unit: Unit): Unit {
	return {
		...unit,
		position: { ...unit.position },
		reactions: unit.reactions.map(reaction => ({ ...reaction, effects: reaction.effects.map(effect => ({ ...effect })) })),
		effects: unit.effects.map(effect => ({ ...effect })),
	};
}

export class BattleProgressionSystem {
	scene: BattlegroundScene;
	state: State;
	isInShopPhase: boolean = false;
	prestigeSystem: PrestigeSystem;

	constructor(scene: BattlegroundScene, state: State) {
		this.scene = scene;
		this.state = state;
		this.prestigeSystem = new PrestigeSystem();
	}

	get getIsInShopPhase(): boolean {
		return this.isInShopPhase;
	}

	async transitionToShopPhase(): Promise<void> {

		Chara.clearAll();
		this.state.battleData.units = [];

		playerForce.morale = playerForce.maxMorale;
		MoraleDisplay.updateMoraleBar(playerForce.id);


		const summonPromises = this.state.gameData.player.units
			.map(async (unit, index) => {
				await delay(index * 200);
				await Chara.summon(unit, true);
			});
		await Promise.all(summonPromises);

		this.state.gameData.round++;

		this.isInShopPhase = true;
		updatePlayerGoldIO(BG_CONSTANTS.VICTORY_GOLD_REWARD);

		this.prestigeSystem.processVictory();
		this.prestigeSystem.finalizeRound();

		console.log("Round", this.state.gameData.round, "Shop Phase Starting.");

		Shop.handleShopOpenUITrigger()
	}

	async transitionToCombatPhase(): Promise<void> {
		this.isInShopPhase = false;
		console.log("Round", this.state.gameData.round, "Combat Phase Starting.");
		const { enemies } = await this.setupBattle();


		GhostStore.saveGhostForRound(
			this.state.gameData.round,
			this.state.gameData.player.units,
			this.state.gameData.player.prestige
		);

		this.handleCombatStartExecution({ enemies });
	}

	async handleCombatEndedDefeat(): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Defeat...");

		AudioManager.playSoundEffect('sfx_victory_match');

		await delay(1000);
		await this._fadeOutDisplayBars();
		battleResultAnimation("defeat")
		await delay(1500);

		this.prestigeSystem.processDefeat();

		this.transitionToShopPhase();
	}

	async handlePlayerWonGame(): Promise<void> {
		this.isInShopPhase = false;
		console.log(`PLAYER HAS WON THE GAME! Prestige: ${this.state.gameData.player.prestige}, Total Rounds: ${this.state.gameData.player.totalRoundsPlayed}`);


		renderVignette({ message: `Victory! You reached Champion status in ${this.state.gameData.player.totalRoundsPlayed} rounds!` });
	}

	async setupBattle(): Promise<{ enemies: Unit[]; }> {
		const cardPool = getAllCards();
		const enemies = generateEnemyTeam(this.state.gameData.round, cardPool);

		const playerUnitsForBattle = this.state.gameData.player.units.map(unit => createUnitCopy(unit));

		this.state.battleData.forces = [
			cpuForce,
			playerForce
		];
		this.state.battleData.units = [...enemies, ...playerUnitsForBattle];

		await delay(100);


		return { enemies };
	}

	handleShopPhaseEnded(): void {
		this.transitionToCombatPhase();
	}

	async handleCombatEndedVictory(): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Victory...");

		AudioManager.playSoundEffect('sfx_victory_reward_chant');

		await delay(1000);
		await this._fadeOutDisplayBars();
		battleResultAnimation("victory");
		await delay(1500);

		this.transitionToShopPhase();
	}

	async handleCombatStartExecution(_payload: { enemies: Unit[] }): Promise<void> {

		this._initializeMorale();

		this.scene.playerBoard?.setEnemyBoardVisible(true);
		Chara.clearAll();
		// Important: summon the exact Unit instances stored in battleData.units
		// so display components (e.g., charge bars) observe the same objects updated during combat.
		const combatUnits = this.state.battleData.units;
		combatUnits.forEach(u => {
			Chara.summon(u, false);
		});

		await delay(300);

		this.scene.runCombatSystem.runCombatIO();

	}

	handleCombatEnded(combatResult: string) {
		if (combatResult === "player_won") {
			this.handleCombatEndedVictory();
		} else {
			this.handleCombatEndedDefeat();
		}
	}

	_initializeMorale(): void {
		playerForce.morale = playerForce.maxMorale;
		cpuForce.morale = cpuForce.maxMorale;

		playerForce.shield = 0;
		cpuForce.shield = 0;

		MoraleDisplay.showBars();

		MoraleDisplay.updateMoraleDisplay({
			forceId: FORCE_ID_PLAYER,
			newMorale: playerForce.morale,
			maxMorale: playerForce.maxMorale,
		});
		MoraleDisplay.updateMoraleDisplay({
			forceId: FORCE_ID_CPU,
			newMorale: cpuForce.morale,
			maxMorale: cpuForce.maxMorale,
		});
		MoraleDisplay.updateShieldBar(
			FORCE_ID_PLAYER,
			playerForce.shield,
			playerForce.maxMorale,
		)
		MoraleDisplay.updateShieldBar(
			FORCE_ID_CPU,
			cpuForce.shield,
			cpuForce.maxMorale,
		);
	}

	async _fadeOutDisplayBars(): Promise<void> {

		MoraleDisplay.fadeOutBars();

		await delay(500);
	}

}