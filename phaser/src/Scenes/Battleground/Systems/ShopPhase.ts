import { getState } from "@Models/State";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import { renderVignette } from "../Animations/vignette";
import * as OrbShop from "./Shop/OrbShop";
import { resetBoard } from "../PhaseManager";

//TODO: motve to combat phase
export async function transitionToNextPhaseAfterVictory(): Promise<void> {
	await resetBoard(true);

	PrestigeSystem.processVictory();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");


	//HeroShop.handleShopOpenUITrigger();
}

//TODO: motve to combat phase
export async function transitionToNextPhaseAfterDefeat(): Promise<void> {
	await resetBoard(true);

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


export async function transitionToOrbShopPhase(): Promise<void> {
	await resetBoard(false);

	const state = getState();
	console.log("Round", state.gameData.round, "Orb Shop Phase Starting.");

	OrbShop.open();
}



