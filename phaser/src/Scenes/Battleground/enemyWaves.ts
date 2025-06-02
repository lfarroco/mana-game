import { FORCE_ID_CPU } from "./constants";
import { vec2 } from "../../Models/Geometry";
import { makeUnit, Unit } from "../../Models/Unit";

const enemy = (cardName: string, x: number, y: number) => makeUnit(
	FORCE_ID_CPU,
	cardName,
	vec2(x + 1, y + 1))

export const FRONTLINE = 3;
export const MIDDLE = 2;

export const col = (cardName: string, size: number, x: number) =>
	new Array(size)
		.fill(0)
		.map((_, i) => enemy(cardName, x, i));




export const parseEncounter = (
	lines: string[],
	charaToCard: Record<string, string>,
): Unit[] => {
	const height = lines.length;
	const width = lines[0].length;
	const units: Unit[] = [];

	for (let y = 0; y < height; y++) {
		const line = lines[y];
		for (let x = 0; x < width; x++) {
			const char = line[x];
			if (char === '.') continue;
			const job = charaToCard[char];
			if (!job) continue;
			units.push(enemy(job, x, y));
		}
	}

	return units;
};

