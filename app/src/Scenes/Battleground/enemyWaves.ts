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

export const waves: { [idx: number]: Unit[] } = {
	1: cluster("blob", 2).map(shift(0, -1)),
	2: cluster("blob", 3),
	3: cluster("blob", 4),
}

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