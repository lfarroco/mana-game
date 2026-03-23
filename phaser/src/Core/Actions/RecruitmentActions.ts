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
 * Apply rank-up bonuses to a unit.
 * Increases maxLife and power by 1.5x per rank level above 1.
 */
function applyRankUpBonuses(unit: Unit, targetRank: number): void {
	const extraLevels = targetRank - 1;
	for (let i = 0; i < extraLevels; i++) {
		unit.maxLife = Math.floor(unit.maxLife * 1.5);
		unit.life = unit.maxLife;
		unit.power = Math.floor(unit.power * 1.5);
	}
}

/**
 * Get the last encounter action ID from the previous step.
 */
function getLastEncounterActionId(session: SessionData): string | null {
	const previousStep = session.step - 1;
	const encounterActions = session.action_log.filter(
		(a) => a.round === session.round && a.step === previousStep && a.phase === "encounter"
	);
	const lastEncounterAction = encounterActions[encounterActions.length - 1];
	return lastEncounterAction ? lastEncounterAction.actionId : null;
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
				const encounterId = getLastEncounterActionId(session);
				const targetRank = getRecruitmentTargetRank(encounterId);

				if (targetRank > 1) {
					newUnit.rank = targetRank;
					applyRankUpBonuses(newUnit, targetRank);
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
