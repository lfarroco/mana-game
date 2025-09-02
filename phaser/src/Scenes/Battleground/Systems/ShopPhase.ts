import { getState } from "@Models/State";
import { delay } from "../../../Utils/animation";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { updatePlayerGoldIO } from "@Models/Entities/Force";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import { renderVignette } from "../Animations/vignette";
import { clearAll, summon } from "@Systems/Chara/Chara";
import * as Shop from "./Shop/Shop";
import { transitionToCombatPhase } from "./CombatPhase";

async function setupShopPhaseCommon(): Promise<void> {
	const state = getState();
	clearAll();
	state.battleData.units = [];

	const playerForce = state.gameData.player;
	playerForce.morale = playerForce.maxMorale;

	const summonPromises = state.gameData.player.units
		.map(async (unit, index) => {
			await delay(index * 200);
			await summon(unit, true);
		});
	await Promise.all(summonPromises);

	isInShopPhase = true;
}

export let isInShopPhase: boolean = false;

export async function initializeShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Initial Setup).");

	Shop.handleShopOpenUITrigger();
}

export async function transitionToShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	PrestigeSystem.processVictory();
	PrestigeSystem.finalizeRound();

	updatePlayerGoldIO(BG_CONSTANTS.GOLD_PER_ROUND);

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");

	Shop.handleShopOpenUITrigger();
}

export async function transitionToShopPhaseAfterDefeat(): Promise<void> {
	await setupShopPhaseCommon();

	PrestigeSystem.processDefeat();
	PrestigeSystem.finalizeRound();

	updatePlayerGoldIO(BG_CONSTANTS.GOLD_PER_ROUND);

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (After Defeat).");

	// If prestige reached 0 after defeat, show a game-over vignette instead of opening the shop
	const player = state.gameData.player;
	if (player.prestige <= 0) {
		// Small delay then render game over message
		await renderVignette({ message: `Game Over! You were defeated in ${player.round} rounds.` });
		return;
	}

	Shop.handleShopOpenUITrigger();
}

export function handleShopPhaseEnded(): void {
	isInShopPhase = false;
	transitionToCombatPhase();
}

export function endShopPhase(): void {
	isInShopPhase = false;
}
