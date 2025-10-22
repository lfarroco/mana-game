import { getState } from "@Models/State";
import { delay } from "../../../Utils/animation";
import { cpuForce } from "@Models/Entities/Force";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import { renderVignette } from "../Animations/vignette";
import { clearAll, summon } from "@Systems/Chara/Chara";
import * as HeroShop from "./Shop/HeroShop";
import * as OrbShop from "./Shop/OrbShop";
import { transitionToCombatPhase } from "./CombatPhase";
import * as MoraleDisplay from "../MoraleDisplay";
import { clearRegen } from "./RegenSystem";
import { clearPoison } from "./PoisonDamageSystem";
import * as c from "@Constants/constants";
import * as BoardStatsDisplay from "../BoardStatsDisplay";

export let isInShopPhase: boolean = false;
let heroShopCount: number = 0;
let heroesPurchasedInCurrentShop: number = 0;
let isOrbShop: boolean = false;

async function setupShopPhaseCommon(shouldResummonUnits: boolean = true): Promise<void> {
	const state = getState();
	if (shouldResummonUnits) {
		clearAll();
		state.battleData.units = [];
	}

	const playerForce = state.gameData.player;
	playerForce.morale = playerForce.maxMorale;
	playerForce.shield = 0;
	MoraleDisplay.updateMoraleBar(c.FORCE_ID_PLAYER);
	MoraleDisplay.updateShieldBar(c.FORCE_ID_PLAYER, 0, playerForce.maxMorale);

	cpuForce.morale = cpuForce.maxMorale;
	cpuForce.shield = 0;
	MoraleDisplay.updateMoraleBar(c.FORCE_ID_CPU);
	MoraleDisplay.updateShieldBar(c.FORCE_ID_CPU, 0, cpuForce.maxMorale);

	clearRegen(c.FORCE_ID_PLAYER);
	clearRegen(c.FORCE_ID_CPU);
	clearPoison(c.FORCE_ID_PLAYER);
	clearPoison(c.FORCE_ID_CPU);

	BoardStatsDisplay.updateStats(c.FORCE_ID_PLAYER);
	BoardStatsDisplay.updateStats(c.FORCE_ID_CPU);

	if (shouldResummonUnits) {
		const summonPromises = state.gameData.player.units
			.map(async (unit, index) => {
				await delay(index * 200);
				await summon(unit, true);
			});
		await Promise.all(summonPromises);
	}

	isInShopPhase = true;
	BoardStatsDisplay.hideCpuStats();
}


export async function initializeShopPhase(): Promise<void> {
	await setupShopPhaseCommon(true);

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Initial Setup).");

	heroShopCount = 1;
	heroesPurchasedInCurrentShop = 0;
	isOrbShop = false;

	HeroShop.handleShopOpenUITrigger("Skip");
}

export async function transitionToShopPhase(): Promise<void> {
	await setupShopPhaseCommon(true);

	PrestigeSystem.processVictory();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");

	heroShopCount = 1;
	heroesPurchasedInCurrentShop = 0;
	isOrbShop = false;

	HeroShop.handleShopOpenUITrigger("Skip");
}

export async function transitionToShopPhaseAfterDefeat(): Promise<void> {
	await setupShopPhaseCommon(true);

	PrestigeSystem.processDefeat();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (After Defeat).");

	const player = state.gameData.player;
	if (player.prestige <= 0) {
		await renderVignette({ message: `Game Over! You were defeated in ${player.round} rounds` });
		return;
	}

	heroShopCount = 1;
	heroesPurchasedInCurrentShop = 0;
	isOrbShop = false;

	HeroShop.handleShopOpenUITrigger("Skip");
}

export async function transitionToNextShopPhase(): Promise<void> {
	await setupShopPhaseCommon(false);

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase", heroShopCount, "Starting.");

	heroesPurchasedInCurrentShop = 0;
	const buttonText = heroShopCount < 3 ? "Skip" : "Next Orb Shop";
	HeroShop.handleShopOpenUITrigger(buttonText);
}

export async function transitionToOrbShopPhase(): Promise<void> {
	await setupShopPhaseCommon(false);

	const state = getState();
	console.log("Round", state.gameData.round, "Orb Shop Phase Starting.");

	isOrbShop = true;

	OrbShop.handleShopOpenUITrigger("Next Skill Shop");
}


export function handleShopPhaseEnded(): void {
	isInShopPhase = false;
	if (!isOrbShop) {
		if (heroShopCount < 3) {
			heroShopCount++;
			transitionToNextShopPhase();
		} else {
			isOrbShop = true;
			transitionToOrbShopPhase();
		}
	} else {
		transitionToCombatPhase();
	}
}

export function handleHeroPurchase(): boolean {
	heroesPurchasedInCurrentShop++;

	// Close shop and move to next phase after purchasing 1 hero
	// Player can only buy 1 hero per hero shop phase, or skip
	return true; // Close shop and move to next phase
}

export function endShopPhase(): void {
	isInShopPhase = false;
}
