/**
 * Unit Recruitment and Removal Actions
 *
 * Handles unit recruitment from shops and discarding of player units.
 * Pure functions that return updated unit arrays and status messages.
 */

import { SessionData } from "@Core/Types";
import { Unit, makeUnit } from "@Models/Entities/Unit";
import * as Card from "@Models/Entities/Card";
import * as BoardLogic from "@Models/BoardLogic";
import { FORCE_ID_PLAYER } from "@Core/Combat/CombatConstants";

/**
 * Determine the target rank for a recruited unit based on the shop type.
 */
function getRecruitmentTargetRank(encounterId: string | null): number {
	if (encounterId === "silver_shop") return 2;
	if (encounterId === "gold_shop") return 3;
	return 1;
}

/**
 * Apply rank-up bonuses to a unit for extra levels above its current base rank.
 * Silver/gold shop cards already carry their own tiered base stats in the card definition,
 * so this helper is only for additional upgrades beyond that base tier.
 */
function applyRankUpBonuses(unit: Unit, additionalLevels: number): void {
	const rankMultiplier = 1.75;
	for (let i = 0; i < additionalLevels; i++) {
		unit.maxLife = Math.floor(unit.maxLife * rankMultiplier);
		unit.life = unit.maxLife;
		unit.power = Math.floor(unit.power * rankMultiplier);
	}
}

/**
 * Get the encounter that produced the currently open shop, if any.
 */
function getActiveShopSourceEncounterId(session: SessionData): string | null {
	if (session.phase !== "shop" || !session.current_options || Array.isArray(session.current_options)) {
		return null;
	}

	return typeof session.current_options.sourceEncounterId === "string"
		? session.current_options.sourceEncounterId
		: null;
}

/**
 * Recruit a new unit from a shop card.
 * If the card already exists in the team, upgrade it instead.
 * Returns { updated: boolean, unit?: Unit, updates: string[] }
 */
export function recruitUnit(session: SessionData, cardId: string): {
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
			const targetPos = BoardLogic.getEmptySlot(units, FORCE_ID_PLAYER);
			if (targetPos) {
				const newUnit = makeUnit(FORCE_ID_PLAYER, cardId, targetPos);
				const encounterId = getActiveShopSourceEncounterId(session);
				const targetRank = getRecruitmentTargetRank(encounterId);
				const currentRank = newUnit.rank || 1;

				if (targetRank > currentRank) {
					applyRankUpBonuses(newUnit, targetRank - currentRank);
					newUnit.rank = targetRank;
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
