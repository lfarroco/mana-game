/**
 * Main Action Resolution Dispatcher
 *
 * Routes action requests to specialized handlers based on action type.
 * Handles team updates, recruitment, orb application, and core upgrades.
 */

import * as Types from "@Core/Types";
import * as Unit from "@Models/Entities/Unit";
import * as SessionManagement from "../SessionManagement";
import * as RecruitmentActions from "./RecruitmentActions";
import * as OrbAndCoreUpgrades from "./OrbAndCoreUpgrades";

/**
 * Resolve a player action and return the updated team.
 * Dispatches to specialized handlers based on action type.
 */
export function resolveAction(
	session: Types.SessionData,
	actionId: string,
	payload?: Types.ActionPayload
): { team: { units: Unit.Unit[] }; updates?: string[] } {
	const targetSlotToPosition = (targetSlot: number): { x: number; y: number } | null => {
		if (!Number.isInteger(targetSlot) || targetSlot < 0 || targetSlot > 8) {
			return null;
		}

		return {
			x: targetSlot % 3,
			y: Math.floor(targetSlot / 3),
		};
	};

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
		const { team, valid } = SessionManagement.validateAndApplyTeamUpdate(session, payload.team as { units: Unit.Unit[] });
		if (!valid) {
			return { team: session.team, updates: ["Rejected invalid team update"] };
		}
		return { team, updates: ["Updated team positioning"] };
	}

	// Make a working copy of the team
	const team = session.team ? JSON.parse(JSON.stringify(session.team)) : { units: [] };
	const units: Unit.Unit[] = team.units || [];
	const updates: string[] = [];

	// Recruit or upgrade a unit by card ID
	// Pass a session variant that uses the deep-copied team so recruitUnit mutates our copy.
	if (actionId.match(/^[a-z_]+$/) && actionId !== "update_team") {
		const sessionWithCopy = { ...session, team };
		const targetPosition =
			// wtf
			payload && typeof payload === "object" && "targetSlot" in payload
				? targetSlotToPosition(payload.targetSlot as number)
				: null;
		const result = RecruitmentActions.recruitUnit(sessionWithCopy, actionId, targetPosition);
		if (result.updated) {
			return { team, updates: result.updates };
		}
	}

	// Orb application
	if (actionId === "apply_orb" && payload && "orbId" in payload && "targetUnitId" in payload) {
		const { orbId, targetUnitId } = payload;
		const orbUpdates = OrbAndCoreUpgrades.applyOrb(units, targetUnitId as string, orbId as string);
		return { team, updates: orbUpdates };
	}

	// Discard a unit
	if (actionId === "discard_unit" && payload && "unitId" in payload) {
		const result = RecruitmentActions.discardUnit(units, payload.unitId as string);
		return { team, updates: result.updates };
	}

	// Core upgrades
	if (actionId === "increase_core_max_life") {
		const core = units.find((u) => u.isCore);
		if (core) {
			const update = OrbAndCoreUpgrades.upgradeCoreMaxLife(core, session.round);
			updates.push(update);
		}
		return { team, updates };
	}

	if (actionId === "upgrade_core_power") {
		const core = units.find((u) => u.isCore);
		if (core) {
			const update = OrbAndCoreUpgrades.upgradeCorepower(core, session.round);
			updates.push(update);
		}
		return { team, updates };
	}

	if (actionId === "decrease_core_cooldown") {
		const core = units.find((u) => u.isCore);
		if (core) {
			const update = OrbAndCoreUpgrades.decreaseCoresCooldown(core);
			updates.push(update);
		}
		return { team, updates };
	}

	team.units = units;
	return { team, updates };
}
