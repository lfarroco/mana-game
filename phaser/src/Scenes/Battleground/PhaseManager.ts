import { getState } from "@Models/State";
import * as CombatPhase from "./Systems/CombatPhase";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as OrbShop from "./Systems/Shop/OrbShop";
import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import { clearPoison } from "./Systems/PoisonDamageSystem";
import { clearRegen } from "./Systems/RegenSystem";
import { destroyForceStats } from "./ForceStats";
import * as Encounter from "./Systems/Encounter";
import { saveGameData } from "../../Game/effects/saveGameData";

export const hourAction: string[] = [
	"shop-core",
	"encounter",
	"encounter",
	"encounter",
	"combat",
	"upgrade_orb"
];

export async function startPhase(phase: string) {

	switch (phase) {
		case "shop-core":
			HeroShop.openCoreShop();
			break;
		case "shop":
			await HeroShop.openHeroShop();
			handlePhaseEnded();
			break;
		case "orb":
			OrbShop.openOrbShop();
			break;
		case "combat":
			CombatPhase.transitionToCombatPhase();
			break;
		case "encounter":
			Encounter.open();
			break;
		case "upgrade_orb":
			await OrbShop.openOrbShop(
				[
					"increase_core_max_life",
					"decrease_core_cooldown",
					"add_core_random_reaction"
				]
			);
			handlePhaseEnded();
			break;
		default:
			break;
	}
}

export function handlePhaseEnded(): void {
	const currentPhase = hourAction[getState().gameData.hour];

	// TODO: the combat phase itself should do this, when it ends
	if (currentPhase === "combat") {
		destroyForceStats(c.FORCE_ID_CPU);
		destroyForceStats(c.FORCE_ID_PLAYER);
	}

	getState().gameData.hour++;

	if (getState().gameData.hour > hourAction.length - 1) {
		getState().gameData.hour = 1;
	}

	const phase = hourAction[getState().gameData.hour];

	saveGameData();

	startPhase(phase);
}

export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {
	const state = getState();
	if (shouldResummonUnits) {
		clearAll();
		state.battleData.units = [];
	}

	clearRegen(c.FORCE_ID_PLAYER);
	clearRegen(c.FORCE_ID_CPU);
	clearPoison(c.FORCE_ID_PLAYER);
	clearPoison(c.FORCE_ID_CPU);

	if (shouldResummonUnits) {
		const summonPromises = state.gameData.player.units.map(async (unit, index) => {
			await delay(index * 200);
			await summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}
