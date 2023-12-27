import * as uuid from "uuid";
import { BoardVec, boardVec } from "./Misc";

export type City = {
	id: string,
	name: string,
	type: string,
	force: string | null,
	screenPosition: { x: number, y: number }
	boardPosition: BoardVec
}

export const makeCity = (): City => {
	return {
		id: uuid.v4(),
		name: "",
		type: "town",
		force: null,
		screenPosition: { x: 0, y: 0 },
		boardPosition: boardVec(0, 0)
	}
}

export const randomCity = (): City => {
	return {
		...makeCity(),
		name: "city-" + Math.random().toString(36).substring(7),
	}
}