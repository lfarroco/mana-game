import { getState } from "@Models/State";
import { delay } from "../../../Utils/animation";
import { cpuForce } from "@Models/Entities/Force";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import { renderVignette } from "../Animations/vignette";
import { clearAll, summon } from "@Systems/Chara/Chara";
import * as HeroShop from "./Shop/HeroShop";
import * as OrbShop from "./Shop/OrbShop";
import * as SkillShop from "./Shop/SkillShop";
import { transitionToCombatPhase } from "./CombatPhase";
import * as ForceSkillsDisplay from "@UI/ForceSkillsDisplay";
import * as MoraleDisplay from "../MoraleDisplay";
import { clearRegen } from "./RegenSystem";
import { clearPoison } from "./PoisonDamageSystem";
import * as c from "../../../constants/constants";
import * as BoardStatsDisplay from "../BoardStatsDisplay";

export let isInShopPhase: boolean = false;
let heroShopCount: number = 0;
let isOrbShop: boolean = false;
let isSkillShop: boolean = false;

async function setupShopPhaseCommon(): Promise<void> {
	const state = getState();
	clearAll();
	state.battleData.units = [];

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

	const summonPromises = state.gameData.player.units
		.map(async (unit, index) => {
			await delay(index * 200);
			await summon(unit, true);
		});
	await Promise.all(summonPromises);

	ForceSkillsDisplay.hideCpuSkills();

	isInShopPhase = true;
	BoardStatsDisplay.hideCpuStats();
}


export async function initializeShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Initial Setup).");

	heroShopCount = 1;
	isOrbShop = false;
	isSkillShop = false;

	HeroShop.handleShopOpenUITrigger("Next Shop");
}

export async function transitionToShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	PrestigeSystem.processVictory();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");

	heroShopCount = 1;
	isOrbShop = false;
	isSkillShop = false;

	HeroShop.handleShopOpenUITrigger("Next Shop");
}

export async function transitionToShopPhaseAfterDefeat(): Promise<void> {
	await setupShopPhaseCommon();

	PrestigeSystem.processDefeat();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (After Defeat).");

	const player = state.gameData.player;
	if (player.prestige <= 0) {
		await renderVignette({ message: `Game Over! You were defeated in ${player.round} rounds.` });
		return;
	}

	heroShopCount = 1;
	isOrbShop = false;
	isSkillShop = false;

	HeroShop.handleShopOpenUITrigger("Next Shop");
}

export async function transitionToNextShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase", heroShopCount, "Starting.");

	const buttonText = heroShopCount < 3 ? "Next Shop" : "Next Orb Shop";
	HeroShop.handleShopOpenUITrigger(buttonText);
}

export async function transitionToOrbShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	const state = getState();
	console.log("Round", state.gameData.round, "Orb Shop Phase Starting.");

	isOrbShop = true;

	OrbShop.handleShopOpenUITrigger("Next Skill Shop");
}

export async function transitionToSkillShopPhase(): Promise<void> {
	await setupShopPhaseCommon();

	const state = getState();
	console.log("Round", state.gameData.round, "Skill Shop Phase Starting.");

	isSkillShop = true;

	SkillShop.handleShopOpenUITrigger("Next Round");
}

export function handleShopPhaseEnded(): void {
	isInShopPhase = false;
	if (!isOrbShop && !isSkillShop) {
		if (heroShopCount < 3) {
			heroShopCount++;
			transitionToNextShopPhase();
		} else {
			isOrbShop = true;
			transitionToOrbShopPhase();
		}
	} else if (isOrbShop && !isSkillShop) {
		isSkillShop = true;
		transitionToSkillShopPhase();
	} else {
		transitionToCombatPhase();
	}
}

export function endShopPhase(): void {
	isInShopPhase = false;
}
