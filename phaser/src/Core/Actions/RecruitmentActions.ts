/**
 * Unit Recruitment and Removal Actions
 *
 * Handles unit recruitment from shops and discarding of player units.
 * Pure functions that return updated unit arrays and status messages.
 */

import * as Models from "@Core/Models";
import * as Unit from "@Models/Entities/Unit";
import * as Card from "@Models/Entities/Card";
import * as BoardLogic from "@Models/BoardLogic";
import * as CombatConstants from "@Core/Combat/CombatConstants";
import * as Logger from "@Utils/Logger";


/**
 * Determine the recruit rank encoded in the current shop option.
 */
function getShopRecruitRank(session: Models.SessionData, cardId: string): number {
	if (session.phase !== "shop" || !session.options) {
		return 1;
	}

	const selectedOption = session.options.find(
		(option): option is Models.PhaseOption & { recruitRank?: number } => option.id === cardId
	);

	return selectedOption?.recruitRank ?? 1;
}

/**
 * Recruit a new unit from a shop card.
 * If the card already exists in the team, upgrade it instead.
 * Returns { updated: boolean, unit?: Unit, updates: string[] }
 */
export function recruitUnit(
	session: Models.SessionData,
	cardId: string,
	targetPosition: Vec2 | null
): Models.SessionData {
	const allCards = Card.getNonCores();
	const card = allCards.find((c) => c.id === cardId);

	if (!card) {
		Logger.error("recruitmentActions", `Card with ID ${cardId} not found for recruitment`);
		return session;
	}

	const team = session.team
	const units = team.units

	const existingUnitIndex = units.findIndex((u: Unit.Unit) => u.cardId === cardId);
	if (existingUnitIndex >= 0) {
		Logger.debug("recruitmentActions", `Unit with card ID ${cardId} already exists, attempting upgrade`);

		const existingUnit = units[existingUnitIndex];
		if (existingUnit.rank < 4) {
			Logger.debug("recruitmentActions", `Upgrading unit ${existingUnit.id} from Rank ${existingUnit.rank} to Rank ${existingUnit.rank + 1}`);

			existingUnit.rank++;
			existingUnit.maxLife = Math.floor(existingUnit.maxLife * 1.5);
			existingUnit.life = existingUnit.maxLife;
			existingUnit.power = Math.floor(existingUnit.power * 1.5);
			const updatedUnits = session.team.units.map((u, idx) => (idx === existingUnitIndex ? existingUnit : u));
			return {
				...session,
				team: {
					...session.team,
					units: updatedUnits
				}
			}
		}
	}

	if (units.length < 9) {
		Logger.debug("recruitmentActions", `Recruiting new unit with card ID ${cardId}`);
		let targetPos = BoardLogic.getEmptySlot(units, CombatConstants.FORCE_ID_PLAYER);

		if (targetPosition) {
			const [x, y] = targetPosition;
			const isWithinBounds =
				x >= 0 &&
				x <= 2 &&
				y >= 0 &&
				y <= 2;

			if (!isWithinBounds) {
				Logger.warn("recruitmentActions", `Target position ${x},${y} is out of bounds, ignoring target slot`);
				return session;
			}

			const occupied = units
				.filter((unit) => unit.force === CombatConstants.FORCE_ID_PLAYER)
				.some(
					(unit) => {
						const [ux, uy] = unit.position;

						return ux === x &&
							uy === y
					}
				);

			if (occupied) {
				Logger.warn("recruitmentActions", `Target position ${x},${y} is already occupied, ignoring target slot`);
				return session;
			}

			targetPos = targetPosition;
		}

		if (targetPos) {
			const newUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, cardId, targetPos);
			const recruitRank = getShopRecruitRank(session, cardId);
			newUnit.rank = recruitRank;

			if (recruitRank > 1) {
				Logger.debug("recruitmentActions", `Recruited unit ${cardId} at Rank ${newUnit.rank}`);
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
			Logger.debug("recruitmentActions", `Added new unit ${cardId}`);
			return {
				...session,
				team: {
					...session.team,
					units: [...units]
				}
			};
		}
	}

	// should never happen
	Logger.warn("recruitmentActions", `Failed to recruit unit with card ID ${cardId}: team is full`);

	return session;
}

/**
 * Discard a unit from the player's team (if it's not the core).
 */
export function discardUnit(
	units: Unit.Unit[],
	unitId: string
): { updated: boolean; updates: string[] } {
	const unitIndex = units.findIndex((u: Unit.Unit) => u.id === unitId);
	if (unitIndex >= 0) {
		const unit = units[unitIndex];
		if (!unit.isCore) {
			units.splice(unitIndex, 1);
			return { updated: true, updates: [`Discarded unit ${unitId}`] };
		}
	}

	return { updated: false, updates: ["Unit not found or is core"] };
}
