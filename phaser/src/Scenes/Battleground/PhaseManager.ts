import { getState } from "@Models/State";
import * as CombatPhase from "./Systems/CombatPhase";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as OrbShop from "./Systems/Shop/OrbShop";
import * as c from "@Constants/constants";
import { cpuForce } from "@Models/Entities/Force";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import * as BoardStatsDisplay from "./BoardStatsDisplay";
import * as MoraleDisplay from "./MoraleDisplay";
import { clearPoison } from "./Systems/PoisonDamageSystem";
import { clearRegen } from "./Systems/RegenSystem";

export const hourAction: Record<number, string> = {
	0: 'shop-core',
	1: 'shop',
	2: 'shop',
	3: 'orb',
	4: 'combat',
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

	getState().gameData.hour++;

	if (getState().gameData.hour > Object.keys(hourAction).length - 1) {
		getState().gameData.hour = 0;
	}

	startPhase();
}

export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {
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

