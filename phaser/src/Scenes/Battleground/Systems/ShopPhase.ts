import { getState } from "@Models/State";
import { delay } from "../../../Utils/animation";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { updatePlayerGoldIO } from "@Models/Entities/Force";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import { clearAll, summon } from "@Systems/Chara/Chara";
import * as Shop from "./Shop/Shop";
import { transitionToCombatPhase } from "./CombatPhase";

const state = getState();

async function setupShopPhaseCommon(): Promise<void> {
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

	console.log("Round", state.gameData.round, "Shop Phase Starting (Initial Setup).");

	Shop.handleShopOpenUITrigger();
}

export async function transitionToShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	state.gameData.round++;
	updatePlayerGoldIO(BG_CONSTANTS.VICTORY_GOLD_REWARD);

	PrestigeSystem.processVictory();
	PrestigeSystem.finalizeRound();

	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");

	Shop.handleShopOpenUITrigger();
}

export async function transitionToShopPhaseAfterDefeat(): Promise<void> {
	await setupShopPhaseCommon();

	state.gameData.round++;
	PrestigeSystem.finalizeRound();

	console.log("Round", state.gameData.round, "Shop Phase Starting (After Defeat).");

	Shop.handleShopOpenUITrigger();
}

export function handleShopPhaseEnded(): void {
	isInShopPhase = false;
	transitionToCombatPhase();
}

export function endShopPhase(): void {
	isInShopPhase = false;
}
