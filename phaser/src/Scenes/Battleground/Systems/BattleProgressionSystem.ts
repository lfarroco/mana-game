import { State } from "../../../Models/State";
import { Unit } from "../../../Models/Entities/Unit";
import { delay } from "../../../Utils/animation";
import { BattlegroundScene } from "../BattlegroundScene";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { getAllCards } from "../../../Models/Entities/Card";
import { generateEnemyTeam } from "../generateEnemyTeam";
import { PrestigeSystem } from "../../../Systems/PrestigeSystem";
import * as CharaManager from "./CharaManager";
import { cpuForce, playerForce, updatePlayerGoldIO } from "../../../Models/Entities/Force";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../constants/constants";
import { fadeOutBars, showBars, updateMoraleBar, updateMoraleDisplay, updateShieldBar } from "../MoraleDisplay";
import { renderVignette } from "../Animations/vignette";
import { EventHandler } from "../../../Types/CommonTypes";
import * as AudioManager from "../../../Systems/AudioManager";

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
	listeners: Array<{ event: string; handler: EventHandler; context: BattleProgressionSystem }> = [];

	addListener(event: string, handler: EventHandler): void {
		this.scene.events.on(event, handler, this);
		this.listeners.push({ event, handler, context: this })
	}

	constructor(scene: BattlegroundScene, state: State) {
		this.scene = scene;
		this.state = state;
		this.prestigeSystem = new PrestigeSystem(scene, state);


	}

	get getIsInShopPhase(): boolean {
		return this.isInShopPhase;
	}

	async transitionToShopPhase(payload?: { enemiesDefeated?: Unit[] }): Promise<void> {

		CharaManager.clearCharas();
		this.state.battleData.units = [];

		playerForce.morale = playerForce.maxMorale;
		updateMoraleBar(playerForce.id);

		this.resetPlayerUnitsForNewRound();

		const summonPromises = this.state.gameData.player.units.map(async (unit, index) => {
			await delay(index * 200)
			await CharaManager.summonChara(unit, true)
		});
		await Promise.all(summonPromises);

		this.resetPlayerUnitChargeBars();
		this.setAllPlayerUnitBarsVisibility(false);
		this.state.gameData.round++;

		this.isInShopPhase = true;
		if (payload && payload.enemiesDefeated) {
			updatePlayerGoldIO(BG_CONSTANTS.VICTORY_GOLD_REWARD);
			this.prestigeSystem.processVictory();
			this.prestigeSystem.finalizeRound();
		}
		console.log("Round", this.state.gameData.round, "Shop Phase Starting.");

		this.scene.shop.handleShopOpenUITrigger()
	}

	async transitionToCombatPhase(): Promise<void> {
		this.isInShopPhase = false;
		console.log("Round", this.state.gameData.round, "Combat Phase Starting.");
		const { enemies } = await this.setupBattle();

		this.setAllPlayerUnitBarsVisibility(true);

		this.handleCombatStartExecution({ enemies });

	}

	async handleCombatEndedDefeat(): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Defeat...");

			AudioManager.playSoundEffect('sfx_victory_match');

		await delay(1000);
		await this._fadeOutDisplayBars();
		this.scene.handleBattleResultShow({
			result: "defeat",
		});
		await delay(1500);

		this.prestigeSystem.processDefeat();

		this.transitionToShopPhase();
	}

	async handlePlayerWonGame(): Promise<void> {
		this.isInShopPhase = false;
		console.log(`PLAYER HAS WON THE GAME! Prestige: ${this.state.gameData.player.prestige}, Total Rounds: ${this.state.gameData.player.totalRoundsPlayed}`);


		renderVignette({ message: `Victory! You reached Champion status in ${this.state.gameData.player.totalRoundsPlayed} rounds!` });
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
			CharaManager.handleCharaChargeBarUpdateEvent({ unitId: chara.id });
		});
	}

	setAllPlayerUnitBarsVisibility(visible: boolean): void {
		CharaManager.getAllCharas().forEach(chara => {
			CharaManager.handleCharaBarsVisibilitySetEvent({ unitId: chara.id, visible });
		});
	}

	async setupBattle(): Promise<{ enemies: Unit[]; }> {
		const cardPool = getAllCards();
		const enemy = generateEnemyTeam(this.state.gameData.round, cardPool);

		const playerUnitsForBattle = this.state.gameData.player.units.map(unit => createUnitCopy(unit));

		this.state.battleData.forces = [
			cpuForce,
			playerForce
		];
		this.state.battleData.units = [...enemy.units, ...playerUnitsForBattle];

		await delay(100);

		playerUnitsForBattle.forEach(battleCopy => {
			const chara = CharaManager.getChara(battleCopy.id);
			if (chara) {
				chara.updateUnit(battleCopy);
			}
		});

		return { enemies: enemy.units };
	}

	handleShopPhaseEnded(): void {
		this.transitionToCombatPhase();
	}

	async handleCombatEndedVictory(payload: { enemiesDefeated: Unit[] }): Promise<void> {
		console.log("Round", this.state.gameData.round, "Processing Victory...");

		AudioManager.playSoundEffect('sfx_victory_reward_chant');

		await delay(1000);
		await this._fadeOutDisplayBars();

		this.scene.handleBattleResultShow({
			result: "victory",
		})

		await delay(1500);

		this.transitionToShopPhase(payload);
	}

	async handleCombatStartExecution(payload: { enemies: Unit[] }): Promise<void> {
		this._initializeMorale();
		this.scene.eventSystem.handleEnemyBoardShow();
		await delay(300);
		await Promise.all(payload.enemies.map(u => CharaManager.summonChara(u, true)));
		[...payload.enemies, ...this.state.gameData.player.units].forEach(u => {
			try { CharaManager.handleCharaBarsVisibilitySetEvent({ unitId: u.id, visible: true }); } catch { }
		});

		const combatResult = await this.scene.runCombatSystem.runCombatIO();
		if (combatResult === "player_won") {
			this.handleCombatEndedVictory({ enemiesDefeated: payload.enemies });
		} else {
			this.handleCombatEndedDefeat();
		}
	}


	_initializeMorale(): void {
		playerForce.morale = playerForce.maxMorale;
		cpuForce.morale = cpuForce.maxMorale;

		playerForce.shield = 0;
		cpuForce.shield = 0;

		showBars();

		updateMoraleDisplay({
			forceId: FORCE_ID_PLAYER,
			newMorale: playerForce.morale,
			maxMorale: playerForce.maxMorale,
		});
		updateMoraleDisplay({
			forceId: FORCE_ID_CPU,
			newMorale: cpuForce.morale,
			maxMorale: cpuForce.maxMorale,
		});
		updateShieldBar(
			FORCE_ID_PLAYER,
			playerForce.shield,
			playerForce.maxMorale,
		)
		updateShieldBar(
			FORCE_ID_CPU,
			cpuForce.shield,
			cpuForce.maxMorale,
		);
	}

	async _fadeOutDisplayBars(): Promise<void> {

		fadeOutBars();

		await delay(500);
	}

	destroy(): void {
		this.listeners.forEach(listener => {
			this.scene.events.off(listener.event, listener.handler, listener.context);
		});
		this.listeners = [];
	}
}