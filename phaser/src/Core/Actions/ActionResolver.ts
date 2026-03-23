/**
 * Main Action Resolution Dispatcher
 *
 * Routes action requests to specialized handlers based on action type.
 * Handles team updates, recruitment, orb application, and core upgrades.
 */

import { SessionData, ActionPayload } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { validateAndApplyTeamUpdate } from "../SessionManagement";
import { recruitUnit, discardUnit } from "./RecruitmentActions";
import { applyOrb, upgradeCoreMaxLife, upgradeCorepower, decreaseCoresCooldown } from "./OrbAndCoreUpgrades";

/**
 * Resolve a player action and return the updated team.
 * Dispatches to specialized handlers based on action type.
 */
export function resolveAction(
	session: SessionData,
	actionId: string,
	payload?: ActionPayload
): { team: { units: Unit[] }; updates?: string[] } {
	// Handle team repositioning
	if (
		actionId === "update_team" &&
		payload &&
		typeof payload === "object" &&
		"team" in payload &&
		payload.team &&
		typeof payload.team === "object" &&
		"units" in payload.team &&
		Array.isArray(payload.team.units)
	) {
		const { team, valid } = validateAndApplyTeamUpdate(session, payload.team as { units: Unit[] });
		if (!valid) {
			return { team: session.team, updates: ["Rejected invalid team update"] };
		}
		return { team, updates: ["Updated team positioning"] };
	}

	// Make a working copy of the team
	const team = session.team ? JSON.parse(JSON.stringify(session.team)) : { units: [] };
	const units: Unit[] = team.units || [];
	const updates: string[] = [];

	// Recruit or upgrade a unit by card ID
	if (actionId.match(/^[a-z_]+$/) && actionId !== "update_team") {
		const result = recruitUnit(session, actionId);
		if (result.updated) {
			return { team, updates: result.updates };
		}
	}

	// Orb application
	if (actionId === "apply_orb" && payload && "orbId" in payload && "targetUnitId" in payload) {
		const { orbId, targetUnitId } = payload as any;
		const orbUpdates = applyOrb(units, targetUnitId as string, orbId as string);
		return { team, updates: orbUpdates };
	}

	// Discard a unit
	if (actionId === "discard_unit" && payload && "unitId" in payload) {
		const result = discardUnit(units, payload.unitId as string);
		return { team, updates: result.updates };
	}

	// Core upgrades
	if (actionId === "increase_core_max_life") {
		const core = units.find((u) => u.isCore);
		if (core) {
			const update = upgradeCoreMaxLife(core, session.round);
			updates.push(update);
		}
		return { team, updates };
	}

	if (actionId === "upgrade_core_power") {
		const core = units.find((u) => u.isCore);
		if (core) {
			const update = upgradeCorepower(core, session.round);
			updates.push(update);
		}
		return { team, updates };
	}

	if (actionId === "decrease_core_cooldown") {
		const core = units.find((u) => u.isCore);
		if (core) {
			const update = decreaseCoresCooldown(core);
			updates.push(update);
		}
		return { team, updates };
	}

	team.units = units;
	return { team, updates };
}
