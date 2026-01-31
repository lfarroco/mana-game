import { actionRegistry, ActionRegistry } from "./ActionRegistry";
import { phaseManager, PhaseManager } from "./PhaseManager";
import { phaseValidator } from "./PhaseValidator";
import { EncounterPhaseHandler } from "./handlers/EncounterPhaseHandler";
import { ShopPhaseHandler } from "./handlers/ShopPhaseHandler";
import { OrbShopPhaseHandler } from "./handlers/OrbShopPhaseHandler";
import { CombatPhaseHandler } from "./handlers/CombatPhaseHandler";
import { UpgradeCorePhaseHandler } from "./handlers/UpgradeCorePhaseHandler";
import { AddReactionCorePhaseHandler } from "./handlers/AddReactionCorePhaseHandler";
import { MetaActionHandler } from "./handlers/MetaActionHandler";

// Register all handlers
// Order matters for priority. MetaActionHandler checks action type, so it should be checked early if we want it to override phase logic for meta actions.
phaseManager.register(new MetaActionHandler());
phaseManager.register(new EncounterPhaseHandler());
phaseManager.register(new ShopPhaseHandler());
phaseManager.register(new OrbShopPhaseHandler());
phaseManager.register(new CombatPhaseHandler());
phaseManager.register(new UpgradeCorePhaseHandler());
phaseManager.register(new AddReactionCorePhaseHandler());

export * from "./types";
export {
	phaseManager,
	PhaseManager,
	actionRegistry,
	ActionRegistry,
	phaseValidator
};
