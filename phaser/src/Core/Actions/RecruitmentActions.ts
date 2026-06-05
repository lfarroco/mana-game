/**
 * Unit Recruitment and Removal Actions
 *
 * Handles unit recruitment from shops and discarding of player units.
 * Pure functions that return updated unit arrays and status messages.
 */

import { PhaseOption, SessionData } from "@Core/Types";
import { Unit, makeUnit } from "@Models/Entities/Unit";
import * as Card from "@Models/Entities/Card";
import * as BoardLogic from "@Models/BoardLogic";
import { FORCE_ID_PLAYER } from "@Core/Combat/CombatConstants";

/**
 * Determine the recruit rank encoded in the current shop option.
 */
function getShopRecruitRank(session: SessionData, cardId: string): number {
	if (session.phase !== "shop" || !session.current_options) {
		return 1;
	}

	const selectedOption = session.current_options.find(
		(option): option is PhaseOption & { recruitRank?: number } => option.id === cardId
	);

	return selectedOption?.recruitRank ?? 1;
}

/**
 * Recruit a new unit from a shop card.
 * If the card already exists in the team, upgrade it instead.
 * Returns { updated: boolean, unit?: Unit, updates: string[] }
 */
export function recruitUnit(
	session: SessionData,
	cardId: string,
	targetPosition: { x: number; y: number } | null
): {
	updated: boolean;
	unit?: Unit;
	updates: string[];
} {
	const allCards = Card.getNonCores();
	const card = allCards.find((c) => c.id === cardId);

	if (!card) {
		return { updated: false, updates: [`Card ${cardId} not found`] };
	}

	const team = session.team || { units: [] };
	const units = team.units || [];
	const updates: string[] = [];

	const existingUnitIndex = units.findIndex((u: Unit) => u.cardId === cardId);
	if (existingUnitIndex >= 0) {
		const existingUnit = units[existingUnitIndex];
		if (existingUnit.rank < 4) {
			existingUnit.rank++;
			existingUnit.maxLife = Math.floor(existingUnit.maxLife * 1.5);
			existingUnit.life = existingUnit.maxLife;
			existingUnit.power = Math.floor(existingUnit.power * 1.5);
			updates.push(`Upgraded unit ${cardId} to rank ${existingUnit.rank}`);
			return { updated: true, unit: existingUnit, updates };
		}
	} else {
		if (units.length < 9) {
			let targetPos = BoardLogic.getEmptySlot(units, FORCE_ID_PLAYER);

			if (targetPosition) {
				const isWithinBounds =
					targetPosition.x >= 0 &&
					targetPosition.x <= 2 &&
					targetPosition.y >= 0 &&
					targetPosition.y <= 2;

				if (!isWithinBounds) {
					return { updated: false, updates: ["Invalid target slot"] };
				}

				const occupied = units.some(
					(unit) =>
						unit.force === FORCE_ID_PLAYER &&
						unit.position.x === targetPosition.x &&
						unit.position.y === targetPosition.y
				);

				if (occupied) {
					return { updated: false, updates: ["Target slot occupied"] };
				}

				targetPos = targetPosition;
			}

			if (targetPos) {
				const newUnit = makeUnit(FORCE_ID_PLAYER, cardId, targetPos);
				const recruitRank = getShopRecruitRank(session, cardId);
				newUnit.rank = recruitRank;

				if (recruitRank > 1) {
					updates.push(`Recruited unit ${cardId} at Rank ${newUnit.rank}`);
				}

				units.push(newUnit);
				if (!session.runStats) {
					session.runStats = {
						damageDealt: 0,
						poisonDealt: 0,
						shieldDealt: 0,
						regenDealt: 0,
						healDealt: 0,
						mostPowerfulUnit: null,
						totalUnitsRecruited: 0,
						unitUsage: {},
					};
				}
				session.runStats.totalUnitsRecruited += 1;
				session.runStats.unitUsage[cardId] = (session.runStats.unitUsage[cardId] || 0) + 1;
				updates.push(`Added new unit ${cardId}`);
				return { updated: true, unit: newUnit, updates };
			}
		}
	}

	return { updated: false, updates };
}

/**
 * Discard a unit from the player's team (if it's not the core).
 */
export function discardUnit(
	units: Unit[],
	unitId: string
): { updated: boolean; updates: string[] } {
	const unitIndex = units.findIndex((u: Unit) => u.id === unitId);
	if (unitIndex >= 0) {
		const unit = units[unitIndex];
		if (!unit.isCore) {
			units.splice(unitIndex, 1);
			return { updated: true, updates: [`Discarded unit ${unitId}`] };
		}
	}

	return { updated: false, updates: ["Unit not found or is core"] };
}
