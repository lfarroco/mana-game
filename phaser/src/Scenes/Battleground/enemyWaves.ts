import { FORCE_ID_CPU } from "./constants";
import { vec2 } from "../../Models/Geometry";
import { BLOB, BLOB_MAGE, JobId, RED_BLOB, SKELETON } from "../../Models/Job";
import { makeUnit, Unit } from "../../Models/Unit";
import { pickOne } from "../../utils";

const enemy = (job: JobId, x: number, y: number) => makeUnit(
	FORCE_ID_CPU,
	job,
	vec2(x + 1, y + 1))

const FRONTLINE = 3;
const MIDDLE = 2;

const col = (job: JobId, size: number, x: number) =>
	new Array(size)
		.fill(0)
		.map((_, i) => enemy(job, x, i));



export const waves: { [idx: number]: Unit[] } = {
	11: [
		...col(BLOB, 3, MIDDLE),
	],
	13: [
		enemy(BLOB_MAGE, 1, 1),
		...col(BLOB, 3, FRONTLINE),
	]
};

export const parseEncounter = (lines: string[], charToJob: Record<string, JobId>): Unit[] => {
	const height = lines.length;
	const width = lines[0].length;
	const units: Unit[] = [];

	for (let y = 0; y < height; y++) {
		const line = lines[y];
		for (let x = 0; x < width; x++) {
			const char = line[x];
			if (char === 'x') continue;
			const job = charToJob[char];
			if (!job) continue;
			units.push(enemy(job, x, y));
		}
	}

	return units;
};

export const ENCOUNTER_BLOBS = () => {
	const templates = [
		[
			"xxx",
			"x1x",
			"xxx"
		],
		[
			"xxx",
			"x1x",
			"xxx"
		],
		[
			"xxx",
			"1xx",
			"xxx"
		],

	];
	return parseEncounter(pickOne(templates), { '1': BLOB, '2': RED_BLOB })

};

export const ENCOUNTER_UNDEAD = parseEncounter(
	[
		"x11",
		"xx1",
		"x11"
	]
	, { '1': SKELETON });
