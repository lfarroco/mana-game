import { FORCE_ID_CPU } from "../../Models/Force";
import { sumVec2, vec2 } from "../../Models/Geometry";
import { BLOB, BLOB_KING, BLOB_KNIGHT, BLOB_MAGE, JobId, RED_BLOB, SHADOW_BLOB, SHADOW_GHOST, SWARMLING } from "../../Models/Job";
import { makeUnit, Unit } from "../../Models/Unit";

const enemy = (job: JobId, x: number, y: number) => makeUnit(
	Math.random().toString(),
	FORCE_ID_CPU,
	job,
	vec2(x + 3, y + 1))

const FRONTLINE = 2;
const MIDDLE = 1;
const BACKLINE = 0;

const shift = (x: number, y: number) => (u: Unit) => {

	u.position = sumVec2(u.position)(vec2(x, y));
	return u
}

const row = (job: JobId, size: number, y: number) =>
	new Array(size)
		.fill(0)
		.map((_, i) => enemy(job, i, y));

const col = (job: JobId, size: number, x: number) =>
	new Array(size)
		.fill(0)
		.map((_, i) => enemy(job, x, i));

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
		...col(BLOB, 4, MIDDLE),
	],
	2: [
		...cluster(BLOB, 2).map(shift(1, 2)),
		enemy(RED_BLOB, 1, 0),
		enemy(RED_BLOB, 1, 3),
	],
	3: [
		enemy(BLOB_MAGE, 1, 3),
		...col(BLOB, 4, FRONTLINE),
	],
	4: [
		...col(BLOB_MAGE, 2, BACKLINE),
		...col(BLOB, 5, FRONTLINE),
	],
	5: [
		...col(BLOB_MAGE, 1, BACKLINE),
		...col(BLOB, 4, MIDDLE),
		...col(BLOB_KNIGHT, 2, FRONTLINE),
	],

};

console.log("waves", waves);