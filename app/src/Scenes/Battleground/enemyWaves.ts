import { FORCE_ID_CPU } from "../../Models/Force";
import { sumVec2, vec2 } from "../../Models/Geometry";
import { BLOB, BLOB_KING, JobId, RED_BLOB, SHADOW_GHOST, SOLDIER, THIEF } from "../../Models/Job";
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
	new Array(size).fill(0).map((_, i) => enemy(job, i, 0)).map(shift(-Math.floor(size / 2), y));

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
		...row(BLOB, 6, FRONTLINE),
		enemy(SHADOW_GHOST, 0, BACKLINE)
	],
	2: [
		...row(BLOB, 10, FRONTLINE),
	],
	3: [
		...cluster(BLOB, 5),
		enemy(RED_BLOB, -1, 0),
	],
	4: [
		enemy(SOLDIER, 0, 2),
		enemy(THIEF, 1, 2),
		...row(BLOB, 4, FRONTLINE)
	],

}