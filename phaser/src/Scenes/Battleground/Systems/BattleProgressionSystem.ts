import { getState } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { delay } from "../../../Utils/animation";
import { scene } from "../BattlegroundScene";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { getAllCards } from "@Models/Entities/Card";
import { generateEnemyTeam } from "../generateEnemyTeam";
import { PrestigeSystem } from "@Systems/PrestigeSystem";
import { cpuForce, playerForce, updatePlayerGoldIO } from "@Models/Entities/Force";
import * as GhostStore from "@Models/GhostStore";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../constants/constants";
import * as MoraleDisplay from "../MoraleDisplay";
import { renderVignette } from "../Animations/vignette";
import * as AudioManager from "@Systems/AudioManager";
import * as Shop from "./Shop/Shop";
import { Chara } from "@Systems/Chara";
import { battleResultAnimation } from "../battleResultAnimation";

const state = getState();

function createUnitCopy(unit: Unit): Unit {
	return {
		...unit,
		position: { ...unit.position },
		reactions: unit.reactions.map(reaction => ({ ...reaction, effects: reaction.effects.map(effect => ({ ...effect })) })),
		effects: unit.effects.map(effect => ({ ...effect })),
	};
}

export let isInShopPhase: boolean = false;

const prestigeSystem = new PrestigeSystem();


export async function transitionToShopPhase(): Promise<void> {


	Chara.clearAll();
	state.battleData.units = [];

	playerForce.morale = playerForce.maxMorale;
	MoraleDisplay.updateMoraleBar(playerForce.id);

	const summonPromises = state.gameData.player.units
		.map(async (unit, index) => {
			await delay(index * 200);
			await Chara.summon(unit, true);
		});
	await Promise.all(summonPromises);

	state.gameData.round++;

	isInShopPhase = true;
	updatePlayerGoldIO(BG_CONSTANTS.VICTORY_GOLD_REWARD);

	prestigeSystem.processVictory();
	prestigeSystem.finalizeRound();

	console.log("Round", state.gameData.round, "Shop Phase Starting.");

	Shop.handleShopOpenUITrigger()
}

export async function transitionToCombatPhase(): Promise<void> {
	isInShopPhase = false;
	console.log("Round", state.gameData.round, "Combat Phase Starting.");
	const { enemies } = await setupBattle();


	GhostStore.saveGhostForRound(
		state.gameData.round,
		state.gameData.player.units,
		state.gameData.player.prestige
	);

	handleCombatStartExecution({ enemies });
}

export async function handleCombatEndedDefeat(): Promise<void> {
	console.log("Round", state.gameData.round, "Processing Defeat...");

	AudioManager.playSoundEffect('sfx_victory_match');

	await delay(1000);
	await _fadeOutDisplayBars();
	battleResultAnimation("defeat")
	await delay(1500);

	prestigeSystem.processDefeat();


}

export async function handlePlayerWonGame(): Promise<void> {
	isInShopPhase = false;
	console.log(`PLAYER HAS WON THE GAME! Prestige: ${state.gameData.player.prestige}, Total Rounds: ${state.gameData.player.totalRoundsPlayed}`);


	renderVignette({
		message: `Victory! You reached Champion status in ${state.gameData.player.totalRoundsPlayed
			} rounds!`
	});
}

export async function setupBattle(): Promise<{ enemies: Unit[]; }> {
	const cardPool = getAllCards();
	const enemies = generateEnemyTeam(state.gameData.round, cardPool);

	const playerUnitsForBattle = state.gameData.player.units.map(unit => createUnitCopy(unit));

	state.battleData.forces = [
		cpuForce,
		playerForce
	];
	state.battleData.units = [...enemies, ...playerUnitsForBattle];

	await delay(100);


	return { enemies };
}

export function handleShopPhaseEnded(): void {
	transitionToCombatPhase();
}

export async function handleCombatEndedVictory(): Promise<void> {
	console.log("Round", state.gameData.round, "Processing Victory...");

	AudioManager.playSoundEffect('sfx_victory_reward_chant');

	await delay(1000);
	await _fadeOutDisplayBars();
	battleResultAnimation("victory");
	await delay(1500);

	transitionToShopPhase();
}

export async function handleCombatStartExecution(_payload: { enemies: Unit[] }): Promise<void> {

	_initializeMorale();

	scene.playerBoard?.setEnemyBoardVisible(true);
	Chara.clearAll();
	// Important: summon the exact Unit instances stored in battleData.units
	// so display components (e.g., charge bars) observe the same objects updated during combat.
	const combatUnits = state.battleData.units;
	combatUnits.forEach(u => {
		Chara.summon(u, false);
	});

	await delay(300);

	scene.runCombatSystem.runCombatIO();

}

export function handleCombatEnded(combatResult: string) {
	if (combatResult === "player_won") {
		handleCombatEndedVictory();
	} else {
		handleCombatEndedDefeat();
	}
}

function _initializeMorale(): void {
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

async function _fadeOutDisplayBars(): Promise<void> {
	MoraleDisplay.fadeOutBars();
	await delay(500);
}
