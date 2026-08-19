import { Unit } from "../Models";
import * as Card from "../Entities/Card";
import { CardDefinition } from "../Models";
import { upgradeUnitData } from "../Entities/Unit";
import { FORCE_ID_CPU, MAX_PARTY_SIZE } from "../math/Constants";
import * as Random from "../math/Random";
import type { Vec2 } from "../math/Geometry";

const UNITS_PER_ROUND = 3;

// CUB-D1 (docs/core-unit-onboarding.md §6): enemy cores were simplified to
// action-only baselines (CUB-A2), which gutted their output (~2–3× AP loss per
// core). Difficulty is restored through enemy *stats*, not abilities: double the
// legacy round-scaled power budget (was `round * 10`) and raise the per-round
// core life bump (was `100 * (round - 1)`) so early rounds keep their intended
// pressure. Keep enemy cores simple — the player should learn each mechanic
// before facing it at full strength.
const ENEMY_POWER_POINTS_PER_ROUND = 20;
const ENEMY_CORE_LIFE_PER_ROUND = 150;

function calculateUnitsForRound(round: number): number {
  if (round === 0) return 1;
  return Math.min(1 + round * UNITS_PER_ROUND, MAX_PARTY_SIZE);
}

function calculateUpgradesForRound(round: number): number {
  const roundsToFillBoard = Math.ceil((MAX_PARTY_SIZE - 1) / UNITS_PER_ROUND);
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
    const unit = units[i % units.length];
    if (unit.rank < 4) {
      upgradeUnitData(unit);
    }
  }
}

function distributePowerPoints(
  units: Unit[],
  powerPoints: number,
  multiplier: number = 1,
): void {
  const scaledPowerPoints = Math.floor(powerPoints * multiplier);
  const pointsPerUnit = Math.floor(scaledPowerPoints / units.length);
  units.forEach((unit) => {
    unit.power += pointsPerUnit;
  });
}

function getRandomEmptyPosition(
  rng: { seed: string },
  occupiedPositions: Set<string>,
): Vec2 {
  const availablePositions: Vec2[] = [];

  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const key = `${x},${y}`;
      if (!occupiedPositions.has(key)) {
        availablePositions.push([x, y]);
      }
    }
  }

  return Random.pickOneSeeded(rng, availablePositions);
}

/**
 * Generate an enemy team for the given round and win count.
 * Uses a deterministic seeded RNG so the same seed always produces the same team.
 */
export function generateEnemyTeam(
  seed: string,
  wins: number,
  round: number,
  pool: CardDefinition[],
): Unit[] {
  if (round < 0) {
    throw new Error("Round must be a non-negative number");
  }
  if (pool.length === 0) {
    throw new Error("Card pool cannot be empty");
  }

  const rng = { seed };

  const unitCount = calculateUnitsForRound(round);
  const upgradeCount = calculateUpgradesForRound(round);
  const units: Unit[] = [];
  const pickedCards: CardDefinition[] = [];
  const occupiedPositions = new Set<string>();

  const coreCard = Random.pickOneSeeded(rng, Card.getCores());
  const corePosition = getRandomEmptyPosition(rng, occupiedPositions);
  occupiedPositions.add(`${corePosition[0]},${corePosition[1]}`);
  const coreUnit = Card.makeUnit(FORCE_ID_CPU, coreCard.id, corePosition);
  units.push(coreUnit);

  const filteredPool = pool.filter((unit) => {
    if (unit.isCore) return false;
    const rank = unit.rank || 1;
    if (round < 3 && rank > 1) return false;
    if (round >= 3 && round < 5 && rank > 2) return false;
    if (round >= 5 && round < 9 && rank > 3) return false;
    if (round >= 9 && round < 13 && rank > 4) return false;
    return true;
  });

  for (let i = 1; i < unitCount; i++) {
    const card = Random.pickOneUniqueSeeded(rng, filteredPool, pickedCards);
    pickedCards.push(card);
    const position = getRandomEmptyPosition(rng, occupiedPositions);
    if (!position) {
      break;
    }

    occupiedPositions.add(`${position[0]},${position[1]}`);
    units.push(Card.makeUnit(FORCE_ID_CPU, card.id, position));
  }

  coreUnit.life =
    (coreCard.life || 500) + ENEMY_CORE_LIFE_PER_ROUND * (round - 1);
  coreUnit.maxLife =
    (coreCard.life || 500) + ENEMY_CORE_LIFE_PER_ROUND * (round - 1);

  distributeUpgrades(units, upgradeCount);

  const powerPoints = round * ENEMY_POWER_POINTS_PER_ROUND;
  if (wins >= 10) {
    const multiplier = Math.pow(1.2, round - 10);
    coreUnit.life = Math.floor(coreUnit.life * multiplier);
    coreUnit.maxLife = Math.floor(coreUnit.maxLife * multiplier);
    distributePowerPoints(units, powerPoints, multiplier);
  } else {
    distributePowerPoints(units, powerPoints);
  }

  return units;
}
