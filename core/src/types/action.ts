/**
 * Action types — player actions, phase options, and action responses.
 */

import type { CombatState } from "./combat";
import type { SessionData } from "./session";
import type { Unit } from "./unit";

// FIXME: PhaseOption union is too permissive — the generic branch accepts any
// string id. Consider a discriminated union with known encounter/shop types.
export type PhaseOption =
	| { id: string; cost?: number; label?: string; recruitRank?: number }
	| { id: "start_combat" };

export type Action =
	| { type: "skip" }
	| { type: "apply_orb"; orbId: string; targetUnitId: string }
	| { type: "increase_core_max_life" }
	| { type: "upgrade_core_power" }
	| { type: "decrease_core_cooldown" }
	| { type: "discard_unit"; unitId: string }
	| { type: "recruit_unit"; unitId: string; targetSlot: [number, number] | null }
	| { type: "update_team"; team: { units: Unit[] } }
	| { type: "start_combat" }
	| { type: "end_combat" }
	| { type: "select_encounter"; encounterId: string }
	| { type: "victory" };

/**
 * Result of an action dispatch.
 * Carries updated session and optional phase-specific data (e.g., combat results).
 */
export type ActionResponse = {
	session: SessionData;
	combatState?: CombatState;
};