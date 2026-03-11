import { actionRegistry, ActionRegistryApi } from "./ActionRegistry";
import { phaseManager, PhaseManagerApi } from "./PhaseManager";
import { phaseValidator } from "./PhaseValidator";
import { encounterPhaseHandler } from "./handlers/EncounterPhaseHandler";
import { shopPhaseHandler } from "./handlers/ShopPhaseHandler";
import { orbShopPhaseHandler } from "./handlers/OrbShopPhaseHandler";
import { combatPhaseHandler } from "./handlers/CombatPhaseHandler";
import { upgradeCorePhaseHandler } from "./handlers/UpgradeCorePhaseHandler";
import { addReactionCorePhaseHandler } from "./handlers/AddReactionCorePhaseHandler";
import { metaActionHandler } from "./handlers/MetaActionHandler";

// Register all handlers
// Order matters for priority. MetaActionHandler checks action type, so it should be checked early if we want it to override phase logic for meta actions.
phaseManager.register(metaActionHandler);
phaseManager.register(encounterPhaseHandler);
phaseManager.register(shopPhaseHandler);
phaseManager.register(orbShopPhaseHandler);
phaseManager.register(combatPhaseHandler);
phaseManager.register(upgradeCorePhaseHandler);
phaseManager.register(addReactionCorePhaseHandler);

export type * from "./types";
export {
	phaseManager,
	actionRegistry,
	phaseValidator,
};
export type {
	PhaseManagerApi,
	ActionRegistryApi,
};
