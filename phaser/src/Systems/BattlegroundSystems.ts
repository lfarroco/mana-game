export * as Loader from "./Loader";
export * as Regen from "./RegenSystem";
export * as CombatStatsTracker from "./CombatStatsTracker";
export * as Poison from "./PoisonDamageSystem";
export * as Timeout from "./TimeoutDamageSystem";
export * as CombatPhase from "./CombatPhase";
export * as ResultsPhase from "./ResultsPhase";
export * as Setup from "./Setup";
export * as CountdownTimer from "./CountdownTimer";

// Export Shop with backward compatibility extensions
import * as ShopModule from "./Shop";
export const Shop = {
	...ShopModule,
	HeroShop: {
		...ShopModule.HeroShop,
		getShopCharaBySlot: (slotIndex: number) => {
			console.warn("getShopCharaBySlot is deprecated - use new event-driven shop system");
			return null;
		},
		getDisplayedHeroCardDefinitions: () => {
			console.warn("getDisplayedHeroCardDefinitions is deprecated - use new event-driven shop system");
			return [];
		}
	}
};
