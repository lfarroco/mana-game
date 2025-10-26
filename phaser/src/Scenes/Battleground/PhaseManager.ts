import { getState } from "@Models/State";
import { transitionToCombatPhase } from "./Systems/CombatPhase";
import { transitionToOrbShopPhase } from "./Systems/ShopPhase";
import * as HeroShop from "./Systems/Shop/HeroShop";

export const hourAction: Record<number, string> = {
	0: 'shop',
	1: 'shop',
	2: 'shop',
	3: 'orb',
	4: 'combat'
};

export async function startPhase() {
	const nextPhase = hourAction[getState().gameData.hour];

	switch (nextPhase) {
		case 'shop':
			HeroShop.open();
			break;
		case 'orb':

			transitionToOrbShopPhase();
			break;
		case 'combat':
			transitionToCombatPhase();
			break;
		default:
			break;
	}
}
export function handlePhaseEnded(): void {

	getState().gameData.hour++;

	startPhase();
}

