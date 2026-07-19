import * as Force from "@Models/Entities/Force";
import { Unit } from "@game/Models";
import * as Card from "@Models/Entities/Card";
import * as Utils from "@utils";
import * as State from "@Models/ClientState";
import { CardDefinition } from "@game/Models";
import { upgradeUnitData } from "@Models/Entities/Unit";

const MAX_UNITS = 9;
const UNITS_PER_ROUND = 3;
const BOARD_WIDTH = 3;
const BOARD_HEIGHT = 3;

function calculateUnitsForRound(round: number): number {
	if (round === 0) return 1;
	return Math.min(1 + round * UNITS_PER_ROUND, MAX_UNITS);
}

function calculateUpgradesForRound(round: number): number {
	const roundsToFillBoard = Math.ceil((MAX_UNITS - 1) / UNITS_PER_ROUND);
	if (round <= roundsToFillBoard) return 0;
	return (round - roundsToFillBoard) * UNITS_PER_ROUND;
}

function distributeUpgrades(units: Unit[], upgradeCount: number): void {
	const maxPossibleUpgrades = units.length * 3;
	const cappedUpgradeCount = Math.min(upgradeCount, maxPossibleUpgrades);
	const upgradesPerUnit = Math.floor(cappedUpgradeCount / units.length);
	const remainder = cappedUpgradeCount % units.length;

	units.forEach((unit) => {
		for (let i = 0; i < upgradesPerUnit && unit.rank < 4; i++) {
			upgradeUnitData(unit);
		}
	});

	for (let i = 0; i < remainder; i++) {
		const unit = Utils.pickOne(units);
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

function getRandomEmptyPosition(occupiedPositions: Set<string>): Vec2 {
	const availablePositions: Vec2[] = [];

	for (let y = 0; y < BOARD_HEIGHT; y++) {
		for (let x = 0; x < BOARD_WIDTH; x++) {
			const key = `${x},${y}`;
			if (!occupiedPositions.has(key)) {
				availablePositions.push([x, y]);
			}
		}
	}

	return Utils.pickOne(availablePositions);
}

export function generateEnemyTeam(state: State.ClientState, round: number, pool: CardDefinition[]) {
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

	const coreCard = Utils.pickOne(Card.getCores());
	const corePosition = getRandomEmptyPosition(occupiedPositions);
	occupiedPositions.add(`${corePosition[0]},${corePosition[1]}`);
	const coreUnit = Card.makeUnit(Force.cpuForce(state).id, coreCard.id, corePosition);
	units.push(coreUnit);

	const filteredPool = Card.getNonCores().filter((unit) => {
		const rank = unit.rank || 1;
		if (round < 3 && rank > 1) return false;
		if (round >= 3 && round < 5 && rank > 2) return false;
		if (round >= 5 && round < 9 && rank > 3) return false;
		if (round >= 9 && round < 13 && rank > 4) return false;
		return true;
	});

	for (let i = 1; i < unitCount; i++) {
		const card = Utils.pickOneUnique(filteredPool, pickedCards);
		pickedCards.push(card);
		const position = getRandomEmptyPosition(occupiedPositions);
		if (!position) {
			break;
		}

		occupiedPositions.add(`${position[0]},${position[1]}`);
		units.push(Card.makeUnit(Force.cpuForce(state).id, card.id, position));
	}

	coreUnit.life = (coreCard.life || 500) + 100 * (round - 1);
	coreUnit.maxLife = (coreCard.life || 500) + 100 * (round - 1);

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