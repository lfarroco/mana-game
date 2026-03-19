export * as Loader from "@Systems/Loader";
export * as Regen from "@Systems/RegenSystem";
export * as CombatStatsTracker from "@Systems/CombatStatsTracker";
export * as Poison from "@Systems/PoisonDamageSystem";
export * as Timeout from "@Systems/TimeoutDamageSystem";
export * as CombatPhase from "@Systems/CombatPhase";
export * as ResultsPhase from "@Systems/ResultsPhase";
export * as Setup from "@Systems/Setup";
export * as CountdownTimer from "@Systems/CountdownTimer";

// Export Shop with backward compatibility extensions
import * as ShopModule from "@Systems/Shop";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("BattlegroundSystems");
export const Shop = {
	...ShopModule,
	HeroShop: {
		...ShopModule.HeroShop,
		getShopCharaBySlot: (_: number) => {
			logger.warn("getShopCharaBySlot is deprecated - use new event-driven shop system");
			return null;
		},
		getDisplayedHeroCardDefinitions: () => {
			logger.warn(
				"getDisplayedHeroCardDefinitions is deprecated - use new event-driven shop system"
			);
			return [];
		},
	},
};
