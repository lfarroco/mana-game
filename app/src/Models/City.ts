import * as uuid from "uuid";
import { Vec2, vec2 } from "./Misc";

export type City = {
	id: string,
	name: string,
	type: string,
	force: string | null,
	screenPosition: { x: number, y: number }
	boardPosition: Vec2
}

export const makeCity = (): City => {
	return {
		id: uuid.v4(),
		name: "",
		type: "town",
		force: null,
		screenPosition: { x: 0, y: 0 },
		boardPosition: vec2(0, 0)
	}
}

export const randomCity = (): City => {
	return {
		...makeCity(),
		name: "city-" + Math.random().toString(36).substring(7),
	}
}