import * as uuid from "uuid";
import { randomJob } from "./Job";

export type Unit = {
	id: string,
	name: string,
	job: string,
	squad: string | null,
	force: string | null
}

export const makeUnit = (): Unit => {
	return {
		id: uuid.v4(),
		name: uuid.v4().slice(0, 8),
		job: "",
		squad: null,
		force: null
	}
}

export const randomUnit = (): Unit => {
	return {
		...makeUnit(),
		name: "unit-" + Math.random().toString(36).substring(7),
		job: randomJob().id
	}
}