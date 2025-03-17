import { FORCE_ID_CPU } from "../../Models/Force";
import { sumVec2, vec2 } from "../../Models/Geometry";
import { BLOB, BLOB_KING, BLOB_KNIGHT, BLOB_MAGE, JobId, RED_BLOB, SHADOW_BLOB, SHADOW_GHOST, SOLDIER, SWARMLING, THIEF } from "../../Models/Job";
import { makeUnit, Unit } from "../../Models/Unit";

const enemy = (job: JobId, x: number, y: number) => makeUnit(
	Math.random().toString(),
	FORCE_ID_CPU,
	job,
	vec2(x + 3, y))

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

		...col(BLOB, 4, FRONTLINE),
	].map(shift(0, 1)),
	2: [
		...col(RED_BLOB, 4, MIDDLE),
		...col(BLOB, 4, FRONTLINE),
	].map(shift(0, 2)),
	3: [
		...col(SHADOW_GHOST, 2, BACKLINE),
		...col(BLOB, 4, FRONTLINE),
	],
	4: [
		...col(BLOB_MAGE, 2, BACKLINE),
		...col(BLOB, 6, FRONTLINE),
	],
	5: [
		...col(BLOB_MAGE, 1, BACKLINE),
		...col(BLOB_KING, 1, MIDDLE),
		...col(BLOB, 6, FRONTLINE),
	],
	6: [
		...col(SHADOW_GHOST, 3, MIDDLE),
		...col(SWARMLING, 6, FRONTLINE),
	],
	7: [
		...col(BLOB_MAGE, 3, BACKLINE),
		...col(BLOB_KNIGHT, 2, FRONTLINE),
	],
	8: [
		...col(SHADOW_GHOST, 3, BACKLINE),
		...col(BLOB_KING, 1, MIDDLE),
		...col(SWARMLING, 6, FRONTLINE),
	],
	9: [
		...col(BLOB_MAGE, 3, BACKLINE),
		...col(BLOB_KNIGHT, 3, FRONTLINE),
	],
	10: [
		...col(SHADOW_GHOST, 3, BACKLINE),
		...col(SHADOW_BLOB, 1, MIDDLE),
		...col(SWARMLING, 8, FRONTLINE),
	]
};

console.log("waves", waves);