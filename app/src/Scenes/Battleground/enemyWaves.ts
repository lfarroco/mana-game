import { FORCE_ID_CPU } from "../../Models/Force";
import { vec2 } from "../../Models/Geometry";
import { makeUnit, Unit } from "../../Models/Unit";

const enemy = (job: string, x: number, y: number) => makeUnit(
	Math.random().toString(),
	FORCE_ID_CPU,
	job,
	vec2(
		x + 6,
		y + 2
	))

export const waves: { [idx: number]: Unit[] } = {
	1: [
		enemy("blob", 1, 2),
		enemy("blob", 2, 2),
		enemy("blob", 3, 2),
		enemy("blob", 4, 2),
		enemy("blob", 5, 2),

		enemy("blob", 4, 1),
		enemy("blob", 5, 1),
	],
	2: [
		enemy("blob", 1, 1),
		enemy("blob", 2, 1),
		enemy("blob", 4, 1),
		enemy("blob", 5, 1)
	]
}