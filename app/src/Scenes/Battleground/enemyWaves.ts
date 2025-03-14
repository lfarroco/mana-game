import { FORCE_ID_CPU } from "../../Models/Force";
import { sumVec2, vec2 } from "../../Models/Geometry";
import { makeUnit, Unit } from "../../Models/Unit";

const enemy = (job: string, x: number, y: number) => makeUnit(
	Math.random().toString(),
	FORCE_ID_CPU,
	job,
	vec2(
		x + 6,
		y + 2
	))

const FRONTLINE = 2;
const MIDDLE = 1;
const BACKLINE = 0;

const shift = (x: number, y: number) => (u: Unit) => {

	u.position = sumVec2(u.position)(vec2(x, y));
	return u
}

const row = (job: string, size: number) => new Array(size).fill(0).map((_, i) => enemy(job, i, 0))

function cluster(job: string, size: number) {
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

const blobKing = () => [makeUnit(Math.random().toString(), FORCE_ID_CPU, "blob_king", vec2(8, 1))]

export const waves: { [idx: number]: Unit[] } = {
	1: row("blob", 6).map(shift(-2, 3)).concat([enemy("shadow-ghost", 0, 0)]),
	2: row("blob", 10),
	3: cluster("blob", 5).concat([enemy("red_blob", -1, 0)]),
	4: [
		enemy("soldier", 0, 2),
		enemy("thief", 1, 2),
	].concat(row("blob", 4)),

}