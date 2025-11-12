import { getState } from "@Models/State";
import * as CombatPhase from "./Systems/CombatPhase";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as OrbShop from "./Systems/Shop/OrbShop";
import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import { clearPoison } from "./Systems/PoisonDamageSystem";
import { clearRegen } from "./Systems/RegenSystem";
import { destroyBlackHole } from "./BlackHole";
import { destroyForceStats } from "./ForceStats";

const hourAction: Record<number, string> = {
	0: 'shop-core',
	1: 'shop',
	2: 'shop',
	3: 'shop',
	4: 'combat',
	//3: 'orb',
};

export async function startPhase() {
	const currentPhase = hourAction[getState().gameData.hour];

	switch (currentPhase) {
		case 'shop-core':
			HeroShop.openCoreShop();
			break;
		case 'shop':
			HeroShop.open();
			break;
		case 'orb':
			OrbShop.open();
			break;
		case 'combat':
			CombatPhase.transitionToCombatPhase();
			break;
		default:
			break;
	}
}

export function handlePhaseEnded(): void {

	const currentPhase = hourAction[getState().gameData.hour];

	if (currentPhase === 'combat') {
		destroyBlackHole();
		destroyForceStats(c.FORCE_ID_CPU);
		destroyForceStats(c.FORCE_ID_PLAYER);
	}

	getState().gameData.hour++;

	if (getState().gameData.hour > Object.keys(hourAction).length - 1) {
		getState().gameData.hour = 1;
	}

	startPhase();
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
		const summonPromises = state.gameData.player.units
			.map(async (unit, index) => {
				await delay(index * 200);
				await summon(unit, true);
			});
		await Promise.all(summonPromises);
	}

}

