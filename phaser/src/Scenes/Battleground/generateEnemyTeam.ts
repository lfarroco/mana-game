import { CardDefinition, getCores, getNonCores } from "@Models/Entities/Card";
import { cpuForce } from "@Models/Entities/Force";
import { vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { pickOne } from "../../utils";
import { upgradeUnitData } from "@Models/Entities/Unit";
import { getState } from "@Models/State";

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
	for (let i = 0; i < upgradeCount; i++) {
		const unit = pickOne(units);

		if (unit.rank < 4) {
			upgradeUnitData(unit);
		}
	}
}

function distributePowerPoints(units: Unit[], powerPoints: number): void {
	for (let i = 0; i < powerPoints; i++) {
		const unit = pickOne(units);
		unit.power += 1;
	}
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

export function generateEnemyTeam(round: number, pool: CardDefinition[]) {
	if (round < 0) {
		throw new Error("Round must be a non-negative number");
	}
	if (pool.length === 0) {
		throw new Error("Card pool cannot be empty");
	}

	const unitCount = calculateUnitsForRound(round);
	const upgradeCount = calculateUpgradesForRound(round);

	const units: Unit[] = [];
	const occupiedPositions = new Set<string>();

	const coreCard = pickOne(getCores());
	const corePosition = getRandomEmptyPosition(occupiedPositions);
	occupiedPositions.add(`${corePosition.x},${corePosition.y}`);
	const coreUnit = makeUnit(cpuForce.id, coreCard.id, vec2(corePosition.x, corePosition.y));
	units.push(coreUnit);

	for (let i = 1; i < unitCount; i++) {
		const card = pickOne(getNonCores());
		const position = getRandomEmptyPosition(occupiedPositions);
		if (!position) {
			break;
		}
		occupiedPositions.add(`${position.x},${position.y}`);
		const unit = makeUnit(cpuForce.id, card.id, vec2(position.x, position.y));
		units.push(unit);
	}

	coreUnit.life = (coreCard.life || 500) + (100 * (round - 1));
	coreUnit.maxLife = (coreCard.life || 500) + (100 * (round - 1));

	distributeUpgrades(units, upgradeCount);

	const powerPoints = round * 10;
	const state = getState();
	if (state.gameData.player.wins >= 10) {
		const multiplier = Math.pow(1.1, round - 10);
		coreUnit.life = Math.floor(coreUnit.life * multiplier);
		coreUnit.maxLife = Math.floor(coreUnit.maxLife * multiplier);

		const infinitePowerPoints = Math.floor(powerPoints * multiplier);
		distributePowerPoints(units, infinitePowerPoints);
	} else {
		distributePowerPoints(units, powerPoints);
	}

	return units;
}
