import { CardDefinition, getCores, getNonCores } from "@Models/Entities/Card";
import { cpuForce } from "@Models/Entities/Force";
import { vec2 } from "@Models/ServerGeometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { pickOne, pickOneUnique } from "../../../utils";
import { upgradeUnitData } from "@Models/Entities/Unit";
import { State } from "@Models/State";

const MAX_UNITS = 9;
const UNITS_PER_ROUND = 3;
const BOARD_WIDTH = 3;
const BOARD_HEIGHT = 3;

function calculateUnitsForRound(round: number): number {
	if (round === 0) return 1;
	const totalUnits = 1 + round * UNITS_PER_ROUND;
	return Math.min(totalUnits, MAX_UNITS);
}

function calculateUpgradesForRound(round: number): number {
	const roundsToFillBoard = Math.ceil((MAX_UNITS - 1) / UNITS_PER_ROUND);
	if (round <= roundsToFillBoard) return 0;

	const upgradeRounds = round - roundsToFillBoard;
	return upgradeRounds * UNITS_PER_ROUND;
}

function distributeUpgrades(units: Unit[], upgradeCount: number): void {
	const maxPossibleUpgrades = units.length * 3;
	const cappedUpgradeCount = Math.min(upgradeCount, maxPossibleUpgrades);

	const upgradesPerUnit = Math.floor(cappedUpgradeCount / units.length);
	const remainder = cappedUpgradeCount % units.length;

	units.forEach(unit => {
		for (let i = 0; i < upgradesPerUnit && unit.rank < 4; i++) {
			upgradeUnitData(unit);
		}
	});

	for (let i = 0; i < remainder; i++) {
		const unit = pickOne(units);
		if (unit.rank < 4) {
			upgradeUnitData(unit);
		}
	}
}

function distributePowerPoints(units: Unit[], powerPoints: number, multiplier: number = 1): void {
	const scaledPowerPoints = Math.floor(powerPoints * multiplier);
	const pointsPerUnit = Math.floor(scaledPowerPoints / units.length);

	units.forEach((unit) => {
		unit.power += pointsPerUnit;
	});
}

function getRandomEmptyPosition(occupiedPositions: Set<string>): { x: number; y: number } {
	const availablePositions: { x: number; y: number }[] = [];

	for (let y = 0; y < BOARD_HEIGHT; y++) {
		for (let x = 0; x < BOARD_WIDTH; x++) {
			const key = `${x},${y}`;
			if (!occupiedPositions.has(key)) {
				availablePositions.push({ x, y });
			}
		}
	}

	return pickOne(availablePositions);
}

export function generateEnemyTeam(state: State, round: number, pool: CardDefinition[]) {
	if (round < 0) {
		throw new Error("Round must be a non-negative number");
	}
	if (pool.length === 0) {
		throw new Error("Card pool cannot be empty");
	}

	const unitCount = calculateUnitsForRound(round);
	const upgradeCount = calculateUpgradesForRound(round);

	const units: Unit[] = [];
	const pickedCards: CardDefinition[] = [];
	const occupiedPositions = new Set<string>();

	const coreCard = pickOne(getCores());
	const corePosition = getRandomEmptyPosition(occupiedPositions);
	occupiedPositions.add(`${corePosition.x},${corePosition.y}`);
	const coreUnit = makeUnit(cpuForce(state).id, coreCard.id, vec2(corePosition.x, corePosition.y));
	units.push(coreUnit);

	const filteredPool = getNonCores().filter(u => {
		const rank = u.rank || 1;
		if (round < 3 && rank > 1) return false;
		if (round >= 3 && round < 5 && rank > 2) return false;
		if (round >= 5 && round < 9 && rank > 3) return false;
		if (round >= 9 && round < 13 && rank > 4) return false;

		return true;
	})

	for (let i = 1; i < unitCount; i++) {
		const card = pickOneUnique(filteredPool, pickedCards);
		pickedCards.push(card);
		const position = getRandomEmptyPosition(occupiedPositions);
		if (!position) {
			break;
		}
		occupiedPositions.add(`${position.x},${position.y}`);
		const unit = makeUnit(cpuForce(state).id, card.id, vec2(position.x, position.y));
		units.push(unit);
	}

	coreUnit.life = (coreCard.life || 500) + (100 * (round - 1));
	coreUnit.maxLife = (coreCard.life || 500) + (100 * (round - 1));

	distributeUpgrades(units, upgradeCount);

	const powerPoints = round * 10;
	if (state.session.wins >= 10) {
		const multiplier = Math.pow(1.2, round - 10);

		coreUnit.life = Math.floor(coreUnit.life * multiplier);
		coreUnit.maxLife = Math.floor(coreUnit.maxLife * multiplier);

		distributePowerPoints(units, powerPoints, multiplier);
	} else {
		distributePowerPoints(units, powerPoints);
	}

	return units;
}
