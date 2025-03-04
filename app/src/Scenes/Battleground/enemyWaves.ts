import { FORCE_ID_CPU } from "../../Models/Force";
import { sumVec2, vec2 } from "../../Models/Geometry";
import { makeUnit, Unit } from "../../Models/Unit";

const enemy = (job: string, x: number, y: number) => makeUnit(
	Math.random().toString(),
	FORCE_ID_CPU,
	job,
	vec2(
		x + 6,
		y + 4
	))

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

const blobKing = () => [makeUnit(Math.random().toString(), FORCE_ID_CPU, "blob_king", vec2(8, 2))]

export const waves: { [idx: number]: Unit[] } = {
	1: row("blob", 4).map(shift(0, -1)).concat(blobKing()),
	2: cluster("blob", 3).concat(blobKing()),
	3: cluster("blob", 4),
}