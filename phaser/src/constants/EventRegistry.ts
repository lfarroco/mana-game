import { OptionsSystemEventPayloads } from "../Systems/OptionsSystem/events";
import { Unit } from "../Models/Entities/Unit";

// Core events that are always present
export interface CoreEventPayloads {
	// Shop / Unit Acquisition Events
	"unit_purchased": void;
	"purchase_failed": { unitName: string; reason: string; cost?: number };
	"shop_phase_ended": void;

	// Combat Flow Events
	"combat_ended_victory": { enemiesDefeated: Unit[] };
	"combat_ended_defeat": void;

	// Battle Setup
	"battle_start_setup_complete": void;

	// Other core events (to be extracted later)
	"unit_attack": { unit: Unit };
	"unit_shield_gained": { unit: Unit; amount: number };
	"unit_morale_restored": { unit: Unit; amount: number };
}

// Combined event payloads from all systems
export interface AllEventPayloads extends
	CoreEventPayloads,
	OptionsSystemEventPayloads
// Add other system event payloads here as they're modularized
{ }

// Re-export system event constants for convenience
export { OptionsSystemEvents } from "../Systems/OptionsSystem/events";
