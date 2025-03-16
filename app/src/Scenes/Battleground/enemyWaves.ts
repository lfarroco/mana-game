import { FORCE_ID_CPU } from "../../Models/Force";
import { sumVec2, vec2 } from "../../Models/Geometry";
import { BLOB, BLOB_KING, BLOB_KNIGHT, BLOB_MAGE, JobId, RED_BLOB, SHADOW_BLOB, SHADOW_GHOST, SOLDIER, SWARMLING, THIEF } from "../../Models/Job";
import { makeUnit, Unit } from "../../Models/Unit";

const enemy = (job: JobId, x: number, y: number) => makeUnit(
	Math.random().toString(),
	FORCE_ID_CPU,
	job,
	vec2(
		x + 6,
		y + 2
	))

const FRONTLINE = 3;
const MIDDLE = 2;
const BACKLINE = 1;

const shift = (x: number, y: number) => (u: Unit) => {

	u.position = sumVec2(u.position)(vec2(x, y));
	return u
}

const row = (job: JobId, size: number, y: number) =>
	new Array(size)
		.fill(0)
		.map((_, i) => enemy(job, i + 2, 0))
		.map(shift(-Math.floor(size / 2), y));

function cluster(job: JobId, size: number) {
	return new Array(
		size * size
	).fill(0).map((_, i) => {

		// this placement logic is just:
		// this will place the enemies in a 5x5 grid

		const x = i % size;
		const y = Math.floor(i / size) - Math.floor(size / 2);

		return enemy(job, x, y);
	})
}

export const waves: { [idx: number]: Unit[] } = {
	1: [

		...row(BLOB, 4, MIDDLE),
		...row(BLOB, 4, FRONTLINE),
	],
	2: [
		...row(RED_BLOB, 4, MIDDLE),
		...row(BLOB, 4, FRONTLINE),
	],
	3: [
		...row(SHADOW_GHOST, 4, BACKLINE),
	],
	4: [
		...row(BLOB_MAGE, 2, BACKLINE),
		...row(BLOB, 6, FRONTLINE),
	],
	5: [
		...row(BLOB_MAGE, 1, BACKLINE),
		...row(BLOB_KING, 1, MIDDLE),
		...row(BLOB, 6, FRONTLINE),
	],
	6: [
		...row(SHADOW_GHOST, 3, MIDDLE),
		...row(SWARMLING, 6, FRONTLINE),
	],
	7: [
		...row(BLOB_MAGE, 3, BACKLINE),
		...row(BLOB_KNIGHT, 2, FRONTLINE),
	],
	8: [
		...row(SHADOW_GHOST, 3, BACKLINE),
		...row(BLOB_KING, 1, MIDDLE),
		...row(SWARMLING, 6, FRONTLINE),
	],
	9: [
		...row(BLOB_MAGE, 3, BACKLINE),
		...row(BLOB_KNIGHT, 3, FRONTLINE),
	],
	10: [
		...row(SHADOW_GHOST, 3, BACKLINE),
		...row(SHADOW_BLOB, 1, MIDDLE),
		...row(SWARMLING, 8, FRONTLINE),
	]
}