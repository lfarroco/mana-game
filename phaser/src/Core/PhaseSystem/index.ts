import { actionRegistry, ActionRegistryApi } from "@Core/PhaseSystem/ActionRegistry";
import { phaseManager, PhaseManagerApi } from "@Core/PhaseSystem/PhaseManager";
import { phaseValidator } from "@Core/PhaseSystem/PhaseValidator";
import { encounterPhaseHandler } from "@Core/PhaseSystem/handlers/EncounterPhaseHandler";
import { shopPhaseHandler } from "@Core/PhaseSystem/handlers/ShopPhaseHandler";
import { orbShopPhaseHandler } from "@Core/PhaseSystem/handlers/OrbShopPhaseHandler";
import { combatPhaseHandler } from "@Core/PhaseSystem/handlers/CombatPhaseHandler";
import { upgradeCorePhaseHandler } from "@Core/PhaseSystem/handlers/UpgradeCorePhaseHandler";
import { addReactionCorePhaseHandler } from "@Core/PhaseSystem/handlers/AddReactionCorePhaseHandler";
import { metaActionHandler } from "@Core/PhaseSystem/handlers/MetaActionHandler";

// Register all handlers
// Order matters for priority. MetaActionHandler checks action type, so it should be checked early if we want it to override phase logic for meta actions.
phaseManager.register(metaActionHandler);
phaseManager.register(encounterPhaseHandler);
phaseManager.register(shopPhaseHandler);
phaseManager.register(orbShopPhaseHandler);
phaseManager.register(combatPhaseHandler);
phaseManager.register(upgradeCorePhaseHandler);
phaseManager.register(addReactionCorePhaseHandler);

export type * from "@Core/PhaseSystem/types";
export { phaseManager, actionRegistry, phaseValidator };
export type { PhaseManagerApi, ActionRegistryApi };
