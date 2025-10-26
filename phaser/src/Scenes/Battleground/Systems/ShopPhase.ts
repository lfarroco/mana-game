import { getState } from "@Models/State";
import { delay } from "@Utils/animation";
import { cpuForce } from "@Models/Entities/Force";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import { renderVignette } from "../Animations/vignette";
import { clearAll, summon } from "@Systems/Chara/Chara";
import * as HeroShop from "./Shop/HeroShop";
import * as OrbShop from "./Shop/OrbShop";
import * as MoraleDisplay from "../MoraleDisplay";
import { clearRegen } from "./RegenSystem";
import { clearPoison } from "./PoisonDamageSystem";
import * as c from "@Constants/constants";
import * as BoardStatsDisplay from "../BoardStatsDisplay";

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

	BoardStatsDisplay.hideCpuStats();
}


export async function initializeShopPhase(): Promise<void> {
	await setupShopPhaseCommon(true);

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Initial Setup).");

	//HeroShop.handleShopOpenUITrigger();
}

export async function transitionToNextPhaseAfterVictory(): Promise<void> {
	await setupShopPhaseCommon(true);

	PrestigeSystem.processVictory();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");


	//HeroShop.handleShopOpenUITrigger();
}

export async function transitionToNextPhaseAfterDefeat(): Promise<void> {
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

	//HeroShop.handleShopOpenUITrigger();
}

export async function transitionToNextShopPhase(): Promise<void> {
	await setupShopPhaseCommon(false);

	console.log("Round", getState(), "Shop Phase", "Starting.");

	HeroShop.open();
}

export async function transitionToOrbShopPhase(): Promise<void> {
	await setupShopPhaseCommon(false);

	const state = getState();
	console.log("Round", state.gameData.round, "Orb Shop Phase Starting.");

	OrbShop.open();
}



