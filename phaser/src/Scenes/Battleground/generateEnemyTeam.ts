import { CardDefinition, getCores, getNonCores } from "@Models/Entities/Card";
import { cpuForce } from "@Models/Entities/Force";
import { vec2 } from "@Models/Geometry";
import { makeUnit } from "@Models/Entities/Unit";
import * as GhostStore from "@Models/GhostStore";
import { pickOne } from "../../utils";

export const FORMATION_TEMPLATES: string[][] = [
	["x.x", ".c.", "x.x"],
	[".x.", "xc.", ".x."],
	["x.x", "..c", "x.x"],
];

export function generateEnemyTeam(round: number, pool: CardDefinition[]) {
	if (round < 0) {
		throw new Error("Round must be a non-negative number");
	}
	if (pool.length === 0) {
		throw new Error("Card pool cannot be empty");
	}

	const ghost = GhostStore.pickRandomGhost(round);
	if (ghost) {
		const ghostUnits = GhostStore.instantiateGhostUnits(ghost);
		console.log(
			`Loaded ghost enemy team for round ${round} (ghosts stored for round: ${GhostStore.getGhostCountForRound(round)})`
		);
		return ghostUnits;
	}

	const template = pickOne(FORMATION_TEMPLATES);

	const parsed = template.map((row) => row.split(""));

	const units = [];

	for (let y = 0; y < parsed.length; y++) {
		for (let x = 0; x < parsed[y].length; x++) {
			const current = parsed[y][x];

			if (current === ".") {
				continue;
			}
			const handlers: { [key: string]: () => CardDefinition[] } = {
				x: getNonCores,
				c: getCores,
			};

			const potentialCards = handlers[current]();

			const card = pickOne(potentialCards);
			const unit = makeUnit(cpuForce.id, card.id, vec2(x, y));
			units.push(unit);
		}
	}

	return units;
}
