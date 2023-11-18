import * as uuid from "uuid";

export type City = {
	id: string,
	name: string,
	type: string,
	force: string | null,
	position: { x: number, y: number }
}

export const makeCity = (): City => {
	return {
		id: uuid.v4(),
		name: "",
		type: "town",
		force: null,
		position: { x: 0, y: 0 }
	}
}

export const randomCity = (): City => {
	return {
		...makeCity(),
		name: "city-" + Math.random().toString(36).substring(7),
	}
}